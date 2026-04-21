using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto.RetailerDto.ItemDto;
using SkyForge.Dto.CompositionDto;
using SkyForge.Models.Retailer.Items;
using SkyForge.Models.Retailer.ItemCompanyModel;
using SkyForge.Models.Retailer.CategoryModel;
using SkyForge.Models.Retailer.CompositionModel;
using SkyForge.Models.Retailer.MainUnitModel;
using SkyForge.Models.Retailer.Purchase;
using SkyForge.Models.Retailer.Sales;
using SkyForge.Models.UnitModel;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SkyForge.Models.Retailer.StoreModel;
using SkyForge.Models.RackModel;

namespace SkyForge.Services.Retailer.ItemServices
{
    public class ItemService : IItemService
    {
        private readonly ApplicationDbContext _context;
        private readonly Random _random;
        private readonly ILogger<ItemService> _logger;

        public ItemService(ApplicationDbContext context, ILogger<ItemService> logger)
        {
            _context = context;
            _logger = logger;
            _random = new Random();
        }

        /// <summary>
        /// Generates a random 4-digit unique number for items (1000-9999)
        /// </summary>
        public async Task<int> GenerateUniqueItemNumberAsync(Guid companyId)
        {
            try
            {
                int uniqueNumber;
                bool isUnique;
                int attempts = 0;
                const int maxAttempts = 100; // Prevent infinite loop

                do
                {
                    attempts++;

                    // Generate random 4-digit number (1000-9999)
                    uniqueNumber = _random.Next(1000, 10000);

                    // Check if number already exists in the same company
                    isUnique = !await _context.Items
                        .AnyAsync(i => i.CompanyId == companyId && i.UniqueNumber == uniqueNumber);

                    if (attempts >= maxAttempts)
                    {
                        // Fallback: Get max number and add 1000 + random
                        var maxNumber = await _context.Items
                            .Where(i => i.CompanyId == companyId)
                            .MaxAsync(i => (int?)i.UniqueNumber) ?? 1000;

                        uniqueNumber = maxNumber + 1000 + _random.Next(1, 100);
                        _logger.LogWarning("Using fallback unique number generation: {UniqueNumber}", uniqueNumber);
                        break;
                    }

                } while (!isUnique);

                _logger.LogDebug("Generated unique item number: {UniqueNumber} for company {CompanyId}", uniqueNumber, companyId);
                return uniqueNumber;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating unique item number for company {CompanyId}", companyId);
                throw;
            }
        }

        /// <summary>
        /// Generates a barcode number (unique long number)
        /// </summary>
        public async Task<long> GenerateBarcodeNumberAsync(Guid companyId)
        {
            try
            {
                long barcodeNumber;
                bool isUnique;
                int attempts = 0;
                const int maxAttempts = 50;

                do
                {
                    attempts++;

                    // Generate random 13-digit barcode number (EAN-13 compatible)
                    // Generate first 12 digits randomly
                    var first12Digits = (long)(_random.NextDouble() * 900000000000) + 100000000000;

                    // Calculate check digit for EAN-13
                    barcodeNumber = CalculateEan13CheckDigit(first12Digits);

                    // Check if barcode already exists in the same company
                    isUnique = !await _context.Items
                        .AnyAsync(i => i.CompanyId == companyId && i.BarcodeNumber == barcodeNumber);

                    if (attempts >= maxAttempts)
                    {
                        // Fallback: Use timestamp-based number
                        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                        barcodeNumber = timestamp % 10000000000000; // Ensure 13 digits
                        _logger.LogWarning("Using fallback barcode generation: {BarcodeNumber}", barcodeNumber);
                        break;
                    }

                } while (!isUnique);

                _logger.LogDebug("Generated barcode number: {BarcodeNumber} for company {CompanyId}", barcodeNumber, companyId);
                return barcodeNumber;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating barcode number for company {CompanyId}", companyId);
                throw;
            }
        }

        /// <summary>
        /// Calculates EAN-13 check digit
        /// </summary>
        private long CalculateEan13CheckDigit(long first12Digits)
        {
            string digits = first12Digits.ToString("D12");
            int sum = 0;

            for (int i = 0; i < 12; i++)
            {
                int digit = int.Parse(digits[i].ToString());
                sum += (i % 2 == 0) ? digit : digit * 3;
            }

            int checkDigit = (10 - (sum % 10)) % 10;
            return first12Digits * 10 + checkDigit;
        }
        /// <summary>
        /// Creates a new item with all related entities
        /// </summary>
        public async Task<Item> CreateItemAsync(CreateItemDTO createItemDto, Guid companyId, Guid fiscalYearId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                _logger.LogInformation("Creating new item for company {CompanyId}", companyId);

                // 1. Validate fiscal year exists and belongs to company
                var fiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);

                if (fiscalYear == null)
                {
                    throw new InvalidOperationException($"Fiscal year {fiscalYearId} not found for company {companyId}");
                }

                // 7. Check for duplicate item name in same fiscal year
                var existingItem = await _context.Items
                    .AnyAsync(i => i.Name.ToLower() == createItemDto.Name.ToLower().Trim()
                        && i.CompanyId == companyId
                        && i.FiscalYearId == fiscalYearId);

                if (existingItem)
                {
                    throw new InvalidOperationException($"Item '{createItemDto.Name.Trim()}' already exists for this fiscal year");
                }

                // 8. Generate unique numbers
                var uniqueNumber = await GenerateUniqueItemNumberAsync(companyId);
                var barcodeNumber = await GenerateBarcodeNumberAsync(companyId);
                var defaultStore = await GetDefaultStoreAsync(companyId);
                var defaultRack = defaultStore != null ? await GetDefaultRackAsync(defaultStore.Id) : null;

                // Calculate purchase and sales prices for consistency
                decimal purchasePrice = createItemDto.PuPrice ?? 0;
                decimal salesPrice = createItemDto.Price ?? 0;
                decimal openingStock = createItemDto.OpeningStock;
                decimal openingStockValue = openingStock * purchasePrice;

