using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Models.AccountGroupModel;
using SkyForge.Models.AccountModel;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.RackModel;
using SkyForge.Models.Retailer.CategoryModel;
using SkyForge.Models.Retailer.ItemCompanyModel;
using SkyForge.Models.Retailer.Items;
using SkyForge.Models.Retailer.MainUnitModel;
using SkyForge.Models.Retailer.SettingsModel;
using SkyForge.Models.Retailer.StoreModel;
using SkyForge.Models.Shared;
using SkyForge.Models.UnitModel;
using SkyForge.Services.AccountGroupServices;
using SkyForge.Services.AccountServices;
using SkyForge.Services.CategoryServices;
using SkyForge.Services.ItemCompanyServices;
using SkyForge.Services.Retailer.SettingsServices;
using SkyForge.Services.UnitServices;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SkyForge.Dto.CompanyDto;

namespace SkyForge.Services
{
    public class CompanyService : ICompanyService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<CompanyService> _logger;
        private readonly ISettingsService _settingsService;
        private readonly IFiscalYearService _fiscalYearService;
        private readonly IAccountGroupService _accountGroupService;
        private readonly IMainUnitService _mainUnitService;
        private readonly IUnitService _unitService;
        private readonly IAccountService _accountService;
        private readonly ICategoryService _categoryService;
        private readonly IItemCompanyService _iitemCompanyService;
        private readonly IBillPrefixService _billPrefixService;

        public CompanyService(ApplicationDbContext context,
            ILogger<CompanyService> logger,
            ISettingsService settingsService,
            IFiscalYearService fiscalYearService,
            IBillPrefixService billPrefixService,
            IAccountGroupService accountGroupService,
            IMainUnitService mainUnitService,
            IUnitService unitService,
            IAccountService accountService,
            ICategoryService categoryService,
            IItemCompanyService iitemCompanyService)
        {
            _context = context;
            _logger = logger;
            _settingsService = settingsService;
            _fiscalYearService = fiscalYearService;
            _billPrefixService = billPrefixService;
            _accountGroupService = accountGroupService;
            _mainUnitService = mainUnitService;
            _unitService = unitService;
            _accountService = accountService;
            _categoryService = categoryService;
            _iitemCompanyService = iitemCompanyService;
        }

        public async Task<Company> CreateCompanyAsync(Company company, Guid ownerId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // Set owner
                company.OwnerId = ownerId;

                // // Set default values if not provided
                // company.CreatedAt = DateTime.UtcNow;
                // company.UpdatedAt = DateTime.UtcNow;
                if (!string.IsNullOrEmpty(company.FiscalYearStartDateNepali))
                {
                    // Try to parse the FiscalYearStartDate as a DateTime
                    // Assuming FiscalYearStartDate is in English format like "2024-04-01"
                    if (DateTime.TryParse(company.FiscalYearStartDateNepali, out DateTime parsedDate))
                    {
                        company.CreatedAt = parsedDate;
                        _logger.LogInformation("Set CreatedAt to {CreatedAt} from FiscalYearStartDate {Date}",
                            company.CreatedAt, company.FiscalYearStartDateNepali);
                    }
                    else
                    {
                        // If parsing fails, fall back to UtcNow
                        company.CreatedAt = DateTime.UtcNow;
                        _logger.LogWarning("Could not parse FiscalYearStartDate '{Date}' - using UtcNow instead",
                            company.FiscalYearStartDateNepali);
                    }
                }
                else
                {
                    // If no FiscalYearStartDate provided, use UtcNow
                    company.CreatedAt = DateTime.UtcNow;
                    _logger.LogInformation("No FiscalYearStartDate provided - using UtcNow for CreatedAt");
                }

                // Set UpdatedAt
                company.UpdatedAt = DateTime.UtcNow;
                // Ensure TradeType is properly set
                if (string.IsNullOrEmpty(company.TradeType.ToString()))
                {
                    company.TradeType = TradeType.Retailer;
                }

                // Generate notification emails
                company.NotificationEmails = await GenerateNotificationEmailsAsync(company);

                // Add owner to company users
                var owner = await _context.Users.FindAsync(ownerId);
                if (owner != null)
                {
                    company.Users.Add(owner);
                }

                // Generate new Guid if not provided
                if (company.Id == Guid.Empty)
                {
                    company.Id = Guid.NewGuid();
                }

                // Save company FIRST
                _context.Companies.Add(company);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Company {CompanyId} saved to database", company.Id);

                // Create default Fiscal Year
                await CreateDefaultFiscalYearAsync(company);

                // Get the created fiscal year to verify it was created
                var fiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.CompanyId == company.Id && f.IsActive);

                if (fiscalYear == null)
                {
                    throw new Exception("Fiscal year was not created properly for company");
                }

                _logger.LogInformation("Company {CompanyId} created with FiscalYear {FiscalYearId}",
                    company.Id, fiscalYear.Id);

                // Create default settings for the company (passing the fiscal year ID)
                await CreateDefaultSettingsAsync(company.Id, ownerId, fiscalYear.Id);

                // Create default account groups
                await CreateDefaultAccountGroupsAsync(company.Id);

                // Create default item categories, units, etc.
                await CreateDefaultItemConfigurationsAsync(company.Id);

                // Create default store and rack
                await CreateDefaultStoreAndRackAsync(company.Id);

                await transaction.CommitAsync();

                _logger.LogInformation("Company created successfully: {CompanyId} by owner {OwnerId}",
                    company.Id, ownerId);

