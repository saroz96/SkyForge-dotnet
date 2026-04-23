
// using Microsoft.EntityFrameworkCore;
// using SkyForge.Data;
// using SkyForge.Dto.RetailerDto;
// using SkyForge.Models.CompanyModel;
// using SkyForge.Models.FiscalYearModel;
// using SkyForge.Models.Retailer.Items;
// using SkyForge.Models.Retailer.Purchase;
// using SkyForge.Models.Retailer.PurchaseReturnModel;
// using SkyForge.Models.Retailer.Sales;
// using SkyForge.Models.Retailer.SalesReturnModel;
// using SkyForge.Models.Retailer.StockAdjustmentModel;
// using SkyForge.Models.UserModel;
// using SkyForge.Models.RoleModel;

// namespace SkyForge.Services.Retailer.StockStatusServices
// {
//     public class StockStatusService : IStockStatusService
//     {
//         private readonly ApplicationDbContext _context;
//         private readonly ILogger<StockStatusService> _logger;

//         public StockStatusService(
//             ApplicationDbContext context,
//             ILogger<StockStatusService> logger)
//         {
//             _context = context;
//             _logger = logger;
//         }

//         public async Task<StockStatusResponseDTO> GetStockStatusAsync(
//             Guid companyId,
//             Guid fiscalYearId,
//             Company company,
//             string dateFormat,
//             int limit,
//             int page,
//             string search,
//             bool showPurchaseValue,
//             bool showSalesValue,
//             User user,
//             DateTime asOnDate,
//             bool isNepaliFormat)
//         {
//             try
//             {
//                 // Get current fiscal year
//                 var currentFiscalYear = await _context.FiscalYears
//                     .AsNoTracking()
//                     .Where(f => f.Id == fiscalYearId && f.CompanyId == companyId)
//                     .Select(f => new FiscalYearDTO
//                     {
//                         Id = f.Id,
//                         Name = f.Name,
//                         StartDate = f.StartDate,
//                         EndDate = f.EndDate,
//                         StartDateNepali = f.StartDateNepali,
//                         EndDateNepali = f.EndDateNepali,
//                         IsActive = f.IsActive,
//                     })
//                     .FirstOrDefaultAsync();

//                 if (currentFiscalYear == null)
//                 {
//                     throw new ArgumentException("No fiscal year found in session or company.");
//                 }

//                 // Build base query with search filter
//                 var itemQuery = _context.Items
//                     .AsNoTracking()
//                     .Include(i => i.Category)
//                     .Include(i => i.Unit)
//                     .Include(i => i.OpeningStocksByFiscalYear)
//                     .Include(i => i.StockEntries)
//                     .Where(i => i.CompanyId == companyId && i.FiscalYearId == fiscalYearId && i.Status == "active");

//                 // Apply search filter
//                 if (!string.IsNullOrEmpty(search))
//                 {
//                     if (int.TryParse(search, out int searchNumber))
//                     {
//                         itemQuery = itemQuery.Where(i =>
//                             i.Name.Contains(search) ||
//                             i.UniqueNumber == searchNumber);
//                     }
//                     else
//                     {
//                         itemQuery = itemQuery.Where(i =>
//                             i.Name.Contains(search));
//                     }
//                 }

//                 // Get total count for pagination
//                 int totalItems = await itemQuery.CountAsync();

//                 // Get items with pagination
//                 var items = await itemQuery
//                     .Skip((page - 1) * limit)
//                     .Take(limit)
//                     .ToListAsync();

//                 // If no items found, return empty response
//                 if (!items.Any())
//                 {
//                     var emptyCompanyInfo = new CompanyInfoDTO
//                     {
//                         Id = company.Id,
//                         Name = company.Name,
//                         Address = company.Address,
//                         City = company.City,
//                         Phone = company.Phone,
//                         Pan = company.Pan,
//                         RenewalDate = company.RenewalDate,
//                         DateFormat = company.DateFormat.ToString(),
//                         VatEnabled = company.VatEnabled
//                     };

//                     return new StockStatusResponseDTO
//                     {
//                         Company = emptyCompanyInfo,
//                         CurrentFiscalYear = currentFiscalYear,
//                         CurrentCompany = emptyCompanyInfo,
//                         CurrentCompanyName = company.Name,
//                         CompanyDateFormat = dateFormat,
//                         Items = new List<StockStatusItemDTO>(),
//                         Pagination = new PaginationDTO
//                         {
//                             Current = page,
//                             Pages = 0,
//                             Total = 0
//                         },
//                         IsAdminOrSupervisor = user.IsAdmin || user.IsInRole("Supervisor"),
//                         AsOnDate = asOnDate
//                     };
//                 }

//                 // Get all item IDs for batch queries
//                 var itemIds = items.Select(i => i.Id).ToList();

//                 // Execute queries sequentially to avoid DbContext concurrency issues
//                 // Using AsNoTracking() for read-only queries to improve performance
//                 // Apply date filter based on company format
//                 var purchaseBills = await _context.PurchaseBills
//                     .AsNoTracking()
//                     .Include(p => p.Items)
//                     .Where(p => p.CompanyId == companyId &&
//                                p.FiscalYearId == fiscalYearId &&
//                                p.Items.Any(i => itemIds.Contains(i.ItemId)) &&
//                                (isNepaliFormat ? p.nepaliDate <= asOnDate : p.Date <= asOnDate))
//                     .ToListAsync();

//                 var salesBills = await _context.SalesBills
//                     .AsNoTracking()
//                     .Include(s => s.Items)
//                     .Where(s => s.CompanyId == companyId &&
//                                s.FiscalYearId == fiscalYearId &&
//                                s.Items.Any(i => itemIds.Contains(i.ItemId)) &&
//                                (isNepaliFormat ? s.nepaliDate <= asOnDate : s.Date <= asOnDate))
//                     .ToListAsync();

//                 var stockAdjustments = await _context.StockAdjustments
//                     .AsNoTracking()
//                     .Include(sa => sa.Items)
//                     .Where(sa => sa.CompanyId == companyId &&
//                                 sa.FiscalYearId == fiscalYearId &&
//                                 sa.Items.Any(i => itemIds.Contains(i.ItemId)) &&
//                                 (isNepaliFormat ? sa.NepaliDate <= asOnDate : sa.Date <= asOnDate))
//                     .ToListAsync();

//                 var purchaseReturns = await _context.PurchaseReturns
//                     .AsNoTracking()
//                     .Include(pr => pr.Items)
//                     .Where(pr => pr.CompanyId == companyId &&
//                                 pr.FiscalYearId == fiscalYearId &&
//                                 pr.Items.Any(i => itemIds.Contains(i.ItemId)) &&
//                                 (isNepaliFormat ? pr.nepaliDate <= asOnDate : pr.Date <= asOnDate))
//                     .ToListAsync();

