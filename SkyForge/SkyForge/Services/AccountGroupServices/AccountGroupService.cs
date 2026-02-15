
using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Models.AccountGroupModel;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SkyForge.Services.AccountGroupServices
{
    public class AccountGroupService : IAccountGroupService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<AccountGroupService> _logger;

        public AccountGroupService(ApplicationDbContext context, ILogger<AccountGroupService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<AccountGroup> CreateAccountGroupAsync(AccountGroup accountGroup)
        {
            try
            {
                // Validate the type
                if (!AccountGroup.IsValidType(accountGroup.Type))
                {
                    throw new ArgumentException($"Invalid account group type: {accountGroup.Type}");
                }

                // Check if account group with same name already exists for this company
                var existing = await _context.AccountGroups
                    .FirstOrDefaultAsync(ag => ag.CompanyId == accountGroup.CompanyId &&
                                               ag.Name.ToLower() == accountGroup.Name.ToLower());

                if (existing != null)
                {
                    throw new InvalidOperationException($"Account group '{accountGroup.Name}' already exists for this company");
                }

                // Generate unique number if not provided
                if (!accountGroup.UniqueNumber.HasValue)
                {
                    accountGroup.UniqueNumber = await GenerateUniqueAccountGroupNumberAsync();
                }

                accountGroup.CreatedAt = DateTime.UtcNow;
                accountGroup.UpdatedAt = null;

                _context.AccountGroups.Add(accountGroup);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Account group '{Name}' (ID: {Id}, Unique: {UniqueNumber}) created for company {CompanyId}",
                    accountGroup.Name, accountGroup.Id, accountGroup.UniqueNumber, accountGroup.CompanyId);

                return accountGroup;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating account group '{Name}' for company {CompanyId}",
                    accountGroup.Name, accountGroup.CompanyId);
                throw;
            }
        }

        public async Task<AccountGroup> GetAccountGroupByIdAsync(Guid id)
        {
            try
            {
                var accountGroup = await _context.AccountGroups
                    .Include(ag => ag.Company)
                    .Include(ag => ag.Accounts)
                    .FirstOrDefaultAsync(ag => ag.Id == id);

                if (accountGroup == null)
                {
                    _logger.LogWarning("Account group {AccountGroupId} not found", id);
                }

                return accountGroup;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting account group {AccountGroupId}", id);
                throw;
            }
        }

        public async Task<List<AccountGroup>> GetAccountGroupsByCompanyAsync(Guid companyId)
        {
            try
            {
                var accountGroups = await _context.AccountGroups
                    .Where(ag => ag.CompanyId == companyId)
                    .Include(ag => ag.Accounts)
                    .OrderBy(ag => ag.Type)
                    .ThenBy(ag => ag.Name)
                    .ToListAsync();

                _logger.LogInformation("Retrieved {Count} account groups for company {CompanyId}",
                    accountGroups.Count, companyId);

                return accountGroups;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting account groups for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<AccountGroup> UpdateAccountGroupAsync(Guid id, AccountGroup accountGroup)
        {
            try
            {
                var existingGroup = await _context.AccountGroups.FindAsync(id);
                if (existingGroup == null)
                {
                    throw new KeyNotFoundException($"Account group with ID {id} not found");
                }

                // Check if new name conflicts with another account group in the same company
                if (existingGroup.Name.ToLower() != accountGroup.Name.ToLower())
                {
                    var duplicate = await _context.AccountGroups
                        .FirstOrDefaultAsync(ag => ag.CompanyId == existingGroup.CompanyId &&
                                                   ag.Id != id &&
                                                   ag.Name.ToLower() == accountGroup.Name.ToLower());

                    if (duplicate != null)
                    {
                        throw new InvalidOperationException($"Account group '{accountGroup.Name}' already exists for this company");
                    }
                }

                // Validate the type
                if (!AccountGroup.IsValidType(accountGroup.Type))
                {
                    throw new ArgumentException($"Invalid account group type: {accountGroup.Type}");
                }

                // Update properties
                existingGroup.Name = accountGroup.Name;
                existingGroup.PrimaryGroup = accountGroup.PrimaryGroup;
                existingGroup.Type = accountGroup.Type;
                existingGroup.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Account group {AccountGroupId} updated", id);

                return existingGroup;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating account group {AccountGroupId}", id);
                throw;
            }
        }

        public async Task<bool> DeleteAccountGroupAsync(Guid id)
        {
            try
            {
                var accountGroup = await _context.AccountGroups
                    .Include(ag => ag.Accounts)
                    .FirstOrDefaultAsync(ag => ag.Id == id);

                if (accountGroup == null)
                {
                    _logger.LogWarning("Account group {AccountGroupId} not found for deletion", id);
                    return false;
                }

                // Check if there are accounts in this group
                if (accountGroup.Accounts.Any())
                {
                    throw new InvalidOperationException(
                        $"Cannot delete account group '{accountGroup.Name}' because it contains {accountGroup.Accounts.Count} accounts. " +
                        "Please move or delete the accounts first.");
                }

                _context.AccountGroups.Remove(accountGroup);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Account group {AccountGroupId} deleted", id);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting account group {AccountGroupId}", id);
                throw;
            }
        }

        public async Task<bool> AddDefaultAccountGroupsAsync(Guid companyId)
        {
            try
            {
                _logger.LogInformation("Adding default account groups for company {CompanyId}", companyId);

                // Check if company exists
                var company = await _context.Companies.FindAsync(companyId);
                if (company == null)
                {
                    throw new KeyNotFoundException($"Company with ID {companyId} not found");
                }

                // Check if account groups already exist for this company
                var existingGroups = await _context.AccountGroups
                    .CountAsync(ag => ag.CompanyId == companyId);

                if (existingGroups > 0)
                {
                    _logger.LogInformation("Account groups already exist for company {CompanyId}. Skipping default creation.", companyId);
                    return false;
                }

                // Define default account groups (matching your React frontend)
                var defaultAccountGroups = new List<AccountGroup>
                {
                    // Current Assets
                    new AccountGroup { Name = "Sundry Debtors", PrimaryGroup = "No", Type = "Current Assets", CompanyId = companyId },
                    new AccountGroup { Name = "Sundry Creditors", PrimaryGroup = "No", Type = "Current Liabilities", CompanyId = companyId },
                    new AccountGroup { Name = "Cash in Hand", PrimaryGroup = "No", Type = "Current Assets", CompanyId = companyId },
                    new AccountGroup { Name = "Bank Accounts", PrimaryGroup = "No", Type = "Current Assets", CompanyId = companyId },
                    new AccountGroup { Name = "Bank O/D Account", PrimaryGroup = "No", Type = "Loans(Liability)", CompanyId = companyId },
                    new AccountGroup { Name = "Duties & Taxes", PrimaryGroup = "No", Type = "Current Liabilities", CompanyId = companyId },
                    
                    // Primary Groups
                    new AccountGroup { Name = "Fixed Assets", PrimaryGroup = "Yes", Type = "Primary", CompanyId = companyId },
                    new AccountGroup { Name = "Capital Account", PrimaryGroup = "Yes", Type = "Primary", CompanyId = companyId },
                    new AccountGroup { Name = "Current Liabilities", PrimaryGroup = "Yes", Type = "Primary", CompanyId = companyId },
                    new AccountGroup { Name = "Investments", PrimaryGroup = "Yes", Type = "Primary", CompanyId = companyId },
                    new AccountGroup { Name = "Loans(Liability)", PrimaryGroup = "Yes", Type = "Primary", CompanyId = companyId },
                    new AccountGroup { Name = "Pre-Operative Expenses", PrimaryGroup = "Yes", Type = "Primary", CompanyId = companyId },
                    new AccountGroup { Name = "Revenue Accounts", PrimaryGroup = "Yes", Type = "Primary", CompanyId = companyId },
                    new AccountGroup { Name = "Suspense Account", PrimaryGroup = "Yes", Type = "Primary", CompanyId = companyId },
                    new AccountGroup { Name = "Current Assets", PrimaryGroup = "Yes", Type = "Primary", CompanyId = companyId },
                    new AccountGroup { Name = "Profit & Loss", PrimaryGroup = "Yes", Type = "Primary", CompanyId = companyId },
                    
                    // Other groups
                    new AccountGroup { Name = "Reserves & Surplus", PrimaryGroup = "No", Type = "Capital Account", CompanyId = companyId },
                    new AccountGroup { Name = "Secured Loans", PrimaryGroup = "No", Type = "Loans(Liability)", CompanyId = companyId },
                    new AccountGroup { Name = "Securities & Deposits", PrimaryGroup = "No", Type = "Current Assets", CompanyId = companyId },
                    new AccountGroup { Name = "Stock in hand", PrimaryGroup = "No", Type = "Current Assets", CompanyId = companyId },
                    new AccountGroup { Name = "Unsecured Loans", PrimaryGroup = "No", Type = "Loans(Liability)", CompanyId = companyId },
                    new AccountGroup { Name = "Expenses (Direct/Mfg.)", PrimaryGroup = "No", Type = "Revenue Accounts", CompanyId = companyId },
                    new AccountGroup { Name = "Expenses (Indirect/Admn.)", PrimaryGroup = "No", Type = "Revenue Accounts", CompanyId = companyId },
                    new AccountGroup { Name = "Income (Direct/Opr.)", PrimaryGroup = "No", Type = "Revenue Accounts", CompanyId = companyId },
                    new AccountGroup { Name = "Income (Indirect)", PrimaryGroup = "No", Type = "Revenue Accounts", CompanyId = companyId },
                    new AccountGroup { Name = "Loans & Advances", PrimaryGroup = "No", Type = "Current Assets", CompanyId = companyId },
                    new AccountGroup { Name = "Provisions/Expenses Payable", PrimaryGroup = "No", Type = "Current Liabilities", CompanyId = companyId },
                    new AccountGroup { Name = "Purchase", PrimaryGroup = "No", Type = "Revenue Accounts", CompanyId = companyId },
                    new AccountGroup { Name = "Sale", PrimaryGroup = "No", Type = "Revenue Accounts", CompanyId = companyId },
                };

                // Generate unique numbers for all account groups
                var generatedNumbers = new HashSet<int>();
                var random = new Random();

                foreach (var accountGroup in defaultAccountGroups)
                {
                    int uniqueNumber;
                    bool isUnique;

                    do
                    {
                        uniqueNumber = random.Next(1000, 10000);
                        isUnique = !generatedNumbers.Contains(uniqueNumber);

                        // Also check if number exists in database
                        if (isUnique)
                        {
                            var existsInDb = await _context.AccountGroups
                                .AnyAsync(ag => ag.UniqueNumber == uniqueNumber);
                            isUnique = !existsInDb;
                        }

                    } while (!isUnique);

                    accountGroup.UniqueNumber = uniqueNumber;
                    generatedNumbers.Add(uniqueNumber);
                    accountGroup.CreatedAt = DateTime.UtcNow;
                }

                // Add all default account groups
                _context.AccountGroups.AddRange(defaultAccountGroups);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Added {Count} default account groups for company {CompanyId}",
                    defaultAccountGroups.Count, companyId);

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding default account groups for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<AccountGroup> GetAccountGroupByNameAsync(Guid companyId, string name)
        {
            try
            {
                var accountGroup = await _context.AccountGroups
                    .FirstOrDefaultAsync(ag => ag.CompanyId == companyId &&
                                               ag.Name.ToLower() == name.ToLower());

                if (accountGroup == null)
                {
                    _logger.LogDebug("Account group '{Name}' not found for company {CompanyId}", name, companyId);
                }

                return accountGroup;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting account group '{Name}' for company {CompanyId}", name, companyId);
                throw;
            }
        }

        public async Task<List<AccountGroup>> GetAccountGroupsByTypeAsync(Guid companyId, string type)
        {
            try
            {
                var accountGroups = await _context.AccountGroups
                    .Where(ag => ag.CompanyId == companyId && ag.Type == type)
                    .OrderBy(ag => ag.Name)
                    .ToListAsync();

                _logger.LogInformation("Retrieved {Count} account groups of type '{Type}' for company {CompanyId}",
                    accountGroups.Count, type, companyId);

                return accountGroups;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting account groups of type '{Type}' for company {CompanyId}", type, companyId);
                throw;
            }
        }

        // Helper method to get account group by company and name, create if not exists
        public async Task<AccountGroup> GetOrCreateAccountGroupAsync(Guid companyId, string name, string primaryGroup, string type)
        {
            try
            {
                var accountGroup = await GetAccountGroupByNameAsync(companyId, name);

                if (accountGroup == null)
                {
                    accountGroup = new AccountGroup
                    {
                        Name = name,
                        PrimaryGroup = primaryGroup,
                        Type = type,
                        CompanyId = companyId,
                        CreatedAt = DateTime.UtcNow
                    };

                    accountGroup = await CreateAccountGroupAsync(accountGroup);
                    _logger.LogInformation("Created account group '{Name}' for company {CompanyId}", name, companyId);
                }

                return accountGroup;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting or creating account group '{Name}' for company {CompanyId}", name, companyId);
                throw;
            }
        }

        public async Task<int> GenerateUniqueAccountGroupNumberAsync()
        {
            try
            {
                int uniqueNumber;
                bool isUnique;

                do
                {
                    // Generate random 4-digit number (1000-9999)
                    uniqueNumber = new Random().Next(1000, 10000);

                    // Check if number already exists for any account group
                    isUnique = !await _context.AccountGroups
                        .AnyAsync(ag => ag.UniqueNumber == uniqueNumber);

                } while (!isUnique);

                _logger.LogDebug("Generated unique account group number: {UniqueNumber}", uniqueNumber);
                return uniqueNumber;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating unique account group number");
                throw;
            }
        }
    }
}