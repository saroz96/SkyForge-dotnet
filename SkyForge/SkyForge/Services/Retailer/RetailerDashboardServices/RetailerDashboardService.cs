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
                    try
                    {
                        currentFiscalYear = JsonSerializer.Deserialize<FiscalYearInfo>(fiscalYearJson);
                    }
                    catch (JsonException ex)
                    {
                        _logger.LogWarning(ex, "Failed to deserialize fiscal year JSON");
                    }
                }

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

                if (!Guid.TryParse(currentFiscalYear.Id, out Guid fiscalYearGuid))
                {
                    fiscalYearGuid = Guid.NewGuid();
                }

                // Get dates for calculations
                DateTime startDate = currentFiscalYear.StartDate;
                DateTime endDate = DateTime.Now <= currentFiscalYear.EndDate
                    ? DateTime.Now
                    : currentFiscalYear.EndDate;

                DateTime chartStartDate = startDate;
                DateTime chartEndDate = currentFiscalYear.EndDate;

                if (startDate >= endDate)
                {
                    endDate = DateTime.Now;
                    startDate = endDate.AddYears(-1);
                    chartStartDate = startDate;
                    chartEndDate = endDate;
                }

                // Execute all financial queries
                var totalSalesResult = await GetTotalSalesAsync(companyId, startDate, endDate);
                var totalSalesReturnResult = await GetTotalSalesReturnAsync(companyId, startDate, endDate);
                var totalPurchaseResult = await GetTotalPurchaseAsync(companyId, startDate, endDate);
                var totalPurchaseReturnResult = await GetTotalPurchaseReturnAsync(companyId, startDate, endDate);

                // FIXED: Get total stock value using proper calculation
                var totalStockValueResult = await GetTotalStockValueAsync(companyId);

                var cashAccount = await GetCashAccountAsync(companyId);

                var cashBalance = await CalculateCashBalanceAsync(cashAccount, endDate);
                var bankBalance = await CalculateBankBalanceAsync(companyId, endDate);
                var bankODBalance = await CalculateBankODBalanceAsync(companyId, endDate);
                var netBankBalance = bankBalance + bankODBalance;

                var netSales = totalSalesResult - totalSalesReturnResult;
                var netPurchase = totalPurchaseResult - totalPurchaseReturnResult;

                var chartData = await GetChartDataAsync(companyId, chartStartDate, chartEndDate, company.DateFormat);

                var pieChartData = await GetPieChartDataAsync(companyId, startDate, endDate);

                var topItemsByTransaction = await GetTopItemsByTransactionAsync(companyId, startDate, endDate, 10);
                var topItemsByRevenue = await GetTopItemsByRevenueAsync(companyId, startDate, endDate, 10);
                var topItemsByFrequency = await GetTopItemsByFrequencyAsync(companyId, startDate, endDate, 10);

                var topCustomersByPurchase = await GetTopCustomersByPurchaseAsync(companyId, startDate, endDate, 10);
                var topCustomersByFrequency = await GetTopCustomersByFrequencyAsync(companyId, startDate, endDate, 10);
                var topCustomersByAverageValue = await GetTopCustomersByAverageValueAsync(companyId, startDate, endDate, 10);
                var topCustomersByOutstanding = await GetTopCustomersByOutstandingAsync(companyId, 10);

                var userInfo = GetUserInfo();

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
                        PieChartData = pieChartData,
                        TopItemsByTransaction = topItemsByTransaction,
                        TopItemsByRevenue = topItemsByRevenue,
                        TopItemsByFrequency = topItemsByFrequency,
                        TopCustomersByPurchase = topCustomersByPurchase,
                        TopCustomersByFrequency = topCustomersByFrequency,
                        TopCustomersByAverageValue = topCustomersByAverageValue,
                        TopCustomersByOutstanding = topCustomersByOutstanding,
                        Company = new CompanyInfo
                        {
                            Id = company.Id.ToString(),
                            Name = currentCompanyName ?? company.Name ?? string.Empty,
                            DateFormat = company.DateFormat?.ToString() ?? "English",
                            VatEnabled = company.VatEnabled,
                            RenewalDate = company.RenewalDate ?? string.Empty
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

        // FIXED: Proper stock value calculation using StockEntries
        private async Task<decimal> GetTotalStockValueAsync(Guid companyId)
        {
            try
            {
                _logger.LogInformation("Calculating total stock value for company {CompanyId}", companyId);

                // Get all stock entries for active items in this fiscal year
                var stockEntries = await _context.StockEntries
                    .AsNoTracking()
                    .Include(se => se.Item)
                    .Where(se => se.Item != null &&
                                se.Item.CompanyId == companyId &&
                                se.Item.Status == "active" &&
                                se.Quantity > 0)
                    .ToListAsync();

                // Calculate total value: Sum of (Quantity × PuPrice)
                decimal totalStockValue = stockEntries.Sum(se => se.Quantity * se.PuPrice);

                _logger.LogInformation("Total stock value calculated: {TotalValue} from {EntryCount} stock entries",
                    totalStockValue, stockEntries.Count);

                return totalStockValue;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating total stock value for company {CompanyId}", companyId);
                return 0;
            }
        }

        // Alternative: Get stock value including opening stock for items without stock entries
        private async Task<decimal> GetTotalStockValueIncludingOpeningAsync(Guid companyId, Guid fiscalYearId, DateTime asOfDate)
        {
            try
            {
                decimal totalValue = 0;

                // Get all active items
                var items = await _context.Items
                    .AsNoTracking()
                    .Where(i => i.CompanyId == companyId && i.Status == "active")
                    .Include(i => i.InitialOpeningStock)
                    .ToListAsync();

                foreach (var item in items)
                {
                    // Get stock entries for this item
                    var stockEntries = await _context.StockEntries
                        .AsNoTracking()
                        .Where(se => se.ItemId == item.Id &&
                                   se.Quantity > 0 &&
                                   se.FiscalYearId == fiscalYearId &&
                                   se.Date <= asOfDate)
                        .ToListAsync();

                    if (stockEntries.Any())
                    {
                        // Calculate from stock entries
                        totalValue += stockEntries.Sum(se => se.Quantity * se.PuPrice);
                    }
                    else
                    {
                        // Use opening stock
                        decimal openingQty = 0;
                        decimal openingPrice = 0;

                        if (item.InitialOpeningStock != null)
                        {
                            openingQty = item.InitialOpeningStock.OpeningStock;
                            openingPrice = item.InitialOpeningStock.PurchasePrice;
                        }
                        else
                        {
                            openingQty = item.OpeningStock;
                            openingPrice = item.PuPrice ?? item.MainUnitPuPrice;
                        }

                        totalValue += openingQty * openingPrice;
                    }
                }

                return totalValue;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating total stock value with opening for company {CompanyId}", companyId);
                return 0;
            }
        }

        // Rest of your existing methods remain the same...
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

                    var cashTransactions = await _context.Transactions
                        .Where(t => t.AccountId == cashAccount.Id &&
                                   t.Date <= endDate &&
                                   t.Status == TransactionStatus.Active)
                        .ToListAsync();

                    foreach (var transaction in cashTransactions)
                    {
                        cashBalance += (transaction.TotalDebit - transaction.TotalCredit);
                    }
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
                decimal totalBalance = 0;

                var bankGroup = await _context.AccountGroups
                    .FirstOrDefaultAsync(cg => cg.CompanyId == companyId &&
                                              cg.Name == "Bank Accounts");

                if (bankGroup != null)
                {
                    var bankAccounts = await _context.Accounts
                        .Where(a => a.CompanyId == companyId &&
                                   a.AccountGroupsId == bankGroup.Id &&
                                   a.IsActive)
                        .Include(a => a.InitialOpeningBalance) // Make sure to include this
                        .ToListAsync();

                    foreach (var account in bankAccounts)
                    {
                        decimal accountBalance = 0;

                        // Include initial opening balance
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

                        // Get all transactions for this account up to endDate
                        var transactions = await _context.Transactions
                            .Where(t => t.AccountId == account.Id &&
                                       t.Date <= endDate &&
                                       t.Status == TransactionStatus.Active)
                            .ToListAsync();

                        // Process transactions (Debit increases asset, Credit decreases asset)
                        foreach (var transaction in transactions)
                        {
                            accountBalance += transaction.TotalDebit - transaction.TotalCredit;
                        }

                        totalBalance += accountBalance;
                    }
                }

                return totalBalance;
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

                var bankODGroup = await _context.AccountGroups
                    .FirstOrDefaultAsync(cg => cg.CompanyId == companyId &&
                                              cg.Name == "Bank O/D Account");

                if (bankODGroup != null)
                {
                    var bankODAccounts = await _context.Accounts
                        .Where(a => a.CompanyId == companyId &&
                                   a.AccountGroupsId == bankODGroup.Id &&
                                   a.IsActive)
                        .Include(a => a.InitialOpeningBalance) // Include opening balance
                        .ToListAsync();

                    foreach (var account in bankODAccounts)
                    {
                        decimal accountBalance = 0;

                        // For Bank O/D: Credit balance increases overdraft (liability)
                        if (account.InitialOpeningBalance != null)
                        {
                            var openingBalance = account.InitialOpeningBalance;
                            if (openingBalance.Type == "Cr")
                            {
                                // Credit opening balance adds to overdraft liability
                                accountBalance += openingBalance.Amount;
                            }
                            else if (openingBalance.Type == "Dr")
                            {
                                // Debit opening balance reduces overdraft liability
                                accountBalance -= openingBalance.Amount;
                            }
                        }

                        var transactions = await _context.Transactions
                            .Where(t => t.AccountId == account.Id &&
                                       t.Date <= endDate &&
                                       t.Status == TransactionStatus.Active)
                            .ToListAsync();

                        // For Bank O/D (Liability/Credit account):
                        // Credit increases the overdraft (liability)
                        // Debit decreases the overdraft (liability)
                        foreach (var transaction in transactions)
                        {
                            accountBalance += (transaction.TotalCredit - transaction.TotalDebit);
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

        // private async Task<ChartData> GetChartDataAsync(Guid companyId, DateTime startDate, DateTime endDate, DateFormatEnum? dateFormat)
        // {
        //     try
        //     {
        //         var salesData = await _context.SalesBills
        //             .Where(sb => sb.CompanyId == companyId &&
        //                         sb.Date >= startDate &&
        //                         sb.Date <= endDate)
        //             .GroupBy(sb => new { Year = sb.Date.Year, Month = sb.Date.Month })
        //             .Select(g => new
        //             {
        //                 g.Key.Year,
        //                 g.Key.Month,
        //                 TotalSales = g.Sum(sb => (decimal?)sb.TotalAmount) ?? 0
        //             })
        //             .OrderBy(x => x.Year)
        //             .ThenBy(x => x.Month)
        //             .ToListAsync();

        //         var returnsData = await _context.SalesReturns
        //             .Where(sr => sr.CompanyId == companyId &&
        //                         sr.Date >= startDate &&
        //                         sr.Date <= endDate)
        //             .GroupBy(sr => new { Year = sr.Date.Year, Month = sr.Date.Month })
        //             .Select(g => new
        //             {
        //                 g.Key.Year,
        //                 g.Key.Month,
        //                 TotalReturns = g.Sum(sr => (decimal?)sr.TotalAmount) ?? 0
        //             })
        //             .OrderBy(x => x.Year)
        //             .ThenBy(x => x.Month)
        //             .ToListAsync();

        //         var categories = new List<string>();
        //         var netSalesData = new List<decimal>();

        //         bool isNepaliFormat = dateFormat == DateFormatEnum.Nepali;
        //         string[] nepaliMonths = { "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra", "Baisakh", "Jestha", "Ashad" };

        //         var currentMonth = new DateTime(startDate.Year, startDate.Month, 1);
        //         var endMonth = new DateTime(endDate.Year, endDate.Month, 1);

        //         while (currentMonth <= endMonth)
        //         {
        //             var sales = salesData.FirstOrDefault(s => s.Year == currentMonth.Year && s.Month == currentMonth.Month);
        //             var returns = returnsData.FirstOrDefault(r => r.Year == currentMonth.Year && r.Month == currentMonth.Month);

        //             decimal totalSales = sales?.TotalSales ?? 0;
        //             decimal totalReturns = returns?.TotalReturns ?? 0;

        //             string formattedDate;
        //             if (isNepaliFormat)
        //             {
        //                 int monthIndex = (currentMonth.Month + 4) % 12;
        //                 formattedDate = $"{nepaliMonths[monthIndex]} {currentMonth.Year}";
        //             }
        //             else
        //             {
        //                 formattedDate = $"{currentMonth:MMM} {currentMonth:yyyy}";
        //             }

        //             categories.Add(formattedDate);
        //             netSalesData.Add(totalSales - totalReturns);

        //             currentMonth = currentMonth.AddMonths(1);
        //         }

        //         if (categories.Count == 0)
        //         {
        //             var now = DateTime.Now;
        //             string formattedDate = isNepaliFormat
        //                 ? "कुनै डाटा उपलब्ध छैन"
        //                 : "No Data Available";

        //             categories.Add(formattedDate);
        //             netSalesData.Add(0);
        //         }

        //         return new ChartData
        //         {
        //             Categories = categories,
        //             Series = new List<SeriesData>
        //             {
        //                 new SeriesData
        //                 {
        //                     Name = "Net Sales",
        //                     Data = netSalesData
        //                 }
        //             }
        //         };
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error getting chart data for company {CompanyId}", companyId);

        //         bool isNepaliFormat = dateFormat == DateFormatEnum.Nepali;

        //         return new ChartData
        //         {
        //             Categories = new List<string> { isNepaliFormat ? "कुनै डाटा उपलब्ध छैन" : "No Data Available" },
        //             Series = new List<SeriesData>
        //             {
        //                 new SeriesData
        //                 {
        //                     Name = "Net Sales",
        //                     Data = new List<decimal> { 0 }
        //                 }
        //             }
        //         };
        //     }
        // }

        //--------------------------------------end1

        // private async Task<ChartData> GetChartDataAsync(Guid companyId, DateTime startDate, DateTime endDate, DateFormatEnum? dateFormat)
        // {
        //     try
        //     {
        //         var salesData = await _context.SalesBills
        //             .Where(sb => sb.CompanyId == companyId &&
        //                         sb.Date >= startDate &&
        //                         sb.Date <= endDate)
        //             .GroupBy(sb => new { Year = sb.Date.Year, Month = sb.Date.Month })
        //             .Select(g => new
        //             {
        //                 g.Key.Year,
        //                 g.Key.Month,
        //                 TotalSales = g.Sum(sb => (decimal?)sb.TotalAmount) ?? 0
        //             })
        //             .OrderBy(x => x.Year)
        //             .ThenBy(x => x.Month)
        //             .ToListAsync();

        //         var returnsData = await _context.SalesReturns
        //             .Where(sr => sr.CompanyId == companyId &&
        //                         sr.Date >= startDate &&
        //                         sr.Date <= endDate)
        //             .GroupBy(sr => new { Year = sr.Date.Year, Month = sr.Date.Month })
        //             .Select(g => new
        //             {
        //                 g.Key.Year,
        //                 g.Key.Month,
        //                 TotalReturns = g.Sum(sr => (decimal?)sr.TotalAmount) ?? 0
        //             })
        //             .OrderBy(x => x.Year)
        //             .ThenBy(x => x.Month)
        //             .ToListAsync();

        //         var categories = new List<string>();
        //         var netSalesData = new List<decimal>();

        //         bool isNepaliFormat = dateFormat == DateFormatEnum.Nepali;

        //         // Nepali months in order (index 0 = Baisakh, index 3 = Shrawan, etc.)
        //         string[] nepaliMonths = {
        //     "Baisakh", "Jestha", "Ashad", "Shrawan", "Bhadra", "Ashwin",
        //     "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"
        // };

        //         // BS month numbers (1-based): Baisakh=1, Jestha=2, Ashad=3, Shrawan=4, etc.
        //         // Shrawan = month 4 in BS

        //         var currentMonth = new DateTime(startDate.Year, startDate.Month, 1);
        //         var endMonth = new DateTime(endDate.Year, endDate.Month, 1);

        //         while (currentMonth <= endMonth)
        //         {
        //             var sales = salesData.FirstOrDefault(s => s.Year == currentMonth.Year && s.Month == currentMonth.Month);
        //             var returns = returnsData.FirstOrDefault(r => r.Year == currentMonth.Year && r.Month == currentMonth.Month);

        //             decimal totalSales = sales?.TotalSales ?? 0;
        //             decimal totalReturns = returns?.TotalReturns ?? 0;

        //             string formattedDate;
        //             if (isNepaliFormat)
        //             {
        //                 int bsMonthIndex;
        //                 int bsYear;

        //                 // Convert AD month to BS month based on the actual date ranges
        //                 // Using the first day of the month to determine the BS month
        //                 DateTime monthDate = currentMonth;

        //                 // This mapping is based on the fact that:
        //                 // Shrawan 1 ≈ July 17
        //                 // Ashad end ≈ July 16
        //                 // So for any date, we need to check if it falls before or after July 17

        //                 // For simplicity with month-level data, we'll map based on the month number
        //                 // with the understanding that each AD month spans parts of two BS months
        //                 // We'll use the 15th day of the month as the reference point
        //                 DateTime midMonth = new DateTime(currentMonth.Year, currentMonth.Month, 15);

        //                 // Convert mid-month date to approximate BS month
        //                 // This is a simplified conversion - for exact conversion, use a proper library
        //                 if (currentMonth.Month == 1) // January
        //                 {
        //                     bsMonthIndex = 9; // Magh
        //                     bsYear = currentMonth.Year - 1;
        //                 }
        //                 else if (currentMonth.Month == 2) // February
        //                 {
        //                     bsMonthIndex = 10; // Falgun
        //                     bsYear = currentMonth.Year - 1;
        //                 }
        //                 else if (currentMonth.Month == 3) // March
        //                 {
        //                     bsMonthIndex = 11; // Chaitra
        //                     bsYear = currentMonth.Year - 1;
        //                 }
        //                 else if (currentMonth.Month == 4) // April
        //                 {
        //                     bsMonthIndex = 0; // Baisakh
        //                     bsYear = currentMonth.Year - 1;
        //                 }
        //                 else if (currentMonth.Month == 5) // May
        //                 {
        //                     bsMonthIndex = 1; // Jestha
        //                     bsYear = currentMonth.Year;
        //                 }
        //                 else if (currentMonth.Month == 6) // June
        //                 {
        //                     bsMonthIndex = 2; // Ashad
        //                     bsYear = currentMonth.Year;
        //                 }
        //                 else if (currentMonth.Month == 7) // July
        //                 {
        //                     // July 1-16 = Ashad, July 17-31 = Shrawan
        //                     // Using 15th as reference, it's Ashad
        //                     bsMonthIndex = 3; // Shrawan
        //                     bsYear = currentMonth.Year;
        //                 }
        //                 else if (currentMonth.Month == 8) // August
        //                 {
        //                     // August 1-16 = Shrawan, August 17-31 = Bhadra
        //                     // Using 15th as reference, it's Shrawan
        //                     bsMonthIndex = 4; // Bhadra
        //                     bsYear = currentMonth.Year;
        //                 }
        //                 else if (currentMonth.Month == 9) // September
        //                 {
        //                     bsMonthIndex = 5; // Ashwin
        //                     bsYear = currentMonth.Year;
        //                 }
        //                 else if (currentMonth.Month == 10) // October
        //                 {
        //                     bsMonthIndex = 6; // Kartik
        //                     bsYear = currentMonth.Year;
        //                 }
        //                 else if (currentMonth.Month == 11) // November
        //                 {
        //                     bsMonthIndex = 7; // Mangsir
        //                     bsYear = currentMonth.Year;
        //                 }
        //                 else if (currentMonth.Month == 12) // December
        //                 {
        //                     bsMonthIndex = 8; // Poush
        //                     bsYear = currentMonth.Year;
        //                 }
        //                 else
        //                 {
        //                     bsMonthIndex = 0;
        //                     bsYear = currentMonth.Year;
        //                 }

        //                 formattedDate = $"{nepaliMonths[bsMonthIndex]} {bsYear}";
        //             }
        //             else
        //             {
        //                 formattedDate = $"{currentMonth:MMM} {currentMonth:yyyy}";
        //             }

        //             categories.Add(formattedDate);
        //             netSalesData.Add(totalSales - totalReturns);

        //             currentMonth = currentMonth.AddMonths(1);
        //         }

        //         if (categories.Count == 0)
        //         {
        //             var now = DateTime.Now;
        //             string formattedDate = isNepaliFormat
        //                 ? "कुनै डाटा उपलब्ध छैन"
        //                 : "No Data Available";

        //             categories.Add(formattedDate);
        //             netSalesData.Add(0);
        //         }

        //         return new ChartData
        //         {
        //             Categories = categories,
        //             Series = new List<SeriesData>
        //     {
        //         new SeriesData
        //         {
        //             Name = "Net Sales",
        //             Data = netSalesData
        //         }
        //     }
        //         };
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error getting chart data for company {CompanyId}", companyId);

        //         bool isNepaliFormat = dateFormat == DateFormatEnum.Nepali;

        //         return new ChartData
        //         {
        //             Categories = new List<string> { isNepaliFormat ? "कुनै डाटा उपलब्ध छैन" : "No Data Available" },
        //             Series = new List<SeriesData>
        //     {
        //         new SeriesData
        //         {
        //             Name = "Net Sales",
        //             Data = new List<decimal> { 0 }
        //         }
        //     }
        //         };
        //     }
        // }

        // private async Task<ChartData> GetChartDataAsync(Guid companyId, DateTime startDate, DateTime endDate, DateFormatEnum? dateFormat)
        // {
        //     try
        //     {
        //         var salesData = await _context.SalesBills
        //             .Where(sb => sb.CompanyId == companyId &&
        //                         sb.Date >= startDate &&
        //                         sb.Date <= endDate)
        //             .GroupBy(sb => new { Year = sb.Date.Year, Month = sb.Date.Month })
        //             .Select(g => new
        //             {
        //                 g.Key.Year,
        //                 g.Key.Month,
        //                 TotalSales = g.Sum(sb => (decimal?)sb.TotalAmount) ?? 0
        //             })
        //             .OrderBy(x => x.Year)
        //             .ThenBy(x => x.Month)
        //             .ToListAsync();

        //         var returnsData = await _context.SalesReturns
        //             .Where(sr => sr.CompanyId == companyId &&
        //                         sr.Date >= startDate &&
        //                         sr.Date <= endDate)
        //             .GroupBy(sr => new { Year = sr.Date.Year, Month = sr.Date.Month })
        //             .Select(g => new
        //             {
        //                 g.Key.Year,
        //                 g.Key.Month,
        //                 TotalReturns = g.Sum(sr => (decimal?)sr.TotalAmount) ?? 0
        //             })
        //             .OrderBy(x => x.Year)
        //             .ThenBy(x => x.Month)
        //             .ToListAsync();

        //         var categories = new List<string>();
        //         var netSalesData = new List<decimal>();

        //         bool isNepaliFormat = dateFormat == DateFormatEnum.Nepali;

        //         // Nepali months in fiscal year order (starting from Shrawan)
        //         string[] nepaliMonths = { 
        //             "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush",
        //             "Magh", "Falgun", "Chaitra", "Baisakh", "Jestha", "Ashad"
        //         };

        //         // Determine the base BS year
        //         // BS year = AD year + 57 (approximately)
        //         int bsYearBase = startDate.Year + 57;

        //         // Loop through exactly 12 months of the fiscal year (Shrawan to Ashad)
        //         for (int i = 0; i < 12; i++)
        //         {
        //             int bsMonthIdx = i;
        //             int bsYear;

        //             // BS Year calculation:
        //             // Shrawan (index 0) to Poush (index 5) = Year Y
        //             // Magh (index 6) to Ashad (index 11) = Year Y+1
        //             if (bsMonthIdx <= 5) // Shrawan to Poush
        //             {
        //                 bsYear = bsYearBase;
        //             }
        //             else // Magh to Ashad
        //             {
        //                 bsYear = bsYearBase + 1;
        //             }

        //             // Map BS month to AD month for fetching data
        //             // This mapping is approximate but works for month-level grouping
        //             int adMonth;
        //             int adYear;

        //             // Map BS month index to AD month
        //             // Shrawan (0) = August, Bhadra (1) = September, etc.
        //             // Poush (5) = January, Magh (6) = February, etc.
        //             // Ashad (11) = July

        //             // For Shrawan to Mangsir (0-4): AD year = BS year - 57
        //             // For Poush to Ashad (5-11): AD year = BS year - 57 (since these are in the same AD year)
        //             // Actually, we need to be careful with the year boundary

        //             if (bsMonthIdx <= 4) // Shrawan to Mangsir (August to December)
        //             {
        //                 adMonth = bsMonthIdx + 8; // 0->8 (August), 1->9 (September), etc.
        //                 adYear = bsYear - 57;
        //             }
        //             else if (bsMonthIdx == 5) // Poush (January)
        //             {
        //                 adMonth = 1;
        //                 adYear = bsYear - 57 + 1; // Poush is in the next AD year
        //             }
        //             else if (bsMonthIdx == 6) // Magh (February)
        //             {
        //                 adMonth = 2;
        //                 adYear = bsYear - 57 + 1;
        //             }
        //             else if (bsMonthIdx == 7) // Falgun (March)
        //             {
        //                 adMonth = 3;
        //                 adYear = bsYear - 57 + 1;
        //             }
        //             else if (bsMonthIdx == 8) // Chaitra (April)
        //             {
        //                 adMonth = 4;
        //                 adYear = bsYear - 57 + 1;
        //             }
        //             else if (bsMonthIdx == 9) // Baisakh (May)
        //             {
        //                 adMonth = 5;
        //                 adYear = bsYear - 57 + 1;
        //             }
        //             else if (bsMonthIdx == 10) // Jestha (June)
        //             {
        //                 adMonth = 6;
        //                 adYear = bsYear - 57 + 1;
        //             }
        //             else // Ashad (July)
        //             {
        //                 adMonth = 7;
        //                 adYear = bsYear - 57 + 1;
        //             }

        //             // Format the category label
        //             string formattedDate;
        //             if (isNepaliFormat)
        //             {
        //                 formattedDate = $"{nepaliMonths[bsMonthIdx]} {bsYear}";
        //             }
        //             else
        //             {
        //                 // For English format, show AD month/year
        //                 DateTime tempDate = new DateTime(adYear, adMonth, 1);
        //                 formattedDate = $"{tempDate:MMM} {tempDate:yyyy}";
        //             }

        //             categories.Add(formattedDate);

        //             // Find sales and returns data for this AD month
        //             var sales = salesData.FirstOrDefault(s => s.Year == adYear && s.Month == adMonth);
        //             var returns = returnsData.FirstOrDefault(r => r.Year == adYear && r.Month == adMonth);

        //             decimal totalSales = sales?.TotalSales ?? 0;
        //             decimal totalReturns = returns?.TotalReturns ?? 0;
        //             netSalesData.Add(totalSales - totalReturns);
        //         }

        //         // Check if we have any data
        //         if (netSalesData.All(d => d == 0) && salesData.Count == 0 && returnsData.Count == 0)
        //         {
        //             categories.Clear();
        //             netSalesData.Clear();

        //             string formattedDate = isNepaliFormat
        //                 ? "कुनै डाटा उपलब्ध छैन"
        //                 : "No Data Available";

        //             categories.Add(formattedDate);
        //             netSalesData.Add(0);
        //         }

        //         return new ChartData
        //         {
        //             Categories = categories,
        //             Series = new List<SeriesData>
        //             {
        //                 new SeriesData
        //                 {
        //                     Name = "Net Sales",
        //                     Data = netSalesData
        //                 }
        //             }
        //         };
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error getting chart data for company {CompanyId}", companyId);

        //         bool isNepaliFormat = dateFormat == DateFormatEnum.Nepali;

        //         return new ChartData
        //         {
        //             Categories = new List<string> { isNepaliFormat ? "कुनै डाटा उपलब्ध छैन" : "No Data Available" },
        //             Series = new List<SeriesData>
        //             {
        //                 new SeriesData
        //                 {
        //                     Name = "Net Sales",
        //                     Data = new List<decimal> { 0 }
        //                 }
        //             }
        //         };
        //     }
        // }

        private async Task<ChartData> GetChartDataAsync(Guid companyId, DateTime startDate, DateTime endDate, DateFormatEnum? dateFormat)
        {
            try
            {
                bool isNepaliFormat = dateFormat == DateFormatEnum.Nepali;

                List<SalesDataGroup> salesData;
                List<ReturnsDataGroup> returnsData;

                if (isNepaliFormat)
                {
                    // When Nepali format is selected, use NepaliDate field for grouping
                    // NepaliDate format example: "2083-04-01" (YYYY-MM-DD)
                    // Where month 4 = Shrawan, month 5 = Bhadra, etc.

                    // Get all sales bills in the date range with their Nepali dates
                    var salesBills = await _context.SalesBills
                        .Where(sb => sb.CompanyId == companyId &&
                                    sb.Date >= startDate &&
                                    sb.Date <= endDate)
                        .Select(sb => new { sb.NepaliDate, sb.TotalAmount })
                        .ToListAsync();

                    // Group by BS year and month from NepaliDate
                    salesData = salesBills
                        .Where(sb => !string.IsNullOrEmpty(sb.NepaliDate))
                        .GroupBy(sb => new
                        {
                            Year = int.Parse(sb.NepaliDate!.Split('-')[0]),
                            Month = int.Parse(sb.NepaliDate!.Split('-')[1])
                        })
                        .Select(g => new SalesDataGroup
                        {
                            Year = g.Key.Year,
                            Month = g.Key.Month,
                            TotalSales = g.Sum(sb => sb.TotalAmount)
                        })
                        .OrderBy(x => x.Year)
                        .ThenBy(x => x.Month)
                        .ToList();

                    // Get sales returns with Nepali dates
                    var salesReturns = await _context.SalesReturns
                        .Where(sr => sr.CompanyId == companyId &&
                                    sr.Date >= startDate &&
                                    sr.Date <= endDate)
                        .Select(sr => new { sr.NepaliDate, sr.TotalAmount })
                        .ToListAsync();

                    returnsData = salesReturns
                        .Where(sr => !string.IsNullOrEmpty(sr.NepaliDate))
                        .GroupBy(sr => new
                        {
                            Year = int.Parse(sr.NepaliDate!.Split('-')[0]),
                            Month = int.Parse(sr.NepaliDate!.Split('-')[1])
                        })
                        .Select(g => new ReturnsDataGroup
                        {
                            Year = g.Key.Year,
                            Month = g.Key.Month,
                            TotalReturns = g.Sum(sr => sr.TotalAmount ?? 0)
                        })
                        .OrderBy(x => x.Year)
                        .ThenBy(x => x.Month)
                        .ToList();
                }
                else
                {
                    // When English format is selected, use Date field (AD) for grouping
                    salesData = await _context.SalesBills
                        .Where(sb => sb.CompanyId == companyId &&
                                    sb.Date >= startDate &&
                                    sb.Date <= endDate)
                        .GroupBy(sb => new { Year = sb.Date.Year, Month = sb.Date.Month })
                        .Select(g => new SalesDataGroup
                        {
                            Year = g.Key.Year,
                            Month = g.Key.Month,
                            TotalSales = g.Sum(sb => (decimal?)sb.TotalAmount) ?? 0
                        })
                        .OrderBy(x => x.Year)
                        .ThenBy(x => x.Month)
                        .ToListAsync();

                    returnsData = await _context.SalesReturns
                        .Where(sr => sr.CompanyId == companyId &&
                                    sr.Date >= startDate &&
                                    sr.Date <= endDate)
                        .GroupBy(sr => new { Year = sr.Date.Year, Month = sr.Date.Month })
                        .Select(g => new ReturnsDataGroup
                        {
                            Year = g.Key.Year,
                            Month = g.Key.Month,
                            TotalReturns = g.Sum(sr => (decimal?)sr.TotalAmount) ?? 0
                        })
                        .OrderBy(x => x.Year)
                        .ThenBy(x => x.Month)
                        .ToListAsync();
                }

                var categories = new List<string>();
                var netSalesData = new List<decimal>();

                if (isNepaliFormat)
                {
                    // Nepali months with their BS month numbers (1-based)
                    // Baisakh=1, Jestha=2, Ashad=3, Shrawan=4, Bhadra=5, Ashwin=6,
                    // Kartik=7, Mangsir=8, Poush=9, Magh=10, Falgun=11, Chaitra=12
                    string[] nepaliMonths = {
                "Baisakh", "Jestha", "Ashad", "Shrawan", "Bhadra", "Ashwin",
                "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"
            };

                    // Determine the fiscal year from the data
                    var allYears = salesData.Select(s => s.Year)
                        .Union(returnsData.Select(r => r.Year))
                        .Distinct()
                        .OrderBy(y => y)
                        .ToList();

                    // If no data, use default years
                    if (!allYears.Any())
                    {
                        int defaultYear = DateTime.Now.Year + 57;
                        allYears.Add(defaultYear);
                        allYears.Add(defaultYear + 1);
                    }

                    // Get the fiscal year start year
                    int fiscalYearStart = allYears.First();

                    // Loop through exactly 12 months of the fiscal year
                    // Start from Shrawan (month 4) to Ashad (month 3 of next year)
                    for (int i = 0; i < 12; i++)
                    {
                        // Calculate the BS month number
                        // Starting from Shrawan (month 4)
                        int bsMonthNumber = ((i + 3) % 12) + 1; // This gives: 4,5,6,7,8,9,10,11,12,1,2,3

                        int bsYear;
                        int displayIndex;

                        // Determine the year and display index
                        if (i <= 8) // Shrawan (4) to Chaitra (12) - months 4 to 12
                        {
                            bsYear = fiscalYearStart;
                            displayIndex = bsMonthNumber - 1; // Convert to 0-based index
                        }
                        else // Baisakh (1) to Ashad (3) - months 1 to 3 of next year
                        {
                            bsYear = fiscalYearStart + 1;
                            displayIndex = bsMonthNumber - 1; // Convert to 0-based index
                        }

                        // Format the category label
                        string formattedDate = $"{nepaliMonths[displayIndex]} {bsYear}";
                        categories.Add(formattedDate);

                        // Find sales and returns data for this BS month
                        var sales = salesData.FirstOrDefault(s => s.Year == bsYear && s.Month == bsMonthNumber);
                        var returns = returnsData.FirstOrDefault(r => r.Year == bsYear && r.Month == bsMonthNumber);

                        decimal totalSales = sales?.TotalSales ?? 0;
                        decimal totalReturns = returns?.TotalReturns ?? 0;
                        netSalesData.Add(totalSales - totalReturns);
                    }
                }
                else
                {
                    // English format: Use AD dates directly from the data
                    var currentMonth = new DateTime(startDate.Year, startDate.Month, 1);
                    var endMonth = new DateTime(endDate.Year, endDate.Month, 1);

                    while (currentMonth <= endMonth)
                    {
                        var sales = salesData.FirstOrDefault(s => s.Year == currentMonth.Year && s.Month == currentMonth.Month);
                        var returns = returnsData.FirstOrDefault(r => r.Year == currentMonth.Year && r.Month == currentMonth.Month);

                        decimal totalSales = sales?.TotalSales ?? 0;
                        decimal totalReturns = returns?.TotalReturns ?? 0;
                        netSalesData.Add(totalSales - totalReturns);

                        string formattedDate = $"{currentMonth:MMM} {currentMonth:yyyy}";
                        categories.Add(formattedDate);

                        currentMonth = currentMonth.AddMonths(1);
                    }
                }

                // Check if we have any data
                if (categories.Count == 0 || netSalesData.All(d => d == 0))
                {
                    categories.Clear();
                    netSalesData.Clear();

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

        // Helper classes for grouping data
        public class SalesDataGroup
        {
            public int Year { get; set; }
            public int Month { get; set; }
            public decimal TotalSales { get; set; }
        }

        public class ReturnsDataGroup
        {
            public int Year { get; set; }
            public int Month { get; set; }
            public decimal TotalReturns { get; set; }
        }

        // private async Task<PieChartData> GetPieChartDataAsync(
        //     Guid companyId,
        //     DateTime startDate,
        //     DateTime endDate)
        // {
        //     try
        //     {
        //         var pieData = new PieChartData();
        //         var colors = new[] {
        //     "#2563eb", "#3b82f6", "#60a5fa",  // Income colors (blues)
        //     "#ef4444", "#f87171", "#fca5a5"   // Expense colors (reds)
        // };
        //         var colorIndex = 0;

        //         // ============================================
        //         // Get Cash Account IDs for filtering
        //         // ============================================

        //         // Get all cash-related account groups
        //         var cashGroupNames = new[] { "Cash in Hand", "Bank Accounts", "Bank O/D Account" };

        //         var cashGroupIds = await _context.AccountGroups
        //             .Where(ag => ag.CompanyId == companyId &&
        //                         cashGroupNames.Contains(ag.Name))
        //             .Select(ag => ag.Id)
        //             .ToListAsync();

        //         // Get all account IDs that belong to these groups
        //         var cashAccountIds = await _context.Accounts
        //             .Where(a => a.CompanyId == companyId &&
        //                        cashGroupIds.Contains(a.AccountGroupsId) &&
        //                        a.IsActive)
        //             .Select(a => a.Id)
        //             .ToListAsync();

        //         // Also get the default Cash in Hand account for other transactions
        //         var defaultCashAccount = await _context.Accounts
        //             .FirstOrDefaultAsync(a => a.CompanyId == companyId &&
        //                                      a.DefaultCashAccount &&
        //                                      a.IsActive);

        //         var defaultCashAccountId = defaultCashAccount?.Id;

        //         // ============================================
        //         // INCOME TRANSACTIONS (Cash Inflows)
        //         // ============================================

        //         // 1. Cash Sales - ONLY Cash Account transactions
        //         var cashSales = await _context.Transactions
        //             .Where(t => t.CompanyId == companyId &&
        //                        t.Type == TransactionType.Sale &&
        //                        t.PaymentMode == PaymentMode.Cash &&
        //                        t.AccountId == defaultCashAccountId &&
        //                        t.Date >= startDate &&
        //                        t.Date <= endDate &&
        //                        t.Status == TransactionStatus.Active)
        //             .SumAsync(t => (decimal?)t.TotalDebit) ?? 0;

        //         // 2. Receipts - ONLY Cash Account transactions
        //         var receipts = await _context.Transactions
        //             .Where(t => t.CompanyId == companyId &&
        //                        t.Type == TransactionType.Rcpt &&
        //                        t.Date >= startDate &&
        //                        t.Date <= endDate &&
        //                        t.Status == TransactionStatus.Active)
        //             .SumAsync(t => (decimal?)t.TotalDebit) ?? 0;

        //         // 3. Credit Notes - ONLY Cash Account transactions
        //         var creditNoteIncomeList = await _context.Transactions
        //     .Where(t => t.CompanyId == companyId &&
        //                t.Type == TransactionType.CrNt &&
        //                t.Date >= startDate &&
        //                t.Date <= endDate &&
        //                t.Status == TransactionStatus.Active &&
        //                cashAccountIds.Contains(t.AccountId.Value) &&
        //                t.TotalDebit > 0)  // Debit means money coming IN
        //     .ToListAsync();

        //         var creditNoteIncomeTotal = creditNoteIncomeList.Sum(t => t.TotalDebit);

        //         // 4. Sales Returns - ONLY Cash Account transactions
        //         // Filter by AccountId == defaultCashAccountId to get only cash transactions
        //         var salesReturnsList = await _context.Transactions
        //             .Where(t => t.CompanyId == companyId &&
        //                        t.Type == TransactionType.SlRt &&
        //                        t.PaymentMode == PaymentMode.Cash &&
        //                        t.AccountId == defaultCashAccountId &&  // ✅ ONLY Cash Account
        //                        t.Date >= startDate &&
        //                        t.Date <= endDate &&
        //                        t.Status == TransactionStatus.Active)
        //             .ToListAsync();

        //         var salesReturnsTotal = salesReturnsList.Sum(t => t.TotalDebit);

        //         var debitNoteIncomeList = await _context.Transactions
        //    .Where(t => t.CompanyId == companyId &&
        //               t.Type == TransactionType.DrNt &&
        //               t.Date >= startDate &&
        //               t.Date <= endDate &&
        //               t.Status == TransactionStatus.Active &&
        //               cashAccountIds.Contains(t.AccountId.Value) &&
        //               t.TotalDebit > 0)  // Debit means money coming IN
        //    .ToListAsync();

        //         var debitNoteIncomeTotal = debitNoteIncomeList.Sum(t => t.TotalDebit);

        //         // ============================================
        //         // JOURNAL VOUCHER TRANSACTIONS (Cash Inflows)
        //         // Only include if account is in cash-related groups
        //         // ============================================

        //         // Journal Voucher - Income (Debit entries to cash accounts)
        //         var journalIncomeList = await _context.Transactions
        //             .Where(t => t.CompanyId == companyId &&
        //                        t.Type == TransactionType.Jrnl &&
        //                        t.Date >= startDate &&
        //                        t.Date <= endDate &&
        //                        t.Status == TransactionStatus.Active &&
        //                        cashAccountIds.Contains(t.AccountId.Value) &&
        //                        t.TotalDebit > 0)
        //             .ToListAsync();

        //         var journalIncomeTotal = journalIncomeList.Sum(t => t.TotalDebit);

        //         // ============================================
        //         // EXPENSE TRANSACTIONS (Cash Outflows)
        //         // ============================================

        //         // 5. Cash Purchases - ONLY Cash Account transactions
        //         var cashPurchases = await _context.Transactions
        //             .Where(t => t.CompanyId == companyId &&
        //                        t.Type == TransactionType.Purc &&
        //                        t.PaymentMode == PaymentMode.Cash &&
        //                        t.AccountId == defaultCashAccountId &&
        //                        t.Date >= startDate &&
        //                        t.Date <= endDate &&
        //                        t.Status == TransactionStatus.Active)
        //             .SumAsync(t => (decimal?)t.TotalCredit) ?? 0;

        //         // 6. Payments - ONLY Cash Account transactions
        //         var payments = await _context.Transactions
        //             .Where(t => t.CompanyId == companyId &&
        //                        t.Type == TransactionType.Pymt &&
        //                        t.Date >= startDate &&
        //                        t.Date <= endDate &&
        //                        t.Status == TransactionStatus.Active)
        //             .SumAsync(t => (decimal?)t.TotalCredit) ?? 0;

        //         var creditNoteExpenseList = await _context.Transactions
        //                  .Where(t => t.CompanyId == companyId &&
        //                             t.Type == TransactionType.CrNt &&
        //                             t.Date >= startDate &&
        //                             t.Date <= endDate &&
        //                             t.Status == TransactionStatus.Active &&
        //                             cashAccountIds.Contains(t.AccountId.Value) &&
        //                             t.TotalCredit > 0)  // Credit means money going OUT
        //                  .ToListAsync();

        //         var creditNoteExpenseTotal = creditNoteExpenseList.Sum(t => t.TotalCredit);


        //         // 7. Debit Notes - ONLY Cash Account transactions
        //         var debitNoteExpenseList = await _context.Transactions
        //    .Where(t => t.CompanyId == companyId &&
        //               t.Type == TransactionType.DrNt &&
        //               t.Date >= startDate &&
        //               t.Date <= endDate &&
        //               t.Status == TransactionStatus.Active &&
        //               cashAccountIds.Contains(t.AccountId.Value) &&
        //               t.TotalCredit > 0)  // Credit means money going OUT
        //    .ToListAsync();

        //         var debitNoteExpenseTotal = debitNoteExpenseList.Sum(t => t.TotalCredit);

        //         // 8. Purchase Returns - ONLY Cash Account transactions
        //         // ✅ Filter by AccountId == defaultCashAccountId to get only cash transactions
        //         var purchaseReturnsList = await _context.Transactions
        //             .Where(t => t.CompanyId == companyId &&
        //                        t.Type == TransactionType.PrRt &&
        //                        t.PaymentMode == PaymentMode.Cash &&
        //                        t.AccountId == defaultCashAccountId &&  // ✅ ONLY Cash Account
        //                        t.Date >= startDate &&
        //                        t.Date <= endDate &&
        //                        t.Status == TransactionStatus.Active)
        //             .ToListAsync();

        //         var purchaseReturnsTotal = purchaseReturnsList.Sum(t => t.TotalDebit);

        //         // ============================================
        //         // JOURNAL VOUCHER TRANSACTIONS (Cash Outflows)
        //         // Only include if account is in cash-related groups
        //         // ============================================

        //         // Journal Voucher - Expense (Credit entries from cash accounts)
        //         var journalExpenseList = await _context.Transactions
        //             .Where(t => t.CompanyId == companyId &&
        //                        t.Type == TransactionType.Jrnl &&
        //                        t.Date >= startDate &&
        //                        t.Date <= endDate &&
        //                        t.Status == TransactionStatus.Active &&
        //                        cashAccountIds.Contains(t.AccountId.Value) &&
        //                        t.TotalCredit > 0)
        //             .ToListAsync();

        //         var journalExpenseTotal = journalExpenseList.Sum(t => t.TotalCredit);

        //         // ============================================
        //         // CALCULATE TOTALS
        //         // ============================================

        //         pieData.TotalIncome = cashSales + receipts + creditNoteIncomeTotal - salesReturnsTotal + journalIncomeTotal + debitNoteIncomeTotal;
        //         pieData.TotalExpenses = cashPurchases + payments - purchaseReturnsTotal + journalExpenseTotal + debitNoteExpenseTotal + creditNoteExpenseTotal;

        //         // ============================================
        //         // BUILD PIE CHART SEGMENTS
        //         // ============================================

        //         // ✅ Cash Sales
        //         if (cashSales > 0)
        //         {
        //             pieData.Segments.Add(new PieChartSegment
        //             {
        //                 Label = "Cash Sales",
        //                 Value = cashSales,
        //                 Color = colors[colorIndex++ % colors.Length],
        //                 Type = "Income"
        //             });
        //         }

        //         // ✅ Credit Note - Income
        //         if (creditNoteIncomeTotal > 0)
        //         {
        //             pieData.Segments.Add(new PieChartSegment
        //             {
        //                 Label = "Credit Notes (Income)",
        //                 Value = creditNoteIncomeTotal,
        //                 Color = colors[colorIndex++ % colors.Length],
        //                 Type = "Income"
        //             });
        //         }

        //         // ✅ Sales Returns (only cash account transactions)
        //         foreach (var returnTransaction in salesReturnsList)
        //         {
        //             var returnAmount = returnTransaction.TotalDebit;
        //             if (returnAmount > 0)
        //             {
        //                 pieData.Segments.Add(new PieChartSegment
        //                 {
        //                     Label = $"Sales Return",
        //                     Value = returnAmount,
        //                     Color = colors[colorIndex++ % colors.Length],
        //                     Type = "Income"
        //                 });
        //             }
        //         }

        //         // ✅ Debit Note - Income
        //         if (debitNoteIncomeTotal > 0)
        //         {
        //             pieData.Segments.Add(new PieChartSegment
        //             {
        //                 Label = "Debit Notes (Income)",
        //                 Value = debitNoteIncomeTotal,
        //                 Color = colors[colorIndex++ % colors.Length],
        //                 Type = "Income"
        //             });
        //         }

        //         // ✅ Journal Voucher - Income
        //         if (journalIncomeTotal > 0)
        //         {
        //             pieData.Segments.Add(new PieChartSegment
        //             {
        //                 Label = "Journal (Income)",
        //                 Value = journalIncomeTotal,
        //                 Color = colors[colorIndex++ % colors.Length],
        //                 Type = "Income"
        //             });
        //         }

        //         // ✅ Receipts
        //         if (receipts > 0)
        //         {
        //             pieData.Segments.Add(new PieChartSegment
        //             {
        //                 Label = "Receipts",
        //                 Value = receipts,
        //                 Color = colors[colorIndex++ % colors.Length],
        //                 Type = "Income"
        //             });
        //         }

        //         // ✅ Credit Note - Expense
        //         if (creditNoteExpenseTotal > 0)
        //         {
        //             pieData.Segments.Add(new PieChartSegment
        //             {
        //                 Label = "Credit Notes (Expense)",
        //                 Value = creditNoteExpenseTotal,
        //                 Color = colors[colorIndex++ % colors.Length],
        //                 Type = "Expense"
        //             });
        //         }


        //         // ✅ Expense Segments
        //         if (cashPurchases > 0)
        //         {
        //             pieData.Segments.Add(new PieChartSegment
        //             {
        //                 Label = "Cash Purchases",
        //                 Value = cashPurchases,
        //                 Color = colors[colorIndex++ % colors.Length],
        //                 Type = "Expense"
        //             });
        //         }

        //         // ✅ Debit Note - Expense
        //         if (debitNoteExpenseTotal > 0)
        //         {
        //             pieData.Segments.Add(new PieChartSegment
        //             {
        //                 Label = "Debit Notes (Expense)",
        //                 Value = debitNoteExpenseTotal,
        //                 Color = colors[colorIndex++ % colors.Length],
        //                 Type = "Expense"
        //             });
        //         }

        //         // ✅ Journal Voucher - Expense
        //         if (journalExpenseTotal > 0)
        //         {
        //             pieData.Segments.Add(new PieChartSegment
        //             {
        //                 Label = "Journal (Expense)",
        //                 Value = journalExpenseTotal,
        //                 Color = colors[colorIndex++ % colors.Length],
        //                 Type = "Expense"
        //             });
        //         }

        //         if (payments > 0)
        //         {
        //             pieData.Segments.Add(new PieChartSegment
        //             {
        //                 Label = "Payments",
        //                 Value = payments,
        //                 Color = colors[colorIndex++ % colors.Length],
        //                 Type = "Expense"
        //             });
        //         }

        //         // ✅ Purchase Returns (only cash account transactions)
        //         foreach (var returnTransaction in purchaseReturnsList)
        //         {
        //             var returnAmount = returnTransaction.TotalDebit;
        //             if (returnAmount > 0)
        //             {
        //                 pieData.Segments.Add(new PieChartSegment
        //                 {
        //                     Label = $"Purchase Return",
        //                     Value = returnAmount,
        //                     Color = colors[colorIndex++ % colors.Length],
        //                     Type = "Expense"
        //                 });
        //             }
        //         }

        //         // If no data, add placeholder
        //         if (!pieData.Segments.Any())
        //         {
        //             pieData.Segments.Add(new PieChartSegment
        //             {
        //                 Label = "No Data",
        //                 Value = 1,
        //                 Color = "#e5e7eb",
        //                 Type = "No Data"
        //             });
        //         }

        //         // ✅ Debug logging
        //         _logger.LogInformation($"=== PIE CHART DATA ===");
        //         _logger.LogInformation($"Default Cash Account ID: {defaultCashAccountId}");
        //         _logger.LogInformation($"Cash Sales: {cashSales}");
        //         _logger.LogInformation($"Sales Returns Count: {salesReturnsList.Count}");
        //         _logger.LogInformation($"Sales Returns Total: {salesReturnsTotal}");
        //         _logger.LogInformation($"Journal Income Total: {journalIncomeTotal}");
        //         _logger.LogInformation($"Journal Expense Total: {journalExpenseTotal}");
        //         _logger.LogInformation($"Cash Purchases: {cashPurchases}");
        //         _logger.LogInformation($"Purchase Returns Count: {purchaseReturnsList.Count}");
        //         _logger.LogInformation($"Purchase Returns Total: {purchaseReturnsTotal}");
        //         _logger.LogInformation($"Total Income: {pieData.TotalIncome}");
        //         _logger.LogInformation($"Total Expenses: {pieData.TotalExpenses}");
        //         _logger.LogInformation($"Segments Count: {pieData.Segments.Count}");
        //         foreach (var segment in pieData.Segments)
        //         {
        //             _logger.LogInformation($"Segment: {segment.Label} = {segment.Value} ({segment.Type})");
        //         }

        //         return pieData;
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error getting pie chart data for company {CompanyId}", companyId);
        //         return new PieChartData
        //         {
        //             TotalIncome = 0,
        //             TotalExpenses = 0,
        //             Segments = new List<PieChartSegment>
        //     {
        //         new PieChartSegment
        //         {
        //             Label = "No Data",
        //             Value = 1,
        //             Color = "#e5e7eb",
        //             Type = "No Data"
        //         }
        //     }
        //         };
        //     }
        // }

        //-------------------------------end1

        private async Task<PieChartData> GetPieChartDataAsync(
            Guid companyId,
            DateTime startDate,
            DateTime endDate)
        {
            try
            {
                var pieData = new PieChartData();

                // ============================================
                // Get Cash Account IDs for filtering
                // ============================================

                // Get all cash-related account groups
                var cashGroupNames = new[] { "Cash in Hand", "Bank Accounts", "Bank O/D Account" };

                var cashGroupIds = await _context.AccountGroups
                    .Where(ag => ag.CompanyId == companyId &&
                                cashGroupNames.Contains(ag.Name))
                    .Select(ag => ag.Id)
                    .ToListAsync();

                // Get all account IDs that belong to these groups
                var cashAccountIds = await _context.Accounts
                    .Where(a => a.CompanyId == companyId &&
                               cashGroupIds.Contains(a.AccountGroupsId) &&
                               a.IsActive)
                    .Select(a => a.Id)
                    .ToListAsync();

                // Also get the default Cash in Hand account for other transactions
                var defaultCashAccount = await _context.Accounts
                    .FirstOrDefaultAsync(a => a.CompanyId == companyId &&
                                             a.DefaultCashAccount &&
                                             a.IsActive);

                var defaultCashAccountId = defaultCashAccount?.Id;

                // ============================================
                // INCOME TRANSACTIONS (Cash Inflows)
                // ============================================

                // 1. Cash Sales - ONLY Cash Account transactions
                var cashSales = await _context.Transactions
                    .Where(t => t.CompanyId == companyId &&
                               t.Type == TransactionType.Sale &&
                               t.PaymentMode == PaymentMode.Cash &&
                               t.AccountId == defaultCashAccountId &&
                               t.Date >= startDate &&
                               t.Date <= endDate &&
                               t.Status == TransactionStatus.Active)
                    .SumAsync(t => (decimal?)t.TotalDebit) ?? 0;

                // 2. Receipts - ONLY Cash Account transactions
                var receipts = await _context.Transactions
                    .Where(t => t.CompanyId == companyId &&
                               t.Type == TransactionType.Rcpt &&
                               t.Date >= startDate &&
                               t.Date <= endDate &&
                               t.Status == TransactionStatus.Active)
                    .SumAsync(t => (decimal?)t.TotalDebit) ?? 0;

                // 3. Credit Notes - ONLY Cash Account transactions
                var creditNoteIncomeList = await _context.Transactions
            .Where(t => t.CompanyId == companyId &&
                       t.Type == TransactionType.CrNt &&
                       t.Date >= startDate &&
                       t.Date <= endDate &&
                       t.Status == TransactionStatus.Active &&
                       cashAccountIds.Contains(t.AccountId.Value) &&
                       t.TotalDebit > 0)  // Debit means money coming IN
            .ToListAsync();

                var creditNoteIncomeTotal = creditNoteIncomeList.Sum(t => t.TotalDebit);

                // 4. Sales Returns - ONLY Cash Account transactions
                // Filter by AccountId == defaultCashAccountId to get only cash transactions
                var salesReturnsList = await _context.Transactions
                    .Where(t => t.CompanyId == companyId &&
                               t.Type == TransactionType.SlRt &&
                               t.PaymentMode == PaymentMode.Cash &&
                               t.AccountId == defaultCashAccountId &&  // ✅ ONLY Cash Account
                               t.Date >= startDate &&
                               t.Date <= endDate &&
                               t.Status == TransactionStatus.Active)
                    .ToListAsync();

                var salesReturnsTotal = salesReturnsList.Sum(t => t.TotalDebit);

                var debitNoteIncomeList = await _context.Transactions
           .Where(t => t.CompanyId == companyId &&
                      t.Type == TransactionType.DrNt &&
                      t.Date >= startDate &&
                      t.Date <= endDate &&
                      t.Status == TransactionStatus.Active &&
                      cashAccountIds.Contains(t.AccountId.Value) &&
                      t.TotalDebit > 0)  // Debit means money coming IN
           .ToListAsync();

                var debitNoteIncomeTotal = debitNoteIncomeList.Sum(t => t.TotalDebit);

                // ============================================
                // JOURNAL VOUCHER TRANSACTIONS (Cash Inflows)
                // Only include if account is in cash-related groups
                // ============================================

                // Journal Voucher - Income (Debit entries to cash accounts)
                var journalIncomeList = await _context.Transactions
                    .Where(t => t.CompanyId == companyId &&
                               t.Type == TransactionType.Jrnl &&
                               t.Date >= startDate &&
                               t.Date <= endDate &&
                               t.Status == TransactionStatus.Active &&
                               cashAccountIds.Contains(t.AccountId.Value) &&
                               t.TotalDebit > 0)
                    .ToListAsync();

                var journalIncomeTotal = journalIncomeList.Sum(t => t.TotalDebit);

                // ============================================
                // EXPENSE TRANSACTIONS (Cash Outflows)
                // ============================================

                // 5. Cash Purchases - ONLY Cash Account transactions
                var cashPurchases = await _context.Transactions
                    .Where(t => t.CompanyId == companyId &&
                               t.Type == TransactionType.Purc &&
                               t.PaymentMode == PaymentMode.Cash &&
                               t.AccountId == defaultCashAccountId &&
                               t.Date >= startDate &&
                               t.Date <= endDate &&
                               t.Status == TransactionStatus.Active)
                    .SumAsync(t => (decimal?)t.TotalCredit) ?? 0;

                // 6. Payments - ONLY Cash Account transactions
                var payments = await _context.Transactions
                    .Where(t => t.CompanyId == companyId &&
                               t.Type == TransactionType.Pymt &&
                               t.Date >= startDate &&
                               t.Date <= endDate &&
                               t.Status == TransactionStatus.Active)
                    .SumAsync(t => (decimal?)t.TotalCredit) ?? 0;

                var creditNoteExpenseList = await _context.Transactions
                         .Where(t => t.CompanyId == companyId &&
                                    t.Type == TransactionType.CrNt &&
                                    t.Date >= startDate &&
                                    t.Date <= endDate &&
                                    t.Status == TransactionStatus.Active &&
                                    cashAccountIds.Contains(t.AccountId.Value) &&
                                    t.TotalCredit > 0)  // Credit means money going OUT
                         .ToListAsync();

                var creditNoteExpenseTotal = creditNoteExpenseList.Sum(t => t.TotalCredit);

                // 7. Debit Notes - ONLY Cash Account transactions
                var debitNoteExpenseList = await _context.Transactions
           .Where(t => t.CompanyId == companyId &&
                      t.Type == TransactionType.DrNt &&
                      t.Date >= startDate &&
                      t.Date <= endDate &&
                      t.Status == TransactionStatus.Active &&
                      cashAccountIds.Contains(t.AccountId.Value) &&
                      t.TotalCredit > 0)  // Credit means money going OUT
           .ToListAsync();

                var debitNoteExpenseTotal = debitNoteExpenseList.Sum(t => t.TotalCredit);

                // 8. Purchase Returns - ONLY Cash Account transactions
                // ✅ Filter by AccountId == defaultCashAccountId to get only cash transactions
                var purchaseReturnsList = await _context.Transactions
                    .Where(t => t.CompanyId == companyId &&
                               t.Type == TransactionType.PrRt &&
                               t.PaymentMode == PaymentMode.Cash &&
                               t.AccountId == defaultCashAccountId &&  // ✅ ONLY Cash Account
                               t.Date >= startDate &&
                               t.Date <= endDate &&
                               t.Status == TransactionStatus.Active)
                    .ToListAsync();

                var purchaseReturnsTotal = purchaseReturnsList.Sum(t => t.TotalDebit);

                // ============================================
                // JOURNAL VOUCHER TRANSACTIONS (Cash Outflows)
                // Only include if account is in cash-related groups
                // ============================================

                // Journal Voucher - Expense (Credit entries from cash accounts)
                var journalExpenseList = await _context.Transactions
                    .Where(t => t.CompanyId == companyId &&
                               t.Type == TransactionType.Jrnl &&
                               t.Date >= startDate &&
                               t.Date <= endDate &&
                               t.Status == TransactionStatus.Active &&
                               cashAccountIds.Contains(t.AccountId.Value) &&
                               t.TotalCredit > 0)
                    .ToListAsync();

                var journalExpenseTotal = journalExpenseList.Sum(t => t.TotalCredit);

                // ============================================
                // CALCULATE TOTALS
                // ============================================

                pieData.TotalIncome = cashSales + receipts + creditNoteIncomeTotal - salesReturnsTotal + journalIncomeTotal + debitNoteIncomeTotal;
                pieData.TotalExpenses = cashPurchases + payments - purchaseReturnsTotal + journalExpenseTotal + debitNoteExpenseTotal + creditNoteExpenseTotal;

                // ============================================
                // BUILD PIE CHART SEGMENTS - ONLY TWO SEGMENTS
                // ============================================

                // ✅ Income Segment
                if (pieData.TotalIncome > 0)
                {
                    pieData.Segments.Add(new PieChartSegment
                    {
                        Label = "Income",
                        Value = pieData.TotalIncome,
                        Color = "#22c55e",  // Blue color for income
                        Type = "Income"
                    });
                }

                // ✅ Expense Segment
                if (pieData.TotalExpenses > 0)
                {
                    pieData.Segments.Add(new PieChartSegment
                    {
                        Label = "Expense",
                        Value = pieData.TotalExpenses,
                        Color = "#ef4444",  // Red color for expense
                        Type = "Expense"
                    });
                }

                // If no data, add placeholder
                if (!pieData.Segments.Any())
                {
                    pieData.Segments.Add(new PieChartSegment
                    {
                        Label = "No Data",
                        Value = 1,
                        Color = "#e5e7eb",
                        Type = "No Data"
                    });
                }

                // ✅ Debug logging
                _logger.LogInformation($"=== PIE CHART DATA ===");
                _logger.LogInformation($"Default Cash Account ID: {defaultCashAccountId}");
                _logger.LogInformation($"Cash Sales: {cashSales}");
                _logger.LogInformation($"Sales Returns Count: {salesReturnsList.Count}");
                _logger.LogInformation($"Sales Returns Total: {salesReturnsTotal}");
                _logger.LogInformation($"Journal Income Total: {journalIncomeTotal}");
                _logger.LogInformation($"Journal Expense Total: {journalExpenseTotal}");
                _logger.LogInformation($"Cash Purchases: {cashPurchases}");
                _logger.LogInformation($"Purchase Returns Count: {purchaseReturnsList.Count}");
                _logger.LogInformation($"Purchase Returns Total: {purchaseReturnsTotal}");
                _logger.LogInformation($"Total Income: {pieData.TotalIncome}");
                _logger.LogInformation($"Total Expenses: {pieData.TotalExpenses}");
                _logger.LogInformation($"Segments Count: {pieData.Segments.Count}");
                foreach (var segment in pieData.Segments)
                {
                    _logger.LogInformation($"Segment: {segment.Label} = {segment.Value} ({segment.Type})");
                }

                return pieData;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting pie chart data for company {CompanyId}", companyId);
                return new PieChartData
                {
                    TotalIncome = 0,
                    TotalExpenses = 0,
                    Segments = new List<PieChartSegment>
            {
                new PieChartSegment
                {
                    Label = "No Data",
                    Value = 1,
                    Color = "#e5e7eb",
                    Type = "No Data"
                }
            }
                };
            }
        }

        public async Task<List<TopItemDto>> GetTopItemsByTransactionAsync(Guid companyId, DateTime startDate, DateTime endDate, int topCount = 10)
        {
            try
            {
                // ✅ Get transaction items for Sales and Sales Returns only
                var transactionItems = await _context.TransactionItems
                    .Include(ti => ti.Item)
                    .Include(ti => ti.Transaction)
                    .Where(ti => ti.Transaction.CompanyId == companyId &&
                                ti.Transaction.Date >= startDate &&
                                ti.Transaction.Date <= endDate &&
                                ti.Transaction.Status == TransactionStatus.Active &&
                                ti.ItemId != null &&
                                ti.Item != null &&
                                ti.Item.Status == "active" &&
                                (ti.Transaction.Type == TransactionType.Sale ||
                                 ti.Transaction.Type == TransactionType.SlRt)) // ✅ Only Sales and Sales Returns
                    .ToListAsync();

                _logger.LogInformation($"Found {transactionItems.Count} transaction items for company {companyId}");

                // ✅ Step 1: Group by TransactionId and ItemId to deduplicate
                var distinctTransactionItems = transactionItems
                    .GroupBy(ti => new { ti.TransactionId, ti.ItemId, ti.Item })
                    .Select(g => new
                    {
                        TransactionId = g.Key.TransactionId,
                        ItemId = g.Key.ItemId,
                        Item = g.Key.Item,
                        Quantity = g.Sum(ti => ti.Quantity ?? 0),
                        Price = g.FirstOrDefault()?.Price ?? 0, // ✅ Use Price instead of NetPuPrice
                        TransactionDate = g.FirstOrDefault()?.Transaction.Date ?? DateTime.MinValue,
                        TransactionType = g.FirstOrDefault()?.Transaction.Type ?? TransactionType.Sale
                    })
                    .ToList();

                // ✅ Step 2: Group by ItemId and calculate net (Sales - Returns)
                var topItems = distinctTransactionItems
                    .GroupBy(x => new { x.ItemId, x.Item })
                    .Select(g => new TopItemDto
                    {
                        ItemId = g.Key.ItemId ?? Guid.Empty,
                        ItemName = g.Key.Item?.Name ?? "Unknown Item",
                        // ✅ Total Quantity = Sales Quantity - Return Quantity
                        TotalQuantity = g.Where(x => x.TransactionType == TransactionType.Sale).Sum(x => x.Quantity) -
                                       g.Where(x => x.TransactionType == TransactionType.SlRt).Sum(x => x.Quantity),
                        // ✅ Total Amount = Sales Amount - Return Amount (using Price)
                        TotalAmount = g.Where(x => x.TransactionType == TransactionType.Sale).Sum(x => x.Quantity * x.Price) -
                                      g.Where(x => x.TransactionType == TransactionType.SlRt).Sum(x => x.Quantity * x.Price),
                        // ✅ Transaction Count = Distinct Sales transactions (excluding returns)
                        TransactionCount = g.Where(x => x.TransactionType == TransactionType.Sale)
                                            .Select(x => x.TransactionId)
                                            .Distinct()
                                            .Count(),
                        // ✅ Latest Price
                        LatestPrice = g.OrderByDescending(x => x.TransactionDate)
                                      .FirstOrDefault()?.Price ?? 0,
                        UnitName = g.Key.Item?.Unit?.Name ?? "Unit"
                    })
                    .Where(x => x.TotalQuantity > 0 || x.TotalAmount > 0) // ✅ Only items with positive net
                    .OrderByDescending(x => x.TotalQuantity)
                    .Take(topCount)
                    .ToList();

                return topItems;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting top items by transaction for company {CompanyId}", companyId);
                return new List<TopItemDto>();
            }
        }

        public async Task<List<TopItemDto>> GetTopItemsByRevenueAsync(Guid companyId, DateTime startDate, DateTime endDate, int topCount = 10)
        {
            try
            {
                // ✅ Get transaction items for Sales and Sales Returns only
                var transactionItems = await _context.TransactionItems
                    .Include(ti => ti.Item)
                    .Include(ti => ti.Transaction)
                    .Where(ti => ti.Transaction.CompanyId == companyId &&
                                ti.Transaction.Date >= startDate &&
                                ti.Transaction.Date <= endDate &&
                                ti.Transaction.Status == TransactionStatus.Active &&
                                ti.ItemId != null &&
                                ti.Item != null &&
                                ti.Item.Status == "active" &&
                                (ti.Transaction.Type == TransactionType.Sale ||
                                 ti.Transaction.Type == TransactionType.SlRt)) // ✅ Only Sales and Sales Returns
                    .ToListAsync();

                // ✅ Step 1: Group by TransactionId and ItemId to deduplicate
                var distinctTransactionItems = transactionItems
                    .GroupBy(ti => new { ti.TransactionId, ti.ItemId, ti.Item })
                    .Select(g => new
                    {
                        TransactionId = g.Key.TransactionId,
                        ItemId = g.Key.ItemId,
                        Item = g.Key.Item,
                        Quantity = g.Sum(ti => ti.Quantity ?? 0),
                        Price = g.FirstOrDefault()?.Price ?? 0, // ✅ Use Price instead of NetPuPrice
                        TransactionDate = g.FirstOrDefault()?.Transaction.Date ?? DateTime.MinValue,
                        TransactionType = g.FirstOrDefault()?.Transaction.Type ?? TransactionType.Sale
                    })
                    .ToList();

                // ✅ Step 2: Group by ItemId and calculate net (Sales - Returns)
                var topItems = distinctTransactionItems
                    .GroupBy(x => new { x.ItemId, x.Item })
                    .Select(g => new TopItemDto
                    {
                        ItemId = g.Key.ItemId ?? Guid.Empty,
                        ItemName = g.Key.Item?.Name ?? "Unknown Item",
                        // ✅ Net Sales = Sales - Returns
                        TotalQuantity = g.Where(x => x.TransactionType == TransactionType.Sale).Sum(x => x.Quantity) -
                                       g.Where(x => x.TransactionType == TransactionType.SlRt).Sum(x => x.Quantity),
                        // ✅ Net Revenue = Sales Revenue - Return Revenue (using Price)
                        TotalAmount = g.Where(x => x.TransactionType == TransactionType.Sale).Sum(x => x.Quantity * x.Price) -
                                      g.Where(x => x.TransactionType == TransactionType.SlRt).Sum(x => x.Quantity * x.Price),
                        // ✅ Transaction Count = Distinct Sales transactions
                        TransactionCount = g.Where(x => x.TransactionType == TransactionType.Sale)
                                            .Select(x => x.TransactionId)
                                            .Distinct()
                                            .Count(),
                        // ✅ Latest Price
                        LatestPrice = g.OrderByDescending(x => x.TransactionDate)
                                      .FirstOrDefault()?.Price ?? 0,
                        UnitName = g.Key.Item?.Unit?.Name ?? "Unit"
                    })
                    .Where(x => x.TotalAmount > 0 || x.TotalQuantity > 0) // ✅ Only items with positive net
                    .OrderByDescending(x => x.TotalAmount) // ✅ Order by Revenue
                    .Take(topCount)
                    .ToList();

                return topItems;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting top items by revenue for company {CompanyId}", companyId);
                return new List<TopItemDto>();
            }
        }

        public async Task<List<TopItemDto>> GetTopItemsByFrequencyAsync(Guid companyId, DateTime startDate, DateTime endDate, int topCount = 10)
        {
            try
            {
                // ✅ Get transaction items for Sales only (frequency is about how often items are sold)
                var transactionItems = await _context.TransactionItems
                    .Include(ti => ti.Item)
                    .Include(ti => ti.Transaction)
                    .Where(ti => ti.Transaction.CompanyId == companyId &&
                                ti.Transaction.Date >= startDate &&
                                ti.Transaction.Date <= endDate &&
                                ti.Transaction.Status == TransactionStatus.Active &&
                                ti.ItemId != null &&
                                ti.Item != null &&
                                ti.Item.Status == "active" &&
                                ti.Transaction.Type == TransactionType.Sale) // ✅ Only Sales for frequency
                    .ToListAsync();

                // ✅ Step 1: Group by TransactionId and ItemId to deduplicate
                var distinctTransactionItems = transactionItems
                    .GroupBy(ti => new { ti.TransactionId, ti.ItemId, ti.Item })
                    .Select(g => new
                    {
                        TransactionId = g.Key.TransactionId,
                        ItemId = g.Key.ItemId,
                        Item = g.Key.Item,
                        Quantity = g.Sum(ti => ti.Quantity ?? 0),
                        Price = g.FirstOrDefault()?.Price ?? 0, // ✅ Use Price instead of NetPuPrice
                        TransactionDate = g.FirstOrDefault()?.Transaction.Date ?? DateTime.MinValue
                    })
                    .ToList();

                // ✅ Step 2: Group by ItemId
                var topItems = distinctTransactionItems
                    .GroupBy(x => new { x.ItemId, x.Item })
                    .Select(g => new TopItemDto
                    {
                        ItemId = g.Key.ItemId ?? Guid.Empty,
                        ItemName = g.Key.Item?.Name ?? "Unknown Item",
                        TotalQuantity = g.Sum(x => x.Quantity),
                        TotalAmount = g.Sum(x => x.Quantity * x.Price), // ✅ Use Price
                        TransactionCount = g.Select(x => x.TransactionId).Distinct().Count(),
                        LatestPrice = g.OrderByDescending(x => x.TransactionDate)
                                      .FirstOrDefault()?.Price ?? 0,
                        UnitName = g.Key.Item?.Unit?.Name ?? "Unit"
                    })
                    .OrderByDescending(x => x.TransactionCount) // ✅ Order by frequency
                    .Take(topCount)
                    .ToList();

                return topItems;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting top items by frequency for company {CompanyId}", companyId);
                return new List<TopItemDto>();
            }
        }

        // /// <summary>
        // /// Get top customers by purchase amount (who buys the most from you)
        // /// </summary>
        // public async Task<List<TopAccountDto>> GetTopCustomersByPurchaseAsync(Guid companyId, DateTime startDate, DateTime endDate, int topCount = 10)
        // {
        //     try
        //     {
        //         // ✅ Only include accounts from Sundry Debtors and Sundry Creditors groups
        //         var validAccountGroupNames = new[] { "Sundry Debtors", "Sundry Creditors" };

        //         // Get all sales transactions with account (customer) info
        //         var salesWithAccounts = await _context.Transactions
        //             .Include(t => t.Account)
        //             .ThenInclude(a => a.AccountGroup)
        //             .Where(t => t.CompanyId == companyId &&
        //                         t.Date >= startDate &&
        //                         t.Date <= endDate &&
        //                         t.Status == TransactionStatus.Active &&
        //                         t.Type == TransactionType.Sale && // Only Sales
        //                         t.AccountId != null &&
        //                         t.Account != null &&
        //                         t.Account.IsActive &&
        //                         t.Account.AccountGroup != null &&
        //                         validAccountGroupNames.Contains(t.Account.AccountGroup.Name)) // ✅ Filter by group
        //             .Select(t => new
        //             {
        //                 t.AccountId,
        //                 t.Account,
        //                 t.TotalDebit,
        //                 t.TotalCredit,
        //                 t.Date,
        //                 t.BillNumber
        //             })
        //             .ToListAsync();

        //         // Group by Account
        //         var topAccounts = salesWithAccounts
        //             .GroupBy(x => new { x.AccountId, x.Account })
        //             .Select(g => new TopAccountDto
        //             {
        //                 AccountId = g.Key.AccountId ?? Guid.Empty,
        //                 AccountName = g.Key.Account?.Name ?? "Unknown Customer",
        //                 AccountPhone = g.Key.Account?.Phone,
        //                 AccountEmail = g.Key.Account?.Email,
        //                 AccountPan = g.Key.Account?.Pan,
        //                 AccountAddress = g.Key.Account?.Address,
        //                 AccountGroupName = g.Key.Account?.AccountGroup?.Name ?? "Customer",
        //                 // Total Purchase Amount (TotalDebit represents the sale amount to customer)
        //                 TotalPurchaseAmount = g.Sum(x => x.TotalDebit),
        //                 TransactionCount = g.Count(),
        //                 AverageTransactionValue = g.Count() > 0 ? g.Average(x => x.TotalDebit) : 0,
        //                 LastTransactionDate = g.Max(x => x.Date),
        //                 OutstandingBalance = 0 // You can calculate this separately if needed
        //             })
        //             .OrderByDescending(x => x.TotalPurchaseAmount)
        //             .Take(topCount)
        //             .ToList();

        //         return topAccounts;
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error getting top customers by purchase for company {CompanyId}", companyId);
        //         return new List<TopAccountDto>();
        //     }
        // }

        // /// <summary>
        // /// Get top customers by transaction frequency (most frequent buyers)
        // /// </summary>
        // public async Task<List<TopAccountDto>> GetTopCustomersByFrequencyAsync(Guid companyId, DateTime startDate, DateTime endDate, int topCount = 10)
        // {
        //     try
        //     {
        //         var validAccountGroupNames = new[] { "Sundry Debtors", "Sundry Creditors" };

        //         var salesWithAccounts = await _context.Transactions
        //             .Include(t => t.Account)
        //             .ThenInclude(a => a.AccountGroup)
        //             .Where(t => t.CompanyId == companyId &&
        //                         t.Date >= startDate &&
        //                         t.Date <= endDate &&
        //                         t.Status == TransactionStatus.Active &&
        //                         t.Type == TransactionType.Sale &&
        //                         t.AccountId != null &&
        //                         t.Account != null &&
        //                         t.Account.IsActive &&
        //                         t.Account.AccountGroup != null &&
        //                         validAccountGroupNames.Contains(t.Account.AccountGroup.Name)) // ✅ Filter by group
        //                     .Select(t => new
        //                     {
        //                         t.AccountId,
        //                         t.Account,
        //                         t.TotalDebit,
        //                         t.Date
        //                     })
        //                     .ToListAsync();

        //         var topAccounts = salesWithAccounts
        //             .GroupBy(x => new { x.AccountId, x.Account })
        //             .Select(g => new TopAccountDto
        //             {
        //                 AccountId = g.Key.AccountId ?? Guid.Empty,
        //                 AccountName = g.Key.Account?.Name ?? "Unknown Customer",
        //                 AccountPhone = g.Key.Account?.Phone,
        //                 AccountEmail = g.Key.Account?.Email,
        //                 AccountPan = g.Key.Account?.Pan,
        //                 AccountAddress = g.Key.Account?.Address,
        //                 AccountGroupName = g.Key.Account?.AccountGroup?.Name ?? "Customer",
        //                 TotalPurchaseAmount = g.Sum(x => x.TotalDebit),
        //                 TransactionCount = g.Count(),
        //                 AverageTransactionValue = g.Count() > 0 ? g.Average(x => x.TotalDebit) : 0,
        //                 LastTransactionDate = g.Max(x => x.Date)
        //             })
        //             .OrderByDescending(x => x.TransactionCount)
        //             .Take(topCount)
        //             .ToList();

        //         return topAccounts;
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error getting top customers by frequency for company {CompanyId}", companyId);
        //         return new List<TopAccountDto>();
        //     }
        // }

        // /// <summary>
        // /// Get top customers by average transaction value (high-value customers)
        // /// </summary>
        // public async Task<List<TopAccountDto>> GetTopCustomersByAverageValueAsync(Guid companyId, DateTime startDate, DateTime endDate, int topCount = 10)
        // {
        //     try
        //     {
        //         var validAccountGroupNames = new[] { "Sundry Debtors", "Sundry Creditors" };

        //         var salesWithAccounts = await _context.Transactions
        //             .Include(t => t.Account)
        //             .ThenInclude(a => a.AccountGroup)
        //             .Where(t => t.CompanyId == companyId &&
        //                         t.Date >= startDate &&
        //                         t.Date <= endDate &&
        //                         t.Status == TransactionStatus.Active &&
        //                         t.Type == TransactionType.Sale &&
        //                         t.AccountId != null &&
        //                         t.Account != null &&
        //                         t.Account.IsActive &&
        //                         t.Account.AccountGroup != null &&
        //                         validAccountGroupNames.Contains(t.Account.AccountGroup.Name)) // ✅ Filter by group
        //                     .Select(t => new
        //                     {
        //                         t.AccountId,
        //                         t.Account,
        //                         t.TotalDebit,
        //                         t.Date
        //                     })
        //                     .ToListAsync();

        //         var topAccounts = salesWithAccounts
        //             .GroupBy(x => new { x.AccountId, x.Account })
        //             .Select(g => new TopAccountDto
        //             {
        //                 AccountId = g.Key.AccountId ?? Guid.Empty,
        //                 AccountName = g.Key.Account?.Name ?? "Unknown Customer",
        //                 AccountPhone = g.Key.Account?.Phone,
        //                 AccountEmail = g.Key.Account?.Email,
        //                 AccountPan = g.Key.Account?.Pan,
        //                 AccountAddress = g.Key.Account?.Address,
        //                 AccountGroupName = g.Key.Account?.AccountGroup?.Name ?? "Customer",
        //                 TotalPurchaseAmount = g.Sum(x => x.TotalDebit),
        //                 TransactionCount = g.Count(),
        //                 AverageTransactionValue = g.Count() > 0 ? g.Average(x => x.TotalDebit) : 0,
        //                 LastTransactionDate = g.Max(x => x.Date)
        //             })
        //             .Where(x => x.TransactionCount >= 2) // At least 2 transactions to avoid outliers
        //             .OrderByDescending(x => x.AverageTransactionValue)
        //             .Take(topCount)
        //             .ToList();

        //         return topAccounts;
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error getting top customers by average value for company {CompanyId}", companyId);
        //         return new List<TopAccountDto>();
        //     }
        // }

        // /// <summary>
        // /// Get top customers with outstanding balance (credit customers with pending payments)
        // /// </summary>
        // public async Task<List<TopAccountDto>> GetTopCustomersByOutstandingAsync(Guid companyId, int topCount = 10)
        // {
        //     try
        //     {
        //         var validAccountGroupNames = new[] { "Sundry Debtors", "Sundry Creditors" };

        //         // Get all accounts with their transactions
        //         var accountsWithTransactions = await _context.Accounts
        //             .Include(a => a.AccountGroup)
        //             .Where(a => a.CompanyId == companyId &&
        //                         a.IsActive &&
        //                         a.AccountGroup != null &&
        //                         validAccountGroupNames.Contains(a.AccountGroup.Name)) // ✅ Filter by group
        //                     .Select(a => new
        //                     {
        //                         Account = a,
        //                         Transactions = _context.Transactions
        //                             .Where(t => t.AccountId == a.Id &&
        //                                         t.Status == TransactionStatus.Active)
        //                             .ToList()
        //                     })
        //                     .ToListAsync();

        //         var topAccounts = accountsWithTransactions
        //             .Select(x => new TopAccountDto
        //             {
        //                 AccountId = x.Account.Id,
        //                 AccountName = x.Account.Name,
        //                 AccountPhone = x.Account.Phone,
        //                 AccountEmail = x.Account.Email,
        //                 AccountPan = x.Account.Pan,
        //                 AccountAddress = x.Account.Address,
        //                 AccountGroupName = x.Account.AccountGroup?.Name ?? "Customer",
        //                 TotalPurchaseAmount = x.Transactions.Sum(t => t.TotalDebit),
        //                 TransactionCount = x.Transactions.Count,
        //                 // Outstanding = Total Debit - Total Credit
        //                 OutstandingBalance = x.Transactions.Sum(t => t.TotalDebit) - x.Transactions.Sum(t => t.TotalCredit),
        //                 LastTransactionDate = x.Transactions.Any() ? x.Transactions.Max(t => t.Date) : DateTime.MinValue,
        //                 AverageTransactionValue = x.Transactions.Any() ? x.Transactions.Average(t => t.TotalDebit) : 0
        //             })
        //             .Where(x => x.OutstandingBalance > 0) // Only accounts with outstanding balance
        //             .OrderByDescending(x => x.OutstandingBalance)
        //             .Take(topCount)
        //             .ToList();

        //         return topAccounts;
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error getting top customers by outstanding for company {CompanyId}", companyId);
        //         return new List<TopAccountDto>();
        //     }
        // }


        //-------------------------------------------------end1

        /// <summary>
        /// Get top customers by purchase amount (who buys the most from you)
        /// </summary>
        public async Task<List<TopAccountDto>> GetTopCustomersByPurchaseAsync(Guid companyId, DateTime startDate, DateTime endDate, int topCount = 10)
        {
            try
            {
                var validAccountGroupNames = new[] { "Sundry Debtors", "Sundry Creditors" };

                // ✅ Get ALL transactions (Sales and Sales Returns)
                var salesWithAccounts = await _context.Transactions
                    .Include(t => t.Account)
                    .ThenInclude(a => a.AccountGroup)
                    .Where(t => t.CompanyId == companyId &&
                                t.Date >= startDate &&
                                t.Date <= endDate &&
                                t.Status == TransactionStatus.Active &&
                                (t.Type == TransactionType.Sale || t.Type == TransactionType.SlRt) &&
                                t.AccountId != null &&
                                t.Account != null &&
                                t.Account.IsActive &&
                                t.Account.AccountGroup != null &&
                                validAccountGroupNames.Contains(t.Account.AccountGroup.Name))
                    .Select(t => new
                    {
                        t.AccountId,
                        t.Account,
                        t.TotalDebit,
                        t.TotalCredit,
                        t.Date,
                        t.BillNumber,
                        t.Type
                    })
                    .ToListAsync();

                // ✅ Group by Account and calculate Net Sales (Sales - Sales Returns)
                var topAccounts = salesWithAccounts
                    .GroupBy(x => new { x.AccountId, x.Account })
                    .Select(g => new TopAccountDto
                    {
                        AccountId = g.Key.AccountId ?? Guid.Empty,
                        AccountName = g.Key.Account?.Name ?? "Unknown Customer",
                        AccountPhone = g.Key.Account?.Phone,
                        AccountEmail = g.Key.Account?.Email,
                        AccountPan = g.Key.Account?.Pan,
                        AccountAddress = g.Key.Account?.Address,
                        AccountGroupName = g.Key.Account?.AccountGroup?.Name ?? "Customer",

                        // ✅ Total Sales = Sum of all Sales (TotalDebit)
                        TotalSales = g.Where(x => x.Type == TransactionType.Sale).Sum(x => x.TotalDebit),

                        // ✅ Total Returns = Sum of all Sales Returns (TotalCredit - because returns are Credit)
                        TotalReturns = g.Where(x => x.Type == TransactionType.SlRt).Sum(x => x.TotalCredit),

                        // ✅ NET = Sales - Returns (Subtract returns)
                        TotalPurchaseAmount = g.Where(x => x.Type == TransactionType.Sale).Sum(x => x.TotalDebit) -
                                              g.Where(x => x.Type == TransactionType.SlRt).Sum(x => x.TotalCredit),

                        // ✅ Transaction Count = Count of Sales (excluding returns)
                        TransactionCount = g.Where(x => x.Type == TransactionType.Sale).Count(),

                        AverageTransactionValue = g.Where(x => x.Type == TransactionType.Sale).Count() > 0
                            ? g.Where(x => x.Type == TransactionType.Sale).Average(x => x.TotalDebit)
                            : 0,

                        LastTransactionDate = g.Max(x => x.Date),
                        OutstandingBalance = 0
                    })
                    // ✅ Only show customers with positive net sales (Sales > Returns)
                    .Where(x => x.TotalPurchaseAmount > 0)
                    .OrderByDescending(x => x.TotalPurchaseAmount)
                    .Take(topCount)
                    .ToList();

                return topAccounts;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting top customers by purchase for company {CompanyId}", companyId);
                return new List<TopAccountDto>();
            }
        }

        /// <summary>
        /// Get top customers by transaction frequency (most frequent buyers)
        /// </summary>
        public async Task<List<TopAccountDto>> GetTopCustomersByFrequencyAsync(Guid companyId, DateTime startDate, DateTime endDate, int topCount = 10)
        {
            try
            {
                var validAccountGroupNames = new[] { "Sundry Debtors", "Sundry Creditors" };

                var salesWithAccounts = await _context.Transactions
                    .Include(t => t.Account)
                    .ThenInclude(a => a.AccountGroup)
                    .Where(t => t.CompanyId == companyId &&
                                t.Date >= startDate &&
                                t.Date <= endDate &&
                                t.Status == TransactionStatus.Active &&
                                (t.Type == TransactionType.Sale || t.Type == TransactionType.SlRt) &&
                                t.AccountId != null &&
                                t.Account != null &&
                                t.Account.IsActive &&
                                t.Account.AccountGroup != null &&
                                validAccountGroupNames.Contains(t.Account.AccountGroup.Name))
                    .Select(t => new
                    {
                        t.AccountId,
                        t.Account,
                        t.TotalDebit,
                        t.TotalCredit,
                        t.Date,
                        t.Type
                    })
                    .ToListAsync();

                var topAccounts = salesWithAccounts
                    .GroupBy(x => new { x.AccountId, x.Account })
                    .Select(g => new TopAccountDto
                    {
                        AccountId = g.Key.AccountId ?? Guid.Empty,
                        AccountName = g.Key.Account?.Name ?? "Unknown Customer",
                        AccountPhone = g.Key.Account?.Phone,
                        AccountEmail = g.Key.Account?.Email,
                        AccountPan = g.Key.Account?.Pan,
                        AccountAddress = g.Key.Account?.Address,
                        AccountGroupName = g.Key.Account?.AccountGroup?.Name ?? "Customer",

                        // ✅ Total Sales
                        TotalSales = g.Where(x => x.Type == TransactionType.Sale).Sum(x => x.TotalDebit),

                        // ✅ Total Returns (Credit)
                        TotalReturns = g.Where(x => x.Type == TransactionType.SlRt).Sum(x => x.TotalCredit),

                        // ✅ NET = Sales - Returns
                        TotalPurchaseAmount = g.Where(x => x.Type == TransactionType.Sale).Sum(x => x.TotalDebit) -
                                              g.Where(x => x.Type == TransactionType.SlRt).Sum(x => x.TotalCredit),

                        // ✅ Transaction Count = Sales count only
                        TransactionCount = g.Where(x => x.Type == TransactionType.Sale).Count(),

                        AverageTransactionValue = g.Where(x => x.Type == TransactionType.Sale).Count() > 0
                            ? g.Where(x => x.Type == TransactionType.Sale).Average(x => x.TotalDebit)
                            : 0,

                        LastTransactionDate = g.Max(x => x.Date)
                    })
                    .Where(x => x.TotalPurchaseAmount > 0)
                    .OrderByDescending(x => x.TransactionCount)
                    .Take(topCount)
                    .ToList();

                return topAccounts;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting top customers by frequency for company {CompanyId}", companyId);
                return new List<TopAccountDto>();
            }
        }

        /// <summary>
        /// Get top customers by average transaction value (high-value customers)
        /// </summary>
        public async Task<List<TopAccountDto>> GetTopCustomersByAverageValueAsync(Guid companyId, DateTime startDate, DateTime endDate, int topCount = 10)
        {
            try
            {
                var validAccountGroupNames = new[] { "Sundry Debtors", "Sundry Creditors" };

                var salesWithAccounts = await _context.Transactions
                    .Include(t => t.Account)
                    .ThenInclude(a => a.AccountGroup)
                    .Where(t => t.CompanyId == companyId &&
                                t.Date >= startDate &&
                                t.Date <= endDate &&
                                t.Status == TransactionStatus.Active &&
                                (t.Type == TransactionType.Sale || t.Type == TransactionType.SlRt) &&
                                t.AccountId != null &&
                                t.Account != null &&
                                t.Account.IsActive &&
                                t.Account.AccountGroup != null &&
                                validAccountGroupNames.Contains(t.Account.AccountGroup.Name))
                    .Select(t => new
                    {
                        t.AccountId,
                        t.Account,
                        t.TotalDebit,
                        t.TotalCredit,
                        t.Date,
                        t.Type
                    })
                    .ToListAsync();

                var topAccounts = salesWithAccounts
                    .GroupBy(x => new { x.AccountId, x.Account })
                    .Select(g => new TopAccountDto
                    {
                        AccountId = g.Key.AccountId ?? Guid.Empty,
                        AccountName = g.Key.Account?.Name ?? "Unknown Customer",
                        AccountPhone = g.Key.Account?.Phone,
                        AccountEmail = g.Key.Account?.Email,
                        AccountPan = g.Key.Account?.Pan,
                        AccountAddress = g.Key.Account?.Address,
                        AccountGroupName = g.Key.Account?.AccountGroup?.Name ?? "Customer",

                        // ✅ Total Sales
                        TotalSales = g.Where(x => x.Type == TransactionType.Sale).Sum(x => x.TotalDebit),

                        // ✅ Total Returns (Credit)
                        TotalReturns = g.Where(x => x.Type == TransactionType.SlRt).Sum(x => x.TotalCredit),

                        // ✅ NET = Sales - Returns
                        TotalPurchaseAmount = g.Where(x => x.Type == TransactionType.Sale).Sum(x => x.TotalDebit) -
                                              g.Where(x => x.Type == TransactionType.SlRt).Sum(x => x.TotalCredit),

                        // ✅ Transaction Count = Sales count only
                        TransactionCount = g.Where(x => x.Type == TransactionType.Sale).Count(),

                        // ✅ Average based on Sales only
                        AverageTransactionValue = g.Where(x => x.Type == TransactionType.Sale).Count() > 0
                            ? g.Where(x => x.Type == TransactionType.Sale).Average(x => x.TotalDebit)
                            : 0,

                        LastTransactionDate = g.Max(x => x.Date)
                    })
                    .Where(x => x.TransactionCount >= 2 && x.TotalPurchaseAmount > 0)
                    .OrderByDescending(x => x.AverageTransactionValue)
                    .Take(topCount)
                    .ToList();

                return topAccounts;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting top customers by average value for company {CompanyId}", companyId);
                return new List<TopAccountDto>();
            }
        }


        /// <summary>
        /// Get top customers with outstanding balance (credit customers with pending payments)
        /// Uses the SAME calculation logic as the statement service
        /// </summary>
        // public async Task<List<TopAccountDto>> GetTopCustomersByOutstandingAsync(Guid companyId, int topCount = 10)
        // {
        //     try
        //     {
        //         var validAccountGroupNames = new[] { "Sundry Debtors", "Sundry Creditors" };

        //         // ✅ Get all Sundry Debtors and Sundry Creditors accounts
        //         var accounts = await _context.Accounts
        //             .Include(a => a.AccountGroup)
        //             .Include(a => a.InitialOpeningBalance)
        //             .Where(a => a.CompanyId == companyId &&
        //                         a.IsActive &&
        //                         a.AccountGroup != null &&
        //                         validAccountGroupNames.Contains(a.AccountGroup.Name))
        //             .ToListAsync();

        //         var result = new List<TopAccountDto>();

        //         foreach (var account in accounts)
        //         {
        //             // ✅ Get ALL transactions for this account (matching statement service)
        //             var transactions = await _context.Transactions
        //                 .Where(t => t.CompanyId == companyId &&
        //                             t.Status == TransactionStatus.Active &&
        //                             (t.AccountId == account.Id ||
        //                              t.PaymentAccountId2 == account.Id ||
        //                              t.ReceiptAccountId2 == account.Id ||
        //                              t.DebitAccountId == account.Id ||
        //                              t.CreditAccountId == account.Id))
        //                 .OrderBy(t => t.Date)
        //                 .ToListAsync();

        //             // ✅ Calculate opening balance (matching statement service)
        //             decimal openingBalance = 0;
        //             if (account.InitialOpeningBalance != null)
        //             {
        //                 openingBalance = account.InitialOpeningBalance.Type == "Dr"
        //                     ? account.InitialOpeningBalance.Amount
        //                     : -account.InitialOpeningBalance.Amount;
        //             }

        //             // ✅ Calculate outstanding balance using StatementService logic
        //             decimal outstandingBalance = openingBalance;

        //             foreach (var tx in transactions)
        //             {
        //                 decimal amount = 0;

        //                 // ✅ EXACTLY like StatementService: Check all possible account references
        //                 if (tx.AccountId == account.Id)
        //                 {
        //                     amount = tx.TotalDebit - tx.TotalCredit;
        //                 }
        //                 else if (tx.PaymentAccountId2 == account.Id)
        //                 {
        //                     // For payment accounts, Credit decreases balance (money goes out)
        //                     amount = -tx.TotalCredit;
        //                 }
        //                 else if (tx.ReceiptAccountId2 == account.Id)
        //                 {
        //                     // For receipt accounts, Debit increases balance (money comes in)
        //                     amount = tx.TotalDebit;
        //                 }
        //                 else if (tx.DebitAccountId == account.Id)
        //                 {
        //                     // For debit accounts, Debit increases balance
        //                     amount = tx.TotalDebit;
        //                 }
        //                 else if (tx.CreditAccountId == account.Id)
        //                 {
        //                     // For credit accounts, Credit decreases balance
        //                     amount = -tx.TotalCredit;
        //                 }

        //                 outstandingBalance += amount;
        //             }

        //             // ✅ Calculate totals (matching statement service)
        //             decimal totalSales = transactions
        //                 .Where(t => t.Type == TransactionType.Sale)
        //                 .Sum(t => t.TotalDebit);

        //             decimal totalReturns = transactions
        //                 .Where(t => t.Type == TransactionType.SlRt)
        //                 .Sum(t => t.TotalCredit);

        //             decimal totalPayments = transactions
        //                 .Where(t => t.Type == TransactionType.Pymt && t.PaymentAccountId2 == account.Id)
        //                 .Sum(t => t.TotalCredit);

        //             decimal totalReceipts = transactions
        //                 .Where(t => t.Type == TransactionType.Rcpt && t.ReceiptAccountId2 == account.Id)
        //                 .Sum(t => t.TotalDebit);

        //             // ✅ Only include accounts with outstanding balance
        //             if (Math.Abs(outstandingBalance) > 0)
        //             {
        //                 result.Add(new TopAccountDto
        //                 {
        //                     AccountId = account.Id,
        //                     AccountName = account.Name,
        //                     AccountPhone = account.Phone,
        //                     AccountEmail = account.Email,
        //                     AccountPan = account.Pan,
        //                     AccountAddress = account.Address,
        //                     AccountGroupName = account.AccountGroup?.Name ?? "Customer",

        //                     TotalSales = totalSales,
        //                     TotalReturns = totalReturns,
        //                     TotalPurchaseAmount = totalSales - totalReturns,

        //                     TotalPayments = totalPayments,
        //                     TotalReceipts = totalReceipts,

        //                     TransactionCount = transactions
        //                         .Where(t => t.Type == TransactionType.Sale || t.Type == TransactionType.Purc)
        //                         .Count(),

        //                     AverageTransactionValue = transactions
        //                         .Where(t => t.Type == TransactionType.Sale)
        //                         .Any()
        //                         ? transactions
        //                             .Where(t => t.Type == TransactionType.Sale)
        //                             .Average(t => t.TotalDebit)
        //                         : 0,

        //                     LastTransactionDate = transactions.Any()
        //                         ? transactions.Max(t => t.Date)
        //                         : DateTime.MinValue,

        //                     OutstandingBalance = outstandingBalance
        //                 });
        //             }
        //         }

        //         // ✅ Order by absolute outstanding balance (highest first)
        //         var topAccounts = result
        //             .OrderByDescending(x => Math.Abs(x.OutstandingBalance))
        //             .Take(topCount)
        //             .ToList();

        //         _logger.LogInformation($"Found {topAccounts.Count} accounts with outstanding balance");

        //         return topAccounts;
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error getting top customers by outstanding for company {CompanyId}", companyId);
        //         return new List<TopAccountDto>();
        //     }
        // }

        /// <summary>
        /// Get top customers with outstanding balance (credit customers with pending payments)
        /// Uses the SAME calculation logic as the statement service
        /// </summary>
        // public async Task<List<TopAccountDto>> GetTopCustomersByOutstandingAsync(Guid companyId, int topCount = 10)
        // {
        //     try
        //     {
        //         var validAccountGroupNames = new[] { "Sundry Debtors", "Sundry Creditors" };

        //         // ✅ Get all Sundry Debtors and Sundry Creditors accounts
        //         var accounts = await _context.Accounts
        //             .Include(a => a.AccountGroup)
        //             .Include(a => a.InitialOpeningBalance)
        //             .Where(a => a.CompanyId == companyId &&
        //                         a.IsActive &&
        //                         a.AccountGroup != null &&
        //                         validAccountGroupNames.Contains(a.AccountGroup.Name))
        //             .ToListAsync();

        //         var result = new List<TopAccountDto>();

        //         foreach (var account in accounts)
        //         {
        //             // ✅ Get ALL transactions for this account (matching statement service)
        //             var transactions = await _context.Transactions
        //                 .Where(t => t.CompanyId == companyId &&
        //                             t.Status == TransactionStatus.Active &&
        //                             (t.AccountId == account.Id ||
        //                              t.PaymentAccountId2 == account.Id ||
        //                              t.ReceiptAccountId2 == account.Id ||
        //                              t.DebitAccountId == account.Id ||
        //                              t.CreditAccountId == account.Id))
        //                 .OrderBy(t => t.Date)
        //                 .ToListAsync();

        //             // ✅ Calculate opening balance (matching statement service)
        //             decimal openingBalance = 0;
        //             if (account.InitialOpeningBalance != null)
        //             {
        //                 openingBalance = account.InitialOpeningBalance.Type == "Dr"
        //                     ? account.InitialOpeningBalance.Amount
        //                     : -account.InitialOpeningBalance.Amount;
        //             }

        //             // ✅ Calculate outstanding balance using StatementService logic
        //             decimal outstandingBalance = openingBalance;

        //             foreach (var tx in transactions)
        //             {
        //                 decimal amount = 0;

        //                 // ✅ EXACTLY like StatementService: Check all possible account references
        //                 if (tx.AccountId == account.Id)
        //                 {
        //                     amount = tx.TotalDebit - tx.TotalCredit;
        //                 }
        //                 else if (tx.PaymentAccountId2 == account.Id)
        //                 {
        //                     // For payment accounts, Credit decreases balance (money goes out)
        //                     amount = -tx.TotalCredit;
        //                 }
        //                 else if (tx.ReceiptAccountId2 == account.Id)
        //                 {
        //                     // For receipt accounts, Debit increases balance (money comes in)
        //                     amount = tx.TotalDebit;
        //                 }
        //                 else if (tx.DebitAccountId == account.Id)
        //                 {
        //                     // For debit accounts, Debit increases balance
        //                     amount = tx.TotalDebit;
        //                 }
        //                 else if (tx.CreditAccountId == account.Id)
        //                 {
        //                     // For credit accounts, Credit decreases balance
        //                     amount = -tx.TotalCredit;
        //                 }

        //                 outstandingBalance += amount;
        //             }

        //             // ✅ Calculate totals (matching statement service)
        //             decimal totalSales = transactions
        //                 .Where(t => t.Type == TransactionType.Sale)
        //                 .Sum(t => t.TotalDebit);

        //             decimal totalReturns = transactions
        //                 .Where(t => t.Type == TransactionType.SlRt)
        //                 .Sum(t => t.TotalCredit);

        //             decimal totalPayments = transactions
        //                 .Where(t => t.Type == TransactionType.Pymt && t.PaymentAccountId2 == account.Id)
        //                 .Sum(t => t.TotalCredit);

        //             decimal totalReceipts = transactions
        //                 .Where(t => t.Type == TransactionType.Rcpt && t.ReceiptAccountId2 == account.Id)
        //                 .Sum(t => t.TotalDebit);

        //             // ✅ MODIFIED: Only include accounts with POSITIVE outstanding balance (receivables)
        //             // This excludes accounts where customer has paid more than they owe (negative balance)
        //             if (outstandingBalance > 0)  // 🔥 Changed from Math.Abs(outstandingBalance) > 0
        //             {
        //                 result.Add(new TopAccountDto
        //                 {
        //                     AccountId = account.Id,
        //                     AccountName = account.Name,
        //                     AccountPhone = account.Phone,
        //                     AccountEmail = account.Email,
        //                     AccountPan = account.Pan,
        //                     AccountAddress = account.Address,
        //                     AccountGroupName = account.AccountGroup?.Name ?? "Customer",

        //                     TotalSales = totalSales,
        //                     TotalReturns = totalReturns,
        //                     TotalPurchaseAmount = totalSales - totalReturns,

        //                     TotalPayments = totalPayments,
        //                     TotalReceipts = totalReceipts,

        //                     TransactionCount = transactions
        //                         .Where(t => t.Type == TransactionType.Sale || t.Type == TransactionType.Purc)
        //                         .Count(),

        //                     AverageTransactionValue = transactions
        //                         .Where(t => t.Type == TransactionType.Sale)
        //                         .Any()
        //                         ? transactions
        //                             .Where(t => t.Type == TransactionType.Sale)
        //                             .Average(t => t.TotalDebit)
        //                         : 0,

        //                     LastTransactionDate = transactions.Any()
        //                         ? transactions.Max(t => t.Date)
        //                         : DateTime.MinValue,

        //                     OutstandingBalance = outstandingBalance
        //                 });
        //             }
        //         }

        //         // ✅ Order by highest outstanding balance first (receivables)
        //         var topAccounts = result
        //             .OrderByDescending(x => x.OutstandingBalance)  // 🔥 Changed from Math.Abs
        //             .Take(topCount)
        //             .ToList();

        //         _logger.LogInformation($"Found {topAccounts.Count} accounts with outstanding receivables");

        //         return topAccounts;
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error getting top customers by outstanding for company {CompanyId}", companyId);
        //         return new List<TopAccountDto>();
        //     }
        // }

/// <summary>
/// Get top customers with outstanding balance (credit customers with pending payments)
/// Uses the SAME calculation logic as the statement service
/// EXCLUDES cash transactions from Sales, Sales Returns, Purchase, and Purchase Returns
/// </summary>
public async Task<List<TopAccountDto>> GetTopCustomersByOutstandingAsync(Guid companyId, int topCount = 10)
{
    try
    {
        var validAccountGroupNames = new[] { "Sundry Debtors", "Sundry Creditors" };

        // ✅ Get all Sundry Debtors and Sundry Creditors accounts
        var accounts = await _context.Accounts
            .Include(a => a.AccountGroup)
            .Include(a => a.InitialOpeningBalance)
            .Where(a => a.CompanyId == companyId &&
                        a.IsActive &&
                        a.AccountGroup != null &&
                        validAccountGroupNames.Contains(a.AccountGroup.Name))
            .ToListAsync();

        var result = new List<TopAccountDto>();

        foreach (var account in accounts)
        {
            // ✅ Get ALL transactions for this account (matching statement service)
            var allTransactions = await _context.Transactions
                .Where(t => t.CompanyId == companyId &&
                            t.Status == TransactionStatus.Active &&
                            (t.AccountId == account.Id ||
                             t.PaymentAccountId2 == account.Id ||
                             t.ReceiptAccountId2 == account.Id ||
                             t.DebitAccountId == account.Id ||
                             t.CreditAccountId == account.Id))
                .OrderBy(t => t.Date)
                .ToListAsync();

            // ✅ EXCLUDE cash transactions from Sales, Sales Returns, Purchase, Purchase Returns
            // This matches the StatementService logic where cash transactions are shown separately
            var filteredTransactions = allTransactions
                .Where(t => !(t.PaymentMode == PaymentMode.Cash && 
                             (t.Type == TransactionType.Sale || 
                              t.Type == TransactionType.SlRt ||
                              t.Type == TransactionType.Purc ||
                              t.Type == TransactionType.PrRt)))
                .ToList();

            // ✅ Calculate opening balance (matching statement service)
            decimal openingBalance = 0;
            if (account.InitialOpeningBalance != null)
            {
                openingBalance = account.InitialOpeningBalance.Type == "Dr"
                    ? account.InitialOpeningBalance.Amount
                    : -account.InitialOpeningBalance.Amount;
            }

            // ✅ Calculate outstanding balance using filtered transactions
            decimal outstandingBalance = openingBalance;

            foreach (var tx in filteredTransactions)
            {
                decimal amount = 0;

                // ✅ EXACTLY like StatementService: Check all possible account references
                if (tx.AccountId == account.Id)
                {
                    amount = tx.TotalDebit - tx.TotalCredit;
                }
                else if (tx.PaymentAccountId2 == account.Id)
                {
                    // For payment accounts, Credit decreases balance (money goes out)
                    amount = -tx.TotalCredit;
                }
                else if (tx.ReceiptAccountId2 == account.Id)
                {
                    // For receipt accounts, Debit increases balance (money comes in)
                    amount = tx.TotalDebit;
                }
                else if (tx.DebitAccountId == account.Id)
                {
                    // For debit accounts, Debit increases balance
                    amount = tx.TotalDebit;
                }
                else if (tx.CreditAccountId == account.Id)
                {
                    // For credit accounts, Credit decreases balance
                    amount = -tx.TotalCredit;
                }

                outstandingBalance += amount;
            }

            // ✅ Calculate totals - EXCLUDE cash transactions from Sales, Returns, Purchases
            decimal totalSales = allTransactions
                .Where(t => t.Type == TransactionType.Sale && t.PaymentMode != PaymentMode.Cash)
                .Sum(t => t.TotalDebit);

            decimal totalReturns = allTransactions
                .Where(t => t.Type == TransactionType.SlRt && t.PaymentMode != PaymentMode.Cash)
                .Sum(t => t.TotalCredit);

            decimal totalPurchases = allTransactions
                .Where(t => t.Type == TransactionType.Purc && t.PaymentMode != PaymentMode.Cash)
                .Sum(t => t.TotalCredit);

            // ✅ Payments and Receipts - INCLUDE ALL (including cash)
            decimal totalPayments = allTransactions
                .Where(t => t.Type == TransactionType.Pymt && t.PaymentAccountId2 == account.Id)
                .Sum(t => t.TotalCredit);

            decimal totalReceipts = allTransactions
                .Where(t => t.Type == TransactionType.Rcpt && t.ReceiptAccountId2 == account.Id)
                .Sum(t => t.TotalDebit);

            // ✅ Only include accounts with POSITIVE outstanding balance (receivables)
            if (outstandingBalance > 0)
            {
                result.Add(new TopAccountDto
                {
                    AccountId = account.Id,
                    AccountName = account.Name,
                    AccountPhone = account.Phone,
                    AccountEmail = account.Email,
                    AccountPan = account.Pan,
                    AccountAddress = account.Address,
                    AccountGroupName = account.AccountGroup?.Name ?? "Customer",

                    TotalSales = totalSales,
                    TotalReturns = totalReturns,
                    TotalPurchaseAmount = totalSales - totalReturns,

                    TotalPayments = totalPayments,
                    TotalReceipts = totalReceipts,

                    TransactionCount = allTransactions
                        .Where(t => (t.Type == TransactionType.Sale || t.Type == TransactionType.Purc) && 
                                   t.PaymentMode != PaymentMode.Cash)
                        .Count(),

                    AverageTransactionValue = allTransactions
                        .Where(t => t.Type == TransactionType.Sale && t.PaymentMode != PaymentMode.Cash)
                        .Any()
                        ? allTransactions
                            .Where(t => t.Type == TransactionType.Sale && t.PaymentMode != PaymentMode.Cash)
                            .Average(t => t.TotalDebit)
                        : 0,

                    LastTransactionDate = allTransactions.Any()
                        ? allTransactions.Max(t => t.Date)
                        : DateTime.MinValue,

                    OutstandingBalance = outstandingBalance
                });
            }
        }

        // ✅ Order by highest outstanding balance first (receivables)
        var topAccounts = result
            .OrderByDescending(x => x.OutstandingBalance)
            .Take(topCount)
            .ToList();

        _logger.LogInformation($"Found {topAccounts.Count} accounts with outstanding receivables (excluding cash sales/returns/purchases)");

        return topAccounts;
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error getting top customers by outstanding for company {CompanyId}", companyId);
        return new List<TopAccountDto>();
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