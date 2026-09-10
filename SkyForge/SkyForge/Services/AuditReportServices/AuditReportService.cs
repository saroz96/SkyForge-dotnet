// Services/AuditReportService.cs
using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto.AuditReportDto;
using SkyForge.Models.AccountModel;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.Shared;


namespace SkyForge.Services.AuditReportServices
{
    public class AuditReportService : IAuditReportService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<AuditReportService> _logger;

        // Stock accounts to exclude from trial balance
        private static readonly HashSet<string> _stockAccountNames = new()
        {
             "Stock", "Stock in Hand", "Opening Stock", "Closing Stock",
            "Inventory", "Stock Account"
        };

        // Account categories for Balance Sheet classification
        private static readonly HashSet<string> _assetAccountGroups = new()
        {
            "Cash in Hand", "Bank Accounts", "Sundry Debtors", "Stock in Hand",
            "Fixed Assets", "Investments", "Loans & Advances", "Securities & Deposits",
            "Current Assets", "Bank O/D Account"
        };

        private static readonly HashSet<string> _liabilityAccountGroups = new()
        {
            "Sundry Creditors", "Current Liabilities", "Loans(Liability)",
            "Secured Loans", "Unsecured Loans", "Provisions/Expenses Payable",
            "Duties & Taxes"
        };

        private static readonly HashSet<string> _equityAccountGroups = new()
        {
            "Capital Account", "Reserves & Surplus", "Profit & Loss"
        };

        private static readonly HashSet<string> _incomeAccountGroups = new()
        {
            "Sale", "Income (Direct/Opr.)", "Income (Indirect)"
        };

        private static readonly HashSet<string> _expenseAccountGroups = new()
        {
            "Purchase", "Expenses (Direct/Mfg.)", "Expenses (Indirect/Admn.)"
        };

        private static readonly HashSet<string> _nominalAccountGroups = new()
        {
            "Purchase", "Sale", "Expenses (Direct/Mfg.)", "Expenses (Indirect/Admn.)",
            "Income (Direct/Opr.)", "Income (Indirect)", "Profit & Loss"
        };

        public AuditReportService(
            ApplicationDbContext context,
            ILogger<AuditReportService> logger)
        {
            _context = context;
            _logger = logger;
        }

        private bool IsStockAccount(string accountName, string accountGroupName)
        {
            // Check if account name contains stock-related keywords
            if (_stockAccountNames.Any(s => accountName?.Contains(s, StringComparison.OrdinalIgnoreCase) == true))
                return true;

            // Check if account group is "Stock in Hand"
            if (accountGroupName?.Equals("Stock in Hand", StringComparison.OrdinalIgnoreCase) == true)
                return true;

            return false;
        }

