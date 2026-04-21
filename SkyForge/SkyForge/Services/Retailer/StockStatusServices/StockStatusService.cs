
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
            DateTime asOnDate,
            bool isNepaliFormat)
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
                    .Include(i => i.OpeningStocksByFiscalYear)
                    .Include(i => i.StockEntries)
                    .Where(i => i.CompanyId == companyId && i.FiscalYearId == fiscalYearId && i.Status == "active");

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
                        AsOnDate = asOnDate
                    };
                }

                // Get all item IDs for batch queries
                var itemIds = items.Select(i => i.Id).ToList();

                // Execute queries sequentially to avoid DbContext concurrency issues
                // Using AsNoTracking() for read-only queries to improve performance
                // Apply date filter based on company format
                var purchaseBills = await _context.PurchaseBills
                    .AsNoTracking()
                    .Include(p => p.Items)
                    .Where(p => p.CompanyId == companyId &&
                               p.FiscalYearId == fiscalYearId &&
                               p.Items.Any(i => itemIds.Contains(i.ItemId)) &&
                               (isNepaliFormat ? p.nepaliDate <= asOnDate : p.Date <= asOnDate))
                    .ToListAsync();

                var salesBills = await _context.SalesBills
                    .AsNoTracking()
                    .Include(s => s.Items)
                    .Where(s => s.CompanyId == companyId &&
                               s.FiscalYearId == fiscalYearId &&
                               s.Items.Any(i => itemIds.Contains(i.ItemId)) &&
                               (isNepaliFormat ? s.nepaliDate <= asOnDate : s.Date <= asOnDate))
                    .ToListAsync();

                var stockAdjustments = await _context.StockAdjustments
                    .AsNoTracking()
                    .Include(sa => sa.Items)
                    .Where(sa => sa.CompanyId == companyId &&
                                sa.FiscalYearId == fiscalYearId &&
                                sa.Items.Any(i => itemIds.Contains(i.ItemId)) &&
                                (isNepaliFormat ? sa.NepaliDate <= asOnDate : sa.Date <= asOnDate))
                    .ToListAsync();

                var purchaseReturns = await _context.PurchaseReturns
                    .AsNoTracking()
                    .Include(pr => pr.Items)
                    .Where(pr => pr.CompanyId == companyId &&
                                pr.FiscalYearId == fiscalYearId &&
                                pr.Items.Any(i => itemIds.Contains(i.ItemId)) &&
                                (isNepaliFormat ? pr.nepaliDate <= asOnDate : pr.Date <= asOnDate))
                    .ToListAsync();

                var salesReturns = await _context.SalesReturns
                    .AsNoTracking()
                    .Include(sr => sr.Items)
                    .Where(sr => sr.CompanyId == companyId &&
                                sr.FiscalYearId == fiscalYearId &&
                                sr.Items.Any(i => itemIds.Contains(i.ItemId)) &&
                                (isNepaliFormat ? sr.nepaliDate <= asOnDate : sr.Date <= asOnDate))
                    .ToListAsync();

                // Create lookup maps
                var purchaseMap = CreateItemQuantityMap(purchaseBills);
                var salesMap = CreateItemQuantityMap(salesBills);
                var adjustmentMap = CreateAdjustmentMap(stockAdjustments);
                var purchaseReturnMap = CreateItemQuantityMap(purchaseReturns);
                var salesReturnMap = CreateItemQuantityMap(salesReturns);

                // Process items
                var processedItems = new List<StockStatusItemDTO>();

                foreach (var item in items)
                {
                    var itemId = item.Id;

                    // Get quantities from maps
                    decimal totalQtyIn = purchaseMap.GetValueOrDefault(itemId, 0);
                    decimal totalSalesReturn = salesReturnMap.GetValueOrDefault(itemId, 0);
                    decimal totalSalesOut = salesMap.GetValueOrDefault(itemId, 0);
                    decimal totalPurchaseReturn = purchaseReturnMap.GetValueOrDefault(itemId, 0);

                    var adjustments = adjustmentMap.GetValueOrDefault(itemId, (In: 0m, Out: 0m));

                    // Get opening stock data from OpeningStocksByFiscalYear
                    var openingStockData = item.OpeningStocksByFiscalYear?
                        .FirstOrDefault(os => os.FiscalYearId == fiscalYearId);

                    decimal openingStock = openingStockData?.OpeningStock ?? 0;
                    decimal openingPurchasePrice = openingStockData?.PurchasePrice ?? 0;
                    decimal openingSalesPrice = openingStockData?.SalesPrice ?? 0;

                    // Calculate total stock
                    decimal totalStock = openingStock + totalQtyIn + totalSalesReturn + adjustments.In -
                                        (totalSalesOut + totalPurchaseReturn + adjustments.Out);

                    // Calculate stock value using FIFO method
                    decimal totalStockValuePurchase = CalculateFifoStockValue(item, totalStock, openingStock, openingPurchasePrice, purchaseBills);

                    // Calculate average sales price
                    decimal avgPrice = CalculateAverageSalesPrice(item, openingStock, openingSalesPrice);

                    // Calculate average purchase price
                    decimal avgPuPrice = totalStock > 0 ? totalStockValuePurchase / totalStock : 0;

                    processedItems.Add(new StockStatusItemDTO
                    {
                        Id = item.Id,
                        Name = item.Name,
                        Code = item.UniqueNumber.ToString(),
                        Category = item.Category?.Name,
                        Unit = item.Unit?.Name,
                        MinStock = item.MinStock,
                        MaxStock = item.MaxStock,
                        OpeningStock = openingStock,
                        TotalQtyIn = totalQtyIn + totalSalesReturn + adjustments.In,
                        TotalQtyOut = totalSalesOut + totalPurchaseReturn + adjustments.Out,
                        Stock = totalStock,
                        AvgPuPrice = avgPuPrice,
                        AvgPrice = avgPrice,
                        TotalStockValuePurchase = totalStockValuePurchase,
                        TotalStockValueSales = totalStock * avgPrice
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
                    AsOnDate = asOnDate
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

        private decimal CalculateFifoStockValue(Item item, decimal totalStock, decimal openingStock,
                                                 decimal openingPurchasePrice, List<PurchaseBill> purchaseBills)
        {
            decimal totalStockValuePurchase = 0;
            decimal remainingStock = totalStock;

            // Sort stock entries by date (FIFO)
            if (item.StockEntries != null && item.StockEntries.Any())
            {
                var sortedEntries = item.StockEntries.OrderBy(e => e.Date).ToList();

                foreach (var entry in sortedEntries)
                {
                    if (remainingStock <= 0) break;

                    decimal entryQuantity = entry.Quantity;
                    decimal entryPuPrice = entry.PuPrice;

                    if (entryQuantity > 0)
                    {
                        decimal quantityToUse = Math.Min(remainingStock, entryQuantity);
                        totalStockValuePurchase += quantityToUse * entryPuPrice;
                        remainingStock -= quantityToUse;
                    }
                }
            }

            // Use opening stock price for remaining quantity
            if (remainingStock > 0 && openingStock > 0)
            {
                totalStockValuePurchase += remainingStock * openingPurchasePrice;
                remainingStock = 0;
            }

            // Use average purchase price from purchases
            if (remainingStock > 0)
            {
                decimal totalPurchaseValue = 0;
                decimal totalPurchaseQuantity = 0;

                foreach (var bill in purchaseBills)
                {
                    if (bill.Items == null) continue;

                    foreach (var billItem in bill.Items)
                    {
                        if (billItem.ItemId == item.Id)
                        {
                            decimal puPrice = billItem.AltPuPrice ?? billItem.PuPrice;
                            decimal quantity = billItem.AltQuantity ?? billItem.Quantity;
                            decimal bonus = billItem.AltBonus ?? billItem.Bonus ?? 0;
                            decimal totalQuantity = quantity + bonus;

                            totalPurchaseValue += totalQuantity * puPrice;
                            totalPurchaseQuantity += totalQuantity;
                        }
                    }
                }

                decimal avgPuPrice = totalPurchaseQuantity > 0 ? totalPurchaseValue / totalPurchaseQuantity : 0;
                totalStockValuePurchase += remainingStock * avgPuPrice;
            }

            return totalStockValuePurchase;
        }

        private decimal CalculateAverageSalesPrice(Item item, decimal openingStock, decimal openingSalesPrice)
        {
            decimal avgPrice = openingSalesPrice;

            if (item.StockEntries != null && item.StockEntries.Any())
            {
                decimal totalSalesValue = 0;
                decimal totalQuantity = 0;

                foreach (var entry in item.StockEntries)
                {
                    if (entry.Quantity > 0)
                    {
                        totalSalesValue += entry.Price * entry.Quantity;
                        totalQuantity += entry.Quantity;
                    }
                }

                if (totalQuantity > 0)
                {
                    avgPrice = (openingSalesPrice * openingStock + totalSalesValue) /
                               (openingStock + totalQuantity);
                }
            }

            return avgPrice;
        }
    }
}