//                 var salesReturns = await _context.SalesReturns
//                     .AsNoTracking()
//                     .Include(sr => sr.Items)
//                     .Where(sr => sr.CompanyId == companyId &&
//                                 sr.FiscalYearId == fiscalYearId &&
//                                 sr.Items.Any(i => itemIds.Contains(i.ItemId)) &&
//                                 (isNepaliFormat ? sr.nepaliDate <= asOnDate : sr.Date <= asOnDate))
//                     .ToListAsync();

//                 // Create lookup maps
//                 var purchaseMap = CreateItemQuantityMap(purchaseBills);
//                 var salesMap = CreateItemQuantityMap(salesBills);
//                 var adjustmentMap = CreateAdjustmentMap(stockAdjustments);
//                 var purchaseReturnMap = CreateItemQuantityMap(purchaseReturns);
//                 var salesReturnMap = CreateItemQuantityMap(salesReturns);

//                 // Process items
//                 var processedItems = new List<StockStatusItemDTO>();

//                 foreach (var item in items)
//                 {
//                     var itemId = item.Id;

//                     // Get quantities from maps
//                     decimal totalQtyIn = purchaseMap.GetValueOrDefault(itemId, 0);
//                     decimal totalSalesReturn = salesReturnMap.GetValueOrDefault(itemId, 0);
//                     decimal totalSalesOut = salesMap.GetValueOrDefault(itemId, 0);
//                     decimal totalPurchaseReturn = purchaseReturnMap.GetValueOrDefault(itemId, 0);

//                     var adjustments = adjustmentMap.GetValueOrDefault(itemId, (In: 0m, Out: 0m));

//                     // Get opening stock data from OpeningStocksByFiscalYear
//                     var openingStockData = item.OpeningStocksByFiscalYear?
//                         .FirstOrDefault(os => os.FiscalYearId == fiscalYearId);

//                     decimal openingStock = openingStockData?.OpeningStock ?? 0;
//                     decimal openingPurchasePrice = openingStockData?.PurchasePrice ?? 0;
//                     decimal openingSalesPrice = openingStockData?.SalesPrice ?? 0;

//                     // Calculate total stock
//                     decimal totalStock = openingStock + totalQtyIn + totalSalesReturn + adjustments.In -
//                                         (totalSalesOut + totalPurchaseReturn + adjustments.Out);

//                     // Calculate stock value using FIFO method
//                     decimal totalStockValuePurchase = CalculateFifoStockValue(item, totalStock, openingStock, openingPurchasePrice, purchaseBills);

//                     // Calculate average sales price
//                     decimal avgPrice = CalculateAverageSalesPrice(item, openingStock, openingSalesPrice);

//                     // Calculate average purchase price
//                     decimal avgPuPrice = totalStock > 0 ? totalStockValuePurchase / totalStock : 0;

//                     processedItems.Add(new StockStatusItemDTO
//                     {
//                         Id = item.Id,
//                         Name = item.Name,
//                         Code = item.UniqueNumber.ToString(),
//                         Category = item.Category?.Name,
//                         Unit = item.Unit?.Name,
//                         MinStock = item.MinStock,
//                         MaxStock = item.MaxStock,
//                         OpeningStock = openingStock,
//                         TotalQtyIn = totalQtyIn + totalSalesReturn + adjustments.In,
//                         TotalQtyOut = totalSalesOut + totalPurchaseReturn + adjustments.Out,
//                         Stock = totalStock,
//                         AvgPuPrice = avgPuPrice,
//                         AvgPrice = avgPrice,
//                         TotalStockValuePurchase = totalStockValuePurchase,
//                         TotalStockValueSales = totalStock * avgPrice
//                     });
//                 }

//                 // Prepare company info DTO
//                 var companyInfo = new CompanyInfoDTO
//                 {
//                     Id = company.Id,
//                     Name = company.Name,
//                     Address = company.Address,
//                     City = company.City,
//                     Phone = company.Phone,
//                     Pan = company.Pan,
//                     RenewalDate = company.RenewalDate,
//                     DateFormat = company.DateFormat.ToString(),
//                     VatEnabled = company.VatEnabled
//                 };

//                 // Check if user is admin or supervisor
//                 bool isAdminOrSupervisor = user.IsAdmin || user.IsInRole("Supervisor");

//                 return new StockStatusResponseDTO
//                 {
//                     Company = companyInfo,
//                     CurrentFiscalYear = currentFiscalYear,
//                     CurrentCompany = companyInfo,
//                     CurrentCompanyName = company.Name,
//                     CompanyDateFormat = dateFormat,
//                     Items = processedItems,
//                     Pagination = new PaginationDTO
//                     {
//                         Current = page,
//                         Pages = (int)Math.Ceiling((double)totalItems / limit),
//                         Total = totalItems
//                     },
//                     IsAdminOrSupervisor = isAdminOrSupervisor,
//                     AsOnDate = asOnDate
//                 };
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error in GetStockStatusAsync for company {CompanyId}, fiscal year {FiscalYearId}", companyId, fiscalYearId);
//                 throw;
//             }
//         }

//         private Dictionary<Guid, decimal> CreateItemQuantityMap(List<PurchaseBill> bills)
//         {
//             var map = new Dictionary<Guid, decimal>();

//             foreach (var bill in bills)
//             {
//                 if (bill.Items == null) continue;

//                 foreach (var billItem in bill.Items)
//                 {
//                     if (!map.ContainsKey(billItem.ItemId))
//                         map[billItem.ItemId] = 0;

//                     decimal quantity = billItem.AltQuantity ?? billItem.Quantity;
//                     decimal bonus = billItem.AltBonus ?? billItem.Bonus ?? 0;

//                     map[billItem.ItemId] += quantity + bonus;
//                 }
//             }

//             return map;
//         }

//         private Dictionary<Guid, decimal> CreateItemQuantityMap(List<SalesBill> bills)
//         {
//             var map = new Dictionary<Guid, decimal>();

//             foreach (var bill in bills)
//             {
//                 if (bill.Items == null) continue;

//                 foreach (var billItem in bill.Items)
//                 {
//                     if (!map.ContainsKey(billItem.ItemId))
//                         map[billItem.ItemId] = 0;

//                     map[billItem.ItemId] += billItem.Quantity;
//                 }
//             }

//             return map;
//         }

//         private Dictionary<Guid, decimal> CreateItemQuantityMap(List<PurchaseReturn> bills)
//         {
//             var map = new Dictionary<Guid, decimal>();

//             foreach (var bill in bills)
//             {
//                 if (bill.Items == null) continue;

//                 foreach (var billItem in bill.Items)
//                 {
//                     if (!map.ContainsKey(billItem.ItemId))
//                         map[billItem.ItemId] = 0;

//                     decimal quantity = billItem.AltQuantity ?? billItem.Quantity ?? 0;

//                     map[billItem.ItemId] += quantity;
//                 }
//             }

//             return map;
//         }

//         private Dictionary<Guid, decimal> CreateItemQuantityMap(List<SalesReturn> bills)
//         {
//             var map = new Dictionary<Guid, decimal>();

//             foreach (var bill in bills)
//             {
//                 if (bill.Items == null) continue;

