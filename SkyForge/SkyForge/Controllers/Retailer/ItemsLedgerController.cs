using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto.RetailerDto.ItemsLedgerDto;
using SkyForge.Models.Retailer.Items;
using SkyForge.Models.Retailer.Purchase;
using SkyForge.Models.Retailer.PurchaseReturnModel;
using SkyForge.Models.Retailer.Sales;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.Retailer.SalesReturnModel;
using SkyForge.Models.Retailer.StockAdjustmentModel;
using System.Security.Claims;

namespace SkyForge.Controllers.Retailer
{
    [Route("api/retailer")]
    [ApiController]
    public class ItemsLedgerController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<ItemsLedgerController> _logger;

        public ItemsLedgerController(ApplicationDbContext context, ILogger<ItemsLedgerController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet("items-ledger/{id}")]
        public async Task<IActionResult> GetItemsLedger(Guid id, [FromQuery] string? fromDate = null, [FromQuery] string? toDate = null)
        {
            try
            {
                _logger.LogInformation("=== GetItemsLedger Started for Item ID: {ItemId} ===", id);

                // Extract claims from JWT
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                // Validate user
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token. Please login again." });
                }

                // Validate company
                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected. Please select a company first." });
                }

                // Validate trade type
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    _logger.LogWarning($"Access denied: TradeType is {tradeTypeClaim}, not Retailer");
                    return StatusCode(403, new { success = false, error = "Access denied for this trade type. This is a Retailer-only feature." });
                }

                // Validate item ID and get item with initial opening stock
                var item = await _context.Items
                    .Include(i => i.Unit)
                    .Include(i => i.Category)
                    .Include(i => i.InitialOpeningStock)
                    .FirstOrDefaultAsync(i => i.Id == id && i.CompanyId == companyIdGuid);

                if (item == null)
                {
                    return NotFound(new { success = false, error = "Item not found" });
                }

                // Get company information
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

                // If no dates provided, return empty response
                if (string.IsNullOrEmpty(fromDate) || string.IsNullOrEmpty(toDate))
                {
                    var emptyResponse = new ItemsLedgerResponseDTO
                    {
                        OpeningStock = 0,
                        PurchasePrice = 0,
                        Entries = new List<LedgerEntryDTO>(),
                        Summary = new LedgerSummaryDTO(),
                        Item = new ItemLedgerInfoDTO
                        {
                            Id = item.Id,
                            Name = item.Name,
                            Hscode = item.Hscode,
                            UniqueNumber = item.UniqueNumber,
                            UnitName = item.Unit?.Name,
                            CategoryName = item.Category?.Name
                        }
                    };

                    return Ok(new { success = true, data = emptyResponse });
                }

                // Parse dates
                if (!DateTime.TryParse(fromDate, out DateTime startDate) || !DateTime.TryParse(toDate, out DateTime endDate))
                {
                    return BadRequest(new { success = false, error = "Invalid date format. Please use YYYY-MM-DD format." });
                }

                // Set end date to end of day
                endDate = endDate.Date.AddDays(1).AddTicks(-1);

                // Calculate opening stock
                decimal openingStock = 0;
                decimal initialPurchasePrice = 0;

                // Get initial opening stock if available
                if (item.InitialOpeningStock != null)
                {
                    openingStock = item.InitialOpeningStock.OpeningStock;
                    initialPurchasePrice = item.InitialOpeningStock.PurchasePrice;
                    _logger.LogInformation($"Initial Opening Stock: {openingStock}, Price: {initialPurchasePrice}");
                }
                else if (item.OpeningStock > 0)
                {
                    openingStock = item.OpeningStock;
                    initialPurchasePrice = item.PuPrice ?? 0;
                    _logger.LogInformation($"Using Item.OpeningStock: {openingStock}, Price: {initialPurchasePrice}");
                }

                // Calculate historical stock movements before the fromDate
                var historicalStockChange = await CalculateHistoricalStockAsync(id, companyIdGuid, startDate);
                openingStock += historicalStockChange;

                _logger.LogInformation($"After historical calculation: OpeningStock={openingStock}, HistoricalChange={historicalStockChange}");

                // Fetch all ledger entries for the date range
                var entries = await GetLedgerEntriesAsync(id, companyIdGuid, startDate, endDate);

                // Sort entries by date
                entries = entries.OrderBy(e => e.nepaliDate).ToList();

                // Calculate running balance and track current purchase price
                decimal balance = openingStock;
                decimal currentPurchasePrice = initialPurchasePrice;

                // Find the latest purchase price from entries before the fromDate
                var latestPurchaseBeforeFromDate = await GetLatestPurchasePriceBeforeDateAsync(id, companyIdGuid, startDate);
                if (latestPurchaseBeforeFromDate > 0)
                {
                    currentPurchasePrice = latestPurchaseBeforeFromDate;
                    _logger.LogInformation($"Latest purchase price before fromDate: {currentPurchasePrice}");
                }

                var processedEntries = new List<LedgerEntryDTO>();

                foreach (var entry in entries)
                {
                    // Update current purchase price when new purchase comes in
                    if (entry.Type == LedgerEntryType.Purchase && entry.Price > 0)
                    {
                        currentPurchasePrice = entry.Price;
                        _logger.LogInformation($"Updated purchase price to {currentPurchasePrice} from purchase entry");
                    }

                    // For the opening stock row, use the current purchase price
                    entry.CurrentPurchasePrice = currentPurchasePrice;

                    // Update balance based on transaction type
                    if (entry.Type == LedgerEntryType.Purchase || entry.Type == LedgerEntryType.SalesReturn)
                    {
                        balance += entry.QtyIn + entry.Bonus;
                    }
                    else if (entry.Type == LedgerEntryType.Sales || entry.Type == LedgerEntryType.PurchaseReturn)
                    {
                        balance -= entry.QtyOut;
                    }
                    else if (entry.Type == LedgerEntryType.Excess)
                    {
                        balance += entry.QtyIn;
                    }
                    else if (entry.Type == LedgerEntryType.Short)
                    {
                        balance -= entry.QtyOut;
                    }

                    entry.Balance = balance;
                    processedEntries.Add(entry);
                }

                // After processing all entries, get the final purchase price (from the last purchase or initial)
                var finalPurchasePrice = currentPurchasePrice;

                // If there are no purchases in the range, check the latest purchase before the toDate
                if (!processedEntries.Any(e => e.Type == LedgerEntryType.Purchase))
                {
                    var latestPurchaseBeforeToDate = await GetLatestPurchasePriceBeforeDateAsync(id, companyIdGuid, endDate);
                    if (latestPurchaseBeforeToDate > 0)
                    {
                        finalPurchasePrice = latestPurchaseBeforeToDate;
                    }
                }

                // Calculate summary
                var summary = new LedgerSummaryDTO
                {
                    TotalPurchases = processedEntries.Where(e => e.Type == LedgerEntryType.Purchase).Sum(e => e.QtyIn),
                    TotalSales = processedEntries.Where(e => e.Type == LedgerEntryType.Sales).Sum(e => e.QtyOut),
                    TotalPurchaseReturns = processedEntries.Where(e => e.Type == LedgerEntryType.PurchaseReturn).Sum(e => e.QtyOut),
                    TotalSalesReturns = processedEntries.Where(e => e.Type == LedgerEntryType.SalesReturn).Sum(e => e.QtyIn),
                    TotalAdjustments = processedEntries.Where(e => e.Type == LedgerEntryType.Excess || e.Type == LedgerEntryType.Short).Sum(e => e.QtyIn - e.QtyOut)
                };

                var response = new ItemsLedgerResponseDTO
                {
                    OpeningStock = openingStock,
                    PurchasePrice = finalPurchasePrice, // Use the latest purchase price
                    Entries = processedEntries,
                    Summary = summary,
                    Item = new ItemLedgerInfoDTO
                    {
                        Id = item.Id,
                        Name = item.Name,
                        Hscode = item.Hscode,
                        UniqueNumber = item.UniqueNumber,
                        UnitName = item.Unit?.Name,
                        CategoryName = item.Category?.Name
                    }
                };

                _logger.LogInformation($"Successfully fetched ledger for item {item.Name} with {entries.Count} entries, Opening Stock: {openingStock}, Current Purchase Price: {finalPurchasePrice}");

                return Ok(new { success = true, data = response });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetItemsLedger for item {ItemId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching items ledger",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // Add this helper method to get the latest purchase price before a specific date
        private async Task<decimal> GetLatestPurchasePriceBeforeDateAsync(Guid itemId, Guid companyId, DateTime beforeDate)
        {
            decimal latestPrice = 0;

            // Check purchases before the date
            var latestPurchase = await _context.PurchaseBills
                .Include(p => p.Items)
                .Where(p => p.CompanyId == companyId &&
                           p.nepaliDate < beforeDate &&
                           p.Items.Any(i => i.ItemId == itemId))
                .OrderByDescending(p => p.nepaliDate)
                .FirstOrDefaultAsync();

            if (latestPurchase != null)
            {
                var itemEntry = latestPurchase.Items.FirstOrDefault(i => i.ItemId == itemId);
                if (itemEntry != null)
                {
                    latestPrice = itemEntry.AltPuPrice ?? 0;
                }
            }

            // If no purchase found, check stock adjustments with price
            if (latestPrice == 0)
            {
                var latestAdjustment = await _context.StockAdjustments
                    .Include(sa => sa.Items)
                    .Where(sa => sa.CompanyId == companyId &&
                                sa.NepaliDate < beforeDate &&
                                sa.Items.Any(i => i.ItemId == itemId) &&
                                sa.Items.Any(i => i.PuPrice > 0))
                    .OrderByDescending(sa => sa.NepaliDate)
                    .FirstOrDefaultAsync();

                if (latestAdjustment != null)
                {
                    var itemEntry = latestAdjustment.Items.FirstOrDefault(i => i.ItemId == itemId);
                    if (itemEntry != null)
                    {
                        latestPrice = itemEntry.PuPrice;
                    }
                }
            }

            return latestPrice;
        }

        private async Task<decimal> CalculateHistoricalStockAsync(Guid itemId, Guid companyId, DateTime fromDate)
        {
            decimal stockChange = 0;

            // Historical Purchases
            var historicalPurchases = await _context.PurchaseBills
                .Include(p => p.Items)
                .Where(p => p.CompanyId == companyId &&
                           p.nepaliDate < fromDate &&
                           p.Items.Any(i => i.ItemId == itemId))
                .ToListAsync();

            foreach (var purchase in historicalPurchases)
            {
                foreach (var item in purchase.Items.Where(i => i.ItemId == itemId))
                {
                    stockChange += (item.AltQuantity ?? 0) + (item.AltBonus ?? 0);
                }
            }

            // Historical Purchase Returns
            var historicalPurchaseReturns = await _context.PurchaseReturns
                .Include(pr => pr.Items)
                .Where(pr => pr.CompanyId == companyId &&
                            pr.nepaliDate < fromDate &&
                            pr.Items.Any(i => i.ItemId == itemId))
                .ToListAsync();

            foreach (var purchaseReturn in historicalPurchaseReturns)
            {
                foreach (var item in purchaseReturn.Items.Where(i => i.ItemId == itemId))
                {
                    stockChange -= (item.Quantity ?? 0);
                }
            }

            // Historical Sales
            var historicalSales = await _context.SalesBills
                .Include(s => s.Items)
                .Where(s => s.CompanyId == companyId &&
                           s.nepaliDate < fromDate &&
                           s.Items.Any(i => i.ItemId == itemId))
                .ToListAsync();

            foreach (var sale in historicalSales)
            {
                foreach (var item in sale.Items.Where(i => i.ItemId == itemId))
                {
                    stockChange -= item.Quantity;
                }
            }

            // Historical Sales Returns
            var historicalSalesReturns = await _context.SalesReturns
                .Include(sr => sr.Items)
                .Where(sr => sr.CompanyId == companyId &&
                            sr.nepaliDate < fromDate &&
                            sr.Items.Any(i => i.ItemId == itemId))
                .ToListAsync();

            foreach (var salesReturn in historicalSalesReturns)
            {
                foreach (var item in salesReturn.Items.Where(i => i.ItemId == itemId))
                {
                    stockChange += item.Quantity;
                }
            }

            // Historical Stock Adjustments
            var historicalAdjustments = await _context.StockAdjustments
                .Include(sa => sa.Items)
                .Where(sa => sa.CompanyId == companyId &&
                            sa.NepaliDate < fromDate &&
                            sa.Items.Any(i => i.ItemId == itemId))
                .ToListAsync();

            foreach (var adjustment in historicalAdjustments)
            {
                foreach (var item in adjustment.Items.Where(i => i.ItemId == itemId))
                {
                    if (adjustment.AdjustmentType == "xcess")
                    {
                        stockChange += item.Quantity;
                    }
                    else if (adjustment.AdjustmentType == "short")
                    {
                        stockChange -= item.Quantity;
                    }
                }
            }

            return stockChange;
        }

        private async Task<List<LedgerEntryDTO>> GetLedgerEntriesAsync(Guid itemId, Guid companyId, DateTime fromDate, DateTime toDate)
        {
            var entries = new List<LedgerEntryDTO>();

            // Purchase Entries
            var purchases = await _context.PurchaseBills
                .Include(p => p.Account)
                .Include(p => p.Items)
                    .ThenInclude(i => i.Item)
                        .ThenInclude(it => it.Unit)
                .Where(p => p.CompanyId == companyId &&
                           p.nepaliDate >= fromDate && p.nepaliDate <= toDate &&
                           p.Items.Any(i => i.ItemId == itemId))
                .ToListAsync();

            foreach (var purchase in purchases)
            {
                foreach (var item in purchase.Items.Where(i => i.ItemId == itemId))
                {
                    entries.Add(CreatePurchaseEntry(purchase, item));
                }
            }

            // Purchase Return Entries
            var purchaseReturns = await _context.PurchaseReturns
                .Include(pr => pr.Account)
                .Include(pr => pr.Items)
                    .ThenInclude(i => i.Item)
                        .ThenInclude(it => it.Unit)
                .Where(pr => pr.CompanyId == companyId &&
                            pr.nepaliDate >= fromDate && pr.nepaliDate <= toDate &&
                            pr.Items.Any(i => i.ItemId == itemId))
                .ToListAsync();

            foreach (var purchaseReturn in purchaseReturns)
            {
                foreach (var item in purchaseReturn.Items.Where(i => i.ItemId == itemId))
                {
                    entries.Add(CreatePurchaseReturnEntry(purchaseReturn, item));
                }
            }

            // Sales Entries
            var sales = await _context.SalesBills
                .Include(s => s.Account)
                .Include(s => s.Items)
                    .ThenInclude(i => i.Item)
                        .ThenInclude(it => it.Unit)
                .Where(s => s.CompanyId == companyId &&
                           s.nepaliDate >= fromDate && s.nepaliDate <= toDate &&
                           s.Items.Any(i => i.ItemId == itemId))
                .ToListAsync();

            foreach (var sale in sales)
            {
                foreach (var item in sale.Items.Where(i => i.ItemId == itemId))
                {
                    entries.Add(CreateSalesEntry(sale, item));
                }
            }

            // Sales Return Entries
            var salesReturns = await _context.SalesReturns
                .Include(sr => sr.Account)
                .Include(sr => sr.Items)
                    .ThenInclude(i => i.Item)
                        .ThenInclude(it => it.Unit)
                .Where(sr => sr.CompanyId == companyId &&
                            sr.nepaliDate >= fromDate && sr.nepaliDate <= toDate &&
                            sr.Items.Any(i => i.ItemId == itemId))
                .ToListAsync();

            foreach (var salesReturn in salesReturns)
            {
                foreach (var item in salesReturn.Items.Where(i => i.ItemId == itemId))
                {
                    entries.Add(CreateSalesReturnEntry(salesReturn, item));
                }
            }

            // Stock Adjustment Entries
            var adjustments = await _context.StockAdjustments
                .Include(sa => sa.Items)
                    .ThenInclude(i => i.Item)
                        .ThenInclude(it => it.Unit)
                .Where(sa => sa.CompanyId == companyId &&
                            sa.NepaliDate >= fromDate && sa.NepaliDate <= toDate &&
                            sa.Items.Any(i => i.ItemId == itemId))
                .ToListAsync();

            foreach (var adjustment in adjustments)
            {
                foreach (var item in adjustment.Items.Where(i => i.ItemId == itemId))
                {
                    entries.Add(CreateAdjustmentEntry(adjustment, item));
                }
            }

            return entries;
        }

        private LedgerEntryDTO CreatePurchaseEntry(PurchaseBill purchaseBill, PurchaseBillItem itemEntry)
        {
            return new LedgerEntryDTO
            {
                Date = purchaseBill.Date,
                nepaliDate = purchaseBill.nepaliDate,
                TransactionId = purchaseBill.Id,
                PartyName = purchaseBill.Account?.Name ?? "N/A",
                BillNumber = purchaseBill.BillNumber,
                Type = LedgerEntryType.Purchase,
                TypeDisplay = "Purc",
                QtyIn = itemEntry.AltQuantity ?? 0,
                Bonus = itemEntry.AltBonus ?? 0,
                QtyOut = 0,
                Price = itemEntry.AltPuPrice ?? 0,
                Unit = itemEntry.Item?.Unit?.Name ?? "N/A",
                BatchNumber = itemEntry.BatchNumber ?? "N/A",
                ExpiryDate = itemEntry.ExpiryDate?.ToString("yyyy-MM-dd") ?? "N/A",
                Balance = 0
            };
        }

        private LedgerEntryDTO CreatePurchaseReturnEntry(PurchaseReturn purchaseReturn, PurchaseReturnItem itemEntry)
        {
            return new LedgerEntryDTO
            {
                Date = purchaseReturn.Date,
                nepaliDate = purchaseReturn.nepaliDate,
                TransactionId = purchaseReturn.Id,
                PartyName = purchaseReturn.Account?.Name ?? "N/A",
                BillNumber = purchaseReturn.BillNumber,
                Type = LedgerEntryType.PurchaseReturn,
                TypeDisplay = "PrRt",
                QtyIn = 0,
                QtyOut = itemEntry.Quantity ?? 0,
                Price = itemEntry.PuPrice ?? 0,
                Unit = itemEntry.Item?.Unit?.Name ?? "N/A",
                BatchNumber = itemEntry.BatchNumber ?? "N/A",
                ExpiryDate = itemEntry.ExpiryDate?.ToString("yyyy-MM-dd") ?? "N/A",
                Balance = 0
            };
        }

        private LedgerEntryDTO CreateSalesEntry(SalesBill salesBill, SalesBillItem itemEntry)
        {
            return new LedgerEntryDTO
            {
                Date = salesBill.Date,
                nepaliDate = salesBill.nepaliDate,
                TransactionId = salesBill.Id,
                PartyName = salesBill.Account != null ? salesBill.Account.Name : (salesBill.CashAccount ?? "N/A"),
                BillNumber = salesBill.BillNumber,
                Type = LedgerEntryType.Sales,
                TypeDisplay = "Sale",
                QtyIn = 0,
                QtyOut = itemEntry.Quantity,
                Price = itemEntry.Price,
                Unit = itemEntry.Item?.Unit?.Name ?? "N/A",
                BatchNumber = itemEntry.BatchNumber ?? "N/A",
                ExpiryDate = itemEntry.ExpiryDate?.ToString("yyyy-MM-dd") ?? "N/A",
                Balance = 0,
                PaymentMode = salesBill.PaymentMode
            };
        }

        private LedgerEntryDTO CreateSalesReturnEntry(SalesReturn salesReturn, SalesReturnItem itemEntry)
        {
            return new LedgerEntryDTO
            {
                Date = salesReturn.Date,
                nepaliDate = salesReturn.nepaliDate,
                TransactionId = salesReturn.Id,
                PartyName = salesReturn.Account != null ? salesReturn.Account.Name : (salesReturn.CashAccount ?? "N/A"),
                BillNumber = salesReturn.BillNumber,
                Type = LedgerEntryType.SalesReturn,
                TypeDisplay = "SlRt",
                QtyIn = itemEntry.Quantity,
                QtyOut = 0,
                Price = itemEntry.Price,
                Unit = itemEntry.Item?.Unit?.Name ?? "N/A",
                BatchNumber = itemEntry.BatchNumber ?? "N/A",
                ExpiryDate = itemEntry.ExpiryDate?.ToString("yyyy-MM-dd") ?? "N/A",
                Balance = 0
            };
        }

        private LedgerEntryDTO CreateAdjustmentEntry(StockAdjustment adjustment, StockAdjustmentItem itemEntry)
        {
            decimal qtyIn = adjustment.AdjustmentType == "xcess" ? itemEntry.Quantity : 0;
            decimal qtyOut = adjustment.AdjustmentType == "short" ? itemEntry.Quantity : 0;

            return new LedgerEntryDTO
            {
                Date = adjustment.Date,
                nepaliDate = adjustment.NepaliDate,
                TransactionId = adjustment.Id,
                PartyName = "Stock Adjustments",
                BillNumber = adjustment.BillNumber,
                Type = adjustment.AdjustmentType == "xcess" ? LedgerEntryType.Excess : LedgerEntryType.Short,
                TypeDisplay = adjustment.AdjustmentType,
                QtyIn = qtyIn,
                QtyOut = qtyOut,
                Price = itemEntry.PuPrice,
                Unit = itemEntry.Item?.Unit?.Name ?? "N/A",
                BatchNumber = itemEntry.BatchNumber ?? "N/A",
                ExpiryDate = itemEntry.ExpiryDate?.ToString("yyyy-MM-dd") ?? "N/A",
                Balance = 0,
                Reason = string.Join(" ", itemEntry.Reason ?? Array.Empty<string>())
            };
        }
    }
}

