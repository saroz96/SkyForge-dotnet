using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.Retailer.Items;
using SkyForge.Models.Retailer.TransactionModel;
using SkyForge.Models.AccountModel;
using SkyForge.Models.AccountGroupModel;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SkyForge.Services
{
    public class FiscalYearTransferService : IFiscalYearTransferService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<FiscalYearTransferService> _logger;

        public FiscalYearTransferService(
            ApplicationDbContext context,
            ILogger<FiscalYearTransferService> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Gets the list of account group names that should NOT be carried forward
        /// These are nominal accounts that should be closed at year-end
        /// </summary>
        private static readonly HashSet<string> _nominalAccountGroups = new HashSet<string>
        {
        "Purchase",
        "Sale",
        "Expenses (Indirect/Admn.)",
        "Expenses (Direct/Mfg.)",
        "Income (Direct/Opr.)",
        "Income (Indirect)",
        "Profit & Loss"
        };

        /// <summary>
        /// Calculates the Profit & Loss for the fiscal year
        /// </summary>
        private async Task<decimal> CalculateProfitAndLossAsync(
            Guid fiscalYearId,
            Guid companyId,
            List<AccountBalanceSummaryDto> closingBalances)
        {
            decimal totalIncome = 0;
            decimal totalExpenses = 0;
            decimal totalSales = 0;
            decimal totalPurchases = 0;

            // Get all nominal accounts from closing balances
            var nominalAccounts = closingBalances
                .Where(b => _nominalAccountGroups.Contains(b.AccountGroupName))
                .ToList();

            foreach (var account in nominalAccounts)
            {
                switch (account.AccountGroupName)
                {
                    case "Sale":
                    case "Income (Direct/Opr.)":
                    case "Income (Indirect)":
                        // Income accounts have credit balance
                        totalIncome += account.CreditAmount > 0 ? account.CreditAmount : 0;
                        break;

                    case "Purchase":
                    case "Expenses (Direct/Mfg.)":
                    case "Expenses (Indirect/Admn.)":
                        // Expense accounts have debit balance
                        totalExpenses += account.DebitAmount > 0 ? account.DebitAmount : 0;
                        break;
                }
            }

            // Net Profit/Loss = Total Income - Total Expenses
            decimal netProfitLoss = totalIncome - totalExpenses;

            _logger.LogInformation($"Profit & Loss Calculation - Total Income: {totalIncome}, Total Expenses: {totalExpenses}, Net: {netProfitLoss}");

            return netProfitLoss;
        }

        /// <summary>
        /// Sets the Reserve and Surplus Account OPENING balance in target fiscal year
        /// Target Opening = Source Closing Balance (which already includes P&L)
        /// </summary>
        private async Task TransferProfitAndLossToReserveAndSurplusAsync(
            Guid companyId,
            Guid sourceFiscalYearId,
            Guid targetFiscalYearId,
            decimal netProfitLoss,
            DateTime targetFiscalYearStartDate,
            string targetFiscalYearStartDateNepali)
        {
            var reserveAccount = await _context.Accounts
                .Include(a => a.AccountGroup)
                .FirstOrDefaultAsync(a => a.CompanyId == companyId &&
                                         a.AccountGroup != null &&
                                         (a.AccountGroup.Name == "Reserves & Surplus") &&
                                         a.IsActive);

            if (reserveAccount == null)
            {
                _logger.LogWarning("Reserve and Surplus Account not found.");
                return;
            }

            // ✅ Get the CLOSING balance from the SOURCE fiscal year
            var sourceClosing = await _context.ClosingBalanceByFiscalYear
                .FirstOrDefaultAsync(cb => cb.AccountId == reserveAccount.Id &&
                                           cb.CompanyId == companyId &&
                                           cb.FiscalYearId == sourceFiscalYearId);

            decimal targetAmount = 0;
            string targetType = "Cr";

            if (sourceClosing != null)
            {
                targetAmount = sourceClosing.Amount;
                targetType = sourceClosing.Type;
                _logger.LogInformation($"Using source CLOSING balance: {targetType} {targetAmount}");
            }
            else
            {
                // Fallback: Use opening + P&L (should rarely happen if closing exists)
                var sourceOpening = await _context.OpeningBalanceByFiscalYear
                    .FirstOrDefaultAsync(ob => ob.AccountId == reserveAccount.Id &&
                                               ob.CompanyId == companyId &&
                                               ob.FiscalYearId == sourceFiscalYearId);

                decimal openingDebit = 0, openingCredit = 0;
                if (sourceOpening != null)
                {
                    if (sourceOpening.Type == "Dr") openingDebit = sourceOpening.Amount;
                    else openingCredit = sourceOpening.Amount;
                }

                if (netProfitLoss > 0) openingCredit += netProfitLoss;
                else if (netProfitLoss < 0) openingDebit += Math.Abs(netProfitLoss);

                targetAmount = Math.Abs(openingDebit - openingCredit);
                targetType = openingDebit >= openingCredit ? "Dr" : "Cr";
                _logger.LogWarning($"Fallback computed target opening: {targetType} {targetAmount}");
            }

            // ✅ REPLACE the opening balance in target fiscal year
            var existingTarget = await _context.OpeningBalanceByFiscalYear
                .FirstOrDefaultAsync(ob => ob.AccountId == reserveAccount.Id &&
                                           ob.FiscalYearId == targetFiscalYearId);

            if (existingTarget != null)
            {
                existingTarget.Amount = targetAmount;
                existingTarget.Type = targetType;
                existingTarget.Date = targetFiscalYearStartDate;
                existingTarget.NepaliDate = targetFiscalYearStartDateNepali;
                _logger.LogInformation($"REPLACED target opening: {targetType} {targetAmount}");
            }
            else
            {
                _context.OpeningBalanceByFiscalYear.Add(new OpeningBalanceByFiscalYear
                {
                    Id = Guid.NewGuid(),
                    AccountId = reserveAccount.Id,
                    FiscalYearId = targetFiscalYearId,
                    CompanyId = companyId,
                    Amount = targetAmount,
                    Type = targetType,
                    Date = targetFiscalYearStartDate,
                    NepaliDate = targetFiscalYearStartDateNepali
                });
                _logger.LogInformation($"CREATED target opening: {targetType} {targetAmount}");
            }

            // ✅ Also update master opening balance
            var master = await _context.OpeningBalances
                .FirstOrDefaultAsync(ob => ob.AccountId == reserveAccount.Id && ob.CompanyId == companyId);
            if (master != null)
            {
                master.Amount = targetAmount;
                master.Type = targetType;
                master.Date = targetFiscalYearStartDate;
                master.NepaliDate = targetFiscalYearStartDateNepali;
                master.FiscalYearId = null;
            }
            else
            {
                _context.OpeningBalances.Add(new OpeningBalance
                {
                    Id = Guid.NewGuid(),
                    AccountId = reserveAccount.Id,
                    CompanyId = companyId,
                    Amount = targetAmount,
                    Type = targetType,
                    Date = targetFiscalYearStartDate,
                    NepaliDate = targetFiscalYearStartDateNepali,
                    FiscalYearId = null
                });
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation($"Reserve Account opening balance {targetType} {targetAmount} set for target fiscal year {targetFiscalYearId}");
        }

        /// <summary>
        /// Ensures the Stock in Hand account group exists for the company
        /// </summary>
        private async Task<AccountGroup> EnsureStockInHandGroupExistsAsync(Guid companyId, FiscalYear fiscalYear)
        {
            var stockInHandGroup = await _context.AccountGroups
                .FirstOrDefaultAsync(g => g.Name == "Stock in Hand" && g.CompanyId == companyId);

            if (stockInHandGroup == null)
            {
                stockInHandGroup = new AccountGroup
                {
                    Id = Guid.NewGuid(),
                    Name = "Stock in Hand",
                    PrimaryGroup = "No",
                    Type = "Current Assets",
                    CompanyId = companyId,
                    OriginalFiscalYearId = fiscalYear.Id,
                    Date = fiscalYear.StartDate ?? DateTime.UtcNow,
                    NepaliDate = fiscalYear.StartDateNepali,
                    CreatedAt = DateTime.UtcNow
                };

                _context.AccountGroups.Add(stockInHandGroup);
                await _context.SaveChangesAsync();
                _logger.LogInformation($"Created Stock in Hand account group for company {companyId}");
            }

            return stockInHandGroup;
        }

        /// <summary>
        /// Ensures the Stock in Hand account exists for the company
        /// </summary>
        private async Task<Account> EnsureStockInHandAccountExistsAsync(Guid companyId, FiscalYear fiscalYear, AccountGroup stockInHandGroup)
        {
            var stockInHandAccount = await _context.Accounts
                .FirstOrDefaultAsync(a => a.Name == "Stock in Hand" && a.CompanyId == companyId);

            if (stockInHandAccount == null)
            {
                stockInHandAccount = new Account
                {
                    Id = Guid.NewGuid(),
                    Name = "Stock in Hand",
                    AccountGroupsId = stockInHandGroup.Id,
                    CompanyId = companyId,
                    OriginalFiscalYearId = fiscalYear.Id,
                    OpeningBalanceType = "Dr",
                    IsActive = true,
                    Date = fiscalYear.StartDate ?? DateTime.UtcNow,
                    NepaliDate = fiscalYear.StartDateNepali,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Accounts.Add(stockInHandAccount);
                await _context.SaveChangesAsync();
                _logger.LogInformation($"Created Stock in Hand account for company {companyId}");
            }

            return stockInHandAccount;
        }

        public async Task<FiscalYearTransferResponseDto> ValidateTransferAsync(
           Guid sourceFiscalYearId,
           Guid targetFiscalYearId,
           Guid companyId)
        {
            var response = new FiscalYearTransferResponseDto();

            try
            {
                var sourceFiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.Id == sourceFiscalYearId && f.CompanyId == companyId);

                if (sourceFiscalYear == null)
                {
                    response.Success = false;
                    response.Errors.Add("Source fiscal year not found");
                    return response;
                }

                var targetFiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.Id == targetFiscalYearId && f.CompanyId == companyId);

                if (targetFiscalYear == null)
                {
                    response.Success = false;
                    response.Errors.Add("Target fiscal year not found");
                    return response;
                }

                if (targetFiscalYear.StartDate <= sourceFiscalYear.EndDate)
                {
                    response.Success = false;
                    response.Errors.Add("Target fiscal year must start after source fiscal year ends");
                    return response;
                }

                var existingOpeningBalance = await _context.Transactions
                    .AnyAsync(t => t.FiscalYearId == targetFiscalYearId &&
                                   t.Type == TransactionType.OpeningBalance);

                if (existingOpeningBalance)
                {
                    response.Success = false;
                    response.Errors.Add("Opening balance already exists for this fiscal year");
                    return response;
                }

                response.Success = true;
                response.Message = "Validation successful";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating fiscal year transfer");
                response.Success = false;
                response.Errors.Add($"Validation error: {ex.Message}");
            }

            return response;
        }

        public async Task<object> GetTransferPreviewAsync(Guid sourceFiscalYearId, Guid targetFiscalYearId, Guid companyId)
        {
            var sourceFiscalYear = await _context.FiscalYears
                .FirstOrDefaultAsync(f => f.Id == sourceFiscalYearId && f.CompanyId == companyId);

            var targetFiscalYear = await _context.FiscalYears
                .FirstOrDefaultAsync(f => f.Id == targetFiscalYearId && f.CompanyId == companyId);

            var itemStocks = await GetItemClosingStocksFromStockEntriesAsync(sourceFiscalYearId, companyId);
            var accountBalances = await GetAccountClosingBalancesFromTransactionsAsync(sourceFiscalYearId, companyId);

            return new
            {
                SourceFiscalYear = new { sourceFiscalYear?.Id, sourceFiscalYear?.Name, sourceFiscalYear?.StartDate, sourceFiscalYear?.EndDate, sourceFiscalYear?.StartDateNepali, sourceFiscalYear?.EndDateNepali },
                TargetFiscalYear = new { targetFiscalYear?.Id, targetFiscalYear?.Name, targetFiscalYear?.StartDate, targetFiscalYear?.EndDate, targetFiscalYear?.StartDateNepali, targetFiscalYear?.EndDateNepali },
                ItemsPreview = new
                {
                    TotalItems = itemStocks.Count,
                    ItemsWithStock = itemStocks.Count(i => i.ClosingStock > 0),
                    TotalClosingStockValue = itemStocks.Sum(i => i.ClosingStockValue),
                    TotalClosingStockQuantity = itemStocks.Sum(i => i.ClosingStock),
                    SampleItems = itemStocks.Take(10).Select(i => new
                    {
                        i.Item.Name,
                        ClosingStock = i.ClosingStock,
                        ClosingStockValue = i.ClosingStockValue,
                        PurchasePrice = i.PurchasePrice
                    })
                },
                AccountsPreview = new
                {
                    TotalAccounts = accountBalances.Count(a => a.DebitAmount > 0 || a.CreditAmount > 0),
                    TotalDebitBalance = accountBalances.Sum(a => a.DebitAmount),
                    TotalCreditBalance = accountBalances.Sum(a => a.CreditAmount),
                    SampleAccounts = accountBalances
                        .Where(a => a.DebitAmount > 0 || a.CreditAmount > 0)
                        .Take(10)
                        .Select(a => new
                        {
                            a.AccountName,
                            a.DebitAmount,
                            a.CreditAmount,
                            a.BalanceType
                        })
                }
            };
        }

        //     public async Task<FiscalYearTransferResponseDto> TransferFiscalYearBalancesAsync(
        //         FiscalYearTransferRequestDto request,
        //         Guid companyId)
        //     {
        //         var response = new FiscalYearTransferResponseDto();

        //         using var transaction = await _context.Database.BeginTransactionAsync();

        //         try
        //         {
        //             _logger.LogInformation("Starting fiscal year transfer from {SourceId} to {TargetId}",
        //                 request.SourceFiscalYearId, request.TargetFiscalYearId);

        //             var validation = await ValidateTransferAsync(request.SourceFiscalYearId, request.TargetFiscalYearId, companyId);
        //             if (!validation.Success)
        //             {
        //                 return validation;
        //             }

        //             var sourceFiscalYear = await _context.FiscalYears
        //                 .FirstOrDefaultAsync(f => f.Id == request.SourceFiscalYearId && f.CompanyId == companyId);

        //             var targetFiscalYear = await _context.FiscalYears
        //                 .FirstOrDefaultAsync(f => f.Id == request.TargetFiscalYearId && f.CompanyId == companyId);

        //             var summary = new FiscalYearTransferSummaryDto
        //             {
        //                 SourceFiscalYearId = sourceFiscalYear!.Id,
        //                 SourceFiscalYearName = sourceFiscalYear.Name,
        //                 TargetFiscalYearId = targetFiscalYear!.Id,
        //                 TargetFiscalYearName = targetFiscalYear.Name,
        //                 TransferDate = request.TransferDate,
        //                 CompletedAt = DateTime.UtcNow
        //             };

        //             decimal totalStockValue = 0;

        //             DateTime transferDateAd = request.TransferDate;
        //             string transferDateNepali = request.TransferDateNepali?.ToString() ?? "";

        //             // Get fiscal year start and end dates
        //             DateTime sourceFiscalYearStartDate = sourceFiscalYear.StartDate ?? DateTime.UtcNow;
        //             DateTime sourceFiscalYearEndDate = sourceFiscalYear.EndDate ?? DateTime.UtcNow;
        //             DateTime targetFiscalYearStartDate = targetFiscalYear.StartDate ?? DateTime.UtcNow;

        //             // Get Nepali dates from fiscal year
        //             string sourceFiscalYearStartDateNepali = sourceFiscalYear.StartDateNepali ?? transferDateNepali;
        //             string sourceFiscalYearEndDateNepali = sourceFiscalYear.EndDateNepali ?? transferDateNepali;
        //             string targetFiscalYearStartDateNepali = targetFiscalYear.StartDateNepali ?? transferDateNepali;

        //             if (request.TransferItems)
        //             {
        //                 var itemSummary = await CalculateAndSaveClosingStockForSourceFiscalYearAsync(
        //                     request.SourceFiscalYearId,
        //                     companyId,
        //                     sourceFiscalYearEndDate,
        //                     sourceFiscalYearEndDateNepali,
        //                     sourceFiscalYearStartDate,
        //                     sourceFiscalYearStartDateNepali);

        //                 summary.ItemsSummary = itemSummary;
        //                 totalStockValue = itemSummary.TotalClosingStockValue;

        //                 await CreateOpeningStockForTargetFiscalYearAsync(
        //                     request.SourceFiscalYearId,
        //                     request.TargetFiscalYearId,
        //                     companyId,
        //                     targetFiscalYearStartDate,
        //                     targetFiscalYearStartDateNepali);
        //             }

        //             // ✅ Get closing balances (Stock in Hand will be added separately)
        //             var closingBalances = await GetAccountClosingBalancesFromTransactionsAsync(
        //                 request.SourceFiscalYearId,
        //                 companyId);

        //             // ✅ Add Stock in Hand account balance with total stock value
        //             await AddStockInHandAccountBalanceAsync(
        //                 companyId,
        //                 request.TargetFiscalYearId,
        //                 totalStockValue,
        //                 closingBalances);

        //             await AddProfitAndLossToClosingBalancesAsync(
        // request.SourceFiscalYearId,
        // companyId,
        // closingBalances);

        //             // Calculate Profit & Loss
        //             var netProfitLoss = await CalculateProfitAndLossAsync(
        //                 request.SourceFiscalYearId,
        //                 companyId,
        //                 closingBalances);


        //             await UpdateCapitalAccountInClosingBalancesAsync(
        //             request.SourceFiscalYearId,
        //             companyId,
        //             netProfitLoss,
        //             closingBalances,
        //             sourceFiscalYearEndDate,
        //             sourceFiscalYearEndDateNepali);

        //             // Save closing balances for SOURCE fiscal year with END date
        //             await SaveClosingBalancesForSourceFiscalYearAsync(
        //                 request.SourceFiscalYearId,
        //                 companyId,
        //                 sourceFiscalYearEndDate,
        //                 sourceFiscalYearEndDateNepali,
        //                 closingBalances);

        //             // Create Opening Balance Transaction for TARGET fiscal year with START date
        //             var openingBalanceTransaction = await CreateOpeningBalanceTransactionAsync(
        //                 targetFiscalYear!.Id,
        //                 companyId,
        //                 targetFiscalYearStartDate,
        //                 targetFiscalYearStartDateNepali,
        //                 closingBalances);

        //             // Transfer Profit & Loss to Reserve and Surplus Account (only for target fiscal year opening balance)
        //             await TransferProfitAndLossToReserveAndSurplusAsync(
        //                 companyId,
        //                  request.SourceFiscalYearId,
        //                 request.TargetFiscalYearId,
        //                 netProfitLoss,
        //                 targetFiscalYearStartDate,
        //                 targetFiscalYearStartDateNepali);

        //             summary.OpeningBalanceTransactionId = openingBalanceTransaction.Id;
        //             summary.OpeningBalanceVoucherNo = openingBalanceTransaction.BillNumber ?? "OP-BAL-001";

        //             summary.AccountsSummary = new AccountTransferSummaryDto
        //             {
        //                 AccountsProcessed = closingBalances.Count(a => a.DebitAmount > 0 || a.CreditAmount > 0),
        //                 TotalDebitBalance = closingBalances.Sum(a => a.DebitAmount),
        //                 TotalCreditBalance = closingBalances.Sum(a => a.CreditAmount),
        //                 AccountDetails = closingBalances.Where(a => a.DebitAmount > 0 || a.CreditAmount > 0).ToList()
        //             };

        //             await transaction.CommitAsync();

        //             response.Success = true;
        //             response.Message = "Fiscal year transfer completed successfully";
        //             response.Data = summary;

        //             _logger.LogInformation("Fiscal year transfer completed successfully. Total stock value: {TotalStockValue}", totalStockValue);
        //         }
        //         catch (Exception ex)
        //         {
        //             await transaction.RollbackAsync();
        //             _logger.LogError(ex, "Error during fiscal year transfer");
        //             response.Success = false;
        //             response.Errors.Add($"Transfer error: {ex.Message}");
        //             response.Message = "Transfer failed";
        //         }

        //         return response;
        //     }

        public async Task<FiscalYearTransferResponseDto> TransferFiscalYearBalancesAsync(
            FiscalYearTransferRequestDto request,
            Guid companyId)
        {
            var response = new FiscalYearTransferResponseDto();

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                _logger.LogInformation("Starting fiscal year transfer from {SourceId} to {TargetId}",
                    request.SourceFiscalYearId, request.TargetFiscalYearId);

                var validation = await ValidateTransferAsync(request.SourceFiscalYearId, request.TargetFiscalYearId, companyId);
                if (!validation.Success)
                {
                    return validation;
                }

                var sourceFiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.Id == request.SourceFiscalYearId && f.CompanyId == companyId);

                var targetFiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.Id == request.TargetFiscalYearId && f.CompanyId == companyId);

                var summary = new FiscalYearTransferSummaryDto
                {
                    SourceFiscalYearId = sourceFiscalYear!.Id,
                    SourceFiscalYearName = sourceFiscalYear.Name,
                    TargetFiscalYearId = targetFiscalYear!.Id,
                    TargetFiscalYearName = targetFiscalYear.Name,
                    TransferDate = request.TransferDate,
                    CompletedAt = DateTime.UtcNow
                };

                decimal totalStockValue = 0;

                DateTime transferDateAd = request.TransferDate;
                string transferDateNepali = request.TransferDateNepali?.ToString() ?? "";

                // Get fiscal year start and end dates
                DateTime sourceFiscalYearStartDate = sourceFiscalYear.StartDate ?? DateTime.UtcNow;
                DateTime sourceFiscalYearEndDate = sourceFiscalYear.EndDate ?? DateTime.UtcNow;
                DateTime targetFiscalYearStartDate = targetFiscalYear.StartDate ?? DateTime.UtcNow;

                // Get Nepali dates from fiscal year
                string sourceFiscalYearStartDateNepali = sourceFiscalYear.StartDateNepali ?? transferDateNepali;
                string sourceFiscalYearEndDateNepali = sourceFiscalYear.EndDateNepali ?? transferDateNepali;
                string targetFiscalYearStartDateNepali = targetFiscalYear.StartDateNepali ?? transferDateNepali;

                if (request.TransferItems)
                {
                    var itemSummary = await CalculateAndSaveClosingStockForSourceFiscalYearAsync(
                        request.SourceFiscalYearId,
                        companyId,
                        sourceFiscalYearEndDate,
                        sourceFiscalYearEndDateNepali,
                        sourceFiscalYearStartDate,
                        sourceFiscalYearStartDateNepali);

                    summary.ItemsSummary = itemSummary;
                    totalStockValue = itemSummary.TotalClosingStockValue;

                    await CreateOpeningStockForTargetFiscalYearAsync(
                        request.SourceFiscalYearId,
                        request.TargetFiscalYearId,
                        companyId,
                        targetFiscalYearStartDate,
                        targetFiscalYearStartDateNepali);
                }

                // ✅ Get closing balances (Stock in Hand will be added separately)
                var closingBalances = await GetAccountClosingBalancesFromTransactionsAsync(
                    request.SourceFiscalYearId,
                    companyId);

                // ✅ Add Stock in Hand account balance with total stock value
                await AddStockInHandAccountBalanceAsync(
                    companyId,
                    request.TargetFiscalYearId,
                    totalStockValue,
                    closingBalances);

                // ✅ Calculate Profit & Loss BEFORE modifying balances
                var netProfitLoss = await CalculateProfitAndLossAsync(
                    request.SourceFiscalYearId,
                    companyId,
                    closingBalances);

                _logger.LogInformation($"Net Profit/Loss calculated: {netProfitLoss}");

                // ✅ Transfer Profit/Loss to Reserve & Surplus account
                if (netProfitLoss != 0)
                {
                    // Find Reserve & Surplus account
                    var reserveAccount = await _context.Accounts
                        .Include(a => a.AccountGroup)
                        .FirstOrDefaultAsync(a => a.CompanyId == companyId &&
                                                 a.AccountGroup != null &&
                                                 a.AccountGroup.Name == "Reserves & Surplus" &&
                                                 a.IsActive);

                    if (reserveAccount == null)
                    {
                        _logger.LogWarning("Reserve & Surplus account not found. Skipping P&L transfer.");
                    }
                    else
                    {
                        var existingReserve = closingBalances.FirstOrDefault(b => b.AccountId == reserveAccount.Id);

                        if (existingReserve != null)
                        {
                            // Update Reserve & Surplus with P&L amount
                            if (netProfitLoss > 0)
                            {
                                existingReserve.CreditAmount += netProfitLoss;
                            }
                            else
                            {
                                existingReserve.DebitAmount += Math.Abs(netProfitLoss);
                            }
                            existingReserve.BalanceType = existingReserve.CreditAmount >= existingReserve.DebitAmount ? "Cr" : "Dr";
                            _logger.LogInformation($"Updated Reserve & Surplus with P&L: {netProfitLoss}");
                        }
                        else
                        {
                            closingBalances.Add(new AccountBalanceSummaryDto
                            {
                                AccountId = reserveAccount.Id,
                                AccountName = reserveAccount.Name,
                                AccountGroupName = "Reserves & Surplus",
                                DebitAmount = netProfitLoss < 0 ? Math.Abs(netProfitLoss) : 0,
                                CreditAmount = netProfitLoss > 0 ? netProfitLoss : 0,
                                BalanceType = netProfitLoss > 0 ? "Cr" : "Dr"
                            });
                            _logger.LogInformation($"Added Reserve & Surplus with P&L: {netProfitLoss}");
                        }
                    }
                }

                // ✅ Add Profit & Loss to closing balances (this will set P&L to ZERO after transfer)
                await AddProfitAndLossToClosingBalancesAsync(
                    request.SourceFiscalYearId,
                    companyId,
                    closingBalances);

                // Save closing balances for SOURCE fiscal year with END date
                await SaveClosingBalancesForSourceFiscalYearAsync(
                    request.SourceFiscalYearId,
                    companyId,
                    sourceFiscalYearEndDate,
                    sourceFiscalYearEndDateNepali,
                    closingBalances);

                // Create Opening Balance Transaction for TARGET fiscal year with START date
                var openingBalanceTransaction = await CreateOpeningBalanceTransactionAsync(
                    targetFiscalYear!.Id,
                    companyId,
                    targetFiscalYearStartDate,
                    targetFiscalYearStartDateNepali,
                    closingBalances);

                // Transfer Profit & Loss to Reserve and Surplus Account (only for target fiscal year opening balance)
                await TransferProfitAndLossToReserveAndSurplusAsync(
                    companyId,
                    request.SourceFiscalYearId,
                    request.TargetFiscalYearId,
                    netProfitLoss,
                    targetFiscalYearStartDate,
                    targetFiscalYearStartDateNepali);

                summary.OpeningBalanceTransactionId = openingBalanceTransaction.Id;
                summary.OpeningBalanceVoucherNo = openingBalanceTransaction.BillNumber ?? "OP-BAL-001";

                summary.AccountsSummary = new AccountTransferSummaryDto
                {
                    AccountsProcessed = closingBalances.Count(a => a.DebitAmount > 0 || a.CreditAmount > 0),
                    TotalDebitBalance = closingBalances.Sum(a => a.DebitAmount),
                    TotalCreditBalance = closingBalances.Sum(a => a.CreditAmount),
                    AccountDetails = closingBalances.Where(a => a.DebitAmount > 0 || a.CreditAmount > 0).ToList()
                };

                await transaction.CommitAsync();

                response.Success = true;
                response.Message = "Fiscal year transfer completed successfully";
                response.Data = summary;

                _logger.LogInformation("Fiscal year transfer completed successfully. Total stock value: {TotalStockValue}", totalStockValue);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error during fiscal year transfer");
                response.Success = false;
                response.Errors.Add($"Transfer error: {ex.Message}");
                response.Message = "Transfer failed";
            }

            return response;
        }

        private async Task AddStockInHandAccountBalanceAsync(
          Guid companyId,
          Guid targetFiscalYearId,
          decimal totalStockValue,
          List<AccountBalanceSummaryDto> closingBalances)
        {
            if (totalStockValue <= 0)
            {
                _logger.LogInformation("Total stock value is 0, skipping Stock in Hand account addition");
                return;
            }

            // ✅ Get the account that belongs to "Stock in Hand" account group
            var stockInHandAccount = await _context.Accounts
                .Include(a => a.AccountGroup)
                .FirstOrDefaultAsync(a => a.CompanyId == companyId &&
                                         a.AccountGroup != null &&
                                         a.AccountGroup.Name == "Stock in Hand" &&
                                         a.IsActive);

            if (stockInHandAccount == null)
            {
                _logger.LogWarning("No account found with AccountGroup 'Stock in Hand'. Please create it first.");
                return;
            }

            // Check if Stock in Hand account already exists in closing balances
            var existingStockAccount = closingBalances.FirstOrDefault(b => b.AccountId == stockInHandAccount.Id);

            if (existingStockAccount != null)
            {
                // Update existing stock account balance
                existingStockAccount.DebitAmount = totalStockValue;
                existingStockAccount.CreditAmount = 0;
                existingStockAccount.BalanceType = "Dr";
                _logger.LogInformation($"Updated Stock in Hand account balance: {totalStockValue}");
            }
            else
            {
                // Add new stock in hand account balance
                closingBalances.Add(new AccountBalanceSummaryDto
                {
                    AccountId = stockInHandAccount.Id,
                    AccountName = stockInHandAccount.Name,
                    AccountGroupName = stockInHandAccount.AccountGroup?.Name ?? "Stock in Hand",
                    DebitAmount = totalStockValue,
                    CreditAmount = 0,
                    BalanceType = "Dr"
                });
                _logger.LogInformation($"Added Stock in Hand account balance: {totalStockValue}");
            }

            _logger.LogInformation("Added/Updated Stock in Hand account balance: {TotalStockValue} for account: {AccountName} (Group: Stock in Hand)",
                totalStockValue, stockInHandAccount.Name);
        }
        private async Task<Account?> GetStockInHandAccountAsync(Guid companyId)
        {
            return await _context.Accounts
                .FirstOrDefaultAsync(a => a.CompanyId == companyId &&
                                         a.Name == "Stock in Hand" &&
                                         a.IsActive);
        }

        private async Task<(decimal TotalQuantity, decimal TotalValue)> CalculateItemClosingStockFromStockEntriesAsync(
            Guid itemId,
            Guid fiscalYearId,
            Guid companyId)
        {
            // ✅ Get ALL stock entries for this item (no fiscal year filter)
            var stockEntries = await _context.StockEntries
                .Where(s => s.ItemId == itemId)
                .ToListAsync();

            decimal totalQuantity = 0;
            decimal totalValue = 0;

            foreach (var entry in stockEntries)
            {
                totalQuantity += entry.Quantity;
                totalValue += entry.Quantity * entry.PuPrice;
            }

            _logger.LogInformation($"Item {itemId}: Total Quantity: {totalQuantity}, Total Value: {totalValue} from {stockEntries.Count} entries");

            return (totalQuantity, totalValue);
        }

        private async Task CreateOpeningStockForTargetFiscalYearAsync(
            Guid sourceFiscalYearId,
            Guid targetFiscalYearId,
            Guid companyId,
            DateTime targetFiscalYearStartDate,
            string targetFiscalYearStartDateNepali)
        {
            // ✅ Get all items with closing stock from source fiscal year
            var closingStocks = await _context.ItemClosingStockByFiscalYear
                .Include(cs => cs.Item)
                .Where(cs => cs.FiscalYearId == sourceFiscalYearId)
                .ToListAsync();

            // ✅ If no closing stocks found, get the latest closing stock for each item
            if (closingStocks == null || !closingStocks.Any())
            {
                _logger.LogInformation($"No closing stocks found for fiscal year {sourceFiscalYearId}. Getting latest closing stock for each item.");

                var allClosingStocks = await _context.ItemClosingStockByFiscalYear
                    .Include(cs => cs.Item)
                    .Where(cs => cs.Item.CompanyId == companyId)
                    .OrderByDescending(cs => cs.Date)
                    .ToListAsync();

                closingStocks = allClosingStocks
                    .GroupBy(cs => cs.ItemId)
                    .Select(g => g.First())
                    .ToList();
            }

            var existingOpeningStocks = await _context.ItemOpeningStockByFiscalYear
                .Where(os => os.FiscalYearId == targetFiscalYearId)
                .ToDictionaryAsync(os => os.ItemId, os => os);

            foreach (var closingStock in closingStocks)
            {
                // ✅ Calculate average purchase price and sales price from ALL stock entries
                var stockEntryData = await CalculateItemAveragePricesFromStockEntriesAsync(
                    closingStock.ItemId,
                    sourceFiscalYearId,
                    companyId);

                decimal avgPurchasePrice = stockEntryData.AveragePurchasePrice;
                decimal avgSalesPrice = stockEntryData.AverageSalesPrice;

                if (existingOpeningStocks.TryGetValue(closingStock.ItemId, out var existingRecord))
                {
                    // Update existing opening stock record
                    existingRecord.OpeningStock = closingStock.ClosingStock;
                    existingRecord.OpeningStockValue = closingStock.ClosingStockValue;
                    existingRecord.PurchasePrice = avgPurchasePrice;
                    existingRecord.SalesPrice = avgSalesPrice;
                    existingRecord.Date = targetFiscalYearStartDate;
                    existingRecord.NepaliDate = targetFiscalYearStartDateNepali;
                    existingRecord.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    // Create new opening stock record
                    var openingStock = new ItemOpeningStockByFiscalYear
                    {
                        Id = Guid.NewGuid(),
                        ItemId = closingStock.ItemId,
                        FiscalYearId = targetFiscalYearId,
                        CompanyId = companyId,
                        OpeningStock = closingStock.ClosingStock,
                        OpeningStockValue = closingStock.ClosingStockValue,
                        PurchasePrice = avgPurchasePrice,
                        SalesPrice = avgSalesPrice,
                        Date = targetFiscalYearStartDate,
                        NepaliDate = targetFiscalYearStartDateNepali,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.ItemOpeningStockByFiscalYear.Add(openingStock);
                }
            }

            await _context.SaveChangesAsync();
        }

        private async Task<ItemTransferSummaryDto> CalculateAndSaveClosingStockForSourceFiscalYearAsync(
            Guid sourceFiscalYearId,
            Guid companyId,
            DateTime sourceFiscalYearEndDate,
            string sourceFiscalYearEndDateNepali,
            DateTime sourceFiscalYearStartDate,
            string sourceFiscalYearStartDateNepali)
        {
            var summary = new ItemTransferSummaryDto();

            var items = await _context.Items
                .Where(i => i.CompanyId == companyId && i.Status == "active")
                .ToListAsync();

            summary.ItemsProcessed = items.Count;

            var existingClosingStocks = await _context.ItemClosingStockByFiscalYear
                .Where(cs => cs.FiscalYearId == sourceFiscalYearId)
                .ToDictionaryAsync(cs => cs.ItemId, cs => cs);

            foreach (var item in items)
            {
                // ✅ Calculate closing stock quantity and value from ALL stock entries
                var closingStockData = await CalculateItemClosingStockFromStockEntriesAsync(item.Id, sourceFiscalYearId, companyId);

                // ✅ Calculate average purchase price and sales price from ALL stock entries
                var averagePrices = await CalculateItemAveragePricesFromStockEntriesAsync(item.Id, sourceFiscalYearId, companyId);

                var avgPurchasePrice = averagePrices.AveragePurchasePrice;
                var avgSalesPrice = averagePrices.AverageSalesPrice;

                if (closingStockData.TotalQuantity > 0)
                {
                    summary.ItemsWithStock++;
                    summary.TotalClosingStockQuantity += closingStockData.TotalQuantity;
                    summary.TotalClosingStockValue += closingStockData.TotalValue;
                }

                if (existingClosingStocks.TryGetValue(item.Id, out var existingRecord))
                {
                    // Update existing record with calculated averages
                    existingRecord.ClosingStock = closingStockData.TotalQuantity;
                    existingRecord.ClosingStockValue = closingStockData.TotalValue;
                    existingRecord.PurchasePrice = avgPurchasePrice;
                    existingRecord.SalesPrice = avgSalesPrice;
                    existingRecord.Date = sourceFiscalYearEndDate;
                    existingRecord.NepaliDate = sourceFiscalYearEndDateNepali;
                    existingRecord.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    // Create new closing stock record with calculated averages
                    var closingStock = new ItemClosingStockByFiscalYear
                    {
                        Id = Guid.NewGuid(),
                        ItemId = item.Id,
                        FiscalYearId = sourceFiscalYearId,
                        CompanyId = companyId,
                        ClosingStock = closingStockData.TotalQuantity,
                        ClosingStockValue = closingStockData.TotalValue,
                        PurchasePrice = avgPurchasePrice,
                        SalesPrice = avgSalesPrice,
                        Date = sourceFiscalYearEndDate,
                        NepaliDate = sourceFiscalYearEndDateNepali,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.ItemClosingStockByFiscalYear.Add(closingStock);
                }

                summary.ItemDetails.Add(new ItemStockSummaryDto
                {
                    ItemId = item.Id,
                    ItemName = item.Name,
                    ClosingQuantity = closingStockData.TotalQuantity,
                    ClosingValue = closingStockData.TotalValue,
                    AverageRate = avgPurchasePrice
                });
            }

            await _context.SaveChangesAsync();
            return summary;
        }


        private async Task<(decimal AveragePurchasePrice, decimal AverageSalesPrice)> CalculateItemAveragePricesFromStockEntriesAsync(
     Guid itemId,
     Guid fiscalYearId,
     Guid companyId)
        {
            // ✅ Get ALL stock entries for this item (no fiscal year filter)
            var stockEntries = await _context.StockEntries
                .Where(s => s.ItemId == itemId)
                .ToListAsync();

            if (stockEntries.Count == 0)
            {
                // If no stock entries at all, get the item's default prices
                var item = await _context.Items
                    .FirstOrDefaultAsync(i => i.Id == itemId && i.CompanyId == companyId);

                return (item?.PuPrice ?? 0, item?.Price ?? 0);
            }

            decimal totalQuantity = 0;
            decimal totalPurchaseValue = 0;
            decimal totalSalesValue = 0;

            foreach (var entry in stockEntries)
            {
                totalQuantity += entry.Quantity;
                totalPurchaseValue += entry.Quantity * entry.PuPrice;
                totalSalesValue += entry.Quantity * entry.Price;
            }

            decimal averagePurchasePrice = totalQuantity > 0
                ? totalPurchaseValue / totalQuantity
                : 0;

            decimal averageSalesPrice = totalQuantity > 0
                ? totalSalesValue / totalQuantity
                : 0;

            return (averagePurchasePrice, averageSalesPrice);
        }

        // private async Task<List<ItemClosingStockByFiscalYear>> GetItemClosingStocksFromStockEntriesAsync(
        //     Guid fiscalYearId,
        //     Guid companyId)
        // {
        //     var items = await _context.Items
        //         .Where(i => i.CompanyId == companyId)
        //         .ToListAsync();

        //     var result = new List<ItemClosingStockByFiscalYear>();

        //     foreach (var item in items)
        //     {
        //         // ✅ Calculate from ALL stock entries
        //         var stock = await CalculateItemClosingStockFromStockEntriesAsync(item.Id, fiscalYearId, companyId);

        //         // Get average prices from ALL stock entries
        //         var averagePrices = await CalculateItemAveragePricesFromStockEntriesAsync(item.Id, fiscalYearId, companyId);

        //         result.Add(new ItemClosingStockByFiscalYear
        //         {
        //             ItemId = item.Id,
        //             Item = item,
        //             ClosingStock = stock.TotalQuantity,
        //             ClosingStockValue = stock.TotalValue,
        //             PurchasePrice = averagePrices.AveragePurchasePrice,
        //             SalesPrice = averagePrices.AverageSalesPrice
        //         });
        //     }

        //     return result;
        // }

        private async Task<List<ItemClosingStockByFiscalYear>> GetItemClosingStocksFromStockEntriesAsync(
            Guid fiscalYearId,
            Guid companyId)
        {
            // ✅ Get the fiscal year details
            var fiscalYear = await _context.FiscalYears
                .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);

            if (fiscalYear == null)
            {
                return new List<ItemClosingStockByFiscalYear>();
            }

            // ✅ Get items that existed in OR BEFORE this fiscal year
            // An item exists in a fiscal year if:
            // 1. OriginalFiscalYearId is null OR <= fiscalYearId
            // 2. AND the item's Date <= fiscalYear.EndDate (created on or before the fiscal year ends)
            var items = await _context.Items
                .Where(i => i.CompanyId == companyId &&
                            i.Status == "active" &&
                            (i.OriginalFiscalYearId == null || i.OriginalFiscalYearId <= fiscalYearId) &&
                            i.Date <= (fiscalYear.EndDate ?? DateTime.UtcNow))
                .ToListAsync();

            _logger.LogInformation($"Found {items.Count} items that existed in fiscal year {fiscalYear.Name} (End Date: {fiscalYear.EndDate})");

            var result = new List<ItemClosingStockByFiscalYear>();

            foreach (var item in items)
            {
                // ✅ Calculate from stock entries filtered by date up to fiscal year end
                var stock = await CalculateItemClosingStockFromStockEntriesAsync(item.Id, fiscalYearId, companyId);

                // Get average prices from stock entries filtered by date
                var averagePrices = await CalculateItemAveragePricesFromStockEntriesAsync(item.Id, fiscalYearId, companyId);

                // ✅ Check if closing stock already exists for this fiscal year
                var existingClosingStock = await _context.ItemClosingStockByFiscalYear
                    .FirstOrDefaultAsync(cs => cs.ItemId == item.Id && cs.FiscalYearId == fiscalYearId);

                // ✅ Include item if it has stock OR already has a closing stock record
                if (stock.TotalQuantity > 0 || existingClosingStock != null)
                {
                    if (existingClosingStock != null)
                    {
                        // Update existing with latest calculated values
                        existingClosingStock.ClosingStock = stock.TotalQuantity;
                        existingClosingStock.ClosingStockValue = stock.TotalValue;
                        existingClosingStock.PurchasePrice = averagePrices.AveragePurchasePrice;
                        existingClosingStock.SalesPrice = averagePrices.AverageSalesPrice;
                        existingClosingStock.UpdatedAt = DateTime.UtcNow;
                        result.Add(existingClosingStock);
                    }
                    else if (stock.TotalQuantity > 0)
                    {
                        // Create new closing stock record
                        var closingStock = new ItemClosingStockByFiscalYear
                        {
                            Id = Guid.NewGuid(),
                            ItemId = item.Id,
                            FiscalYearId = fiscalYearId,
                            CompanyId = companyId,
                            ClosingStock = stock.TotalQuantity,
                            ClosingStockValue = stock.TotalValue,
                            PurchasePrice = averagePrices.AveragePurchasePrice,
                            SalesPrice = averagePrices.AverageSalesPrice,
                            Date = fiscalYear.EndDate ?? DateTime.UtcNow,
                            NepaliDate = fiscalYear.EndDateNepali ?? DateTime.UtcNow.ToString("yyyy-MM-dd"),
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        result.Add(closingStock);
                    }
                }
                else if (stock.TotalQuantity == 0 && existingClosingStock == null)
                {
                    // ✅ Check if the item has opening stock from previous years
                    var hasOpeningStock = await _context.ItemOpeningStockByFiscalYear
                        .AnyAsync(os => os.ItemId == item.Id && os.FiscalYearId == fiscalYearId && os.OpeningStock > 0);

                    if (hasOpeningStock)
                    {
                        // Create a closing stock record with opening stock values
                        var openingStockRecord = await _context.ItemOpeningStockByFiscalYear
                            .FirstOrDefaultAsync(os => os.ItemId == item.Id && os.FiscalYearId == fiscalYearId);

                        var closingStock = new ItemClosingStockByFiscalYear
                        {
                            Id = Guid.NewGuid(),
                            ItemId = item.Id,
                            FiscalYearId = fiscalYearId,
                            CompanyId = companyId,
                            ClosingStock = openingStockRecord?.OpeningStock ?? 0,
                            ClosingStockValue = openingStockRecord?.OpeningStockValue ?? 0,
                            PurchasePrice = openingStockRecord?.PurchasePrice ?? 0,
                            SalesPrice = openingStockRecord?.SalesPrice ?? 0,
                            Date = fiscalYear.EndDate ?? DateTime.UtcNow,
                            NepaliDate = fiscalYear.EndDateNepali ?? DateTime.UtcNow.ToString("yyyy-MM-dd"),
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        result.Add(closingStock);
                    }
                }
            }

            await _context.SaveChangesAsync();
            return result;
        }

        /// <summary>
        /// Adds Profit & Loss to the closing balances before saving
        /// </summary>
        // private async Task AddProfitAndLossToClosingBalancesAsync(
        //     Guid sourceFiscalYearId,
        //     Guid companyId,
        //     List<AccountBalanceSummaryDto> closingBalances)
        // {
        //     // Calculate Profit & Loss from closing balances
        //     var netProfitLoss = await CalculateProfitAndLossAsync(
        //         sourceFiscalYearId,
        //         companyId,
        //         closingBalances);

        //     if (netProfitLoss == 0)
        //     {
        //         _logger.LogInformation("Net Profit/Loss is zero, skipping addition to closing balances");
        //         return;
        //     }

        //     // Find the Profit & Loss account
        //     var profitLossAccount = await _context.Accounts
        //         .Include(a => a.AccountGroup)
        //         .FirstOrDefaultAsync(a => a.CompanyId == companyId &&
        //                                  a.Name == "Profit & Loss" &&
        //                                  a.IsActive);

        //     if (profitLossAccount == null)
        //     {
        //         _logger.LogWarning("Profit & Loss account not found. Creating one...");

        //         // Try to find Profit & Loss account group
        //         var profitLossGroup = await _context.AccountGroups
        //             .FirstOrDefaultAsync(g => g.CompanyId == companyId && g.Name == "Profit & Loss");

        //         if (profitLossGroup == null)
        //         {
        //             _logger.LogWarning("Profit & Loss account group not found. Skipping P&L addition.");
        //             return;
        //         }

        //         // Get active fiscal year
        //         var activeFiscalYear = await _context.FiscalYears
        //             .FirstOrDefaultAsync(f => f.CompanyId == companyId && f.IsActive);

        //         if (activeFiscalYear == null)
        //         {
        //             _logger.LogWarning("No active fiscal year found. Skipping P&L addition.");
        //             return;
        //         }

        //         // Create Profit & Loss account
        //         profitLossAccount = new Account
        //         {
        //             Id = Guid.NewGuid(),
        //             Name = "Profit & Loss",
        //             AccountGroupsId = profitLossGroup.Id,
        //             CompanyId = companyId,
        //             OriginalFiscalYearId = activeFiscalYear.Id,
        //             OpeningBalanceType = "Dr",
        //             IsActive = true,
        //             IsDefaultAccount = true,
        //             Date = activeFiscalYear.StartDate ?? DateTime.UtcNow,
        //             NepaliDate = activeFiscalYear.StartDateNepali,
        //             CreatedAt = DateTime.UtcNow,
        //             UpdatedAt = DateTime.UtcNow
        //         };

        //         _context.Accounts.Add(profitLossAccount);
        //         await _context.SaveChangesAsync();

        //         _logger.LogInformation($"Created Profit & Loss account for company {companyId}");
        //     }

        //     // Check if Profit & Loss account already exists in closing balances
        //     var existingPandL = closingBalances.FirstOrDefault(b => b.AccountId == profitLossAccount.Id);

        //     if (existingPandL != null)
        //     {
        //         // Update existing P&L balance
        //         if (netProfitLoss > 0)
        //         {
        //             existingPandL.CreditAmount = netProfitLoss;
        //             existingPandL.DebitAmount = 0;
        //             existingPandL.BalanceType = "Cr";
        //         }
        //         else
        //         {
        //             existingPandL.DebitAmount = Math.Abs(netProfitLoss);
        //             existingPandL.CreditAmount = 0;
        //             existingPandL.BalanceType = "Dr";
        //         }
        //         _logger.LogInformation($"Updated Profit & Loss in closing balances: {netProfitLoss}");
        //     }
        //     else
        //     {
        //         // Add new Profit & Loss to closing balances
        //         closingBalances.Add(new AccountBalanceSummaryDto
        //         {
        //             AccountId = profitLossAccount.Id,
        //             AccountName = profitLossAccount.Name,
        //             AccountGroupName = profitLossAccount.AccountGroup?.Name ?? "Profit & Loss",
        //             DebitAmount = netProfitLoss < 0 ? Math.Abs(netProfitLoss) : 0,
        //             CreditAmount = netProfitLoss > 0 ? netProfitLoss : 0,
        //             BalanceType = netProfitLoss > 0 ? "Cr" : "Dr"
        //         });
        //         _logger.LogInformation($"Added Profit & Loss to closing balances: {netProfitLoss}");
        //     }
        // }

        //----------------------------------------end1

        private async Task AddProfitAndLossToClosingBalancesAsync(
            Guid sourceFiscalYearId,
            Guid companyId,
            List<AccountBalanceSummaryDto> closingBalances)
        {
            // Calculate Profit & Loss from closing balances
            var netProfitLoss = await CalculateProfitAndLossAsync(
                sourceFiscalYearId,
                companyId,
                closingBalances);

            _logger.LogInformation($"Profit & Loss calculated: {netProfitLoss}");

            // Find the Profit & Loss account
            var profitLossAccount = await _context.Accounts
                .Include(a => a.AccountGroup)
                .FirstOrDefaultAsync(a => a.CompanyId == companyId &&
                                         a.Name == "Profit & Loss" &&
                                         a.IsActive);

            if (profitLossAccount == null)
            {
                _logger.LogInformation("Profit & Loss account not found. No need to reset.");
                return;
            }

            // Check if Profit & Loss account already exists in closing balances
            var existingPandL = closingBalances.FirstOrDefault(b => b.AccountId == profitLossAccount.Id);

            if (existingPandL != null)
            {
                // ✅ SET P&L balance to ZERO (it has been transferred to Reserve & Surplus)
                existingPandL.DebitAmount = 0;
                existingPandL.CreditAmount = 0;
                existingPandL.BalanceType = "Dr";
                _logger.LogInformation($"Reset Profit & Loss balance to ZERO in closing balances (was: {netProfitLoss})");
            }
            else
            {
                // ✅ Add P&L with ZERO balance
                closingBalances.Add(new AccountBalanceSummaryDto
                {
                    AccountId = profitLossAccount.Id,
                    AccountName = profitLossAccount.Name,
                    AccountGroupName = profitLossAccount.AccountGroup?.Name ?? "Profit & Loss",
                    DebitAmount = 0,
                    CreditAmount = 0,
                    BalanceType = "Dr"
                });
                _logger.LogInformation("Added Profit & Loss account with ZERO balance");
            }
        }

        /// <summary>
        /// Updates Capital Account in closing balances with the Profit/Loss
        /// This SAVES the closing balance in source fiscal year
        // /// </summary>
        // private async Task UpdateCapitalAccountInClosingBalancesAsync(
        //     Guid sourceFiscalYearId,
        //     Guid companyId,
        //     decimal netProfitLoss,
        //     List<AccountBalanceSummaryDto> closingBalances,
        //     DateTime sourceFiscalYearEndDate,
        //     string sourceFiscalYearEndDateNepali)
        // {
        //     if (netProfitLoss == 0)
        //     {
        //         _logger.LogInformation("Net Profit/Loss is zero, skipping Capital Account update");
        //         return;
        //     }

        //     // Get the Capital Account
        //     var capitalAccount = await _context.Accounts
        //         .Include(a => a.AccountGroup)
        //         .FirstOrDefaultAsync(a => a.CompanyId == companyId &&
        //                                  a.AccountGroup != null &&
        //                                  a.AccountGroup.Name == "Capital Account" &&
        //                                  a.IsActive);

        //     if (capitalAccount == null)
        //     {
        //         // Try to find Reserves & Surplus
        //         capitalAccount = await _context.Accounts
        //             .Include(a => a.AccountGroup)
        //             .FirstOrDefaultAsync(a => a.CompanyId == companyId &&
        //                                      a.AccountGroup != null &&
        //                                      a.AccountGroup.Name == "Reserves & Surplus" &&
        //                                      a.IsActive);
        //     }

        //     if (capitalAccount == null)
        //     {
        //         _logger.LogWarning("No Capital Account or Reserves & Surplus found to update closing balance");
        //         return;
        //     }

        //     // Get the existing Capital Account balance from closing balances
        //     var existingCapital = closingBalances.FirstOrDefault(b => b.AccountId == capitalAccount.Id);

        //     decimal existingDebit = existingCapital?.DebitAmount ?? 0;
        //     decimal existingCredit = existingCapital?.CreditAmount ?? 0;
        //     string existingType = existingCapital?.BalanceType ?? "Cr";

        //     // Calculate new balance after adding Profit/Loss
        //     decimal newDebit = existingDebit;
        //     decimal newCredit = existingCredit;
        //     string newType = existingType;

        //     if (netProfitLoss > 0) // Profit - add to Credit
        //     {
        //         newCredit += netProfitLoss;
        //         newType = newCredit >= newDebit ? "Cr" : "Dr";
        //     }
        //     else // Loss - add to Debit
        //     {
        //         decimal lossAmount = Math.Abs(netProfitLoss);
        //         newDebit += lossAmount;
        //         newType = newDebit >= newCredit ? "Dr" : "Cr";
        //     }

        //     // Update or add Capital Account in closing balances
        //     if (existingCapital != null)
        //     {
        //         existingCapital.DebitAmount = newDebit;
        //         existingCapital.CreditAmount = newCredit;
        //         existingCapital.BalanceType = newType;
        //         _logger.LogInformation($"Updated Capital Account in closing balances: {newType} {Math.Abs(newDebit - newCredit)}");
        //     }
        //     else
        //     {
        //         closingBalances.Add(new AccountBalanceSummaryDto
        //         {
        //             AccountId = capitalAccount.Id,
        //             AccountName = capitalAccount.Name,
        //             AccountGroupName = capitalAccount.AccountGroup?.Name ?? "Capital Account",
        //             DebitAmount = newDebit,
        //             CreditAmount = newCredit,
        //             BalanceType = newType
        //         });
        //         _logger.LogInformation($"Added Capital Account to closing balances: {newType} {Math.Abs(newDebit - newCredit)}");
        //     }
        // }

        /// <summary>
        /// Updates Capital Account in closing balances with the Profit/Loss
        /// Formula: Closing Capital = Opening Capital + Net Profit/Loss
        /// </summary>
        private async Task UpdateCapitalAccountInClosingBalancesAsync(
            Guid sourceFiscalYearId,
            Guid companyId,
            decimal netProfitLoss,
            List<AccountBalanceSummaryDto> closingBalances,
            DateTime sourceFiscalYearEndDate,
            string sourceFiscalYearEndDateNepali)
        {
            // Get the Capital Account
            var capitalAccount = await _context.Accounts
                .Include(a => a.AccountGroup)
                .FirstOrDefaultAsync(a => a.CompanyId == companyId &&
                                         a.AccountGroup != null &&
                                         a.AccountGroup.Name == "Capital Account" &&
                                         a.IsActive);

            if (capitalAccount == null)
            {
                // Try to find Reserves & Surplus
                capitalAccount = await _context.Accounts
                    .Include(a => a.AccountGroup)
                    .FirstOrDefaultAsync(a => a.CompanyId == companyId &&
                                             a.AccountGroup != null &&
                                             a.AccountGroup.Name == "Reserves & Surplus" &&
                                             a.IsActive);
            }

            if (capitalAccount == null)
            {
                _logger.LogWarning("No Capital Account or Reserves & Surplus found to update closing balance");
                return;
            }

            // ✅ Get the Capital Account OPENING balance from source fiscal year
            var sourceOpeningBalance = await _context.OpeningBalanceByFiscalYear
                .FirstOrDefaultAsync(ob => ob.AccountId == capitalAccount.Id &&
                                          ob.CompanyId == companyId &&
                                          ob.FiscalYearId == sourceFiscalYearId);

            decimal openingBalance = 0;
            string openingBalanceType = "Cr";

            if (sourceOpeningBalance != null)
            {
                openingBalance = sourceOpeningBalance.Amount;
                openingBalanceType = sourceOpeningBalance.Type;
                _logger.LogInformation($"Found Capital Account OPENING balance in source FY: {openingBalanceType} {openingBalance}");
            }

            // ✅ Calculate Closing Balance = Opening Balance + Net Profit/Loss
            decimal closingDebit = 0;
            decimal closingCredit = 0;
            string closingType = "Cr";

            if (netProfitLoss != 0)
            {
                if (netProfitLoss > 0) // Profit - add to Credit
                {
                    if (openingBalanceType == "Cr")
                    {
                        closingCredit = openingBalance + netProfitLoss;
                        closingType = "Cr";
                    }
                    else // Opening balance is Debit
                    {
                        if (openingBalance >= netProfitLoss)
                        {
                            closingDebit = openingBalance - netProfitLoss;
                            closingType = "Dr";
                        }
                        else
                        {
                            closingCredit = netProfitLoss - openingBalance;
                            closingType = "Cr";
                        }
                    }
                }
                else // Loss - subtract from balance
                {
                    decimal lossAmount = Math.Abs(netProfitLoss);

                    if (openingBalanceType == "Cr")
                    {
                        if (openingBalance >= lossAmount)
                        {
                            closingCredit = openingBalance - lossAmount;
                            closingType = "Cr";
                        }
                        else
                        {
                            closingDebit = lossAmount - openingBalance;
                            closingType = "Dr";
                        }
                    }
                    else // Opening balance is Debit
                    {
                        closingDebit = openingBalance + lossAmount;
                        closingType = "Dr";
                    }
                }
            }
            else
            {
                // If no P&L, closing = opening
                if (openingBalanceType == "Cr")
                {
                    closingCredit = openingBalance;
                    closingType = "Cr";
                }
                else
                {
                    closingDebit = openingBalance;
                    closingType = "Dr";
                }
            }

            _logger.LogInformation($"Calculated Capital Account closing balance: Opening {openingBalanceType} {openingBalance} + P&L {(netProfitLoss > 0 ? "+" : "")}{netProfitLoss} = {closingType} {(closingDebit > 0 ? closingDebit : closingCredit)}");

            // ✅ Update or add Capital Account in closing balances
            var existingCapital = closingBalances.FirstOrDefault(b => b.AccountId == capitalAccount.Id);

            if (existingCapital != null)
            {
                existingCapital.DebitAmount = closingDebit;
                existingCapital.CreditAmount = closingCredit;
                existingCapital.BalanceType = closingType;
                _logger.LogInformation($"Updated Capital Account in closing balances: {closingType} {(closingDebit > 0 ? closingDebit : closingCredit)}");
            }
            else
            {
                closingBalances.Add(new AccountBalanceSummaryDto
                {
                    AccountId = capitalAccount.Id,
                    AccountName = capitalAccount.Name,
                    AccountGroupName = capitalAccount.AccountGroup?.Name ?? "Capital Account",
                    DebitAmount = closingDebit,
                    CreditAmount = closingCredit,
                    BalanceType = closingType
                });
                _logger.LogInformation($"Added Capital Account to closing balances: {closingType} {(closingDebit > 0 ? closingDebit : closingCredit)}");
            }
        }

        private async Task<List<AccountBalanceSummaryDto>> GetAccountClosingBalancesFromTransactionsAsync(
            Guid fiscalYearId,
            Guid companyId)
        {
            try
            {
                // Validate inputs
                if (fiscalYearId == Guid.Empty || companyId == Guid.Empty)
                {
                    _logger.LogError("Invalid fiscal year or company ID provided");
                    return new List<AccountBalanceSummaryDto>();
                }

                // Get all active accounts for the company with AccountGroup included
                var accounts = await _context.Accounts
                    .Include(a => a.AccountGroup)
                    .Where(a => a.CompanyId == companyId && a.IsActive)
                    .ToListAsync();

                if (accounts == null || !accounts.Any())
                {
                    _logger.LogWarning($"No active accounts found for company {companyId}");
                    return new List<AccountBalanceSummaryDto>();
                }

                var result = new List<AccountBalanceSummaryDto>();

                // Define account groups that should be excluded from filtering (include all transactions)
                var excludedFromFilteringGroups = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "Cash in Hand",
            "Duties & Taxes"
        };

                foreach (var account in accounts)
                {
                    try
                    {
                        if (account == null) continue;

                        var accountGroupName = account.AccountGroup?.Name ?? string.Empty;

                        // SKIP Stock in Hand - handled separately
                        if (!string.IsNullOrEmpty(accountGroupName) &&
                            accountGroupName.Equals("Stock in Hand", StringComparison.OrdinalIgnoreCase))
                        {
                            _logger.LogInformation($"Skipping Stock in Hand: {account.Name}");
                            continue;
                        }

                        // ============================================================
                        // ✅ DO NOT skip nominal accounts - include ALL accounts
                        // ============================================================

                        bool excludeFromCashFiltering = !string.IsNullOrEmpty(accountGroupName) &&
                            excludedFromFilteringGroups.Contains(accountGroupName);

                        var transactionsQuery = _context.Transactions
                            .Where(t => t.CompanyId == companyId &&
                                       t.FiscalYearId == fiscalYearId &&
                                       t.Status == TransactionStatus.Active &&
                                       (t.AccountId == account.Id ||
                                        t.PaymentAccountId == account.Id ||
                                        t.ReceiptAccountId == account.Id ||
                                        t.DebitAccountId == account.Id ||
                                        t.CreditAccountId == account.Id));

                        // Cash transaction filtering - only for real accounts, NOT nominal
                        if (!excludeFromCashFiltering)
                        {
                            bool isNominalAccount = !string.IsNullOrEmpty(accountGroupName) &&
                                _nominalAccountGroups.Contains(accountGroupName);

                            // Only filter cash for non-nominal accounts
                            if (!isNominalAccount)
                            {
                                transactionsQuery = transactionsQuery.Where(t =>
                                    !(t.PaymentMode == PaymentMode.Cash &&
                                      (t.Type == TransactionType.Sale ||
                                       t.Type == TransactionType.SlRt ||
                                       t.Type == TransactionType.Purc ||
                                       t.Type == TransactionType.PrRt)));
                            }
                        }

                        var transactions = await transactionsQuery
                            .Include(t => t.TransactionItems)
                            .ToListAsync();

                        decimal totalDebit = 0;
                        decimal totalCredit = 0;

                        foreach (var transaction in transactions)
                        {
                            if (transaction == null) continue;

                            if (transaction.AccountId == account.Id)
                            {
                                totalDebit += transaction.TotalDebit;
                                totalCredit += transaction.TotalCredit;
                            }
                            if (transaction.PaymentAccountId == account.Id)
                                totalDebit += transaction.TotalDebit;
                            if (transaction.ReceiptAccountId == account.Id)
                                totalCredit += transaction.TotalCredit;
                            if (transaction.DebitAccountId == account.Id)
                                totalDebit += transaction.TotalDebit;
                            if (transaction.CreditAccountId == account.Id)
                                totalCredit += transaction.TotalCredit;
                        }

                        // Check for opening balance
                        var openingBalanceRecord = await _context.OpeningBalanceByFiscalYear
                            .FirstOrDefaultAsync(o => o.AccountId == account.Id && o.FiscalYearId == fiscalYearId);

                        if (openingBalanceRecord != null)
                        {
                            if (openingBalanceRecord.Type == "Dr")
                                totalDebit += openingBalanceRecord.Amount;
                            else
                                totalCredit += openingBalanceRecord.Amount;
                        }

                        decimal closingBalance = Math.Abs(totalDebit - totalCredit);
                        string balanceType = totalDebit >= totalCredit ? "Dr" : "Cr";

                        // ✅ Include ALL accounts with balance (including nominal)
                        if (closingBalance > 0)
                        {
                            result.Add(new AccountBalanceSummaryDto
                            {
                                AccountId = account.Id,
                                AccountName = account.Name ?? "Unknown",
                                AccountGroupName = account.AccountGroup?.Name ?? "Unknown",
                                DebitAmount = totalDebit >= totalCredit ? closingBalance : 0,
                                CreditAmount = totalCredit > totalDebit ? closingBalance : 0,
                                BalanceType = balanceType
                            });

                            _logger.LogInformation($"Closing balance for {account.Name} ({accountGroupName}): {closingBalance} {balanceType}");
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"Error processing account {account?.Id}");
                        continue;
                    }
                }

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in GetAccountClosingBalancesFromTransactionsAsync");
                return new List<AccountBalanceSummaryDto>();
            }
        }

        private async Task<Transaction> CreateOpeningBalanceTransactionAsync(
            Guid fiscalYearId,
            Guid companyId,
            DateTime fiscalYearStartDate,
            string fiscalYearStartDateNepali,
            List<AccountBalanceSummaryDto> closingBalances)
        {
            var billNumber = await GenerateOpeningBalanceBillNumberAsync(fiscalYearId, companyId);

            // ============================================================
            // ✅ FILTER: Only include REAL accounts (non-nominal) for opening balances
            // Nominal accounts (Sale, Purchase, Expenses, Income) start at zero
            // ============================================================
            var openingBalances = closingBalances
                .Where(b => (b.DebitAmount > 0 || b.CreditAmount > 0))
                .Where(b => !_nominalAccountGroups.Contains(b.AccountGroupName))
                .ToList();

            _logger.LogInformation($"Opening balances: {openingBalances.Count} accounts (nominal accounts excluded)");

            decimal totalDebit = openingBalances.Sum(b => b.DebitAmount);
            decimal totalCredit = openingBalances.Sum(b => b.CreditAmount);

            // Create transaction
            var openingBalanceTransaction = new Transaction
            {
                Id = Guid.NewGuid(),
                CompanyId = companyId,
                FiscalYearId = fiscalYearId,
                Type = TransactionType.OpeningBalance,
                BillNumber = billNumber,
                Date = fiscalYearStartDate,
                NepaliDate = fiscalYearStartDateNepali,
                TransactionDateNepali = fiscalYearStartDateNepali,
                TotalDebit = totalDebit,
                TotalCredit = totalCredit,
                Status = TransactionStatus.Active,
                IsActive = true,
                PaymentMode = PaymentMode.Cash,
                InstType = InstrumentType.NA,
                CreatedAt = DateTime.UtcNow,
                TransactionItems = new List<TransactionItem>()
            };

            foreach (var balance in openingBalances.Where(b => b.DebitAmount > 0 || b.CreditAmount > 0))
            {
                openingBalanceTransaction.TransactionItems.Add(new TransactionItem
                {
                    Id = Guid.NewGuid(),
                    TransactionId = openingBalanceTransaction.Id,
                    Debit = balance.DebitAmount,
                    Credit = balance.CreditAmount,
                    CreatedAt = DateTime.UtcNow
                });
            }

            _context.Transactions.Add(openingBalanceTransaction);
            await _context.SaveChangesAsync();

            // Save to OpeningBalanceByFiscalYear - ONLY for REAL accounts
            foreach (var balance in openingBalances.Where(b => b.DebitAmount > 0 || b.CreditAmount > 0))
            {
                // Skip nominal accounts (double-check)
                if (_nominalAccountGroups.Contains(balance.AccountGroupName))
                    continue;

                var existing = await _context.OpeningBalanceByFiscalYear
                    .FirstOrDefaultAsync(ob => ob.AccountId == balance.AccountId && ob.FiscalYearId == fiscalYearId);

                if (existing != null)
                {
                    existing.Amount = balance.DebitAmount > 0 ? balance.DebitAmount : balance.CreditAmount;
                    existing.Type = balance.DebitAmount > 0 ? "Dr" : "Cr";
                    existing.Date = fiscalYearStartDate;
                    existing.NepaliDate = fiscalYearStartDateNepali;
                }
                else
                {
                    _context.OpeningBalanceByFiscalYear.Add(new OpeningBalanceByFiscalYear
                    {
                        Id = Guid.NewGuid(),
                        AccountId = balance.AccountId,
                        FiscalYearId = fiscalYearId,
                        CompanyId = companyId,
                        Amount = balance.DebitAmount > 0 ? balance.DebitAmount : balance.CreditAmount,
                        Type = balance.DebitAmount > 0 ? "Dr" : "Cr",
                        Date = fiscalYearStartDate,
                        NepaliDate = fiscalYearStartDateNepali
                    });
                }
            }

            // Master OpeningBalance - ONLY for REAL accounts
            foreach (var balance in openingBalances.Where(b => b.DebitAmount > 0 || b.CreditAmount > 0))
            {
                if (_nominalAccountGroups.Contains(balance.AccountGroupName))
                    continue;

                var existingMaster = await _context.OpeningBalances
                    .FirstOrDefaultAsync(ob => ob.AccountId == balance.AccountId && ob.CompanyId == companyId);

                if (existingMaster != null)
                {
                    existingMaster.Amount = balance.DebitAmount > 0 ? balance.DebitAmount : balance.CreditAmount;
                    existingMaster.Type = balance.DebitAmount > 0 ? "Dr" : "Cr";
                    existingMaster.Date = fiscalYearStartDate;
                    existingMaster.NepaliDate = fiscalYearStartDateNepali;
                    existingMaster.FiscalYearId = null;
                }
                else
                {
                    _context.OpeningBalances.Add(new OpeningBalance
                    {
                        Id = Guid.NewGuid(),
                        AccountId = balance.AccountId,
                        CompanyId = companyId,
                        Amount = balance.DebitAmount > 0 ? balance.DebitAmount : balance.CreditAmount,
                        Type = balance.DebitAmount > 0 ? "Dr" : "Cr",
                        Date = fiscalYearStartDate,
                        NepaliDate = fiscalYearStartDateNepali,
                        FiscalYearId = null
                    });
                }
            }

            await _context.SaveChangesAsync();
            return openingBalanceTransaction;
        }

        /// <summary>
        /// Save closing balances for the SOURCE fiscal year with END date
        /// </summary>
        private async Task SaveClosingBalancesForSourceFiscalYearAsync(
            Guid sourceFiscalYearId,
            Guid companyId,
            DateTime sourceFiscalYearEndDate,
            string sourceFiscalYearEndDateNepali,
            List<AccountBalanceSummaryDto> closingBalances)
        {
            foreach (var balance in closingBalances.Where(b => b.DebitAmount > 0 || b.CreditAmount > 0))
            {
                var existingClosingBalance = await _context.ClosingBalanceByFiscalYear
                    .FirstOrDefaultAsync(cb => cb.AccountId == balance.AccountId
                                            && cb.CompanyId == companyId
                                            && cb.FiscalYearId == sourceFiscalYearId);

                if (existingClosingBalance != null)
                {
                    // Update existing closing balance with END date
                    existingClosingBalance.Amount = balance.DebitAmount > 0 ? balance.DebitAmount : balance.CreditAmount;
                    existingClosingBalance.Type = balance.DebitAmount > 0 ? "Dr" : "Cr";
                    existingClosingBalance.Date = sourceFiscalYearEndDate; // ✅ Use END date
                    existingClosingBalance.NepaliDate = sourceFiscalYearEndDateNepali; // ✅ Use END Nepali date
                    existingClosingBalance.FiscalYearId = sourceFiscalYearId;
                }
                else
                {
                    // Create new closing balance WITH END date
                    var closingBalanceRecord = new ClosingBalanceByFiscalYear
                    {
                        Id = Guid.NewGuid(),
                        AccountId = balance.AccountId,
                        CompanyId = companyId,
                        Amount = balance.DebitAmount > 0 ? balance.DebitAmount : balance.CreditAmount,
                        Type = balance.DebitAmount > 0 ? "Dr" : "Cr",
                        Date = sourceFiscalYearEndDate, // ✅ Use END date
                        NepaliDate = sourceFiscalYearEndDateNepali, // ✅ Use END Nepali date
                        FiscalYearId = sourceFiscalYearId
                    };

                    _context.ClosingBalanceByFiscalYear.Add(closingBalanceRecord);
                }
            }

            await _context.SaveChangesAsync();
        }

        private async Task<string> GenerateOpeningBalanceBillNumberAsync(Guid fiscalYearId, Guid companyId)
        {
            var openingBalanceCount = await _context.Transactions
                .CountAsync(t => t.FiscalYearId == fiscalYearId &&
                                t.CompanyId == companyId &&
                                t.Type == TransactionType.OpeningBalance);

            return $"OP-BAL-{(openingBalanceCount + 1):D5}";
        }

        private async Task<Account> GetOrCreateSuspenseAccountAsync(Guid companyId)
        {
            var suspenseAccount = await _context.Accounts
                .FirstOrDefaultAsync(a => a.CompanyId == companyId && a.Name == "Suspense Account");

            if (suspenseAccount != null)
                return suspenseAccount;

            var defaultGroup = await _context.AccountGroups
                .FirstOrDefaultAsync(g => g.CompanyId == companyId && g.Name == "Current Assets");

            if (defaultGroup == null)
            {
                throw new InvalidOperationException($"Current Assets account group not found for company {companyId}");
            }

            var activeFiscalYear = await _context.FiscalYears
                .FirstOrDefaultAsync(f => f.CompanyId == companyId && f.IsActive);

            if (activeFiscalYear == null)
            {
                throw new InvalidOperationException($"No active fiscal year found for company {companyId}");
            }

            suspenseAccount = new Account
            {
                Id = Guid.NewGuid(),
                Name = "Suspense Account",
                AccountGroupsId = defaultGroup.Id,
                CompanyId = companyId,
                OriginalFiscalYearId = activeFiscalYear.Id,
                OpeningBalanceType = "Dr",
                IsActive = true,
                Date = activeFiscalYear.StartDate ?? DateTime.UtcNow,
                NepaliDate = activeFiscalYear.StartDateNepali ?? DateTime.UtcNow.ToString("yyyy-MM-dd"),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Accounts.Add(suspenseAccount);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created new Suspense Account for company {CompanyId}", companyId);

            return suspenseAccount;
        }


        // Add to FiscalYearTransferService.cs

        public async Task<CarryForwardCheckResponseDto> CheckCarryForwardNeededAsync(
            Guid sourceFiscalYearId, Guid targetFiscalYearId, Guid companyId)
        {
            var response = new CarryForwardCheckResponseDto();

            try
            {
                var sourceFiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.Id == sourceFiscalYearId && f.CompanyId == companyId);

                var targetFiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.Id == targetFiscalYearId && f.CompanyId == companyId);

                if (sourceFiscalYear == null || targetFiscalYear == null)
                {
                    response.Success = false;
                    response.Message = "Fiscal year not found";
                    return response;
                }

                // Check if this is a forward switch (target is newer than source)
                bool isForwardSwitch = sourceFiscalYear.EndDate < targetFiscalYear.StartDate;
                int yearsDifference = 0;

                if (isForwardSwitch && sourceFiscalYear.EndDate.HasValue && targetFiscalYear.StartDate.HasValue)
                {
                    yearsDifference = targetFiscalYear.StartDate.Value.Year - sourceFiscalYear.EndDate.Value.Year;
                }

                response.Success = true;
                response.NeedCarryForward = isForwardSwitch;
                response.Data = new CarryForwardInfoDto
                {
                    SourceFiscalYearId = sourceFiscalYear.Id,
                    SourceFiscalYearName = sourceFiscalYear.Name,
                    TargetFiscalYearId = targetFiscalYear.Id,
                    TargetFiscalYearName = targetFiscalYear.Name,
                    IsForwardSwitch = isForwardSwitch,
                    YearsDifference = yearsDifference,
                    SourceEndDate = sourceFiscalYear.EndDate,
                    TargetStartDate = targetFiscalYear.StartDate,
                    SourceEndDateNepali = sourceFiscalYear.EndDateNepali,
                    TargetStartDateNepali = targetFiscalYear.StartDateNepali
                };

                response.Message = isForwardSwitch
                    ? "This fiscal year switch requires balance carry forward"
                    : "No carry forward needed for backward switch";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking carry forward");
                response.Success = false;
                response.Message = ex.Message;
            }

            return response;
        }

        public async Task<CarryForwardResponseDto> CarryForwardBalancesAsync(
            CarryForwardRequestDto request, Guid companyId)
        {
            var response = new CarryForwardResponseDto();

            try
            {
                _logger.LogInformation("Carrying forward balances from {SourceId} to {TargetId} with type: {CarryType}",
                    request.SourceFiscalYearId, request.TargetFiscalYearId, request.CarryType);

                if (!request.CarryBalances)
                {
                    // Just switch without carrying forward
                    response.Success = true;
                    response.Message = "Fiscal year switched without carrying balances";
                    response.Data = new CarryForwardResultDto
                    {
                        SourceFiscalYearId = request.SourceFiscalYearId,
                        TargetFiscalYearId = request.TargetFiscalYearId,
                        TransferType = "None",
                        AccountsTransferred = 0,
                        ItemsTransferred = 0,
                        CompletedAt = DateTime.UtcNow
                    };
                    return response;
                }

                // Create transfer request based on carry type
                var transferRequest = new FiscalYearTransferRequestDto
                {
                    SourceFiscalYearId = request.SourceFiscalYearId,
                    TargetFiscalYearId = request.TargetFiscalYearId,
                    TransferDate = request.TransferDate,
                    TransferDateNepali = request.TransferDateNepali,
                    TransferItems = request.CarryType == "All", // Only transfer items if "All" is selected
                    TransferAccounts = request.CarryType == "All" // Only transfer accounts if "All" is selected
                };

                // For "NewAndChanged", we only need to transfer specific items/accounts
                // This is a simplified implementation - you may need to customize based on your requirements

                if (request.CarryType == "NewAndChanged")
                {
                    // Only transfer items and accounts that have changes
                    // You'll need to implement logic to detect what's "New" or "Changed"
                    // For now, we'll transfer everything but mark it as "NewAndChanged"
                    transferRequest.TransferItems = true;
                    transferRequest.TransferAccounts = true;
                }

                var result = await TransferFiscalYearBalancesAsync(transferRequest, companyId);

                if (result.Success)
                {
                    response.Success = true;
                    response.Message = $"Balances carried forward successfully ({request.CarryType})";
                    response.Data = new CarryForwardResultDto
                    {
                        SourceFiscalYearId = request.SourceFiscalYearId,
                        TargetFiscalYearId = request.TargetFiscalYearId,
                        TransferType = request.CarryType,
                        AccountsTransferred = result.Data?.AccountsSummary?.AccountsProcessed ?? 0,
                        ItemsTransferred = result.Data?.ItemsSummary?.ItemsWithStock ?? 0,
                        TotalBalance = result.Data?.AccountsSummary?.TotalDebitBalance ?? 0,
                        CompletedAt = DateTime.UtcNow
                    };
                }
                else
                {
                    response.Success = false;
                    response.Message = "Failed to carry forward balances";
                    response.Errors = result.Errors;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error carrying forward balances");
                response.Success = false;
                response.Errors.Add(ex.Message);
            }

            return response;
        }


        // public async Task<UpdateBalancesResponseDto> GetUpdateableBalancesAsync(
        //     Guid sourceFiscalYearId, Guid targetFiscalYearId, Guid companyId, string carryType)
        // {
        //     var response = new UpdateBalancesResponseDto();

        //     try
        //     {
        //         var sourceFiscalYear = await _context.FiscalYears
        //             .FirstOrDefaultAsync(f => f.Id == sourceFiscalYearId && f.CompanyId == companyId);
        //         var targetFiscalYear = await _context.FiscalYears
        //             .FirstOrDefaultAsync(f => f.Id == targetFiscalYearId && f.CompanyId == companyId);

        //         if (sourceFiscalYear == null || targetFiscalYear == null)
        //         {
        //             response.Success = false;
        //             response.Message = "Fiscal year not found";
        //             return response;
        //         }

        //         // Get items that existed in the SOURCE fiscal year ONLY
        //         var sourceItems = await _context.Items
        //             .Where(i => i.CompanyId == companyId &&
        //                         i.Status == "active" &&
        //                         (i.OriginalFiscalYearId == null || i.OriginalFiscalYearId <= sourceFiscalYearId) &&
        //                         i.Date <= (sourceFiscalYear.EndDate ?? DateTime.UtcNow))
        //             .ToListAsync();

        //         var sourceItemIds = sourceItems.Select(i => i.Id).ToHashSet();

        //         _logger.LogInformation($"Found {sourceItems.Count} items that existed in source fiscal year {sourceFiscalYear.Name}");

        //         // Get closing balances from source fiscal year
        //         var closingBalances = await GetAccountClosingBalancesFromTransactionsAsync(sourceFiscalYearId, companyId);

        //         // Get item closing stocks ONLY for items that existed in source fiscal year
        //         var allItemStocks = await GetItemClosingStocksFromStockEntriesAsync(sourceFiscalYearId, companyId);
        //         var itemStocks = allItemStocks.Where(s => sourceItemIds.Contains(s.ItemId)).ToList();

        //         _logger.LogInformation($"Found {itemStocks.Count} item stocks from {allItemStocks.Count} total for source fiscal year");

        //         // Calculate total stock value from ALL items
        //         decimal totalStockValue = itemStocks.Sum(i => i.ClosingStockValue);

        //         var accountBalances = new List<AccountBalanceUpdateDto>();
        //         var itemStockList = new List<ItemStockUpdateDto>();

        //         if (carryType == "All")
        //         {
        //             // Show all balances from source fiscal year
        //             foreach (var balance in closingBalances)
        //             {
        //                 accountBalances.Add(new AccountBalanceUpdateDto
        //                 {
        //                     AccountId = balance.AccountId,
        //                     AccountName = balance.AccountName,
        //                     AccountGroupName = balance.AccountGroupName,
        //                     CurrentBalance = balance.DebitAmount > 0 ? balance.DebitAmount : balance.CreditAmount,
        //                     UpdatedBalance = balance.DebitAmount > 0 ? balance.DebitAmount : balance.CreditAmount,
        //                     BalanceType = balance.BalanceType,
        //                     IsNew = false,
        //                     IsChanged = false,
        //                     IsSelected = true
        //                 });
        //             }

        //             foreach (var stock in itemStocks)
        //             {
        //                 itemStockList.Add(new ItemStockUpdateDto
        //                 {
        //                     ItemId = stock.ItemId,
        //                     ItemName = stock.Item?.Name ?? "Unknown",
        //                     CategoryName = stock.Item?.Category?.Name ?? "Unknown",
        //                     ClosingStock = stock.ClosingStock,
        //                     OpeningStock = stock.ClosingStock,
        //                     ClosingStockValue = stock.ClosingStockValue,
        //                     OpeningStockValue = stock.ClosingStockValue,
        //                     AveragePurchaseRate = stock.PurchasePrice,
        //                     AverageSalesRate = stock.SalesPrice,
        //                     IsNew = false,
        //                     IsChanged = false,
        //                     IsSelected = true,
        //                     ExistedInSourceFiscalYear = true
        //                 });
        //             }
        //         }
        //         else if (carryType == "NewAndChanged")
        //         {
        //             // Get existing opening balances for target fiscal year
        //             var existingOpeningBalances = await _context.OpeningBalanceByFiscalYear
        //                 .Where(ob => ob.FiscalYearId == targetFiscalYearId)
        //                 .ToDictionaryAsync(ob => ob.AccountId, ob => ob);

        //             // Get existing opening stocks for target fiscal year
        //             var existingOpeningStocks = await _context.ItemOpeningStockByFiscalYear
        //                 .Where(os => os.FiscalYearId == targetFiscalYearId)
        //                 .ToDictionaryAsync(os => os.ItemId, os => os);

        //             // Track if there are any stock changes
        //             bool hasStockChanges = false;

        //             // ============================================================
        //             // 1. ITEMS - Show ALL items if ANY item has changed
        //             //    But mark which ones are NEW or CHANGED
        //             // ============================================================
        //             foreach (var stock in itemStocks)
        //             {
        //                 // Check if this item exists in target fiscal year's opening stocks
        //                 bool isNew = !existingOpeningStocks.ContainsKey(stock.ItemId);

        //                 // Check if stock quantity or prices have changed
        //                 bool isChanged = existingOpeningStocks.TryGetValue(stock.ItemId, out var existing)
        //                     && (existing.OpeningStock != stock.ClosingStock ||
        //                         existing.PurchasePrice != stock.PurchasePrice ||
        //                         existing.SalesPrice != stock.SalesPrice);

        //                 // If ANY item is new or changed, we need to show ALL items
        //                 if (isNew || isChanged)
        //                 {
        //                     hasStockChanges = true;
        //                 }
        //             }

        //             // ✅ If there are stock changes, show ALL items (not just changed ones)
        //             if (hasStockChanges)
        //             {
        //                 foreach (var stock in itemStocks)
        //                 {
        //                     // Check if this item exists in target fiscal year's opening stocks
        //                     bool isNew = !existingOpeningStocks.ContainsKey(stock.ItemId);

        //                     // Check if stock quantity or prices have changed
        //                     bool isChanged = existingOpeningStocks.TryGetValue(stock.ItemId, out var existing)
        //                         && (existing.OpeningStock != stock.ClosingStock ||
        //                             existing.PurchasePrice != stock.PurchasePrice ||
        //                             existing.SalesPrice != stock.SalesPrice);

        //                     itemStockList.Add(new ItemStockUpdateDto
        //                     {
        //                         ItemId = stock.ItemId,
        //                         ItemName = stock.Item?.Name ?? "Unknown",
        //                         CategoryName = stock.Item?.Category?.Name ?? "Unknown",
        //                         ClosingStock = stock.ClosingStock,
        //                         OpeningStock = stock.ClosingStock,
        //                         ClosingStockValue = stock.ClosingStockValue,
        //                         OpeningStockValue = stock.ClosingStockValue,
        //                         AveragePurchaseRate = stock.PurchasePrice,
        //                         AverageSalesRate = stock.SalesPrice,
        //                         IsNew = isNew,
        //                         IsChanged = isChanged,
        //                         IsSelected = true,
        //                         ExistedInSourceFiscalYear = true
        //                     });
        //                 }

        //                 _logger.LogInformation($"Showing ALL {itemStockList.Count} items because there are stock changes");
        //             }

        //             // ============================================================
        //             // 2. ACCOUNTS - Only show if new or changed
        //             // ============================================================
        //             foreach (var balance in closingBalances)
        //             {
        //                 bool isNew = !existingOpeningBalances.ContainsKey(balance.AccountId);
        //                 bool isChanged = existingOpeningBalances.TryGetValue(balance.AccountId, out var existing)
        //                     && existing.Amount != (balance.DebitAmount > 0 ? balance.DebitAmount : balance.CreditAmount);

        //                 // Check if this is the Stock in Hand account
        //                 bool isStockInHand = balance.AccountGroupName == "Stock in Hand" ||
        //                                      balance.AccountName == "Stock in Hand";

        //                 // ============================================================
        //                 // STOCK IN HAND: Show ONLY if there are stock changes
        //                 // ============================================================
        //                 if (isStockInHand)
        //                 {
        //                     // ✅ Show Stock in Hand ONLY if there are stock changes
        //                     if (hasStockChanges)
        //                     {
        //                         // Add Stock in Hand with total stock value
        //                         accountBalances.Add(new AccountBalanceUpdateDto
        //                         {
        //                             AccountId = balance.AccountId,
        //                             AccountName = balance.AccountName,
        //                             AccountGroupName = balance.AccountGroupName,
        //                             CurrentBalance = totalStockValue,
        //                             UpdatedBalance = totalStockValue,
        //                             BalanceType = "Dr",
        //                             IsNew = false,
        //                             IsChanged = true,
        //                             IsSelected = true
        //                         });

        //                         _logger.LogInformation($"Stock in Hand added with total value: {totalStockValue}");
        //                     }
        //                     continue;
        //                 }

        //                 // ============================================================
        //                 // NON-STOCK ACCOUNTS: Show ONLY if new or changed
        //                 // ============================================================
        //                 if (isNew || isChanged)
        //                 {
        //                     accountBalances.Add(new AccountBalanceUpdateDto
        //                     {
        //                         AccountId = balance.AccountId,
        //                         AccountName = balance.AccountName,
        //                         AccountGroupName = balance.AccountGroupName,
        //                         CurrentBalance = balance.DebitAmount > 0 ? balance.DebitAmount : balance.CreditAmount,
        //                         UpdatedBalance = balance.DebitAmount > 0 ? balance.DebitAmount : balance.CreditAmount,
        //                         BalanceType = balance.BalanceType,
        //                         IsNew = isNew,
        //                         IsChanged = isChanged,
        //                         IsSelected = true
        //                     });
        //                 }
        //             }

        //             // ✅ If there are stock changes but Stock in Hand was not found in closingBalances,
        //             // we need to add it manually
        //             if (hasStockChanges && !accountBalances.Any(a => a.AccountGroupName == "Stock in Hand" || a.AccountName == "Stock in Hand"))
        //             {
        //                 // Try to find the Stock in Hand account
        //                 var stockInHandAccount = await _context.Accounts
        //                     .Include(a => a.AccountGroup)
        //                     .FirstOrDefaultAsync(a => a.CompanyId == companyId &&
        //                                              a.AccountGroup != null &&
        //                                              a.AccountGroup.Name == "Stock in Hand" &&
        //                                              a.IsActive);

        //                 if (stockInHandAccount != null)
        //                 {
        //                     accountBalances.Add(new AccountBalanceUpdateDto
        //                     {
        //                         AccountId = stockInHandAccount.Id,
        //                         AccountName = stockInHandAccount.Name,
        //                         AccountGroupName = "Stock in Hand",
        //                         CurrentBalance = totalStockValue,
        //                         UpdatedBalance = totalStockValue,
        //                         BalanceType = "Dr",
        //                         IsNew = false,
        //                         IsChanged = true,
        //                         IsSelected = true
        //                     });

        //                     _logger.LogInformation($"Stock in Hand manually added with total value: {totalStockValue}");
        //                 }
        //             }
        //         }

        //         response.Success = true;
        //         response.Message = "Balances retrieved successfully";
        //         response.Data = new UpdateBalancesDataDto
        //         {
        //             SourceFiscalYearId = sourceFiscalYear.Id,
        //             SourceFiscalYearName = sourceFiscalYear.Name,
        //             TargetFiscalYearId = targetFiscalYear.Id,
        //             TargetFiscalYearName = targetFiscalYear.Name,
        //             CarryType = carryType,
        //             AccountBalances = accountBalances,
        //             ItemStocks = itemStockList,
        //             Summary = new TransferSummaryDto
        //             {
        //                 TotalAccounts = accountBalances.Count,
        //                 TotalItems = itemStockList.Count,
        //                 TotalDebitBalance = accountBalances.Sum(a => a.BalanceType == "Dr" ? a.UpdatedBalance : 0),
        //                 TotalCreditBalance = accountBalances.Sum(a => a.BalanceType == "Cr" ? a.UpdatedBalance : 0),
        //                 TotalStockValue = itemStockList.Sum(i => i.OpeningStockValue)
        //             }
        //         };

        //         _logger.LogInformation($"Returning {itemStockList.Count} items and {accountBalances.Count} accounts from source fiscal year {sourceFiscalYear.Name}");
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error getting updateable balances");
        //         response.Success = false;
        //         response.Errors.Add(ex.Message);
        //     }

        //     return response;
        // }

        //---------------------------------------end1

        public async Task<UpdateBalancesResponseDto> GetUpdateableBalancesAsync(
            Guid sourceFiscalYearId, Guid targetFiscalYearId, Guid companyId, string carryType)
        {
            var response = new UpdateBalancesResponseDto();

            try
            {
                var sourceFiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.Id == sourceFiscalYearId && f.CompanyId == companyId);
                var targetFiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.Id == targetFiscalYearId && f.CompanyId == companyId);

                if (sourceFiscalYear == null || targetFiscalYear == null)
                {
                    response.Success = false;
                    response.Message = "Fiscal year not found";
                    return response;
                }

                // Get items that existed in the SOURCE fiscal year ONLY
                var sourceItems = await _context.Items
                    .Where(i => i.CompanyId == companyId &&
                                i.Status == "active" &&
                                (i.OriginalFiscalYearId == null || i.OriginalFiscalYearId <= sourceFiscalYearId) &&
                                i.Date <= (sourceFiscalYear.EndDate ?? DateTime.UtcNow))
                    .ToListAsync();

                var sourceItemIds = sourceItems.Select(i => i.Id).ToHashSet();

                _logger.LogInformation($"Found {sourceItems.Count} items that existed in source fiscal year {sourceFiscalYear.Name}");

                // Get closing balances from source fiscal year
                var closingBalances = await GetAccountClosingBalancesFromTransactionsAsync(sourceFiscalYearId, companyId);

                // Get item closing stocks ONLY for items that existed in source fiscal year
                var allItemStocks = await GetItemClosingStocksFromStockEntriesAsync(sourceFiscalYearId, companyId);
                var itemStocks = allItemStocks.Where(s => sourceItemIds.Contains(s.ItemId)).ToList();

                _logger.LogInformation($"Found {itemStocks.Count} item stocks from {allItemStocks.Count} total for source fiscal year");

                // Calculate total stock value from ALL items
                decimal totalStockValue = itemStocks.Sum(i => i.ClosingStockValue);

                var accountBalances = new List<AccountBalanceUpdateDto>();
                var itemStockList = new List<ItemStockUpdateDto>();

                if (carryType == "All")
                {
                    // Show all balances from source fiscal year
                    foreach (var balance in closingBalances)
                    {
                        accountBalances.Add(new AccountBalanceUpdateDto
                        {
                            AccountId = balance.AccountId,
                            AccountName = balance.AccountName,
                            AccountGroupName = balance.AccountGroupName,
                            CurrentBalance = balance.DebitAmount > 0 ? balance.DebitAmount : balance.CreditAmount,
                            UpdatedBalance = balance.DebitAmount > 0 ? balance.DebitAmount : balance.CreditAmount,
                            BalanceType = balance.BalanceType,
                            IsNew = false,
                            IsChanged = false,
                            IsSelected = true
                        });
                    }

                    foreach (var stock in itemStocks)
                    {
                        itemStockList.Add(new ItemStockUpdateDto
                        {
                            ItemId = stock.ItemId,
                            ItemName = stock.Item?.Name ?? "Unknown",
                            CategoryName = stock.Item?.Category?.Name ?? "Unknown",
                            ClosingStock = stock.ClosingStock,
                            OpeningStock = stock.ClosingStock,
                            ClosingStockValue = stock.ClosingStockValue,
                            OpeningStockValue = stock.ClosingStockValue,
                            AveragePurchaseRate = stock.PurchasePrice,
                            AverageSalesRate = stock.SalesPrice,
                            IsNew = false,
                            IsChanged = false,
                            IsSelected = true,
                            ExistedInSourceFiscalYear = true
                        });
                    }
                }
                else if (carryType == "NewAndChanged")
                {
                    // Get existing opening balances for target fiscal year
                    var existingOpeningBalances = await _context.OpeningBalanceByFiscalYear
                        .Where(ob => ob.FiscalYearId == targetFiscalYearId)
                        .ToDictionaryAsync(ob => ob.AccountId, ob => ob);

                    // Get existing opening stocks for target fiscal year
                    var existingOpeningStocks = await _context.ItemOpeningStockByFiscalYear
                        .Where(os => os.FiscalYearId == targetFiscalYearId && os.CompanyId == companyId)
                        .ToDictionaryAsync(os => os.ItemId, os => os);

                    _logger.LogInformation($"Found {existingOpeningStocks.Count} existing opening stocks in target fiscal year");

                    // ============================================================
                    // Check if there are ANY pending stock changes
                    // ============================================================
                    bool hasStockChanges = false;

                    foreach (var stock in itemStocks)
                    {
                        // Check if this item exists in target fiscal year's opening stocks
                        bool isNew = !existingOpeningStocks.ContainsKey(stock.ItemId);

                        // Check if stock quantity or prices have changed
                        bool isChanged = false;
                        if (!isNew)
                        {
                            var existing = existingOpeningStocks[stock.ItemId];
                            isChanged = (existing.OpeningStock != stock.ClosingStock ||
                                        existing.PurchasePrice != stock.PurchasePrice ||
                                        existing.SalesPrice != stock.SalesPrice);
                        }

                        // If ANY item is new or changed, mark hasStockChanges as true
                        if (isNew || isChanged)
                        {
                            hasStockChanges = true;
                            _logger.LogInformation($"Stock change detected for item {stock.ItemId}: IsNew={isNew}, IsChanged={isChanged}");
                            break; // No need to check further, we already know there's a change
                        }
                    }

                    // ============================================================
                    // If there are stock changes, show ALL items
                    // ============================================================
                    if (hasStockChanges)
                    {
                        _logger.LogInformation($"Stock changes detected, showing all {itemStocks.Count} items");

                        foreach (var stock in itemStocks)
                        {
                            bool isNew = !existingOpeningStocks.ContainsKey(stock.ItemId);
                            bool isChanged = false;

                            if (!isNew)
                            {
                                var existing = existingOpeningStocks[stock.ItemId];
                                isChanged = (existing.OpeningStock != stock.ClosingStock ||
                                            existing.PurchasePrice != stock.PurchasePrice ||
                                            existing.SalesPrice != stock.SalesPrice);
                            }

                            itemStockList.Add(new ItemStockUpdateDto
                            {
                                ItemId = stock.ItemId,
                                ItemName = stock.Item?.Name ?? "Unknown",
                                CategoryName = stock.Item?.Category?.Name ?? "Unknown",
                                ClosingStock = stock.ClosingStock,
                                OpeningStock = stock.ClosingStock,
                                ClosingStockValue = stock.ClosingStockValue,
                                OpeningStockValue = stock.ClosingStockValue,
                                AveragePurchaseRate = stock.PurchasePrice,
                                AverageSalesRate = stock.SalesPrice,
                                IsNew = isNew,
                                IsChanged = isChanged,
                                IsSelected = true,
                                ExistedInSourceFiscalYear = true
                            });
                        }

                        // ============================================================
                        // Add Stock in Hand account (only when there are stock changes)
                        // ============================================================
                        var stockInHandAccount = await _context.Accounts
                            .Include(a => a.AccountGroup)
                            .FirstOrDefaultAsync(a => a.CompanyId == companyId &&
                                                     a.AccountGroup != null &&
                                                     a.AccountGroup.Name == "Stock in Hand" &&
                                                     a.IsActive);

                        if (stockInHandAccount != null)
                        {
                            accountBalances.Add(new AccountBalanceUpdateDto
                            {
                                AccountId = stockInHandAccount.Id,
                                AccountName = stockInHandAccount.Name,
                                AccountGroupName = "Stock in Hand",
                                CurrentBalance = totalStockValue,
                                UpdatedBalance = totalStockValue,
                                BalanceType = "Dr",
                                IsNew = false,
                                IsChanged = true,
                                IsSelected = true
                            });

                            _logger.LogInformation($"Stock in Hand added with total value: {totalStockValue}");
                        }
                    }
                    else
                    {
                        _logger.LogInformation("No pending stock changes detected - returning empty lists");
                    }

                    // ============================================================
                    // ACCOUNTS - Only show non-stock accounts that are new or changed
                    // ============================================================
                    foreach (var balance in closingBalances)
                    {
                        bool isStockInHand = balance.AccountGroupName == "Stock in Hand" ||
                                             balance.AccountName == "Stock in Hand";

                        // Skip Stock in Hand - we already handled it above
                        if (isStockInHand)
                        {
                            continue;
                        }

                        bool isNew = !existingOpeningBalances.ContainsKey(balance.AccountId);
                        bool isChanged = false;

                        if (!isNew)
                        {
                            var existing = existingOpeningBalances[balance.AccountId];
                            isChanged = existing.Amount != (balance.DebitAmount > 0 ? balance.DebitAmount : balance.CreditAmount);
                        }

                        if (isNew || isChanged)
                        {
                            accountBalances.Add(new AccountBalanceUpdateDto
                            {
                                AccountId = balance.AccountId,
                                AccountName = balance.AccountName,
                                AccountGroupName = balance.AccountGroupName,
                                CurrentBalance = balance.DebitAmount > 0 ? balance.DebitAmount : balance.CreditAmount,
                                UpdatedBalance = balance.DebitAmount > 0 ? balance.DebitAmount : balance.CreditAmount,
                                BalanceType = balance.BalanceType,
                                IsNew = isNew,
                                IsChanged = isChanged,
                                IsSelected = true
                            });
                        }
                    }
                }

                response.Success = true;
                response.Message = "Balances retrieved successfully";
                response.Data = new UpdateBalancesDataDto
                {
                    SourceFiscalYearId = sourceFiscalYear.Id,
                    SourceFiscalYearName = sourceFiscalYear.Name,
                    TargetFiscalYearId = targetFiscalYear.Id,
                    TargetFiscalYearName = targetFiscalYear.Name,
                    CarryType = carryType,
                    AccountBalances = accountBalances,
                    ItemStocks = itemStockList,
                    Summary = new TransferSummaryDto
                    {
                        TotalAccounts = accountBalances.Count,
                        TotalItems = itemStockList.Count,
                        TotalDebitBalance = accountBalances.Sum(a => a.BalanceType == "Dr" ? a.UpdatedBalance : 0),
                        TotalCreditBalance = accountBalances.Sum(a => a.BalanceType == "Cr" ? a.UpdatedBalance : 0),
                        TotalStockValue = itemStockList.Sum(i => i.OpeningStockValue)
                    }
                };

                _logger.LogInformation($"Returning {itemStockList.Count} items and {accountBalances.Count} accounts from source fiscal year {sourceFiscalYear.Name}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting updateable balances");
                response.Success = false;
                response.Errors.Add(ex.Message);
            }

            return response;
        }

        // public async Task<UpdateBalancesResponseDto> UpdateAndFinalizeBalancesAsync(
        //     UpdateBalancesRequestDto request, Guid companyId)
        // {
        //     var response = new UpdateBalancesResponseDto();

        //     using var transaction = await _context.Database.BeginTransactionAsync();

        //     try
        //     {
        //         _logger.LogInformation("Updating and finalizing balances for fiscal year transfer");

        //         // Get source and target fiscal years
        //         var sourceFiscalYear = await _context.FiscalYears
        //             .FirstOrDefaultAsync(f => f.Id == request.SourceFiscalYearId && f.CompanyId == companyId);
        //         var targetFiscalYear = await _context.FiscalYears
        //             .FirstOrDefaultAsync(f => f.Id == request.TargetFiscalYearId && f.CompanyId == companyId);

        //         if (sourceFiscalYear == null || targetFiscalYear == null)
        //         {
        //             response.Success = false;
        //             response.Message = "Fiscal year not found";
        //             return response;
        //         }

        //         // ✅ Get target fiscal year start dates
        //         DateTime targetFiscalYearStartDate = targetFiscalYear.StartDate ?? request.TransferDate;
        //         string targetFiscalYearStartDateNepali = targetFiscalYear.StartDateNepali ?? request.TransferDateNepali ?? string.Empty;

        //         // ✅ Get source fiscal year end dates for closing balances
        //         DateTime sourceFiscalYearEndDate = sourceFiscalYear.EndDate ?? request.TransferDate;
        //         string sourceFiscalYearEndDateNepali = sourceFiscalYear.EndDateNepali ?? request.TransferDateNepali ?? string.Empty;

        //         // ✅ Use existing method to get item closing stocks with prices
        //         var itemStocks = await GetItemClosingStocksFromStockEntriesAsync(request.SourceFiscalYearId, companyId);
        //         decimal totalStockValue = itemStocks.Sum(i => i.ClosingStockValue);

        //         // ✅ Create a dictionary for quick lookup of stock prices
        //         var stockPriceDict = itemStocks.ToDictionary(
        //             s => s.ItemId,
        //             s => new { s.PurchasePrice, s.SalesPrice }
        //         );

        //         // ✅ First, ensure Stock in Hand account exists and has correct balance
        //         if (totalStockValue > 0)
        //         {
        //             var stockInHandAccount = await _context.Accounts
        //                 .Include(a => a.AccountGroup)
        //                 .FirstOrDefaultAsync(a => a.CompanyId == companyId &&
        //                                          a.AccountGroup != null &&
        //                                          a.AccountGroup.Name == "Stock in Hand" &&
        //                                          a.IsActive);

        //             if (stockInHandAccount == null)
        //             {
        //                 // Create Stock in Hand account if it doesn't exist
        //                 var stockInHandGroup = await _context.AccountGroups
        //                     .FirstOrDefaultAsync(g => g.Name == "Stock in Hand" && g.CompanyId == companyId);

        //                 if (stockInHandGroup != null)
        //                 {
        //                     stockInHandAccount = new Account
        //                     {
        //                         Id = Guid.NewGuid(),
        //                         Name = "Stock in Hand",
        //                         AccountGroupsId = stockInHandGroup.Id,
        //                         CompanyId = companyId,
        //                         OriginalFiscalYearId = sourceFiscalYear.Id,
        //                         OpeningBalanceType = "Dr",
        //                         IsActive = true,
        //                         Date = targetFiscalYearStartDate,
        //                         NepaliDate = targetFiscalYearStartDateNepali,
        //                         CreatedAt = DateTime.UtcNow,
        //                         UpdatedAt = DateTime.UtcNow
        //                     };
        //                     _context.Accounts.Add(stockInHandAccount);
        //                     await _context.SaveChangesAsync();
        //                 }
        //             }

        //             if (stockInHandAccount != null)
        //             {
        //                 // ✅ Add or update Stock in Hand in the updated accounts list
        //                 var stockInHandUpdated = request.UpdatedAccounts
        //                     .FirstOrDefault(a => a.AccountId == stockInHandAccount.Id);

        //                 if (stockInHandUpdated == null)
        //                 {
        //                     request.UpdatedAccounts.Add(new UpdatedAccountBalanceDto
        //                     {
        //                         AccountId = stockInHandAccount.Id,
        //                         NewBalance = totalStockValue,
        //                         BalanceType = "Dr",
        //                         IsSelected = true
        //                     });
        //                 }
        //                 else
        //                 {
        //                     stockInHandUpdated.NewBalance = totalStockValue;
        //                     stockInHandUpdated.BalanceType = "Dr";
        //                     stockInHandUpdated.IsSelected = true;
        //                 }
        //             }
        //         }

        //         // ============================================================
        //         // STEP 1: Get closing balances (INCLUDING nominal accounts)
        //         // ============================================================
        //         var closingBalances = await GetAccountClosingBalancesFromTransactionsAsync(request.SourceFiscalYearId, companyId);

        //         // ✅ Add Stock in Hand account balance with total stock value to closing balances
        //         if (totalStockValue > 0)
        //         {
        //             var stockInHandAccount = await _context.Accounts
        //                 .Include(a => a.AccountGroup)
        //                 .FirstOrDefaultAsync(a => a.CompanyId == companyId &&
        //                                          a.AccountGroup != null &&
        //                                          a.AccountGroup.Name == "Stock in Hand" &&
        //                                          a.IsActive);

        //             if (stockInHandAccount != null)
        //             {
        //                 var existingStockInHand = closingBalances.FirstOrDefault(b => b.AccountId == stockInHandAccount.Id);
        //                 if (existingStockInHand != null)
        //                 {
        //                     existingStockInHand.DebitAmount = totalStockValue;
        //                     existingStockInHand.CreditAmount = 0;
        //                     existingStockInHand.BalanceType = "Dr";
        //                 }
        //                 else
        //                 {
        //                     closingBalances.Add(new AccountBalanceSummaryDto
        //                     {
        //                         AccountId = stockInHandAccount.Id,
        //                         AccountName = stockInHandAccount.Name,
        //                         AccountGroupName = "Stock in Hand",
        //                         DebitAmount = totalStockValue,
        //                         CreditAmount = 0,
        //                         BalanceType = "Dr"
        //                     });
        //                 }
        //             }
        //         }
        //         // ✅ Add Profit & Loss to closing balances
        //         await AddProfitAndLossToClosingBalancesAsync(
        //             request.SourceFiscalYearId,
        //             companyId,
        //             closingBalances);

        //         // ✅ Calculate Profit & Loss
        //         var netProfitLoss = await CalculateProfitAndLossAsync(
        //             request.SourceFiscalYearId,
        //             companyId,
        //             closingBalances);

        //         // ✅ UPDATE Capital Account in closing balances with Profit/Loss
        //         await UpdateCapitalAccountInClosingBalancesAsync(
        //             request.SourceFiscalYearId,
        //             companyId,
        //             netProfitLoss,
        //             closingBalances,
        //             sourceFiscalYearEndDate,
        //             sourceFiscalYearEndDateNepali);

        //         // ============================================================
        //         // STEP 2: Save closing balances (ALL accounts including nominal)
        //         // ============================================================
        //         await SaveClosingBalancesForSourceFiscalYearAsync(
        //             request.SourceFiscalYearId,
        //             companyId,
        //             sourceFiscalYearEndDate,
        //             sourceFiscalYearEndDateNepali,
        //             closingBalances);

        //         // ============================================================
        //         // STEP 3: Update opening balances (filter out nominal accounts)
        //         // Note: We're using the same closingBalances but CreateOpeningBalanceTransactionAsync
        //         // will filter out nominal accounts internally
        //         // ============================================================

        //         // Update account balances with target fiscal year start dates
        //         foreach (var updatedAccount in request.UpdatedAccounts)
        //         {
        //             if (!updatedAccount.IsSelected) continue;

        //             // Skip nominal accounts from opening balance
        //             var account = await _context.Accounts
        //                 .Include(a => a.AccountGroup)
        //                 .FirstOrDefaultAsync(a => a.Id == updatedAccount.AccountId && a.CompanyId == companyId);

        //             if (account != null)
        //             {
        //                 var accountGroupName = account.AccountGroup?.Name ?? string.Empty;
        //                 // Skip nominal accounts (they start with zero balance)
        //                 if (_nominalAccountGroups.Contains(accountGroupName))
        //                 {
        //                     _logger.LogInformation($"Skipping nominal account for opening balance: {account.Name} (Group: {accountGroupName})");
        //                     continue;
        //                 }
        //             }

        //             var existingOpeningBalance = await _context.OpeningBalanceByFiscalYear
        //                 .FirstOrDefaultAsync(ob => ob.AccountId == updatedAccount.AccountId
        //                     && ob.FiscalYearId == request.TargetFiscalYearId);

        //             if (existingOpeningBalance != null)
        //             {
        //                 existingOpeningBalance.Amount = updatedAccount.NewBalance;
        //                 existingOpeningBalance.Type = updatedAccount.BalanceType;
        //                 existingOpeningBalance.Date = targetFiscalYearStartDate;
        //                 existingOpeningBalance.NepaliDate = targetFiscalYearStartDateNepali;

        //                 _logger.LogInformation($"UPDATED OpeningBalanceByFiscalYear for AccountId: {updatedAccount.AccountId}, FiscalYearId: {request.TargetFiscalYearId}, Amount: {updatedAccount.NewBalance}");
        //             }
        //             else
        //             {
        //                 var newOpeningBalance = new OpeningBalanceByFiscalYear
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     AccountId = updatedAccount.AccountId,
        //                     FiscalYearId = request.TargetFiscalYearId,
        //                     CompanyId = companyId,
        //                     Amount = updatedAccount.NewBalance,
        //                     Type = updatedAccount.BalanceType,
        //                     Date = targetFiscalYearStartDate,
        //                     NepaliDate = targetFiscalYearStartDateNepali
        //                 };
        //                 _context.OpeningBalanceByFiscalYear.Add(newOpeningBalance);

        //                 _logger.LogInformation($"CREATED OpeningBalanceByFiscalYear for AccountId: {updatedAccount.AccountId}, FiscalYearId: {request.TargetFiscalYearId}, Amount: {updatedAccount.NewBalance}");
        //             }

        //             // Update master opening balance
        //             var masterOpeningBalance = await _context.OpeningBalances
        //                 .FirstOrDefaultAsync(ob => ob.AccountId == updatedAccount.AccountId
        //                     && ob.CompanyId == companyId);

        //             if (masterOpeningBalance != null)
        //             {
        //                 masterOpeningBalance.Amount = updatedAccount.NewBalance;
        //                 masterOpeningBalance.Type = updatedAccount.BalanceType;
        //                 masterOpeningBalance.Date = targetFiscalYearStartDate;
        //                 masterOpeningBalance.NepaliDate = targetFiscalYearStartDateNepali;
        //                 masterOpeningBalance.FiscalYearId = null;
        //             }
        //             else
        //             {
        //                 var newMaster = new OpeningBalance
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     AccountId = updatedAccount.AccountId,
        //                     CompanyId = companyId,
        //                     Amount = updatedAccount.NewBalance,
        //                     Type = updatedAccount.BalanceType,
        //                     Date = targetFiscalYearStartDate,
        //                     NepaliDate = targetFiscalYearStartDateNepali,
        //                     FiscalYearId = null
        //                 };
        //                 _context.OpeningBalances.Add(newMaster);
        //             }
        //         }

        //         // ✅ Update item opening stocks with target fiscal year start dates
        //         foreach (var updatedItem in request.UpdatedItems)
        //         {
        //             if (!updatedItem.IsSelected) continue;

        //             // ✅ Get the prices from the stock price dictionary
        //             decimal purchasePrice = updatedItem.PurchasePrice ?? 0;
        //             decimal salesPrice = updatedItem.SalesPrice ?? 0;

        //             if (purchasePrice == 0 && stockPriceDict.TryGetValue(updatedItem.ItemId, out var prices))
        //             {
        //                 purchasePrice = prices.PurchasePrice;
        //                 salesPrice = prices.SalesPrice;
        //             }

        //             if (purchasePrice == 0)
        //             {
        //                 var sourceItem = await _context.Items
        //                     .FirstOrDefaultAsync(i => i.Id == updatedItem.ItemId && i.CompanyId == companyId);
        //                 if (sourceItem != null)
        //                 {
        //                     purchasePrice = sourceItem.PuPrice ?? 0;
        //                     salesPrice = sourceItem.Price ?? 0;
        //                 }
        //             }

        //             var existingOpeningStock = await _context.ItemOpeningStockByFiscalYear
        //                 .FirstOrDefaultAsync(os => os.ItemId == updatedItem.ItemId
        //                     && os.FiscalYearId == request.TargetFiscalYearId);

        //             if (existingOpeningStock != null)
        //             {
        //                 // ✅ Update existing opening stock with ALL fields
        //                 existingOpeningStock.OpeningStock = updatedItem.OpeningStock;
        //                 existingOpeningStock.OpeningStockValue = updatedItem.OpeningStockValue;
        //                 existingOpeningStock.PurchasePrice = purchasePrice;
        //                 existingOpeningStock.SalesPrice = salesPrice;
        //                 existingOpeningStock.Date = targetFiscalYearStartDate;
        //                 existingOpeningStock.NepaliDate = targetFiscalYearStartDateNepali;
        //                 existingOpeningStock.UpdatedAt = DateTime.UtcNow;

        //                 _logger.LogInformation($"UPDATED ItemOpeningStock for ItemId: {updatedItem.ItemId}, FiscalYearId: {request.TargetFiscalYearId}, Stock: {updatedItem.OpeningStock}, Value: {updatedItem.OpeningStockValue}");
        //             }
        //             else
        //             {
        //                 // ✅ Create new opening stock with ALL fields
        //                 var newOpeningStock = new ItemOpeningStockByFiscalYear
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     ItemId = updatedItem.ItemId,
        //                     FiscalYearId = request.TargetFiscalYearId,
        //                     CompanyId = companyId,
        //                     OpeningStock = updatedItem.OpeningStock,
        //                     OpeningStockValue = updatedItem.OpeningStockValue,
        //                     PurchasePrice = purchasePrice,
        //                     SalesPrice = salesPrice,
        //                     Date = targetFiscalYearStartDate,
        //                     NepaliDate = targetFiscalYearStartDateNepali,
        //                     CreatedAt = DateTime.UtcNow,
        //                     UpdatedAt = DateTime.UtcNow
        //                 };
        //                 _context.ItemOpeningStockByFiscalYear.Add(newOpeningStock);

        //                 _logger.LogInformation($"CREATED ItemOpeningStock for ItemId: {updatedItem.ItemId}, FiscalYearId: {request.TargetFiscalYearId}, Stock: {updatedItem.OpeningStock}, Value: {updatedItem.OpeningStockValue}");
        //             }
        //         }

        //         await _context.SaveChangesAsync();

        //         // ============================================================
        //         // STEP 4: Create opening balance transaction (filters out nominal)
        //         // ============================================================
        //         if (request.FinalizeTransfer)
        //         {
        //             // Get all opening balances for the target fiscal year
        //             var openingBalances = await _context.OpeningBalanceByFiscalYear
        //                 .Where(ob => ob.FiscalYearId == request.TargetFiscalYearId && ob.CompanyId == companyId)
        //                 .ToListAsync();

        //             var accountBalances = openingBalances.Select(ob => new AccountBalanceSummaryDto
        //             {
        //                 AccountId = ob.AccountId,
        //                 AccountName = _context.Accounts.Find(ob.AccountId)?.Name ?? "Unknown",
        //                 DebitAmount = ob.Type == "Dr" ? ob.Amount : 0,
        //                 CreditAmount = ob.Type == "Cr" ? ob.Amount : 0,
        //                 BalanceType = ob.Type
        //             }).ToList();

        //             // Create opening balance transaction with target fiscal year start date
        //             // This method filters out nominal accounts internally
        //             await CreateOpeningBalanceTransactionAsync(
        //                 request.TargetFiscalYearId,
        //                 companyId,
        //                 targetFiscalYearStartDate,
        //                 targetFiscalYearStartDateNepali,
        //                 accountBalances);
        //         }

        //         await transaction.CommitAsync();

        //         response.Success = true;
        //         response.Message = "Balances updated and finalized successfully";
        //         response.Data = new UpdateBalancesDataDto
        //         {
        //             SourceFiscalYearId = request.SourceFiscalYearId,
        //             TargetFiscalYearId = request.TargetFiscalYearId,
        //             CarryType = request.CarryType
        //         };

        //         _logger.LogInformation("UpdateAndFinalizeBalancesAsync completed successfully");
        //     }
        //     catch (Exception ex)
        //     {
        //         await transaction.RollbackAsync();
        //         _logger.LogError(ex, "Error updating and finalizing balances");
        //         response.Success = false;
        //         response.Errors.Add(ex.Message);
        //     }

        //     return response;
        // }

        //-------------------------------------------------end1
        public async Task<UpdateBalancesResponseDto> UpdateAndFinalizeBalancesAsync(
    UpdateBalancesRequestDto request, Guid companyId)
        {
            var response = new UpdateBalancesResponseDto();

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                _logger.LogInformation("Updating and finalizing balances for fiscal year transfer");

                // Get source and target fiscal years
                var sourceFiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.Id == request.SourceFiscalYearId && f.CompanyId == companyId);
                var targetFiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.Id == request.TargetFiscalYearId && f.CompanyId == companyId);

                if (sourceFiscalYear == null || targetFiscalYear == null)
                {
                    response.Success = false;
                    response.Message = "Fiscal year not found";
                    return response;
                }

                // ✅ Get target fiscal year start dates
                DateTime targetFiscalYearStartDate = targetFiscalYear.StartDate ?? request.TransferDate;
                string targetFiscalYearStartDateNepali = targetFiscalYear.StartDateNepali ?? request.TransferDateNepali ?? string.Empty;

                // ✅ Get source fiscal year end dates for closing balances
                DateTime sourceFiscalYearEndDate = sourceFiscalYear.EndDate ?? request.TransferDate;
                string sourceFiscalYearEndDateNepali = sourceFiscalYear.EndDateNepali ?? request.TransferDateNepali ?? string.Empty;

                // ✅ Use existing method to get item closing stocks with prices
                var itemStocks = await GetItemClosingStocksFromStockEntriesAsync(request.SourceFiscalYearId, companyId);
                decimal totalStockValue = itemStocks.Sum(i => i.ClosingStockValue);

                // ✅ Create a dictionary for quick lookup of stock prices
                var stockPriceDict = itemStocks.ToDictionary(
                    s => s.ItemId,
                    s => new { s.PurchasePrice, s.SalesPrice }
                );

                // ✅ First, ensure Stock in Hand account exists and has correct balance
                if (totalStockValue > 0)
                {
                    var stockInHandAccount = await _context.Accounts
                        .Include(a => a.AccountGroup)
                        .FirstOrDefaultAsync(a => a.CompanyId == companyId &&
                                                 a.AccountGroup != null &&
                                                 a.AccountGroup.Name == "Stock in Hand" &&
                                                 a.IsActive);

                    if (stockInHandAccount == null)
                    {
                        // Create Stock in Hand account if it doesn't exist
                        var stockInHandGroup = await _context.AccountGroups
                            .FirstOrDefaultAsync(g => g.Name == "Stock in Hand" && g.CompanyId == companyId);

                        if (stockInHandGroup != null)
                        {
                            stockInHandAccount = new Account
                            {
                                Id = Guid.NewGuid(),
                                Name = "Stock in Hand",
                                AccountGroupsId = stockInHandGroup.Id,
                                CompanyId = companyId,
                                OriginalFiscalYearId = sourceFiscalYear.Id,
                                OpeningBalanceType = "Dr",
                                IsActive = true,
                                Date = targetFiscalYearStartDate,
                                NepaliDate = targetFiscalYearStartDateNepali,
                                CreatedAt = DateTime.UtcNow,
                                UpdatedAt = DateTime.UtcNow
                            };
                            _context.Accounts.Add(stockInHandAccount);
                            await _context.SaveChangesAsync();
                        }
                    }

                    if (stockInHandAccount != null)
                    {
                        // ✅ Add or update Stock in Hand in the updated accounts list
                        var stockInHandUpdated = request.UpdatedAccounts
                            .FirstOrDefault(a => a.AccountId == stockInHandAccount.Id);

                        if (stockInHandUpdated == null)
                        {
                            request.UpdatedAccounts.Add(new UpdatedAccountBalanceDto
                            {
                                AccountId = stockInHandAccount.Id,
                                NewBalance = totalStockValue,
                                BalanceType = "Dr",
                                IsSelected = true
                            });
                        }
                        else
                        {
                            stockInHandUpdated.NewBalance = totalStockValue;
                            stockInHandUpdated.BalanceType = "Dr";
                            stockInHandUpdated.IsSelected = true;
                        }
                    }
                }

                // ============================================================
                // STEP 1: Get closing balances (INCLUDING nominal accounts)
                // ============================================================
                var closingBalances = await GetAccountClosingBalancesFromTransactionsAsync(request.SourceFiscalYearId, companyId);

                // ✅ Add Stock in Hand account balance with total stock value to closing balances
                if (totalStockValue > 0)
                {
                    var stockInHandAccount = await _context.Accounts
                        .Include(a => a.AccountGroup)
                        .FirstOrDefaultAsync(a => a.CompanyId == companyId &&
                                                 a.AccountGroup != null &&
                                                 a.AccountGroup.Name == "Stock in Hand" &&
                                                 a.IsActive);

                    if (stockInHandAccount != null)
                    {
                        var existingStockInHand = closingBalances.FirstOrDefault(b => b.AccountId == stockInHandAccount.Id);
                        if (existingStockInHand != null)
                        {
                            existingStockInHand.DebitAmount = totalStockValue;
                            existingStockInHand.CreditAmount = 0;
                            existingStockInHand.BalanceType = "Dr";
                        }
                        else
                        {
                            closingBalances.Add(new AccountBalanceSummaryDto
                            {
                                AccountId = stockInHandAccount.Id,
                                AccountName = stockInHandAccount.Name,
                                AccountGroupName = "Stock in Hand",
                                DebitAmount = totalStockValue,
                                CreditAmount = 0,
                                BalanceType = "Dr"
                            });
                        }
                    }
                }

                // ✅ Calculate Profit & Loss BEFORE modifying balances
                var netProfitLoss = await CalculateProfitAndLossAsync(
                    request.SourceFiscalYearId,
                    companyId,
                    closingBalances);

                _logger.LogInformation($"Net Profit/Loss calculated: {netProfitLoss}");

                // ✅ Transfer Profit/Loss to Reserve & Surplus account
                if (netProfitLoss != 0)
                {
                    // Find Reserve & Surplus account
                    var reserveAccount = await _context.Accounts
                        .Include(a => a.AccountGroup)
                        .FirstOrDefaultAsync(a => a.CompanyId == companyId &&
                                                 a.AccountGroup != null &&
                                                 a.AccountGroup.Name == "Reserves & Surplus" &&
                                                 a.IsActive);

                    if (reserveAccount == null)
                    {
                        _logger.LogWarning("Reserve & Surplus account not found. Skipping P&L transfer.");
                    }
                    else
                    {
                        var existingReserve = closingBalances.FirstOrDefault(b => b.AccountId == reserveAccount.Id);

                        if (existingReserve != null)
                        {
                            // Update Reserve & Surplus with P&L amount
                            if (netProfitLoss > 0)
                            {
                                existingReserve.CreditAmount += netProfitLoss;
                            }
                            else
                            {
                                existingReserve.DebitAmount += Math.Abs(netProfitLoss);
                            }
                            existingReserve.BalanceType = existingReserve.CreditAmount >= existingReserve.DebitAmount ? "Cr" : "Dr";
                            _logger.LogInformation($"Updated Reserve & Surplus with P&L: {netProfitLoss}");
                        }
                        else
                        {
                            closingBalances.Add(new AccountBalanceSummaryDto
                            {
                                AccountId = reserveAccount.Id,
                                AccountName = reserveAccount.Name,
                                AccountGroupName = "Reserves & Surplus",
                                DebitAmount = netProfitLoss < 0 ? Math.Abs(netProfitLoss) : 0,
                                CreditAmount = netProfitLoss > 0 ? netProfitLoss : 0,
                                BalanceType = netProfitLoss > 0 ? "Cr" : "Dr"
                            });
                            _logger.LogInformation($"Added Reserve & Surplus with P&L: {netProfitLoss}");
                        }
                    }
                }

                // ✅ Add Profit & Loss to closing balances (this will set P&L to ZERO after transfer)
                await AddProfitAndLossToClosingBalancesAsync(
                    request.SourceFiscalYearId,
                    companyId,
                    closingBalances);

                // ============================================================
                // STEP 2: Save closing balances (ALL accounts including nominal)
                // ============================================================
                await SaveClosingBalancesForSourceFiscalYearAsync(
                    request.SourceFiscalYearId,
                    companyId,
                    sourceFiscalYearEndDate,
                    sourceFiscalYearEndDateNepali,
                    closingBalances);

                // ============================================================
                // STEP 3: Update opening balances (filter out nominal accounts)
                // ============================================================

                // Update account balances with target fiscal year start dates
                foreach (var updatedAccount in request.UpdatedAccounts)
                {
                    if (!updatedAccount.IsSelected) continue;

                    // Skip nominal accounts from opening balance
                    var account = await _context.Accounts
                        .Include(a => a.AccountGroup)
                        .FirstOrDefaultAsync(a => a.Id == updatedAccount.AccountId && a.CompanyId == companyId);

                    if (account != null)
                    {
                        var accountGroupName = account.AccountGroup?.Name ?? string.Empty;
                        // Skip nominal accounts (they start with zero balance)
                        if (_nominalAccountGroups.Contains(accountGroupName))
                        {
                            _logger.LogInformation($"Skipping nominal account for opening balance: {account.Name} (Group: {accountGroupName})");
                            continue;
                        }
                    }

                    var existingOpeningBalance = await _context.OpeningBalanceByFiscalYear
                        .FirstOrDefaultAsync(ob => ob.AccountId == updatedAccount.AccountId
                            && ob.FiscalYearId == request.TargetFiscalYearId);

                    if (existingOpeningBalance != null)
                    {
                        existingOpeningBalance.Amount = updatedAccount.NewBalance;
                        existingOpeningBalance.Type = updatedAccount.BalanceType;
                        existingOpeningBalance.Date = targetFiscalYearStartDate;
                        existingOpeningBalance.NepaliDate = targetFiscalYearStartDateNepali;

                        _logger.LogInformation($"UPDATED OpeningBalanceByFiscalYear for AccountId: {updatedAccount.AccountId}, FiscalYearId: {request.TargetFiscalYearId}, Amount: {updatedAccount.NewBalance}");
                    }
                    else
                    {
                        var newOpeningBalance = new OpeningBalanceByFiscalYear
                        {
                            Id = Guid.NewGuid(),
                            AccountId = updatedAccount.AccountId,
                            FiscalYearId = request.TargetFiscalYearId,
                            CompanyId = companyId,
                            Amount = updatedAccount.NewBalance,
                            Type = updatedAccount.BalanceType,
                            Date = targetFiscalYearStartDate,
                            NepaliDate = targetFiscalYearStartDateNepali
                        };
                        _context.OpeningBalanceByFiscalYear.Add(newOpeningBalance);

                        _logger.LogInformation($"CREATED OpeningBalanceByFiscalYear for AccountId: {updatedAccount.AccountId}, FiscalYearId: {request.TargetFiscalYearId}, Amount: {updatedAccount.NewBalance}");
                    }

                    // Update master opening balance
                    var masterOpeningBalance = await _context.OpeningBalances
                        .FirstOrDefaultAsync(ob => ob.AccountId == updatedAccount.AccountId
                            && ob.CompanyId == companyId);

                    if (masterOpeningBalance != null)
                    {
                        masterOpeningBalance.Amount = updatedAccount.NewBalance;
                        masterOpeningBalance.Type = updatedAccount.BalanceType;
                        masterOpeningBalance.Date = targetFiscalYearStartDate;
                        masterOpeningBalance.NepaliDate = targetFiscalYearStartDateNepali;
                        masterOpeningBalance.FiscalYearId = null;
                    }
                    else
                    {
                        var newMaster = new OpeningBalance
                        {
                            Id = Guid.NewGuid(),
                            AccountId = updatedAccount.AccountId,
                            CompanyId = companyId,
                            Amount = updatedAccount.NewBalance,
                            Type = updatedAccount.BalanceType,
                            Date = targetFiscalYearStartDate,
                            NepaliDate = targetFiscalYearStartDateNepali,
                            FiscalYearId = null
                        };
                        _context.OpeningBalances.Add(newMaster);
                    }
                }

                // ✅ Update item opening stocks with target fiscal year start dates
                foreach (var updatedItem in request.UpdatedItems)
                {
                    if (!updatedItem.IsSelected) continue;

                    // ✅ Get the prices from the stock price dictionary
                    decimal purchasePrice = updatedItem.PurchasePrice ?? 0;
                    decimal salesPrice = updatedItem.SalesPrice ?? 0;

                    if (purchasePrice == 0 && stockPriceDict.TryGetValue(updatedItem.ItemId, out var prices))
                    {
                        purchasePrice = prices.PurchasePrice;
                        salesPrice = prices.SalesPrice;
                    }

                    if (purchasePrice == 0)
                    {
                        var sourceItem = await _context.Items
                            .FirstOrDefaultAsync(i => i.Id == updatedItem.ItemId && i.CompanyId == companyId);
                        if (sourceItem != null)
                        {
                            purchasePrice = sourceItem.PuPrice ?? 0;
                            salesPrice = sourceItem.Price ?? 0;
                        }
                    }

                    var existingOpeningStock = await _context.ItemOpeningStockByFiscalYear
                        .FirstOrDefaultAsync(os => os.ItemId == updatedItem.ItemId
                            && os.FiscalYearId == request.TargetFiscalYearId);

                    if (existingOpeningStock != null)
                    {
                        // ✅ Update existing opening stock with ALL fields
                        existingOpeningStock.OpeningStock = updatedItem.OpeningStock;
                        existingOpeningStock.OpeningStockValue = updatedItem.OpeningStockValue;
                        existingOpeningStock.PurchasePrice = purchasePrice;
                        existingOpeningStock.SalesPrice = salesPrice;
                        existingOpeningStock.Date = targetFiscalYearStartDate;
                        existingOpeningStock.NepaliDate = targetFiscalYearStartDateNepali;
                        existingOpeningStock.UpdatedAt = DateTime.UtcNow;

                        _logger.LogInformation($"UPDATED ItemOpeningStock for ItemId: {updatedItem.ItemId}, FiscalYearId: {request.TargetFiscalYearId}, Stock: {updatedItem.OpeningStock}, Value: {updatedItem.OpeningStockValue}");
                    }
                    else
                    {
                        // ✅ Create new opening stock with ALL fields
                        var newOpeningStock = new ItemOpeningStockByFiscalYear
                        {
                            Id = Guid.NewGuid(),
                            ItemId = updatedItem.ItemId,
                            FiscalYearId = request.TargetFiscalYearId,
                            CompanyId = companyId,
                            OpeningStock = updatedItem.OpeningStock,
                            OpeningStockValue = updatedItem.OpeningStockValue,
                            PurchasePrice = purchasePrice,
                            SalesPrice = salesPrice,
                            Date = targetFiscalYearStartDate,
                            NepaliDate = targetFiscalYearStartDateNepali,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        _context.ItemOpeningStockByFiscalYear.Add(newOpeningStock);

                        _logger.LogInformation($"CREATED ItemOpeningStock for ItemId: {updatedItem.ItemId}, FiscalYearId: {request.TargetFiscalYearId}, Stock: {updatedItem.OpeningStock}, Value: {updatedItem.OpeningStockValue}");
                    }
                }

                await _context.SaveChangesAsync();

                // ============================================================
                // STEP 4: Create opening balance transaction (filters out nominal)
                // ============================================================
                if (request.FinalizeTransfer)
                {
                    // Get all opening balances for the target fiscal year
                    var openingBalances = await _context.OpeningBalanceByFiscalYear
                        .Where(ob => ob.FiscalYearId == request.TargetFiscalYearId && ob.CompanyId == companyId)
                        .ToListAsync();

                    var accountBalances = openingBalances.Select(ob => new AccountBalanceSummaryDto
                    {
                        AccountId = ob.AccountId,
                        AccountName = _context.Accounts.Find(ob.AccountId)?.Name ?? "Unknown",
                        DebitAmount = ob.Type == "Dr" ? ob.Amount : 0,
                        CreditAmount = ob.Type == "Cr" ? ob.Amount : 0,
                        BalanceType = ob.Type
                    }).ToList();

                    // Create opening balance transaction with target fiscal year start date
                    // This method filters out nominal accounts internally
                    await CreateOpeningBalanceTransactionAsync(
                        request.TargetFiscalYearId,
                        companyId,
                        targetFiscalYearStartDate,
                        targetFiscalYearStartDateNepali,
                        accountBalances);
                }

                await transaction.CommitAsync();

                response.Success = true;
                response.Message = "Balances updated and finalized successfully";
                response.Data = new UpdateBalancesDataDto
                {
                    SourceFiscalYearId = request.SourceFiscalYearId,
                    TargetFiscalYearId = request.TargetFiscalYearId,
                    CarryType = request.CarryType
                };

                _logger.LogInformation("UpdateAndFinalizeBalancesAsync completed successfully");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error updating and finalizing balances");
                response.Success = false;
                response.Errors.Add(ex.Message);
            }

            return response;
        }

        private async Task<decimal> CalculateOpeningStockForFiscalYearFromTransactions(
            Guid itemId,
            Guid fiscalYearId,
            Guid companyId)
        {
            // ✅ Get the fiscal year
            var fiscalYear = await _context.FiscalYears
                .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);

            if (fiscalYear == null || !fiscalYear.StartDate.HasValue)
            {
                return 0;
            }

            // ✅ Get all stock movements BEFORE the fiscal year start date
            var movements = await GetStockMovementsFromTransactionItems(
                itemId,
                companyId,
                null, // fromDate
                fiscalYear.StartDate.Value.AddDays(-1) // toDate (day before fiscal year starts)
            );

            // ✅ Calculate opening stock = sum of all purchases - sum of all sales (up to day before fiscal year)
            decimal openingStock = 0;
            foreach (var movement in movements)
            {
                if (movement.IsPurchase || movement.IsPurchaseReturn)
                {
                    // Purchases increase stock
                    openingStock += movement.Quantity;
                }
                else if (movement.IsSales || movement.IsSalesReturn)
                {
                    // Sales decrease stock
                    openingStock -= movement.Quantity;
                }
                else if (movement.IsStockAdjustment)
                {
                    // Stock adjustment - depends on the adjustment type
                    // You'll need to check the adjustment type from the transaction
                    openingStock += movement.Quantity; // Adjust as needed
                }
            }

            return openingStock;
        }

        private async Task<(decimal ClosingStock, decimal ClosingValue, decimal AvgPurchasePrice, decimal AvgSalesPrice)>
    CalculateClosingStockForFiscalYearFromTransactions(
    Guid itemId,
    Guid fiscalYearId,
    Guid companyId)
        {
            // ✅ Get the fiscal year
            var fiscalYear = await _context.FiscalYears
                .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);

            if (fiscalYear == null || !fiscalYear.StartDate.HasValue || !fiscalYear.EndDate.HasValue)
            {
                return (0, 0, 0, 0);
            }

            // ✅ Get opening stock (stock before fiscal year start)
            var openingStock = await CalculateOpeningStockForFiscalYearFromTransactions(
                itemId, fiscalYearId, companyId);

            // ✅ Get stock movements WITHIN the fiscal year
            var movements = await GetStockMovementsFromTransactionItems(
                itemId,
                companyId,
                fiscalYear.StartDate.Value,
                fiscalYear.EndDate.Value
            );

            decimal closingStock = openingStock;
            decimal totalPurchaseQuantity = 0;
            decimal totalPurchaseValue = 0;
            decimal totalSalesValue = 0;

            foreach (var movement in movements)
            {
                if (movement.IsPurchase)
                {
                    closingStock += movement.Quantity;
                    totalPurchaseQuantity += movement.Quantity;
                    totalPurchaseValue += movement.Quantity * movement.PuPrice;
                }
                else if (movement.IsSales)
                {
                    closingStock -= movement.Quantity;
                    totalSalesValue += movement.Quantity * movement.Price;
                }
                else if (movement.IsPurchaseReturn)
                {
                    closingStock -= movement.Quantity; // Return reduces stock
                    totalPurchaseQuantity -= movement.Quantity;
                    totalPurchaseValue -= movement.Quantity * movement.PuPrice;
                }
                else if (movement.IsSalesReturn)
                {
                    closingStock += movement.Quantity; // Sales return increases stock
                }
                else if (movement.IsStockAdjustment)
                {
                    closingStock += movement.Quantity; // Adjust based on type
                }
            }

            // ✅ Calculate average prices
            decimal avgPurchasePrice = totalPurchaseQuantity > 0
                ? totalPurchaseValue / totalPurchaseQuantity
                : 0;

            decimal avgSalesPrice = movements.Count(m => m.IsSales) > 0
                ? totalSalesValue / movements.Where(m => m.IsSales).Sum(m => m.Quantity)
                : 0;

            decimal closingValue = closingStock * avgPurchasePrice;

            return (closingStock, closingValue, avgPurchasePrice, avgSalesPrice);
        }

        private async Task<ItemTransferSummaryDto> CalculateAndSaveClosingStockForSourceFiscalYearFromTransactionsAsync(
            Guid sourceFiscalYearId,
            Guid companyId,
            DateTime sourceFiscalYearEndDate,
            string sourceFiscalYearEndDateNepali,
            DateTime sourceFiscalYearStartDate,
            string sourceFiscalYearStartDateNepali)
        {
            var summary = new ItemTransferSummaryDto();

            try
            {
                var fiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.Id == sourceFiscalYearId && f.CompanyId == companyId);

                if (fiscalYear == null)
                {
                    return summary;
                }

                // ✅ Get all active items that existed in this fiscal year
                var items = await _context.Items
                    .Where(i => i.CompanyId == companyId &&
                                i.Status == "active" &&
                                (i.OriginalFiscalYearId == null || i.OriginalFiscalYearId <= sourceFiscalYearId) &&
                                i.Date <= (fiscalYear.EndDate ?? DateTime.UtcNow))
                    .ToListAsync();

                summary.ItemsProcessed = items.Count;

                var existingClosingStocks = await _context.ItemClosingStockByFiscalYear
                    .Where(cs => cs.FiscalYearId == sourceFiscalYearId)
                    .ToDictionaryAsync(cs => cs.ItemId, cs => cs);

                int itemsWithStockCount = 0;
                decimal totalClosingStockQuantity = 0;
                decimal totalClosingStockValue = 0;

                foreach (var item in items)
                {
                    try
                    {
                        // ✅ Calculate closing stock from TransactionItems (immutable)
                        var result = await CalculateClosingStockForFiscalYearFromTransactions(
                            item.Id, sourceFiscalYearId, companyId);

                        if (result.ClosingStock > 0)
                        {
                            itemsWithStockCount++;
                            totalClosingStockQuantity += result.ClosingStock;
                            totalClosingStockValue += result.ClosingValue;
                        }

                        // ✅ Save to ItemClosingStockByFiscalYear
                        if (existingClosingStocks.TryGetValue(item.Id, out var existingRecord))
                        {
                            existingRecord.ClosingStock = result.ClosingStock;
                            existingRecord.ClosingStockValue = result.ClosingValue;
                            existingRecord.PurchasePrice = result.AvgPurchasePrice;
                            existingRecord.SalesPrice = result.AvgSalesPrice;
                            existingRecord.Date = sourceFiscalYearEndDate;
                            existingRecord.NepaliDate = sourceFiscalYearEndDateNepali;
                            existingRecord.UpdatedAt = DateTime.UtcNow;
                        }
                        else if (result.ClosingStock > 0)
                        {
                            var closingStock = new ItemClosingStockByFiscalYear
                            {
                                Id = Guid.NewGuid(),
                                ItemId = item.Id,
                                FiscalYearId = sourceFiscalYearId,
                                CompanyId = companyId,
                                ClosingStock = result.ClosingStock,
                                ClosingStockValue = result.ClosingValue,
                                PurchasePrice = result.AvgPurchasePrice,
                                SalesPrice = result.AvgSalesPrice,
                                Date = sourceFiscalYearEndDate,
                                NepaliDate = sourceFiscalYearEndDateNepali,
                                CreatedAt = DateTime.UtcNow,
                                UpdatedAt = DateTime.UtcNow
                            };
                            _context.ItemClosingStockByFiscalYear.Add(closingStock);
                        }

                        // ✅ Add to summary
                        summary.ItemDetails.Add(new ItemStockSummaryDto
                        {
                            ItemId = item.Id,
                            ItemName = item.Name,
                            ClosingQuantity = result.ClosingStock,
                            ClosingValue = result.ClosingValue,
                            AverageRate = result.AvgPurchasePrice
                        });
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"Error processing item {item.Id} ({item.Name})");
                    }
                }

                summary.ItemsWithStock = itemsWithStockCount;
                summary.TotalClosingStockQuantity = totalClosingStockQuantity;
                summary.TotalClosingStockValue = totalClosingStockValue;

                await _context.SaveChangesAsync();

                _logger.LogInformation($"Completed closing stock calculation for fiscal year {fiscalYear.Name}. " +
                                      $"Processed {items.Count} items, {itemsWithStockCount} items with stock. " +
                                      $"Total stock: {totalClosingStockQuantity} units, Value: {totalClosingStockValue}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error calculating closing stock for fiscal year {sourceFiscalYearId}");
                throw;
            }

            return summary;
        }

        private async Task CreateOpeningStockForTargetFiscalYearFromTransactionsAsync(
            Guid sourceFiscalYearId,
            Guid targetFiscalYearId,
            Guid companyId,
            DateTime targetFiscalYearStartDate,
            string targetFiscalYearStartDateNepali)
        {
            // ✅ Get closing stocks from source fiscal year
            var closingStocks = await _context.ItemClosingStockByFiscalYear
                .Where(cs => cs.FiscalYearId == sourceFiscalYearId)
                .ToListAsync();

            var existingOpeningStocks = await _context.ItemOpeningStockByFiscalYear
                .Where(os => os.FiscalYearId == targetFiscalYearId)
                .ToDictionaryAsync(os => os.ItemId, os => os);

            foreach (var closingStock in closingStocks)
            {
                if (existingOpeningStocks.TryGetValue(closingStock.ItemId, out var existingRecord))
                {
                    existingRecord.OpeningStock = closingStock.ClosingStock;
                    existingRecord.OpeningStockValue = closingStock.ClosingStockValue;
                    existingRecord.PurchasePrice = closingStock.PurchasePrice;
                    existingRecord.SalesPrice = closingStock.SalesPrice;
                    existingRecord.Date = targetFiscalYearStartDate;
                    existingRecord.NepaliDate = targetFiscalYearStartDateNepali;
                    existingRecord.UpdatedAt = DateTime.UtcNow;
                }
                else if (closingStock.ClosingStock > 0)
                {
                    var openingStock = new ItemOpeningStockByFiscalYear
                    {
                        Id = Guid.NewGuid(),
                        ItemId = closingStock.ItemId,
                        FiscalYearId = targetFiscalYearId,
                        CompanyId = companyId,
                        OpeningStock = closingStock.ClosingStock,
                        OpeningStockValue = closingStock.ClosingStockValue,
                        PurchasePrice = closingStock.PurchasePrice,
                        SalesPrice = closingStock.SalesPrice,
                        Date = targetFiscalYearStartDate,
                        NepaliDate = targetFiscalYearStartDateNepali,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.ItemOpeningStockByFiscalYear.Add(openingStock);
                }
            }

            await _context.SaveChangesAsync();
        }

        private async Task<List<StockMovementDto>> GetStockMovementsFromTransactionItems(
    Guid itemId,
    Guid companyId,
    DateTime? fromDate = null,
    DateTime? toDate = null)
        {
            // ✅ Query TransactionItems with their Transactions
            var query = _context.TransactionItems
                .Include(ti => ti.Transaction)
                .Where(ti => ti.ItemId == itemId &&
                             ti.Transaction.CompanyId == companyId &&
                             ti.Transaction.Status == TransactionStatus.Active &&
                             (ti.Transaction.Type == TransactionType.Purc ||
                              ti.Transaction.Type == TransactionType.PrRt ||
                              ti.Transaction.Type == TransactionType.Sale ||
                              ti.Transaction.Type == TransactionType.SlRt ||
                              ti.Transaction.Type == TransactionType.StockAdjustment));

            if (fromDate.HasValue)
            {
                query = query.Where(ti => ti.Transaction.Date >= fromDate.Value);
            }
            if (toDate.HasValue)
            {
                query = query.Where(ti => ti.Transaction.Date <= toDate.Value);
            }

            var results = await query
                .OrderBy(ti => ti.Transaction.Date)
                .Select(ti => new StockMovementDto
                {
                    TransactionId = ti.TransactionId,
                    TransactionType = ti.Transaction.Type,
                    TransactionDate = ti.Transaction.Date,
                    BillNumber = ti.Transaction.BillNumber,
                    Quantity = ti.Quantity ?? 0,
                    PuPrice = ti.PuPrice ?? 0,
                    Price = ti.Price,
                    IsPurchase = ti.Transaction.Type == TransactionType.Purc,
                    IsSales = ti.Transaction.Type == TransactionType.Sale,
                    IsPurchaseReturn = ti.Transaction.Type == TransactionType.PrRt,
                    IsSalesReturn = ti.Transaction.Type == TransactionType.SlRt,
                    IsStockAdjustment = ti.Transaction.Type == TransactionType.StockAdjustment,
                    Debit = ti.Debit,
                    Credit = ti.Credit
                })
                .ToListAsync();

            return results;
        }

        public class StockMovementDto
        {
            public Guid TransactionId { get; set; }
            public TransactionType TransactionType { get; set; }
            public DateTime TransactionDate { get; set; }
            public string? BillNumber { get; set; }
            public decimal Quantity { get; set; }
            public decimal PuPrice { get; set; }
            public decimal Price { get; set; }
            public bool IsPurchase { get; set; }
            public bool IsSales { get; set; }
            public bool IsPurchaseReturn { get; set; }
            public bool IsSalesReturn { get; set; }
            public bool IsStockAdjustment { get; set; }
            public decimal Debit { get; set; }
            public decimal Credit { get; set; }
        }
    }
}