//                 foreach (var billItem in bill.Items)
//                 {
//                     if (!map.ContainsKey(billItem.ItemId))
//                         map[billItem.ItemId] = 0;

//                     map[billItem.ItemId] += billItem.Quantity;
//                 }
//             }

//             return map;
//         }

//         private Dictionary<Guid, (decimal In, decimal Out)> CreateAdjustmentMap(List<StockAdjustment> adjustments)
//         {
//             var map = new Dictionary<Guid, (decimal In, decimal Out)>();

//             foreach (var adj in adjustments)
//             {
//                 if (adj.Items == null) continue;

//                 foreach (var adjItem in adj.Items)
//                 {
//                     if (!map.ContainsKey(adjItem.ItemId))
//                         map[adjItem.ItemId] = (0, 0);

//                     if (adj.AdjustmentType == "xcess")
//                     {
//                         var current = map[adjItem.ItemId];
//                         map[adjItem.ItemId] = (current.In + adjItem.Quantity, current.Out);
//                     }
//                     else if (adj.AdjustmentType == "short")
//                     {
//                         var current = map[adjItem.ItemId];
//                         map[adjItem.ItemId] = (current.In, current.Out + adjItem.Quantity);
//                     }
//                 }
//             }

//             return map;
//         }

//         private decimal CalculateFifoStockValue(Item item, decimal totalStock, decimal openingStock,
//                                                  decimal openingPurchasePrice, List<PurchaseBill> purchaseBills)
//         {
//             decimal totalStockValuePurchase = 0;
//             decimal remainingStock = totalStock;

//             // Sort stock entries by date (FIFO)
//             if (item.StockEntries != null && item.StockEntries.Any())
//             {
//                 var sortedEntries = item.StockEntries.OrderBy(e => e.Date).ToList();

//                 foreach (var entry in sortedEntries)
//                 {
//                     if (remainingStock <= 0) break;

//                     decimal entryQuantity = entry.Quantity;
//                     decimal entryPuPrice = entry.PuPrice;

//                     if (entryQuantity > 0)
//                     {
//                         decimal quantityToUse = Math.Min(remainingStock, entryQuantity);
//                         totalStockValuePurchase += quantityToUse * entryPuPrice;
//                         remainingStock -= quantityToUse;
//                     }
//                 }
//             }

//             // Use opening stock price for remaining quantity
//             if (remainingStock > 0 && openingStock > 0)
//             {
//                 totalStockValuePurchase += remainingStock * openingPurchasePrice;
//                 remainingStock = 0;
//             }

//             // Use average purchase price from purchases
//             if (remainingStock > 0)
//             {
//                 decimal totalPurchaseValue = 0;
//                 decimal totalPurchaseQuantity = 0;

//                 foreach (var bill in purchaseBills)
//                 {
//                     if (bill.Items == null) continue;

//                     foreach (var billItem in bill.Items)
//                     {
//                         if (billItem.ItemId == item.Id)
//                         {
//                             decimal puPrice = billItem.AltPuPrice ?? billItem.PuPrice;
//                             decimal quantity = billItem.AltQuantity ?? billItem.Quantity;
//                             decimal bonus = billItem.AltBonus ?? billItem.Bonus ?? 0;
//                             decimal totalQuantity = quantity + bonus;

//                             totalPurchaseValue += totalQuantity * puPrice;
//                             totalPurchaseQuantity += totalQuantity;
//                         }
//                     }
//                 }

//                 decimal avgPuPrice = totalPurchaseQuantity > 0 ? totalPurchaseValue / totalPurchaseQuantity : 0;
//                 totalStockValuePurchase += remainingStock * avgPuPrice;
//             }

//             return totalStockValuePurchase;
//         }

//         private decimal CalculateAverageSalesPrice(Item item, decimal openingStock, decimal openingSalesPrice)
//         {
//             decimal avgPrice = openingSalesPrice;

//             if (item.StockEntries != null && item.StockEntries.Any())
//             {
//                 decimal totalSalesValue = 0;
//                 decimal totalQuantity = 0;

//                 foreach (var entry in item.StockEntries)
//                 {
//                     if (entry.Quantity > 0)
//                     {
//                         totalSalesValue += entry.Price * entry.Quantity;
//                         totalQuantity += entry.Quantity;
//                     }
//                 }

//                 if (totalQuantity > 0)
//                 {
//                     avgPrice = (openingSalesPrice * openingStock + totalSalesValue) /
//                                (openingStock + totalQuantity);
//                 }
//             }

//             return avgPrice;
//         }
//     }
// }

//----------------------------------------------------------------end


// using Microsoft.EntityFrameworkCore;
// using SkyForge.Data;
// using SkyForge.Dto.RetailerDto;
// using SkyForge.Models.CompanyModel;
// using SkyForge.Models.FiscalYearModel;
// using SkyForge.Models.Retailer.Items;
// using SkyForge.Models.Retailer.Purchase;
// using SkyForge.Models.Retailer.PurchaseReturnModel;
// using SkyForge.Models.Retailer.Sales;
// using SkyForge.Models.Retailer.SalesReturnModel;
// using SkyForge.Models.Retailer.StockAdjustmentModel;
// using SkyForge.Models.UserModel;
// using SkyForge.Models.RoleModel;

// namespace SkyForge.Services.Retailer.StockStatusServices
// {
//     public class StockStatusService : IStockStatusService
//     {
//         private readonly ApplicationDbContext _context;
//         private readonly ILogger<StockStatusService> _logger;

//         public StockStatusService(
//             ApplicationDbContext context,
//             ILogger<StockStatusService> logger)
//         {
//             _context = context;
//             _logger = logger;
//         }

//         public async Task<StockStatusResponseDTO> GetStockStatusAsync(
//             Guid companyId,
//             Guid fiscalYearId,
//             Company company,
//             string dateFormat,
//             int limit,
//             int page,
//             string search,
//             bool showPurchaseValue,
//             bool showSalesValue,
//             User user,
//             DateTime fromDate,
//             DateTime toDate,
//             bool isNepaliFormat)
//         {
//             try
//             {
//                 // Get current fiscal year
//                 var currentFiscalYear = await _context.FiscalYears
//                     .AsNoTracking()
//                     .Where(f => f.Id == fiscalYearId && f.CompanyId == companyId)
//                     .Select(f => new FiscalYearDTO
//                     {
//                         Id = f.Id,
//                         Name = f.Name,
//                         StartDate = f.StartDate,
//                         EndDate = f.EndDate,
//                         StartDateNepali = f.StartDateNepali,
//                         EndDateNepali = f.EndDateNepali,
//                         IsActive = f.IsActive,
//                     })
//                     .FirstOrDefaultAsync();

//                 if (currentFiscalYear == null)
//                 {
//                     throw new ArgumentException("No fiscal year found in session or company.");
//                 }

