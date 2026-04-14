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
    public class AccountService : IAccountService
    {
        private readonly ApplicationDbContext _context;
        private readonly Random _random;
        private readonly ILogger<AccountService> _logger;

        public AccountService(ApplicationDbContext context, ILogger<AccountService> logger)
        {
            _context = context;
            _logger = logger;
            _random = new Random();
        }

        public async Task<int> GenerateUniqueAccountNumberAsync()
        {
            try
            {
                int uniqueNumber;
                bool isUnique;

                do
                {
                    // Generate random 4-digit number (1000-9999)
                    uniqueNumber = _random.Next(1000, 10000);

                    // Check if number already exists
                    isUnique = !await _context.Accounts
                        .AnyAsync(a => a.UniqueNumber == uniqueNumber);

                } while (!isUnique);

                _logger.LogDebug("Generated unique account number: {UniqueNumber}", uniqueNumber);
                return uniqueNumber;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating unique account number");
                throw;
            }
        }


        public async Task<Account> GetAccountByIdAsync(Guid id)
        {
            try
            {
                var account = await _context.Accounts
                    .Include(a => a.Company)
                    .Include(a => a.AccountGroup)
                    .Include(a => a.FiscalYears)
                    .FirstOrDefaultAsync(a => a.Id == id);

                if (account == null)
                {
                    _logger.LogWarning("Account {AccountId} not found", id);
                }

                return account;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting account {AccountId}", id);
                throw;
            }
        }

        public async Task<List<Account>> GetAccountsByCompanyAsync(Guid companyId)
        {
            try
            {
                var accounts = await _context.Accounts
                    .Where(a => a.CompanyId == companyId)
                    .Include(a => a.AccountGroup)
                    .Include(a => a.FiscalYears)
                    .OrderBy(a => a.Name)
                    .ToListAsync();

                _logger.LogInformation("Retrieved {Count} accounts for company {CompanyId}", accounts.Count, companyId);
                return accounts;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting accounts for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<List<Account>> GetAccountsByCompanyGroupAsync(Guid companyId, Guid accountGroupsId)
        {
            try
            {
                var accounts = await _context.Accounts
                    .Where(a => a.CompanyId == companyId && a.AccountGroupsId == accountGroupsId)
                    .Include(a => a.AccountGroup)
                    .Include(a => a.FiscalYears)
                    .OrderBy(a => a.Name)
                    .ToListAsync();

                _logger.LogInformation("Retrieved {Count} accounts for company {CompanyId} and group {GroupId}",
                    accounts.Count, companyId, accountGroupsId);
                return accounts;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting accounts for company {CompanyId} and group {GroupId}",
                    companyId, accountGroupsId);
                throw;
            }
        }

        public async Task<Account> UpdateAccountAsync(Guid id, Account account)
        {
            try
            {
                var existingAccount = await _context.Accounts.FindAsync(id);
                if (existingAccount == null)
                {
                    throw new KeyNotFoundException($"Account with ID {id} not found");
                }

                // Check if new name conflicts with another account in the same company
                if (existingAccount.Name.ToLower() != account.Name.ToLower())
                {
                    var duplicate = await _context.Accounts
                        .FirstOrDefaultAsync(a => a.CompanyId == existingAccount.CompanyId &&
                                                 a.Id != id &&
                                                 a.Name.ToLower() == account.Name.ToLower());

                    if (duplicate != null)
                    {
                        throw new InvalidOperationException($"Account '{account.Name}' already exists for this company");
                    }
                }

                // Validate opening balance type
                if (account.OpeningBalanceType != "Dr" && account.OpeningBalanceType != "Cr")
                {
                    throw new ArgumentException("OpeningBalanceType must be either 'Dr' or 'Cr'");
                }

                // Update properties
                existingAccount.Name = account.Name;
                existingAccount.OpeningBalance = account.OpeningBalance;
                existingAccount.OpeningBalanceType = account.OpeningBalanceType;
                existingAccount.AccountGroupsId = account.AccountGroupsId;
                existingAccount.DefaultCashAccount = account.DefaultCashAccount;
                existingAccount.DefaultVatAccount = account.DefaultVatAccount;
                existingAccount.IsDefaultAccount = account.IsDefaultAccount;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Account {AccountId} updated", id);
                return existingAccount;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating account {AccountId}", id);
                throw;
            }
        }

        public async Task<bool> DeleteAccountAsync(Guid id)
        {
            try
            {
                var account = await _context.Accounts.FindAsync(id);
                if (account == null)
                {
                    _logger.LogWarning("Account {AccountId} not found for deletion", id);
                    return false;
                }

                // Check if account is a default account (might have restrictions)
                if (account.IsDefaultAccount)
                {
                    _logger.LogWarning("Cannot delete default account {AccountId} ({AccountName})", id, account.Name);
                    return false;
                }

                _context.Accounts.Remove(account);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Account {AccountId} deleted", id);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting account {AccountId}", id);
                throw;
            }
        }

        public async Task<Account> GetAccountByUniqueNumberAsync(int uniqueNumber)
        {
            try
            {
                var account = await _context.Accounts
                    .Include(a => a.Company)
                    .Include(a => a.AccountGroup)
                    .FirstOrDefaultAsync(a => a.UniqueNumber == uniqueNumber);

                if (account == null)
                {
                    _logger.LogDebug("Account with unique number {UniqueNumber} not found", uniqueNumber);
                }

                return account;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting account by unique number {UniqueNumber}", uniqueNumber);
                throw;
            }
        }

        public async Task<List<Account>> SearchAccountsAsync(Guid companyId, string searchTerm)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(searchTerm))
                {
                    return await GetAccountsByCompanyAsync(companyId);
                }

                var accounts = await _context.Accounts
                    .Where(a => a.CompanyId == companyId &&
                               (a.Name.ToLower().Contains(searchTerm.ToLower()) ||
                                a.UniqueNumber.ToString().Contains(searchTerm)))
                    .Include(a => a.AccountGroup)
                    .OrderBy(a => a.Name)
                    .Take(50) // Limit results
                    .ToListAsync();

                _logger.LogInformation("Found {Count} accounts matching '{SearchTerm}' for company {CompanyId}",
                    accounts.Count, searchTerm, companyId);
                return accounts;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching accounts with term '{SearchTerm}' for company {CompanyId}",
                    searchTerm, companyId);
                throw;
            }
        }

        // Default account creation methods
        public async Task<Account> AddDefaultCashAccountAsync(Guid companyId)
        {
            try
            {
                // Get the company and active fiscal year
                var company = await _context.Companies
                    .Include(c => c.FiscalYears.Where(f => f.IsActive))
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                if (company == null)
                {
                    throw new KeyNotFoundException($"Company with ID {companyId} not found");
                }

                var currentFiscalYear = company.FiscalYears.FirstOrDefault();
                if (currentFiscalYear == null)
                {
                    throw new InvalidOperationException($"No active fiscal year found for company {companyId}");
                }

                // Find the "Cash in Hand" account group
                var cashGroup = await _context.AccountGroups
                    .FirstOrDefaultAsync(g => g.CompanyId == companyId &&
                                             g.Name == "Cash in Hand" &&
                                             g.Type == "Current Assets");

                if (cashGroup == null)
                {
                    throw new InvalidOperationException($"'Cash in Hand' account group not found for company {companyId}");
                }

                // Check if default cash account already exists
                var existingCashAccount = await _context.Accounts
                    .FirstOrDefaultAsync(a => a.CompanyId == companyId &&
                                             a.DefaultCashAccount);

                if (existingCashAccount != null)
                {
                    _logger.LogInformation("Default cash account already exists for company {CompanyId}", companyId);
                    return existingCashAccount;
                }

                bool isNepaliDateFormat = currentFiscalYear.DateFormat == DateFormatEnum.Nepali;
                // Create default cash account
                var cashAccount = new Account
                {
                    Name = "Cash in Hand",
                    AccountGroupsId = cashGroup.Id,
                    OpeningBalance = new OpeningBalance // Create OpeningBalance object
                    {
                        Amount = 0,
                        Type = "Dr",
                        Date = isNepaliDateFormat ? DateTime.MinValue : DateTime.UtcNow,
                        NepaliDate = isNepaliDateFormat && !string.IsNullOrEmpty(currentFiscalYear.StartDateNepali)
            ? DateTime.Parse(currentFiscalYear.StartDateNepali)
            : DateTime.MinValue,
                        FiscalYearId = currentFiscalYear.Id
                    },
                    OpeningBalanceType = "Dr",
                    CompanyId = companyId,
                    OriginalFiscalYearId = currentFiscalYear.Id,
                    DefaultCashAccount = true,
                    IsDefaultAccount = true,
                    CreatedAt = DateTime.UtcNow,
                    OpeningBalanceDate = isNepaliDateFormat ? DateTime.MinValue : DateTime.UtcNow,
                    OpeningBalanceDateNepali = isNepaliDateFormat ? currentFiscalYear.StartDateNepali : null
                };

                cashAccount = await CreateAccountAsync(cashAccount);

                _logger.LogInformation("Default cash account '{AccountName}' added for company {CompanyId}",
                    cashAccount.Name, companyId);

                return cashAccount;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding default cash account for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<Account> AddDefaultVatAccountAsync(Guid companyId)
        {
            try
            {
                // Get the company and active fiscal year
                var company = await _context.Companies
                    .Include(c => c.FiscalYears.Where(f => f.IsActive))
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                if (company == null)
                {
                    throw new KeyNotFoundException($"Company with ID {companyId} not found");
                }

                var currentFiscalYear = company.FiscalYears.FirstOrDefault();
                if (currentFiscalYear == null)
                {
                    throw new InvalidOperationException($"No active fiscal year found for company {companyId}");
                }

                // Find the "Duties & Taxes" account group
                var dutiesTaxGroup = await _context.AccountGroups
                    .FirstOrDefaultAsync(g => g.CompanyId == companyId &&
                                             g.Name == "Duties & Taxes" &&
                                             g.Type == "Current Liabilities");

                if (dutiesTaxGroup == null)
                {
                    throw new InvalidOperationException($"'Duties & Taxes' account group not found for company {companyId}");
                }

                // Check if default VAT account already exists
                var existingVatAccount = await _context.Accounts
                    .FirstOrDefaultAsync(a => a.CompanyId == companyId &&
                                             a.DefaultVatAccount);

                if (existingVatAccount != null)
                {
                    _logger.LogInformation("Default VAT account already exists for company {CompanyId}", companyId);
                    return existingVatAccount;
                }

                bool isNepaliDateFormat = currentFiscalYear.DateFormat == DateFormatEnum.Nepali;

                var vatAccount = new Account
                {
                    Name = "VAT",
                    AccountGroupsId = dutiesTaxGroup.Id,
                    OpeningBalance = new OpeningBalance // Create OpeningBalance object
                    {
                        Amount = 0,
                        Type = "Dr",
                        Date = isNepaliDateFormat ? DateTime.MinValue : DateTime.UtcNow,
                        NepaliDate = isNepaliDateFormat && !string.IsNullOrEmpty(currentFiscalYear.StartDateNepali)
            ? DateTime.Parse(currentFiscalYear.StartDateNepali)
            : DateTime.MinValue,
                        FiscalYearId = currentFiscalYear.Id
                    },
                    OpeningBalanceType = "Dr",
                    CompanyId = companyId,
                    OriginalFiscalYearId = currentFiscalYear.Id,
                    DefaultVatAccount = true,
                    IsDefaultAccount = true,
                    CreatedAt = DateTime.UtcNow,
                    OpeningBalanceDate = isNepaliDateFormat ? DateTime.MinValue : DateTime.UtcNow,
                    OpeningBalanceDateNepali = isNepaliDateFormat ? currentFiscalYear.StartDateNepali : null
                };

                vatAccount = await CreateAccountAsync(vatAccount);

                _logger.LogInformation("Default VAT account '{AccountName}' added for company {CompanyId}",
                    vatAccount.Name, companyId);

                return vatAccount;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding default VAT account for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<Account> CreateAccountAsync(Account account)
        {
            try
            {
                // Generate unique number if not provided
                if (!account.UniqueNumber.HasValue)
                {
                    account.UniqueNumber = await GenerateUniqueAccountNumberAsync();
                }

                // Validate opening balance type
                if (account.OpeningBalanceType != "Dr" && account.OpeningBalanceType != "Cr")
                {
                    throw new ArgumentException("OpeningBalanceType must be either 'Dr' or 'Cr'");
                }

                // Get fiscal year to determine date format
                var fiscalYear = account.OriginalFiscalYearId.HasValue
                    ? await _context.FiscalYears.FindAsync(account.OriginalFiscalYearId.Value)
                    : null;

                if (fiscalYear != null)
                {
                    bool isNepaliDateFormat = fiscalYear.DateFormat == DateFormatEnum.Nepali;

                    // Set opening balance date based on fiscal year format
                    if (isNepaliDateFormat)
                    {
                        // Use fiscal year's Nepali start date
                        account.OpeningBalanceDate = DateTime.MinValue; // Placeholder
                        account.OpeningBalanceDateNepali = fiscalYear.StartDateNepali;
                    }
                    else
                    {
                        // Use current date for English
                        account.OpeningBalanceDate = DateTime.UtcNow;
                        account.OpeningBalanceDateNepali = null;
                    }
                }
                else
                {
                    // Default to English date
                    account.OpeningBalanceDate = DateTime.UtcNow;
                }

                account.CreatedAt = DateTime.UtcNow;
                account.IsActive = true;

                _context.Accounts.Add(account);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Account '{AccountName}' created with ID {AccountId} and unique number {UniqueNumber}",
                    account.Name, account.Id, account.UniqueNumber);

                return account;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating account '{AccountName}'", account.Name);
                throw;
            }
        }

        public async Task<bool> AddOtherDefaultAccountsAsync(Guid companyId)
        {
            try
            {
                // Get the company and active fiscal year
                var company = await _context.Companies
                    .Include(c => c.FiscalYears.Where(f => f.IsActive))
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                if (company == null)
                {
                    throw new KeyNotFoundException($"Company with ID {companyId} not found");
                }

                var currentFiscalYear = company.FiscalYears.FirstOrDefault();
                if (currentFiscalYear == null)
                {
                    throw new InvalidOperationException($"No active fiscal year found for company {companyId}");
                }

                // Define other default accounts (matching your React frontend)
                var otherDefaultAccounts = new List<(string Name, string GroupName, string GroupType)>
                {
                    ("Advertisement & Publicity", "Expenses (Indirect/Admn.)", "Revenue Accounts"),
                    ("Bad Debts Written Off", "Expenses (Indirect/Admn.)", "Revenue Accounts"),
                    ("Bank Charges", "Expenses (Indirect/Admn.)", "Revenue Accounts"),
                    ("Books & Periodicals", "Expenses (Indirect/Admn.)", "Revenue Accounts"),
                    ("Capital Equipments", "Fixed Assets", "Primary"),
                    ("Charity & Donations", "Expenses (Indirect/Admn.)", "Revenue Accounts"),
                    ("Commission on Sales", "Expenses (Indirect/Admn.)", "Revenue Accounts"),
                    ("Computers", "Fixed Assets", "Primary"),
                    ("Conveyance Expenses", "Expenses (Indirect/Admn.)", "Revenue Accounts"),
                    ("Customer Entertainment Expenses", "Expenses (Indirect/Admn.)", "Revenue Accounts"),
                    ("Depreciation A/c", "Expenses (Indirect/Admn.)", "Revenue Accounts"),
                    ("Earnest Money", "Securities & Deposits", "Current Assets"),
                    ("Freight & Forwarding Charges", "Expenses (Indirect/Admn.)", "Revenue Accounts"),
                    ("Furniture & Fixture", "Fixed Assets", "Primary"),
                    ("Legal Expenses", "Expenses (Indirect/Admn.)", "Revenue Accounts"),
                    ("Miscellaneous Expenses", "Expenses (Indirect/Admn.)", "Revenue Accounts"),
                    ("Office Equipments", "Fixed Assets", "Primary"),
                    ("Office Maintenance Expenses", "Expenses (Indirect/Admn.)", "Revenue Accounts"),
                    ("Office Rent", "Expenses (Indirect/Admn.)", "Revenue Accounts"),
                    ("Plant & Machinery", "Fixed Assets", "Primary"),
                    ("Postal Expenses", "Expenses (Indirect/Admn.)", "Revenue Accounts"),
                    ("Printing & Stationery", "Expenses (Indirect/Admn.)", "Revenue Accounts"),
                    ("Profit & Loss", "Profit & Loss", "Primary"),
                    ("Purchase", "Purchase", "Revenue Accounts"),
                    ("Rounded Off", "Expenses (Indirect/Admn.)", "Revenue Accounts"),
                    ("Salary", "Expenses (Indirect/Admn.)", "Revenue Accounts"),
                    ("Salary & Bonus Payable", "Provisions/Expenses Payable", "Current Liabilities"),
                    ("Sales", "Sale", "Revenue Accounts"),
                    ("Stock", "Stock in hand", "Current Assets"),
                    ("Sales Promotion Expenses", "Expenses (Indirect/Admn.)", "Revenue Accounts"),
                    ("Service Charges Paid", "Expenses (Indirect/Admn.)", "Revenue Accounts"),
                    ("Service Charges Receipts", "Income (Indirect)", "Revenue Accounts"),
                    ("Staff Welfare Expenses", "Expenses (Indirect/Admn.)", "Revenue Accounts"),
                    ("Telephone Expenses", "Expenses (Indirect/Admn.)", "Revenue Accounts"),
                    ("Travelling Expenses", "Expenses (Indirect/Admn.)", "Revenue Accounts"),
                    ("VAT Refund A/c", "Income (Direct/Opr.)", "Revenue Accounts"),
                    ("VAT Refundable From Govt.", "Current Assets", "Primary"),
                    ("Water & Electricity Expenses", "Expenses (Indirect/Admn.)", "Revenue Accounts"),
                };

                var createdAccountsCount = 0;

                foreach (var accountData in otherDefaultAccounts)
                {
                    // Find the account group
                    var accountGroup = await _context.AccountGroups
                        .FirstOrDefaultAsync(g => g.CompanyId == companyId &&
                                                 g.Name == accountData.GroupName &&
                                                 g.Type == accountData.GroupType);

                    if (accountGroup == null)
                    {
                        _logger.LogWarning("Account group '{GroupName}' ({GroupType}) not found for company {CompanyId}",
                            accountData.GroupName, accountData.GroupType, companyId);
                        continue;
                    }

                    // Check if account already exists
                    var existingAccount = await _context.Accounts
                        .FirstOrDefaultAsync(a => a.CompanyId == companyId &&
                                                 a.Name == accountData.Name &&
                                                 a.AccountGroupsId == accountGroup.Id);

                    if (existingAccount != null)
                    {
                        // Update existing account to be marked as default
                        if (!existingAccount.IsDefaultAccount)
                        {
                            existingAccount.IsDefaultAccount = true;
                            await _context.SaveChangesAsync();
                        }
                        continue;
                    }

                    bool isNepaliDateFormat = currentFiscalYear.DateFormat == DateFormatEnum.Nepali;

                    // Create the account using CreateAccountAsync() to generate unique number
                    var account = new Account
                    {
                        Name = accountData.Name,
                        AccountGroupsId = accountGroup.Id,
                        OpeningBalance = new OpeningBalance
                        {
                            Amount = 0,
                            Type = "Dr",
                            Date = isNepaliDateFormat ? DateTime.MinValue : DateTime.UtcNow,
                            NepaliDate = isNepaliDateFormat && !string.IsNullOrEmpty(currentFiscalYear.StartDateNepali)
            ? DateTime.Parse(currentFiscalYear.StartDateNepali)
            : DateTime.MinValue,
                            FiscalYearId = currentFiscalYear.Id
                        },
                        OpeningBalanceType = "Dr",
                        CompanyId = companyId,
                        OriginalFiscalYearId = currentFiscalYear.Id,
                        IsDefaultAccount = true,
                        CreatedAt = DateTime.UtcNow,
                        OpeningBalanceDate = isNepaliDateFormat ? DateTime.MinValue : DateTime.UtcNow,
                        OpeningBalanceDateNepali = isNepaliDateFormat ? currentFiscalYear.StartDateNepali : null
                    };

                    // ⭐️ IMPORTANT: Use CreateAccountAsync() to generate unique number
                    await CreateAccountAsync(account);
                    createdAccountsCount++;
                }

                _logger.LogInformation("Added {Count} other default accounts for company {CompanyId}",
                    createdAccountsCount, companyId);

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding other default accounts for company {CompanyId}", companyId);
                throw;
            }
        }
    }
}