                // 9. Create new item
                var newItem = new Item
                {
                    Id = Guid.NewGuid(),
                    Name = createItemDto.Name?.Trim() ?? "",
                    Hscode = createItemDto.Hscode,
                    CategoryId = createItemDto.CategoryId,
                    ItemsCompanyId = createItemDto.ItemsCompanyId,
                    Price = salesPrice,
                    PuPrice = purchasePrice,
                    MainUnitPuPrice = createItemDto.MainUnitPuPrice,
                    MainUnitId = createItemDto.MainUnitId,
                    WsUnit = createItemDto.WsUnit,
                    UnitId = createItemDto.UnitId,
                    VatStatus = createItemDto.VatStatus,
                    OpeningStock = openingStock,
                    MinStock = createItemDto.MinStock,
                    MaxStock = createItemDto.MaxStock,
                    ReorderLevel = createItemDto.ReorderLevel,
                    UniqueNumber = uniqueNumber,
                    BarcodeNumber = barcodeNumber,
                    CompanyId = companyId,
                    FiscalYearId = fiscalYearId,
                    OriginalFiscalYearId = fiscalYearId,
                    Status = createItemDto.Status ?? "active",
                    CreatedAt = DateTime.UtcNow,
                    Date = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                // 10. Add compositions if provided
                if (createItemDto.CompositionIds != null && createItemDto.CompositionIds.Any())
                {
                    newItem.ItemCompositions = createItemDto.CompositionIds.Select(compositionId => new ItemComposition
                    {
                        ItemId = newItem.Id,
                        CompositionId = compositionId
                    }).ToList();
                }

                // 11. Create initial opening stock record
                var initialOpeningStock = new ItemInitialOpeningStock
                {
                    Id = Guid.NewGuid(),
                    ItemId = newItem.Id,
                    // Use provided InitialFiscalYearId or default to current fiscal year
                    InitialFiscalYearId = createItemDto.InitialOpeningStock?.InitialFiscalYearId ?? fiscalYearId,
                    OpeningStock = openingStock,
                    OpeningStockValue = createItemDto.InitialOpeningStock?.OpeningStockValue ?? openingStockValue,
                    PurchasePrice = createItemDto.InitialOpeningStock?.PurchasePrice ?? purchasePrice,
                    SalesPrice = createItemDto.InitialOpeningStock?.SalesPrice ?? salesPrice,
                    Date = createItemDto.InitialOpeningStock?.Date ??
                           (fiscalYear.StartDate.HasValue ? fiscalYear.StartDate.Value.ToUniversalTime() : DateTime.UtcNow),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                newItem.InitialOpeningStock = initialOpeningStock;

                // 12. Create opening stocks by fiscal year
                // Always create opening stock for current fiscal year
                var openingStocks = new List<ItemOpeningStockByFiscalYear>();

                // Check if current fiscal year is already provided in DTO
                var existingCurrentFiscalYearStock = createItemDto.OpeningStocksByFiscalYear?
                    .FirstOrDefault(os => os.FiscalYearId == fiscalYearId);

                if (existingCurrentFiscalYearStock != null)
                {
                    // Use provided values for current fiscal year
                    var openingStockCurrent = new ItemOpeningStockByFiscalYear
                    {
                        Id = Guid.NewGuid(),
                        ItemId = newItem.Id,
                        FiscalYearId = fiscalYearId,
                        OpeningStock = existingCurrentFiscalYearStock.OpeningStock,
                        OpeningStockValue = existingCurrentFiscalYearStock.OpeningStockValue,
                        PurchasePrice = existingCurrentFiscalYearStock.PurchasePrice,
                        SalesPrice = existingCurrentFiscalYearStock.SalesPrice,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    openingStocks.Add(openingStockCurrent);
                }
                else
                {
                    // Create default opening stock for current fiscal year
                    var openingStockCurrent = new ItemOpeningStockByFiscalYear
                    {
                        Id = Guid.NewGuid(),
                        ItemId = newItem.Id,
                        FiscalYearId = fiscalYearId,
                        OpeningStock = openingStock,
                        OpeningStockValue = openingStockValue,
                        PurchasePrice = purchasePrice,
                        SalesPrice = salesPrice,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    openingStocks.Add(openingStockCurrent);
                }

                // Add opening stocks for other fiscal years if provided
                if (createItemDto.OpeningStocksByFiscalYear != null)
                {
                    foreach (var openingStockDto in createItemDto.OpeningStocksByFiscalYear)
                    {
                        // Skip current fiscal year as we already handled it
                        if (openingStockDto.FiscalYearId == fiscalYearId)
                            continue;

                        // Validate fiscal year exists and belongs to company
                        var fiscalYearForOpeningStock = await _context.FiscalYears
                            .FirstOrDefaultAsync(f => f.Id == openingStockDto.FiscalYearId && f.CompanyId == companyId);

                        if (fiscalYearForOpeningStock == null)
                        {
                            throw new InvalidOperationException($"Fiscal year {openingStockDto.FiscalYearId} not found for opening stock");
                        }

                        // Calculate opening stock value if not provided or validate consistency
                        decimal calculatedOpeningStockValue = openingStockDto.OpeningStockValue;
                        if (calculatedOpeningStockValue == 0)
                        {
                            calculatedOpeningStockValue = openingStockDto.OpeningStock * openingStockDto.PurchasePrice;
                        }

                        var openingStockRecord = new ItemOpeningStockByFiscalYear
                        {
                            Id = Guid.NewGuid(),
                            ItemId = newItem.Id,
                            FiscalYearId = openingStockDto.FiscalYearId,
                            OpeningStock = openingStockDto.OpeningStock,
                            OpeningStockValue = calculatedOpeningStockValue,
                            PurchasePrice = openingStockDto.PurchasePrice,
                            SalesPrice = openingStockDto.SalesPrice,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };

                        openingStocks.Add(openingStockRecord);
                    }
                }

                newItem.OpeningStocksByFiscalYear = openingStocks;

                // 13. Create closing stocks by fiscal year if provided
                if (createItemDto.ClosingStocksByFiscalYear != null && createItemDto.ClosingStocksByFiscalYear.Any())
                {
                    var closingStocks = new List<ItemClosingStockByFiscalYear>();

                    foreach (var closingStockDto in createItemDto.ClosingStocksByFiscalYear)
                    {
                        // Validate fiscal year exists and belongs to company
                        var fiscalYearForClosingStock = await _context.FiscalYears
                            .FirstOrDefaultAsync(f => f.Id == closingStockDto.FiscalYearId && f.CompanyId == companyId);

                        if (fiscalYearForClosingStock == null)
                        {
                            throw new InvalidOperationException($"Fiscal year {closingStockDto.FiscalYearId} not found for closing stock");
                        }

                        // Calculate closing stock value if not provided
                        decimal calculatedClosingStockValue = closingStockDto.ClosingStockValue;
                        if (calculatedClosingStockValue == 0)
                        {
                            calculatedClosingStockValue = closingStockDto.ClosingStock * closingStockDto.PurchasePrice;
                        }

                        var closingStock = new ItemClosingStockByFiscalYear
                        {
                            Id = Guid.NewGuid(),
                            ItemId = newItem.Id,
                            FiscalYearId = closingStockDto.FiscalYearId,
                            ClosingStock = closingStockDto.ClosingStock,
                            ClosingStockValue = calculatedClosingStockValue,
                            PurchasePrice = closingStockDto.PurchasePrice,
                            SalesPrice = closingStockDto.SalesPrice,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };

                        closingStocks.Add(closingStock);
                    }

                    newItem.ClosingStocksByFiscalYear = closingStocks;
                }

                // 14. Add stock entry if opening stock > 0
                if (openingStock > 0)
                {
                    var stockEntry = new StockEntry
                    {
                        Id = Guid.NewGuid(),
                        ItemId = newItem.Id,
                        Date = DateTime.UtcNow,
                        WsUnit = createItemDto.WsUnit,
                        Quantity = openingStock,
                        Price = salesPrice,
                        NetPrice = salesPrice,
                        PuPrice = purchasePrice,
                        NetPuPrice = purchasePrice,
                        MainUnitPuPrice = createItemDto.MainUnitPuPrice,
                        Mrp = salesPrice,
                        BatchNumber = "XXX",
                        Currency = createItemDto.Currency ?? "NPR",
                        StoreId = createItemDto.StoreId ?? defaultStore?.Id,
                        RackId = createItemDto.RackId ?? defaultRack?.Id,
                        ExpiryDate = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(2)),
                        ExpiryStatus = "safe",
                        DaysUntilExpiry = 730,
                        FiscalYearId = fiscalYearId,
                        UniqueUuid = Guid.NewGuid().ToString(),
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    newItem.StockEntries = new List<StockEntry> { stockEntry };
                }

                // 15. Save the item and all related entities
                await _context.Items.AddAsync(newItem);
                await _context.SaveChangesAsync();

                // 16. Commit transaction
                await transaction.CommitAsync();

                _logger.LogInformation("Item created successfully: {ItemName} (ID: {ItemId}, Unique: {UniqueNumber})",
                    newItem.Name, newItem.Id, newItem.UniqueNumber);

                return newItem;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        private async Task<Store?> GetDefaultStoreAsync(Guid companyId)
        {
            // First try to find store named "Main"
            var mainStore = await _context.Stores
                .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                         s.Name == "Main" &&
                                         s.IsActive);

            if (mainStore != null)
                return mainStore;

            // Then try "Default"
            var defaultStore = await _context.Stores
                .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                         s.Name == "Default" &&
                                         s.IsActive);

            if (defaultStore != null)
                return defaultStore;

            // Finally, get the first active store
            return await _context.Stores
                .FirstOrDefaultAsync(s => s.CompanyId == companyId && s.IsActive);
        }

        private async Task<Rack?> GetDefaultRackAsync(Guid storeId)
        {
            // First try to find rack named "Default"
            var defaultRack = await _context.Racks
                .FirstOrDefaultAsync(r => r.StoreId == storeId &&
                                         r.Name == "Default" &&
                                         r.IsActive);

            if (defaultRack != null)
                return defaultRack;

            // Then try "Main"
            var mainRack = await _context.Racks
                .FirstOrDefaultAsync(r => r.StoreId == storeId &&
                                         r.Name == "Main" &&
                                         r.IsActive);

            if (mainRack != null)
                return mainRack;

            // Finally, get the first active rack
            return await _context.Racks
                .FirstOrDefaultAsync(r => r.StoreId == storeId && r.IsActive);
        }


        /// <summary>
        /// Gets item by ID with all related data
        /// </summary>
        public async Task<Item> GetItemByIdAsync(Guid itemId)
        {
            try
            {
                var item = await _context.Items
                    .Include(i => i.Category)
                    .Include(i => i.ItemCompany)
                    .Include(i => i.Unit)
                    .Include(i => i.MainUnit)
                    .Include(i => i.Company)
                    .Include(i => i.FiscalYear)
                    .Include(i => i.OriginalFiscalYear)
                    .Include(i => i.ItemCompositions)
                        .ThenInclude(ic => ic.Composition)
                    .Include(i => i.InitialOpeningStock)
                        .ThenInclude(ios => ios!.InitialFiscalYear)
                    .Include(i => i.ClosingStocksByFiscalYear)
                        .ThenInclude(cs => cs.FiscalYear)
                    .Include(i => i.OpeningStocksByFiscalYear)
                        .ThenInclude(os => os.FiscalYear)
                    .Include(i => i.StockEntries)
                    .AsSplitQuery()
                    .FirstOrDefaultAsync(i => i.Id == itemId);

                if (item == null)
                {
                    _logger.LogWarning("Item {ItemId} not found", itemId);
                }

                return item;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting item {ItemId}", itemId);
                throw;
            }
        }

        /// <summary>
        /// Gets all items for a company in a specific fiscal year
        /// </summary>
        public async Task<List<Item>> GetItemsByCompanyAsync(Guid companyId, Guid fiscalYearId)
        {
            try
            {
                var items = await _context.Items
                    .Where(i => i.CompanyId == companyId && i.FiscalYearId == fiscalYearId)
                    .Include(i => i.Category)
                    .Include(i => i.ItemCompany)
                    .Include(i => i.Unit)
                    .Include(i => i.MainUnit)
                    .Include(i => i.ItemCompositions)
                        .ThenInclude(ic => ic.Composition)
                    .Include(i => i.StockEntries)
                    .OrderBy(i => i.Name)
                    .ToListAsync();

                _logger.LogInformation("Retrieved {Count} items for company {CompanyId}", items.Count, companyId);
                return items;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting items for company {CompanyId}", companyId);
                throw;
            }
        }

        /// <summary>
        /// Updates an existing item with transaction-aware stock updates
        /// </summary>
        public async Task<Item> UpdateItemAsync(Guid itemId, UpdateItemDTO updateItemDto, Guid currentFiscalYearId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // Load the item WITH tracking for updates
                var existingItem = await _context.Items
                    .Include(i => i.ItemCompositions)
                    .Include(i => i.InitialOpeningStock)
                    .Include(i => i.OpeningStocksByFiscalYear)
                    .Include(i => i.ClosingStocksByFiscalYear)
                    .Include(i => i.StockEntries)
                    .Include(i => i.Sales)
                    .Include(i => i.Purchases)
                    .Include(i => i.SalesReturns)
                    .Include(i => i.PurchaseReturns)
                    .FirstOrDefaultAsync(i => i.Id == itemId);

                if (existingItem == null)
                {
                    throw new KeyNotFoundException($"Item with ID {itemId} not found");
                }

                // Check for duplicate name (excluding current item)
                if (!string.IsNullOrEmpty(updateItemDto.Name))
                {
                    var duplicateItem = await _context.Items
                        .AsNoTracking()
                        .FirstOrDefaultAsync(i => i.Id != itemId
                            && i.CompanyId == existingItem.CompanyId
                            && i.FiscalYearId == existingItem.FiscalYearId
                            && i.Name.ToLower() == updateItemDto.Name.Trim().ToLower());

                    if (duplicateItem != null)
                    {
                        throw new InvalidOperationException($"Item '{updateItemDto.Name?.Trim()}' already exists for this fiscal year");
                    }
                }

                // Check if item has any transactions
                bool hasTransactions = existingItem.Sales.Any() || existingItem.Purchases.Any() ||
                                      existingItem.SalesReturns.Any() || existingItem.PurchaseReturns.Any();

                // Update basic properties
                if (!string.IsNullOrEmpty(updateItemDto.Name))
                {
                    existingItem.Name = updateItemDto.Name.Trim();
                }

                existingItem.Hscode = updateItemDto.Hscode;

                if (updateItemDto.CategoryId.HasValue)
                {
                    var categoryExists = await _context.Categories
                        .AsNoTracking()
                        .AnyAsync(c => c.Id == updateItemDto.CategoryId.Value && c.CompanyId == existingItem.CompanyId);

                    if (!categoryExists)
                    {
                        throw new InvalidOperationException("Invalid category");
                    }
                    existingItem.CategoryId = updateItemDto.CategoryId.Value;
                }

                if (updateItemDto.ItemsCompanyId.HasValue)
                {
                    var itemsCompanyExists = await _context.ItemCompanies
                        .AsNoTracking()
                        .AnyAsync(ic => ic.Id == updateItemDto.ItemsCompanyId.Value && ic.CompanyId == existingItem.CompanyId);

                    if (!itemsCompanyExists)
                    {
                        throw new InvalidOperationException("Invalid item company");
                    }
                    existingItem.ItemsCompanyId = updateItemDto.ItemsCompanyId.Value;
                }

                // Update prices
                existingItem.Price = updateItemDto.Price ?? existingItem.Price;
                existingItem.PuPrice = updateItemDto.PuPrice ?? existingItem.PuPrice;
                existingItem.MainUnitPuPrice = updateItemDto.MainUnitPuPrice ?? existingItem.MainUnitPuPrice;

                if (updateItemDto.MainUnitId.HasValue)
                {
                    if (updateItemDto.MainUnitId.Value != Guid.Empty)
                    {
                        var mainUnitExists = await _context.MainUnits
                            .AsNoTracking()
                            .AnyAsync(u => u.Id == updateItemDto.MainUnitId.Value && u.CompanyId == existingItem.CompanyId);

                        if (!mainUnitExists)
                        {
                            throw new InvalidOperationException("Invalid main unit");
                        }
                    }
                    existingItem.MainUnitId = updateItemDto.MainUnitId.Value;
                }

                existingItem.WsUnit = updateItemDto.WsUnit ?? existingItem.WsUnit;

                if (updateItemDto.UnitId.HasValue)
                {
                    var unitExists = await _context.Units
                        .AsNoTracking()
                        .AnyAsync(u => u.Id == updateItemDto.UnitId.Value && u.CompanyId == existingItem.CompanyId);

                    if (!unitExists)
                    {
                        throw new InvalidOperationException("Invalid unit");
                    }
                    existingItem.UnitId = updateItemDto.UnitId.Value;
                }

                if (!string.IsNullOrEmpty(updateItemDto.VatStatus))
                {
                    existingItem.VatStatus = updateItemDto.VatStatus;
                }

                existingItem.MinStock = updateItemDto.MinStock ?? existingItem.MinStock;
                existingItem.MaxStock = updateItemDto.MaxStock ?? existingItem.MaxStock;
                existingItem.ReorderLevel = updateItemDto.ReorderLevel ?? existingItem.ReorderLevel;

                if (!string.IsNullOrEmpty(updateItemDto.Status))
                {
                    existingItem.Status = updateItemDto.Status;
                }

                existingItem.UpdatedAt = DateTime.UtcNow;

                // Update compositions if provided
                if (updateItemDto.CompositionIds != null)
                {
                    // Remove existing compositions
                    var existingCompositions = await _context.ItemCompositions
                        .Where(ic => ic.ItemId == itemId)
                        .ToListAsync();

                    if (existingCompositions.Any())
                    {
                        _context.ItemCompositions.RemoveRange(existingCompositions);
                    }

                    // Add new compositions
                    if (updateItemDto.CompositionIds.Any())
                    {
                        // Validate new compositions
                        var validCompositionsCount = await _context.Compositions
                            .AsNoTracking()
                            .Where(c => updateItemDto.CompositionIds.Contains(c.Id) && c.CompanyId == existingItem.CompanyId)
                            .CountAsync();

                        if (validCompositionsCount != updateItemDto.CompositionIds.Count)
                        {
                            throw new InvalidOperationException("One or more invalid compositions");
                        }

                        var newCompositions = updateItemDto.CompositionIds.Select(compositionId => new ItemComposition
                        {
                            ItemId = existingItem.Id,
                            CompositionId = compositionId
                        }).ToList();

                        await _context.ItemCompositions.AddRangeAsync(newCompositions);
                    }
                }

                // Handle stock updates ONLY if item has no transactions
                if (!hasTransactions)
                {
                    // Update opening stock if provided
                    if (updateItemDto.OpeningStock.HasValue)
                    {
                        decimal newOpeningStock = updateItemDto.OpeningStock.Value;
                        decimal oldOpeningStock = existingItem.OpeningStock;
                        existingItem.OpeningStock = newOpeningStock;

                        // Calculate opening stock balance
                        decimal openingStockBalance = newOpeningStock * (existingItem.PuPrice ?? 0);

                        // Update or create initial opening stock
                        if (existingItem.InitialOpeningStock != null)
                        {
                            existingItem.InitialOpeningStock.OpeningStock = newOpeningStock;
                            existingItem.InitialOpeningStock.OpeningStockValue = updateItemDto.InitialOpeningStock?.OpeningStockValue ?? openingStockBalance;
                            existingItem.InitialOpeningStock.PurchasePrice = updateItemDto.InitialOpeningStock?.PurchasePrice ?? (existingItem.PuPrice ?? 0);
                            existingItem.InitialOpeningStock.SalesPrice = updateItemDto.InitialOpeningStock?.SalesPrice ?? (existingItem.Price ?? 0);
                            existingItem.InitialOpeningStock.Date = updateItemDto.InitialOpeningStock?.Date ?? existingItem.InitialOpeningStock.Date;
                            existingItem.InitialOpeningStock.UpdatedAt = DateTime.UtcNow;
                        }
                        else if (updateItemDto.InitialOpeningStock != null)
                        {
                            var initialOpeningStock = new ItemInitialOpeningStock
                            {
                                Id = Guid.NewGuid(),
                                ItemId = existingItem.Id,
                                InitialFiscalYearId = updateItemDto.InitialOpeningStock.InitialFiscalYearId ?? currentFiscalYearId,
                                OpeningStock = newOpeningStock,
                                OpeningStockValue = updateItemDto.InitialOpeningStock.OpeningStockValue,
                                PurchasePrice = updateItemDto.InitialOpeningStock.PurchasePrice,
                                SalesPrice = updateItemDto.InitialOpeningStock.SalesPrice,
                                Date = updateItemDto.InitialOpeningStock.Date ?? DateTime.UtcNow,
                                CreatedAt = DateTime.UtcNow,
                                UpdatedAt = DateTime.UtcNow
                            };
                            await _context.Set<ItemInitialOpeningStock>().AddAsync(initialOpeningStock);
                        }

                        // Update opening stocks by fiscal year for current fiscal year
                        var currentFiscalYearOpeningStock = existingItem.OpeningStocksByFiscalYear?
                            .FirstOrDefault(os => os.FiscalYearId == currentFiscalYearId);

                        if (currentFiscalYearOpeningStock != null)
                        {
                            currentFiscalYearOpeningStock.OpeningStock = newOpeningStock;
                            currentFiscalYearOpeningStock.OpeningStockValue = openingStockBalance;
                            currentFiscalYearOpeningStock.PurchasePrice = existingItem.PuPrice ?? 0;
                            currentFiscalYearOpeningStock.SalesPrice = existingItem.Price ?? 0;
                            currentFiscalYearOpeningStock.UpdatedAt = DateTime.UtcNow;
                        }
                        else
                        {
                            var newOpeningStockRecord = new ItemOpeningStockByFiscalYear
                            {
                                Id = Guid.NewGuid(),
                                ItemId = existingItem.Id,
                                FiscalYearId = currentFiscalYearId,
                                OpeningStock = newOpeningStock,
                                OpeningStockValue = openingStockBalance,
                                PurchasePrice = existingItem.PuPrice ?? 0,
                                SalesPrice = existingItem.Price ?? 0,
                                CreatedAt = DateTime.UtcNow,
                                UpdatedAt = DateTime.UtcNow
                            };

                            await _context.Set<ItemOpeningStockByFiscalYear>().AddAsync(newOpeningStockRecord);
                        }

                        // CRITICAL FIX: Preserve existing stock entries instead of deleting them
                        var existingStockEntries = await _context.StockEntries
                            .Where(se => se.ItemId == itemId)
                            .ToListAsync();

                        if (newOpeningStock > 0)
                        {
                            // If no stock entries exist, create an initial one
                            if (!existingStockEntries.Any())
                            {
                                var stockEntry = new StockEntry
                                {
                                    Id = Guid.NewGuid(),
                                    ItemId = existingItem.Id,
                                    Date = DateTime.UtcNow,
                                    WsUnit = existingItem.WsUnit,
                                    Quantity = newOpeningStock,
                                    Price = existingItem.Price ?? 0,
                                    NetPrice = existingItem.Price ?? 0,
                                    PuPrice = existingItem.PuPrice ?? 0,
                                    NetPuPrice = existingItem.PuPrice ?? 0,
                                    MainUnitPuPrice = existingItem.MainUnitPuPrice,
                                    Mrp = existingItem.Price ?? 0,
                                    BatchNumber = "INITIAL",
                                    ExpiryDate = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(2)),
                                    ExpiryStatus = "safe",
                                    DaysUntilExpiry = 730,
                                    FiscalYearId = currentFiscalYearId,
                                    UniqueUuid = Guid.NewGuid().ToString(),
                                    CreatedAt = DateTime.UtcNow,
                                    UpdatedAt = DateTime.UtcNow
                                };

                                await _context.StockEntries.AddAsync(stockEntry);
                            }
                            // If there's exactly one stock entry and it's an initial entry, update its quantity
                            else if (existingStockEntries.Count == 1 &&
                                     existingStockEntries.First().BatchNumber == "INITIAL" &&
                                     existingStockEntries.First().PurchaseBillId == null &&
                                     existingStockEntries.First().SalesReturnBillId == null)
                            {
                                var initialEntry = existingStockEntries.First();
                                initialEntry.Quantity = newOpeningStock;
                                initialEntry.Price = existingItem.Price ?? 0;
                                initialEntry.NetPrice = existingItem.Price ?? 0;
                                initialEntry.PuPrice = existingItem.PuPrice ?? 0;
                                initialEntry.NetPuPrice = existingItem.PuPrice ?? 0;
                                initialEntry.UpdatedAt = DateTime.UtcNow;
                            }
                            // If there are existing stock entries from transactions, don't modify them
                            else if (existingStockEntries.Count > 0)
                            {
                                _logger.LogInformation("Item {ItemId} has {Count} existing stock entries from transactions. Preserving them during update.",
                                    itemId, existingStockEntries.Count);
                            }
                        }
                        else if (newOpeningStock == 0 && existingStockEntries.Any())
                        {
                            // Only remove stock entries if they are all initial entries with no transaction links
                            bool hasTransactionLinks = existingStockEntries.Any(se =>
                                se.PurchaseBillId != null ||
                                se.SalesReturnBillId != null ||
                                (se.BatchNumber != "INITIAL" && se.BatchNumber != "XXX"));

                            if (!hasTransactionLinks)
                            {
                                _context.StockEntries.RemoveRange(existingStockEntries);
                                _logger.LogInformation("Removed all initial stock entries for item {ItemId} as opening stock set to 0", itemId);
                            }
                            else
                            {
                                _logger.LogWarning("Cannot remove stock entries for item {ItemId} as they are linked to transactions", itemId);
                            }
                        }
                    }

                    // Update opening stocks by fiscal year if provided
                    if (updateItemDto.OpeningStocksByFiscalYear != null && updateItemDto.OpeningStocksByFiscalYear.Any())
                    {
                        foreach (var openingStockDto in updateItemDto.OpeningStocksByFiscalYear)
                        {
                            var existingOpeningStock = existingItem.OpeningStocksByFiscalYear?
                                .FirstOrDefault(os => os.FiscalYearId == openingStockDto.FiscalYearId);

                            if (existingOpeningStock != null)
                            {
                                existingOpeningStock.OpeningStock = openingStockDto.OpeningStock;
                                existingOpeningStock.OpeningStockValue = openingStockDto.OpeningStockValue;
                                existingOpeningStock.PurchasePrice = openingStockDto.PurchasePrice;
                                existingOpeningStock.SalesPrice = openingStockDto.SalesPrice;
                                existingOpeningStock.UpdatedAt = DateTime.UtcNow;
                            }
                            else
                            {
                                // Validate fiscal year exists and belongs to company
                                var fiscalYear = await _context.FiscalYears
                                    .AsNoTracking()
                                    .FirstOrDefaultAsync(f => f.Id == openingStockDto.FiscalYearId && f.CompanyId == existingItem.CompanyId);

                                if (fiscalYear == null)
                                {
                                    throw new InvalidOperationException($"Fiscal year {openingStockDto.FiscalYearId} not found");
                                }

                                var newOpeningStock = new ItemOpeningStockByFiscalYear
                                {
                                    Id = Guid.NewGuid(),
                                    ItemId = existingItem.Id,
                                    FiscalYearId = openingStockDto.FiscalYearId,
                                    OpeningStock = openingStockDto.OpeningStock,
                                    OpeningStockValue = openingStockDto.OpeningStockValue,
                                    PurchasePrice = openingStockDto.PurchasePrice,
                                    SalesPrice = openingStockDto.SalesPrice,
                                    CreatedAt = DateTime.UtcNow,
                                    UpdatedAt = DateTime.UtcNow
                                };

                                await _context.Set<ItemOpeningStockByFiscalYear>().AddAsync(newOpeningStock);
                            }
                        }
                    }

                    // Update closing stocks by fiscal year if provided
                    if (updateItemDto.ClosingStocksByFiscalYear != null && updateItemDto.ClosingStocksByFiscalYear.Any())
                    {
                        foreach (var closingStockDto in updateItemDto.ClosingStocksByFiscalYear)
                        {
                            var existingClosingStock = existingItem.ClosingStocksByFiscalYear?
                                .FirstOrDefault(cs => cs.FiscalYearId == closingStockDto.FiscalYearId);

                            if (existingClosingStock != null)
                            {
                                existingClosingStock.ClosingStock = closingStockDto.ClosingStock;
                                existingClosingStock.ClosingStockValue = closingStockDto.ClosingStockValue;
                                existingClosingStock.PurchasePrice = closingStockDto.PurchasePrice;
                                existingClosingStock.SalesPrice = closingStockDto.SalesPrice;
                                existingClosingStock.UpdatedAt = DateTime.UtcNow;
                            }
                            else
                            {
                                // Validate fiscal year exists and belongs to company
                                var fiscalYear = await _context.FiscalYears
                                    .AsNoTracking()
                                    .FirstOrDefaultAsync(f => f.Id == closingStockDto.FiscalYearId && f.CompanyId == existingItem.CompanyId);

                                if (fiscalYear == null)
                                {
                                    throw new InvalidOperationException($"Fiscal year {closingStockDto.FiscalYearId} not found");
                                }

                                var newClosingStock = new ItemClosingStockByFiscalYear
                                {
                                    Id = Guid.NewGuid(),
                                    ItemId = existingItem.Id,
                                    FiscalYearId = closingStockDto.FiscalYearId,
                                    ClosingStock = closingStockDto.ClosingStock,
                                    ClosingStockValue = closingStockDto.ClosingStockValue,
                                    PurchasePrice = closingStockDto.PurchasePrice,
                                    SalesPrice = closingStockDto.SalesPrice,
                                    CreatedAt = DateTime.UtcNow,
                                    UpdatedAt = DateTime.UtcNow
                                };

                                await _context.Set<ItemClosingStockByFiscalYear>().AddAsync(newClosingStock);
                            }
                        }
                    }
                }

                try
                {
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    _logger.LogInformation("Item {ItemId} updated successfully. HasTransactions: {HasTransactions}", itemId, hasTransactions);
                    return existingItem;
                }
                catch (DbUpdateConcurrencyException ex)
                {
                    await transaction.RollbackAsync();
                    _logger.LogError(ex, "Concurrency error updating item {ItemId}. Data may have been modified by another process.", itemId);
                    throw new InvalidOperationException("The item was modified by another process. Please refresh and try again.");
                }
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        /// <summary>
        /// Deletes an item (checks for transactions first)
        /// </summary>

        // public async Task<bool> DeleteItemAsync(Guid itemId, Guid companyId)
        // {
        //     using var transaction = await _context.Database.BeginTransactionAsync();

        //     try
        //     {
        //         // Check if item exists and belongs to the company
        //         var item = await _context.Items
        //             .FirstOrDefaultAsync(i => i.Id == itemId && i.CompanyId == companyId);

        //         if (item == null)
        //         {
        //             _logger.LogWarning("Item {ItemId} not found for company {CompanyId}", itemId, companyId);
        //             return false;
        //         }

        //         // Check if the item has any related transactions
        //         bool hasSales = await _context.SalesBills
        //             .AnyAsync(sb => sb.CompanyId == companyId && 
        //                           sb.Items != null && 
        //                           sb.Items.Any(i => i.ItemId == itemId));

        //         bool hasSalesReturn = await _context.SalesReturns
        //             .AnyAsync(sr => sr.CompanyId == companyId && 
        //                           sr.Items != null && 
        //                           sr.Items.Any(i => i.ItemId == itemId));

        //         bool hasPurchase = await _context.PurchaseBills
        //             .AnyAsync(pb => pb.CompanyId == companyId && 
        //                           pb.Items != null && 
        //                           pb.Items.Any(i => i.ItemId == itemId));

        //         bool hasPurchaseReturn = await _context.PurchaseReturns
        //             .AnyAsync(pr => pr.CompanyId == companyId && 
        //                           pr.Items != null && 
        //                           pr.Items.Any(i => i.ItemId == itemId));

        //         // Now using the correct DbSet name
        //         bool hasStockAdjustment = await _context.StockAdjustments
        //             .AnyAsync(sa => sa.CompanyId == companyId && 
        //                           sa.Items != null && 
        //                           sa.Items.Any(i => i.ItemId == itemId));

        //         bool hasTransaction = await _context.Transactions
        //             .AnyAsync(t => t.ItemId == itemId && t.CompanyId == companyId);

        //         if (hasSales || hasSalesReturn || hasPurchase || hasPurchaseReturn || hasStockAdjustment || hasTransaction)
        //         {
        //             _logger.LogWarning("Cannot delete item {ItemId} because it has related transactions", itemId);
        //             return false;
        //         }

        //         // Load related entities for deletion
        //         await _context.Entry(item)
        //             .Collection(i => i.ItemCompositions)
        //             .LoadAsync();

        //         await _context.Entry(item)
        //             .Collection(i => i.StockEntries)
        //             .LoadAsync();

        //         // Check for InitialOpeningStock
        //         var initialOpeningStock = await _context.Set<ItemInitialOpeningStock>()
        //             .FirstOrDefaultAsync(ios => ios.ItemId == itemId);

        //         if (initialOpeningStock != null)
        //         {
        //             _context.Set<ItemInitialOpeningStock>().Remove(initialOpeningStock);
        //         }

        //         // Delete opening stocks by fiscal year
        //         var openingStocks = await _context.Set<ItemOpeningStockByFiscalYear>()
        //             .Where(os => os.ItemId == itemId)
        //             .ToListAsync();

        //         if (openingStocks.Any())
        //         {
        //             _context.Set<ItemOpeningStockByFiscalYear>().RemoveRange(openingStocks);
        //         }

        //         // Delete closing stocks by fiscal year
        //         var closingStocks = await _context.Set<ItemClosingStockByFiscalYear>()
        //             .Where(cs => cs.ItemId == itemId)
        //             .ToListAsync();

        //         if (closingStocks.Any())
        //         {
        //             _context.Set<ItemClosingStockByFiscalYear>().RemoveRange(closingStocks);
        //         }

        //         // Delete related entities
        //         if (item.ItemCompositions != null && item.ItemCompositions.Any())
        //         {
        //             _context.ItemCompositions.RemoveRange(item.ItemCompositions);
        //         }

        //         if (item.StockEntries != null && item.StockEntries.Any())
        //         {
        //             _context.StockEntries.RemoveRange(item.StockEntries);
        //         }

        //         // Finally delete the item
        //         _context.Items.Remove(item);
        //         await _context.SaveChangesAsync();
        //         await transaction.CommitAsync();

        //         _logger.LogInformation("Item {ItemId} deleted successfully", itemId);
        //         return true;
        //     }
        //     catch (Exception ex)
        //     {
        //         await transaction.RollbackAsync();
        //         _logger.LogError(ex, "Error deleting item {ItemId}", itemId);
        //         throw;
        //     }
        // }

        public async Task<bool> DeleteItemAsync(Guid itemId, Guid companyId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // Check if item exists and belongs to the company
                var item = await _context.Items
                    .FirstOrDefaultAsync(i => i.Id == itemId && i.CompanyId == companyId);

                if (item == null)
                {
                    _logger.LogWarning("Item {ItemId} not found for company {CompanyId}", itemId, companyId);
                    return false;
                }

                // Check if the item has any related transactions via TransactionItems
                bool hasSales = await _context.SalesBills
                    .AnyAsync(sb => sb.CompanyId == companyId &&
                                  sb.Items != null &&
                                  sb.Items.Any(i => i.ItemId == itemId));

                bool hasSalesReturn = await _context.SalesReturns
                    .AnyAsync(sr => sr.CompanyId == companyId &&
                                  sr.Items != null &&
                                  sr.Items.Any(i => i.ItemId == itemId));

                bool hasPurchase = await _context.PurchaseBills
                    .AnyAsync(pb => pb.CompanyId == companyId &&
                                  pb.Items != null &&
                                  pb.Items.Any(i => i.ItemId == itemId));

                bool hasPurchaseReturn = await _context.PurchaseReturns
                    .AnyAsync(pr => pr.CompanyId == companyId &&
                                  pr.Items != null &&
                                  pr.Items.Any(i => i.ItemId == itemId));

                bool hasStockAdjustment = await _context.StockAdjustments
                    .AnyAsync(sa => sa.CompanyId == companyId &&
                                  sa.Items != null &&
                                  sa.Items.Any(i => i.ItemId == itemId));

                // Check if the item has any related transactions via TransactionItems (new structure)
                bool hasTransaction = await _context.TransactionItems
                    .AnyAsync(ti => ti.ItemId == itemId &&
                                  ti.Transaction != null &&
                                  ti.Transaction.CompanyId == companyId);

                if (hasSales || hasSalesReturn || hasPurchase || hasPurchaseReturn || hasStockAdjustment || hasTransaction)
                {
                    _logger.LogWarning("Cannot delete item {ItemId} because it has related transactions", itemId);
                    return false;
                }

                // Load related entities for deletion
                await _context.Entry(item)
                    .Collection(i => i.ItemCompositions)
                    .LoadAsync();

                await _context.Entry(item)
                    .Collection(i => i.StockEntries)
                    .LoadAsync();

                // Check for InitialOpeningStock
                var initialOpeningStock = await _context.Set<ItemInitialOpeningStock>()
                    .FirstOrDefaultAsync(ios => ios.ItemId == itemId);

                if (initialOpeningStock != null)
                {
                    _context.Set<ItemInitialOpeningStock>().Remove(initialOpeningStock);
                }

                // Delete opening stocks by fiscal year
                var openingStocks = await _context.Set<ItemOpeningStockByFiscalYear>()
                    .Where(os => os.ItemId == itemId)
                    .ToListAsync();

                if (openingStocks.Any())
                {
                    _context.Set<ItemOpeningStockByFiscalYear>().RemoveRange(openingStocks);
                }

                // Delete closing stocks by fiscal year
                var closingStocks = await _context.Set<ItemClosingStockByFiscalYear>()
                    .Where(cs => cs.ItemId == itemId)
                    .ToListAsync();

                if (closingStocks.Any())
                {
                    _context.Set<ItemClosingStockByFiscalYear>().RemoveRange(closingStocks);
                }

                // Delete related entities
                if (item.ItemCompositions != null && item.ItemCompositions.Any())
                {
                    _context.ItemCompositions.RemoveRange(item.ItemCompositions);
                }

                if (item.StockEntries != null && item.StockEntries.Any())
                {
                    _context.StockEntries.RemoveRange(item.StockEntries);
                }

                // Finally delete the item
                _context.Items.Remove(item);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("Item {ItemId} deleted successfully", itemId);
                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error deleting item {ItemId}", itemId);
                throw;
            }
        }
        /// <summary>
        /// Searches items by name, company, or category
        /// </summary>
        public async Task<List<Item>> SearchItemsAsync(Guid companyId, string searchTerm)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(searchTerm))
                {
                    return await GetItemsByCompanyAsync(companyId, await GetCurrentFiscalYearIdAsync(companyId));
                }