//                 // Build base query with search filter
//                 var itemQuery = _context.Items
//                     .AsNoTracking()
//                     .Include(i => i.Category)
//                     .Include(i => i.Unit)
//                     .Include(i => i.InitialOpeningStock)
//                     .Include(i => i.StockEntries)
//                     .Where(i => i.CompanyId == companyId && i.FiscalYearId == fiscalYearId && i.Status == "active");

//                 // Apply search filter
//                 if (!string.IsNullOrEmpty(search))
//                 {
//                     if (int.TryParse(search, out int searchNumber))
//                     {
//                         itemQuery = itemQuery.Where(i =>
//                             i.Name.Contains(search) ||
//                             i.UniqueNumber == searchNumber);
//                     }
//                     else
//                     {
//                         itemQuery = itemQuery.Where(i =>
//                             i.Name.Contains(search));
//                     }
//                 }

//                 // Get total count for pagination
//                 int totalItems = await itemQuery.CountAsync();

//                 // Get items with pagination
//                 var items = await itemQuery
//                     .Skip((page - 1) * limit)
//                     .Take(limit)
//                     .ToListAsync();

//                 // If no items found, return empty response
//                 if (!items.Any())
//                 {
//                     var emptyCompanyInfo = new CompanyInfoDTO
//                     {
//                         Id = company.Id,
//                         Name = company.Name,
//                         Address = company.Address,
//                         City = company.City,
//                         Phone = company.Phone,
//                         Pan = company.Pan,
//                         RenewalDate = company.RenewalDate,
//                         DateFormat = company.DateFormat.ToString(),
//                         VatEnabled = company.VatEnabled
//                     };

//                     return new StockStatusResponseDTO
//                     {
//                         Company = emptyCompanyInfo,
//                         CurrentFiscalYear = currentFiscalYear,
//                         CurrentCompany = emptyCompanyInfo,
//                         CurrentCompanyName = company.Name,
//                         CompanyDateFormat = dateFormat,
//                         Items = new List<StockStatusItemDTO>(),
//                         Pagination = new PaginationDTO
//                         {
//                             Current = page,
//                             Pages = 0,
//                             Total = 0
//                         },
//                         IsAdminOrSupervisor = user.IsAdmin || user.IsInRole("Supervisor"),
//                         FromDate = fromDate,
//                         ToDate = toDate
//                     };
//                 }

//                 // Get all item IDs for batch queries
//                 var itemIds = items.Select(i => i.Id).ToList();

//                 // Get OPENING STOCK transactions (BEFORE fromDate) for quantity calculation
//                 var openingPurchaseBills = await _context.PurchaseBills
//                     .AsNoTracking()
//                     .Include(p => p.Items)
//                     .Where(p => p.CompanyId == companyId &&
//                                p.FiscalYearId == fiscalYearId &&
//                                p.Items.Any(i => itemIds.Contains(i.ItemId)) &&
//                                (isNepaliFormat ? p.nepaliDate < fromDate : p.Date < fromDate))
//                     .ToListAsync();

//                 var openingSalesBills = await _context.SalesBills
//                     .AsNoTracking()
//                     .Include(s => s.Items)
//                     .Where(s => s.CompanyId == companyId &&
//                                s.FiscalYearId == fiscalYearId &&
//                                s.Items.Any(i => itemIds.Contains(i.ItemId)) &&
//                                (isNepaliFormat ? s.nepaliDate < fromDate : s.Date < fromDate))
//                     .ToListAsync();

//                 var openingStockAdjustments = await _context.StockAdjustments
//                     .AsNoTracking()
//                     .Include(sa => sa.Items)
//                     .Where(sa => sa.CompanyId == companyId &&
//                                 sa.FiscalYearId == fiscalYearId &&
//                                 sa.Items.Any(i => itemIds.Contains(i.ItemId)) &&
//                                 (isNepaliFormat ? sa.NepaliDate < fromDate : sa.Date < fromDate))
//                     .ToListAsync();

//                 var openingPurchaseReturns = await _context.PurchaseReturns
//                     .AsNoTracking()
//                     .Include(pr => pr.Items)
//                     .Where(pr => pr.CompanyId == companyId &&
//                                 pr.FiscalYearId == fiscalYearId &&
//                                 pr.Items.Any(i => itemIds.Contains(i.ItemId)) &&
//                                 (isNepaliFormat ? pr.nepaliDate < fromDate : pr.Date < fromDate))
//                     .ToListAsync();

//                 var openingSalesReturns = await _context.SalesReturns
//                     .AsNoTracking()
//                     .Include(sr => sr.Items)
//                     .Where(sr => sr.CompanyId == companyId &&
//                                 sr.FiscalYearId == fiscalYearId &&
//                                 sr.Items.Any(i => itemIds.Contains(i.ItemId)) &&
//                                 (isNepaliFormat ? sr.nepaliDate < fromDate : sr.Date < fromDate))
//                     .ToListAsync();

//                 // Get PERIOD transactions (BETWEEN fromDate AND toDate)
//                 var periodPurchaseBills = await _context.PurchaseBills
//                     .AsNoTracking()
//                     .Include(p => p.Items)
//                     .Where(p => p.CompanyId == companyId &&
//                                p.FiscalYearId == fiscalYearId &&
//                                p.Items.Any(i => itemIds.Contains(i.ItemId)) &&
//                                (isNepaliFormat ? (p.nepaliDate >= fromDate && p.nepaliDate <= toDate) : (p.Date >= fromDate && p.Date <= toDate)))
//                     .ToListAsync();

//                 var periodSalesBills = await _context.SalesBills
//                     .AsNoTracking()
//                     .Include(s => s.Items)
//                     .Where(s => s.CompanyId == companyId &&
//                                s.FiscalYearId == fiscalYearId &&
//                                s.Items.Any(i => itemIds.Contains(i.ItemId)) &&
//                                (isNepaliFormat ? (s.nepaliDate >= fromDate && s.nepaliDate <= toDate) : (s.Date >= fromDate && s.Date <= toDate)))
//                     .ToListAsync();

//                 var periodStockAdjustments = await _context.StockAdjustments
//                     .AsNoTracking()
//                     .Include(sa => sa.Items)
//                     .Where(sa => sa.CompanyId == companyId &&
//                                 sa.FiscalYearId == fiscalYearId &&
//                                 sa.Items.Any(i => itemIds.Contains(i.ItemId)) &&
//                                 (isNepaliFormat ? (sa.NepaliDate >= fromDate && sa.NepaliDate <= toDate) : (sa.Date >= fromDate && sa.Date <= toDate)))
//                     .ToListAsync();

//                 var periodPurchaseReturns = await _context.PurchaseReturns
//                     .AsNoTracking()
//                     .Include(pr => pr.Items)
//                     .Where(pr => pr.CompanyId == companyId &&
//                                 pr.FiscalYearId == fiscalYearId &&
//                                 pr.Items.Any(i => itemIds.Contains(i.ItemId)) &&
//                                 (isNepaliFormat ? (pr.nepaliDate >= fromDate && pr.nepaliDate <= toDate) : (pr.Date >= fromDate && pr.Date <= toDate)))
//                     .ToListAsync();

