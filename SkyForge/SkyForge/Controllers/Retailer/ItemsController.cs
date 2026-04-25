
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto.RetailerDto.ItemDto;
using SkyForge.Dto.RetailerDto.StockEntryDto;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.Retailer.CompositionModel;
using SkyForge.Models.Retailer.Items;
using SkyForge.Services.Retailer.ItemServices;
using System.Security.Claims;
using CompositionDTO = SkyForge.Dto.RetailerDto.ItemDto.CompositionDTO;

namespace SkyForge.Controllers.Retailer
{
    [Route("api/retailer")]
    [ApiController]
    [Authorize]
    public class ItemsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<ItemsController> _logger;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IItemService _itemService; // Inject the service

        public ItemsController(
            ApplicationDbContext context,
            ILogger<ItemsController> logger,
            IServiceScopeFactory scopeFactory,
            IItemService itemService) // Add IItemService to constructor
        {
            _context = context;
            _logger = logger;
            _scopeFactory = scopeFactory;
            _itemService = itemService; // Initialize the service
        }

        [HttpGet("items")]
        public async Task<IActionResult> GetItems()
        {
            try
            {
                _logger.LogInformation("=== GetItems Started ===");

                // 1. Extract ALL required info from JWT claims
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var userName = User.FindFirst(ClaimTypes.Name)?.Value;
                var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
                var isAdminClaim = User.FindFirst("isAdmin")?.Value;
                var roleName = User.FindFirst(ClaimTypes.Role)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var companyName = User.FindFirst("currentCompanyName")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;
                var fiscalYearId = User.FindFirst("currentFiscalYear")?.Value;

                // 2. Parse boolean claims
                bool isAdmin = bool.TryParse(isAdminClaim, out bool admin) && admin;

                // 3. Validate required claims exist
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    _logger.LogError("Invalid or missing userId claim");
                    return Unauthorized(new
                    {
                        success = false,
                        error = "Invalid user token. Please login again.",
                        redirectTo = "/login"
                    });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    _logger.LogError("No company selected in JWT token");
                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected. Please select a company first.",
                        redirectTo = "/user-dashboard"
                    });
                }

                // 4. Validate trade type is Retailer
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    _logger.LogWarning($"Access denied: TradeType is {tradeTypeClaim}, not Retailer");
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "Access denied for this trade type. This is a Retailer-only feature.",
                        redirectTo = "/user-dashboard"
                    });
                }

                // 5. Get company details
                var company = await _context.Companies
                    .Where(c => c.Id == companyIdGuid)
                    .Select(c => new
                    {
                        c.Id,
                        c.Name,
                        c.RenewalDate,
                        DateFormat = c.DateFormat,
                        VatEnabled = c.VatEnabled
                    })
                    .FirstOrDefaultAsync();

                if (company == null)
                {
                    _logger.LogError($"Company not found: {companyIdGuid}");
                    return NotFound(new
                    {
                        success = false,
                        error = "Company not found",
                        redirectTo = "/user-dashboard"
                    });
                }

                // 6. Get current fiscal year (from JWT claim or database)
                Models.FiscalYearModel.FiscalYear? currentFiscalYear = null;

                // First try from JWT claim
                if (!string.IsNullOrEmpty(fiscalYearId) && Guid.TryParse(fiscalYearId, out Guid fiscalYearIdGuid))
                {
                    currentFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.Id == fiscalYearIdGuid && f.CompanyId == companyIdGuid);
                }

                // Fallback to active fiscal year for the company
                if (currentFiscalYear == null)
                {
                    currentFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
                }

                // Fallback to any fiscal year
                if (currentFiscalYear == null)
                {
                    currentFiscalYear = await _context.FiscalYears
                        .Where(f => f.CompanyId == companyIdGuid)
                        .OrderByDescending(f => f.StartDate)
                        .FirstOrDefaultAsync();
                }

                if (currentFiscalYear == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No fiscal year found for this company",
                        redirectTo = "/fiscal-years"
                    });
                }

                // 7. Create scoped services for parallel operations to avoid DbContext concurrency issues
                async Task<List<Item>> GetItemsAsync()
                {
                    using var scope = _scopeFactory.CreateScope();
                    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

                    return await context.Items
                        .Where(i => i.CompanyId == companyIdGuid && i.FiscalYearId == currentFiscalYear.Id)
                        .Include(i => i.Category)
                        .Include(i => i.ItemCompany)
                        .Include(i => i.Unit)
                        .Include(i => i.MainUnit)
                        .Include(i => i.StockEntries)
                        .Include(i => i.InitialOpeningStock)
                            .ThenInclude(ios => ios!.InitialFiscalYear)
                        .Include(i => i.ClosingStocksByFiscalYear)
                            .ThenInclude(cs => cs.FiscalYear)
                        .Include(i => i.OpeningStocksByFiscalYear)
                            .ThenInclude(os => os.FiscalYear)
                        .Include(i => i.ItemCompositions)
                            .ThenInclude(ic => ic.Composition)
                        .AsSplitQuery()
                        .ToListAsync();
                }

                async Task<List<object>> GetCategoriesAsync()
                {
                    using var scope = _scopeFactory.CreateScope();
                    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

                    return await context.Categories
                        .Where(c => c.CompanyId == companyIdGuid)
                        .Select(c => new { c.Id, c.Name })
                        .ToListAsync<object>();
                }

                async Task<List<object>> GetItemsCompaniesAsync()
                {
                    using var scope = _scopeFactory.CreateScope();
                    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

                    return await context.ItemCompanies
                        .Where(ic => ic.CompanyId == companyIdGuid)
                        .Select(ic => new { ic.Id, ic.Name })
                        .ToListAsync<object>();
                }

                async Task<List<object>> GetUnitsAsync()
                {
                    using var scope = _scopeFactory.CreateScope();
                    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

                    return await context.Units
                        .Where(u => u.CompanyId == companyIdGuid)
                        .Select(u => new { u.Id, u.Name })
                        .ToListAsync<object>();
                }

                async Task<List<object>> GetMainUnitsAsync()
                {
                    using var scope = _scopeFactory.CreateScope();
                    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

                    return await context.MainUnits
                        .Where(u => u.CompanyId == companyIdGuid)
                        .Select(u => new { u.Id, u.Name })
                        .ToListAsync<object>();
                }

                async Task<List<object>> GetCompositionsAsync()
                {
                    using var scope = _scopeFactory.CreateScope();
                    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

                    return await context.Compositions
                        .Where(c => c.CompanyId == companyIdGuid)
                        .Select(c => new { c.Id, c.Name, c.UniqueNumber })
                        .ToListAsync<object>();
                }

                // Updated: Get item IDs that have transactions via TransactionItems
                async Task<HashSet<Guid>> GetTransactionItemIdsAsync(List<Guid> itemIds)
                {
                    using var scope = _scopeFactory.CreateScope();
                    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

                    var transactionItemIds = await context.TransactionItems
                        .Where(ti => ti.ItemId.HasValue &&
                                    itemIds.Contains(ti.ItemId.Value) &&
                                    ti.Transaction != null &&
                                    ti.Transaction.CompanyId == companyIdGuid)
                        .Select(ti => ti.ItemId!.Value)
                        .Distinct()
                        .ToListAsync();

                    return new HashSet<Guid>(transactionItemIds);
                }

                // 8. Execute main query first to get items and their IDs
                var items = await GetItemsAsync();
                var itemIds = items.Select(i => i.Id).ToList();

                // 9. Execute parallel queries for related data
                var categoriesTask = GetCategoriesAsync();
                var itemsCompaniesTask = GetItemsCompaniesAsync();
                var unitsTask = GetUnitsAsync();
                var mainUnitsTask = GetMainUnitsAsync();
                var compositionsTask = GetCompositionsAsync();
                var transactionItemIdsTask = GetTransactionItemIdsAsync(itemIds);

                // Wait for all parallel tasks
                await Task.WhenAll(categoriesTask, itemsCompaniesTask, unitsTask, mainUnitsTask, compositionsTask, transactionItemIdsTask);

                var categories = await categoriesTask;
                var itemsCompanies = await itemsCompaniesTask;
                var units = await unitsTask;
                var mainUnits = await mainUnitsTask;
                var compositions = await compositionsTask;
                var transactionItemIds = await transactionItemIdsTask;

                // 10. Prepare items with flags and calculate current stock
                var itemsWithFlags = items.Select(item =>
                {
                    // Calculate current stock from stock entries
                    decimal currentStock = 0;

                    if (item.StockEntries != null && item.StockEntries.Any())
                    {
                        currentStock = item.StockEntries.Sum(entry => entry.Quantity);
                    }
                    else
                    {
                        currentStock = item.OpeningStock;
                    }

                    // Map to DTO
                    var itemDto = new ItemResponseDTO
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
                        MinStock = item.MinStock,
                        MaxStock = item.MaxStock,
                        ReorderLevel = item.ReorderLevel,
                        UniqueNumber = item.UniqueNumber,
                        BarcodeNumber = item.BarcodeNumber,
                        CompanyId = item.CompanyId,
                        CompanyName = item.Company?.Name,
                        FiscalYearId = item.FiscalYearId,
                        FiscalYearName = item.FiscalYear?.Name,
                        OriginalFiscalYearId = item.OriginalFiscalYearId,
                        OriginalFiscalYearName = item.OriginalFiscalYear?.Name,
                        Status = item.Status,
                        CreatedAt = item.CreatedAt,
                        Date = item.Date,
                        UpdatedAt = item.UpdatedAt,
                        TotalStock = currentStock,
                        StockValue = currentStock * (item.Price ?? 0),
                        ClosingStocksByFiscalYear = item.ClosingStocksByFiscalYear?.Select(cs => new ItemClosingStockByFiscalYearResponseDTO
                        {
                            Id = cs.Id,
                            FiscalYearId = cs.FiscalYearId,
                            FiscalYearName = cs.FiscalYear?.Name,
                            ClosingStock = cs.ClosingStock,
                            ClosingStockValue = cs.ClosingStockValue,
                            PurchasePrice = cs.PurchasePrice,
                            SalesPrice = cs.SalesPrice,
                            CreatedAt = cs.CreatedAt,
                            UpdatedAt = cs.UpdatedAt
                        }).ToList() ?? new List<ItemClosingStockByFiscalYearResponseDTO>(),
                        OpeningStocksByFiscalYear = item.OpeningStocksByFiscalYear?.Select(os => new ItemOpeningStockByFiscalYearResponseDTO
                        {
                            Id = os.Id,
                            FiscalYearId = os.FiscalYearId,
                            FiscalYearName = os.FiscalYear?.Name,
                            OpeningStock = os.OpeningStock,
                            OpeningStockValue = os.OpeningStockValue,
                            PurchasePrice = os.PurchasePrice,
                            SalesPrice = os.SalesPrice,
                            CreatedAt = os.CreatedAt,
                            UpdatedAt = os.UpdatedAt
                        }).ToList() ?? new List<ItemOpeningStockByFiscalYearResponseDTO>()
                    };

                    // Add compositions from ItemCompositions
                    if (item.ItemCompositions != null && item.ItemCompositions.Any())
                    {
                        itemDto.Compositions = item.ItemCompositions
                            .Select(ic => ic.Composition)
                            .Where(c => c != null)
                            .Select(c => new CompositionDTO
                            {
                                Id = c!.Id,
                                Name = c.Name
                            }).ToList();
                    }

                    // Add initial opening stock if exists
                    if (item.InitialOpeningStock != null)
                    {
                        itemDto.InitialOpeningStock = new InitialOpeningStockResponseDTO
                        {
                            InitialFiscalYearId = item.InitialOpeningStock.InitialFiscalYearId,
                            InitialFiscalYearName = item.InitialOpeningStock.InitialFiscalYear?.Name,
                            OpeningStock = item.InitialOpeningStock.OpeningStock,
                            OpeningStockValue = item.InitialOpeningStock.OpeningStockValue,
                            PurchasePrice = item.InitialOpeningStock.PurchasePrice,
                            SalesPrice = item.InitialOpeningStock.SalesPrice,
                            Date = item.InitialOpeningStock.Date,
                            CreatedAt = item.InitialOpeningStock.CreatedAt,
                            UpdatedAt = item.InitialOpeningStock.UpdatedAt
                        };
                    }

                    // Add stock entries
                    if (item.StockEntries != null && item.StockEntries.Any())
                    {
                        itemDto.StockEntries = item.StockEntries.Select(se => new StockEntryResponseDTO
                        {
                            Id = se.Id,
                            ItemId = se.ItemId,
                            ItemName = item.Name,
                            Quantity = se.Quantity,
                            Price = se.Price,
                            NetPrice = se.NetPrice,
                            PuPrice = se.PuPrice,
                            NetPuPrice = se.NetPuPrice,
                            CcPercentage = se.CcPercentage,
                            ItemCcAmount = se.ItemCcAmount,
                            MainUnitPuPrice = se.MainUnitPuPrice,
                            Mrp = se.Mrp,
                            BatchNumber = se.BatchNumber,
                            ExpiryDate = se.ExpiryDate,
                            ExpiryStatus = se.ExpiryStatus,
                            DaysUntilExpiry = se.DaysUntilExpiry,
                            Date = se.Date,
                            CreatedAt = se.CreatedAt,
                            UpdatedAt = se.UpdatedAt
                        }).ToList();
                    }

                    return new
                    {
                        Item = itemDto,
                        HasTransactions = transactionItemIds.Contains(item.Id) ? "true" : "false",
                        CurrentStock = currentStock,
                        StockEntriesCount = item.StockEntries?.Count ?? 0
                    };
                }).ToList();

                // 11. Prepare user info
                var userInfo = new
                {
                    _id = userId,
                    name = userName ?? "User",
                    email = userEmail ?? "",
                    isAdmin = isAdmin,
                    role = roleName ?? "User",
                    preferences = new { theme = "light" }
                };

                // 12. Determine if user is admin or supervisor
                bool isAdminOrSupervisor = isAdmin || (roleName == "Supervisor" || roleName == "Admin");

                // 13. Prepare response
                var responseData = new
                {
                    success = true,
                    items = itemsWithFlags.Select(i => new
                    {
                        _id = i.Item.Id,
                        id = i.Item.Id,
                        i.Item.Name,
                        i.Item.Hscode,
                        categoryId = i.Item.CategoryId,
                        categoryName = i.Item.CategoryName,
                        itemsCompanyId = i.Item.ItemsCompanyId,
                        itemsCompanyName = i.Item.ItemsCompanyName,
                        i.Item.Price,
                        i.Item.PuPrice,
                        i.Item.MainUnitPuPrice,
                        mainUnitId = i.Item.MainUnitId,
                        mainUnitName = i.Item.MainUnitName,
                        compositions = i.Item.Compositions,
                        wsUnit = i.Item.WsUnit,
                        unitId = i.Item.UnitId,
                        unitName = i.Item.UnitName,
                        vatStatus = i.Item.VatStatus,
                        openingStock = i.Item.OpeningStock,
                        minStock = i.Item.MinStock,
                        maxStock = i.Item.MaxStock,
                        reorderLevel = i.Item.ReorderLevel,
                        uniqueNumber = i.Item.UniqueNumber,
                        barcodeNumber = i.Item.BarcodeNumber,
                        companyId = i.Item.CompanyId,
                        fiscalYearId = i.Item.FiscalYearId,
                        i.Item.Status,
                        createdAt = i.Item.CreatedAt,
                        date = i.Item.Date,
                        updatedAt = i.Item.UpdatedAt,
                        totalStock = i.Item.TotalStock,
                        stockValue = i.Item.StockValue,
                        stockEntries = i.Item.StockEntries,
                        closingStocksByFiscalYear = i.Item.ClosingStocksByFiscalYear,
                        openingStocksByFiscalYear = i.Item.OpeningStocksByFiscalYear,
                        initialOpeningStock = i.Item.InitialOpeningStock,
                        hasTransactions = i.HasTransactions,
                        currentStock = i.CurrentStock,
                        stockEntriesCount = i.StockEntriesCount
                    }),
                    company = new
                    {
                        renewalDate = company.RenewalDate,
                        fiscalYear = currentFiscalYear.Id,
                        dateFormat = company.DateFormat?.ToString()?.ToLower() ?? "english",
                        vatEnabled = company.VatEnabled
                    },
                    currentFiscalYear = new
                    {
                        _id = currentFiscalYear.Id,
                        id = currentFiscalYear.Id,
                        name = currentFiscalYear.Name,
                        startDate = currentFiscalYear.StartDate,
                        endDate = currentFiscalYear.EndDate,
                        startDateNepali = currentFiscalYear.StartDateNepali,
                        endDateNepali = currentFiscalYear.EndDateNepali,
                        dateFormat = currentFiscalYear.DateFormat?.ToString()?.ToLower() ?? "english",
                        isActive = currentFiscalYear.IsActive
                    },
                    currentCompany = new
                    {
                        _id = company.Id,
                        name = company.Name,
                        dateFormat = company.DateFormat?.ToString()?.ToLower() ?? "english"
                    },
                    currentCompanyName = companyName ?? company.Name,
                    companyDateFormat = company.DateFormat?.ToString()?.ToLower() ?? "english",
                    vatEnabled = company.VatEnabled,
                    categories = categories,
                    itemsCompanies = itemsCompanies,
                    units = units,
                    mainUnits = mainUnits,
                    composition = compositions,
                    companyId = companyIdGuid.ToString(),
                    nepaliDate = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                    fiscalYear = currentFiscalYear.Id,
                    user = userInfo,
                    theme = "light",
                    isAdminOrSupervisor = isAdminOrSupervisor
                };

                // 14. Log debug info (optional)
                if (itemsWithFlags.Count > 0)
                {
                    _logger.LogInformation("Stock calculation debug - First 3 items:");
                    foreach (var item in itemsWithFlags.Take(3))
                    {
                        _logger.LogInformation($"Item: {item.Item.Name}, CurrentStock: {item.CurrentStock}, " +
                                              $"OpeningStock: {item.Item.OpeningStock}");
                    }
                }

                _logger.LogInformation($"Successfully fetched {itemsWithFlags.Count} items for company {company.Name}");

                return Ok(responseData);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching items");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Failed to fetch items",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        [HttpPost("items/create")]
        public async Task<IActionResult> CreateItem([FromBody] CreateItemDTO createItemDto)
        {
            try
            {
                _logger.LogInformation("=== CreateItem Started ===");

                // Extract required info from JWT claims
                var companyId = User.FindFirst("currentCompany")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;
                var fiscalYearId = User.FindFirst("currentFiscalYear")?.Value;

                // Validate required claims exist
                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    _logger.LogError("No company selected in JWT token");
                    return BadRequest(new
                    {
                        success = false,
                        error = "Company ID is required. Please select a company first.",
                        redirectTo = "/user-dashboard"
                    });
                }

                // Validate trade type is Retailer
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    _logger.LogWarning($"Access denied: TradeType is {tradeTypeClaim}, not Retailer");
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "This operation is only available for retailers",
                        redirectTo = "/user-dashboard"
                    });
                }

                // Get current fiscal year
                Models.FiscalYearModel.FiscalYear? currentFiscalYear = null;

                if (!string.IsNullOrEmpty(fiscalYearId) && Guid.TryParse(fiscalYearId, out Guid fiscalYearIdGuid))
                {
                    currentFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.Id == fiscalYearIdGuid && f.CompanyId == companyIdGuid);
                }

                // Fallback to active fiscal year
                if (currentFiscalYear == null)
                {
                    currentFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
                }

                // Fallback to any fiscal year
                if (currentFiscalYear == null)
                {
                    currentFiscalYear = await _context.FiscalYears
                        .Where(f => f.CompanyId == companyIdGuid)
                        .OrderByDescending(f => f.StartDate)
                        .FirstOrDefaultAsync();
                }

                if (currentFiscalYear == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No fiscal year found"
                    });
                }

                // Create item using injected service
                var newItem = await _itemService.CreateItemAsync(createItemDto, companyIdGuid, currentFiscalYear.Id);

                var allItems = await _context.Items
            .Where(i => i.CompanyId == companyIdGuid && i.FiscalYearId == currentFiscalYear.Id)
            .Include(i => i.Category)
            .Include(i => i.ItemCompany)
            .Include(i => i.Unit)
            .Include(i => i.MainUnit)
            .Include(i => i.StockEntries)
            .Include(i => i.ItemCompositions)
                .ThenInclude(ic => ic.Composition)
            .OrderBy(i => i.Name) // Sort by name
            .ToListAsync();
                // Prepare response items
                var responseItems = allItems.Select(item =>
                {
                    // Calculate current stock
                    decimal currentStock = item.StockEntries?.Sum(se => se.Quantity) ?? item.OpeningStock;

                    return new
                    {
                        _id = item.Id,
                        id = item.Id,
                        Name = item.Name,
                        Hscode = item.Hscode,
                        categoryId = item.CategoryId,
                        categoryName = item.Category?.Name,
                        itemsCompanyId = item.ItemsCompanyId,
                        itemsCompanyName = item.ItemCompany?.Name,
                        Price = item.Price,
                        PuPrice = item.PuPrice,
                        MainUnitPuPrice = item.MainUnitPuPrice,
                        mainUnitId = item.MainUnitId,
                        mainUnitName = item.MainUnit?.Name,
                        compositions = item.ItemCompositions?.Select(ic => new CompositionDTO
                        {
                            Id = ic.Composition?.Id ?? Guid.Empty,
                            Name = ic.Composition?.Name ?? string.Empty
                        }).ToList() ?? new List<CompositionDTO>(),
                        wsUnit = item.WsUnit,
                        unitId = item.UnitId,
                        unitName = item.Unit?.Name,
                        vatStatus = item.VatStatus,
                        openingStock = item.OpeningStock,
                        minStock = item.MinStock,
                        maxStock = item.MaxStock,
                        reorderLevel = item.ReorderLevel,
                        uniqueNumber = item.UniqueNumber,
                        barcodeNumber = item.BarcodeNumber,
                        companyId = item.CompanyId,
                        fiscalYearId = item.FiscalYearId,
                        Status = item.Status,
                        createdAt = item.CreatedAt,
                        date = item.Date,
                        updatedAt = item.UpdatedAt,
                        totalStock = currentStock,
                        stockValue = currentStock * (item.Price ?? 0),
                        // Additional properties for frontend
                        hasTransactions = "false", // Default for new items
                        currentStock = currentStock,
                        stockEntriesCount = item.StockEntries?.Count ?? 0
                    };
                }).ToList();

                // Return success response with ALL items
                var response = new
                {
                    success = true,
                    message = "Item created successfully",
                    items = responseItems, // Return all items, not just the new one
                    newItemId = newItem.Id // Optional: include the new item ID
                };

                _logger.LogInformation($"Item created successfully: {newItem.Name} (ID: {newItem.Id}, Unique: {newItem.UniqueNumber})");
                return StatusCode(201, response);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Validation error creating item");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (DbUpdateException dbEx)
            {
                _logger.LogError(dbEx, "Database error while creating item");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Database error",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? dbEx.InnerException?.Message : null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating item");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Server error",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // [HttpPut("items/{id}")]
        // public async Task<IActionResult> UpdateItem(Guid id, [FromBody] UpdateItemDTO updateItemDto)
        // {
        //     try
        //     {
        //         _logger.LogInformation($"=== UpdateItem Started for ID: {id} ===");

        //         // Extract company ID from JWT claims
        //         var companyId = User.FindFirst("currentCompany")?.Value;
        //         var tradeTypeClaim = User.FindFirst("tradeType")?.Value;
        //         var fiscalYearId = User.FindFirst("currentFiscalYear")?.Value;

        //         if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
        //         {
        //             return BadRequest(new
        //             {
        //                 success = false,
        //                 error = "Company ID is required"
        //             });
        //         }

        //         // Validate trade type is Retailer
        //         if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
        //         {
        //             return StatusCode(403, new
        //             {
        //                 success = false,
        //                 error = "This operation is only available for retailers"
        //             });
        //         }

        //         // Get current fiscal year
        //         Guid currentFiscalYearIdGuid;
        //         if (!string.IsNullOrEmpty(fiscalYearId) && Guid.TryParse(fiscalYearId, out Guid parsedFiscalYearId))
        //         {
        //             currentFiscalYearIdGuid = parsedFiscalYearId;
        //         }
        //         else
        //         {
        //             // Fallback to active fiscal year
        //             var fiscalYear = await _context.FiscalYears
        //                 .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

        //             if (fiscalYear == null)
        //             {
        //                 return BadRequest(new
        //                 {
        //                     success = false,
        //                     error = "No fiscal year found"
        //                 });
        //             }
        //             currentFiscalYearIdGuid = fiscalYear.Id;
        //         }

        //         // Use the service to update the item
        //         var updatedItem = await _itemService.UpdateItemAsync(id, updateItemDto, currentFiscalYearIdGuid);

        //         // Check if item has transactions
        //         bool hasTransactions = await _context.Transactions.AnyAsync(t => t.ItemId == id);

        //         // Return the updated item
        //         return Ok(new
        //         {
        //             success = true,
        //             message = "Item updated successfully",
        //             item = updatedItem,
        //             hasTransactions = hasTransactions
        //         });
        //     }
        //     catch (KeyNotFoundException ex)
        //     {
        //         return NotFound(new
        //         {
        //             success = false,
        //             error = ex.Message
        //         });
        //     }
        //     catch (InvalidOperationException ex)
        //     {
        //         return BadRequest(new
        //         {
        //             success = false,
        //             error = ex.Message
        //         });
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, $"Error updating item {id}");
        //         return StatusCode(500, new
        //         {
        //             success = false,
        //             error = "Server error",
        //             details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
        //         });
        //     }
        // }

        [HttpPut("items/{id}")]
        public async Task<IActionResult> UpdateItem(Guid id, [FromBody] UpdateItemDTO updateItemDto)
        {
            try
            {
                _logger.LogInformation($"=== UpdateItem Started for ID: {id} ===");

                // Extract company ID from JWT claims
                var companyId = User.FindFirst("currentCompany")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;
                var fiscalYearId = User.FindFirst("currentFiscalYear")?.Value;

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Company ID is required"
                    });
                }

                // Validate trade type is Retailer
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "This operation is only available for retailers"
                    });
                }

                // Get current fiscal year
                Guid currentFiscalYearIdGuid;
                if (!string.IsNullOrEmpty(fiscalYearId) && Guid.TryParse(fiscalYearId, out Guid parsedFiscalYearId))
                {
                    currentFiscalYearIdGuid = parsedFiscalYearId;
                }
                else
                {
                    // Fallback to active fiscal year
                    var fiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                    if (fiscalYear == null)
                    {
                        return BadRequest(new
                        {
                            success = false,
                            error = "No fiscal year found"
                        });
                    }
                    currentFiscalYearIdGuid = fiscalYear.Id;
                }

                // Use the service to update the item
                var updatedItem = await _itemService.UpdateItemAsync(id, updateItemDto, currentFiscalYearIdGuid);

                // Check if item has transactions using TransactionItems (new structure)
                bool hasTransactions = await _context.TransactionItems
                    .AnyAsync(ti => ti.ItemId == id);

                // Return the updated item
                return Ok(new
                {
                    success = true,
                    message = "Item updated successfully",
                    item = updatedItem,
                    hasTransactions = hasTransactions
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating item {id}");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Server error",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }
        [HttpDelete("items/{id}")]
        public async Task<IActionResult> DeleteItem(Guid id)
        {
            try
            {
                _logger.LogInformation($"=== DeleteItem Started for ID: {id} ===");

                // Extract company ID from JWT claims
                var companyId = User.FindFirst("currentCompany")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Company ID is required"
                    });
                }

                // Validate trade type is Retailer
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "This operation is only available for retailers"
                    });
                }

                // Use the service to delete the item
                var result = await _itemService.DeleteItemAsync(id, companyIdGuid);

                if (result)
                {
                    return Ok(new
                    {
                        success = true,
                        message = "Item deleted successfully"
                    });
                }
                else
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Item cannot be deleted as it has related transactions or entries."
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error deleting item {id}");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error"
                });
            }
        }

        // [HttpGet("items/{id}")]
        // public async Task<IActionResult> GetItemById(Guid id)
        // {
        //     try
        //     {
        //         _logger.LogInformation($"=== GetItemById Started for ID: {id} ===");

        //         // 1. Extract ALL required info from JWT claims
        //         var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        //         var userName = User.FindFirst(ClaimTypes.Name)?.Value;
        //         var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
        //         var isAdminClaim = User.FindFirst("isAdmin")?.Value;
        //         var roleName = User.FindFirst(ClaimTypes.Role)?.Value;
        //         var companyId = User.FindFirst("currentCompany")?.Value;
        //         var companyName = User.FindFirst("currentCompanyName")?.Value;
        //         var tradeTypeClaim = User.FindFirst("tradeType")?.Value;
        //         var fiscalYearId = User.FindFirst("currentFiscalYear")?.Value;

        //         // 2. Validate ID format
        //         if (id == Guid.Empty)
        //         {
        //             return BadRequest(new
        //             {
        //                 success = false,
        //                 error = "Invalid item ID format"
        //             });
        //         }

        //         // 3. Parse boolean claims
        //         bool isAdmin = bool.TryParse(isAdminClaim, out bool admin) && admin;

        //         // 4. Validate required claims exist
        //         if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
        //         {
        //             _logger.LogError("Invalid or missing userId claim");
        //             return Unauthorized(new
        //             {
        //                 success = false,
        //                 error = "Invalid user token. Please login again.",
        //                 redirectTo = "/login"
        //             });
        //         }

        //         if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
        //         {
        //             _logger.LogError("No company selected in JWT token");
        //             return BadRequest(new
        //             {
        //                 success = false,
        //                 error = "Company ID is required"
        //             });
        //         }

        //         // 5. Validate trade type is Retailer
        //         if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
        //         {
        //             _logger.LogWarning($"Access denied: TradeType is {tradeTypeClaim}, not Retailer");
        //             return StatusCode(403, new
        //             {
        //                 success = false,
        //                 error = "Access denied for this trade type. This is a Retailer-only feature."
        //             });
        //         }

        //         // 6. Get company details
        //         var company = await _context.Companies
        //             .Where(c => c.Id == companyIdGuid)
        //             .Select(c => new
        //             {
        //                 c.Id,
        //                 c.Name,
        //                 c.RenewalDate,
        //                 DateFormat = c.DateFormat,
        //                 VatEnabled = c.VatEnabled
        //             })
        //             .FirstOrDefaultAsync();

        //         if (company == null)
        //         {
        //             _logger.LogError($"Company not found: {companyIdGuid}");
        //             return NotFound(new
        //             {
        //                 success = false,
        //                 error = "Company not found"
        //             });
        //         }

        //         // 7. Get current fiscal year (from JWT claim or database)
        //         Models.FiscalYearModel.FiscalYear? currentFiscalYear = null;

        //         // First try from JWT claim
        //         if (!string.IsNullOrEmpty(fiscalYearId) && Guid.TryParse(fiscalYearId, out Guid fiscalYearIdGuid))
        //         {
        //             currentFiscalYear = await _context.FiscalYears
        //                 .FirstOrDefaultAsync(f => f.Id == fiscalYearIdGuid && f.CompanyId == companyIdGuid);
        //         }

        //         // Fallback to active fiscal year for the company
        //         if (currentFiscalYear == null)
        //         {
        //             currentFiscalYear = await _context.FiscalYears
        //                 .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
        //         }

        //         // Fallback to any fiscal year
        //         if (currentFiscalYear == null)
        //         {
        //             currentFiscalYear = await _context.FiscalYears
        //                 .Where(f => f.CompanyId == companyIdGuid)
        //                 .OrderByDescending(f => f.StartDate)
        //                 .FirstOrDefaultAsync();
        //         }

        //         if (currentFiscalYear == null)
        //         {
        //             return BadRequest(new
        //             {
        //                 success = false,
        //                 error = "No fiscal year found for this company"
        //             });
        //         }

        //         // 8. Fetch the item details with all related data
        //         var item = await _context.Items
        //             .Where(i => i.Id == id && i.CompanyId == companyIdGuid)
        //             .Include(i => i.Category)
        //             .Include(i => i.ItemCompany)
        //             .Include(i => i.Unit)
        //             .Include(i => i.MainUnit)
        //             .Include(i => i.ItemCompositions)  // Make sure this matches the property name in Item model
        //                 .ThenInclude(ic => ic.Composition)
        //             .Include(i => i.StockEntries)
        //             .Include(i => i.InitialOpeningStock)
        //                 .ThenInclude(ios => ios!.InitialFiscalYear)
        //             .Include(i => i.OpeningStocksByFiscalYear)  // Make sure this matches the property name in Item model
        //                 .ThenInclude(os => os.FiscalYear)
        //             .AsSplitQuery()
        //             .FirstOrDefaultAsync();

        //         if (item == null)
        //         {
        //             return NotFound(new
        //             {
        //                 success = false,
        //                 error = "Item not found"
        //             });
        //         }

        //         // 9. Initialize opening stock values with defaults
        //         decimal openingStock = 0;
        //         decimal openingStockValue = 0;
        //         decimal salesPrice = 0;
        //         decimal purchasePrice = 0;

        //         // Check if item has openingStocksByFiscalYear array
        //         if (item.OpeningStocksByFiscalYear != null && item.OpeningStocksByFiscalYear.Any())
        //         {
        //             var openingStockForFiscalYear = item.OpeningStocksByFiscalYear
        //                 .FirstOrDefault(stockEntry => stockEntry.FiscalYearId == currentFiscalYear.Id);

        //             if (openingStockForFiscalYear != null)
        //             {
        //                 openingStock = openingStockForFiscalYear.OpeningStock;
        //                 openingStockValue = openingStockForFiscalYear.OpeningStockValue;
        //                 salesPrice = openingStockForFiscalYear.SalesPrice;
        //                 purchasePrice = openingStockForFiscalYear.PurchasePrice;
        //             }
        //         }

        //         // 10. Process stock entries with null checks
        //         var stockEntries = (item.StockEntries ?? new List<StockEntry>())
        //             .Select(entry => new
        //             {
        //                 entry.Id,
        //                 entry.ItemId,
        //                 entry.Quantity,
        //                 entry.Price,
        //                 entry.NetPrice,
        //                 entry.PuPrice,
        //                 entry.NetPuPrice,
        //                 entry.MainUnitPuPrice,
        //                 entry.Mrp,
        //                 entry.BatchNumber,
        //                 entry.UniqueUuid,
        //                 ExpiryDate = entry.ExpiryDate.ToString("yyyy-MM-dd"),
        //                 entry.ExpiryStatus,
        //                 entry.DaysUntilExpiry,
        //                 entry.Date,
        //                 entry.CreatedAt,
        //                 entry.UpdatedAt,
        //                 BarcodeData = $"{companyName}|{item.UniqueNumber}|{entry.Mrp}|{entry.BatchNumber ?? "N/A"}|{entry.ExpiryDate.ToString("yyyy-MM-dd") ?? "N/A"}"
        //             })
        //             .ToList();

        //         // 11. Get barcode preferences
        //         var barcodePrefs = await _context.BarcodePreferences
        //             .Where(bp => bp.UserId == userIdGuid)
        //             .Select(bp => new
        //             {
        //                 bp.LabelWidth,
        //                 bp.LabelHeight,
        //                 bp.LabelsPerRow,
        //                 bp.BarcodeType,
        //                 bp.DefaultQuantity,
        //                 bp.IncludeItemName,
        //                 bp.IncludePrice,
        //                 bp.IncludeBatch,
        //                 bp.IncludeExpiry,
        //                 bp.FontSize,
        //                 bp.Border,
        //                 bp.PaperSize,
        //                 bp.Orientation,
        //                 bp.Margin
        //             })
        //             .FirstOrDefaultAsync();

        //         var printPreferences = barcodePrefs ?? new
        //         {
        //             LabelWidth = 70,
        //             LabelHeight = 40,
        //             LabelsPerRow = 3,
        //             BarcodeType = "code128",
        //             DefaultQuantity = 1,
        //             IncludeItemName = true,
        //             IncludePrice = true,
        //             IncludeBatch = true,
        //             IncludeExpiry = true,
        //             FontSize = 12,
        //             Border = true,
        //             PaperSize = "A4",
        //             Orientation = "portrait",
        //             Margin = 10
        //         };

        //         // 12. Check if item has transactions
        //         var hasTransactions = await _context.Transactions
        //             .AnyAsync(t => t.ItemId == id && t.CompanyId == companyIdGuid);

        //         // 13. Prepare user info
        //         var userInfo = new
        //         {
        //             _id = userId,
        //             id = userId,
        //             name = userName ?? "User",
        //             email = userEmail ?? "",
        //             isAdmin = isAdmin,
        //             role = roleName ?? "User",
        //             preferences = new { theme = "light" }
        //         };

        //         // 14. Determine if user is admin or supervisor
        //         bool isAdminOrSupervisor = isAdmin || (roleName == "Supervisor" || roleName == "Admin");

        //         // 15. Calculate current stock
        //         decimal currentStock = item.OpeningStock;
        //         if (item.StockEntries != null && item.StockEntries.Any())
        //         {
        //             currentStock = item.StockEntries.Sum(se => se.Quantity);
        //         }

        //         // 16. Prepare compositions - Check for null
        //         List<object> compositions;
        //         if (item.ItemCompositions != null && item.ItemCompositions.Any())
        //         {
        //             compositions = item.ItemCompositions.Select(ic => new
        //             {
        //                 _id = ic.Composition?.Id ?? Guid.Empty,
        //                 id = ic.Composition?.Id ?? Guid.Empty,
        //                 name = ic.Composition?.Name ?? string.Empty,
        //                 uniqueNumber = ic.Composition?.UniqueNumber ?? 0
        //             }).ToList<object>();
        //         }
        //         else
        //         {
        //             compositions = new List<object>();
        //             _logger.LogWarning("No ItemCompositions found for item {ItemId}", item.Id);
        //         }

        //         // 17. Prepare opening stocks by fiscal year - Check for null
        //         List<object> openingStockByFiscalYear;
        //         if (item.OpeningStocksByFiscalYear != null && item.OpeningStocksByFiscalYear.Any())
        //         {
        //             openingStockByFiscalYear = item.OpeningStocksByFiscalYear.Select(os => new
        //             {
        //                 fiscalYearId = os.FiscalYearId,
        //                 fiscalYearName = os.FiscalYear?.Name,
        //                 openingStock = os.OpeningStock,
        //                 openingStockValue = os.OpeningStockValue,
        //                 purchasePrice = os.PurchasePrice,
        //                 salesPrice = os.SalesPrice
        //             }).ToList<object>();
        //         }
        //         else
        //         {
        //             openingStockByFiscalYear = new List<object>();
        //             _logger.LogWarning("No OpeningStocksByFiscalYear found for item {ItemId}", item.Id);
        //         }

        //         // 18. Prepare the response
        //         var responseData = new
        //         {
        //             success = true,
        //             data = new
        //             {
        //                 company = new
        //                 {
        //                     company.Id,
        //                     company.Name,
        //                     company.RenewalDate,
        //                     DateFormat = company.DateFormat?.ToString()?.ToLower() ?? "english",
        //                     VatEnabled = company.VatEnabled
        //                 },
        //                 currentFiscalYear = new
        //                 {
        //                     _id = currentFiscalYear.Id,
        //                     id = currentFiscalYear.Id,
        //                     name = currentFiscalYear.Name,
        //                     startDate = currentFiscalYear.StartDate,
        //                     endDate = currentFiscalYear.EndDate,
        //                     startDateNepali = currentFiscalYear.StartDateNepali,
        //                     endDateNepali = currentFiscalYear.EndDateNepali,
        //                     dateFormat = currentFiscalYear.DateFormat?.ToString()?.ToLower() ?? "english",
        //                     isActive = currentFiscalYear.IsActive
        //                 },
        //                 item = new
        //                 {
        //                     _id = item.Id,
        //                     id = item.Id,
        //                     item.Name,
        //                     item.Hscode,
        //                     categoryId = item.CategoryId,
        //                     categoryName = item.Category?.Name,
        //                     itemsCompanyId = item.ItemsCompanyId,
        //                     itemsCompanyName = item.ItemCompany?.Name,
        //                     item.Price,
        //                     item.PuPrice,
        //                     item.MainUnitPuPrice,
        //                     mainUnitId = item.MainUnitId,
        //                     mainUnitName = item.MainUnit?.Name,
        //                     wsUnit = item.WsUnit,
        //                     unitId = item.UnitId,
        //                     unitName = item.Unit?.Name,
        //                     vatStatus = item.VatStatus,
        //                     status = item.Status,
        //                     barcodeNumber = item.BarcodeNumber,
        //                     uniqueNumber = item.UniqueNumber,
        //                     reorderLevel = item.ReorderLevel,
        //                     createdAt = item.CreatedAt,
        //                     stockEntries = item.StockEntries,
        //                     compositions = compositions,  // Use the fixed variable
        //                     openingStockByFiscalYear = openingStockByFiscalYear  // Use the fixed variable
        //                 },
        //                 hasTransactions = hasTransactions,
        //                 stockInfo = new
        //                 {
        //                     openingStock,
        //                     openingStockValue,
        //                     salesPrice,
        //                     purchasePrice
        //                 },
        //                 stockEntries,
        //                 printPreferences,
        //                 barcodeBaseUrl = $"/item/{item.Id}/barcode",
        //                 fiscalYear = currentFiscalYear.Id,
        //                 currentCompanyName = companyName ?? company.Name,
        //                 user = userInfo,
        //                 theme = "light",
        //                 isAdminOrSupervisor = isAdminOrSupervisor
        //             }
        //         };

        //         _logger.LogInformation($"Successfully fetched item details: {item.Name} (ID: {item.Id})");

        //         return Ok(responseData);
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, $"Error fetching item {id}");
        //         return StatusCode(500, new
        //         {
        //             success = false,
        //             error = "Server error",
        //             message = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
        //         });
        //     }
        // }

        [HttpGet("items/{id}")]
        public async Task<IActionResult> GetItemById(Guid id)
        {
            try
            {
                _logger.LogInformation($"=== GetItemById Started for ID: {id} ===");

                // 1. Extract ALL required info from JWT claims
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var userName = User.FindFirst(ClaimTypes.Name)?.Value;
                var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
                var isAdminClaim = User.FindFirst("isAdmin")?.Value;
                var roleName = User.FindFirst(ClaimTypes.Role)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var companyName = User.FindFirst("currentCompanyName")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;
                var fiscalYearId = User.FindFirst("currentFiscalYear")?.Value;

                // 2. Validate ID format
                if (id == Guid.Empty)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Invalid item ID format"
                    });
                }

                // 3. Parse boolean claims
                bool isAdmin = bool.TryParse(isAdminClaim, out bool admin) && admin;

                // 4. Validate required claims exist
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    _logger.LogError("Invalid or missing userId claim");
                    return Unauthorized(new
                    {
                        success = false,
                        error = "Invalid user token. Please login again.",
                        redirectTo = "/login"
                    });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    _logger.LogError("No company selected in JWT token");
                    return BadRequest(new
                    {
                        success = false,
                        error = "Company ID is required"
                    });
                }

                // 5. Validate trade type is Retailer
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    _logger.LogWarning($"Access denied: TradeType is {tradeTypeClaim}, not Retailer");
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "Access denied for this trade type. This is a Retailer-only feature."
                    });
                }

                // 6. Get company details
                var company = await _context.Companies
                    .Where(c => c.Id == companyIdGuid)
                    .Select(c => new
                    {
                        c.Id,
                        c.Name,
                        c.RenewalDate,
                        DateFormat = c.DateFormat,
                        VatEnabled = c.VatEnabled
                    })
                    .FirstOrDefaultAsync();

                if (company == null)
                {
                    _logger.LogError($"Company not found: {companyIdGuid}");
                    return NotFound(new
                    {
                        success = false,
                        error = "Company not found"
                    });
                }

                // 7. Get current fiscal year (from JWT claim or database)
                Models.FiscalYearModel.FiscalYear? currentFiscalYear = null;

                // First try from JWT claim
                if (!string.IsNullOrEmpty(fiscalYearId) && Guid.TryParse(fiscalYearId, out Guid fiscalYearIdGuid))
                {
                    currentFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.Id == fiscalYearIdGuid && f.CompanyId == companyIdGuid);
                }

                // Fallback to active fiscal year for the company
                if (currentFiscalYear == null)
                {
                    currentFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
                }

                // Fallback to any fiscal year
                if (currentFiscalYear == null)
                {
                    currentFiscalYear = await _context.FiscalYears
                        .Where(f => f.CompanyId == companyIdGuid)
                        .OrderByDescending(f => f.StartDate)
                        .FirstOrDefaultAsync();
                }

                if (currentFiscalYear == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No fiscal year found for this company"
                    });
                }

                // 8. Fetch the item details with all related data
                var item = await _context.Items
                    .Where(i => i.Id == id && i.CompanyId == companyIdGuid)
                    .Include(i => i.Category)
                    .Include(i => i.ItemCompany)
                    .Include(i => i.Unit)
                    .Include(i => i.MainUnit)
                    .Include(i => i.ItemCompositions)
                        .ThenInclude(ic => ic.Composition)
                    .Include(i => i.StockEntries)
                    .Include(i => i.InitialOpeningStock)
                        .ThenInclude(ios => ios!.InitialFiscalYear)
                    .Include(i => i.OpeningStocksByFiscalYear)
                        .ThenInclude(os => os.FiscalYear)
                    .AsSplitQuery()
                    .FirstOrDefaultAsync();

                if (item == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Item not found"
                    });
                }

                // 9. Initialize opening stock values with defaults
                decimal openingStock = 0;
                decimal openingStockValue = 0;
                decimal salesPrice = 0;
                decimal purchasePrice = 0;

                // Check if item has openingStocksByFiscalYear array
                if (item.OpeningStocksByFiscalYear != null && item.OpeningStocksByFiscalYear.Any())
                {
                    var openingStockForFiscalYear = item.OpeningStocksByFiscalYear
                        .FirstOrDefault(stockEntry => stockEntry.FiscalYearId == currentFiscalYear.Id);

                    if (openingStockForFiscalYear != null)
                    {
                        openingStock = openingStockForFiscalYear.OpeningStock;
                        openingStockValue = openingStockForFiscalYear.OpeningStockValue;
                        salesPrice = openingStockForFiscalYear.SalesPrice;
                        purchasePrice = openingStockForFiscalYear.PurchasePrice;
                    }
                }

                // 10. Process stock entries with null checks
                var stockEntries = (item.StockEntries ?? new List<StockEntry>())
                    .Select(entry => new
                    {
                        entry.Id,
                        entry.ItemId,
                        entry.Quantity,
                        entry.Price,
                        entry.NetPrice,
                        entry.PuPrice,
                        entry.NetPuPrice,
                        entry.MainUnitPuPrice,
                        entry.Mrp,
                        entry.BatchNumber,
                        entry.UniqueUuid,
                        ExpiryDate = entry.ExpiryDate.ToString("yyyy-MM-dd"),
                        entry.ExpiryStatus,
                        entry.DaysUntilExpiry,
                        entry.Date,
                        entry.CreatedAt,
                        entry.UpdatedAt,
                        BarcodeData = $"{companyName}|{item.UniqueNumber}|{entry.Mrp}|{entry.BatchNumber ?? "N/A"}|{entry.ExpiryDate.ToString("yyyy-MM-dd") ?? "N/A"}"
                    })
                    .ToList();

                // 11. Get barcode preferences
                var barcodePrefs = await _context.BarcodePreferences
                    .Where(bp => bp.UserId == userIdGuid)
                    .Select(bp => new
                    {
                        bp.LabelWidth,
                        bp.LabelHeight,
                        bp.LabelsPerRow,
                        bp.BarcodeType,
                        bp.DefaultQuantity,
                        bp.IncludeItemName,
                        bp.IncludePrice,
                        bp.IncludeBatch,
                        bp.IncludeExpiry,
                        bp.FontSize,
                        bp.Border,
                        bp.PaperSize,
                        bp.Orientation,
                        bp.Margin
                    })
                    .FirstOrDefaultAsync();

                var printPreferences = barcodePrefs ?? new
                {
                    LabelWidth = 70,
                    LabelHeight = 40,
                    LabelsPerRow = 3,
                    BarcodeType = "code128",
                    DefaultQuantity = 1,
                    IncludeItemName = true,
                    IncludePrice = true,
                    IncludeBatch = true,
                    IncludeExpiry = true,
                    FontSize = 12,
                    Border = true,
                    PaperSize = "A4",
                    Orientation = "portrait",
                    Margin = 10
                };

                // 12. Check if item has transactions using TransactionItems (new structure)
                var hasTransactions = await _context.TransactionItems
                    .AnyAsync(ti => ti.ItemId == id && ti.Transaction != null && ti.Transaction.CompanyId == companyIdGuid);

                // 13. Prepare user info
                var userInfo = new
                {
                    _id = userId,
                    id = userId,
                    name = userName ?? "User",
                    email = userEmail ?? "",
                    isAdmin = isAdmin,
                    role = roleName ?? "User",
                    preferences = new { theme = "light" }
                };

                // 14. Determine if user is admin or supervisor
                bool isAdminOrSupervisor = isAdmin || (roleName == "Supervisor" || roleName == "Admin");

                // 15. Calculate current stock
                decimal currentStock = item.OpeningStock;
                if (item.StockEntries != null && item.StockEntries.Any())
                {
                    currentStock = item.StockEntries.Sum(se => se.Quantity);
                }

                // 16. Prepare compositions - Check for null
                List<object> compositions;
                if (item.ItemCompositions != null && item.ItemCompositions.Any())
                {
                    compositions = item.ItemCompositions.Select(ic => new
                    {
                        _id = ic.Composition?.Id ?? Guid.Empty,
                        id = ic.Composition?.Id ?? Guid.Empty,
                        name = ic.Composition?.Name ?? string.Empty,
                        uniqueNumber = ic.Composition?.UniqueNumber ?? 0
                    }).ToList<object>();
                }
                else
                {
                    compositions = new List<object>();
                    _logger.LogWarning("No ItemCompositions found for item {ItemId}", item.Id);
                }

                // 17. Prepare opening stocks by fiscal year - Check for null
                List<object> openingStockByFiscalYear;
                if (item.OpeningStocksByFiscalYear != null && item.OpeningStocksByFiscalYear.Any())
                {
                    openingStockByFiscalYear = item.OpeningStocksByFiscalYear.Select(os => new
                    {
                        fiscalYearId = os.FiscalYearId,
                        fiscalYearName = os.FiscalYear?.Name,
                        openingStock = os.OpeningStock,
                        openingStockValue = os.OpeningStockValue,
                        purchasePrice = os.PurchasePrice,
                        salesPrice = os.SalesPrice
                    }).ToList<object>();
                }
                else
                {
                    openingStockByFiscalYear = new List<object>();
                    _logger.LogWarning("No OpeningStocksByFiscalYear found for item {ItemId}", item.Id);
                }

                // 18. Prepare the response
                var responseData = new
                {
                    success = true,
                    data = new
                    {
                        company = new
                        {
                            company.Id,
                            company.Name,
                            company.RenewalDate,
                            DateFormat = company.DateFormat?.ToString()?.ToLower() ?? "english",
                            VatEnabled = company.VatEnabled
                        },
                        currentFiscalYear = new
                        {
                            _id = currentFiscalYear.Id,
                            id = currentFiscalYear.Id,
                            name = currentFiscalYear.Name,
                            startDate = currentFiscalYear.StartDate,
                            endDate = currentFiscalYear.EndDate,
                            startDateNepali = currentFiscalYear.StartDateNepali,
                            endDateNepali = currentFiscalYear.EndDateNepali,
                            dateFormat = currentFiscalYear.DateFormat?.ToString()?.ToLower() ?? "english",
                            isActive = currentFiscalYear.IsActive
                        },
                        item = new
                        {
                            _id = item.Id,
                            id = item.Id,
                            item.Name,
                            item.Hscode,
                            categoryId = item.CategoryId,
                            categoryName = item.Category?.Name,
                            itemsCompanyId = item.ItemsCompanyId,
                            itemsCompanyName = item.ItemCompany?.Name,
                            item.Price,
                            item.PuPrice,
                            item.MainUnitPuPrice,
                            mainUnitId = item.MainUnitId,
                            mainUnitName = item.MainUnit?.Name,
                            wsUnit = item.WsUnit,
                            unitId = item.UnitId,
                            unitName = item.Unit?.Name,
                            vatStatus = item.VatStatus,
                            status = item.Status,
                            barcodeNumber = item.BarcodeNumber,
                            uniqueNumber = item.UniqueNumber,
                            reorderLevel = item.ReorderLevel,
                            createdAt = item.CreatedAt,
                            stockEntries = item.StockEntries,
                            compositions = compositions,
                            openingStockByFiscalYear = openingStockByFiscalYear
                        },
                        hasTransactions = hasTransactions,
                        stockInfo = new
                        {
                            openingStock,
                            openingStockValue,
                            salesPrice,
                            purchasePrice
                        },
                        stockEntries,
                        printPreferences,
                        barcodeBaseUrl = $"/item/{item.Id}/barcode",
                        fiscalYear = currentFiscalYear.Id,
                        currentCompanyName = companyName ?? company.Name,
                        user = userInfo,
                        theme = "light",
                        isAdminOrSupervisor = isAdminOrSupervisor
                    }
                };

                _logger.LogInformation($"Successfully fetched item details: {item.Name} (ID: {item.Id})");

                return Ok(responseData);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error fetching item {id}");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Server error",
                    message = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // [HttpGet("items/search")]
        // public async Task<IActionResult> SearchItems([FromQuery] DateTime? asOfDate = null)
        // {
        //     try
        //     {
        //         _logger.LogInformation("=== SearchItems Started ===");

        //         // 1. Extract required info from JWT claims
        //         var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        //         var companyId = User.FindFirst("currentCompany")?.Value;
        //         var tradeTypeClaim = User.FindFirst("tradeType")?.Value;
        //         var fiscalYearId = User.FindFirst("currentFiscalYear")?.Value;

        //         // 2. Get query parameters
        //         var search = Request.Query["search"].FirstOrDefault() ?? "";
        //         var page = int.TryParse(Request.Query["page"].FirstOrDefault(), out int pageNum) ? pageNum : 1;
        //         var limit = int.TryParse(Request.Query["limit"].FirstOrDefault(), out int limitNum) ? limitNum : 25;
        //         var vatStatus = Request.Query["vatStatus"].FirstOrDefault() ?? "all";

        //         // 3. Validate required claims exist
        //         if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
        //         {
        //             _logger.LogError("Invalid or missing userId claim");
        //             return Unauthorized(new
        //             {
        //                 success = false,
        //                 error = "Invalid user token. Please login again.",
        //                 redirectTo = "/login"
        //             });
        //         }

        //         if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
        //         {
        //             _logger.LogError("No company selected in JWT token");
        //             return BadRequest(new
        //             {
        //                 success = false,
        //                 error = "No company selected. Please select a company first.",
        //                 redirectTo = "/user-dashboard"
        //             });
        //         }

        //         // 4. Validate trade type is Retailer
        //         if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
        //         {
        //             _logger.LogWarning($"Access denied: TradeType is {tradeTypeClaim}, not Retailer");
        //             return StatusCode(403, new
        //             {
        //                 success = false,
        //                 error = "Access denied for this trade type. This is a Retailer-only feature.",
        //                 redirectTo = "/user-dashboard"
        //             });
        //         }

        //         // 5. Get current fiscal year
        //         Models.FiscalYearModel.FiscalYear? currentFiscalYear = null;
        //         if (!string.IsNullOrEmpty(fiscalYearId) && Guid.TryParse(fiscalYearId, out Guid fiscalYearIdGuid))
        //         {
        //             currentFiscalYear = await _context.FiscalYears
        //                 .FirstOrDefaultAsync(f => f.Id == fiscalYearIdGuid && f.CompanyId == companyIdGuid);
        //         }

        //         // Fallback to active fiscal year
        //         if (currentFiscalYear == null)
        //         {
        //             currentFiscalYear = await _context.FiscalYears
        //                 .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
        //         }

        //         // Fallback to any fiscal year
        //         if (currentFiscalYear == null)
        //         {
        //             currentFiscalYear = await _context.FiscalYears
        //                 .Where(f => f.CompanyId == companyIdGuid)
        //                 .OrderByDescending(f => f.StartDate)
        //                 .FirstOrDefaultAsync();
        //         }

        //         if (currentFiscalYear == null)
        //         {
        //             return BadRequest(new
        //             {
        //                 success = false,
        //                 error = "No fiscal year found for this company",
        //                 redirectTo = "/fiscal-years"
        //             });
        //         }

        //         // 6. Build the query
        //         var query = _context.Items
        //             .Where(i => i.CompanyId == companyIdGuid && i.FiscalYearId == currentFiscalYear.Id)
        //             .AsQueryable();

        //         // 7. Apply search filter
        //         if (!string.IsNullOrEmpty(search) && search.Trim() != "")
        //         {
        //             var searchTerm = search.Trim().ToLower();

        //             // Check if search term is a number (for uniqueNumber/hscode search)
        //             if (int.TryParse(searchTerm, out int numSearch) && searchTerm.Length <= 10)
        //             {
        //                 // Convert to string for Hscode comparison (Hscode is string)
        //                 string numSearchStr = numSearch.ToString();
        //                 query = query.Where(i => i.UniqueNumber == numSearch || i.Hscode == numSearchStr);
        //             }
        //             else
        //             {
        //                 // Text search - split into words
        //                 var words = searchTerm.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);

        //                 if (words.Length == 1)
        //                 {
        //                     // Single word search
        //                     var word = words[0];
        //                     query = query.Where(i =>
        //                         i.Name.ToLower().Contains(word) ||
        //                         (i.Category != null && i.Category.Name.ToLower().Contains(word)) ||
        //                         (i.ItemCompany != null && i.ItemCompany.Name.ToLower().Contains(word)));
        //                 }
        //                 else
        //                 {
        //                     // Multiple words - find items that contain ALL words in name
        //                     foreach (var word in words)
        //                     {
        //                         query = query.Where(i => i.Name.ToLower().Contains(word));
        //                     }
        //                 }
        //             }
        //         }

        //         // 8. Apply VAT status filter
        //         if (vatStatus != "all")
        //         {
        //             if (vatStatus == "false") // vatable
        //             {
        //                 query = query.Where(i => i.VatStatus == "vatable");
        //             }
        //             else // vatExempt
        //             {
        //                 query = query.Where(i => i.VatStatus == "vatExempt");
        //             }
        //         }

        //         // 9. Get total count
        //         var totalItems = await query.CountAsync();

        //         // 10. Calculate pagination
        //         var skip = (page - 1) * limit;

        //         // 11. Fetch items with related data
        //         var items = await query
        //             .Include(i => i.Category)
        //             .Include(i => i.ItemCompany)
        //             .Include(i => i.Unit)
        //             .Include(i => i.MainUnit)
        //             .Include(i => i.ItemCompositions)
        //                 .ThenInclude(ic => ic.Composition)
        //             .Include(i => i.StockEntries)
        //             .OrderBy(i => i.Name)
        //             .Skip(skip)
        //             .Take(limit)
        //             .ToListAsync();

        //         // 12. Process items to calculate current stock
        //         var itemsWithStock = items.Select(item =>
        //         {
        //             // Calculate current stock
        //             decimal currentStock = 0;
        //             if (item.StockEntries != null && item.StockEntries.Any())
        //             {
        //                 currentStock = item.StockEntries.Sum(entry => entry.Quantity);
        //             }

        //             // Prepare stock entries for response - Cast to object
        //             object stockEntriesObj;
        //             if (item.StockEntries != null && item.StockEntries.Any())
        //             {
        //                 stockEntriesObj = item.StockEntries.Select(se => new StockEntryResponseDTO
        //                 {
        //                     Id = se.Id,
        //                     ItemId = se.ItemId,
        //                     Date = se.Date,
        //                     Quantity = se.Quantity,
        //                     BillQty = se.BillQty,
        //                     ActualQty = se.ActualQty,
        //                     Price = se.Price,
        //                     NetPrice = se.NetPrice,
        //                     PuPrice = se.PuPrice,
        //                     NetPuPrice = se.NetPuPrice,
        //                     CcPercentage = se.CcPercentage,
        //                     ItemCcAmount = se.ItemCcAmount,
        //                     MainUnitPuPrice = se.MainUnitPuPrice,
        //                     MarginPercentage = se.MarginPercentage,
        //                     Mrp = se.Mrp,
        //                     UniqueUuid = se.UniqueUuid,  // This will be serialized as "uniqueUuid" in JSON
        //                     BatchNumber = se.BatchNumber,
        //                     ExpiryDate = se.ExpiryDate,
        //                     ExpiryStatus = se.ExpiryStatus,
        //                     DaysUntilExpiry = se.DaysUntilExpiry,
        //                     CreatedAt = se.CreatedAt,
        //                     UpdatedAt = se.UpdatedAt
        //                     // Add other properties as needed
        //                 }).ToList();
        //             }
        //             else
        //             {
        //                 stockEntriesObj = new List<StockEntryResponseDTO>();
        //             }
        //             // Prepare compositions for response
        //             object compositionsObj;
        //             if (item.ItemCompositions != null && item.ItemCompositions.Any())
        //             {
        //                 compositionsObj = item.ItemCompositions.Select(ic => new
        //                 {
        //                     _id = ic.Composition?.Id ?? Guid.Empty,
        //                     id = ic.Composition?.Id ?? Guid.Empty,
        //                     name = ic.Composition?.Name ?? string.Empty,
        //                     uniqueNumber = ic.Composition?.UniqueNumber ?? 0
        //                 }).ToList();
        //             }
        //             else
        //             {
        //                 compositionsObj = new List<object>();
        //             }

        //             return new
        //             {
        //                 _id = item.Id,
        //                 id = item.Id,
        //                 Name = item.Name,
        //                 Hscode = item.Hscode,
        //                 categoryId = item.CategoryId,
        //                 categoryName = item.Category?.Name,
        //                 itemsCompanyId = item.ItemsCompanyId,
        //                 itemsCompanyName = item.ItemCompany?.Name,
        //                 Price = item.Price,
        //                 PuPrice = item.PuPrice,
        //                 MainUnitPuPrice = item.MainUnitPuPrice,
        //                 mainUnitId = item.MainUnitId,
        //                 mainUnitName = item.MainUnit?.Name,
        //                 wsUnit = item.WsUnit,
        //                 unitId = item.UnitId,
        //                 unitName = item.Unit?.Name,
        //                 vatStatus = item.VatStatus,
        //                 openingStock = item.OpeningStock,
        //                 minStock = item.MinStock,
        //                 maxStock = item.MaxStock,
        //                 reorderLevel = item.ReorderLevel,
        //                 uniqueNumber = item.UniqueNumber,
        //                 barcodeNumber = item.BarcodeNumber,
        //                 companyId = item.CompanyId,
        //                 fiscalYearId = item.FiscalYearId,
        //                 Status = item.Status,
        //                 createdAt = item.CreatedAt,
        //                 date = item.Date,
        //                 updatedAt = item.UpdatedAt,
        //                 currentStock = currentStock,
        //                 totalStock = currentStock,
        //                 stockValue = currentStock * (item.Price ?? 0),
        //                 stockEntries = stockEntriesObj,
        //                 compositions = compositionsObj,
        //                 hasTransactions = "false", // Default - you can update this if needed
        //                 stockEntriesCount = item.StockEntries?.Count ?? 0
        //             };
        //         }).ToList();

        //         // 13. Prepare pagination info
        //         var paginationInfo = new
        //         {
        //             currentPage = page,
        //             totalPages = (int)Math.Ceiling((double)totalItems / limit),
        //             totalItems,
        //             itemsPerPage = limit,
        //             hasNextPage = (page * limit) < totalItems,
        //             hasPreviousPage = page > 1
        //         };

        //         // 14. Prepare response
        //         var response = new
        //         {
        //             success = true,
        //             items = itemsWithStock,
        //             pagination = paginationInfo
        //         };

        //         _logger.LogInformation($"Successfully searched items. Found {itemsWithStock.Count} items matching search criteria.");
        //         return Ok(response);
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error searching items");
        //         return StatusCode(500, new
        //         {
        //             success = false,
        //             error = "Failed to search items",
        //             message = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
        //         });
        //     }
        // }

        [HttpGet("items/search")]
        public async Task<IActionResult> SearchItems([FromQuery] string? asOfNepaliDate = null, [FromQuery] DateTime? asOfEnglishDate = null)
        {
            try
            {
                _logger.LogInformation("=== SearchItems Started ===");
                _logger.LogInformation($"asOfNepaliDate parameter: {asOfNepaliDate}");
                _logger.LogInformation($"asOfEnglishDate parameter: {asOfEnglishDate}");

                // 1. Extract required info from JWT claims
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;
                var fiscalYearId = User.FindFirst("currentFiscalYear")?.Value;
                var companyDateFormat = User.FindFirst("dateFormat")?.Value ?? "nepali";

                // 2. Get query parameters
                var search = Request.Query["search"].FirstOrDefault() ?? "";
                var page = int.TryParse(Request.Query["page"].FirstOrDefault(), out int pageNum) ? pageNum : 1;
                var limit = int.TryParse(Request.Query["limit"].FirstOrDefault(), out int limitNum) ? limitNum : 25;
                var vatStatus = Request.Query["vatStatus"].FirstOrDefault() ?? "all";

                // 3. Validate required claims exist
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    _logger.LogError("Invalid or missing userId claim");
                    return Unauthorized(new
                    {
                        success = false,
                        error = "Invalid user token. Please login again.",
                        redirectTo = "/login"
                    });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    _logger.LogError("No company selected in JWT token");
                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected. Please select a company first.",
                        redirectTo = "/user-dashboard"
                    });
                }

                // 4. Validate trade type is Retailer
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    _logger.LogWarning($"Access denied: TradeType is {tradeTypeClaim}, not Retailer");
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "Access denied for this trade type. This is a Retailer-only feature.",
                        redirectTo = "/user-dashboard"
                    });
                }

                // 5. Get current fiscal year
                Models.FiscalYearModel.FiscalYear? currentFiscalYear = null;
                if (!string.IsNullOrEmpty(fiscalYearId) && Guid.TryParse(fiscalYearId, out Guid fiscalYearIdGuid))
                {
                    currentFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.Id == fiscalYearIdGuid && f.CompanyId == companyIdGuid);
                }

                // Fallback to active fiscal year
                if (currentFiscalYear == null)
                {
                    currentFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
                }

                // Fallback to any fiscal year
                if (currentFiscalYear == null)
                {
                    currentFiscalYear = await _context.FiscalYears
                        .Where(f => f.CompanyId == companyIdGuid)
                        .OrderByDescending(f => f.StartDate)
                        .FirstOrDefaultAsync();
                }

                if (currentFiscalYear == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No fiscal year found for this company",
                        redirectTo = "/fiscal-years"
                    });
                }

                // 6. Build the query
                var query = _context.Items
                    .Where(i => i.CompanyId == companyIdGuid && i.FiscalYearId == currentFiscalYear.Id)
                    .AsQueryable();

                // 7. Apply search filter
                if (!string.IsNullOrEmpty(search) && search.Trim() != "")
                {
                    var searchTerm = search.Trim().ToLower();

                    // Check if search term is a number (for uniqueNumber/hscode search)
                    if (int.TryParse(searchTerm, out int numSearch) && searchTerm.Length <= 10)
                    {
                        string numSearchStr = numSearch.ToString();
                        query = query.Where(i => i.UniqueNumber == numSearch || i.Hscode == numSearchStr);
                    }
                    else
                    {
                        var words = searchTerm.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);

                        if (words.Length == 1)
                        {
                            var word = words[0];
                            query = query.Where(i =>
                                i.Name.ToLower().Contains(word) ||
                                (i.Category != null && i.Category.Name.ToLower().Contains(word)) ||
                                (i.ItemCompany != null && i.ItemCompany.Name.ToLower().Contains(word)));
                        }
                        else
                        {
                            foreach (var word in words)
                            {
                                query = query.Where(i => i.Name.ToLower().Contains(word));
                            }
                        }
                    }
                }

                // 8. Apply VAT status filter
                if (vatStatus != "all")
                {
                    if (vatStatus == "false")
                    {
                        query = query.Where(i => i.VatStatus == "vatable");
                    }
                    else
                    {
                        query = query.Where(i => i.VatStatus == "vatExempt");
                    }
                }

                // 9. Get total count
                var totalItems = await query.CountAsync();

                // 10. Calculate pagination
                var skip = (page - 1) * limit;

                // 11. Fetch items with related data
                var items = await query
                    .Include(i => i.Category)
                    .Include(i => i.ItemCompany)
                    .Include(i => i.Unit)
                    .Include(i => i.MainUnit)
                    .Include(i => i.ItemCompositions)
                        .ThenInclude(ic => ic.Composition)
                    .Include(i => i.StockEntries)
                    .OrderBy(i => i.Name)
                    .Skip(skip)
                    .Take(limit)
                    .ToListAsync();

                // 12. Determine which date field to use based on company date format
                bool useNepaliDate = companyDateFormat?.ToLower() == "nepali";

                // Parse the asOf date based on the date format
                DateTime? effectiveDate = null;
                DateOnly? effectiveNepaliDate = null;

                if (useNepaliDate && !string.IsNullOrEmpty(asOfNepaliDate))
                {
                    // Try to parse Nepali date string (format: YYYY-MM-DD)
                    if (DateOnly.TryParse(asOfNepaliDate, out DateOnly nepaliDate))
                    {
                        effectiveNepaliDate = nepaliDate;
                        _logger.LogDebug($"Using Nepali date filter: {effectiveNepaliDate}");
                    }
                }
                else if (!useNepaliDate && asOfEnglishDate.HasValue)
                {
                    effectiveDate = asOfEnglishDate.Value.Date;
                    _logger.LogDebug($"Using English date filter: {effectiveDate}");
                }

                // 13. Process items to calculate stock as of the given date
                var itemsWithStock = items.Select(item =>
                {
                    // Filter stock entries based on date
                    var filteredStockEntries = item.StockEntries?.AsEnumerable();

                    decimal currentStock = 0;
                    List<StockEntryResponseDTO> filteredEntriesList = new List<StockEntryResponseDTO>();

                    if (filteredStockEntries != null && filteredStockEntries.Any())
                    {
                        if (useNepaliDate && effectiveNepaliDate.HasValue)
                        {
                            // Filter by Nepali date (store as DateOnly in database)
                            filteredStockEntries = filteredStockEntries
                                .Where(se => se.NepaliDate.HasValue &&
                                             DateOnly.FromDateTime(se.NepaliDate.Value) <= effectiveNepaliDate.Value);

                            _logger.LogDebug($"Filtering stock entries by Nepali date <= {effectiveNepaliDate.Value}");
                        }
                        else if (!useNepaliDate && effectiveDate.HasValue)
                        {
                            // Filter by English date
                            filteredStockEntries = filteredStockEntries
                                .Where(se => se.Date.Date <= effectiveDate.Value);

                            _logger.LogDebug($"Filtering stock entries by English date <= {effectiveDate.Value}");
                        }

                        // Sum quantities from filtered entries
                        currentStock = filteredStockEntries.Sum(entry => entry.Quantity);

                        // Create filtered stock entries for response
                        filteredEntriesList = filteredStockEntries.Select(se => new StockEntryResponseDTO
                        {
                            Id = se.Id,
                            ItemId = se.ItemId,
                            Date = se.Date,
                            NepaliDate = se.NepaliDate,
                            Quantity = se.Quantity,
                            BillQty = se.BillQty,
                            ActualQty = se.ActualQty,
                            Price = se.Price,
                            NetPrice = se.NetPrice,
                            PuPrice = se.PuPrice,
                            NetPuPrice = se.NetPuPrice,
                            CcPercentage = se.CcPercentage,
                            ItemCcAmount = se.ItemCcAmount,
                            MainUnitPuPrice = se.MainUnitPuPrice,
                            MarginPercentage = se.MarginPercentage,
                            Mrp = se.Mrp,
                            UniqueUuid = se.UniqueUuid,
                            BatchNumber = se.BatchNumber,
                            ExpiryDate = se.ExpiryDate,
                            ExpiryStatus = se.ExpiryStatus,
                            DaysUntilExpiry = se.DaysUntilExpiry,
                            CreatedAt = se.CreatedAt,
                            UpdatedAt = se.UpdatedAt,
                        }).ToList();
                    }

                    // Get the latest stock entry (for price information) from filtered list
                    StockEntry? latestStockEntry = null;
                    if (filteredStockEntries != null && filteredStockEntries.Any())
                    {
                        if (useNepaliDate)
                        {
                            latestStockEntry = filteredStockEntries
                                .OrderByDescending(se => se.NepaliDate)
                                .ThenByDescending(se => se.CreatedAt)
                                .FirstOrDefault();
                        }
                        else
                        {
                            latestStockEntry = filteredStockEntries
                                .OrderByDescending(se => se.Date)
                                .ThenByDescending(se => se.CreatedAt)
                                .FirstOrDefault();
                        }
                    }

                    // Prepare compositions for response
                    object compositionsObj;
                    if (item.ItemCompositions != null && item.ItemCompositions.Any())
                    {
                        compositionsObj = item.ItemCompositions.Select(ic => new
                        {
                            _id = ic.Composition?.Id ?? Guid.Empty,
                            id = ic.Composition?.Id ?? Guid.Empty,
                            name = ic.Composition?.Name ?? string.Empty,
                            uniqueNumber = ic.Composition?.UniqueNumber ?? 0
                        }).ToList();
                    }
                    else
                    {
                        compositionsObj = new List<object>();
                    }

                    return new
                    {
                        _id = item.Id,
                        id = item.Id,
                        Name = item.Name,
                        Hscode = item.Hscode,
                        categoryId = item.CategoryId,
                        categoryName = item.Category?.Name,
                        itemsCompanyId = item.ItemsCompanyId,
                        itemsCompanyName = item.ItemCompany?.Name,
                        Price = item.Price,
                        PuPrice = item.PuPrice,
                        MainUnitPuPrice = item.MainUnitPuPrice,
                        mainUnitId = item.MainUnitId,
                        mainUnitName = item.MainUnit?.Name,
                        wsUnit = item.WsUnit,
                        unitId = item.UnitId,
                        unitName = item.Unit?.Name,
                        vatStatus = item.VatStatus,
                        openingStock = item.OpeningStock,
                        minStock = item.MinStock,
                        maxStock = item.MaxStock,
                        reorderLevel = item.ReorderLevel,
                        uniqueNumber = item.UniqueNumber,
                        barcodeNumber = item.BarcodeNumber,
                        companyId = item.CompanyId,
                        fiscalYearId = item.FiscalYearId,
                        Status = item.Status,
                        createdAt = item.CreatedAt,
                        date = item.Date,
                        updatedAt = item.UpdatedAt,
                        currentStock = currentStock,
                        totalStock = currentStock,
                        stockValue = currentStock * (item.Price ?? 0),
                        stockEntries = filteredEntriesList,
                        compositions = compositionsObj,
                        hasTransactions = "false",
                        stockEntriesCount = filteredEntriesList.Count,
                        latestPrice = latestStockEntry?.PuPrice ?? 0,
                        latestBatchNumber = latestStockEntry?.BatchNumber ?? "",
                        latestExpiryDate = latestStockEntry?.ExpiryDate.ToString("yyyy-MM-dd") ?? "",
                        latestWSUnit = latestStockEntry?.WsUnit ?? 1,
                        latestCcPercentage = latestStockEntry?.CcPercentage ?? 0
                    };
                }).ToList();

                // 14. Prepare pagination info
                var paginationInfo = new
                {
                    currentPage = page,
                    totalPages = (int)Math.Ceiling((double)totalItems / limit),
                    totalItems,
                    itemsPerPage = limit,
                    hasNextPage = (page * limit) < totalItems,
                    hasPreviousPage = page > 1
                };

                // 15. Prepare response
                var response = new
                {
                    success = true,
                    items = itemsWithStock,
                    pagination = paginationInfo,
                    filterInfo = new
                    {
                        dateFormatUsed = useNepaliDate ? "nepali" : "english",
                        asOfNepaliDate = effectiveNepaliDate?.ToString("yyyy-MM-dd"),
                        asOfEnglishDate = effectiveDate?.ToString("yyyy-MM-dd")
                    }
                };

                _logger.LogInformation($"Successfully searched items. Found {itemsWithStock.Count} items. Filter: {(useNepaliDate ? "Nepali" : "English")} date = {(useNepaliDate ? effectiveNepaliDate?.ToString() : effectiveDate?.ToString())}");
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching items");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Failed to search items",
                    message = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        [HttpGet("items/{itemId}/last-sales-price")]
        public async Task<IActionResult> GetLastSalesPrice(Guid itemId)
        {
            try
            {
                _logger.LogInformation($"=== GetLastSalesPrice Started for Item: {itemId} ===");

                // Extract company and fiscal year from claims
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearId = User.FindFirst("currentFiscalYear")?.Value;

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected"
                    });
                }

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearId) || !Guid.TryParse(fiscalYearId, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                    if (activeFiscalYear == null)
                    {
                        return BadRequest(new
                        {
                            success = false,
                            error = "No fiscal year found"
                        });
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                decimal lastPrice = 0;
                decimal? lastMarginPercentage = null;

                // 1. Try to get from sales bills first (most recent)
                var lastSalesBillItem = await _context.SalesBillItems
                    .Include(sbi => sbi.SalesBill)
                    .Where(sbi => sbi.ItemId == itemId
                        && sbi.SalesBill.CompanyId == companyIdGuid
                        && sbi.SalesBill.FiscalYearId == fiscalYearIdGuid)
                    .OrderByDescending(sbi => sbi.SalesBill.CreatedAt)
                    .FirstOrDefaultAsync();

                if (lastSalesBillItem != null)
                {
                    lastPrice = lastSalesBillItem.Price;
                    lastMarginPercentage = lastSalesBillItem.MarginPercentage;
                    _logger.LogInformation($"Found price from sales bill: {lastPrice}, margin: {lastMarginPercentage}");
                    return Ok(new
                    {
                        success = true,
                        price = lastPrice,
                        marginPercentage = lastMarginPercentage,
                        source = "sales"
                    });
                }

                // 3. Try from stock entries (purchase price)
                var lastStockEntry = await _context.StockEntries
                    .Where(se => se.ItemId == itemId)
                    .OrderByDescending(se => se.Date)
                    .FirstOrDefaultAsync();

                if (lastStockEntry != null)
                {
                    lastPrice = lastStockEntry.Price;
                    lastMarginPercentage = lastStockEntry.MarginPercentage;
                    _logger.LogInformation($"Found price from stock entry: {lastPrice}");
                    return Ok(new
                    {
                        success = true,
                        price = lastPrice,
                        marginPercentage = lastMarginPercentage,
                    });
                }

                // 4. Fallback to item's default price
                var item = await _context.Items.FindAsync(itemId);
                if (item != null && item.Price.HasValue)
                {
                    lastPrice = item.Price.Value;
                    _logger.LogInformation($"Found price from item default: {lastPrice}");
                    return Ok(new { success = true, price = lastPrice, source = "default" });
                }

                return Ok(new { success = true, price = 0, source = "none" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting last sales price for item {itemId}");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Failed to get last sales price"
                });
            }
        }


        [HttpGet("items/{itemId}/last-purchase-price")]
        public async Task<IActionResult> GetLastPurchasePrice(Guid itemId)
        {
            try
            {
                _logger.LogInformation($"=== GetLastPurchasePrice Started for Item: {itemId} ===");

                // Extract company and fiscal year from claims
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearId = User.FindFirst("currentFiscalYear")?.Value;

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected"
                    });
                }

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearId) || !Guid.TryParse(fiscalYearId, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                    if (activeFiscalYear == null)
                    {
                        return BadRequest(new
                        {
                            success = false,
                            error = "No fiscal year found"
                        });
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                decimal lastPrice = 0;

                // 1. Try to get from purchase bills first (most recent)
                var lastPurchaseBillItem = await _context.PurchaseBillItems
                    .Include(pbi => pbi.PurchaseBill)
                    .Where(pbi => pbi.ItemId == itemId
                        && pbi.PurchaseBill.CompanyId == companyIdGuid
                        && pbi.PurchaseBill.FiscalYearId == fiscalYearIdGuid)
                    .OrderByDescending(pbi => pbi.PurchaseBill.CreatedAt)
                    .FirstOrDefaultAsync();

                if (lastPurchaseBillItem != null)
                {
                    lastPrice = lastPurchaseBillItem.PuPrice; // Using PuPrice as purchase price
                    _logger.LogInformation($"Found price from purchase bill: {lastPrice}");
                    return Ok(new { success = true, price = lastPrice, source = "purchase" });
                }

                // 3. Try from stock entries
                var lastStockEntry = await _context.StockEntries
                    .Where(se => se.ItemId == itemId)
                    .OrderByDescending(se => se.Date)
                    .FirstOrDefaultAsync();

                if (lastStockEntry != null)
                {
                    lastPrice = lastStockEntry.PuPrice > 0 ? lastStockEntry.PuPrice : lastStockEntry.Price;
                    _logger.LogInformation($"Found price from stock entry: {lastPrice}");
                    return Ok(new { success = true, price = lastPrice, source = "stock" });
                }

                // 4. Fallback to item's default purchase price
                var item = await _context.Items.FindAsync(itemId);
                if (item != null && item.PuPrice.HasValue)
                {
                    lastPrice = item.PuPrice.Value;
                    _logger.LogInformation($"Found price from item default: {lastPrice}");
                    return Ok(new { success = true, price = lastPrice, source = "default" });
                }

                return Ok(new { success = true, price = 0, source = "none" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting last purchase price for item {itemId}");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Failed to get last purchase price"
                });
            }
        }



        // PUT: api/retailer/items/{itemId}/batch
        [HttpPut("items/{itemId}/batch")]
        public async Task<IActionResult> UpdateBatchByNumber(Guid itemId, [FromBody] UpdateBatchByNumberDTO updateDto)
        {
            try
            {
                _logger.LogInformation("=== UpdateBatchByNumber Started for Item: {ItemId}, Old Batch: {OldBatchNumber} ===",
                    itemId, updateDto?.OldBatchNumber);

                // 1. Extract required info from JWT claims
                var companyId = User.FindFirst("currentCompany")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                // 2. Validate required claims
                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    _logger.LogError("No company selected in JWT token");
                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected. Please select a company first.",
                        redirectTo = "/user-dashboard"
                    });
                }

                // 3. Validate trade type is Retailer
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    _logger.LogWarning($"Access denied: TradeType is {tradeTypeClaim}, not Retailer");
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "Access denied for this trade type. This is a Retailer-only feature.",
                        redirectTo = "/user-dashboard"
                    });
                }

                // 4. Validate DTO
                if (updateDto == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Request body is required"
                    });
                }

                if (string.IsNullOrWhiteSpace(updateDto.OldBatchNumber))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Old batch number is required"
                    });
                }

                if (string.IsNullOrWhiteSpace(updateDto.NewBatchNumber))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "New batch number is required"
                    });
                }

                if (updateDto.Price <= 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Price must be greater than 0"
                    });
                }

                if (updateDto.Mrp <= 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "MRP must be greater than 0"
                    });
                }

                // 5. Update batch using service
                var result = await _itemService.UpdateBatchByNumberAsync(itemId, updateDto.OldBatchNumber, updateDto, companyIdGuid);

                if (!result)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = $"Item or batch '{updateDto.OldBatchNumber}' not found"
                    });
                }

                // 6. Return success response
                return Ok(new
                {
                    success = true,
                    message = "Batch updated successfully",
                    data = new
                    {
                        itemId = itemId,
                        oldBatchNumber = updateDto.OldBatchNumber,
                        newBatchNumber = updateDto.NewBatchNumber,
                        expiryDate = updateDto.ExpiryDate,
                        price = updateDto.Price,
                        marginPercentage = updateDto.MarginPercentage,
                        mrp = updateDto.Mrp
                    }
                });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in UpdateBatchByNumber");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in UpdateBatchByNumber for item {ItemId}", itemId);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while updating batch",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

    }
}