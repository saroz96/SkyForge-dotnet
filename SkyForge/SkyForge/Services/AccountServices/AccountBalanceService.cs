using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Models.AccountGroupModel;
using SkyForge.Models.AccountModel;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SkyForge.Services.AccountServices
{
    public interface IAccountBalanceService
{
    Task<AccountBalanceDTO> CalculateAccountBalanceAsync(Guid accountId, Guid companyId, Guid fiscalYearId);
}

public class AccountBalanceService : IAccountBalanceService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AccountBalanceService> _logger;

    public AccountBalanceService(ApplicationDbContext context, ILogger<AccountBalanceService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<AccountBalanceDTO> CalculateAccountBalanceAsync(Guid accountId, Guid companyId, Guid fiscalYearId)
    {
        try
        {
            // Get account with opening balances
            var account = await _context.Accounts
                .Include(a => a.OpeningBalanceByFiscalYear)
                .FirstOrDefaultAsync(a => a.Id == accountId && a.CompanyId == companyId);

            if (account == null)
            {
                return new AccountBalanceDTO { Balance = 0, BalanceType = "Dr", RawBalance = 0 };
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
                return new AccountBalanceDTO 
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
                           t.CompanyId == companyId)
                .ToListAsync();

            // Calculate net debit/credit
            decimal totalDebit = transactions.Sum(t => t.Debit);
            decimal totalCredit = transactions.Sum(t => t.Credit);

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

            return new AccountBalanceDTO
            {
                Balance = balance,
                BalanceType = balanceType,
                RawBalance = rawBalance
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating account balance");
            return new AccountBalanceDTO { Balance = 0, BalanceType = "Dr", RawBalance = 0 };
        }
    }
}
}

public class AccountBalanceDTO
{
    public decimal Balance { get; set; }
    public string BalanceType { get; set; } = string.Empty;
    public decimal RawBalance { get; set; }
}