//                 var periodSalesReturns = await _context.SalesReturns
//                     .AsNoTracking()
//                     .Include(sr => sr.Items)
//                     .Where(sr => sr.CompanyId == companyId &&
//                                 sr.FiscalYearId == fiscalYearId &&
//                                 sr.Items.Any(i => itemIds.Contains(i.ItemId)) &&
//                                 (isNepaliFormat ? (sr.nepaliDate >= fromDate && sr.nepaliDate <= toDate) : (sr.Date >= fromDate && sr.Date <= toDate)))
//                     .ToListAsync();

//                 // Create lookup maps for OPENING stock
//                 var openingPurchaseMap = CreateItemQuantityMap(openingPurchaseBills);
//                 var openingSalesMap = CreateItemQuantityMap(openingSalesBills);
//                 var openingAdjustmentMap = CreateAdjustmentMap(openingStockAdjustments);
//                 var openingPurchaseReturnMap = CreateItemQuantityMap(openingPurchaseReturns);
//                 var openingSalesReturnMap = CreateItemQuantityMap(openingSalesReturns);

//                 // Create lookup maps for PERIOD transactions
//                 var periodPurchaseMap = CreateItemQuantityMap(periodPurchaseBills);
//                 var periodSalesMap = CreateItemQuantityMap(periodSalesBills);
//                 var periodAdjustmentMap = CreateAdjustmentMap(periodStockAdjustments);
//                 var periodPurchaseReturnMap = CreateItemQuantityMap(periodPurchaseReturns);
//                 var periodSalesReturnMap = CreateItemQuantityMap(periodSalesReturns);

//                 // Process items
//                 var processedItems = new List<StockStatusItemDTO>();

//                 foreach (var item in items)
//                 {
//                     var itemId = item.Id;

//                     // Get OPENING stock quantities (before fromDate)
//                     decimal openingPurchaseQty = openingPurchaseMap.GetValueOrDefault(itemId, 0);
//                     decimal openingSalesReturnQty = openingSalesReturnMap.GetValueOrDefault(itemId, 0);
//                     decimal openingSalesOutQty = openingSalesMap.GetValueOrDefault(itemId, 0);
//                     decimal openingPurchaseReturnQty = openingPurchaseReturnMap.GetValueOrDefault(itemId, 0);
//                     var openingAdjustments = openingAdjustmentMap.GetValueOrDefault(itemId, (In: 0m, Out: 0m));

//                     // Get opening stock from InitialOpeningStock only
//                     decimal initialOpeningStock = 0;
//                     decimal openingPurchasePrice = 0;
//                     decimal openingSalesPrice = 0;

//                     // Only use InitialOpeningStock
//                     if (item.InitialOpeningStock != null)
//                     {
//                         // Get the date of the initial opening stock
//                         DateTime initialStockDate = isNepaliFormat && item.InitialOpeningStock.NepaliDate.HasValue
//                             ? item.InitialOpeningStock.NepaliDate.Value
//                             : item.InitialOpeningStock.Date;

//                         // Only include initial opening stock if its date is on or before fromDate
//                         if (initialStockDate <= fromDate)
//                         {
//                             initialOpeningStock = item.InitialOpeningStock.OpeningStock;
//                             openingPurchasePrice = item.InitialOpeningStock.PurchasePrice;
//                             openingSalesPrice = item.InitialOpeningStock.SalesPrice;
//                         }
//                     }

//                     // Calculate OPENING STOCK (stock before fromDate)
//                     decimal openingBalance = initialOpeningStock + openingPurchaseQty + openingSalesReturnQty + openingAdjustments.In -
//                                             (openingSalesOutQty + openingPurchaseReturnQty + openingAdjustments.Out);

//                     // Get PERIOD quantities (between fromDate and toDate)
//                     decimal periodPurchaseQty = periodPurchaseMap.GetValueOrDefault(itemId, 0);
//                     decimal periodSalesReturnQty = periodSalesReturnMap.GetValueOrDefault(itemId, 0);
//                     decimal periodSalesOutQty = periodSalesMap.GetValueOrDefault(itemId, 0);
//                     decimal periodPurchaseReturnQty = periodPurchaseReturnMap.GetValueOrDefault(itemId, 0);
//                     var periodAdjustments = periodAdjustmentMap.GetValueOrDefault(itemId, (In: 0m, Out: 0m));

//                     // Calculate TOTAL INWARD during period
//                     decimal totalInward = periodPurchaseQty + periodSalesReturnQty + periodAdjustments.In;

//                     // Calculate TOTAL OUTWARD during period
//                     decimal totalOutward = periodSalesOutQty + periodPurchaseReturnQty + periodAdjustments.Out;

//                     // Calculate CLOSING STOCK (as of toDate)
//                     decimal closingStock = openingBalance + totalInward - totalOutward;

//                     // // Calculate WEIGHTED AVERAGE PURCHASE PRICE for OPENING STOCK (stock before fromDate)
//                     // // This includes initial opening stock + all purchases before fromDate
//                     // decimal openingStockValue = 0;
//                     // decimal openingStockQuantity = 0;

//                     // // Add initial opening stock value
//                     // if (initialOpeningStock > 0 && openingPurchasePrice > 0)
//                     // {
//                     //     openingStockValue += initialOpeningStock * openingPurchasePrice;
//                     //     openingStockQuantity += initialOpeningStock;
//                     // }

//                     // // Add all purchase values that occurred BEFORE fromDate (these are in openingPurchaseBills)
//                     // foreach (var bill in openingPurchaseBills)
//                     // {
//                     //     if (bill.Items == null) continue;
//                     //     var billItem = bill.Items.FirstOrDefault(i => i.ItemId == itemId);
//                     //     if (billItem != null)
//                     //     {
//                     //         decimal puPrice = billItem.AltPuPrice ?? billItem.PuPrice;
//                     //         decimal quantity = billItem.AltQuantity ?? billItem.Quantity;
//                     //         decimal bonus = billItem.AltBonus ?? billItem.Bonus ?? 0;
//                     //         decimal totalQuantity = quantity + bonus;

//                     //         openingStockValue += totalQuantity * puPrice;
//                     //         openingStockQuantity += totalQuantity;
//                     //     }
//                     // }

//                     // // Add sales returns that occurred BEFORE fromDate
//                     // foreach (var bill in openingSalesReturns)
//                     // {
//                     //     if (bill.Items == null) continue;
//                     //     var billItem = bill.Items.FirstOrDefault(i => i.ItemId == itemId);
//                     //     if (billItem != null)
//                     //     {
//                     //         openingStockValue += billItem.Quantity * (billItem.PuPrice ?? openingPurchasePrice);
//                     //         openingStockQuantity += billItem.Quantity;
//                     //     }
//                     // }

