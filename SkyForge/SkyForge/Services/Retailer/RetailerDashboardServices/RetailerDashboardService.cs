using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SkyForge.Data;
using SkyForge.Models.AccountGroupModel;
using SkyForge.Models.AccountModel;
using SkyForge.Models.Retailer;
using SkyForge.Models.Retailer.Items;
using SkyForge.Models.Retailer.PaymentModel;
using SkyForge.Models.Retailer.ReceiptModel;
using SkyForge.Models.Retailer.TransactionModel;
using SkyForge.Models.Shared;
using System.Security.Claims;
using System.Text.Json;

namespace SkyForge.Services.Retailer.RetailerDashboardServices
{
    public class RetailerDashboardService : IRetailerDashboardService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<RetailerDashboardService> _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public RetailerDashboardService(
            ApplicationDbContext context,
            ILogger<RetailerDashboardService> logger,
            IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<DashboardResponse> GetDashboardDataAsync(
            Guid companyId,
            string currentCompanyName,
            string? fiscalYearJson)
        {
            try
            {
                // Fetch company data using Guid
                var company = await _context.Companies
                    .Where(c => c.Id == companyId)
                    .Select(c => new
                    {
                        c.Id,
                        c.Name,
                        c.RenewalDate,
                        c.DateFormat,
                        c.VatEnabled
                    })
                    .FirstOrDefaultAsync();

                if (company == null)
                {
                    return new DashboardResponse
                    {
                        Success = false,
                        Error = "Company not found"
                    };
                }

                // Get fiscal years for the company
                var fiscalYears = await _context.FiscalYears
                    .Where(fy => fy.CompanyId == companyId)
                    .OrderByDescending(fy => fy.IsActive)
                    .ThenByDescending(fy => fy.EndDate)
                    .ToListAsync();

                // Get current fiscal year - either from JSON or from company's active fiscal year
                FiscalYearInfo? currentFiscalYear = null;

                if (!string.IsNullOrEmpty(fiscalYearJson))
                {
                    // Try to parse fiscal year from JSON
                    try
                    {
                        currentFiscalYear = JsonSerializer.Deserialize<FiscalYearInfo>(fiscalYearJson);
                    }
                    catch (JsonException ex)
                    {
                        _logger.LogWarning(ex, "Failed to deserialize fiscal year JSON");
                    }
                }

                // If no fiscal year from JSON, get active fiscal year from company
                if (currentFiscalYear == null && fiscalYears.Any())
                {
                    var fiscalYear = fiscalYears.FirstOrDefault(fy => fy.IsActive) ?? fiscalYears.First();

                    currentFiscalYear = new FiscalYearInfo
                    {
                        Id = fiscalYear.Id.ToString(),
                        Name = fiscalYear.Name ?? string.Empty,
                        StartDate = fiscalYear.StartDate ?? DateTime.Now.AddYears(-1).AddDays(1),
                        EndDate = fiscalYear.EndDate ?? DateTime.Now,
                        IsActive = fiscalYear.IsActive
                    };
                }

                if (currentFiscalYear == null)
                {
                    // Create a default fiscal year for the current year
                    var now = DateTime.Now;
                    var startOfYear = new DateTime(now.Year, 1, 1);
                    var endOfYear = new DateTime(now.Year, 12, 31);

                    currentFiscalYear = new FiscalYearInfo
                    {
                        Id = Guid.NewGuid().ToString(),
                        Name = $"FY {now.Year}",
                        StartDate = startOfYear,
                        EndDate = endOfYear,
                        IsActive = true
                    };
                }

                // Parse fiscal year ID to Guid
                if (!Guid.TryParse(currentFiscalYear.Id, out Guid fiscalYearGuid))
                {
                    fiscalYearGuid = Guid.NewGuid();
                }

                // Get dates for calculations - use current fiscal year
                // Handle nullable dates safely
                DateTime startDate = currentFiscalYear.StartDate;
                DateTime endDate = DateTime.Now <= currentFiscalYear.EndDate
                    ? DateTime.Now
                    : currentFiscalYear.EndDate;

                // For chart data, use the entire fiscal year or last 12 months
                DateTime chartStartDate = startDate;
                DateTime chartEndDate = currentFiscalYear.EndDate;

                // If fiscal year dates are invalid, use last 12 months
                if (startDate >= endDate)
                {
                    endDate = DateTime.Now;
                    startDate = endDate.AddYears(-1);
                    chartStartDate = startDate;
                    chartEndDate = endDate;
                }

                // Execute all financial queries for current fiscal year
                var totalSalesResult = await GetTotalSalesAsync(companyId, startDate, endDate);
                var totalSalesReturnResult = await GetTotalSalesReturnAsync(companyId, startDate, endDate);
                var totalPurchaseResult = await GetTotalPurchaseAsync(companyId, startDate, endDate);
                var totalPurchaseReturnResult = await GetTotalPurchaseReturnAsync(companyId, startDate, endDate);
                var totalStockValueResult = await GetTotalStockValueAsync(companyId);
                var cashAccount = await GetCashAccountAsync(companyId);

                // Calculate balances
                var cashBalance = await CalculateCashBalanceAsync(cashAccount, endDate);
                var bankBalance = await CalculateBankBalanceAsync(companyId, endDate);
                var bankODBalance = await CalculateBankODBalanceAsync(companyId, endDate);
                var netBankBalance = bankBalance + bankODBalance;

                // Calculate net values
                var netSales = totalSalesResult - totalSalesReturnResult;
                var netPurchase = totalPurchaseResult - totalPurchaseReturnResult;

                // Get chart data for the specified period
                var chartData = await GetChartDataAsync(companyId, chartStartDate, chartEndDate, company.DateFormat);

                // Get user info
                var userInfo = GetUserInfo();

                // Prepare response
                return new DashboardResponse
                {
                    Success = true,
                    Data = new DashboardData
                    {
                        FinancialSummary = new FinancialSummary
                        {
                            CashBalance = cashBalance,
                            BankBalance = netBankBalance,
                            TotalStockValue = totalStockValueResult,
                            NetSales = netSales,
                            NetPurchase = netPurchase,
                            GrossSales = totalSalesResult,
                            SalesReturns = totalSalesReturnResult,
                            GrossPurchases = totalPurchaseResult,
                            PurchaseReturns = totalPurchaseReturnResult
                        },
                        ChartData = chartData,
                        Company = new CompanyInfo
                        {
                            Id = company.Id.ToString(),
                            Name = currentCompanyName ?? company.Name ?? string.Empty,
                            DateFormat = company.DateFormat?.ToString() ?? "English",
                            VatEnabled = company.VatEnabled,
                            //RenewalDate = company.RenewalDate ?? string.Empty
                        },
                        FiscalYear = currentFiscalYear,
                        User = userInfo
                    }
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting dashboard data for company {CompanyId}", companyId);

                return new DashboardResponse
                {
                    Success = false,
                    Error = "Internal server error",
                    Details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development"
                        ? ex.Message
                        : null
                };
            }
        }

        private async Task<decimal> GetTotalSalesAsync(Guid companyId, DateTime startDate, DateTime endDate)
        {
            try
            {
                var result = await _context.SalesBills
                    .Where(sb => sb.CompanyId == companyId &&
                                sb.Date >= startDate &&
                                sb.Date <= endDate)
                    .SumAsync(sb => (decimal?)sb.TotalAmount);

                return result ?? 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting total sales for company {CompanyId}", companyId);
                return 0;
            }
        }

        private async Task<decimal> GetTotalSalesReturnAsync(Guid companyId, DateTime startDate, DateTime endDate)
        {
            try
            {
                var result = await _context.SalesReturns
                    .Where(sr => sr.CompanyId == companyId &&
                                sr.Date >= startDate &&
                                sr.Date <= endDate)
                    .SumAsync(sr => (decimal?)sr.TotalAmount);

                return result ?? 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting total sales returns for company {CompanyId}", companyId);
                return 0;
            }
        }

        private async Task<decimal> GetTotalPurchaseAsync(Guid companyId, DateTime startDate, DateTime endDate)
        {
            try
            {
                var result = await _context.PurchaseBills
                    .Where(pb => pb.CompanyId == companyId &&
                                pb.Date >= startDate &&
                                pb.Date <= endDate)
                    .SumAsync(pb => (decimal?)(pb.TaxableAmount + pb.NonVatPurchase));

                return result ?? 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting total purchases for company {CompanyId}", companyId);
                return 0;
            }
        }

        private async Task<decimal> GetTotalPurchaseReturnAsync(Guid companyId, DateTime startDate, DateTime endDate)
        {
            try
            {
                var result = await _context.PurchaseReturns
                    .Where(pr => pr.CompanyId == companyId &&
                                pr.Date >= startDate &&
                                pr.Date <= endDate)
                    .SumAsync(pr => (decimal?)(pr.TaxableAmount + pr.NonVatPurchaseReturn));

                return result ?? 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting total purchase returns for company {CompanyId}", companyId);
                return 0;
            }
        }

        private async Task<decimal> GetTotalStockValueAsync(Guid companyId, Guid? fiscalYearId = null)
        {
            try
            {
                // Build the query
                var query = _context.Items
                    .Where(i => i.CompanyId == companyId && i.Status == "active");

                // If fiscalYearId is provided, filter by fiscal year
                if (fiscalYearId.HasValue)
                {
                    query = query.Where(i => i.FiscalYearId == fiscalYearId.Value);
                }

                // Get all items with their stock entries
                var items = await query
                    .Include(i => i.StockEntries
                        .Where(se => fiscalYearId.HasValue ?
                            (se.FiscalYearId == fiscalYearId.Value) : true)
                        .OrderByDescending(se => se.Date))
                    .ToListAsync();

                decimal totalValue = 0;

                foreach (var item in items)
                {
                    if (item.StockEntries != null && item.StockEntries.Any())
                    {
                        // Calculate total quantity and average price from stock entries
                        var availableStockEntries = item.StockEntries
                            .Where(se => se.Quantity > 0) // Only positive quantities
                            .ToList();

                        if (availableStockEntries.Any())
                        {
                            // Method 1: FIFO - Calculate using actual stock entries
                            foreach (var stockEntry in availableStockEntries)
                            {
                                totalValue += stockEntry.Quantity * stockEntry.PuPrice;
                            }
                        }
                        else
                        {
                            // No available stock entries, check opening stock
                            totalValue += await GetItemOpeningStockValueAsync(item, fiscalYearId);
                        }
                    }
                    else
                    {
                        // No stock entries, use opening stock data
                        totalValue += await GetItemOpeningStockValueAsync(item, fiscalYearId);
                    }
                }

                return totalValue;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating stock value for company {CompanyId}", companyId);
                return 0;
            }
        }

        private async Task<decimal> GetItemOpeningStockValueAsync(Item item, Guid? fiscalYearId = null)
        {
            decimal openingStockValue = 0;

            try
            {
                // Check if we have specific fiscal year data
                if (fiscalYearId.HasValue)
                {
                    // Look for opening stock in OpeningStocksByFiscalYear navigation property
                    var openingStockData = item.OpeningStocksByFiscalYear
                        ?.FirstOrDefault(os => os.FiscalYearId == fiscalYearId.Value);

                    if (openingStockData != null)
                    {
                        openingStockValue = openingStockData.OpeningStock * openingStockData.PurchasePrice;
                        return openingStockValue;
                    }

                    // Look for closing stock from previous year in ClosingStocksByFiscalYear navigation property
                    var closingStockData = item.ClosingStocksByFiscalYear
                        ?.FirstOrDefault(cs => cs.FiscalYearId == fiscalYearId.Value);

                    if (closingStockData != null)
                    {
                        openingStockValue = closingStockData.ClosingStock * closingStockData.PurchasePrice;
                        return openingStockValue;
                    }
                }

                // If no fiscal year specific data, use initial opening stock from navigation property
                if (item.InitialOpeningStock != null && item.InitialOpeningStock.OpeningStock > 0)
                {
                    openingStockValue = item.InitialOpeningStock.OpeningStock * item.InitialOpeningStock.PurchasePrice;
                }
                // Fallback to basic opening stock
                else if (item.OpeningStock > 0)
                {
                    // Use PuPrice or MainUnitPuPrice for valuation
                    var purchasePrice = item.PuPrice ?? item.MainUnitPuPrice;
                    openingStockValue = item.OpeningStock * purchasePrice;
                }

                return openingStockValue;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error getting opening stock value for item {ItemId}", item.Id);
                return 0;
            }
        }

        // You can also add a method to get current stock with detailed breakdown
        private async Task<StockSummaryDto> GetStockSummaryAsync(Guid companyId, Guid fiscalYearId)
        {
            var summary = new StockSummaryDto();

            try
            {
                // Get all active items for the company and fiscal year
                var items = await _context.Items
                    .Where(i => i.CompanyId == companyId &&
                               i.FiscalYearId == fiscalYearId &&
                               i.Status == "active")
                    .Include(i => i.StockEntries
                        .Where(se => se.Quantity > 0 && se.FiscalYearId == fiscalYearId)
                        .OrderBy(se => se.ExpiryDate))
                    .ToListAsync();

                foreach (var item in items)
                {
                    var itemSummary = new ItemStockSummaryDto
                    {
                        ItemId = item.Id,
                        ItemName = item.Name,
                        ItemCode = item.BarcodeNumber.ToString(),
                        Unit = item.Unit?.Name ?? "N/A",
                        MainUnit = item.MainUnit?.Name ?? "N/A"
                    };

                    // Calculate from stock entries (FIFO)
                    if (item.StockEntries != null && item.StockEntries.Any())
                    {
                        itemSummary.CurrentQuantity = item.StockEntries.Sum(se => se.Quantity);
                        itemSummary.TotalValue = item.StockEntries.Sum(se => se.Quantity * se.NetPuPrice);
                        itemSummary.AveragePrice = itemSummary.CurrentQuantity > 0 ?
                            itemSummary.TotalValue / itemSummary.CurrentQuantity : 0;

                        // Track expiring items
                        var expiringEntries = item.StockEntries
                            .Where(se => se.DaysUntilExpiry <= 30 && se.DaysUntilExpiry > 0)
                            .ToList();

                        if (expiringEntries.Any())
                        {
                            itemSummary.ExpiringQuantity = expiringEntries.Sum(se => se.Quantity);
                            itemSummary.ExpiringValue = expiringEntries.Sum(se => se.Quantity * se.NetPuPrice);
                        }
                    }
                    else
                    {
                        // Use opening stock
                        var openingValue = await GetItemOpeningStockValueAsync(item, fiscalYearId);
                        itemSummary.CurrentQuantity = item.OpeningStock;
                        itemSummary.TotalValue = openingValue;
                        itemSummary.AveragePrice = itemSummary.CurrentQuantity > 0 ?
                            openingValue / itemSummary.CurrentQuantity : 0;
                    }

                    // Check against reorder levels
                    if (itemSummary.CurrentQuantity <= item.ReorderLevel)
                    {
                        itemSummary.NeedsReorder = true;
                        itemSummary.ReorderQuantity = item.MaxStock - itemSummary.CurrentQuantity;
                    }

                    summary.Items.Add(itemSummary);
                    summary.TotalQuantity += itemSummary.CurrentQuantity;
                    summary.TotalValue += itemSummary.TotalValue;
                    summary.TotalExpiringValue += itemSummary.ExpiringValue;

                    if (itemSummary.NeedsReorder)
                    {
                        summary.ItemsNeedingReorder++;
                    }
                }

                summary.AveragePrice = summary.TotalQuantity > 0 ?
                    summary.TotalValue / summary.TotalQuantity : 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting stock summary for company {CompanyId}", companyId);
            }

            return summary;
        }

        // DTOs for stock summary
        public class StockSummaryDto
        {
            public List<ItemStockSummaryDto> Items { get; set; } = new();
            public decimal TotalQuantity { get; set; }
            public decimal TotalValue { get; set; }
            public decimal TotalExpiringValue { get; set; }
            public decimal AveragePrice { get; set; }
            public int ItemsNeedingReorder { get; set; }
        }

        public class ItemStockSummaryDto
        {
            public Guid ItemId { get; set; }
            public string ItemName { get; set; } = string.Empty;
            public string ItemCode { get; set; } = string.Empty;
            public string Unit { get; set; } = string.Empty;
            public string MainUnit { get; set; } = string.Empty;
            public decimal CurrentQuantity { get; set; }
            public decimal TotalValue { get; set; }
            public decimal AveragePrice { get; set; }
            public decimal ExpiringQuantity { get; set; }
            public decimal ExpiringValue { get; set; }
            public bool NeedsReorder { get; set; }
            public decimal ReorderQuantity { get; set; }
        }

        private async Task<Account?> GetCashAccountAsync(Guid companyId)
        {
            try
            {
                return await _context.Accounts
                    .FirstOrDefaultAsync(a => a.CompanyId == companyId &&
                                             a.DefaultCashAccount &&
                                             a.IsActive);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting cash account for company {CompanyId}", companyId);
                return null;
            }
        }

        private async Task<decimal> CalculateCashBalanceAsync(Account? cashAccount, DateTime endDate)
        {
            decimal cashBalance = 0;

            if (cashAccount != null)
            {
                try
                {
                    // Try to get initial opening balance
                    if (cashAccount.InitialOpeningBalance != null)
                    {
                        var openingBalance = cashAccount.InitialOpeningBalance;
                        if (openingBalance.Type == "Dr")
                        {
                            cashBalance += openingBalance.Amount;
                        }
                        else if (openingBalance.Type == "Cr")
                        {
                            cashBalance -= openingBalance.Amount;
                        }
                    }

                    // Get all transactions for this cash account up to the end date
                    var cashTransactions = await _context.Transactions
                        .Where(t => t.AccountId == cashAccount.Id &&
                                   t.Date <= endDate &&
                                   t.Status == TransactionStatus.Active)
                        .ToListAsync();

                    foreach (var transaction in cashTransactions)
                    {
                        cashBalance += (transaction.Debit - transaction.Credit);
                    }

                    // Also check if there are any payments/receipts directly linked to this account
                    // var cashPayments = await _context.Payments
                    //     .Where(p => p.PaymentAccountId == cashAccount.Id &&
                    //                p.Date <= endDate &&
                    //                p.Status == PaymentStatus.Active)
                    //     .ToListAsync();

                    // foreach (var payment in cashPayments)
                    // {
                    //     cashBalance -= payment.Debit; // Payments reduce cash
                    // }

                    // var cashReceipts = await _context.Receipts
                    //     .Where(r => r.ReceiptAccountId == cashAccount.Id &&
                    //                r.Date <= endDate &&
                    //                r.Status == ReceiptStatus.Active)
                    //     .ToListAsync();

                    // foreach (var receipt in cashReceipts)
                    // {
                    //     cashBalance += receipt.Debit; // Receipts increase cash
                    // }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error calculating cash balance for account {AccountId}", cashAccount.Id);
                }
            }

            return cashBalance;
        }

        private async Task<decimal> CalculateBankBalanceAsync(Guid companyId, DateTime endDate)
        {
            try
            {
                decimal balance = 0;

                // Get Bank Accounts group - using AccountGroups table
                var bankGroup = await _context.AccountGroups
                    .FirstOrDefaultAsync(cg => cg.CompanyId == companyId &&
                                              cg.Name == "Bank Accounts");

                if (bankGroup != null)
                {
                    var bankAccounts = await _context.Accounts
                        .Where(a => a.CompanyId == companyId &&
                                   a.AccountGroupsId == bankGroup.Id &&
                                   a.IsActive)
                        .ToListAsync();

                    foreach (var account in bankAccounts)
                    {
                        decimal accountBalance = 0;

                        // Add initial opening balance
                        if (account.InitialOpeningBalance != null)
                        {
                            var openingBalance = account.InitialOpeningBalance;
                            if (openingBalance.Type == "Dr")
                            {
                                accountBalance += openingBalance.Amount;
                            }
                            else if (openingBalance.Type == "Cr")
                            {
                                accountBalance -= openingBalance.Amount;
                            }
                        }

                        // Get all transactions for this account
                        var transactions = await _context.Transactions
                            .Where(t => t.AccountId == account.Id &&
                                       t.Date <= endDate &&
                                       t.Status == TransactionStatus.Active)
                            .ToListAsync();

                        foreach (var transaction in transactions)
                        {
                            accountBalance += (transaction.Debit - transaction.Credit);
                        }

                        // Check for payments/receipts through this bank account
                        // var payments = await _context.Payments
                        //     .Where(p => p.PaymentAccountId == account.Id &&
                        //                p.Date <= endDate &&
                        //                p.Status == PaymentStatus.Active)
                        //     .ToListAsync();

                        // foreach (var payment in payments)
                        // {
                        //     accountBalance -= payment.Debit;
                        // }

                        // var receipts = await _context.Receipts
                        //     .Where(r => r.ReceiptAccountId == account.Id &&
                        //                r.Date <= endDate &&
                        //                r.Status == ReceiptStatus.Active)
                        //     .ToListAsync();

                        // foreach (var receipt in receipts)
                        // {
                        //     accountBalance += receipt.Debit;
                        // }

                        balance += accountBalance;
                    }
                }

                return balance;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating bank balance for company {CompanyId}", companyId);
                return 0;
            }
        }

        private async Task<decimal> CalculateBankODBalanceAsync(Guid companyId, DateTime endDate)
        {
            try
            {
                decimal balance = 0;

                // Get Bank O/D Account group
                var bankODGroup = await _context.AccountGroups
                    .FirstOrDefaultAsync(cg => cg.CompanyId == companyId &&
                                              cg.Name == "Bank O/D Account");

                if (bankODGroup != null)
                {
                    var bankODAccounts = await _context.Accounts
                        .Where(a => a.CompanyId == companyId &&
                                   a.AccountGroupsId == bankODGroup.Id &&
                                   a.IsActive)
                        .ToListAsync();

                    foreach (var account in bankODAccounts)
                    {
                        decimal accountBalance = 0;

                        // Add initial opening balance
                        if (account.InitialOpeningBalance != null)
                        {
                            var openingBalance = account.InitialOpeningBalance;
                            if (openingBalance.Type == "Dr")
                            {
                                accountBalance += openingBalance.Amount;
                            }
                            else if (openingBalance.Type == "Cr")
                            {
                                accountBalance -= openingBalance.Amount;
                            }
                        }

                        // Get all transactions for this account
                        var transactions = await _context.Transactions
                            .Where(t => t.AccountId == account.Id &&
                                       t.Date <= endDate &&
                                       t.Status == TransactionStatus.Active)
                            .ToListAsync();

                        foreach (var transaction in transactions)
                        {
                            accountBalance += (transaction.Debit - transaction.Credit);
                        }

                        balance += accountBalance;
                    }
                }

                return balance;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating bank OD balance for company {CompanyId}", companyId);
                return 0;
            }
        }

        private async Task<ChartData> GetChartDataAsync(Guid companyId, DateTime startDate, DateTime endDate, DateFormatEnum? dateFormat)
        {
            try
            {
                // Get monthly sales data - assuming SalesBill has Status field
                var salesData = await _context.SalesBills
                    .Where(sb => sb.CompanyId == companyId &&
                                sb.Date >= startDate &&
                                sb.Date <= endDate)
                    // Check if Status property exists before filtering
                    //.WhereIfHasProperty(_context, "Status", "active") // Custom extension method
                    .GroupBy(sb => new { Year = sb.Date.Year, Month = sb.Date.Month })
                    .Select(g => new
                    {
                        g.Key.Year,
                        g.Key.Month,
                        TotalSales = g.Sum(sb => (decimal?)sb.TotalAmount) ?? 0
                    })
                    .OrderBy(x => x.Year)
                    .ThenBy(x => x.Month)
                    .ToListAsync();

                // Get monthly sales returns data - SalesReturn doesn't have Status field
                var returnsData = await _context.SalesReturns
                    .Where(sr => sr.CompanyId == companyId &&
                                sr.Date >= startDate &&
                                sr.Date <= endDate)
                    // No status filter since SalesReturn doesn't have Status property
                    .GroupBy(sr => new { Year = sr.Date.Year, Month = sr.Date.Month })
                    .Select(g => new
                    {
                        g.Key.Year,
                        g.Key.Month,
                        TotalReturns = g.Sum(sr => (decimal?)sr.TotalAmount) ?? 0
                    })
                    .OrderBy(x => x.Year)
                    .ThenBy(x => x.Month)
                    .ToListAsync();

                var categories = new List<string>();
                var netSalesData = new List<decimal>();

                bool isNepaliFormat = dateFormat == DateFormatEnum.Nepali;
                string[] nepaliMonths = { "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra", "Baisakh", "Jestha", "Ashad" };

                // Generate data for all months in the range
                var currentMonth = new DateTime(startDate.Year, startDate.Month, 1);
                var endMonth = new DateTime(endDate.Year, endDate.Month, 1);

                while (currentMonth <= endMonth)
                {
                    var sales = salesData.FirstOrDefault(s => s.Year == currentMonth.Year && s.Month == currentMonth.Month);
                    var returns = returnsData.FirstOrDefault(r => r.Year == currentMonth.Year && r.Month == currentMonth.Month);

                    decimal totalSales = sales?.TotalSales ?? 0;
                    decimal totalReturns = returns?.TotalReturns ?? 0;

                    string formattedDate;
                    if (isNepaliFormat)
                    {
                        // Note: Nepali calendar calculation needs proper conversion
                        // This is a simplified version - you may need a proper Nepali date library
                        int monthIndex = (currentMonth.Month + 4) % 12; // Approximate adjustment
                        formattedDate = $"{nepaliMonths[monthIndex]} {currentMonth.Year}";
                    }
                    else
                    {
                        formattedDate = $"{currentMonth:MMM} {currentMonth:yyyy}";
                    }

                    categories.Add(formattedDate);
                    netSalesData.Add(totalSales - totalReturns); // Net sales (sales minus returns)

                    currentMonth = currentMonth.AddMonths(1);
                }

                if (categories.Count == 0)
                {
                    // Add at least one data point
                    var now = DateTime.Now;
                    string formattedDate = isNepaliFormat
                        ? "कुनै डाटा उपलब्ध छैन"
                        : "No Data Available";

                    categories.Add(formattedDate);
                    netSalesData.Add(0);
                }

                return new ChartData
                {
                    Categories = categories,
                    Series = new List<SeriesData>
            {
                new SeriesData
                {
                    Name = "Net Sales",
                    Data = netSalesData
                }
            }
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting chart data for company {CompanyId}", companyId);

                bool isNepaliFormat = dateFormat == DateFormatEnum.Nepali;

                return new ChartData
                {
                    Categories = new List<string> { isNepaliFormat ? "कुनै डाटा उपलब्ध छैन" : "No Data Available" },
                    Series = new List<SeriesData>
            {
                new SeriesData
                {
                    Name = "Net Sales",
                    Data = new List<decimal> { 0 }
                }
            }
                };
            }
        }

        private UserInfo GetUserInfo()
        {
            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext == null)
                return new UserInfo
                {
                    Id = string.Empty,
                    Name = string.Empty,
                    Email = string.Empty,
                    IsAdmin = false,
                    Role = string.Empty,
                    IsAdminOrSupervisor = false
                };

            var user = httpContext.User;
            var isAdmin = user.IsInRole("Admin");
            var role = user.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
            var isAdminOrSupervisor = isAdmin || role == "Supervisor";

            return new UserInfo
            {
                Id = user.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty,
                Name = user.FindFirst(ClaimTypes.Name)?.Value ?? string.Empty,
                Email = user.FindFirst(ClaimTypes.Email)?.Value ?? string.Empty,
                IsAdmin = isAdmin,
                Role = role,
                IsAdminOrSupervisor = isAdminOrSupervisor
            };
        }

    }
}