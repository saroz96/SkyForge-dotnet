using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto.RetailerDto;
using SkyForge.Models.AccountModel;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.Retailer.TransactionModel;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SkyForge.Services.Retailer.AgeingReportServices
{
    public class AgeingReportService : IAgeingReportService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<AgeingReportService> _logger;

        public AgeingReportService(
            ApplicationDbContext context,
            ILogger<AgeingReportService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<AgeingReportDataDto> GetAgeingReportAsync(Guid companyId, Guid fiscalYearId, DateTime asOnDate)
        {
            try
            {
                _logger.LogInformation("GetAgeingReportAsync called for Company: {CompanyId}, FiscalYear: {FiscalYearId}, AsOnDate: {AsOnDate}",
                    companyId, fiscalYearId, asOnDate);

                // Get company details
                var company = await _context.Companies
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                if (company == null)
                {
                    throw new ArgumentException("Company not found");
                }

                var companyDateFormat = company.DateFormat?.ToString().ToLower() ?? "english";
                var isNepaliFormat = companyDateFormat == "nepali";

                // Use the provided asOnDate for ageing calculation
                DateTime currentDateForAgeing = asOnDate;
                _logger.LogInformation("Using asOnDate for ageing calculation: {CurrentDateForAgeing} (IsNepaliFormat: {IsNepaliFormat})",
                    currentDateForAgeing, isNepaliFormat);

                // Get Sundry Debtors and Creditors groups
                var debtorGroup = await _context.AccountGroups
                    .FirstOrDefaultAsync(g => g.Name == "Sundry Debtors" && g.CompanyId == companyId);

                var creditorGroup = await _context.AccountGroups
                    .FirstOrDefaultAsync(g => g.Name == "Sundry Creditors" && g.CompanyId == companyId);

                if (debtorGroup == null || creditorGroup == null)
                {
                    throw new ArgumentException("Required account groups not found.");
                }

                // Get current fiscal year
                var currentFiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);

                if (currentFiscalYear == null)
                {
                    throw new ArgumentException("No fiscal year found.");
                }

                // Get initial fiscal year (oldest)
                var initialFiscalYear = await _context.FiscalYears
                    .Where(f => f.CompanyId == companyId)
                    .OrderBy(f => f.StartDate)
                    .FirstOrDefaultAsync();

                if (initialFiscalYear == null)
                {
                    throw new ArgumentException("No initial fiscal year found for company.");
                }

                // Get all debtor and creditor accounts with InitialOpeningBalance
                var debtorAccounts = await _context.Accounts
                    .Where(a => a.CompanyId == companyId &&
                           a.AccountGroupsId == debtorGroup.Id &&
                           a.IsActive)
                    .Include(a => a.InitialOpeningBalance)
                    .ToListAsync();

                var creditorAccounts = await _context.Accounts
                    .Where(a => a.CompanyId == companyId &&
                           a.AccountGroupsId == creditorGroup.Id &&
                           a.IsActive)
                    .Include(a => a.InitialOpeningBalance)
                    .ToListAsync();

                var allAccounts = debtorAccounts.Concat(creditorAccounts).ToList();
                var accountIds = allAccounts.Select(a => a.Id).ToList();

                // Query transactions ONLY UP TO the asOnDate
                var allTransactions = await _context.Transactions
                    .Where(t => t.CompanyId == companyId &&
                           accountIds.Contains(t.AccountId.Value) &&
                           t.IsActive &&
                           t.Status == TransactionStatus.Active &&
                           (t.PaymentMode != PaymentMode.Cash ||
                            t.Type == TransactionType.Pymt ||
                            t.Type == TransactionType.Rcpt ||
                            t.Type == TransactionType.Jrnl) &&
                           // Filter by date based on company format
                           ((isNepaliFormat && t.nepaliDate <= asOnDate) ||
                            (!isNepaliFormat && t.Date <= asOnDate)))
                    .Include(t => t.PurchaseBill)
                    .Include(t => t.PurchaseReturn)
                    .Include(t => t.SalesBill)
                    .Include(t => t.SalesReturn)
                    .Include(t => t.JournalVoucher)
                    .Include(t => t.DebitNote)
                    .Include(t => t.CreditNote)
                    .Include(t => t.Payment)
                    .Include(t => t.Receipt)
                    .Include(t => t.FiscalYear)
                    .OrderBy(t => isNepaliFormat ? t.nepaliDate : t.Date)
                    .ToListAsync();

                _logger.LogInformation("Found {TransactionCount} transactions up to date {AsOnDate}",
                    allTransactions.Count, asOnDate);

                // Process ageing
                var report = new List<AgeingAccountDto>();
                var receivableTotals = CreateEmptyBucket();
                var payableTotals = CreateEmptyBucket();
                var netTotals = CreateEmptyBucket();

                foreach (var account in allAccounts)
                {
                    // Calculate initial opening balance from InitialOpeningBalance
                    decimal openingBalance = 0;

                    // Use InitialOpeningBalance and filter by date
                    var initialOpeningBalance = account.InitialOpeningBalance;

                    if (initialOpeningBalance != null &&
                        initialOpeningBalance.InitialFiscalYearId == initialFiscalYear.Id)
                    {
                        // Check if the initial opening balance date is on or before the asOnDate
                        // DateTime openingBalanceDate = initialOpeningBalance.Date;

                        DateTime openingBalanceDate;
                        if (isNepaliFormat)
                        {
                            openingBalanceDate = initialOpeningBalance.NepaliDate;  // Use NepaliDate for Nepali format
                        }
                        else
                        {
                            openingBalanceDate = initialOpeningBalance.Date;  // Use Date for English format
                        }

                        // For Nepali format, we need to compare dates properly
                        bool isOpeningBalanceValid = false;

                        if (isNepaliFormat)
                        {
                            // For Nepali format, compare using nepaliDate equivalent
                            // Since opening balance date is stored as DateTime, we compare directly
                            // The date stored is in Nepali calendar format
                            isOpeningBalanceValid = openingBalanceDate <= asOnDate;
                        }
                        else
                        {
                            // For English format
                            isOpeningBalanceValid = openingBalanceDate <= asOnDate;
                        }

                        if (isOpeningBalanceValid)
                        {
                            openingBalance = initialOpeningBalance.Type == "Dr"
                                ? initialOpeningBalance.Amount
                                : -initialOpeningBalance.Amount;

                            _logger.LogDebug("Account: {AccountName}, Opening Balance: {OpeningBalance} (Type: {Type}, Date: {Date}) included because date <= AsOnDate",
                                account.Name, openingBalance, initialOpeningBalance.Type, openingBalanceDate);
                        }
                        else
                        {
                            _logger.LogDebug("Account: {AccountName}, Opening Balance Date: {Date} is after AsOnDate: {AsOnDate}, skipping opening balance",
                                account.Name, openingBalanceDate, asOnDate);
                        }
                    }
                    else
                    {
                        _logger.LogDebug("Account: {AccountName}, No initial opening balance found", account.Name);
                    }

                    // Get transactions for this account - ONLY up to asOnDate
                    var accountTransactions = allTransactions
                        .Where(t => t.AccountId == account.Id)
                        .Select(t => new
                        {
                            Transaction = t,
                            TransactionDate = isNepaliFormat ? t.nepaliDate : t.Date
                        })
                        .Where(t => t.TransactionDate <= asOnDate)
                        .OrderBy(t => t.TransactionDate)
                        .ToList();

                    var buckets = CreateEmptyBucket();
                    decimal remainingOpeningBalance = openingBalance;

                    var unsettledReceivables = new List<UnsettledItemDto>();
                    var unsettledPayables = new List<UnsettledItemDto>();

                    foreach (var txnData in accountTransactions)
                    {
                        var txn = txnData.Transaction;
                        var transactionDate = txnData.TransactionDate;

                        if (remainingOpeningBalance > 0.01m)
                        {
                            // Positive opening balance (receivable) - settle with credit transactions
                            if (txn.TotalCredit > 0)
                            {
                                var settlementAmount = Math.Min(txn.TotalCredit, remainingOpeningBalance);
                                remainingOpeningBalance -= settlementAmount;

                                var remainingCredit = txn.TotalCredit - settlementAmount;
                                if (remainingCredit > 0.01m)
                                {
                                    unsettledPayables.Add(new UnsettledItemDto
                                    {
                                        Date = transactionDate,
                                        Amount = remainingCredit,
                                        FiscalYearId = txn.FiscalYearId
                                    });
                                }
                            }
                            else if (txn.TotalDebit > 0)
                            {
                                unsettledReceivables.Add(new UnsettledItemDto
                                {
                                    Date = transactionDate,
                                    Amount = txn.TotalDebit,
                                    FiscalYearId = txn.FiscalYearId
                                });
                            }
                        }
                        else if (remainingOpeningBalance < -0.01m)
                        {
                            // Negative opening balance (payable) - settle with debit transactions
                            if (txn.TotalDebit > 0)
                            {
                                var settlementAmount = Math.Min(txn.TotalDebit, Math.Abs(remainingOpeningBalance));
                                remainingOpeningBalance += settlementAmount;

                                var remainingDebit = txn.TotalDebit - settlementAmount;
                                if (remainingDebit > 0.01m)
                                {
                                    unsettledReceivables.Add(new UnsettledItemDto
                                    {
                                        Date = transactionDate,
                                        Amount = remainingDebit,
                                        FiscalYearId = txn.FiscalYearId
                                    });
                                }
                            }
                            else if (txn.TotalCredit > 0)
                            {
                                unsettledPayables.Add(new UnsettledItemDto
                                {
                                    Date = transactionDate,
                                    Amount = txn.TotalCredit,
                                    FiscalYearId = txn.FiscalYearId
                                });
                            }
                        }
                        else
                        {
                            // Opening balance is zero - all transactions go to unsettled
                            if (txn.TotalDebit > 0)
                            {
                                unsettledReceivables.Add(new UnsettledItemDto
                                {
                                    Date = transactionDate,
                                    Amount = txn.TotalDebit,
                                    FiscalYearId = txn.FiscalYearId
                                });
                            }
                            if (txn.TotalCredit > 0)
                            {
                                unsettledPayables.Add(new UnsettledItemDto
                                {
                                    Date = transactionDate,
                                    Amount = txn.TotalCredit,
                                    FiscalYearId = txn.FiscalYearId
                                });
                            }
                        }
                    }

                    // Add remaining opening balance to over-120 bucket
                    if (Math.Abs(remainingOpeningBalance) > 0.01m)
                    {
                        buckets.Over120 += remainingOpeningBalance;
                    }

                    // Process remaining unsettled items with FIFO
                    var unpaidReceivables = new List<UnsettledItemDto>(unsettledReceivables);
                    var unpaidPayables = new List<UnsettledItemDto>(unsettledPayables);

                    // Settle receivables with payables using FIFO
                    foreach (var payable in unpaidPayables.OrderBy(p => p.Date).ToList())
                    {
                        decimal remainingPayable = payable.Amount;
                        int receivableIndex = 0;

                        while (remainingPayable > 0.01m && receivableIndex < unpaidReceivables.Count)
                        {
                            var receivable = unpaidReceivables[receivableIndex];
                            var settlementAmount = Math.Min(receivable.Amount, remainingPayable);

                            receivable.Amount -= settlementAmount;
                            remainingPayable -= settlementAmount;

                            if (receivable.Amount < 0.01m)
                            {
                                unpaidReceivables.RemoveAt(receivableIndex);
                            }
                            else
                            {
                                receivableIndex++;
                            }
                        }

                        payable.Amount = remainingPayable;
                    }

                    // Remove fully settled payables
                    var finalUnpaidPayables = unpaidPayables.Where(p => p.Amount > 0.01m).ToList();
                    var finalUnpaidReceivables = unpaidReceivables.Where(r => r.Amount > 0.01m).ToList();

                    // Calculate ageing for remaining items using the provided asOnDate
                    CalculateAgeing(finalUnpaidReceivables, true, buckets, currentDateForAgeing);
                    CalculateAgeing(finalUnpaidPayables, false, buckets, currentDateForAgeing);

                    // Calculate account total from buckets
                    buckets.Total = buckets.Range0To30 + buckets.Range30To60 + buckets.Range60To90 +
                                    buckets.Range90To120 + buckets.Over120;

                    bool isReceivable = buckets.Total > 0;

                    // Skip accounts with zero balance
                    if (Math.Abs(buckets.Total) < 0.01m) continue;

                    // Add to appropriate totals
                    if (isReceivable)
                    {
                        UpdateBucketTotals(receivableTotals, buckets);
                    }
                    else
                    {
                        var negatedBuckets = NegateBuckets(buckets);
                        UpdateBucketTotals(payableTotals, negatedBuckets);
                    }
                    UpdateBucketTotals(netTotals, buckets);

                    report.Add(new AgeingAccountDto
                    {
                        AccountName = account.Name,
                        Buckets = buckets,
                        IsReceivable = isReceivable,
                        NetBalance = Math.Abs(buckets.Total),
                        OpeningBalance = openingBalance
                    });
                }

                return new AgeingReportDataDto
                {
                    Report = report,
                    ReceivableTotals = receivableTotals,
                    PayableTotals = payableTotals,
                    NetTotals = netTotals,
                    Company = new CompanyInfoDTO
                    {
                        Id = company.Id,
                        Name = company.Name,
                        RenewalDate = company.RenewalDate,
                        DateFormat = company.DateFormat.ToString()
                    },
                    CurrentCompany = new { company.Id, company.Name, company.DateFormat },
                    CompanyDateFormat = companyDateFormat,
                    CurrentFiscalYear = new FiscalYearDTO
                    {
                        Id = currentFiscalYear.Id,
                        Name = currentFiscalYear.Name,
                        StartDate = currentFiscalYear.StartDate,
                        EndDate = currentFiscalYear.EndDate
                    },
                    InitialFiscalYear = new FiscalYearDTO
                    {
                        Id = initialFiscalYear.Id,
                        Name = initialFiscalYear.Name,
                        StartDate = initialFiscalYear.StartDate,
                        EndDate = initialFiscalYear.EndDate
                    },
                    CurrentCompanyName = company.Name
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetAgeingReportAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        private AgeingBucketDto CreateEmptyBucket()
        {
            return new AgeingBucketDto
            {
                Range0To30 = 0,
                Range30To60 = 0,
                Range60To90 = 0,
                Range90To120 = 0,
                Over120 = 0,
                Total = 0
            };
        }

        private void CalculateAgeing(List<UnsettledItemDto> items, bool isReceivable, AgeingBucketDto buckets, DateTime currentDate)
        {
            foreach (var item in items)
            {
                // Calculate age in days using TimeSpan
                int ageInDays = (int)(currentDate - item.Date).TotalDays;

                // Ensure age is not negative (if transaction date is after current date)
                if (ageInDays < 0)
                {
                    ageInDays = 0;
                }

                // Determine bucket
                if (ageInDays <= 30)
                    buckets.Range0To30 += isReceivable ? item.Amount : -item.Amount;
                else if (ageInDays <= 60)
                    buckets.Range30To60 += isReceivable ? item.Amount : -item.Amount;
                else if (ageInDays <= 90)
                    buckets.Range60To90 += isReceivable ? item.Amount : -item.Amount;
                else if (ageInDays <= 120)
                    buckets.Range90To120 += isReceivable ? item.Amount : -item.Amount;
                else
                    buckets.Over120 += isReceivable ? item.Amount : -item.Amount;
            }
        }

        private void UpdateBucketTotals(AgeingBucketDto totals, AgeingBucketDto buckets)
        {
            totals.Range0To30 += buckets.Range0To30;
            totals.Range30To60 += buckets.Range30To60;
            totals.Range60To90 += buckets.Range60To90;
            totals.Range90To120 += buckets.Range90To120;
            totals.Over120 += buckets.Over120;
            totals.Total += buckets.Total;
        }

        private AgeingBucketDto NegateBuckets(AgeingBucketDto buckets)
        {
            return new AgeingBucketDto
            {
                Range0To30 = -buckets.Range0To30,
                Range30To60 = -buckets.Range30To60,
                Range60To90 = -buckets.Range60To90,
                Range90To120 = -buckets.Range90To120,
                Over120 = -buckets.Over120,
                Total = -buckets.Total
            };
        }



        // public async Task<object> GetDayCountAgingForAccountAsync(Guid companyId, Guid fiscalYearId, Guid accountId, DateTime asOnDate)
        // {
        //     try
        //     {
        //         _logger.LogInformation("GetDayCountAgingForAccountAsync called for Company: {CompanyId}, Account: {AccountId}, AsOnDate: {AsOnDate}",
        //             companyId, accountId, asOnDate);

        //         // Get company details
        //         var company = await _context.Companies
        //             .FirstOrDefaultAsync(c => c.Id == companyId);

        //         if (company == null)
        //         {
        //             throw new ArgumentException("Company not found");
        //         }

        //         var companyDateFormat = company.DateFormat?.ToString().ToLower() ?? "nepali";
        //         var isNepaliFormat = companyDateFormat == "nepali";

        //         // Get account details
        //         var account = await _context.Accounts
        //             .Include(a => a.InitialOpeningBalance)
        //             .FirstOrDefaultAsync(a => a.Id == accountId && a.CompanyId == companyId);

        //         if (account == null)
        //         {
        //             throw new ArgumentException("Account not found");
        //         }

        //         // Get initial fiscal year
        //         var initialFiscalYear = await _context.FiscalYears
        //             .Where(f => f.CompanyId == companyId)
        //             .OrderBy(f => f.StartDate)
        //             .FirstOrDefaultAsync();

        //         // Get current fiscal year
        //         var currentFiscalYear = await _context.FiscalYears
        //             .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);

        //         // Initialize aging data
        //         var agingData = new
        //         {
        //             totalOutstanding = 0m,
        //             current = 0m,
        //             oneToThirty = 0m,
        //             thirtyOneToSixty = 0m,
        //             sixtyOneToNinety = 0m,
        //             ninetyPlus = 0m,
        //             openingBalance = 0m,
        //             openingBalanceType = "Dr",
        //             openingBalanceDate = DateTime.UtcNow,
        //             initialFiscalYearId = initialFiscalYear?.Id,
        //             transactions = new List<object>()
        //         };

        //         // Use initialOpeningBalance if available
        //         var initialOpeningBalance = account.InitialOpeningBalance;
        //         decimal openingBalance = 0;
        //         string openingBalanceType = "Dr";
        //         DateTime openingBalanceDate = DateTime.UtcNow;

        //         if (initialOpeningBalance != null && initialOpeningBalance.InitialFiscalYearId == initialFiscalYear?.Id)
        //         {
        //             DateTime openingBalanceDateToCheck;
        //             if (isNepaliFormat)
        //             {
        //                 openingBalanceDateToCheck = initialOpeningBalance.NepaliDate;
        //             }
        //             else
        //             {
        //                 openingBalanceDateToCheck = initialOpeningBalance.Date;
        //             }

        //             if (openingBalanceDateToCheck <= asOnDate)
        //             {
        //                 openingBalance = initialOpeningBalance.Amount;
        //                 openingBalanceType = initialOpeningBalance.Type;
        //                 openingBalanceDate = openingBalanceDateToCheck;
        //             }
        //         }

        //         // Calculate initial running balance
        //         decimal initialRunningBalance = openingBalanceType == "Cr" ? openingBalance : -openingBalance;
        //         _logger.LogInformation($"Initial opening balance for {account.Name}: {openingBalance} {openingBalanceType}");
        //         _logger.LogInformation($"Initial running balance: {initialRunningBalance}");

        //         // Get transactions before the asOnDate to calculate correct initial balance
        //         var transactionsBeforeDate = await GetTransactionsAsync(companyId, accountId, null, asOnDate, isNepaliFormat);

        //         _logger.LogInformation($"Found {transactionsBeforeDate.Count} transactions before asOnDate");

        //         // Process transactions before date to calculate running balance
        //         var processedVouchersBefore = new HashSet<string>();
        //         decimal runningBalance = initialRunningBalance;

        //         foreach (var transaction in transactionsBeforeDate.OrderBy(t => isNepaliFormat ? t.nepaliDate : t.Date))
        //         {
        //             var voucherIdentifier = GetVoucherIdentifier(transaction);

        //             if (processedVouchersBefore.Contains(voucherIdentifier))
        //                 continue;

        //             processedVouchersBefore.Add(voucherIdentifier);

        //             // Get all transactions for this voucher
        //             var voucherTransactions = transactionsBeforeDate.Where(t => GetVoucherIdentifier(t) == voucherIdentifier).ToList();
        //             var amounts = CalculateVoucherAmounts(voucherTransactions);

        //             runningBalance = UpdateRunningBalance(runningBalance, transaction, amounts);
        //         }

        //         _logger.LogInformation($"Running balance after previous transactions: {runningBalance}");

        //         // Get transactions on or before asOnDate
        //         var transactions = await GetTransactionsAsync(companyId, accountId, null, asOnDate, isNepaliFormat, includePopulations: true);

        //         _logger.LogInformation($"Found {transactions.Count} transactions on or before asOnDate");

        //         // Group transactions by voucher
        //         var voucherMap = new Dictionary<string, List<Transaction>>();
        //         foreach (var transaction in transactions)
        //         {
        //             var voucherIdentifier = GetVoucherIdentifier(transaction);
        //             if (!voucherMap.ContainsKey(voucherIdentifier))
        //             {
        //                 voucherMap[voucherIdentifier] = new List<Transaction>();
        //             }
        //             voucherMap[voucherIdentifier].Add(transaction);
        //         }

        //         _logger.LogInformation($"After grouping, {voucherMap.Count} unique vouchers found");

        //         // Process unique vouchers
        //         var processedVouchers = new HashSet<string>();
        //         var transactionList = new List<object>();
        //         decimal totalOutstanding = 0;
        //         decimal oneToThirty = 0, thirtyOneToSixty = 0, sixtyOneToNinety = 0, ninetyPlus = 0;

        //         foreach (var kvp in voucherMap.OrderBy(v => isNepaliFormat ? v.Value.First().nepaliDate : v.Value.First().Date))
        //         {
        //             var voucherIdentifier = kvp.Key;
        //             var voucherTransactions = kvp.Value;

        //             if (processedVouchers.Contains(voucherIdentifier))
        //                 continue;

        //             processedVouchers.Add(voucherIdentifier);

        //             var amounts = CalculateVoucherAmounts(voucherTransactions);
        //             var mainTransaction = IdentifyMainTransaction(voucherTransactions);

        //             // Calculate age in days
        //             var transactionDate = isNepaliFormat ? mainTransaction.nepaliDate : mainTransaction.Date;
        //             var ageInDays = (int)(asOnDate - transactionDate).TotalDays;
        //             if (ageInDays < 0) ageInDays = 0;

        //             // Update running balance
        //             runningBalance = UpdateRunningBalance(runningBalance, mainTransaction, amounts);

        //             // Calculate net amount for aging categorization
        //             var netAmount = amounts.totalDebit - amounts.totalCredit;

        //             if (netAmount > 0)
        //             {
        //                 totalOutstanding += netAmount;

        //                 // Categorize by age
        //                 if (ageInDays <= 30)
        //                     oneToThirty += netAmount;
        //                 else if (ageInDays <= 60)
        //                     thirtyOneToSixty += netAmount;
        //                 else if (ageInDays <= 90)
        //                     sixtyOneToNinety += netAmount;
        //                 else
        //                     ninetyPlus += netAmount;
        //             }

        //             // Prepare transaction data
        //             transactionList.Add(new
        //             {
        //                 _id = mainTransaction.Id,
        //                 date = mainTransaction.Date,
        //                 nepaliDate = mainTransaction.nepaliDate,
        //                 debit = amounts.totalDebit,
        //                 credit = amounts.totalCredit,
        //                 balance = runningBalance,
        //                 age = ageInDays,
        //                 ageCategory = ageInDays <= 30 ? "0-30 days" :
        //                              ageInDays <= 60 ? "31-60 days" :
        //                              ageInDays <= 90 ? "61-90 days" : "90+ days",
        //                 description = GetTransactionDescription(mainTransaction),
        //                 referenceNumber = GetReferenceNumber(mainTransaction),
        //                 type = GetTransactionType(mainTransaction),
        //                 voucherIdentifier = voucherIdentifier,
        //                 isGrouped = true,
        //                 totalItems = voucherTransactions.Count,
        //                 hasMainTransaction = amounts.isMainTransaction
        //             });
        //         }

        //         // Include opening balance in total outstanding
        //         totalOutstanding += openingBalance;

        //         // Get all accounts for the response
        //         var debtorGroup = await _context.AccountGroups
        //             .FirstOrDefaultAsync(g => g.Name == "Sundry Debtors" && g.CompanyId == companyId);

        //         var creditorGroup = await _context.AccountGroups
        //             .FirstOrDefaultAsync(g => g.Name == "Sundry Creditors" && g.CompanyId == companyId);

        //         var relevantGroupIds = new List<Guid>();
        //         if (debtorGroup != null) relevantGroupIds.Add(debtorGroup.Id);
        //         if (creditorGroup != null) relevantGroupIds.Add(creditorGroup.Id);

        //         var allAccounts = await _context.Accounts
        //             .Where(a => a.CompanyId == companyId &&
        //                    relevantGroupIds.Contains(a.AccountGroupsId) &&
        //                    a.IsActive)
        //             .OrderBy(a => a.Name)
        //             .Select(a => new
        //             {
        //                 _id = a.Id,
        //                 name = a.Name,
        //                 address = a.Address,
        //                 phone = a.Phone,
        //                 email = a.Email,
        //                 companyGroups = a.AccountGroupsId,
        //             })
        //             .ToListAsync();

        //         return new
        //         {
        //             account = new
        //             {
        //                 _id = account.Id,
        //                 name = account.Name,
        //                 address = account.Address,
        //                 phone = account.Phone,
        //                 email = account.Email,
        //                 companyGroups = account.AccountGroupsId,
        //                 openingBalance = openingBalance,
        //                 openingBalanceType = openingBalanceType,
        //                 openingBalanceDate = openingBalanceDate,
        //                 initialFiscalYear = initialFiscalYear?.Id,
        //                 initialOpeningBalance = account.InitialOpeningBalance != null ? new
        //                 {
        //                     amount = account.InitialOpeningBalance.Amount,
        //                     type = account.InitialOpeningBalance.Type,
        //                     date = account.InitialOpeningBalance.Date,
        //                     initialFiscalYearId = account.InitialOpeningBalance.InitialFiscalYearId
        //                 } : null
        //             },
        //             agingData = new
        //             {
        //                 totalOutstanding = totalOutstanding,
        //                 agingBreakdown = new
        //                 {
        //                     current = 0m,
        //                     oneToThirty = oneToThirty,
        //                     thirtyOneToSixty = thirtyOneToSixty,
        //                     sixtyOneToNinety = sixtyOneToNinety,
        //                     ninetyPlus = ninetyPlus
        //                 },
        //                 transactions = transactionList,
        //                 summary = new
        //                 {
        //                     totalTransactions = transactionList.Count,
        //                     asOnDate = asOnDate,
        //                     initialBalanceUsed = new
        //                     {
        //                         amount = openingBalance,
        //                         type = openingBalanceType,
        //                         date = openingBalanceDate
        //                     }
        //                 }
        //             },
        //             company = new
        //             {
        //                 _id = company.Id,
        //                 name = company.Name,
        //                 dateFormat = company.DateFormat.ToString()
        //             },
        //             currentFiscalYear = currentFiscalYear != null ? new
        //             {
        //                 _id = currentFiscalYear.Id,
        //                 name = currentFiscalYear.Name,
        //                 startDate = currentFiscalYear.StartDate,
        //                 endDate = currentFiscalYear.EndDate
        //             } : null,
        //             accounts = allAccounts,
        //             currentCompanyName = company.Name,
        //             asOnDate = asOnDate,
        //             hasDateFilter = true
        //         };
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error in GetDayCountAgingForAccountAsync");
        //         throw;
        //     }
        // }

        public async Task<object> GetDayCountAgingForAccountAsync(Guid companyId, Guid fiscalYearId, Guid accountId, DateTime asOnDate)
        {
            try
            {
                _logger.LogInformation("GetDayCountAgingForAccountAsync called for Company: {CompanyId}, Account: {AccountId}, AsOnDate: {AsOnDate}",
                    companyId, accountId, asOnDate);

                // Get company details
                var company = await _context.Companies
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                if (company == null)
                {
                    throw new ArgumentException("Company not found");
                }

                var companyDateFormat = company.DateFormat?.ToString().ToLower() ?? "nepali";
                var isNepaliFormat = companyDateFormat == "nepali";

                // Get account details
                var account = await _context.Accounts
                    .Include(a => a.InitialOpeningBalance)
                    .FirstOrDefaultAsync(a => a.Id == accountId && a.CompanyId == companyId);

                if (account == null)
                {
                    throw new ArgumentException("Account not found");
                }

                // Get initial fiscal year
                var initialFiscalYear = await _context.FiscalYears
                    .Where(f => f.CompanyId == companyId)
                    .OrderBy(f => f.StartDate)
                    .FirstOrDefaultAsync();

                // Get current fiscal year
                var currentFiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);

                // Use initialOpeningBalance if available
                var initialOpeningBalance = account.InitialOpeningBalance;
                decimal openingBalance = 0;
                string openingBalanceType = "Dr";
                DateTime openingBalanceDate = DateTime.UtcNow;

                if (initialOpeningBalance != null && initialOpeningBalance.InitialFiscalYearId == initialFiscalYear?.Id)
                {
                    DateTime openingBalanceDateToCheck;
                    if (isNepaliFormat)
                    {
                        openingBalanceDateToCheck = initialOpeningBalance.NepaliDate;
                    }
                    else
                    {
                        openingBalanceDateToCheck = initialOpeningBalance.Date;
                    }

                    if (openingBalanceDateToCheck <= asOnDate)
                    {
                        openingBalance = initialOpeningBalance.Amount;
                        openingBalanceType = initialOpeningBalance.Type;
                        openingBalanceDate = openingBalanceDateToCheck;
                    }
                }

                // FIXED: Calculate initial running balance correctly
                // For Sundry Debtors/Receivable accounts:
                // Dr (Debit) = Positive balance (customer owes us)
                // Cr (Credit) = Negative balance (we owe customer)
                decimal initialRunningBalance = openingBalanceType == "Dr" ? openingBalance : -openingBalance;

                _logger.LogInformation($"Initial opening balance for {account.Name}: {openingBalance} {openingBalanceType}");
                _logger.LogInformation($"Initial running balance: {initialRunningBalance}");

                // Get ALL transactions (not just before date) for proper calculation
                var allTransactions = await GetTransactionsAsync(companyId, accountId, null, asOnDate, isNepaliFormat, includePopulations: true);

                _logger.LogInformation($"Found {allTransactions.Count} total transactions");

                // Process transactions in chronological order to calculate running balance
                var processedVouchers = new HashSet<string>();
                decimal runningBalance = initialRunningBalance;
                var transactionList = new List<object>();
                decimal totalOutstanding = 0;
                decimal oneToThirty = 0, thirtyOneToSixty = 0, sixtyOneToNinety = 0, ninetyPlus = 0;

                // Group transactions by date and voucher
                var groupedTransactions = allTransactions
                    .GroupBy(t => isNepaliFormat ? t.nepaliDate : t.Date)
                    .OrderBy(g => g.Key)
                    .SelectMany(g => g.OrderBy(t => t.CreatedAt))
                    .ToList();

                var processedVoucherIds = new HashSet<string>();

                foreach (var transaction in groupedTransactions)
                {
                    var voucherIdentifier = GetVoucherIdentifier(transaction);

                    if (processedVoucherIds.Contains(voucherIdentifier))
                        continue;

                    processedVoucherIds.Add(voucherIdentifier);

                    // Get all transactions for this voucher
                    var voucherTransactions = allTransactions.Where(t => GetVoucherIdentifier(t) == voucherIdentifier).ToList();
                    var amounts = CalculateVoucherAmounts(voucherTransactions);
                    var mainTransaction = IdentifyMainTransaction(voucherTransactions);

                    // Calculate age in days
                    var transactionDate = isNepaliFormat ? mainTransaction.nepaliDate : mainTransaction.Date;
                    var ageInDays = (int)(asOnDate - transactionDate).TotalDays;
                    if (ageInDays < 0) ageInDays = 0;

                    // FIXED: Update running balance correctly
                    // For a receivable account:
                    // Debit increases the balance (customer owes more)
                    // Credit decreases the balance (customer pays)
                    runningBalance = runningBalance + amounts.totalDebit - amounts.totalCredit;

                    // Calculate net amount for aging categorization (only positive outstanding amounts)
                    var netAmount = amounts.totalDebit - amounts.totalCredit;

                    if (netAmount > 0)
                    {
                        totalOutstanding += netAmount;

                        // Categorize by age
                        if (ageInDays <= 30)
                            oneToThirty += netAmount;
                        else if (ageInDays <= 60)
                            thirtyOneToSixty += netAmount;
                        else if (ageInDays <= 90)
                            sixtyOneToNinety += netAmount;
                        else
                            ninetyPlus += netAmount;
                    }

                    // Prepare transaction data
                    transactionList.Add(new
                    {
                        _id = mainTransaction.Id,
                        date = mainTransaction.Date,
                        nepaliDate = mainTransaction.nepaliDate,
                        debit = amounts.totalDebit,
                        credit = amounts.totalCredit,
                        balance = runningBalance,
                        age = ageInDays,
                        ageCategory = ageInDays <= 30 ? "0-30 days" :
                                     ageInDays <= 60 ? "31-60 days" :
                                     ageInDays <= 90 ? "61-90 days" : "90+ days",
                        description = GetTransactionDescription(mainTransaction),
                        referenceNumber = GetReferenceNumber(mainTransaction),
                        type = GetTransactionType(mainTransaction),
                        voucherIdentifier = voucherIdentifier,
                        isGrouped = true,
                        totalItems = voucherTransactions.Count,
                        hasMainTransaction = amounts.isMainTransaction
                    });
                }

                // Get all accounts for the response
                var debtorGroup = await _context.AccountGroups
                    .FirstOrDefaultAsync(g => g.Name == "Sundry Debtors" && g.CompanyId == companyId);

                var creditorGroup = await _context.AccountGroups
                    .FirstOrDefaultAsync(g => g.Name == "Sundry Creditors" && g.CompanyId == companyId);

                var relevantGroupIds = new List<Guid>();
                if (debtorGroup != null) relevantGroupIds.Add(debtorGroup.Id);
                if (creditorGroup != null) relevantGroupIds.Add(creditorGroup.Id);

                var allAccounts = await _context.Accounts
                    .Where(a => a.CompanyId == companyId &&
                           relevantGroupIds.Contains(a.AccountGroupsId) &&
                           a.IsActive)
                    .OrderBy(a => a.Name)
                    .Select(a => new
                    {
                        _id = a.Id,
                        name = a.Name,
                        address = a.Address,
                        phone = a.Phone,
                        email = a.Email,
                        companyGroups = a.AccountGroupsId,
                    })
                    .ToListAsync();

                return new
                {
                    account = new
                    {
                        _id = account.Id,
                        name = account.Name,
                        address = account.Address,
                        phone = account.Phone,
                        email = account.Email,
                        companyGroups = account.AccountGroupsId,
                        openingBalance = openingBalance,
                        openingBalanceType = openingBalanceType,
                        openingBalanceDate = openingBalanceDate,
                        initialFiscalYear = initialFiscalYear?.Id,
                        initialOpeningBalance = account.InitialOpeningBalance != null ? new
                        {
                            amount = account.InitialOpeningBalance.Amount,
                            type = account.InitialOpeningBalance.Type,
                            date = account.InitialOpeningBalance.Date,
                            initialFiscalYearId = account.InitialOpeningBalance.InitialFiscalYearId
                        } : null
                    },
                    agingData = new
                    {
                        totalOutstanding = totalOutstanding,
                        agingBreakdown = new
                        {
                            current = 0m,
                            oneToThirty = oneToThirty,
                            thirtyOneToSixty = thirtyOneToSixty,
                            sixtyOneToNinety = sixtyOneToNinety,
                            ninetyPlus = ninetyPlus
                        },
                        transactions = transactionList,
                        summary = new
                        {
                            totalTransactions = transactionList.Count,
                            asOnDate = asOnDate,
                            initialBalanceUsed = new
                            {
                                amount = openingBalance,
                                type = openingBalanceType,
                                date = openingBalanceDate
                            }
                        }
                    },
                    company = new
                    {
                        _id = company.Id,
                        name = company.Name,
                        dateFormat = company.DateFormat.ToString()
                    },
                    currentFiscalYear = currentFiscalYear != null ? new
                    {
                        _id = currentFiscalYear.Id,
                        name = currentFiscalYear.Name,
                        startDate = currentFiscalYear.StartDate,
                        endDate = currentFiscalYear.EndDate
                    } : null,
                    accounts = allAccounts,
                    currentCompanyName = company.Name,
                    asOnDate = asOnDate,
                    hasDateFilter = true
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetDayCountAgingForAccountAsync");
                throw;
            }
        }

        private async Task<List<Transaction>> GetTransactionsAsync(Guid companyId, Guid accountId, DateTime? fromDate, DateTime toDate, bool isNepaliFormat, bool includePopulations = false)
        {
            var query = _context.Transactions
                .Where(t => t.CompanyId == companyId &&
                       t.AccountId == accountId &&
                       t.IsActive &&
                       t.Status == TransactionStatus.Active);

            // FIXED: Exclude cash transactions properly
            // Cash transactions should not be included in ageing report
            query = query.Where(t => t.PaymentMode != PaymentMode.Cash);

            // Apply date filter
            if (isNepaliFormat)
            {
                if (fromDate.HasValue)
                    query = query.Where(t => t.nepaliDate >= fromDate.Value);
                query = query.Where(t => t.nepaliDate <= toDate);
            }
            else
            {
                if (fromDate.HasValue)
                    query = query.Where(t => t.Date >= fromDate.Value);
                query = query.Where(t => t.Date <= toDate);
            }

            if (includePopulations)
            {
                query = query
                    .Include(t => t.PurchaseBill)
                    .Include(t => t.PurchaseReturn)
                    .Include(t => t.SalesBill)
                    .Include(t => t.SalesReturn)
                    .Include(t => t.JournalVoucher)
                    .Include(t => t.DebitNote)
                    .Include(t => t.CreditNote)
                    .Include(t => t.Payment)
                    .Include(t => t.Receipt)
                    .Include(t => t.TransactionItems);
            }

            return await query.ToListAsync();
        }

        private decimal UpdateRunningBalance(decimal runningBalance, Transaction transaction, (decimal totalDebit, decimal totalCredit, bool isMainTransaction) amounts)
        {
            // For a receivable account (Sundry Debtors):
            // Debit (Dr) increases the balance (customer owes more)
            // Credit (Cr) decreases the balance (customer pays)

            // Skip cash transactions - they should already be filtered out
            if (transaction.PaymentMode == PaymentMode.Cash)
                return runningBalance;

            // Simple calculation: runningBalance + debit - credit
            return runningBalance + amounts.totalDebit - amounts.totalCredit;
        }

        // private async Task<List<Transaction>> GetTransactionsAsync(Guid companyId, Guid accountId, DateTime? fromDate, DateTime toDate, bool isNepaliFormat, bool includePopulations = false)
        // {
        //     var query = _context.Transactions
        //         .Where(t => t.CompanyId == companyId &&
        //                t.AccountId == accountId &&
        //                t.IsActive &&
        //                t.Status == TransactionStatus.Active &&
        //                (t.PaymentMode != PaymentMode.Cash ||
        //                 t.Type == TransactionType.Pymt ||
        //                 t.Type == TransactionType.Rcpt ||
        //                 t.Type == TransactionType.Jrnl));

        //     // Apply date filter
        //     if (isNepaliFormat)
        //     {
        //         if (fromDate.HasValue)
        //             query = query.Where(t => t.nepaliDate >= fromDate.Value);
        //         query = query.Where(t => t.nepaliDate <= toDate);
        //     }
        //     else
        //     {
        //         if (fromDate.HasValue)
        //             query = query.Where(t => t.Date >= fromDate.Value);
        //         query = query.Where(t => t.Date <= toDate);
        //     }

        //     if (includePopulations)
        //     {
        //         query = query
        //             .Include(t => t.PurchaseBill)
        //             .Include(t => t.PurchaseReturn)
        //             .Include(t => t.SalesBill)
        //             .Include(t => t.SalesReturn)
        //             .Include(t => t.JournalVoucher)
        //             .Include(t => t.DebitNote)
        //             .Include(t => t.CreditNote)
        //             .Include(t => t.Payment)
        //             .Include(t => t.Receipt);
        //     }

        //     return await query.ToListAsync();
        // }

        private string GetVoucherIdentifier(Transaction transaction)
        {
            if (!string.IsNullOrEmpty(transaction.BillNumber))
                return $"bill_{transaction.BillNumber}";
            if (!string.IsNullOrEmpty(transaction.PartyBillNumber))
                return $"party_bill_{transaction.PartyBillNumber}";
            if (transaction.SalesBillId.HasValue)
                return $"sales_bill_{transaction.SalesBill?.BillNumber}";
            if (transaction.PurchaseBillId.HasValue)
                return $"purchase_bill_{transaction.PurchaseBill?.BillNumber}";
            if (transaction.SalesReturnBillId.HasValue)
                return $"sales_return_{transaction.SalesReturn?.BillNumber}";
            if (transaction.PurchaseReturnBillId.HasValue)
                return $"purchase_return_{transaction.PurchaseReturn?.BillNumber}";
            if (transaction.JournalBillId.HasValue)
                return $"journal_{transaction.JournalVoucher?.BillNumber}";
            if (transaction.DebitNoteId.HasValue)
                return $"debit_note_{transaction.DebitNote?.BillNumber}";
            if (transaction.CreditNoteId.HasValue)
                return $"credit_note_{transaction.CreditNote?.BillNumber}";

            return $"other_{transaction.Date}_{transaction.TotalDebit}_{transaction.TotalCredit}";
        }

        private (decimal totalDebit, decimal totalCredit, bool isMainTransaction) CalculateVoucherAmounts(List<Transaction> transactions)
        {
            var mainTransaction = IdentifyMainTransaction(transactions);

            if (mainTransaction.TransactionItems == null || !mainTransaction.TransactionItems.Any() || mainTransaction.IsType.HasValue)
            {
                return (mainTransaction.TotalDebit, mainTransaction.TotalCredit, true);
            }

            // If all transactions have items and no main transaction found
            if (mainTransaction.Type == TransactionType.Purc && mainTransaction.PurchaseBillId.HasValue)
            {
                return (0, mainTransaction.TotalCredit, false);
            }
            else if (mainTransaction.Type == TransactionType.Sale && mainTransaction.SalesBillId.HasValue)
            {
                return (mainTransaction.TotalDebit, 0, false);
            }

            return (mainTransaction.TotalDebit, mainTransaction.TotalCredit, false);
        }

        private Transaction IdentifyMainTransaction(List<Transaction> transactions)
        {
            // Look for a transaction without items or with IsType
            var transactionWithoutItem = transactions.FirstOrDefault(t => t.TransactionItems == null || !t.TransactionItems.Any());
            if (transactionWithoutItem != null)
                return transactionWithoutItem;

            var vatTransaction = transactions.FirstOrDefault(t => t.IsType.HasValue);
            if (vatTransaction != null)
                return vatTransaction;

            return transactions.FirstOrDefault();
        }

        // private decimal UpdateRunningBalance(decimal runningBalance, Transaction transaction, (decimal totalDebit, decimal totalCredit, bool isMainTransaction) amounts)
        // {
        //     if (transaction.SalesBillId.HasValue)
        //     {
        //         runningBalance -= amounts.totalDebit;
        //     }
        //     else if (transaction.SalesReturnBillId.HasValue)
        //     {
        //         runningBalance += amounts.totalCredit;
        //     }
        //     else if (transaction.PurchaseBillId.HasValue)
        //     {
        //         runningBalance += amounts.totalCredit;
        //     }
        //     else if (transaction.PurchaseReturnBillId.HasValue)
        //     {
        //         runningBalance -= amounts.totalDebit;
        //     }
        //     else if (transaction.PaymentAccountId.HasValue || transaction.ReceiptAccountId.HasValue ||
        //              transaction.DebitNoteId.HasValue || transaction.CreditNoteId.HasValue || transaction.JournalBillId.HasValue)
        //     {
        //         if (amounts.totalDebit > 0) runningBalance -= amounts.totalDebit;
        //         if (amounts.totalCredit > 0) runningBalance += amounts.totalCredit;
        //     }

        //     return runningBalance;
        // }

        private string GetTransactionDescription(Transaction transaction)
        {
            if (transaction.SalesBillId.HasValue)
                return $"Sales Bill - {transaction.SalesBill?.BillNumber ?? ""}";
            if (transaction.PurchaseBillId.HasValue)
                return $"Purchase Bill - {transaction.PurchaseBill?.BillNumber ?? ""}";
            if (transaction.SalesReturnBillId.HasValue)
                return $"Sales Return - {transaction.SalesReturn?.BillNumber ?? ""}";
            if (transaction.PurchaseReturnBillId.HasValue)
                return $"Purchase Return - {transaction.PurchaseReturn?.BillNumber ?? ""}";
            if (transaction.PaymentAccountId.HasValue)
            {
                // Get account name from PaymentEntries
                var accountName = transaction.Payment?.PaymentEntries?.FirstOrDefault()?.Account?.Name ?? "";
                return $"Payment - {accountName}";
            }
            if (transaction.ReceiptAccountId.HasValue)
            {
                // Get account name from ReceiptEntries
                var accountName = transaction.Receipt?.ReceiptEntries?.FirstOrDefault()?.Account?.Name ?? "";
                return $"Receipt - {accountName}";
            }
            if (transaction.JournalBillId.HasValue)
                return $"Journal Entry - {transaction.JournalVoucher?.BillNumber ?? ""}";
            if (transaction.DebitNoteId.HasValue)
                return $"Debit Note - {transaction.DebitNote?.BillNumber ?? ""}";
            if (transaction.CreditNoteId.HasValue)
                return $"Credit Note - {transaction.CreditNote?.BillNumber ?? ""}";
            return "Other Transaction";
        }

        private string GetReferenceNumber(Transaction transaction)
        {
            if (transaction.SalesBillId.HasValue)
                return transaction.SalesBill?.BillNumber;
            if (transaction.PurchaseBillId.HasValue)
                return transaction.PurchaseBill?.BillNumber;
            if (transaction.SalesReturnBillId.HasValue)
                return transaction.SalesReturn?.BillNumber;
            if (transaction.PurchaseReturnBillId.HasValue)
                return transaction.PurchaseReturn?.BillNumber;
            if (transaction.JournalBillId.HasValue)
                return transaction.JournalVoucher?.BillNumber;
            if (transaction.DebitNoteId.HasValue)
                return transaction.DebitNote?.BillNumber;
            if (transaction.CreditNoteId.HasValue)
                return transaction.CreditNote?.BillNumber;
            if (transaction.PaymentAccountId.HasValue)
                return transaction.Payment?.BillNumber;
            if (transaction.ReceiptAccountId.HasValue)
                return transaction.Receipt?.BillNumber;
            if (!string.IsNullOrEmpty(transaction.BillNumber))
                return transaction.BillNumber;
            if (!string.IsNullOrEmpty(transaction.PartyBillNumber))
                return transaction.PartyBillNumber;
            return "N/A";
        }

        private string GetTransactionType(Transaction transaction)
        {
            if (transaction.SalesBillId.HasValue) return "sales";
            if (transaction.PurchaseBillId.HasValue) return "purchase";
            if (transaction.SalesReturnBillId.HasValue) return "sales_return";
            if (transaction.PurchaseReturnBillId.HasValue) return "purchase_return";
            if (transaction.PaymentAccountId.HasValue) return "payment";
            if (transaction.ReceiptAccountId.HasValue) return "receipt";
            if (transaction.JournalBillId.HasValue) return "journal";
            if (transaction.DebitNoteId.HasValue) return "debit_note";
            if (transaction.CreditNoteId.HasValue) return "credit_note";

            var typeMap = new Dictionary<TransactionType, string>
            {
                { TransactionType.Sale, "sales" },
                { TransactionType.Purc, "purchase" },
                { TransactionType.SlRt, "sales_return" },
                { TransactionType.PrRt, "purchase_return" },
                { TransactionType.Pymt, "payment" },
                { TransactionType.Rcpt, "receipt" },
                { TransactionType.Jrnl, "journal" },
                { TransactionType.DrNt, "debit_note" },
                { TransactionType.CrNt, "credit_note" }
            };

            return typeMap.GetValueOrDefault(transaction.Type, "other");
        }


    }
}