//                     // // Add adjustment ins that occurred BEFORE fromDate
//                     // foreach (var adj in openingStockAdjustments)
//                     // {
//                     //     if (adj.Items == null) continue;
//                     //     var adjItem = adj.Items.FirstOrDefault(i => i.ItemId == itemId);
//                     //     if (adjItem != null && adj.AdjustmentType == "xcess")
//                     //     {
//                     //         openingStockValue += adjItem.Quantity * adjItem.PuPrice;
//                     //         openingStockQuantity += adjItem.Quantity;
//                     //     }
//                     // }

//                     // // Calculate WEIGHTED AVERAGE PRICE for opening stock
//                     // decimal openingAvgPrice = openingStockQuantity > 0 ? openingStockValue / openingStockQuantity : openingPurchasePrice;

//                     // // For the period calculations, use the weighted average price from opening stock
//                     // // Then add period purchases to get the final weighted average
//                     // decimal totalStockValue = openingStockValue;
//                     // decimal totalStockQuantity = openingStockQuantity;

//                     // // Add period purchase values
//                     // foreach (var bill in periodPurchaseBills)
//                     // {
//                     //     if (bill.Items == null) continue;
//                     //     var billItem = bill.Items.FirstOrDefault(i => i.ItemId == itemId);
//                     //     if (billItem != null)
//                     //     {
//                     //         decimal puPrice = billItem.AltPuPrice ?? billItem.PuPrice;
//                     //         decimal quantity = billItem.AltQuantity ?? billItem.Quantity;
//                     //         decimal bonus = billItem.AltBonus ?? billItem.Bonus ?? 0;
//                     //         decimal totalQuantity = quantity + bonus;

//                     //         totalStockValue += totalQuantity * puPrice;
//                     //         totalStockQuantity += totalQuantity;
//                     //     }
//                     // }

//                     // // Add period sales returns
//                     // foreach (var bill in periodSalesReturns)
//                     // {
//                     //     if (bill.Items == null) continue;
//                     //     var billItem = bill.Items.FirstOrDefault(i => i.ItemId == itemId);
//                     //     if (billItem != null)
//                     //     {
//                     //         totalStockValue += billItem.Quantity * (billItem.PuPrice ?? openingPurchasePrice);
//                     //         totalStockQuantity += billItem.Quantity;
//                     //     }
//                     // }

//                     // // Add period adjustment ins
//                     // foreach (var adj in periodStockAdjustments)
//                     // {
//                     //     if (adj.Items == null) continue;
//                     //     var adjItem = adj.Items.FirstOrDefault(i => i.ItemId == itemId);
//                     //     if (adjItem != null && adj.AdjustmentType == "xcess")
//                     //     {
//                     //         totalStockValue += adjItem.Quantity * adjItem.PuPrice;
//                     //         totalStockQuantity += adjItem.Quantity;
//                     //     }
//                     // }

//                     // // Calculate FINAL WEIGHTED AVERAGE COST PRICE
//                     // decimal avgPuPrice = totalStockQuantity > 0 ? totalStockValue / totalStockQuantity : openingPurchasePrice;

//                     // // Calculate total stock value using weighted average
//                     // decimal totalStockValuePurchase = closingStock > 0 ? closingStock * avgPuPrice : 0;

//                     // // Calculate WEIGHTED AVERAGE SALES PRICE for all stock
//                     // decimal totalSalesValue = 0;
//                     // decimal totalSalesQuantity = 0;

//                     // // Add opening stock sales value (only if it was included in opening balance)
//                     // if (openingBalance > 0 && openingSalesPrice > 0)
//                     // {
//                     //     totalSalesValue += openingBalance * openingSalesPrice;
//                     //     totalSalesQuantity += openingBalance;
//                     // }

//                     // // Add period sales
//                     // foreach (var bill in periodSalesBills)
//                     // {
//                     //     if (bill.Items == null) continue;
//                     //     var billItem = bill.Items.FirstOrDefault(i => i.ItemId == itemId);
//                     //     if (billItem != null)
//                     //     {
//                     //         totalSalesValue += billItem.Quantity * billItem.Price;
//                     //         totalSalesQuantity += billItem.Quantity;
//                     //     }
//                     // }

//                     // // Calculate WEIGHTED AVERAGE SALES PRICE
//                     // decimal avgPrice = totalSalesQuantity > 0 ? totalSalesValue / totalSalesQuantity : openingSalesPrice;

// // Calculate WEIGHTED AVERAGE PURCHASE PRICE (C.P) for all stock (opening + period purchases)
// decimal totalStockValue = 0;
// decimal totalStockQuantity = 0;

// // Add opening stock purchase value (using purchase price from initial opening stock)
// if (openingBalance > 0 && openingPurchasePrice > 0)
// {
//     totalStockValue += openingBalance * openingPurchasePrice;
//     totalStockQuantity += openingBalance;
// }

// // Add period purchase values (using PuPrice from purchase bills)
// foreach (var bill in periodPurchaseBills)
// {
//     if (bill.Items == null) continue;
//     var billItem = bill.Items.FirstOrDefault(i => i.ItemId == itemId);
//     if (billItem != null)
//     {
//         decimal puPrice = billItem.AltPuPrice ?? billItem.PuPrice;
//         decimal quantity = billItem.AltQuantity ?? billItem.Quantity;
//         decimal bonus = billItem.AltBonus ?? billItem.Bonus ?? 0;
//         decimal totalQuantity = quantity + bonus;

//         totalStockValue += totalQuantity * puPrice;
//         totalStockQuantity += totalQuantity;
//     }
// }

// // Add sales returns (using PuPrice from sales return - purchase price when it was sold)
// foreach (var bill in periodSalesReturns)
// {
//     if (bill.Items == null) continue;
//     var billItem = bill.Items.FirstOrDefault(i => i.ItemId == itemId);
//     if (billItem != null && billItem.PuPrice.HasValue)
//     {
//         totalStockValue += billItem.Quantity * billItem.PuPrice.Value;
//         totalStockQuantity += billItem.Quantity;
//     }
// }

// // Add adjustment ins (using PuPrice from adjustment)
// foreach (var adj in periodStockAdjustments)
// {
//     if (adj.Items == null) continue;
//     var adjItem = adj.Items.FirstOrDefault(i => i.ItemId == itemId);
//     if (adjItem != null && adj.AdjustmentType == "xcess")
//     {
//         totalStockValue += adjItem.Quantity * adjItem.PuPrice;
//         totalStockQuantity += adjItem.Quantity;
//     }
// }

// // Calculate WEIGHTED AVERAGE COST PRICE (C.P)
// decimal avgPuPrice = totalStockQuantity > 0 ? totalStockValue / totalStockQuantity : openingPurchasePrice;

// // Calculate total stock value using weighted average
// decimal totalStockValuePurchase = closingStock > 0 ? closingStock * avgPuPrice : 0;

// // ========== WEIGHTED AVERAGE SELLING PRICE (S.P) ==========
// // Calculate WEIGHTED AVERAGE SELLING PRICE from purchase bills (Price field)
// decimal totalSellingValue = 0;
// decimal totalSellingQuantity = 0;

