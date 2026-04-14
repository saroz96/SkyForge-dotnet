using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto.AccountDto;
using SkyForge.Models.AccountGroupModel;
using SkyForge.Models.AccountModel;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.Retailer.TransactionModel;
using SkyForge.Models.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SkyForge.Services.AccountServices
{
    public class AccountBalanceService : IAccountBalanceService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<AccountBalanceService> _logger;

        public AccountBalanceService(ApplicationDbContext context, ILogger<AccountBalanceService> logger)
        {
            _context = context;
            _logger = logger;
        }

        // Method 1: CalculateAccountBalanceAsync (Simpler version)
        public async Task<AccountBalanceDataDTO> CalculateAccountBalanceAsync(Guid accountId, Guid companyId, Guid fiscalYearId)
        {
            try
            {
                // Get account with opening balances
                var account = await _context.Accounts
                    .Include(a => a.OpeningBalanceByFiscalYear)
                    .FirstOrDefaultAsync(a => a.Id == accountId && a.CompanyId == companyId);

                if (account == null)
                {
                    return new AccountBalanceDataDTO { Balance = 0, BalanceType = "Dr", RawBalance = 0 };
                }

                // Get opening balance for the fiscal year
                var openingBalance = account.OpeningBalanceByFiscalYear
                    .FirstOrDefault(ob => ob.FiscalYearId == fiscalYearId);

                decimal openingBalanceAmount = openingBalance?.Amount ?? 0;
                string openingBalanceType = openingBalance?.Type ?? "Dr";

                // Calculate transactions for this account in the fiscal year
                var fiscalYear = await _context.FiscalYears.FindAsync(fiscalYearId);
                if (fiscalYear == null)
                {
                    return new AccountBalanceDataDTO
                    {
                        Balance = openingBalanceAmount,
                        BalanceType = openingBalanceType,
                        RawBalance = openingBalanceAmount
                    };
                }

                // Get transactions for this account in the fiscal year
                var transactions = await _context.Transactions
                    .Where(t => t.AccountId == accountId &&
                               t.FiscalYearId == fiscalYearId &&
                               t.CompanyId == companyId &&
                               t.IsActive &&
                               t.Status == TransactionStatus.Active &&
                               t.PaymentMode != PaymentMode.Cash)
                    .ToListAsync();

                // Calculate net debit/credit
                decimal totalDebit = transactions.Sum(t => t.TotalDebit);
                decimal totalCredit = transactions.Sum(t => t.TotalCredit);

                // Calculate balance
                decimal netTransactionBalance = totalDebit - totalCredit;

                // For Dr opening balance: Opening + Debit - Credit
                // For Cr opening balance: Opening + Credit - Debit
                decimal rawBalance;
                if (openingBalanceType == "Dr")
                {
                    rawBalance = openingBalanceAmount + netTransactionBalance;
                }
                else
                {
                    rawBalance = openingBalanceAmount - netTransactionBalance;
                }

                // Determine balance type
                string balanceType = rawBalance >= 0 ? "Dr" : "Cr";
                decimal balance = Math.Abs(rawBalance);

                return new AccountBalanceDataDTO
                {
                    Balance = balance,
                    BalanceType = balanceType,
                    RawBalance = rawBalance
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating account balance");
                return new AccountBalanceDataDTO { Balance = 0, BalanceType = "Dr", RawBalance = 0 };
            }
        }

        // Method 2: GetAccountBalanceAsync (More comprehensive version similar to your Node.js code)
        public async Task<AccountBalanceResponseDTO> GetAccountBalanceAsync(Guid accountId, Guid companyId, Guid fiscalYearId)
        {
            try
            {
                _logger.LogInformation("GetAccountBalanceAsync called for Account: {AccountId}, Company: {CompanyId}, FiscalYear: {FiscalYearId}",
                    accountId, companyId, fiscalYearId);

                // Fetch the account details
                var account = await _context.Accounts
                    .Include(a => a.InitialOpeningBalance)
                    .Include(a => a.OpeningBalance)
                    .FirstOrDefaultAsync(a => a.Id == accountId &&
                                              a.CompanyId == companyId &&
                                              a.IsActive &&
                                              (a.OriginalFiscalYearId == fiscalYearId || a.OriginalFiscalYearId == null));

                if (account == null)
                {
                    return new AccountBalanceResponseDTO
                    {
                        Success = false,
                        Error = "Account not found for the current fiscal year"
                    };
                }

                // Calculate opening balance
                decimal openingBalance = 0;
                if (account.InitialOpeningBalance != null)
                {
                    openingBalance = account.InitialOpeningBalance.Type == "Dr"
                        ? account.InitialOpeningBalance.Amount
                        : -account.InitialOpeningBalance.Amount;
                }
                else if (account.OpeningBalance != null)
                {
                    openingBalance = account.OpeningBalance.Type == "Dr"
                        ? account.OpeningBalance.Amount
                        : -account.OpeningBalance.Amount;
                }

                // Query all transactions for this account (handles all transaction types)
                var allTransactions = await _context.Transactions
                    .Where(t => t.CompanyId == companyId &&
                                t.FiscalYearId == fiscalYearId &&
                                t.IsActive &&
                                t.Status == TransactionStatus.Active &&
                                t.PaymentMode != PaymentMode.Cash &&
                                (t.AccountId == accountId ||
                                 t.PaymentAccountId == accountId ||
                                 t.ReceiptAccountId == accountId ||
                                 t.DebitAccountId == accountId ||
                                 t.CreditAccountId == accountId))
                    .OrderBy(t => t.Date)
                    .ThenBy(t => t.CreatedAt)
                    .ToListAsync();

                // Calculate running balance
                decimal balance = openingBalance;
                var processedTransactions = new HashSet<string>();

                foreach (var tx in allTransactions)
                {
                    // Create a unique identifier for this transaction to avoid duplicates
                    var txIdentifier = $"{tx.Date:yyyy-MM-dd}-{tx.Type}-{tx.BillNumber}-{tx.TotalDebit}-{tx.TotalCredit}";

                    if (!processedTransactions.Contains(txIdentifier))
                    {
                        processedTransactions.Add(txIdentifier);

                        // Determine if this transaction affects the selected account as debit or credit
                        decimal amount = 0;

                        if (tx.AccountId == accountId)
                        {
                            // Standard transaction - Account is directly affected
                            amount = tx.TotalDebit - tx.TotalCredit;
                        }
                        else if (tx.PaymentAccountId == accountId)
                        {
                            // Payment transaction - Payment account is credited (negative effect)
                            amount = -tx.TotalDebit;
                        }
                        else if (tx.ReceiptAccountId == accountId)
                        {
                            // Receipt transaction - Receipt account is debited (positive effect)
                            amount = tx.TotalCredit;
                        }
                        else if (tx.DebitAccountId == accountId)
                        {
                            // Journal debit entry
                            amount = tx.TotalDebit;
                        }
                        else if (tx.CreditAccountId == accountId)
                        {
                            // Journal credit entry
                            amount = -tx.TotalCredit;
                        }

                        balance += amount;
                    }
                }

                // Determine balance type
                string balanceType = balance >= 0 ? "Dr" : "Cr";
                decimal absoluteBalance = Math.Abs(balance);

                return new AccountBalanceResponseDTO
                {
                    Success = true,
                    Data = new AccountBalanceDataDTO
                    {
                        Balance = absoluteBalance,
                        BalanceType = balanceType,
                        RawBalance = balance
                    }
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating account balance for Account: {AccountId}", accountId);
                return new AccountBalanceResponseDTO
                {
                    Success = false,
                    Error = "Internal server error",
                    Message = ex.Message
                };
            }
        }
    }
}