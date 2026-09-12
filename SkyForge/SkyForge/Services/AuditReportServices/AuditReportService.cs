// Services/AuditReportService.cs
using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto.AuditReportDto;
using SkyForge.Models.AccountGroupModel;
using SkyForge.Models.AccountModel;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.Retailer.TransactionModel;
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

        // public async Task<AuditReportResponseDTO> GetClosingTrialBalanceAsync(
        //     Guid companyId, Guid fiscalYearId, DateTime? asOnDate = null)
        // {
        //     try
        //     {
        //         var response = new AuditReportResponseDTO();
        //         var (company, fiscalYear) = await GetCompanyAndFiscalYearAsync(companyId, fiscalYearId);

        //         if (company == null || fiscalYear == null)
        //         {
        //             response.Success = false;
        //             response.Message = "Company or Fiscal Year not found";
        //             return response;
        //         }

        //         var asOnDateAd = asOnDate ?? fiscalYear.EndDate ?? DateTime.UtcNow;
        //         var asOnDateNepali = fiscalYear.EndDateNepali ?? asOnDateAd.ToString("yyyy-MM-dd");

        //         var accounts = await GetAccountsWithBalancesAsync(companyId, fiscalYearId);
        //         var openingBalances = await _context.OpeningBalanceByFiscalYear
        //             .Where(ob => ob.CompanyId == companyId && ob.FiscalYearId == fiscalYearId)
        //             .ToDictionaryAsync(ob => ob.AccountId, ob => ob);

        //         var closingBalances = await _context.ClosingBalanceByFiscalYear
        //             .Where(cb => cb.CompanyId == companyId && cb.FiscalYearId == fiscalYearId)
        //             .ToDictionaryAsync(cb => cb.AccountId, cb => cb);

        //         // ✅ Load transactions for this fiscal year (to compute per-account Debit/Credit)
        //         var transactions = await _context.Transactions
        //             .Where(t => t.CompanyId == companyId
        //                      && t.FiscalYearId == fiscalYearId
        //                      && t.Status == TransactionStatus.Active
        //                      && t.Date <= asOnDateAd)
        //             .Include(t => t.TransactionItems)
        //             .ToListAsync();

        //         var reportData = new AuditReportDataDTO
        //         {
        //             Company = MapCompanyInfo(company),
        //             FiscalYear = MapFiscalYearInfo(fiscalYear),
        //             ReportName = "Closing Trial Balance",
        //             ReportType = "ClosingTrialBalance",
        //             GeneratedDate = DateTime.UtcNow,
        //             GeneratedDateNepali = DateTime.UtcNow.ToString("yyyy-MM-dd"),
        //             AsOnDate = asOnDateAd,
        //             AsOnDateNepali = asOnDateNepali,
        //             IsNepaliFormat = company.DateFormat.ToString().ToLower() == "nepali",
        //             DateFormat = company.DateFormat.ToString().ToLower()
        //         };

        //         decimal totalDebit = 0;
        //         decimal totalCredit = 0;

        //         var accountGroups = await _context.AccountGroups
        //             .Where(ag => ag.CompanyId == companyId)
        //             .OrderBy(ag => ag.Name)
        //             .ToDictionaryAsync(g => g.Id, g => g);

        //         // ✅ Pre-compute per-account transaction Debit/Credit sums
        //         var txnDrCrByAccount = new Dictionary<Guid, (decimal Debit, decimal Credit)>();
        //         foreach (var tx in transactions)
        //         {
        //             // Header-level account
        //             void AddFor(Guid? accId, decimal dr, decimal cr)
        //             {
        //                 if (!accId.HasValue) return;
        //                 if (!txnDrCrByAccount.TryGetValue(accId.Value, out var cur))
        //                     cur = (0m, 0m);
        //                 cur.Debit += dr;
        //                 cur.Credit += cr;
        //                 txnDrCrByAccount[accId.Value] = cur;
        //             }

        //             AddFor(tx.AccountId, tx.TotalDebit, tx.TotalCredit);
        //             AddFor(tx.PaymentAccountId2, tx.TotalDebit, 0);
        //             AddFor(tx.ReceiptAccountId2, 0, tx.TotalCredit);
        //             AddFor(tx.DebitAccountId, tx.TotalDebit, 0);
        //             AddFor(tx.CreditAccountId, 0, tx.TotalCredit);
        //         }

        //         foreach (var account in accounts)
        //         {
        //             var accountGroupName = accountGroups.TryGetValue(account.AccountGroupsId, out var group)
        //                 ? group.Name
        //                 : "Uncategorized";

        //             // if (IsStockAccount(account.Name, accountGroupName))
        //             //     continue;

        //             decimal closingBalance = 0;
        //             string balanceType = "Cr";

        //             if (closingBalances.TryGetValue(account.Id, out var cb))
        //             {
        //                 closingBalance = cb.Amount;
        //                 balanceType = cb.Type;
        //             }

        //             // if (_nominalAccountGroups.Contains(accountGroupName) && accountGroupName != "Profit & Loss")
        //             //     continue;

        //             decimal openingBal = openingBalances.TryGetValue(account.Id, out var ob2) ? ob2.Amount : 0;
        //             string openingType = openingBalances.TryGetValue(account.Id, out var ob3) ? ob3.Type : "Cr";

        //             // ✅ Debit / Credit for detailed view from transaction items
        //             decimal detailDebit = 0;
        //             decimal detailCredit = 0;
        //             if (txnDrCrByAccount.TryGetValue(account.Id, out var dc))
        //             {
        //                 detailDebit = dc.Debit;
        //                 detailCredit = dc.Credit;
        //             }

        //             // Simple Dr/Cr from closing balance (summary view)
        //             decimal debit = balanceType == "Dr" ? closingBalance : 0;
        //             decimal credit = balanceType == "Cr" ? closingBalance : 0;

        //             totalDebit += debit;
        //             totalCredit += credit;

        //             reportData.AccountDetails.Add(new AccountDetailDTO
        //             {
        //                 AccountId = account.Id,
        //                 AccountName = account.Name,
        //                 AccountGroupName = accountGroupName,
        //                 OpeningBalance = openingBal,
        //                 OpeningBalanceType = openingType,     // ✅ for detailed view
        //                 Debit = debit,                          // summary view
        //                 Credit = credit,                        // summary view
        //                 DetailDebit = detailDebit,              // ✅ detailed view (from txns)
        //                 DetailCredit = detailCredit,            // ✅ detailed view (from txns)
        //                 ClosingBalance = closingBalance,
        //                 BalanceType = balanceType,
        //                 AccountType = GetAccountType(accountGroupName)
        //             });
        //         }

        //         reportData.Summary = new ReportSummaryDTO
        //         {
        //             TotalDebit = totalDebit,
        //             TotalCredit = totalCredit,
        //             GrandTotal = totalDebit + totalCredit,
        //             IsBalanced = Math.Abs(totalDebit - totalCredit) < 0.01m,
        //             BalanceStatus = Math.Abs(totalDebit - totalCredit) < 0.01m ? "Balanced" : "Unbalanced"
        //         };

        //         response.Success = true;
        //         response.Data = reportData;
        //         response.Message = "Closing Trial Balance generated successfully";
        //         return response;
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error generating Closing Trial Balance");
        //         return new AuditReportResponseDTO
        //         {
        //             Success = false,
        //             Message = $"Error generating report: {ex.Message}",
        //             Errors = new List<string> { ex.Message }
        //         };
        //     }
        // }

        // public async Task<AuditReportResponseDTO> GetClosingTrialBalanceAsync(
        //     Guid companyId, Guid fiscalYearId, DateTime? asOnDate = null)
        // {
        //     try
        //     {
        //         var response = new AuditReportResponseDTO();
        //         var (company, fiscalYear) = await GetCompanyAndFiscalYearAsync(companyId, fiscalYearId);

        //         if (company == null || fiscalYear == null)
        //         {
        //             response.Success = false;
        //             response.Message = "Company or Fiscal Year not found";
        //             return response;
        //         }

        //         var asOnDateAd = asOnDate ?? fiscalYear.EndDate ?? DateTime.UtcNow;
        //         var asOnDateNepali = fiscalYear.EndDateNepali ?? asOnDateAd.ToString("yyyy-MM-dd");

        //         var accounts = await GetAccountsWithBalancesAsync(companyId, fiscalYearId);
        //         var openingBalances = await _context.OpeningBalanceByFiscalYear
        //             .Where(ob => ob.CompanyId == companyId && ob.FiscalYearId == fiscalYearId)
        //             .ToDictionaryAsync(ob => ob.AccountId, ob => ob);

        //         var closingBalances = await _context.ClosingBalanceByFiscalYear
        //             .Where(cb => cb.CompanyId == companyId && cb.FiscalYearId == fiscalYearId)
        //             .ToDictionaryAsync(cb => cb.AccountId, cb => cb);

        //         // Load transactions for this fiscal year (to compute per-account Debit/Credit)
        //         var transactions = await _context.Transactions
        //             .Where(t => t.CompanyId == companyId
        //                      && t.FiscalYearId == fiscalYearId
        //                      && t.Status == TransactionStatus.Active
        //                      && t.Date <= asOnDateAd)
        //             .Include(t => t.TransactionItems)
        //             .ToListAsync();

        //         var reportData = new AuditReportDataDTO
        //         {
        //             Company = MapCompanyInfo(company),
        //             FiscalYear = MapFiscalYearInfo(fiscalYear),
        //             ReportName = "Closing Trial Balance",
        //             ReportType = "ClosingTrialBalance",
        //             GeneratedDate = DateTime.UtcNow,
        //             GeneratedDateNepali = DateTime.UtcNow.ToString("yyyy-MM-dd"),
        //             AsOnDate = asOnDateAd,
        //             AsOnDateNepali = asOnDateNepali,
        //             IsNepaliFormat = company.DateFormat.ToString().ToLower() == "nepali",
        //             DateFormat = company.DateFormat.ToString().ToLower()
        //         };

        //         decimal totalDebit = 0;
        //         decimal totalCredit = 0;

        //         var accountGroups = await _context.AccountGroups
        //             .Where(ag => ag.CompanyId == companyId)
        //             .OrderBy(ag => ag.Name)
        //             .ToDictionaryAsync(g => g.Id, g => g);

        //         // ============================================================
        //         // Pre-compute per-account transaction Debit/Credit sums
        //         // ============================================================
        //         var txnDrCrByAccount = new Dictionary<Guid, (decimal Debit, decimal Credit)>();

        //         void AddFor(Guid? accId, decimal dr, decimal cr)
        //         {
        //             if (!accId.HasValue) return;
        //             if (!txnDrCrByAccount.TryGetValue(accId.Value, out var cur))
        //                 cur = (0m, 0m);
        //             cur.Debit += dr;
        //             cur.Credit += cr;
        //             txnDrCrByAccount[accId.Value] = cur;
        //         }

        //         foreach (var tx in transactions)
        //         {
        //             AddFor(tx.AccountId, tx.TotalDebit, tx.TotalCredit);
        //             AddFor(tx.PaymentAccountId2, tx.TotalDebit, 0);
        //             AddFor(tx.ReceiptAccountId2, 0, tx.TotalCredit);
        //             AddFor(tx.DebitAccountId, tx.TotalDebit, 0);
        //             AddFor(tx.CreditAccountId, 0, tx.TotalCredit);
        //         }

        //         // ============================================================
        //         // Accumulator for Purchase (gross) — will be netted later
        //         // ============================================================
        //         decimal purchaseGrossDebit = 0;

        //         // ============================================================
        //         // Walk through accounts
        //         // ============================================================
        //         foreach (var account in accounts)
        //         {
        //             var accountGroupName = accountGroups.TryGetValue(account.AccountGroupsId, out var group)
        //                 ? group.Name
        //                 : "Uncategorized";

        //             // ✅ Skip stock accounts — handled via closing stock computation below
        //             if (IsStockAccount(account.Name, accountGroupName))
        //                 continue;

        //             decimal closingBalance = 0;
        //             string balanceType = "Cr";

        //             if (closingBalances.TryGetValue(account.Id, out var cb))
        //             {
        //                 closingBalance = cb.Amount;
        //                 balanceType = cb.Type;
        //             }

        //             decimal openingBal = openingBalances.TryGetValue(account.Id, out var ob2) ? ob2.Amount : 0;
        //             string openingType = openingBalances.TryGetValue(account.Id, out var ob3) ? ob3.Type : "Cr";

        //             decimal detailDebit = 0;
        //             decimal detailCredit = 0;
        //             if (txnDrCrByAccount.TryGetValue(account.Id, out var dc))
        //             {
        //                 detailDebit = dc.Debit;
        //                 detailCredit = dc.Credit;
        //             }

        //             decimal debit = balanceType == "Dr" ? closingBalance : 0;
        //             decimal credit = balanceType == "Cr" ? closingBalance : 0;

        //             // ✅ Skip Purchase group accounts — they'll be aggregated and netted
        //             if (accountGroupName == "Purchase")
        //             {
        //                 purchaseGrossDebit += debit - credit;
        //                 continue;
        //             }

        //             // ✅ Everything else → include as-is
        //             totalDebit += debit;
        //             totalCredit += credit;

        //             reportData.AccountDetails.Add(new AccountDetailDTO
        //             {
        //                 AccountId = account.Id,
        //                 AccountName = account.Name,
        //                 AccountGroupName = accountGroupName,
        //                 OpeningBalance = openingBal,
        //                 OpeningBalanceType = openingType,
        //                 Debit = debit,
        //                 Credit = credit,
        //                 DetailDebit = detailDebit,
        //                 DetailCredit = detailCredit,
        //                 ClosingBalance = closingBalance,
        //                 BalanceType = balanceType,
        //                 AccountType = GetAccountType(accountGroupName)
        //             });
        //         }

        //         // ============================================================
        //         // ✅ Compute Closing Stock from remaining StockEntries
        //         // ============================================================
        //         var stockEntries = await _context.StockEntries
        //             .Where(se => se.CompanyId == companyId && se.Quantity > 0)
        //             .ToListAsync();

        //         decimal closingStockValue = stockEntries
        //             .Sum(se => se.Quantity * se.PuPrice);

        //         // ============================================================
        //         // ✅ Purchase (Net) = Purchase (Gross) − Closing Stock
        //         //    → only the sold portion is displayed
        //         // ============================================================
        //         decimal purchaseNet = purchaseGrossDebit - closingStockValue;

        //         if (purchaseNet != 0)
        //         {
        //             var purchaseRow = new AccountDetailDTO
        //             {
        //                 AccountId = Guid.Empty,
        //                 AccountName = "Purchase (Net of Closing Stock)",
        //                 AccountGroupName = "Purchase",
        //                 Debit = purchaseNet > 0 ? purchaseNet : 0,
        //                 Credit = purchaseNet < 0 ? Math.Abs(purchaseNet) : 0,
        //                 ClosingBalance = Math.Abs(purchaseNet),
        //                 BalanceType = purchaseNet > 0 ? "Dr" : "Cr",
        //                 AccountType = "Expense"
        //             };
        //             reportData.AccountDetails.Add(purchaseRow);
        //             totalDebit += purchaseRow.Debit;
        //             totalCredit += purchaseRow.Credit;
        //         }

        //         // ============================================================
        //         // ✅ Add Closing Stock as a separate Dr asset row
        //         // ============================================================
        //         if (closingStockValue != 0)
        //         {
        //             var stockRow = new AccountDetailDTO
        //             {
        //                 AccountId = Guid.Empty,
        //                 AccountName = "Closing Stock",
        //                 AccountGroupName = "Stock in Hand",
        //                 Debit = closingStockValue,
        //                 Credit = 0,
        //                 ClosingBalance = closingStockValue,
        //                 BalanceType = "Dr",
        //                 AccountType = "Asset"
        //             };
        //             reportData.AccountDetails.Add(stockRow);
        //             totalDebit += stockRow.Debit;
        //         }

        //         // ============================================================
        //         // ✅ Safety: if still out of balance, add Difference row
        //         //    The plug row goes on the SHORT side (opposite of the imbalance)
        //         //    so the TB balances: Total Dr == Total Cr
        //         // ============================================================
        //         decimal difference = totalDebit - totalCredit;

        //         if (Math.Abs(difference) > 0.01m)
        //         {
        //             _logger.LogWarning(
        //                 "Closing TB out of balance by {Difference}. " +
        //                 "PurchaseGross={PG}, ClosingStock={CS}, PurchaseNet={PN}",
        //                 difference, purchaseGrossDebit, closingStockValue, purchaseNet);

        //             if (difference > 0)
        //             {
        //                 // ✅ Dr side is heavier → plug goes on CR side
        //                 decimal plug = difference;

        //                 var diffRow = new AccountDetailDTO
        //                 {
        //                     AccountId = Guid.Empty,
        //                     AccountName = "Difference in Opening Balance",
        //                     AccountGroupName = "Difference in Opening Balance",
        //                     Debit = 0,
        //                     Credit = plug,
        //                     ClosingBalance = plug,
        //                     BalanceType = "Cr",
        //                     AccountType = "Other"
        //                 };
        //                 reportData.AccountDetails.Add(diffRow);
        //                 totalCredit += plug;
        //             }
        //             else
        //             {
        //                 // ✅ Cr side is heavier → plug goes on DR side
        //                 decimal plug = Math.Abs(difference);

        //                 var diffRow = new AccountDetailDTO
        //                 {
        //                     AccountId = Guid.Empty,
        //                     AccountName = "Difference in Opening Balance",
        //                     AccountGroupName = "Difference in Opening Balance",
        //                     Debit = plug,
        //                     Credit = 0,
        //                     ClosingBalance = plug,
        //                     BalanceType = "Dr",
        //                     AccountType = "Other"
        //                 };
        //                 reportData.AccountDetails.Add(diffRow);
        //                 totalDebit += plug;
        //             }
        //         }

        //         // ============================================================
        //         // ✅ Order rows (Balance Sheet groups first, then Purchase, then Other)
        //         // ============================================================
        //         reportData.AccountDetails = reportData.AccountDetails
        //             .OrderBy(r => GetAccountGroupSortOrder(r.AccountGroupName))
        //             .ThenBy(r => r.AccountName)
        //             .ToList();

        //         // ============================================================
        //         // ✅ Summary
        //         // ============================================================
        //         reportData.Summary = new ReportSummaryDTO
        //         {
        //             TotalDebit = totalDebit,
        //             TotalCredit = totalCredit,
        //             GrandTotal = totalDebit + totalCredit,
        //             IsBalanced = Math.Abs(totalDebit - totalCredit) < 0.01m,
        //             BalanceStatus = Math.Abs(totalDebit - totalCredit) < 0.01m
        //                 ? "Balanced"
        //                 : $"Unbalanced by {Math.Abs(totalDebit - totalCredit):N2}"
        //         };

        //         response.Success = true;
        //         response.Data = reportData;
        //         response.Message = "Closing Trial Balance generated successfully";
        //         return response;
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error generating Closing Trial Balance");
        //         return new AuditReportResponseDTO
        //         {
        //             Success = false,
        //             Message = $"Error generating report: {ex.Message}",
        //             Errors = new List<string> { ex.Message }
        //         };
        //     }
        // }

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

                var closingBalances = await _context.ClosingBalanceByFiscalYear
                    .Where(cb => cb.CompanyId == companyId && cb.FiscalYearId == fiscalYearId)
                    .ToDictionaryAsync(cb => cb.AccountId, cb => cb);

                // Load transactions for this fiscal year (to compute per-account Debit/Credit)
                var transactions = await _context.Transactions
                    .Where(t => t.CompanyId == companyId
                             && t.FiscalYearId == fiscalYearId
                             && t.Status == TransactionStatus.Active
                             && t.Date <= asOnDateAd)
                    .Include(t => t.TransactionItems)
                    .ToListAsync();

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

                // ============================================================
                // Pre-compute per-account transaction Debit/Credit sums
                // ============================================================
                var txnDrCrByAccount = new Dictionary<Guid, (decimal Debit, decimal Credit)>();

                void AddFor(Guid? accId, decimal dr, decimal cr)
                {
                    if (!accId.HasValue) return;
                    if (!txnDrCrByAccount.TryGetValue(accId.Value, out var cur))
                        cur = (0m, 0m);
                    cur.Debit += dr;
                    cur.Credit += cr;
                    txnDrCrByAccount[accId.Value] = cur;
                }

                foreach (var tx in transactions)
                {
                    AddFor(tx.AccountId, tx.TotalDebit, tx.TotalCredit);
                    AddFor(tx.PaymentAccountId2, tx.TotalDebit, 0);
                    AddFor(tx.ReceiptAccountId2, 0, tx.TotalCredit);
                    AddFor(tx.DebitAccountId, tx.TotalDebit, 0);
                    AddFor(tx.CreditAccountId, 0, tx.TotalCredit);
                }

                // ============================================================
                // Accumulator for Purchase (gross) — will be netted later
                // ============================================================
                decimal purchaseGrossDebit = 0;

                // ============================================================
                // Walk through accounts
                // ============================================================
                foreach (var account in accounts)
                {
                    var accountGroupName = accountGroups.TryGetValue(account.AccountGroupsId, out var group)
                        ? group.Name
                        : "Uncategorized";

                    // ✅ Skip stock accounts — handled via closing stock computation below
                    if (IsStockAccount(account.Name, accountGroupName))
                        continue;

                    // ✅ Skip Reserves & Surplus — this is a PRE-CLOSING TB
                    //    The year's profit is already implicit in Sale/Purchase.
                    //    Adding Reserves here would double-count and unbalance the report.
                    if (accountGroupName == "Reserves & Surplus")
                        continue;

                    // ✅ Skip Profit & Loss control account (post-closing only)
                    if (accountGroupName == "Profit & Loss")
                        continue;

                    decimal closingBalance = 0;
                    string balanceType = "Cr";

                    if (closingBalances.TryGetValue(account.Id, out var cb))
                    {
                        closingBalance = cb.Amount;
                        balanceType = cb.Type;
                    }

                    decimal openingBal = openingBalances.TryGetValue(account.Id, out var ob2) ? ob2.Amount : 0;
                    string openingType = openingBalances.TryGetValue(account.Id, out var ob3) ? ob3.Type : "Cr";

                    decimal detailDebit = 0;
                    decimal detailCredit = 0;
                    if (txnDrCrByAccount.TryGetValue(account.Id, out var dc))
                    {
                        detailDebit = dc.Debit;
                        detailCredit = dc.Credit;
                    }

                    decimal debit = balanceType == "Dr" ? closingBalance : 0;
                    decimal credit = balanceType == "Cr" ? closingBalance : 0;

                    // ✅ Skip Purchase group accounts — they'll be aggregated and netted
                    if (accountGroupName == "Purchase")
                    {
                        purchaseGrossDebit += debit - credit;
                        continue;
                    }

                    // ✅ Everything else → include as-is
                    totalDebit += debit;
                    totalCredit += credit;

                    reportData.AccountDetails.Add(new AccountDetailDTO
                    {
                        AccountId = account.Id,
                        AccountName = account.Name,
                        AccountGroupName = accountGroupName,
                        OpeningBalance = openingBal,
                        OpeningBalanceType = openingType,
                        Debit = debit,
                        Credit = credit,
                        DetailDebit = detailDebit,
                        DetailCredit = detailCredit,
                        ClosingBalance = closingBalance,
                        BalanceType = balanceType,
                        AccountType = GetAccountType(accountGroupName)
                    });
                }

                // ============================================================
                // ✅ Compute Closing Stock from remaining StockEntries
                // ============================================================
                var stockEntries = await _context.StockEntries
                    .Where(se => se.CompanyId == companyId && se.Quantity > 0)
                    .ToListAsync();

                decimal closingStockValue = stockEntries
                    .Sum(se => se.Quantity * se.PuPrice);

                // ============================================================
                // ✅ Purchase (Net) = Purchase (Gross) − Closing Stock
                //    → only the sold portion is displayed
                // ============================================================
                decimal purchaseNet = purchaseGrossDebit - closingStockValue;

                if (purchaseNet != 0)
                {
                    var purchaseRow = new AccountDetailDTO
                    {
                        AccountId = Guid.Empty,
                        AccountName = "Purchase (Net of Closing Stock)",
                        AccountGroupName = "Purchase",
                        Debit = purchaseNet > 0 ? purchaseNet : 0,
                        Credit = purchaseNet < 0 ? Math.Abs(purchaseNet) : 0,
                        ClosingBalance = Math.Abs(purchaseNet),
                        BalanceType = purchaseNet > 0 ? "Dr" : "Cr",
                        AccountType = "Expense"
                    };
                    reportData.AccountDetails.Add(purchaseRow);
                    totalDebit += purchaseRow.Debit;
                    totalCredit += purchaseRow.Credit;
                }

                // ============================================================
                // ✅ Add Closing Stock as a separate Dr asset row
                // ============================================================
                if (closingStockValue != 0)
                {
                    var stockRow = new AccountDetailDTO
                    {
                        AccountId = Guid.Empty,
                        AccountName = "Closing Stock",
                        AccountGroupName = "Stock in Hand",
                        Debit = closingStockValue,
                        Credit = 0,
                        ClosingBalance = closingStockValue,
                        BalanceType = "Dr",
                        AccountType = "Asset"
                    };
                    reportData.AccountDetails.Add(stockRow);
                    totalDebit += stockRow.Debit;
                }

                // ============================================================
                // ✅ Safety: if still out of balance, add Difference row
                //    The plug row goes on the SHORT side (opposite of the imbalance)
                //    so the TB balances: Total Dr == Total Cr
                // ============================================================
                decimal difference = totalDebit - totalCredit;

                if (Math.Abs(difference) > 0.01m)
                {
                    _logger.LogWarning(
                        "Closing TB out of balance by {Difference}. " +
                        "PurchaseGross={PG}, ClosingStock={CS}, PurchaseNet={PN}",
                        difference, purchaseGrossDebit, closingStockValue, purchaseNet);

                    if (difference > 0)
                    {
                        // Dr side is heavier → plug on CR side
                        decimal plug = difference;

                        var diffRow = new AccountDetailDTO
                        {
                            AccountId = Guid.Empty,
                            AccountName = "Difference in Opening Balance",
                            AccountGroupName = "Difference in Opening Balance",
                            Debit = 0,
                            Credit = plug,
                            ClosingBalance = plug,
                            BalanceType = "Cr",
                            AccountType = "Other"
                        };
                        reportData.AccountDetails.Add(diffRow);
                        totalCredit += plug;
                    }
                    else
                    {
                        // Cr side is heavier → plug on DR side
                        decimal plug = Math.Abs(difference);

                        var diffRow = new AccountDetailDTO
                        {
                            AccountId = Guid.Empty,
                            AccountName = "Difference in Opening Balance",
                            AccountGroupName = "Difference in Opening Balance",
                            Debit = plug,
                            Credit = 0,
                            ClosingBalance = plug,
                            BalanceType = "Dr",
                            AccountType = "Other"
                        };
                        reportData.AccountDetails.Add(diffRow);
                        totalDebit += plug;
                    }
                }

                // ============================================================
                // ✅ Order rows
                // ============================================================
                reportData.AccountDetails = reportData.AccountDetails
                    .OrderBy(r => GetAccountGroupSortOrder(r.AccountGroupName))
                    .ThenBy(r => r.AccountName)
                    .ToList();

                // ============================================================
                // ✅ Summary
                // ============================================================
                reportData.Summary = new ReportSummaryDTO
                {
                    TotalDebit = totalDebit,
                    TotalCredit = totalCredit,
                    GrandTotal = totalDebit + totalCredit,
                    IsBalanced = Math.Abs(totalDebit - totalCredit) < 0.01m,
                    BalanceStatus = Math.Abs(totalDebit - totalCredit) < 0.01m
                        ? "Balanced"
                        : $"Unbalanced by {Math.Abs(totalDebit - totalCredit):N2}"
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

        // ============================================================
        // Sort order for account groups (optional — keeps report tidy)
        // ============================================================
        private static int GetAccountGroupSortOrder(string groupName)
        {
            if (string.IsNullOrWhiteSpace(groupName)) return 999;

            return groupName switch
            {
                "Capital Account" => 1,
                "Loans(Liability)" => 3,
                "Current Liabilities" => 4,
                "Duties & Taxes" => 5,
                "Provisions/Expenses Payable" => 6,
                "Sundry Creditors" => 7,
                "Fixed Assets" => 10,
                "Investments" => 11,
                "Current Assets" => 12,
                "Stock in Hand" => 13,
                "Securities & Deposits" => 14,
                "Loans & Advances" => 15,
                "Cash in Hand" => 16,
                "Bank Accounts" => 17,
                "Sundry Debtors" => 18,
                "Purchase" => 30,
                "Sale" => 31,
                "Income (Direct/Opr.)" => 32,
                "Income (Indirect)" => 33,
                "Expenses (Direct/Mfg.)" => 34,
                "Expenses (Indirect/Admn.)" => 35,
                "Profit & Loss" => 40,
                "Difference in Opening Balance" => 99,
                _ => 50
            };
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

                var cogsSummary = await CalculateCogsAsync(companyId, fiscalYearId);

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

                var accountGroups = await _context.AccountGroups
                    .Where(ag => ag.CompanyId == companyId)
                    .ToDictionaryAsync(g => g.Id, g => g);

                var periodicCogs = await CalculatePeriodicCogsAsync(companyId, fiscalYearId, accounts, accountGroups);

                // ============================================================
                // Helpers
                // ============================================================
                AccountDetailDTO Header(string name) => new AccountDetailDTO
                {
                    AccountId = Guid.Empty,
                    AccountName = name,
                    AccountGroupName = "",
                    OpeningBalance = 0,
                    Debit = 0,
                    Credit = 0,
                    ClosingBalance = 0,
                    BalanceType = "",
                    AccountType = "SECTION_HEADER"
                };

                AccountDetailDTO SubtotalCr(string label, decimal amount) => new AccountDetailDTO
                {
                    AccountId = Guid.Empty,
                    AccountName = label,
                    AccountGroupName = "",
                    OpeningBalance = 0,
                    Debit = 0,
                    Credit = amount,
                    ClosingBalance = amount,
                    BalanceType = "Cr",
                    AccountType = "SUBTOTAL"
                };

                AccountDetailDTO SubtotalDr(string label, decimal amount) => new AccountDetailDTO
                {
                    AccountId = Guid.Empty,
                    AccountName = label,
                    AccountGroupName = "",
                    OpeningBalance = 0,
                    Debit = amount,
                    Credit = 0,
                    ClosingBalance = amount,
                    BalanceType = "Dr",
                    AccountType = "SUBTOTAL"
                };

                // ============================================================
                // 1. SALE
                // ============================================================
                var saleDetails = new List<AccountDetailDTO>();
                decimal saleTotal = 0;

                foreach (var account in accounts)
                {
                    var groupName = accountGroups.TryGetValue(account.AccountGroupsId, out var g) ? g.Name : "";
                    if (groupName != "Sale") continue;

                    decimal bal = closingBalances.TryGetValue(account.Id, out var cb) ? cb.Amount : 0;
                    if (bal == 0) continue;

                    saleDetails.Add(new AccountDetailDTO
                    {
                        AccountId = account.Id,
                        AccountName = account.Name,
                        AccountGroupName = groupName,
                        OpeningBalance = openingBalances.TryGetValue(account.Id, out var ob) ? ob.Amount : 0,
                        Debit = 0,
                        Credit = bal,
                        ClosingBalance = bal,
                        BalanceType = "Cr",
                        AccountType = "Income"
                    });
                    saleTotal += bal;
                }

                // ============================================================
                // 2. INCOME (Direct/Opr.)
                // ============================================================
                var incomeDirectDetails = new List<AccountDetailDTO>();
                decimal incomeDirectTotal = 0;

                foreach (var account in accounts)
                {
                    var groupName = accountGroups.TryGetValue(account.AccountGroupsId, out var g) ? g.Name : "";
                    if (groupName != "Income (Direct/Opr.)") continue;

                    decimal bal = closingBalances.TryGetValue(account.Id, out var cb) ? cb.Amount : 0;
                    if (bal == 0) continue;

                    incomeDirectDetails.Add(new AccountDetailDTO
                    {
                        AccountId = account.Id,
                        AccountName = account.Name,
                        AccountGroupName = groupName,
                        OpeningBalance = openingBalances.TryGetValue(account.Id, out var ob) ? ob.Amount : 0,
                        Debit = 0,
                        Credit = bal,
                        ClosingBalance = bal,
                        BalanceType = "Cr",
                        AccountType = "Income"
                    });
                    incomeDirectTotal += bal;
                }

                // ============================================================
                // 3. INCOME (Indirect)
                // ============================================================
                var incomeIndirectDetails = new List<AccountDetailDTO>();
                decimal incomeIndirectTotal = 0;

                foreach (var account in accounts)
                {
                    var groupName = accountGroups.TryGetValue(account.AccountGroupsId, out var g) ? g.Name : "";
                    if (groupName != "Income (Indirect)") continue;

                    decimal bal = closingBalances.TryGetValue(account.Id, out var cb) ? cb.Amount : 0;
                    if (bal == 0) continue;

                    incomeIndirectDetails.Add(new AccountDetailDTO
                    {
                        AccountId = account.Id,
                        AccountName = account.Name,
                        AccountGroupName = groupName,
                        OpeningBalance = openingBalances.TryGetValue(account.Id, out var ob) ? ob.Amount : 0,
                        Debit = 0,
                        Credit = bal,
                        ClosingBalance = bal,
                        BalanceType = "Cr",
                        AccountType = "Income"
                    });
                    incomeIndirectTotal += bal;
                }

                decimal totalRevenue = saleTotal + incomeDirectTotal + incomeIndirectTotal;

                // ============================================================
                // 4. EXPENSES (Indirect/Admn.)
                // ============================================================
                var expenseIndirectDetails = new List<AccountDetailDTO>();
                decimal totalExpenseIndirect = 0;

                foreach (var account in accounts)
                {
                    var groupName = accountGroups.TryGetValue(account.AccountGroupsId, out var g) ? g.Name : "";
                    if (groupName != "Expenses (Indirect/Admn.)") continue;

                    decimal bal = closingBalances.TryGetValue(account.Id, out var cb) ? cb.Amount : 0;
                    if (bal == 0) continue;

                    expenseIndirectDetails.Add(new AccountDetailDTO
                    {
                        AccountId = account.Id,
                        AccountName = account.Name,
                        AccountGroupName = groupName,
                        OpeningBalance = openingBalances.TryGetValue(account.Id, out var ob) ? ob.Amount : 0,
                        Debit = bal,
                        Credit = 0,
                        ClosingBalance = bal,
                        BalanceType = "Dr",
                        AccountType = "Expense"
                    });
                    totalExpenseIndirect += bal;
                }

                // ============================================================
                // 5. COGS
                // ============================================================
                decimal cogs = periodicCogs.TotalCogs;

                var cogsRow = new AccountDetailDTO
                {
                    AccountId = Guid.Empty,
                    AccountName = "Cost of Goods Sold",
                    AccountGroupName = "COGS",
                    OpeningBalance = periodicCogs.OpeningStock,
                    Debit = cogs,
                    Credit = 0,
                    ClosingBalance = cogs,
                    BalanceType = "Dr",
                    AccountType = "COGS"
                };

                // ============================================================
                // 6. BUILD THE P&L — all sections always present
                // ============================================================

                // --- Sale ---
                reportData.AccountDetails.Add(Header("Sale"));
                reportData.AccountDetails.AddRange(saleDetails);
                reportData.AccountDetails.Add(SubtotalCr("Total Sale", saleTotal));

                // --- Income (Direct/Opr.) ---
                reportData.AccountDetails.Add(Header("Income (Direct/Opr.)"));
                reportData.AccountDetails.AddRange(incomeDirectDetails);
                reportData.AccountDetails.Add(SubtotalCr("Total Income (Direct/Opr.)", incomeDirectTotal));

                // --- Income (Indirect) ---
                reportData.AccountDetails.Add(Header("Income (Indirect)"));
                reportData.AccountDetails.AddRange(incomeIndirectDetails);
                reportData.AccountDetails.Add(SubtotalCr("Total Income (Indirect)", incomeIndirectTotal));

                // --- Total Revenue ---
                reportData.AccountDetails.Add(new AccountDetailDTO
                {
                    AccountId = Guid.Empty,
                    AccountName = "Total Revenue",
                    AccountGroupName = "",
                    OpeningBalance = 0,
                    Debit = 0,
                    Credit = totalRevenue,
                    ClosingBalance = totalRevenue,
                    BalanceType = "Cr",
                    AccountType = "SECTION_TOTAL"
                });

                // --- COGS ---
                reportData.AccountDetails.Add(Header("Cost of Goods Sold"));
                reportData.AccountDetails.Add(cogsRow);

                // --- Gross Profit ---
                decimal grossProfit = totalRevenue - cogs;
                reportData.AccountDetails.Add(new AccountDetailDTO
                {
                    AccountId = Guid.Empty,
                    AccountName = "Gross Profit",
                    AccountGroupName = "",
                    OpeningBalance = 0,
                    Debit = 0,
                    Credit = grossProfit >= 0 ? grossProfit : 0,
                    ClosingBalance = Math.Abs(grossProfit),
                    BalanceType = grossProfit >= 0 ? "Cr" : "Dr",
                    AccountType = "GROSS_PROFIT"
                });

                // --- Expenses (Indirect/Admn.) ---
                reportData.AccountDetails.Add(Header("Expenses (Indirect/Admn.)"));
                reportData.AccountDetails.AddRange(expenseIndirectDetails);
                reportData.AccountDetails.Add(SubtotalDr("Total Expenses (Indirect/Admn.)", totalExpenseIndirect));

                // --- Net Profit / Loss ---
                decimal netProfitLoss = grossProfit - totalExpenseIndirect;
                reportData.AccountDetails.Add(new AccountDetailDTO
                {
                    AccountId = Guid.Empty,
                    AccountName = "Net Profit / Loss",
                    AccountGroupName = "",
                    OpeningBalance = 0,
                    Debit = netProfitLoss < 0 ? Math.Abs(netProfitLoss) : 0,
                    Credit = netProfitLoss >= 0 ? netProfitLoss : 0,
                    ClosingBalance = Math.Abs(netProfitLoss),
                    BalanceType = netProfitLoss >= 0 ? "Cr" : "Dr",
                    AccountType = "NET_PROFIT"
                });

                // ============================================================
                // 7. SUMMARY
                // ============================================================
                reportData.CogsDetails = cogsSummary.Items;

                reportData.Summary = new ReportSummaryDTO
                {
                    TotalDebit = cogs + totalExpenseIndirect,
                    TotalCredit = totalRevenue,
                    NetProfit = netProfitLoss,
                    TotalCogs = cogs,
                    TotalPeriodicCogs = periodicCogs.TotalCogs,
                    CogsDifference = cogsSummary.TotalCogs - periodicCogs.TotalCogs,
                    GrandTotal = totalRevenue + cogs + totalExpenseIndirect,
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

        public async Task<AuditReportResponseDTO> GetCogsPeriodicAsync(
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

                var accounts = await GetAccountsWithBalancesAsync(companyId, fiscalYearId);
                var accountGroups = await _context.AccountGroups
                    .Where(ag => ag.CompanyId == companyId)
                    .ToDictionaryAsync(g => g.Id, g => g);

                var periodicCogs = await CalculatePeriodicCogsAsync(companyId, fiscalYearId, accounts, accountGroups);

                var asOnDateAd = asOnDate ?? fiscalYear.EndDate ?? DateTime.UtcNow;

                response.Success = true;
                response.Data = new AuditReportDataDTO
                {
                    Company = MapCompanyInfo(company),
                    FiscalYear = MapFiscalYearInfo(fiscalYear),
                    ReportName = "Cost of Goods Sold (Periodic)",
                    ReportType = "CogsPeriodic",
                    GeneratedDate = DateTime.UtcNow,
                    GeneratedDateNepali = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                    AsOnDate = asOnDateAd,
                    AsOnDateNepali = fiscalYear.EndDateNepali ?? asOnDateAd.ToString("yyyy-MM-dd"),
                    IsNepaliFormat = company.DateFormat.ToString().ToLower() == "nepali",
                    DateFormat = company.DateFormat.ToString().ToLower(),
                    PeriodicCogsDetails = periodicCogs,
                    Summary = new ReportSummaryDTO
                    {
                        TotalPeriodicCogs = periodicCogs.TotalCogs
                    }
                };
                response.Message = "Periodic COGS generated successfully";
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating Periodic COGS");
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


        private async Task<CogsSummaryDTO> CalculateCogsAsync(Guid companyId, Guid fiscalYearId)
        {
            var summary = new CogsSummaryDTO();

            // 1. Get all Sales and Sales Return transaction items for this fiscal year
            var transactionItems = await _context.TransactionItems
                .Include(ti => ti.Transaction)
                .Include(ti => ti.Item)
                .Where(ti =>
                    ti.Transaction.CompanyId == companyId &&
                    ti.Transaction.FiscalYearId == fiscalYearId &&
                    ti.Transaction.Status == TransactionStatus.Active &&
                    (ti.Transaction.Type == TransactionType.Sale ||
                     ti.Transaction.Type == TransactionType.SlRt) &&
                    ti.ItemId != null)
                .ToListAsync();

            if (!transactionItems.Any())
            {
                return summary;
            }

            // 2. Group by Item and compute sales qty, return qty, and weighted avg pu price
            var itemGroups = transactionItems
                .GroupBy(ti => new { ti.ItemId, ItemName = ti.Item?.Name ?? "Unknown" })
                .Select(g =>
                {
                    decimal salesQty = 0;
                    decimal salesReturnQty = 0;
                    decimal salesCostTotal = 0;      // sum of qty * puPrice for sales
                    decimal salesReturnCostTotal = 0; // sum of qty * puPrice for returns

                    foreach (var ti in g)
                    {
                        decimal qty = Math.Abs(ti.Quantity ?? 0);
                        decimal pu = ti.PuPrice ?? 0;

                        if (ti.Transaction.Type == TransactionType.Sale)
                        {
                            salesQty += qty;
                            salesCostTotal += qty * pu;
                        }
                        else if (ti.Transaction.Type == TransactionType.SlRt)
                        {
                            salesReturnQty += qty;
                            salesReturnCostTotal += qty * pu;
                        }
                    }

                    decimal netQty = salesQty - salesReturnQty;

                    // Weighted average of PuPrice across all rows (sales + returns)
                    decimal totalQty = salesQty + salesReturnQty;
                    decimal totalCost = salesCostTotal + salesReturnCostTotal;
                    decimal avgPu = totalQty > 0 ? totalCost / totalQty : 0;

                    decimal cogs = salesCostTotal - salesReturnCostTotal;

                    return new CogsDetailDTO
                    {
                        ItemId = g.Key.ItemId ?? Guid.Empty,
                        ItemName = g.Key.ItemName,
                        SalesQuantity = salesQty,
                        SalesReturnQuantity = salesReturnQty,
                        NetQuantity = netQty,
                        AveragePuPrice = Math.Round(avgPu, 2),
                        SalesCost = Math.Round(salesCostTotal, 2),
                        SalesReturnCost = Math.Round(salesReturnCostTotal, 2),
                        Cogs = Math.Round(cogs, 2)
                    };
                })
                .OrderBy(x => x.ItemName)
                .ToList();

            summary.Items = itemGroups;
            summary.TotalSalesCost = Math.Round(itemGroups.Sum(x => x.SalesCost), 2);
            summary.TotalSalesReturnCost = Math.Round(itemGroups.Sum(x => x.SalesReturnCost), 2);
            summary.TotalCogs = Math.Round(summary.TotalSalesCost - summary.TotalSalesReturnCost, 2);

            return summary;
        }


        private async Task<PeriodicCogsSummaryDTO> CalculatePeriodicCogsAsync(
    Guid companyId, Guid fiscalYearId, List<Account> accounts, Dictionary<Guid, AccountGroup> accountGroups)
        {
            var result = new PeriodicCogsSummaryDTO();

            // Opening Stock: sum of Stock in Hand accounts from OpeningBalanceByFiscalYear
            var openingBalances = await _context.OpeningBalanceByFiscalYear
                .Where(ob => ob.CompanyId == companyId && ob.FiscalYearId == fiscalYearId)
                .ToDictionaryAsync(ob => ob.AccountId, ob => ob);

            var closingBalances = await _context.ClosingBalanceByFiscalYear
                .Where(cb => cb.CompanyId == companyId && cb.FiscalYearId == fiscalYearId)
                .ToDictionaryAsync(cb => cb.AccountId, cb => cb);

            foreach (var account in accounts)
            {
                var groupName = accountGroups.TryGetValue(account.AccountGroupsId, out var g) ? g.Name : "";

                // Opening Stock
                if (groupName == "Stock in Hand" && openingBalances.TryGetValue(account.Id, out var ob))
                {
                    result.OpeningStock += ob.Amount;
                }

                // Closing Stock
                if (groupName == "Stock in Hand" && closingBalances.TryGetValue(account.Id, out var cb))
                {
                    result.ClosingStock += cb.Amount;
                }

                // Purchases (Purchase group) — read from closing balances
                if (groupName == "Purchase" && closingBalances.TryGetValue(account.Id, out var pcb))
                {
                    result.Purchases += pcb.Amount;
                }

                // Direct Expenses
                if (groupName == "Expenses (Direct/Mfg.)" && closingBalances.TryGetValue(account.Id, out var dcb))
                {
                    result.DirectExpenses += dcb.Amount;
                }
            }

            result.TotalCogs = result.OpeningStock + result.Purchases + result.DirectExpenses - result.ClosingStock;
            return result;
        }
    }
}