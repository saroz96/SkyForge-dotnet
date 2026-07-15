using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto.RetailerDto;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.Retailer.Items;
using SkyForge.Models.Retailer.Purchase;
using SkyForge.Models.Retailer.PurchaseReturnModel;
using SkyForge.Models.Retailer.Sales;
using SkyForge.Models.Retailer.SalesReturnModel;
using SkyForge.Models.Retailer.StockAdjustmentModel;
using SkyForge.Models.UserModel;
using SkyForge.Models.RoleModel;

namespace SkyForge.Services.Retailer.StockStatusServices
{
    public class StockStatusService : IStockStatusService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<StockStatusService> _logger;

        public StockStatusService(
            ApplicationDbContext context,
            ILogger<StockStatusService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<StockStatusResponseDTO> GetStockStatusAsync(
            Guid companyId,
            Guid fiscalYearId,
            Company company,
            string dateFormat,
            int limit,
            int page,
            string search,
            bool showPurchaseValue,
            bool showSalesValue,
            User user,
            DateTime fromDate,
            DateTime toDate,
            string? vatFilter = null)
        {
            try
            {
                // Get current fiscal year
                var currentFiscalYear = await _context.FiscalYears
                    .AsNoTracking()
                    .Where(f => f.Id == fiscalYearId && f.CompanyId == companyId)
                    .Select(f => new FiscalYearDTO
                    {
                        Id = f.Id,
                        Name = f.Name,
                        StartDate = f.StartDate,
                        EndDate = f.EndDate,
                        StartDateNepali = f.StartDateNepali,
                        EndDateNepali = f.EndDateNepali,
                        IsActive = f.IsActive,
                    })
                    .FirstOrDefaultAsync();

                if (currentFiscalYear == null)
                {
                    throw new ArgumentException("No fiscal year found in session or company.");
                }

                // Build base query with search filter
                var itemQuery = _context.Items
                    .AsNoTracking()
                    .Include(i => i.Category)
                    .Include(i => i.Unit)
                    .Include(i => i.InitialOpeningStock)
                    .Include(i => i.StockEntries)
                    .Where(i => i.CompanyId == companyId && i.Status == "active");

                // Apply VAT filter
                if (!string.IsNullOrEmpty(vatFilter) && vatFilter != "all")
                {
                    itemQuery = itemQuery.Where(i => i.VatStatus == vatFilter);
                }


                // Apply search filter
                if (!string.IsNullOrEmpty(search))
                {
                    if (int.TryParse(search, out int searchNumber))
                    {
                        itemQuery = itemQuery.Where(i =>
                            i.Name.Contains(search) ||
                            i.UniqueNumber == searchNumber);
                    }
                    else
                    {
                        itemQuery = itemQuery.Where(i =>
                            i.Name.Contains(search));
                    }
                }

                // Get total count for pagination
                int totalItems = await itemQuery.CountAsync();

                // Get items with pagination
                var items = await itemQuery
                    .Skip((page - 1) * limit)
                    .Take(limit)
                    .ToListAsync();

                // If no items found, return empty response
                if (!items.Any())
                {
                    var emptyCompanyInfo = new CompanyInfoDTO
                    {
                        Id = company.Id,
                        Name = company.Name,
                        Address = company.Address,
                        City = company.City,
                        Phone = company.Phone,
                        Pan = company.Pan,
                        RenewalDate = company.RenewalDate,
                        DateFormat = company.DateFormat.ToString(),
                        VatEnabled = company.VatEnabled
                    };

                    return new StockStatusResponseDTO
                    {
                        Company = emptyCompanyInfo,
                        CurrentFiscalYear = currentFiscalYear,
                        CurrentCompany = emptyCompanyInfo,
                        CurrentCompanyName = company.Name,
                        CompanyDateFormat = dateFormat,
                        Items = new List<StockStatusItemDTO>(),
                        Pagination = new PaginationDTO
                        {
                            Current = page,
                            Pages = 0,
                            Total = 0
                        },
                        IsAdminOrSupervisor = user.IsAdmin || user.IsInRole("Supervisor"),
                        FromDate = fromDate,
                        ToDate = toDate
                    };
                }

                // Get all item IDs for batch queries
                var itemIds = items.Select(i => i.Id).ToList();

                // Get OPENING STOCK transactions (BEFORE fromDate)
                var openingPurchaseBills = await _context.PurchaseBills
                    .AsNoTracking()
                    .Include(p => p.Items)
                    .Where(p => p.CompanyId == companyId &&
                               p.Items.Any(i => itemIds.Contains(i.ItemId)) &&
                               p.Date < fromDate)
                    .ToListAsync();

                var openingSalesBills = await _context.SalesBills
                    .AsNoTracking()
                    .Include(s => s.Items)
                    .Where(s => s.CompanyId == companyId &&
                               s.Items.Any(i => itemIds.Contains(i.ItemId)) &&
                               s.Date < fromDate)
                    .ToListAsync();

                var openingStockAdjustments = await _context.StockAdjustments
                    .AsNoTracking()
                    .Include(sa => sa.Items)
                    .Where(sa => sa.CompanyId == companyId &&
                                sa.Items.Any(i => itemIds.Contains(i.ItemId)) &&
                                sa.Date < fromDate)
                    .ToListAsync();

                var openingPurchaseReturns = await _context.PurchaseReturns
                    .AsNoTracking()
                    .Include(pr => pr.Items)
                    .Where(pr => pr.CompanyId == companyId &&
                                pr.Items.Any(i => itemIds.Contains(i.ItemId)) &&
                                pr.Date < fromDate)
                    .ToListAsync();

                var openingSalesReturns = await _context.SalesReturns
                    .AsNoTracking()
                    .Include(sr => sr.Items)
                    .Where(sr => sr.CompanyId == companyId &&
                                sr.Items.Any(i => itemIds.Contains(i.ItemId)) &&
                                sr.Date < fromDate)
                    .ToListAsync();

                // Get PERIOD transactions (BETWEEN fromDate AND toDate)
                var periodPurchaseBills = await _context.PurchaseBills
                    .AsNoTracking()
                    .Include(p => p.Items)
                    .Where(p => p.CompanyId == companyId &&
                               p.Items.Any(i => itemIds.Contains(i.ItemId)) &&
                               p.Date >= fromDate && p.Date <= toDate)
                    .ToListAsync();

                var periodSalesBills = await _context.SalesBills
                    .AsNoTracking()
                    .Include(s => s.Items)
                    .Where(s => s.CompanyId == companyId &&
                               s.Items.Any(i => itemIds.Contains(i.ItemId)) &&
                               s.Date >= fromDate && s.Date <= toDate)
                    .ToListAsync();

                var periodStockAdjustments = await _context.StockAdjustments
                    .AsNoTracking()
                    .Include(sa => sa.Items)
                    .Where(sa => sa.CompanyId == companyId &&
                                sa.Items.Any(i => itemIds.Contains(i.ItemId)) &&
                                sa.Date >= fromDate && sa.Date <= toDate)
                    .ToListAsync();

                var periodPurchaseReturns = await _context.PurchaseReturns
                    .AsNoTracking()
                    .Include(pr => pr.Items)
                    .Where(pr => pr.CompanyId == companyId &&
                                pr.Items.Any(i => itemIds.Contains(i.ItemId)) &&
                                pr.Date >= fromDate && pr.Date <= toDate)
                    .ToListAsync();

                var periodSalesReturns = await _context.SalesReturns
                    .AsNoTracking()
                    .Include(sr => sr.Items)
                    .Where(sr => sr.CompanyId == companyId &&
                                sr.Items.Any(i => itemIds.Contains(i.ItemId)) &&
                                sr.Date >= fromDate && sr.Date <= toDate)
                    .ToListAsync();

                // Create lookup maps for OPENING stock
                var openingPurchaseMap = CreateItemQuantityMap(openingPurchaseBills);
                var openingSalesMap = CreateItemQuantityMap(openingSalesBills);
                var openingAdjustmentMap = CreateAdjustmentMap(openingStockAdjustments);
                var openingPurchaseReturnMap = CreateItemQuantityMap(openingPurchaseReturns);
                var openingSalesReturnMap = CreateItemQuantityMap(openingSalesReturns);

                // Create lookup maps for PERIOD transactions
                var periodPurchaseMap = CreateItemQuantityMap(periodPurchaseBills);
                var periodSalesMap = CreateItemQuantityMap(periodSalesBills);
                var periodAdjustmentMap = CreateAdjustmentMap(periodStockAdjustments);
                var periodPurchaseReturnMap = CreateItemQuantityMap(periodPurchaseReturns);
                var periodSalesReturnMap = CreateItemQuantityMap(periodSalesReturns);

                // Get all stock entries for these items (filtered by toDate)
                var allStockEntries = await _context.StockEntries
                    .AsNoTracking()
                    .Where(se => itemIds.Contains(se.ItemId) &&
                                 se.Date <= toDate)
                    .OrderBy(se => se.Date)
                    .ToListAsync();

                // Process items
                var processedItems = new List<StockStatusItemDTO>();

                foreach (var item in items)
                {
                    var itemId = item.Id;

                    // Get OPENING stock quantities (before fromDate)
                    decimal openingPurchaseQty = openingPurchaseMap.GetValueOrDefault(itemId, 0);
                    decimal openingSalesReturnQty = openingSalesReturnMap.GetValueOrDefault(itemId, 0);
                    decimal openingSalesOutQty = openingSalesMap.GetValueOrDefault(itemId, 0);
                    decimal openingPurchaseReturnQty = openingPurchaseReturnMap.GetValueOrDefault(itemId, 0);
                    var openingAdjustments = openingAdjustmentMap.GetValueOrDefault(itemId, (In: 0m, Out: 0m));

                    // Get opening stock from InitialOpeningStock
                    decimal initialOpeningStock = 0;
                    decimal openingPurchasePrice = 0;
                    decimal openingSalesPrice = 0;

                    // Only use InitialOpeningStock if its date is on or before fromDate
                    if (item.InitialOpeningStock != null && item.InitialOpeningStock.Date <= fromDate)
                    {
                        initialOpeningStock = item.InitialOpeningStock.OpeningStock;
                        openingPurchasePrice = item.InitialOpeningStock.PurchasePrice;
                        openingSalesPrice = item.InitialOpeningStock.SalesPrice;
                    }

                    // Calculate OPENING STOCK (stock before fromDate)
                    decimal openingBalance = initialOpeningStock + openingPurchaseQty + openingSalesReturnQty + openingAdjustments.In -
                                            (openingSalesOutQty + openingPurchaseReturnQty + openingAdjustments.Out);

                    // Get PERIOD quantities (between fromDate and toDate)
                    decimal periodPurchaseQty = periodPurchaseMap.GetValueOrDefault(itemId, 0);
                    decimal periodSalesReturnQty = periodSalesReturnMap.GetValueOrDefault(itemId, 0);
                    decimal periodSalesOutQty = periodSalesMap.GetValueOrDefault(itemId, 0);
                    decimal periodPurchaseReturnQty = periodPurchaseReturnMap.GetValueOrDefault(itemId, 0);
                    var periodAdjustments = periodAdjustmentMap.GetValueOrDefault(itemId, (In: 0m, Out: 0m));

                    // Calculate TOTAL INWARD during period
                    decimal totalInward = periodPurchaseQty + periodSalesReturnQty + periodAdjustments.In;

                    // Calculate TOTAL OUTWARD during period
                    decimal totalOutward = periodSalesOutQty + periodPurchaseReturnQty + periodAdjustments.Out;

                    // Calculate CLOSING STOCK (as of toDate)
                    decimal closingStock = openingBalance + totalInward - totalOutward;

                    // Get stock entries for this item (up to toDate)
                    var itemStockEntries = allStockEntries
                        .Where(se => se.ItemId == itemId)
                        .ToList();

                    // Calculate weighted average using StockEntry
                    decimal totalStockValue = 0;
                    decimal totalStockQuantity = 0;
                    decimal totalSellingValue = 0;

                    foreach (var entry in itemStockEntries)
                    {
                        if (entry.Quantity > 0)
                        {
                            totalStockValue += entry.Quantity * entry.PuPrice;
                            totalSellingValue += entry.Quantity * entry.Price;
                            totalStockQuantity += entry.Quantity;
                        }
                    }

                    // Calculate WEIGHTED AVERAGE COST PRICE (C.P)
                    decimal avgPuPrice = totalStockQuantity > 0 ? totalStockValue / totalStockQuantity : openingPurchasePrice;

                    // Calculate WEIGHTED AVERAGE SELLING PRICE (S.P)
                    decimal avgPrice = totalStockQuantity > 0 ? totalSellingValue / totalStockQuantity : openingSalesPrice;

                    // Calculate total stock values
                    decimal totalStockValuePurchase = showPurchaseValue && closingStock > 0 ? closingStock * avgPuPrice : 0;
                    decimal totalStockValueSales = showSalesValue && closingStock > 0 ? closingStock * avgPrice : 0;

                    processedItems.Add(new StockStatusItemDTO
                    {
                        Id = item.Id,
                        Name = item.Name,
                        Code = item.UniqueNumber.ToString(),
                        Category = item.Category?.Name,
                        Unit = item.Unit?.Name,
                        MinStock = item.MinStock,
                        MaxStock = item.MaxStock,
                        OpeningStock = openingBalance,
                        TotalQtyIn = totalInward,
                        TotalQtyOut = totalOutward,
                        Stock = closingStock,
                        AvgPuPrice = avgPuPrice,
                        AvgPrice = avgPrice,
                        TotalStockValuePurchase = totalStockValuePurchase,
                        TotalStockValueSales = totalStockValueSales
                    });
                }

                // Prepare company info DTO
                var companyInfo = new CompanyInfoDTO
                {
                    Id = company.Id,
                    Name = company.Name,
                    Address = company.Address,
                    City = company.City,
                    Phone = company.Phone,
                    Pan = company.Pan,
                    RenewalDate = company.RenewalDate,
                    DateFormat = company.DateFormat.ToString(),
                    VatEnabled = company.VatEnabled
                };

                // Check if user is admin or supervisor
                bool isAdminOrSupervisor = user.IsAdmin || user.IsInRole("Supervisor");

                return new StockStatusResponseDTO
                {
                    Company = companyInfo,
                    CurrentFiscalYear = currentFiscalYear,
                    CurrentCompany = companyInfo,
                    CurrentCompanyName = company.Name,
                    CompanyDateFormat = dateFormat,
                    Items = processedItems,
                    Pagination = new PaginationDTO
                    {
                        Current = page,
                        Pages = (int)Math.Ceiling((double)totalItems / limit),
                        Total = totalItems
                    },
                    IsAdminOrSupervisor = isAdminOrSupervisor,
                    FromDate = fromDate,
                    ToDate = toDate
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetStockStatusAsync for company {CompanyId}, fiscal year {FiscalYearId}", companyId, fiscalYearId);
                throw;
            }
        }
        private Dictionary<Guid, decimal> CreateItemQuantityMap(List<PurchaseBill> bills)
        {
            var map = new Dictionary<Guid, decimal>();

            foreach (var bill in bills)
            {
                if (bill.Items == null) continue;

                foreach (var billItem in bill.Items)
                {
                    if (!map.ContainsKey(billItem.ItemId))
                        map[billItem.ItemId] = 0;

                    decimal quantity = billItem.AltQuantity ?? billItem.Quantity;
                    decimal bonus = billItem.AltBonus ?? billItem.Bonus ?? 0;

                    map[billItem.ItemId] += quantity + bonus;
                }
            }

            return map;
        }

        private Dictionary<Guid, decimal> CreateItemQuantityMap(List<SalesBill> bills)
        {
            var map = new Dictionary<Guid, decimal>();

            foreach (var bill in bills)
            {
                if (bill.Items == null) continue;

                foreach (var billItem in bill.Items)
                {
                    if (!map.ContainsKey(billItem.ItemId))
                        map[billItem.ItemId] = 0;

                    map[billItem.ItemId] += billItem.Quantity;
                }
            }

            return map;
        }

        private Dictionary<Guid, decimal> CreateItemQuantityMap(List<PurchaseReturn> bills)
        {
            var map = new Dictionary<Guid, decimal>();

            foreach (var bill in bills)
            {
                if (bill.Items == null) continue;

                foreach (var billItem in bill.Items)
                {
                    if (!map.ContainsKey(billItem.ItemId))
                        map[billItem.ItemId] = 0;

                    decimal quantity = billItem.AltQuantity ?? billItem.Quantity ?? 0;

                    map[billItem.ItemId] += quantity;
                }
            }

            return map;
        }

        private Dictionary<Guid, decimal> CreateItemQuantityMap(List<SalesReturn> bills)
        {
            var map = new Dictionary<Guid, decimal>();

            foreach (var bill in bills)
            {
                if (bill.Items == null) continue;

                foreach (var billItem in bill.Items)
                {
                    if (!map.ContainsKey(billItem.ItemId))
                        map[billItem.ItemId] = 0;

                    map[billItem.ItemId] += billItem.Quantity;
                }
            }

            return map;
        }

        private Dictionary<Guid, (decimal In, decimal Out)> CreateAdjustmentMap(List<StockAdjustment> adjustments)
        {
            var map = new Dictionary<Guid, (decimal In, decimal Out)>();

            foreach (var adj in adjustments)
            {
                if (adj.Items == null) continue;

                foreach (var adjItem in adj.Items)
                {
                    if (!map.ContainsKey(adjItem.ItemId))
                        map[adjItem.ItemId] = (0, 0);

                    if (adj.AdjustmentType == "xcess")
                    {
                        var current = map[adjItem.ItemId];
                        map[adjItem.ItemId] = (current.In + adjItem.Quantity, current.Out);
                    }
                    else if (adj.AdjustmentType == "short")
                    {
                        var current = map[adjItem.ItemId];
                        map[adjItem.ItemId] = (current.In, current.Out + adjItem.Quantity);
                    }
                }
            }

            return map;
        }
    }
}