                return company;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error creating company for owner {OwnerId}", ownerId);
                throw;
            }
        }
        private async Task CreateDefaultFiscalYearAsync(Company company)
        {
            try
            {
                _logger.LogInformation("Creating default fiscal year for company {CompanyId}", company.Id);

                FiscalYear fiscalYear;

                // Generate unique bill prefixes
                var billPrefixes = await _billPrefixService.GenerateUniqueBillPrefixesAsync(company.Id);

                _logger.LogInformation("Generated unique bill prefixes for company {CompanyId}", company.Id);

                if (company.DateFormat == DateFormatEnum.Nepali &&
                    !string.IsNullOrEmpty(company.FiscalYearStartDateNepali))
                {
                    // ===== NEPALI FISCAL YEAR =====
                    var parts = company.FiscalYearStartDateNepali.Split('-');
                    if (parts.Length >= 3 &&
                        int.TryParse(parts[0], out int nepaliYear) &&
                        int.TryParse(parts[1], out int nepaliMonth) &&
                        int.TryParse(parts[2], out int nepaliDay))
                    {
                        string fiscalYearName = $"{nepaliYear}/{((nepaliYear + 1) % 100).ToString("D2")}";

                        // Calculate Nepali end date (1 year minus 1 day)
                        int endYear = nepaliYear + 1;
                        int endMonth = nepaliMonth;
                        int endDay = nepaliDay - 1;

                        if (endDay < 1)
                        {
                            endMonth -= 1;
                            if (endMonth < 1)
                            {
                                endMonth = 12;
                                endYear -= 1;
                            }
                            int[] nepaliMonthDays = new int[] { 31, 31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30 };
                            endDay = nepaliMonthDays[endMonth - 1];
                        }

                        string nepaliEndDate = $"{endYear:0000}-{endMonth:00}-{endDay:00}";

                        // ===== CRITICAL FIX: Use English dates from the Company object =====
                        // The Company object already has FiscalYearStartDateEnglish from the frontend
                        DateTime? englishStartDate = company.FiscalYearStartDateEnglish;

                        // Calculate English end date (1 year minus 1 day from start date)
                        DateTime? englishEndDate = null;
                        if (englishStartDate.HasValue)
                        {
                            englishEndDate = englishStartDate.Value.AddYears(1).AddDays(-1);
                        }

                        fiscalYear = new FiscalYear
                        {
                            Id = Guid.NewGuid(),
                            Name = fiscalYearName,
                            DateFormat = DateFormatEnum.Nepali,
                            // Nepali dates
                            StartDateNepali = company.FiscalYearStartDateNepali,
                            EndDateNepali = nepaliEndDate,
                            // English dates - USE THE VALUES FROM COMPANY
                            StartDate = englishStartDate,
                            EndDate = englishEndDate,
                            IsActive = true,
                            CompanyId = company.Id,
                            CreatedAt = DateTime.UtcNow,
                            BillPrefixes = billPrefixes
                        };

                        _logger.LogInformation("Created Nepali fiscal year: StartNepali={StartNepali}, EndNepali={EndNepali}, StartEnglish={StartEnglish}, EndEnglish={EndEnglish}",
                            fiscalYear.StartDateNepali, fiscalYear.EndDateNepali,
                            fiscalYear.StartDate?.ToString("yyyy-MM-dd"), fiscalYear.EndDate?.ToString("yyyy-MM-dd"));
                    }
                    else
                    {
                        throw new Exception("Invalid Nepali date format. Expected format: YYYY-MM-DD");
                    }
                }
                else
                {
                    // ===== ENGLISH FISCAL YEAR =====
                    DateTime startDate = company.FiscalYearStartDateEnglish ?? DateTime.UtcNow;
                    DateTime endDate = startDate.AddYears(1).AddDays(-1);
                    string fiscalYearName = $"{startDate.Year}/{((startDate.Year + 1) % 100).ToString("D2")}";

                    fiscalYear = new FiscalYear
                    {
                        Id = Guid.NewGuid(),
                        Name = fiscalYearName,
                        DateFormat = DateFormatEnum.English,
                        StartDate = startDate,
                        EndDate = endDate,
                        StartDateNepali = null,
                        EndDateNepali = null,
                        IsActive = true,
                        CompanyId = company.Id,
                        CreatedAt = DateTime.UtcNow,
                        BillPrefixes = billPrefixes
                    };
                }

                // Check if fiscal year already exists
                var existingFiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.CompanyId == company.Id && f.Name == fiscalYear.Name);

                if (existingFiscalYear != null)
                {
                    _logger.LogInformation("Using existing fiscal year {FiscalYearName}", fiscalYear.Name);
                    return;
                }

                _context.FiscalYears.Add(fiscalYear);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Created fiscal year {FiscalYearName} for company {CompanyId}",
                    fiscalYear.Name, company.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating default fiscal year for company {CompanyId}", company.Id);
                throw;
            }
        }

        public async Task CreateDefaultSettingsAsync(Guid companyId, Guid userId, Guid fiscalYearId)
        {
            try
            {
                // Call the SettingsService method with fiscal year ID
                await _settingsService.CreateDefaultSettingsAsync(
                    companyId,
                    userId,
                    fiscalYearId);

                _logger.LogInformation("Default settings created successfully for company {CompanyId}", companyId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating default settings for company {CompanyId}", companyId);
                throw;
            }
        }

        private async Task CreateDefaultAccountGroupsAsync(Guid companyId)
        {
            try
            {
                // Use AccountGroupService to create ALL default groups
                await _accountGroupService.AddDefaultAccountGroupsAsync(companyId);

                // Now create default accounts
                await CreateDefaultAccountsAsync(companyId);

                _logger.LogInformation("Created default account groups and accounts for company {CompanyId}", companyId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating default account groups for company {CompanyId}", companyId);
                throw;
            }
        }

        // Helper method to create default accounts
        private async Task CreateDefaultAccountsAsync(Guid companyId)
        {
            try
            {
                _logger.LogInformation("Starting to create default accounts for company {CompanyId}", companyId);

                // 1. Create default cash account using injected service
                var cashAccount = await _accountService.AddDefaultCashAccountAsync(companyId);
                _logger.LogInformation("Created default cash account: {AccountName} (ID: {AccountId})",
                    cashAccount.Name, cashAccount.Id);

                // 2. Create default VAT account
                var vatAccount = await _accountService.AddDefaultVatAccountAsync(companyId);
                _logger.LogInformation("Created default VAT account: {AccountName} (ID: {AccountId})",
                    vatAccount.Name, vatAccount.Id);

                // 3. Create other default accounts
                var otherAccountsResult = await _accountService.AddOtherDefaultAccountsAsync(companyId);
                _logger.LogInformation("Created other default accounts for company {CompanyId}: {Result}",
                    companyId, otherAccountsResult);

                // Verify accounts were created
                var createdAccounts = await _context.Accounts
                    .Where(a => a.CompanyId == companyId && a.IsDefaultAccount)
                    .ToListAsync();

                _logger.LogInformation("Total {Count} default accounts created for company {CompanyId}",
                    createdAccounts.Count, companyId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating default accounts for company {CompanyId}", companyId);
                throw;
            }
        }

        private async Task CreateDefaultItemConfigurationsAsync(Guid companyId)
        {
            try
            {
                // Create default category using CategoryService
                await _categoryService.AddDefaultCategoryAsync(companyId);

                await _iitemCompanyService.AddDefaultItemCompanyAsync(companyId);
                await _mainUnitService.AddDefaultMainUnitsAsync(companyId);

                await _unitService.AddDefaultUnitsAsync(companyId);
                await _mainUnitService.AddDefaultMainUnitsAsync(companyId);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Created default item configurations for company {CompanyId}", companyId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating default item configurations for company {CompanyId}", companyId);
                throw;
            }
        }

        private async Task CreateDefaultStoreAndRackAsync(Guid companyId)
        {
            try
            {
                // Create default store
                var store = new Store
                {
                    Id = Guid.NewGuid(),
                    Name = "Main",
                    Description = "Default main store",
                    CompanyId = companyId,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Stores.Add(store);
                await _context.SaveChangesAsync();

                // Create default rack for the store
                var rack = new Rack
                {
                    Id = Guid.NewGuid(),
                    Name = "Default",
                    Description = "Default rack",
                    StoreId = store.Id,
                    CompanyId = companyId,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Racks.Add(rack);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Created default store and rack for company {CompanyId}", companyId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating default store and rack for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<Company> GetCompanyByIdAsync(Guid id)
        {
            var company = await _context.Companies
                .Include(c => c.Owner)
                .Include(c => c.Users)
                .Include(c => c.FiscalYears)
                .Include(c => c.Settings)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (company == null)
            {
                _logger.LogWarning("Company not found: {CompanyId}", id);
            }

            return company;
        }

        public async Task<Company> GetCompanyByNameAsync(string name)
        {
            try
            {
                var company = await _context.Companies
                    .Include(c => c.Owner)
                    .Include(c => c.FiscalYears)
                    .FirstOrDefaultAsync(c => c.Name.ToLower() == name.ToLower());

                if (company == null)
                {
                    _logger.LogDebug("Company not found with name: {CompanyName}", name);
                }

                _logger.LogInformation("Retrieved company by name: {CompanyName}", name);
                return company;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting company by name: {CompanyName}", name);
                throw;
            }
        }

        public async Task<List<Company>> GetUserCompaniesAsync(Guid userId)
        {
            _logger.LogInformation("Getting companies for user {UserId}", userId);

            var companies = await _context.Companies
                .Where(c => c.OwnerId == userId || c.Users.Any(u => u.Id == userId))
                .Include(c => c.FiscalYears.Where(f => f.IsActive))
                .Include(c => c.Owner)
                .ToListAsync();

            _logger.LogInformation("Found {Count} companies for user {UserId}", companies.Count, userId);
            return companies;
        }

        public async Task<List<Company>> GetCompaniesByOwnerAsync(Guid ownerId)
        {
            _logger.LogInformation("Getting companies owned by user {OwnerId}", ownerId);

            var companies = await _context.Companies
                .Where(c => c.OwnerId == ownerId)
                .Include(c => c.FiscalYears.Where(f => f.IsActive))
                .Include(c => c.Owner)
                .Include(c => c.Users)
                .ToListAsync();

            _logger.LogInformation("Found {Count} companies owned by user {OwnerId}",
                companies.Count, ownerId);
            return companies;
        }

        public async Task<List<Company>> GetCompaniesByUserAsync(Guid userId)
        {
            _logger.LogInformation("Getting companies associated with user {UserId}", userId);

            var companies = await _context.Companies
                .Where(c => c.Users.Any(u => u.Id == userId))
                .Include(c => c.FiscalYears.Where(f => f.IsActive))
                .Include(c => c.Owner)
                .ToListAsync();

            _logger.LogInformation("Found {Count} companies associated with user {UserId}",
                companies.Count, userId);
            return companies;
        }

        public async Task<bool> AddUserToCompanyAsync(Guid companyId, Guid userId, Guid addedByUserId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var company = await _context.Companies
                    .Include(c => c.Users)
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                var user = await _context.Users.FindAsync(userId);

                if (company == null || user == null)
                {
                    _logger.LogWarning("Company {CompanyId} or User {UserId} not found",
                        companyId, userId);
                    return false;
                }

                // Check if user is already in company
                if (company.Users.Any(u => u.Id == userId))
                {
                    _logger.LogWarning("User {UserId} already has access to company {CompanyId}",
                        userId, companyId);
                    return false;
                }

                // Check if adder has permission (owner or admin)
                if (company.OwnerId != addedByUserId)
                {
                    var adder = await _context.Users.FindAsync(addedByUserId);
                    if (adder == null || !adder.IsAdmin)
                    {
                        _logger.LogWarning(
                            "User {AddedByUserId} does not have permission to add users to company {CompanyId}",
                            addedByUserId, companyId);
                        return false;
                    }
                }

                company.Users.Add(user);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("User {UserId} added to company {CompanyId} by {AddedByUserId}",
                    userId, companyId, addedByUserId);
                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error adding user {UserId} to company {CompanyId}",
                    userId, companyId);
                throw;
            }
        }

        public async Task<bool> RemoveUserFromCompanyAsync(Guid companyId, Guid userId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var company = await _context.Companies
                    .Include(c => c.Users)
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                if (company == null)
                {
                    _logger.LogWarning("Company {CompanyId} not found", companyId);
                    return false;
                }

                var user = company.Users.FirstOrDefault(u => u.Id == userId);
                if (user == null)
                {
                    _logger.LogWarning("User {UserId} not found in company {CompanyId}",
                        userId, companyId);
                    return false;
                }

                // Cannot remove owner
                if (company.OwnerId == userId)
                {
                    _logger.LogWarning("Cannot remove owner {UserId} from company {CompanyId}",
                        userId, companyId);
                    return false;
                }

                company.Users.Remove(user);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("User {UserId} removed from company {CompanyId}",
                    userId, companyId);
                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error removing user {UserId} from company {CompanyId}",
                    userId, companyId);
                throw;
            }
        }

        public async Task<Company> UpdateCompanyAsync(Guid companyId, Company updatedCompany)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var company = await _context.Companies
                    .Include(c => c.Owner)
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                if (company == null)
                {
                    throw new Exception("Company not found");
                }

                // Update properties
                company.Name = updatedCompany.Name;
                company.Address = updatedCompany.Address;
                company.Country = updatedCompany.Country;
                company.State = updatedCompany.State;
                company.City = updatedCompany.City;
                company.Pan = updatedCompany.Pan;
                company.Phone = updatedCompany.Phone;
                company.Ward = updatedCompany.Ward;
                company.Email = updatedCompany.Email;
                company.TradeType = updatedCompany.TradeType;
                company.DateFormat = updatedCompany.DateFormat;
                company.VatEnabled = updatedCompany.VatEnabled;
                company.StoreManagement = updatedCompany.StoreManagement;
                company.RenewalDate = updatedCompany.RenewalDate;
                company.FiscalYearStartDateNepali = updatedCompany.FiscalYearStartDateNepali;
                company.FiscalYearStartDateEnglish = updatedCompany.FiscalYearStartDateEnglish;

                company.UpdatedAt = DateTime.UtcNow;

                // Update attendance settings if provided
                if (updatedCompany.AttendanceSettings != null)
                {
                    company.AttendanceSettings = updatedCompany.AttendanceSettings;
                }

                // Update notification emails if email changed or owner changed
                if (company.Email != updatedCompany.Email ||
                    company.OwnerId != updatedCompany.OwnerId)
                {
                    company.NotificationEmails = await GenerateNotificationEmailsAsync(company);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("Company {CompanyId} updated successfully", companyId);
                return company;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error updating company {CompanyId}", companyId);
                throw;
            }
        }
        public async Task<bool> DeleteCompanyAsync(Guid companyId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                _logger.LogInformation("Starting deletion of company {CompanyId} and all associated data", companyId);

                // Get the company
                var company = await _context.Companies
                    .Include(c => c.Users)
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                if (company == null)
                {
                    _logger.LogWarning("Company {CompanyId} not found for deletion", companyId);
                    return false;
                }

                // STEP 1: Delete all transaction documents (these reference items, accounts, fiscal years)
                await DeleteTransactionDocumentsAsync(companyId);

                // STEP 2: Delete inventory transactions and stock data
                await DeleteInventoryTransactionsAsync(companyId);

                // STEP 3: Delete items and item-related data (these reference fiscal years)
                await DeleteItemsAndRelatedDataAsync(companyId);

                // STEP 4: Delete account balances (reference accounts and fiscal years)
                await DeleteAccountBalancesAsync(companyId);

                // STEP 5: Delete accounts (reference account groups and fiscal years)
                await DeleteAccountsAsync(companyId);

                // STEP 6: Delete account groups (reference fiscal years)
                await DeleteAccountGroupsAsync(companyId);

                // STEP 7: Delete settings (reference fiscal years)
                await DeleteSettingsAsync(companyId);

                // STEP 8: NOW delete fiscal years (no more dependencies)
                await DeleteFiscalYearsAsync(companyId);

                // STEP 9: Delete other master data
                await DeleteMasterDataAsync(companyId);

                // STEP 10: Delete stores and racks
                await DeleteStoresAndRacksAsync(companyId);

                // STEP 11: Remove company from users
                foreach (var user in company.Users.ToList())
                {
                    company.Users.Remove(user);
                }

                await _context.SaveChangesAsync();

                // STEP 12: Finally, delete the company itself
                _context.Companies.Remove(company);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                _logger.LogInformation("Successfully deleted company {CompanyId} and all associated data", companyId);
                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error deleting company {CompanyId}", companyId);
                throw;
            }
        }

        private async Task DeleteTransactionDocumentsAsync(Guid companyId)
        {
            _logger.LogInformation("Deleting transaction documents for company {CompanyId}", companyId);

            // Delete Sales Bills and their items
            var salesBills = await _context.SalesBills
                .Where(sb => sb.CompanyId == companyId)
                .Include(sb => sb.Items)
                .ToListAsync();

            if (salesBills.Any())
            {
                _context.SalesBills.RemoveRange(salesBills);
                _logger.LogInformation("Deleted {Count} sales bills", salesBills.Count);
            }

            // Delete Sales Returns
            var salesReturns = await _context.SalesReturns
                .Where(sr => sr.CompanyId == companyId)
                .Include(sr => sr.Items)
                .ToListAsync();

            if (salesReturns.Any())
            {
                _context.SalesReturns.RemoveRange(salesReturns);
                _logger.LogInformation("Deleted {Count} sales returns", salesReturns.Count);
            }

            // Delete Purchase Bills
            var purchaseBills = await _context.PurchaseBills
                .Where(pb => pb.CompanyId == companyId)
                .Include(pb => pb.Items)
                .ToListAsync();

            if (purchaseBills.Any())
            {
                _context.PurchaseBills.RemoveRange(purchaseBills);
                _logger.LogInformation("Deleted {Count} purchase bills", purchaseBills.Count);
            }

            // Delete Purchase Returns
            var purchaseReturns = await _context.PurchaseReturns
                .Where(pr => pr.CompanyId == companyId)
                .Include(pr => pr.Items)
                .ToListAsync();

            if (purchaseReturns.Any())
            {
                _context.PurchaseReturns.RemoveRange(purchaseReturns);
                _logger.LogInformation("Deleted {Count} purchase returns", purchaseReturns.Count);
            }

            // Delete Payments
            var payments = await _context.Payments
                .Where(p => p.CompanyId == companyId)
                .Include(p => p.PaymentEntries)
                .ToListAsync();

            if (payments.Any())
            {
                _context.Payments.RemoveRange(payments);
                _logger.LogInformation("Deleted {Count} payments", payments.Count);
            }

            // Delete Receipts
            var receipts = await _context.Receipts
                .Where(r => r.CompanyId == companyId)
                .Include(r => r.ReceiptEntries)
                .ToListAsync();

            if (receipts.Any())
            {
                _context.Receipts.RemoveRange(receipts);
                _logger.LogInformation("Deleted {Count} receipts", receipts.Count);
            }

            // Delete Journal Vouchers
            var journalVouchers = await _context.JournalVouchers
                .Where(jv => jv.CompanyId == companyId)
                .Include(jv => jv.JournalEntries)
                .ToListAsync();

            if (journalVouchers.Any())
            {
                _context.JournalVouchers.RemoveRange(journalVouchers);
                _logger.LogInformation("Deleted {Count} journal vouchers", journalVouchers.Count);
            }

            // Delete Credit Notes
            var creditNotes = await _context.CreditNotes
                .Where(cn => cn.CompanyId == companyId)
                .Include(cn => cn.CreditNoteEntries)
                .ToListAsync();

            if (creditNotes.Any())
            {
                _context.CreditNotes.RemoveRange(creditNotes);
                _logger.LogInformation("Deleted {Count} credit notes", creditNotes.Count);
            }

            // Delete Debit Notes
            var debitNotes = await _context.DebitNotes
                .Where(dn => dn.CompanyId == companyId)
                .Include(dn => dn.DebitNoteEntries)
                .ToListAsync();

            if (debitNotes.Any())
            {
                _context.DebitNotes.RemoveRange(debitNotes);
                _logger.LogInformation("Deleted {Count} debit notes", debitNotes.Count);
            }

            // Delete Sales Quotations
            var salesQuotations = await _context.SalesQuotations
                .Where(sq => sq.CompanyId == companyId)
                .Include(sq => sq.Items)
                .ToListAsync();

            if (salesQuotations.Any())
            {
                _context.SalesQuotations.RemoveRange(salesQuotations);
                _logger.LogInformation("Deleted {Count} sales quotations", salesQuotations.Count);
            }

            // Delete Transactions
            var transactions = await _context.Transactions
                .Where(t => t.CompanyId == companyId)
                .Include(t => t.TransactionItems)
                .ToListAsync();

            if (transactions.Any())
            {
                _context.Transactions.RemoveRange(transactions);
                _logger.LogInformation("Deleted {Count} transactions", transactions.Count);
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Completed deleting transaction documents for company {CompanyId}", companyId);
        }

        private async Task DeleteInventoryTransactionsAsync(Guid companyId)
        {
            _logger.LogInformation("Deleting inventory transactions for company {CompanyId}", companyId);

            // Delete Stock Adjustments
            var stockAdjustments = await _context.StockAdjustments
                .Where(sa => sa.CompanyId == companyId)
                .Include(sa => sa.Items)
                .ToListAsync();

            if (stockAdjustments.Any())
            {
                _context.StockAdjustments.RemoveRange(stockAdjustments);
                _logger.LogInformation("Deleted {Count} stock adjustments", stockAdjustments.Count);
            }

            // Delete Stock Entries
            var stockEntries = await _context.StockEntries
                .Where(se => se.Item.CompanyId == companyId)
                .ToListAsync();

            if (stockEntries.Any())
            {
                _context.StockEntries.RemoveRange(stockEntries);
                _logger.LogInformation("Deleted {Count} stock entries", stockEntries.Count);
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Completed deleting inventory transactions for company {CompanyId}", companyId);
        }

        private async Task DeleteItemsAndRelatedDataAsync(Guid companyId)
        {
            _logger.LogInformation("Deleting items and related data for company {CompanyId}", companyId);

            // First, get all items for this company
            var items = await _context.Items
                .Where(i => i.CompanyId == companyId)
                .ToListAsync();

            if (!items.Any())
            {
                _logger.LogInformation("No items found for company {CompanyId}", companyId);
                return;
            }

            var itemIds = items.Select(i => i.Id).ToList();

            // Delete Item Opening Stock by Fiscal Year
            var itemOpeningStocks = await _context.ItemOpeningStockByFiscalYear
                .Where(ios => itemIds.Contains(ios.ItemId))
                .ToListAsync();

            if (itemOpeningStocks.Any())
            {
                _context.ItemOpeningStockByFiscalYear.RemoveRange(itemOpeningStocks);
                _logger.LogInformation("Deleted {Count} item opening stocks", itemOpeningStocks.Count);
            }

            // Delete Item Closing Stock by Fiscal Year
            var itemClosingStocks = await _context.ItemClosingStockByFiscalYear
                .Where(ics => itemIds.Contains(ics.ItemId))
                .ToListAsync();

            if (itemClosingStocks.Any())
            {
                _context.ItemClosingStockByFiscalYear.RemoveRange(itemClosingStocks);
                _logger.LogInformation("Deleted {Count} item closing stocks", itemClosingStocks.Count);
            }

            // Delete Item Initial Opening Stock
            var initialOpeningStocks = await _context.Set<ItemInitialOpeningStock>()
                .Where(ios => itemIds.Contains(ios.ItemId))
                .ToListAsync();

            if (initialOpeningStocks.Any())
            {
                _context.Set<ItemInitialOpeningStock>().RemoveRange(initialOpeningStocks);
                _logger.LogInformation("Deleted {Count} item initial opening stocks", initialOpeningStocks.Count);
            }

            // Delete Item Compositions
            var itemCompositions = await _context.ItemCompositions
                .Where(ic => itemIds.Contains(ic.ItemId))
                .ToListAsync();

            if (itemCompositions.Any())
            {
                _context.ItemCompositions.RemoveRange(itemCompositions);
                _logger.LogInformation("Deleted {Count} item compositions", itemCompositions.Count);
            }

            await _context.SaveChangesAsync();

            // Finally, delete the items themselves
            _context.Items.RemoveRange(items);
            _logger.LogInformation("Deleted {Count} items", items.Count);

            await _context.SaveChangesAsync();
            _logger.LogInformation("Completed deleting items for company {CompanyId}", companyId);
        }

        private async Task DeleteAccountBalancesAsync(Guid companyId)
        {
            _logger.LogInformation("Deleting account balances for company {CompanyId}", companyId);

            // Delete Opening Balances by Fiscal Year
            var openingBalancesByFY = await _context.OpeningBalanceByFiscalYear
                .Where(ob => ob.CompanyId == companyId)
                .ToListAsync();

            if (openingBalancesByFY.Any())
            {
                _context.OpeningBalanceByFiscalYear.RemoveRange(openingBalancesByFY);
                _logger.LogInformation("Deleted {Count} opening balances by fiscal year", openingBalancesByFY.Count);
            }

            // Delete Closing Balances by Fiscal Year
            var closingBalancesByFY = await _context.ClosingBalanceByFiscalYear
                .Where(cb => cb.CompanyId == companyId)
                .ToListAsync();

            if (closingBalancesByFY.Any())
            {
                _context.ClosingBalanceByFiscalYear.RemoveRange(closingBalancesByFY);
                _logger.LogInformation("Deleted {Count} closing balances by fiscal year", closingBalancesByFY.Count);
            }

            // Delete Opening Balances
            var openingBalances = await _context.OpeningBalances
                .Where(ob => ob.CompanyId == companyId)
                .ToListAsync();

            if (openingBalances.Any())
            {
                _context.OpeningBalances.RemoveRange(openingBalances);
                _logger.LogInformation("Deleted {Count} opening balances", openingBalances.Count);
            }

            // Delete Initial Opening Balances
            var initialBalances = await _context.InitialOpeningBalances
                .Where(ib => ib.Account.CompanyId == companyId)
                .ToListAsync();

            if (initialBalances.Any())
            {
                _context.InitialOpeningBalances.RemoveRange(initialBalances);
                _logger.LogInformation("Deleted {Count} initial opening balances", initialBalances.Count);
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Completed deleting account balances for company {CompanyId}", companyId);
        }

        private async Task DeleteAccountsAsync(Guid companyId)
        {
            _logger.LogInformation("Deleting accounts for company {CompanyId}", companyId);

            var accounts = await _context.Accounts
                .Where(a => a.CompanyId == companyId)
                .ToListAsync();

            if (accounts.Any())
            {
                _context.Accounts.RemoveRange(accounts);
                _logger.LogInformation("Deleted {Count} accounts", accounts.Count);
                await _context.SaveChangesAsync();
            }

            _logger.LogInformation("Completed deleting accounts for company {CompanyId}", companyId);
        }

        private async Task DeleteAccountGroupsAsync(Guid companyId)
        {
            _logger.LogInformation("Deleting account groups for company {CompanyId}", companyId);

            var accountGroups = await _context.AccountGroups
                .Where(ag => ag.CompanyId == companyId)
                .ToListAsync();

            if (accountGroups.Any())
            {
                _context.AccountGroups.RemoveRange(accountGroups);
                _logger.LogInformation("Deleted {Count} account groups", accountGroups.Count);
                await _context.SaveChangesAsync();
            }

            _logger.LogInformation("Completed deleting account groups for company {CompanyId}", companyId);
        }

        private async Task DeleteSettingsAsync(Guid companyId)
        {
            _logger.LogInformation("Deleting settings for company {CompanyId}", companyId);

            var settings = await _context.CompanySettings
                .Where(s => s.CompanyId == companyId)
                .ToListAsync();

            if (settings.Any())
            {
                _context.CompanySettings.RemoveRange(settings);
                _logger.LogInformation("Deleted {Count} settings records", settings.Count);
                await _context.SaveChangesAsync();
            }

            _logger.LogInformation("Completed deleting settings for company {CompanyId}", companyId);
        }

        private async Task DeleteFiscalYearsAsync(Guid companyId)
        {
            _logger.LogInformation("Deleting fiscal years for company {CompanyId}", companyId);

            var fiscalYears = await _context.FiscalYears
                .Where(f => f.CompanyId == companyId)
                .ToListAsync();

            if (fiscalYears.Any())
            {
                _context.FiscalYears.RemoveRange(fiscalYears);
                _logger.LogInformation("Deleted {Count} fiscal years", fiscalYears.Count);
                await _context.SaveChangesAsync();
            }

            _logger.LogInformation("Completed deleting fiscal years for company {CompanyId}", companyId);
        }

        private async Task DeleteMasterDataAsync(Guid companyId)
        {
            _logger.LogInformation("Deleting master data for company {CompanyId}", companyId);

            // Delete Categories
            var categories = await _context.Categories
                .Where(c => c.CompanyId == companyId)
                .ToListAsync();

            if (categories.Any())
            {
                _context.Categories.RemoveRange(categories);
                _logger.LogInformation("Deleted {Count} categories", categories.Count);
            }

            // Delete Item Companies
            var itemCompanies = await _context.ItemCompanies
                .Where(ic => ic.CompanyId == companyId)
                .ToListAsync();

            if (itemCompanies.Any())
            {
                _context.ItemCompanies.RemoveRange(itemCompanies);
                _logger.LogInformation("Deleted {Count} item companies", itemCompanies.Count);
            }

            // Delete Units
            var units = await _context.Units
                .Where(u => u.CompanyId == companyId)
                .ToListAsync();

            if (units.Any())
            {
                _context.Units.RemoveRange(units);
                _logger.LogInformation("Deleted {Count} units", units.Count);
            }

            // Delete Main Units
            var mainUnits = await _context.MainUnits
                .Where(mu => mu.CompanyId == companyId)
                .ToListAsync();

            if (mainUnits.Any())
            {
                _context.MainUnits.RemoveRange(mainUnits);
                _logger.LogInformation("Deleted {Count} main units", mainUnits.Count);
            }

            // Delete Compositions
            var compositions = await _context.Compositions
                .Where(c => c.CompanyId == companyId)
                .ToListAsync();

            if (compositions.Any())
            {
                _context.Compositions.RemoveRange(compositions);
                _logger.LogInformation("Deleted {Count} compositions", compositions.Count);
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Completed deleting master data for company {CompanyId}", companyId);
        }

        private async Task DeleteStoresAndRacksAsync(Guid companyId)
        {
            _logger.LogInformation("Deleting stores and racks for company {CompanyId}", companyId);

            var stores = await _context.Stores
                .Where(s => s.CompanyId == companyId)
                .ToListAsync();

            if (stores.Any())
            {
                var storeIds = stores.Select(s => s.Id).ToList();
                var racks = await _context.Racks
                    .Where(r => storeIds.Contains(r.StoreId))
                    .ToListAsync();

                if (racks.Any())
                {
                    _context.Racks.RemoveRange(racks);
                    _logger.LogInformation("Deleted {Count} racks", racks.Count);
                }

                _context.Stores.RemoveRange(stores);
                _logger.LogInformation("Deleted {Count} stores", stores.Count);
                await _context.SaveChangesAsync();
            }

            _logger.LogInformation("Completed deleting stores and racks for company {CompanyId}", companyId);
        }


        public async Task<List<string>> GetNotificationEmailsAsync(Guid companyId)
        {
            var company = await _context.Companies
                .Include(c => c.Owner)
                .FirstOrDefaultAsync(c => c.Id == companyId);

            return company?.NotificationEmails ?? new List<string>();
        }

        private async Task<List<string>> GenerateNotificationEmailsAsync(Company company)
        {
            var notificationEmails = new List<string>();

            // Add company email if exists
            if (!string.IsNullOrEmpty(company.Email))
                notificationEmails.Add(company.Email);

            // Add owner's email
            var owner = await _context.Users.FindAsync(company.OwnerId);
            if (owner != null && !string.IsNullOrEmpty(owner.Email))
                notificationEmails.Add(owner.Email);

            // Remove duplicates and return
            return notificationEmails.Distinct().ToList();
        }


        public async Task<CompanyDataSizeDTO> GetCompanyDataSizeAsync(Guid companyId)
        {
            try
            {
                _logger.LogInformation("Calculating data size for company {CompanyId}", companyId);

                var company = await _context.Companies
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                if (company == null)
                {
                    throw new Exception("Company not found");
                }

                var tableSizes = new Dictionary<string, long>();
                var recordCounts = new Dictionary<string, int>();

                // Helper to count records and estimate size
                async Task<(int count, long size)> GetTableInfo<T>(IQueryable<T> query, string tableName) where T : class
                {
                    var count = await query.CountAsync();
                    // Estimate size: average row size estimation (you can adjust these values)
                    long estimatedSize = count * GetAverageRowSize(tableName);
                    return (count, estimatedSize);
                }

                // 1. Transaction Documents
                var salesBills = await _context.SalesBills
                    .Where(sb => sb.CompanyId == companyId)
                    .Include(sb => sb.Items)
                    .ToListAsync();
                var salesBillsCount = salesBills.Count;
                var salesBillsSize = salesBillsCount * 2048; // Estimate 2KB per sales bill with items
                tableSizes["SalesBills"] = salesBillsSize;
                recordCounts["SalesBills"] = salesBillsCount;

                var salesReturns = await _context.SalesReturns
                    .Where(sr => sr.CompanyId == companyId)
                    .Include(sr => sr.Items)
                    .ToListAsync();
                var salesReturnsCount = salesReturns.Count;
                tableSizes["SalesReturns"] = salesReturnsCount * 2048;
                recordCounts["SalesReturns"] = salesReturnsCount;

                var purchaseBills = await _context.PurchaseBills
                    .Where(pb => pb.CompanyId == companyId)
                    .Include(pb => pb.Items)
                    .ToListAsync();
                var purchaseBillsCount = purchaseBills.Count;
                tableSizes["PurchaseBills"] = purchaseBillsCount * 2048;
                recordCounts["PurchaseBills"] = purchaseBillsCount;

                var purchaseReturns = await _context.PurchaseReturns
                    .Where(pr => pr.CompanyId == companyId)
                    .Include(pr => pr.Items)
                    .ToListAsync();
                var purchaseReturnsCount = purchaseReturns.Count;
                tableSizes["PurchaseReturns"] = purchaseReturnsCount * 2048;
                recordCounts["PurchaseReturns"] = purchaseReturnsCount;

                var payments = await _context.Payments
                    .Where(p => p.CompanyId == companyId)
                    .Include(p => p.PaymentEntries)
                    .ToListAsync();
                var paymentsCount = payments.Count;
                tableSizes["Payments"] = paymentsCount * 1024;
                recordCounts["Payments"] = paymentsCount;

                var receipts = await _context.Receipts
                    .Where(r => r.CompanyId == companyId)
                    .Include(r => r.ReceiptEntries)
                    .ToListAsync();
                var receiptsCount = receipts.Count;
                tableSizes["Receipts"] = receiptsCount * 1024;
                recordCounts["Receipts"] = receiptsCount;

                var journalVouchers = await _context.JournalVouchers
                    .Where(jv => jv.CompanyId == companyId)
                    .Include(jv => jv.JournalEntries)
                    .ToListAsync();
                var journalVouchersCount = journalVouchers.Count;
                tableSizes["JournalVouchers"] = journalVouchersCount * 1024;
                recordCounts["JournalVouchers"] = journalVouchersCount;

                var creditNotes = await _context.CreditNotes
                    .Where(cn => cn.CompanyId == companyId)
                    .Include(cn => cn.CreditNoteEntries)
                    .ToListAsync();
                var creditNotesCount = creditNotes.Count;
                tableSizes["CreditNotes"] = creditNotesCount * 1024;
                recordCounts["CreditNotes"] = creditNotesCount;

                var debitNotes = await _context.DebitNotes
                    .Where(dn => dn.CompanyId == companyId)
                    .Include(dn => dn.DebitNoteEntries)
                    .ToListAsync();
                var debitNotesCount = debitNotes.Count;
                tableSizes["DebitNotes"] = debitNotesCount * 1024;
                recordCounts["DebitNotes"] = debitNotesCount;

                var salesQuotations = await _context.SalesQuotations
                    .Where(sq => sq.CompanyId == companyId)
                    .Include(sq => sq.Items)
                    .ToListAsync();
                var salesQuotationsCount = salesQuotations.Count;
                tableSizes["SalesQuotations"] = salesQuotationsCount * 1024;
                recordCounts["SalesQuotations"] = salesQuotationsCount;

                var transactions = await _context.Transactions
                    .Where(t => t.CompanyId == companyId)
                    .Include(t => t.TransactionItems)
                    .ToListAsync();
                var transactionsCount = transactions.Count;
                tableSizes["Transactions"] = transactionsCount * 1024;
                recordCounts["Transactions"] = transactionsCount;

                // 2. Inventory
                var stockAdjustments = await _context.StockAdjustments
                    .Where(sa => sa.CompanyId == companyId)
                    .Include(sa => sa.Items)
                    .ToListAsync();
                var stockAdjustmentsCount = stockAdjustments.Count;
                tableSizes["StockAdjustments"] = stockAdjustmentsCount * 1024;
                recordCounts["StockAdjustments"] = stockAdjustmentsCount;

                var stockEntries = await _context.StockEntries
                    .Where(se => se.Item.CompanyId == companyId)
                    .ToListAsync();
                var stockEntriesCount = stockEntries.Count;
                tableSizes["StockEntries"] = stockEntriesCount * 512;
                recordCounts["StockEntries"] = stockEntriesCount;

                // 3. Items
                var items = await _context.Items
                    .Where(i => i.CompanyId == companyId)
                    .ToListAsync();
                var itemsCount = items.Count;
                tableSizes["Items"] = itemsCount * 1024;
                recordCounts["Items"] = itemsCount;

                var itemOpeningStocks = await _context.ItemOpeningStockByFiscalYear
                    .Where(ios => items.Select(i => i.Id).Contains(ios.ItemId))
                    .ToListAsync();
                var itemOpeningStocksCount = itemOpeningStocks.Count;
                tableSizes["ItemOpeningStock"] = itemOpeningStocksCount * 512;
                recordCounts["ItemOpeningStock"] = itemOpeningStocksCount;

                var itemClosingStocks = await _context.ItemClosingStockByFiscalYear
                    .Where(ics => items.Select(i => i.Id).Contains(ics.ItemId))
                    .ToListAsync();
                var itemClosingStocksCount = itemClosingStocks.Count;
                tableSizes["ItemClosingStock"] = itemClosingStocksCount * 512;
                recordCounts["ItemClosingStock"] = itemClosingStocksCount;

                // 4. Accounts
                var accounts = await _context.Accounts
                    .Where(a => a.CompanyId == companyId)
                    .ToListAsync();
                var accountsCount = accounts.Count;
                tableSizes["Accounts"] = accountsCount * 1024;
                recordCounts["Accounts"] = accountsCount;

                var accountGroups = await _context.AccountGroups
                    .Where(ag => ag.CompanyId == companyId)
                    .ToListAsync();
                var accountGroupsCount = accountGroups.Count;
                tableSizes["AccountGroups"] = accountGroupsCount * 512;
                recordCounts["AccountGroups"] = accountGroupsCount;

                var openingBalances = await _context.OpeningBalances
                    .Where(ob => ob.CompanyId == companyId)
                    .ToListAsync();
                var openingBalancesCount = openingBalances.Count;
                tableSizes["OpeningBalances"] = openingBalancesCount * 512;
                recordCounts["OpeningBalances"] = openingBalancesCount;

                var closingBalances = await _context.ClosingBalanceByFiscalYear
                    .Where(cb => cb.CompanyId == companyId)
                    .ToListAsync();
                var closingBalancesCount = closingBalances.Count;
                tableSizes["ClosingBalances"] = closingBalancesCount * 512;
                recordCounts["ClosingBalances"] = closingBalancesCount;

                // 5. Master Data
                var categories = await _context.Categories
                    .Where(c => c.CompanyId == companyId)
                    .ToListAsync();
                var categoriesCount = categories.Count;
                tableSizes["Categories"] = categoriesCount * 256;
                recordCounts["Categories"] = categoriesCount;

                var units = await _context.Units
                    .Where(u => u.CompanyId == companyId)
                    .ToListAsync();
                var unitsCount = units.Count;
                tableSizes["Units"] = unitsCount * 256;
                recordCounts["Units"] = unitsCount;

                var mainUnits = await _context.MainUnits
                    .Where(mu => mu.CompanyId == companyId)
                    .ToListAsync();
                var mainUnitsCount = mainUnits.Count;
                tableSizes["MainUnits"] = mainUnitsCount * 256;
                recordCounts["MainUnits"] = mainUnitsCount;

                var itemCompanies = await _context.ItemCompanies
                    .Where(ic => ic.CompanyId == companyId)
                    .ToListAsync();
                var itemCompaniesCount = itemCompanies.Count;
                tableSizes["ItemCompanies"] = itemCompaniesCount * 256;
                recordCounts["ItemCompanies"] = itemCompaniesCount;

                var compositions = await _context.Compositions
                    .Where(c => c.CompanyId == companyId)
                    .ToListAsync();
                var compositionsCount = compositions.Count;
                tableSizes["Compositions"] = compositionsCount * 256;
                recordCounts["Compositions"] = compositionsCount;

                // 6. Stores & Racks
                var stores = await _context.Stores
                    .Where(s => s.CompanyId == companyId)
                    .ToListAsync();
                var storesCount = stores.Count;
                tableSizes["Stores"] = storesCount * 256;
                recordCounts["Stores"] = storesCount;

                var racks = await _context.Racks
                    .Where(r => r.CompanyId == companyId)
                    .ToListAsync();
                var racksCount = racks.Count;
                tableSizes["Racks"] = racksCount * 256;
                recordCounts["Racks"] = racksCount;

                // 7. Settings & Fiscal Years
                var settings = await _context.CompanySettings
                    .Where(s => s.CompanyId == companyId)
                    .ToListAsync();
                var settingsCount = settings.Count;
                tableSizes["Settings"] = settingsCount * 512;
                recordCounts["Settings"] = settingsCount;

                var fiscalYears = await _context.FiscalYears
                    .Where(f => f.CompanyId == companyId)
                    .ToListAsync();
                var fiscalYearsCount = fiscalYears.Count;
                tableSizes["FiscalYears"] = fiscalYearsCount * 512;
                recordCounts["FiscalYears"] = fiscalYearsCount;

                // Calculate totals
                var totalSize = tableSizes.Values.Sum();
                var totalRecords = recordCounts.Values.Sum();

                // Format size
                string formattedSize = FormatBytes(totalSize);

                var result = new CompanyDataSizeDTO
                {
                    CompanyId = companyId,
                    CompanyName = company.Name,
                    TotalSizeInBytes = totalSize,
                    TotalSizeFormatted = formattedSize,
                    TableSizes = tableSizes,
                    TotalRecords = totalRecords,
                    RecordCounts = recordCounts,
                    CalculatedAt = DateTime.UtcNow
                };

                _logger.LogInformation("Calculated data size for company {CompanyId}: {Size}",
                    companyId, formattedSize);

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating data size for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<List<CompanyDataSizeDTO>> GetAllCompaniesDataSizeAsync(Guid? userId = null)
        {
            try
            {
                _logger.LogInformation("Getting data sizes for all companies");

                var companiesQuery = _context.Companies.AsQueryable();

                if (userId.HasValue)
                {
                    companiesQuery = companiesQuery
                        .Where(c => c.OwnerId == userId.Value || c.Users.Any(u => u.Id == userId.Value));
                }

                var companies = await companiesQuery.ToListAsync();
                var result = new List<CompanyDataSizeDTO>();

                foreach (var company in companies)
                {
                    try
                    {
                        var companySize = await GetCompanyDataSizeAsync(company.Id);
                        result.Add(companySize);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to get data size for company {CompanyId}", company.Id);
                        // Add a basic entry with error info
                        result.Add(new CompanyDataSizeDTO
                        {
                            CompanyId = company.Id,
                            CompanyName = company.Name,
                            TotalSizeInBytes = -1,
                            TotalSizeFormatted = "Error calculating",
                            TableSizes = new Dictionary<string, long>(),
                            TotalRecords = -1,
                            RecordCounts = new Dictionary<string, int>(),
                            CalculatedAt = DateTime.UtcNow
                        });
                    }
                }

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all companies data sizes");
                throw;
            }
        }

        // Helper method to format bytes
        private string FormatBytes(long bytes)
        {
            string[] sizes = { "B", "KB", "MB", "GB", "TB" };
            double len = bytes;
            int order = 0;
            while (len >= 1024 && order < sizes.Length - 1)
            {
                order++;
                len = len / 1024;
            }
            return $"{len:0.##} {sizes[order]}";
        }

        // Helper method to estimate average row size for each table
        private int GetAverageRowSize(string tableName)
        {
            // These are estimates in bytes. Adjust based on your actual schema
            var sizes = new Dictionary<string, int>
    {
        // Transaction documents (larger due to JSON fields, multiple columns)
        { "SalesBills", 2048 },
        { "SalesReturns", 2048 },
        { "PurchaseBills", 2048 },
        { "PurchaseReturns", 2048 },
        { "Payments", 1024 },
        { "Receipts", 1024 },
        { "JournalVouchers", 1024 },
        { "CreditNotes", 1024 },
        { "DebitNotes", 1024 },
        { "SalesQuotations", 1024 },
        { "Transactions", 1024 },
        // Inventory
        { "StockAdjustments", 1024 },
        { "StockEntries", 512 },
        // Items
        { "Items", 1024 },
        { "ItemOpeningStock", 512 },
        { "ItemClosingStock", 512 },
        // Accounts
        { "Accounts", 1024 },
        { "AccountGroups", 512 },
        { "OpeningBalances", 512 },
        { "ClosingBalances", 512 },
        // Master Data
        { "Categories", 256 },
        { "Units", 256 },
        { "MainUnits", 256 },
        { "ItemCompanies", 256 },
        { "Compositions", 256 },
        // Stores
        { "Stores", 256 },
        { "Racks", 256 },
        // Settings
        { "Settings", 512 },
        { "FiscalYears", 512 }
    };

            return sizes.ContainsKey(tableName) ? sizes[tableName] : 512;
        }
    }
}