        public async Task<AuditReportResponseDTO> GetOpeningTrialBalanceAsync(
            Guid companyId, Guid fiscalYearId, DateTime? asOnDate = null)
        {
            try
            {
                var response = new AuditReportResponseDTO();
                var (company, fiscalYear) = await GetCompanyAndFiscalYearAsync(companyId, fiscalYearId);

                if (company == null || fiscalYear == null)
                {
                    response.Success = false;
                    response.Message = "Company or Fiscal Year not found";
                    return response;
                }

                var asOnDateAd = asOnDate ?? fiscalYear.StartDate ?? DateTime.UtcNow;
                var asOnDateNepali = fiscalYear.StartDateNepali ?? asOnDateAd.ToString("yyyy-MM-dd");

                // Get all active accounts with their groups
                var accounts = await GetAccountsWithBalancesAsync(companyId, fiscalYearId);

                // Get opening balances from OpeningBalanceByFiscalYear
                var openingBalances = await _context.OpeningBalanceByFiscalYear
                    .Where(ob => ob.CompanyId == companyId && ob.FiscalYearId == fiscalYearId)
                    .ToDictionaryAsync(ob => ob.AccountId, ob => ob);

                var reportData = new AuditReportDataDTO
                {
                    Company = MapCompanyInfo(company),
                    FiscalYear = MapFiscalYearInfo(fiscalYear),
                    ReportName = "Opening Trial Balance",
                    ReportType = "OpeningTrialBalance",
                    GeneratedDate = DateTime.UtcNow,
                    GeneratedDateNepali = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                    AsOnDate = asOnDateAd,
                    AsOnDateNepali = asOnDateNepali,
                    IsNepaliFormat = company.DateFormat.ToString().ToLower() == "nepali",
                    DateFormat = company.DateFormat.ToString().ToLower()
                };

                decimal totalDebit = 0;
                decimal totalCredit = 0;

                // Group accounts by their account group
                var accountGroups = await _context.AccountGroups
                    .Where(ag => ag.CompanyId == companyId)
                    .OrderBy(ag => ag.Name)
                    .ToListAsync();

                var groupDict = accountGroups.ToDictionary(g => g.Id, g => g);

                foreach (var account in accounts)
                {
                    var accountGroupName = groupDict.TryGetValue(account.AccountGroupsId, out var group)
                        ? group.Name
                        : "Uncategorized";

                    // EXCLUDE STOCK ACCOUNTS FROM TRIAL BALANCE
                    if (IsStockAccount(account.Name, accountGroupName))
                        continue;


                    // Skip nominal accounts for opening trial balance (they start at zero)
                    if (_nominalAccountGroups.Contains(accountGroupName))
                        continue;

                    decimal openingBalance = 0;
                    string balanceType = "Cr";

                    if (openingBalances.TryGetValue(account.Id, out var ob))
                    {
                        openingBalance = ob.Amount;
                        balanceType = ob.Type;
                    }

                    // For opening trial balance, debit/credit is based on opening balance
                    decimal debit = balanceType == "Dr" ? openingBalance : 0;
                    decimal credit = balanceType == "Cr" ? openingBalance : 0;

                    totalDebit += debit;
                    totalCredit += credit;

                    // Add to account details
                    reportData.AccountDetails.Add(new AccountDetailDTO
                    {
                        AccountId = account.Id,
                        AccountName = account.Name,
                        AccountGroupName = accountGroupName,
                        OpeningBalance = openingBalance,
                        Debit = debit,
                        Credit = credit,
                        ClosingBalance = openingBalance,
                        BalanceType = balanceType,
                        AccountType = GetAccountType(accountGroupName)
                    });
                }

                reportData.Summary = new ReportSummaryDTO
                {
                    TotalDebit = totalDebit,
                    TotalCredit = totalCredit,
                    GrandTotal = totalDebit + totalCredit,
                    IsBalanced = Math.Abs(totalDebit - totalCredit) < 0.01m,
                    BalanceStatus = Math.Abs(totalDebit - totalCredit) < 0.01m ? "Balanced" : "Unbalanced"
                };

                response.Success = true;
                response.Data = reportData;
                response.Message = "Opening Trial Balance generated successfully";
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating Opening Trial Balance");
                return new AuditReportResponseDTO
                {
                    Success = false,
                    Message = $"Error generating report: {ex.Message}",
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        public async Task<AuditReportResponseDTO> GetClosingTrialBalanceAsync(
            Guid companyId, Guid fiscalYearId, DateTime? asOnDate = null)
        {
            try
            {
                var response = new AuditReportResponseDTO();
                var (company, fiscalYear) = await GetCompanyAndFiscalYearAsync(companyId, fiscalYearId);

                if (company == null || fiscalYear == null)
                {
                    response.Success = false;
                    response.Message = "Company or Fiscal Year not found";
                    return response;
                }

                var asOnDateAd = asOnDate ?? fiscalYear.EndDate ?? DateTime.UtcNow;
                var asOnDateNepali = fiscalYear.EndDateNepali ?? asOnDateAd.ToString("yyyy-MM-dd");

                var accounts = await GetAccountsWithBalancesAsync(companyId, fiscalYearId);
                var openingBalances = await _context.OpeningBalanceByFiscalYear
                    .Where(ob => ob.CompanyId == companyId && ob.FiscalYearId == fiscalYearId)
                    .ToDictionaryAsync(ob => ob.AccountId, ob => ob);

                // Get closing balances from ClosingBalanceByFiscalYear
                var closingBalances = await _context.ClosingBalanceByFiscalYear
                    .Where(cb => cb.CompanyId == companyId && cb.FiscalYearId == fiscalYearId)
                    .ToDictionaryAsync(cb => cb.AccountId, cb => cb);

                var reportData = new AuditReportDataDTO
                {
                    Company = MapCompanyInfo(company),
                    FiscalYear = MapFiscalYearInfo(fiscalYear),
                    ReportName = "Closing Trial Balance",
                    ReportType = "ClosingTrialBalance",
                    GeneratedDate = DateTime.UtcNow,
                    GeneratedDateNepali = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                    AsOnDate = asOnDateAd,
                    AsOnDateNepali = asOnDateNepali,
                    IsNepaliFormat = company.DateFormat.ToString().ToLower() == "nepali",
                    DateFormat = company.DateFormat.ToString().ToLower()
                };

                decimal totalDebit = 0;
                decimal totalCredit = 0;

                var accountGroups = await _context.AccountGroups
                    .Where(ag => ag.CompanyId == companyId)
                    .OrderBy(ag => ag.Name)
                    .ToDictionaryAsync(g => g.Id, g => g);

                foreach (var account in accounts)
                {
                    var accountGroupName = accountGroups.TryGetValue(account.AccountGroupsId, out var group)
                        ? group.Name
                        : "Uncategorized";

                    // EXCLUDE STOCK ACCOUNTS FROM TRIAL BALANCE
                    if (IsStockAccount(account.Name, accountGroupName))
                        continue;

                    decimal closingBalance = 0;
                    string balanceType = "Cr";

                    if (closingBalances.TryGetValue(account.Id, out var cb))
                    {
                        closingBalance = cb.Amount;
                        balanceType = cb.Type;
                    }
                    else if (openingBalances.TryGetValue(account.Id, out var ob))
                    {
                        // If no closing balance, use opening balance
                        closingBalance = ob.Amount;
                        balanceType = ob.Type;
                    }

                    // Skip nominal accounts (they should be closed to P&L)
                    // But include Profit & Loss separately
                    if (_nominalAccountGroups.Contains(accountGroupName) && accountGroupName != "Profit & Loss")
                        continue;

                    decimal debit = balanceType == "Dr" ? closingBalance : 0;
                    decimal credit = balanceType == "Cr" ? closingBalance : 0;

                    totalDebit += debit;
                    totalCredit += credit;

                    reportData.AccountDetails.Add(new AccountDetailDTO
                    {
                        AccountId = account.Id,
                        AccountName = account.Name,
                        AccountGroupName = accountGroupName,
                        OpeningBalance = openingBalances.TryGetValue(account.Id, out var ob2) ? ob2.Amount : 0,
                        Debit = debit,
                        Credit = credit,
                        ClosingBalance = closingBalance,
                        BalanceType = balanceType,
                        AccountType = GetAccountType(accountGroupName)
                    });
                }

                reportData.Summary = new ReportSummaryDTO
                {
                    TotalDebit = totalDebit,
                    TotalCredit = totalCredit,
                    GrandTotal = totalDebit + totalCredit,
                    IsBalanced = Math.Abs(totalDebit - totalCredit) < 0.01m,
                    BalanceStatus = Math.Abs(totalDebit - totalCredit) < 0.01m ? "Balanced" : "Unbalanced"
                };

                response.Success = true;
                response.Data = reportData;
                response.Message = "Closing Trial Balance generated successfully";
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating Closing Trial Balance");
                return new AuditReportResponseDTO
                {
                    Success = false,
                    Message = $"Error generating report: {ex.Message}",
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        public async Task<AuditReportResponseDTO> GetProfitAndLossAccountAsync(
            Guid companyId, Guid fiscalYearId, DateTime? asOnDate = null)
        {
            try
            {
                var response = new AuditReportResponseDTO();
                var (company, fiscalYear) = await GetCompanyAndFiscalYearAsync(companyId, fiscalYearId);

                if (company == null || fiscalYear == null)
                {
                    response.Success = false;
                    response.Message = "Company or Fiscal Year not found";
                    return response;
                }

                var asOnDateAd = asOnDate ?? fiscalYear.EndDate ?? DateTime.UtcNow;
                var asOnDateNepali = fiscalYear.EndDateNepali ?? asOnDateAd.ToString("yyyy-MM-dd");

                var accounts = await GetAccountsWithBalancesAsync(companyId, fiscalYearId);
                var closingBalances = await _context.ClosingBalanceByFiscalYear
                    .Where(cb => cb.CompanyId == companyId && cb.FiscalYearId == fiscalYearId)
                    .ToDictionaryAsync(cb => cb.AccountId, cb => cb);

                var openingBalances = await _context.OpeningBalanceByFiscalYear
                    .Where(ob => ob.CompanyId == companyId && ob.FiscalYearId == fiscalYearId)
                    .ToDictionaryAsync(ob => ob.AccountId, ob => ob);

                var reportData = new AuditReportDataDTO
                {
                    Company = MapCompanyInfo(company),
                    FiscalYear = MapFiscalYearInfo(fiscalYear),
                    ReportName = "Profit & Loss Account",
                    ReportType = "ProfitAndLoss",
                    GeneratedDate = DateTime.UtcNow,
                    GeneratedDateNepali = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                    AsOnDate = asOnDateAd,
                    AsOnDateNepali = asOnDateNepali,
                    IsNepaliFormat = company.DateFormat.ToString().ToLower() == "nepali",
                    DateFormat = company.DateFormat.ToString().ToLower()
                };

                decimal totalIncome = 0;
                decimal totalExpenses = 0;

                var accountGroups = await _context.AccountGroups
                    .Where(ag => ag.CompanyId == companyId)
                    .ToDictionaryAsync(g => g.Id, g => g);

                // Separate Income and Expense accounts
                var incomeAccounts = new List<AccountDetailDTO>();
                var expenseAccounts = new List<AccountDetailDTO>();

                foreach (var account in accounts)
                {
                    var accountGroupName = accountGroups.TryGetValue(account.AccountGroupsId, out var group)
                        ? group.Name
                        : "Uncategorized";

                    // Only include income and expense accounts
                    if (!_incomeAccountGroups.Contains(accountGroupName) &&
                        !_expenseAccountGroups.Contains(accountGroupName))
                        continue;

                    decimal closingBalance = 0;
                    string balanceType = "Cr";

                    if (closingBalances.TryGetValue(account.Id, out var cb))
                    {
                        closingBalance = cb.Amount;
                        balanceType = cb.Type;
                    }

                    // For P&L: Income accounts have Credit balance, Expenses have Debit balance
                    decimal amount = closingBalance;
                    bool isIncome = _incomeAccountGroups.Contains(accountGroupName);
                    bool isExpense = _expenseAccountGroups.Contains(accountGroupName);

                    if (isIncome)
                    {
                        totalIncome += amount;
                        incomeAccounts.Add(new AccountDetailDTO
                        {
                            AccountId = account.Id,
                            AccountName = account.Name,
                            AccountGroupName = accountGroupName,
                            OpeningBalance = openingBalances.TryGetValue(account.Id, out var ob) ? ob.Amount : 0,
                            Debit = 0,
                            Credit = amount,
                            ClosingBalance = amount,
                            BalanceType = "Cr",
                            AccountType = "Income"
                        });
                    }
                    else if (isExpense)
                    {
                        totalExpenses += amount;
                        expenseAccounts.Add(new AccountDetailDTO
                        {
                            AccountId = account.Id,
                            AccountName = account.Name,
                            AccountGroupName = accountGroupName,
                            OpeningBalance = openingBalances.TryGetValue(account.Id, out var ob) ? ob.Amount : 0,
                            Debit = amount,
                            Credit = 0,
                            ClosingBalance = amount,
                            BalanceType = "Dr",
                            AccountType = "Expense"
                        });
                    }
                }

                // Calculate Net Profit/Loss
                decimal netProfitLoss = totalIncome - totalExpenses;

                // Add all accounts to report
                reportData.AccountDetails.AddRange(incomeAccounts);
                reportData.AccountDetails.AddRange(expenseAccounts);

                reportData.Summary = new ReportSummaryDTO
                {
                    TotalDebit = totalExpenses,
                    TotalCredit = totalIncome,
                    NetProfit = netProfitLoss,
                    GrandTotal = totalIncome + totalExpenses,
                    IsBalanced = true,
                    BalanceStatus = "Balanced"
                };

                response.Success = true;
                response.Data = reportData;
                response.Message = "Profit & Loss Account generated successfully";
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating Profit & Loss Account");
                return new AuditReportResponseDTO
                {
                    Success = false,
                    Message = $"Error generating report: {ex.Message}",
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        public async Task<AuditReportResponseDTO> GetBalanceSheetAsync(
            Guid companyId, Guid fiscalYearId, DateTime? asOnDate = null)
        {
            try
            {
                var response = new AuditReportResponseDTO();
                var (company, fiscalYear) = await GetCompanyAndFiscalYearAsync(companyId, fiscalYearId);

                if (company == null || fiscalYear == null)
                {
                    response.Success = false;
                    response.Message = "Company or Fiscal Year not found";
                    return response;
                }

                var asOnDateAd = asOnDate ?? fiscalYear.EndDate ?? DateTime.UtcNow;
                var asOnDateNepali = fiscalYear.EndDateNepali ?? asOnDateAd.ToString("yyyy-MM-dd");

                var accounts = await GetAccountsWithBalancesAsync(companyId, fiscalYearId);
                var closingBalances = await _context.ClosingBalanceByFiscalYear
                    .Where(cb => cb.CompanyId == companyId && cb.FiscalYearId == fiscalYearId)
                    .ToDictionaryAsync(cb => cb.AccountId, cb => cb);

                var openingBalances = await _context.OpeningBalanceByFiscalYear
                    .Where(ob => ob.CompanyId == companyId && ob.FiscalYearId == fiscalYearId)
                    .ToDictionaryAsync(ob => ob.AccountId, ob => ob);

                var reportData = new AuditReportDataDTO
                {
                    Company = MapCompanyInfo(company),
                    FiscalYear = MapFiscalYearInfo(fiscalYear),
                    ReportName = "Balance Sheet",
                    ReportType = "BalanceSheet",
                    GeneratedDate = DateTime.UtcNow,
                    GeneratedDateNepali = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                    AsOnDate = asOnDateAd,
                    AsOnDateNepali = asOnDateNepali,
                    IsNepaliFormat = company.DateFormat.ToString().ToLower() == "nepali",
                    DateFormat = company.DateFormat.ToString().ToLower()
                };

                decimal totalAssets = 0;
                decimal totalLiabilities = 0;
                decimal totalEquity = 0;

                var accountGroups = await _context.AccountGroups
                    .Where(ag => ag.CompanyId == companyId)
                    .ToDictionaryAsync(g => g.Id, g => g);

                foreach (var account in accounts)
                {
                    var accountGroupName = accountGroups.TryGetValue(account.AccountGroupsId, out var group)
                        ? group.Name
                        : "Uncategorized";

                    // Skip nominal accounts for Balance Sheet
                    if (_nominalAccountGroups.Contains(accountGroupName) && accountGroupName != "Profit & Loss")
                        continue;

                    decimal closingBalance = 0;
                    string balanceType = "Cr";

                    if (closingBalances.TryGetValue(account.Id, out var cb))
                    {
                        closingBalance = cb.Amount;
                        balanceType = cb.Type;
                    }
                    else if (openingBalances.TryGetValue(account.Id, out var ob))
                    {
                        closingBalance = ob.Amount;
                        balanceType = ob.Type;
                    }

                    if (closingBalance == 0)
                        continue;

                    string accountType = GetAccountType(accountGroupName);
                    decimal debit = balanceType == "Dr" ? closingBalance : 0;
                    decimal credit = balanceType == "Cr" ? closingBalance : 0;

                    if (accountType == "Asset")
                    {
                        totalAssets += debit;
                    }
                    else if (accountType == "Liability")
                    {
                        totalLiabilities += credit;
                    }
                    else if (accountType == "Equity")
                    {
                        totalEquity += credit;
                    }

                    reportData.AccountDetails.Add(new AccountDetailDTO
                    {
                        AccountId = account.Id,
                        AccountName = account.Name,
                        AccountGroupName = accountGroupName,
                        OpeningBalance = openingBalances.TryGetValue(account.Id, out var ob2) ? ob2.Amount : 0,
                        Debit = debit,
                        Credit = credit,
                        ClosingBalance = closingBalance,
                        BalanceType = balanceType,
                        AccountType = accountType
                    });
                }

                reportData.Summary = new ReportSummaryDTO
                {
                    TotalAssets = totalAssets,
                    TotalLiabilities = totalLiabilities,
                    TotalEquity = totalEquity,
                    GrandTotal = totalAssets + totalLiabilities + totalEquity,
                    IsBalanced = Math.Abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01m,
                    BalanceStatus = Math.Abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01m
                        ? "Balanced"
                        : $"Difference: {Math.Abs(totalAssets - (totalLiabilities + totalEquity))}"
                };

                response.Success = true;
                response.Data = reportData;
                response.Message = "Balance Sheet generated successfully";
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating Balance Sheet");
                return new AuditReportResponseDTO
                {
                    Success = false,
                    Message = $"Error generating report: {ex.Message}",
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        public async Task<AuditReportResponseDTO> GetComprehensiveAuditReportAsync(
            Guid companyId, Guid fiscalYearId, DateTime? asOnDate = null)
        {
            try
            {
                // Generate all reports
                var openingTrialBalance = await GetOpeningTrialBalanceAsync(companyId, fiscalYearId, asOnDate);
                var closingTrialBalance = await GetClosingTrialBalanceAsync(companyId, fiscalYearId, asOnDate);
                var profitAndLoss = await GetProfitAndLossAccountAsync(companyId, fiscalYearId, asOnDate);
                var balanceSheet = await GetBalanceSheetAsync(companyId, fiscalYearId, asOnDate);

                // Combine into a comprehensive response
                var response = new AuditReportResponseDTO
                {
                    Success = openingTrialBalance.Success && closingTrialBalance.Success &&
                              profitAndLoss.Success && balanceSheet.Success,
                    Message = "Comprehensive audit report generated successfully"
                };

                if (!response.Success)
                {
                    response.Errors = new List<string>();
                    if (!openingTrialBalance.Success) response.Errors.Add("Opening Trial Balance failed");
                    if (!closingTrialBalance.Success) response.Errors.Add("Closing Trial Balance failed");
                    if (!profitAndLoss.Success) response.Errors.Add("Profit & Loss Account failed");
                    if (!balanceSheet.Success) response.Errors.Add("Balance Sheet failed");
                    return response;
                }

                // Combine all report data
                var combinedData = openingTrialBalance.Data;
                combinedData.ReportName = "Comprehensive Audit Report";

                // Add additional sections
                var sections = new Dictionary<string, AuditReportDataDTO>
                {
                    ["openingTrialBalance"] = openingTrialBalance.Data!,
                    ["closingTrialBalance"] = closingTrialBalance.Data!,
                    ["profitAndLoss"] = profitAndLoss.Data!,
                    ["balanceSheet"] = balanceSheet.Data!
                };

                // You can extend this to include all sections in the response
                response.Data = combinedData;

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating comprehensive audit report");
                return new AuditReportResponseDTO
                {
                    Success = false,
                    Message = $"Error generating report: {ex.Message}",
                    Errors = new List<string> { ex.Message }
                };
            }
        }

        // Helper Methods
        private async Task<List<Account>> GetAccountsWithBalancesAsync(Guid companyId, Guid fiscalYearId)
        {
            return await _context.Accounts
                .Where(a => a.CompanyId == companyId && a.IsActive)
                .OrderBy(a => a.Name)
                .ToListAsync();
        }

        private async Task<(Company? company, FiscalYear? fiscalYear)> GetCompanyAndFiscalYearAsync(
            Guid companyId, Guid fiscalYearId)
        {
            var company = await _context.Companies.FirstOrDefaultAsync(c => c.Id == companyId);
            var fiscalYear = await _context.FiscalYears
                .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);

            return (company, fiscalYear);
        }

        private CompanyInfoDTO MapCompanyInfo(Company company)
        {
            return new CompanyInfoDTO
            {
                Id = company.Id,
                Name = company.Name,
                Address = company.Address ?? string.Empty,
                Phone = company.Phone ?? string.Empty,
                Pan = company.Pan ?? string.Empty,
                City = company.City ?? string.Empty,
                Email = company.Email ?? string.Empty,
                DateFormat = company.DateFormat.ToString().ToLower()
            };
        }

        private FiscalYearInfoDTO MapFiscalYearInfo(FiscalYear fiscalYear)
        {
            return new FiscalYearInfoDTO
            {
                Id = fiscalYear.Id,
                Name = fiscalYear.Name,
                StartDate = fiscalYear.StartDate,
                EndDate = fiscalYear.EndDate,
                StartDateNepali = fiscalYear.StartDateNepali,
                EndDateNepali = fiscalYear.EndDateNepali,
                IsActive = fiscalYear.IsActive
            };
        }

        private string GetAccountType(string accountGroupName)
        {
            if (_assetAccountGroups.Contains(accountGroupName))
                return "Asset";
            if (_liabilityAccountGroups.Contains(accountGroupName))
                return "Liability";
            if (_equityAccountGroups.Contains(accountGroupName))
                return "Equity";
            if (_incomeAccountGroups.Contains(accountGroupName))
                return "Income";
            if (_expenseAccountGroups.Contains(accountGroupName))
                return "Expense";
            return "Other";
        }
    }
}