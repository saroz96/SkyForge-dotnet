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
                var totalStockValueResult = await GetTotalStockValueAsync(companyId, fiscalYearGuid);

                var cashAccount = await GetCashAccountAsync(companyId);

                var cashBalance = await CalculateCashBalanceAsync(cashAccount, endDate);
                var bankBalance = await CalculateBankBalanceAsync(companyId, endDate);
                var bankODBalance = await CalculateBankODBalanceAsync(companyId, endDate);
                var netBankBalance = bankBalance + bankODBalance;

                var netSales = totalSalesResult - totalSalesReturnResult;
                var netPurchase = totalPurchaseResult - totalPurchaseReturnResult;

                var chartData = await GetChartDataAsync(companyId, chartStartDate, chartEndDate, company.DateFormat);

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
        private async Task<decimal> GetTotalStockValueAsync(Guid companyId, Guid fiscalYearId)
        {
            try
            {
                _logger.LogInformation("Calculating total stock value for company {CompanyId}, fiscal year {FiscalYearId}", companyId, fiscalYearId);

                // Get all stock entries for active items in this fiscal year
                var stockEntries = await _context.StockEntries
                    .AsNoTracking()
                    .Include(se => se.Item)
                    .Where(se => se.Item != null &&
                                se.Item.CompanyId == companyId &&
                                se.Item.Status == "active" &&
                                se.Quantity > 0 &&
                                se.FiscalYearId == fiscalYearId)
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
                    .Where(i => i.CompanyId == companyId && i.Status == "active" && i.FiscalYearId == fiscalYearId)
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
                decimal balance = 0;

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

                        var transactions = await _context.Transactions
                            .Where(t => t.AccountId == account.Id &&
                                       t.Date <= endDate &&
                                       t.Status == TransactionStatus.Active)
                            .ToListAsync();

                        foreach (var transaction in transactions)
                        {
                            accountBalance += (transaction.TotalDebit - transaction.TotalCredit);
                        }

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

                        var transactions = await _context.Transactions
                            .Where(t => t.AccountId == account.Id &&
                                       t.Date <= endDate &&
                                       t.Status == TransactionStatus.Active)
                            .ToListAsync();

                        foreach (var transaction in transactions)
                        {
                            accountBalance += (transaction.TotalDebit - transaction.TotalCredit);
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
                var salesData = await _context.SalesBills
                    .Where(sb => sb.CompanyId == companyId &&
                                sb.Date >= startDate &&
                                sb.Date <= endDate)
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

                var returnsData = await _context.SalesReturns
                    .Where(sr => sr.CompanyId == companyId &&
                                sr.Date >= startDate &&
                                sr.Date <= endDate)
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
                        int monthIndex = (currentMonth.Month + 4) % 12;
                        formattedDate = $"{nepaliMonths[monthIndex]} {currentMonth.Year}";
                    }
                    else
                    {
                        formattedDate = $"{currentMonth:MMM} {currentMonth:yyyy}";
                    }

                    categories.Add(formattedDate);
                    netSalesData.Add(totalSales - totalReturns);

                    currentMonth = currentMonth.AddMonths(1);
                }

                if (categories.Count == 0)
                {
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