                var items = await _context.Items
                    .Where(i => i.CompanyId == companyId &&
                               (i.Name.ToLower().Contains(searchTerm.ToLower()) ||
                                (i.ItemCompany != null && i.ItemCompany.Name.ToLower().Contains(searchTerm.ToLower())) ||
                                (i.Category != null && i.Category.Name.ToLower().Contains(searchTerm.ToLower())) ||
                                i.UniqueNumber.ToString().Contains(searchTerm) ||
                                i.BarcodeNumber.ToString().Contains(searchTerm)))
                    .Include(i => i.Category)
                    .Include(i => i.ItemCompany)
                    .Include(i => i.Unit)
                    .Include(i => i.MainUnit)
                    .OrderBy(i => i.Name)
                    .Take(100) // Limit results
                    .ToListAsync();

                _logger.LogInformation("Found {Count} items matching '{SearchTerm}' for company {CompanyId}",
                    items.Count, searchTerm, companyId);
                return items;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching items with term '{SearchTerm}' for company {CompanyId}",
                    searchTerm, companyId);
                throw;
            }
        }

        /// <summary>
        /// Gets detailed item information
        /// </summary>
        public async Task<ItemDetailsDTO> GetItemDetailsAsync(Guid itemId)
        {
            try
            {
                var item = await GetItemByIdAsync(itemId);

                if (item == null)
                {
                    return null;
                }

                // Calculate current stock
                decimal currentStock = item.OpeningStock;
                if (item.StockEntries != null && item.StockEntries.Any())
                {
                    currentStock = item.StockEntries.Sum(se => se.Quantity);
                }

                var details = new ItemDetailsDTO
                {
                    Id = item.Id,
                    Name = item.Name,
                    Hscode = item.Hscode,
                    CategoryId = item.CategoryId,
                    CategoryName = item.Category?.Name,
                    ItemsCompanyId = item.ItemsCompanyId,
                    ItemsCompanyName = item.ItemCompany?.Name,
                    Price = item.Price,
                    PuPrice = item.PuPrice,
                    MainUnitPuPrice = item.MainUnitPuPrice,
                    MainUnitId = item.MainUnitId,
                    MainUnitName = item.MainUnit?.Name,
                    WsUnit = item.WsUnit,
                    UnitId = item.UnitId,
                    UnitName = item.Unit?.Name,
                    VatStatus = item.VatStatus,
                    OpeningStock = item.OpeningStock,
                    CurrentStock = currentStock,
                    MinStock = item.MinStock,
                    MaxStock = item.MaxStock,
                    ReorderLevel = item.ReorderLevel,
                    UniqueNumber = item.UniqueNumber,
                    BarcodeNumber = item.BarcodeNumber,
                    CompanyId = item.CompanyId,
                    CompanyName = item.Company?.Name,
                    FiscalYearId = item.FiscalYearId,
                    FiscalYearName = item.FiscalYear?.Name,
                    Status = item.Status,
                    CreatedAt = item.CreatedAt,
                    UpdatedAt = item.UpdatedAt,
                    StockValue = currentStock * (item.Price ?? 0),
                    Compositions = item.ItemCompositions?.Select(ic => new CompositionItemDto
                    {
                        Id = ic.Composition?.Id ?? Guid.Empty,
                        Name = ic.Composition?.Name ?? string.Empty,
                        VatStatus = item.VatStatus,
                        Status = item.Status,
                        Price = item.Price,
                        PuPrice = item.PuPrice,
                        UnitName = item.Unit?.Name,
                        CategoryName = item.Category?.Name,
                        CreatedAt = item.CreatedAt
                    }).ToList() ?? new List<CompositionItemDto>(),
                    StockEntriesCount = item.StockEntries?.Count ?? 0,
                    HasTransactions = await CheckItemHasTransactionsAsync(itemId)
                };

                return details;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting item details for {ItemId}", itemId);
                throw;
            }
        }

        /// <summary>
        /// Gets items with stock below threshold
        /// </summary>
        public async Task<List<Item>> GetItemsWithLowStockAsync(Guid companyId, decimal threshold = 10)
        {
            try
            {
                var currentFiscalYearId = await GetCurrentFiscalYearIdAsync(companyId);

                var items = await _context.Items
                    .Where(i => i.CompanyId == companyId && i.FiscalYearId == currentFiscalYearId)
                    .Include(i => i.Category)
                    .Include(i => i.ItemCompany)
                    .Include(i => i.StockEntries)
                    .ToListAsync();

                var lowStockItems = items.Where(item =>
                {
                    decimal currentStock = item.OpeningStock;
                    if (item.StockEntries != null && item.StockEntries.Any())
                    {
                        currentStock = item.StockEntries.Sum(se => se.Quantity);
                    }
                    return currentStock <= threshold;
                }).ToList();

                _logger.LogInformation("Found {Count} items with low stock for company {CompanyId}",
                    lowStockItems.Count, companyId);
                return lowStockItems;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting low stock items for company {CompanyId}", companyId);
                throw;
            }
        }

        /// <summary>
        /// Gets current fiscal year ID for a company
        /// </summary>
        public async Task<Guid> GetCurrentFiscalYearIdAsync(Guid companyId)
        {
            var fiscalYear = await _context.FiscalYears
                .FirstOrDefaultAsync(f => f.CompanyId == companyId && f.IsActive);

            if (fiscalYear == null)
            {
                fiscalYear = await _context.FiscalYears
                    .Where(f => f.CompanyId == companyId)
                    .OrderByDescending(f => f.StartDate)
                    .FirstOrDefaultAsync();
            }

            return fiscalYear?.Id ?? throw new InvalidOperationException("No fiscal year found for company");
        }


        /// <summary>
        /// Checks if item has any transactions
        /// </summary>
        public async Task<bool> CheckItemHasTransactionsAsync(Guid itemId)
        {
            return await _context.TransactionItems
                .AnyAsync(ti => ti.ItemId == itemId);
        }









        /// <summary>
        /// Updates batch information for a specific batch number across all related entities
        /// </summary>
        public async Task<bool> UpdateBatchByNumberAsync(Guid itemId, string oldBatchNumber, UpdateBatchByNumberDTO updateDto, Guid companyId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                _logger.LogInformation("Updating batch for item {ItemId}, old batch number: {OldBatchNumber} to new batch number: {NewBatchNumber}",
                    itemId, oldBatchNumber, updateDto.NewBatchNumber);

                // 1. Validate input
                if (string.IsNullOrWhiteSpace(updateDto.NewBatchNumber))
                {
                    throw new ArgumentException("New batch number is required");
                }

                if (string.IsNullOrWhiteSpace(oldBatchNumber))
                {
                    throw new ArgumentException("Old batch number is required");
                }

                if (updateDto.Price <= 0)
                {
                    throw new ArgumentException("Price must be greater than 0");
                }

                if (updateDto.Mrp <= 0)
                {
                    throw new ArgumentException("MRP must be greater than 0");
                }

                // 2. Find the item with its stock entries
                var item = await _context.Items
                    .Include(i => i.StockEntries)
                    .FirstOrDefaultAsync(i => i.Id == itemId && i.CompanyId == companyId);

                if (item == null)
                {
                    _logger.LogWarning("Item {ItemId} not found for company {CompanyId}", itemId, companyId);
                    return false;
                }

                // 3. Find the stock entry by batch number
                var stockEntry = item.StockEntries?
                    .FirstOrDefault(se => se.BatchNumber == oldBatchNumber);

                if (stockEntry == null)
                {
                    _logger.LogWarning("Batch '{OldBatchNumber}' not found for item {ItemId}", oldBatchNumber, itemId);
                    return false;
                }

                // 4. Update the stock entry
                stockEntry.BatchNumber = updateDto.NewBatchNumber;
                if (updateDto.ExpiryDate.HasValue)
                {
                    stockEntry.ExpiryDate = updateDto.ExpiryDate.Value;
                    stockEntry.ExpiryStatus = CalculateExpiryStatus(updateDto.ExpiryDate.Value);
                    stockEntry.DaysUntilExpiry = CalculateDaysUntilExpiry(updateDto.ExpiryDate.Value);
                }
                stockEntry.Price = updateDto.Price;
                stockEntry.NetPrice = updateDto.Price;
                stockEntry.MarginPercentage = updateDto.MarginPercentage;
                stockEntry.Mrp = updateDto.Mrp;
                stockEntry.UpdatedAt = DateTime.UtcNow;

                // Update the item's UpdatedAt timestamp
                item.UpdatedAt = DateTime.UtcNow;

                // 5. Update batch details in all PurchaseBillItems
                var purchaseBillItems = await _context.PurchaseBillItems
                    .Where(pbi => pbi.ItemId == itemId && pbi.BatchNumber == oldBatchNumber)
                    .ToListAsync();

                foreach (var pbi in purchaseBillItems)
                {
                    pbi.BatchNumber = updateDto.NewBatchNumber;
                    pbi.ExpiryDate = updateDto.ExpiryDate ?? pbi.ExpiryDate;
                    pbi.Price = updateDto.Price;
                    pbi.MarginPercentage = updateDto.MarginPercentage;
                    pbi.Mrp = updateDto.Mrp;
                    pbi.AltPrice = pbi.WsUnit > 0 ? updateDto.Price / pbi.WsUnit.Value : updateDto.Price;
                    pbi.UpdatedAt = DateTime.UtcNow;
                }

                _logger.LogInformation("Updated {Count} purchase bill items", purchaseBillItems.Count);

                // 6. Update batch details in SalesBillItems
                var salesBillItems = await _context.SalesBillItems
                    .Where(sbi => sbi.ItemId == itemId && sbi.BatchNumber == oldBatchNumber)
                    .ToListAsync();

                foreach (var sbi in salesBillItems)
                {
                    sbi.BatchNumber = updateDto.NewBatchNumber;
                    sbi.ExpiryDate = updateDto.ExpiryDate ?? sbi.ExpiryDate;
                    sbi.Price = updateDto.Price;
                    sbi.MarginPercentage = updateDto.MarginPercentage;
                    sbi.Mrp = updateDto.Mrp;
                    sbi.UpdatedAt = DateTime.UtcNow;
                }

                _logger.LogInformation("Updated {Count} sales bill items", salesBillItems.Count);

                // 7. Update batch details in PurchaseReturnBillItems
                var purchaseReturnItems = await _context.PurchaseReturnItems
                    .Where(pri => pri.ItemId == itemId && pri.BatchNumber == oldBatchNumber)
                    .ToListAsync();

                foreach (var pri in purchaseReturnItems)
                {
                    pri.BatchNumber = updateDto.NewBatchNumber;
                    pri.ExpiryDate = updateDto.ExpiryDate ?? pri.ExpiryDate;
                    pri.Price = updateDto.Price;
                    pri.MarginPercentage = updateDto.MarginPercentage;
                    pri.Mrp = updateDto.Mrp;
                    pri.UpdatedAt = DateTime.UtcNow;
                }

                _logger.LogInformation("Updated {Count} purchase return items", purchaseReturnItems.Count);

                // 8. Update batch details in SalesReturnBillItems
                var salesReturnItems = await _context.SalesReturnItems
                    .Where(sri => sri.ItemId == itemId && sri.BatchNumber == oldBatchNumber)
                    .ToListAsync();

                foreach (var sri in salesReturnItems)
                {
                    sri.BatchNumber = updateDto.NewBatchNumber;
                    sri.ExpiryDate = updateDto.ExpiryDate ?? sri.ExpiryDate;
                    sri.Mrp = updateDto.Mrp;
                    sri.MarginPercentage = updateDto.MarginPercentage;
                    sri.Price = updateDto.Price;
                    sri.UpdatedAt = DateTime.UtcNow;
                }

                _logger.LogInformation("Updated {Count} sales return items", salesReturnItems.Count);

                // 9. Update batch details in StockEntries (other entries with same batch number)
                var otherStockEntries = await _context.StockEntries
                    .Where(se => se.ItemId == itemId &&
                                se.BatchNumber == oldBatchNumber &&
                                se.Id != stockEntry.Id)
                    .ToListAsync();

                foreach (var se in otherStockEntries)
                {
                    se.BatchNumber = updateDto.NewBatchNumber;
                    if (updateDto.ExpiryDate.HasValue)
                    {
                        se.ExpiryDate = updateDto.ExpiryDate.Value;
                        se.ExpiryStatus = CalculateExpiryStatus(updateDto.ExpiryDate.Value);
                        se.DaysUntilExpiry = CalculateDaysUntilExpiry(updateDto.ExpiryDate.Value);
                    }
                    se.Price = updateDto.Price;
                    se.Mrp = updateDto.Mrp;
                    se.MarginPercentage = updateDto.MarginPercentage;
                    se.NetPrice = updateDto.Price;
                    se.UpdatedAt = DateTime.UtcNow;
                }

                _logger.LogInformation("Updated {Count} other stock entries", otherStockEntries.Count);


                // 11. Save all changes
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("Successfully updated batch from '{OldBatchNumber}' to '{NewBatchNumber}' for item {ItemId}",
                    oldBatchNumber, updateDto.NewBatchNumber, itemId);

                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error updating batch for item {ItemId}, old batch: {OldBatchNumber}", itemId, oldBatchNumber);
                throw;
            }
        }

        // Helper methods for expiry calculations (add these if not already present)
        private int CalculateDaysUntilExpiry(DateOnly expiryDate)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var daysUntilExpiry = (expiryDate.ToDateTime(TimeOnly.MinValue) - today.ToDateTime(TimeOnly.MinValue)).Days;
            return daysUntilExpiry;
        }

        private string CalculateExpiryStatus(DateOnly expiryDate)
        {
            var daysUntilExpiry = CalculateDaysUntilExpiry(expiryDate);

            if (daysUntilExpiry <= 0)
                return "expired";
            else if (daysUntilExpiry <= 30)
                return "danger";
            else if (daysUntilExpiry <= 90)
                return "warning";
            else
                return "safe";
        }
    }
}