// // Add opening stock selling value (using sales price from initial opening stock)
// if (openingBalance > 0 && openingSalesPrice > 0)
// {
//     totalSellingValue += openingBalance * openingSalesPrice;
//     totalSellingQuantity += openingBalance;
// }

// // Add period purchase selling prices (using Price from purchase bills - this is the selling price/MRP)
// foreach (var bill in periodPurchaseBills)
// {
//     if (bill.Items == null) continue;
//     var billItem = bill.Items.FirstOrDefault(i => i.ItemId == itemId);
//     if (billItem != null)
//     {
//         decimal sellingPrice = billItem.AltPrice ?? billItem.Price;
//         decimal quantity = billItem.AltQuantity ?? billItem.Quantity;
//         decimal bonus = billItem.AltBonus ?? billItem.Bonus ?? 0;
//         decimal totalQuantity = quantity + bonus;

//         totalSellingValue += totalQuantity * sellingPrice;
//         totalSellingQuantity += totalQuantity;
//     }
// }

// // Add sales returns (using Price from sales return - selling price when returned)
// foreach (var bill in periodSalesReturns)
// {
//     if (bill.Items == null) continue;
//     var billItem = bill.Items.FirstOrDefault(i => i.ItemId == itemId);
//     if (billItem != null)
//     {
//         totalSellingValue += billItem.Quantity * billItem.Price;
//         totalSellingQuantity += billItem.Quantity;
//     }
// }

// // Calculate WEIGHTED AVERAGE SELLING PRICE (S.P)
// decimal avgPrice = totalSellingQuantity > 0 ? totalSellingValue / totalSellingQuantity : openingSalesPrice;

// // Calculate total stock value using weighted average selling price
// decimal totalStockValueSales = closingStock > 0 ? closingStock * avgPrice : 0;

//                     processedItems.Add(new StockStatusItemDTO
//                     {
//                         Id = item.Id,
//                         Name = item.Name,
//                         Code = item.UniqueNumber.ToString(),
//                         Category = item.Category?.Name,
//                         Unit = item.Unit?.Name,
//                         MinStock = item.MinStock,
//                         MaxStock = item.MaxStock,
//                         OpeningStock = openingBalance,
//                         TotalQtyIn = totalInward,
//                         TotalQtyOut = totalOutward,
//                         Stock = closingStock,
//                         AvgPuPrice = avgPuPrice,
//                         AvgPrice = avgPrice,
//                         TotalStockValuePurchase = totalStockValuePurchase,
//                         TotalStockValueSales = closingStock * avgPrice
//                     });
//                 }

//                 // Prepare company info DTO
//                 var companyInfo = new CompanyInfoDTO
//                 {
//                     Id = company.Id,
//                     Name = company.Name,
//                     Address = company.Address,
//                     City = company.City,
//                     Phone = company.Phone,
//                     Pan = company.Pan,
//                     RenewalDate = company.RenewalDate,
//                     DateFormat = company.DateFormat.ToString(),
//                     VatEnabled = company.VatEnabled
//                 };

//                 // Check if user is admin or supervisor
//                 bool isAdminOrSupervisor = user.IsAdmin || user.IsInRole("Supervisor");

//                 return new StockStatusResponseDTO
//                 {
//                     Company = companyInfo,
//                     CurrentFiscalYear = currentFiscalYear,
//                     CurrentCompany = companyInfo,
//                     CurrentCompanyName = company.Name,
//                     CompanyDateFormat = dateFormat,
//                     Items = processedItems,
//                     Pagination = new PaginationDTO
//                     {
//                         Current = page,
//                         Pages = (int)Math.Ceiling((double)totalItems / limit),
//                         Total = totalItems
//                     },
//                     IsAdminOrSupervisor = isAdminOrSupervisor,
//                     FromDate = fromDate,
//                     ToDate = toDate
//                 };
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error in GetStockStatusAsync for company {CompanyId}, fiscal year {FiscalYearId}", companyId, fiscalYearId);
//                 throw;
//             }
//         }

//         private Dictionary<Guid, decimal> CreateItemQuantityMap(List<PurchaseBill> bills)
//         {
//             var map = new Dictionary<Guid, decimal>();

//             foreach (var bill in bills)
//             {
//                 if (bill.Items == null) continue;

//                 foreach (var billItem in bill.Items)
//                 {
//                     if (!map.ContainsKey(billItem.ItemId))
//                         map[billItem.ItemId] = 0;

//                     decimal quantity = billItem.AltQuantity ?? billItem.Quantity;
//                     decimal bonus = billItem.AltBonus ?? billItem.Bonus ?? 0;

//                     map[billItem.ItemId] += quantity + bonus;
//                 }
//             }

//             return map;
//         }

//         private Dictionary<Guid, decimal> CreateItemQuantityMap(List<SalesBill> bills)
//         {
//             var map = new Dictionary<Guid, decimal>();

//             foreach (var bill in bills)
//             {
//                 if (bill.Items == null) continue;

//                 foreach (var billItem in bill.Items)
//                 {
//                     if (!map.ContainsKey(billItem.ItemId))
//                         map[billItem.ItemId] = 0;

//                     map[billItem.ItemId] += billItem.Quantity;
//                 }
//             }

//             return map;
//         }

//         private Dictionary<Guid, decimal> CreateItemQuantityMap(List<PurchaseReturn> bills)
//         {
//             var map = new Dictionary<Guid, decimal>();

//             foreach (var bill in bills)
//             {
//                 if (bill.Items == null) continue;

//                 foreach (var billItem in bill.Items)
//                 {
//                     if (!map.ContainsKey(billItem.ItemId))
//                         map[billItem.ItemId] = 0;

//                     decimal quantity = billItem.AltQuantity ?? billItem.Quantity ?? 0;

//                     map[billItem.ItemId] += quantity;
//                 }
//             }

//             return map;
//         }

//         private Dictionary<Guid, decimal> CreateItemQuantityMap(List<SalesReturn> bills)
//         {
//             var map = new Dictionary<Guid, decimal>();

//             foreach (var bill in bills)
//             {
//                 if (bill.Items == null) continue;

//                 foreach (var billItem in bill.Items)
//                 {
//                     if (!map.ContainsKey(billItem.ItemId))
//                         map[billItem.ItemId] = 0;

//                     map[billItem.ItemId] += billItem.Quantity;
//                 }
//             }

//             return map;
//         }

//         private Dictionary<Guid, (decimal In, decimal Out)> CreateAdjustmentMap(List<StockAdjustment> adjustments)
//         {
//             var map = new Dictionary<Guid, (decimal In, decimal Out)>();

//             foreach (var adj in adjustments)
//             {
//                 if (adj.Items == null) continue;

//                 foreach (var adjItem in adj.Items)
//                 {
//                     if (!map.ContainsKey(adjItem.ItemId))
//                         map[adjItem.ItemId] = (0, 0);

//                     if (adj.AdjustmentType == "xcess")
//                     {
//                         var current = map[adjItem.ItemId];
//                         map[adjItem.ItemId] = (current.In + adjItem.Quantity, current.Out);
//                     }
//                     else if (adj.AdjustmentType == "short")
//                     {
//                         var current = map[adjItem.ItemId];
//                         map[adjItem.ItemId] = (current.In, current.Out + adjItem.Quantity);
//                     }
//                 }
//             }

//             return map;
//         }
//     }
// }

//-------------------------------------------------------------------end

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
                    .Include(i => i.InitialOpeningStock)
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
                        FromDate = fromDate,
                        ToDate = toDate
                    };
                }

                // Get all item IDs for batch queries
                var itemIds = items.Select(i => i.Id).ToList();

                // Get OPENING STOCK transactions (BEFORE fromDate) for quantity calculation
                var openingPurchaseBills = await _context.PurchaseBills
                    .AsNoTracking()
                    .Include(p => p.Items)
                    .Where(p => p.CompanyId == companyId &&
                               p.FiscalYearId == fiscalYearId &&
                               p.Items.Any(i => itemIds.Contains(i.ItemId)) &&
                               (isNepaliFormat ? p.nepaliDate < fromDate : p.Date < fromDate))
                    .ToListAsync();

                var openingSalesBills = await _context.SalesBills
                    .AsNoTracking()
                    .Include(s => s.Items)
                    .Where(s => s.CompanyId == companyId &&
                               s.FiscalYearId == fiscalYearId &&
                               s.Items.Any(i => itemIds.Contains(i.ItemId)) &&
                               (isNepaliFormat ? s.nepaliDate < fromDate : s.Date < fromDate))
                    .ToListAsync();

                var openingStockAdjustments = await _context.StockAdjustments
                    .AsNoTracking()
                    .Include(sa => sa.Items)
                    .Where(sa => sa.CompanyId == companyId &&
                                sa.FiscalYearId == fiscalYearId &&
                                sa.Items.Any(i => itemIds.Contains(i.ItemId)) &&
                                (isNepaliFormat ? sa.NepaliDate < fromDate : sa.Date < fromDate))
                    .ToListAsync();

                var openingPurchaseReturns = await _context.PurchaseReturns
                    .AsNoTracking()
                    .Include(pr => pr.Items)
                    .Where(pr => pr.CompanyId == companyId &&
                                pr.FiscalYearId == fiscalYearId &&
                                pr.Items.Any(i => itemIds.Contains(i.ItemId)) &&
                                (isNepaliFormat ? pr.nepaliDate < fromDate : pr.Date < fromDate))
                    .ToListAsync();

                var openingSalesReturns = await _context.SalesReturns
                    .AsNoTracking()
                    .Include(sr => sr.Items)
                    .Where(sr => sr.CompanyId == companyId &&
                                sr.FiscalYearId == fiscalYearId &&
                                sr.Items.Any(i => itemIds.Contains(i.ItemId)) &&
                                (isNepaliFormat ? sr.nepaliDate < fromDate : sr.Date < fromDate))
                    .ToListAsync();

                // Get PERIOD transactions (BETWEEN fromDate AND toDate)
                var periodPurchaseBills = await _context.PurchaseBills
                    .AsNoTracking()
                    .Include(p => p.Items)
                    .Where(p => p.CompanyId == companyId &&
                               p.FiscalYearId == fiscalYearId &&
                               p.Items.Any(i => itemIds.Contains(i.ItemId)) &&
                               (isNepaliFormat ? (p.nepaliDate >= fromDate && p.nepaliDate <= toDate) : (p.Date >= fromDate && p.Date <= toDate)))
                    .ToListAsync();

                var periodSalesBills = await _context.SalesBills
                    .AsNoTracking()
                    .Include(s => s.Items)
                    .Where(s => s.CompanyId == companyId &&
                               s.FiscalYearId == fiscalYearId &&
                               s.Items.Any(i => itemIds.Contains(i.ItemId)) &&
                               (isNepaliFormat ? (s.nepaliDate >= fromDate && s.nepaliDate <= toDate) : (s.Date >= fromDate && s.Date <= toDate)))
                    .ToListAsync();

                var periodStockAdjustments = await _context.StockAdjustments
                    .AsNoTracking()
                    .Include(sa => sa.Items)
                    .Where(sa => sa.CompanyId == companyId &&
                                sa.FiscalYearId == fiscalYearId &&
                                sa.Items.Any(i => itemIds.Contains(i.ItemId)) &&
                                (isNepaliFormat ? (sa.NepaliDate >= fromDate && sa.NepaliDate <= toDate) : (sa.Date >= fromDate && sa.Date <= toDate)))
                    .ToListAsync();

                var periodPurchaseReturns = await _context.PurchaseReturns
                    .AsNoTracking()
                    .Include(pr => pr.Items)
                    .Where(pr => pr.CompanyId == companyId &&
                                pr.FiscalYearId == fiscalYearId &&
                                pr.Items.Any(i => itemIds.Contains(i.ItemId)) &&
                                (isNepaliFormat ? (pr.nepaliDate >= fromDate && pr.nepaliDate <= toDate) : (pr.Date >= fromDate && pr.Date <= toDate)))
                    .ToListAsync();

                var periodSalesReturns = await _context.SalesReturns
                    .AsNoTracking()
                    .Include(sr => sr.Items)
                    .Where(sr => sr.CompanyId == companyId &&
                                sr.FiscalYearId == fiscalYearId &&
                                sr.Items.Any(i => itemIds.Contains(i.ItemId)) &&
                                (isNepaliFormat ? (sr.nepaliDate >= fromDate && sr.nepaliDate <= toDate) : (sr.Date >= fromDate && sr.Date <= toDate)))
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
                                 (isNepaliFormat ? se.NepaliDate <= toDate : se.Date <= toDate))
                    .OrderBy(se => isNepaliFormat ? se.NepaliDate : se.Date)
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

                    // Get opening stock from InitialOpeningStock only
                    decimal initialOpeningStock = 0;
                    decimal openingPurchasePrice = 0;
                    decimal openingSalesPrice = 0;

                    // Only use InitialOpeningStock
                    if (item.InitialOpeningStock != null)
                    {
                        // Get the date of the initial opening stock
                        DateTime initialStockDate = isNepaliFormat && item.InitialOpeningStock.NepaliDate.HasValue
                            ? item.InitialOpeningStock.NepaliDate.Value
                            : item.InitialOpeningStock.Date;

                        // Only include initial opening stock if its date is on or before fromDate
                        if (initialStockDate <= fromDate)
                        {
                            initialOpeningStock = item.InitialOpeningStock.OpeningStock;
                            openingPurchasePrice = item.InitialOpeningStock.PurchasePrice;
                            openingSalesPrice = item.InitialOpeningStock.SalesPrice;
                        }
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
                    decimal totalStockValuePurchase = closingStock > 0 ? closingStock * avgPuPrice : 0;
                    decimal totalStockValueSales = closingStock > 0 ? closingStock * avgPrice : 0;

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