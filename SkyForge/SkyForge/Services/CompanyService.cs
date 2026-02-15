using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Models.AccountGroupModel;
using SkyForge.Models.AccountModel;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.RackModel;
using SkyForge.Models.Retailer.CategoryModel;
using SkyForge.Models.Retailer.ItemCompanyModel;
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
                if (!string.IsNullOrEmpty(company.FiscalYearStartDate))
                {
                    // Try to parse the FiscalYearStartDate as a DateTime
                    // Assuming FiscalYearStartDate is in English format like "2024-04-01"
                    if (DateTime.TryParse(company.FiscalYearStartDate, out DateTime parsedDate))
                    {
                        company.CreatedAt = parsedDate;
                        _logger.LogInformation("Set CreatedAt to {CreatedAt} from FiscalYearStartDate {Date}",
                            company.CreatedAt, company.FiscalYearStartDate);
                    }
                    else
                    {
                        // If parsing fails, fall back to UtcNow
                        company.CreatedAt = DateTime.UtcNow;
                        _logger.LogWarning("Could not parse FiscalYearStartDate '{Date}' - using UtcNow instead",
                            company.FiscalYearStartDate);
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
                    !string.IsNullOrEmpty(company.FiscalYearStartDate))
                {
                    // NEPALI FISCAL YEAR
                    var parts = company.FiscalYearStartDate.Split('-');
                    if (parts.Length >= 3 &&
                        int.TryParse(parts[0], out int nepaliYear) &&
                        int.TryParse(parts[1], out int nepaliMonth) &&
                        int.TryParse(parts[2], out int nepaliDay))
                    {
                        string fiscalYearName = $"{nepaliYear}/{(nepaliYear + 1).ToString().Substring(2)}";

                        // Calculate Nepali end date
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

                        fiscalYear = new FiscalYear
                        {
                            Id = Guid.NewGuid(),
                            Name = fiscalYearName,
                            DateFormat = DateFormatEnum.Nepali,
                            StartDateNepali = company.FiscalYearStartDate,
                            EndDateNepali = nepaliEndDate,
                            StartDate = DateTime.MinValue,
                            EndDate = DateTime.MinValue,
                            IsActive = true,
                            CompanyId = company.Id,
                            CreatedAt = DateTime.UtcNow,
                            BillPrefixes = billPrefixes // Set the generated prefixes
                        };

                        _logger.LogInformation("Generated bill prefixes: {BillPrefixes}",
                            string.Join(", ", new string[] {
                            $"Sales: {billPrefixes.Sales}",
                            $"Purchase: {billPrefixes.Purchase}",
                            $"Payment: {billPrefixes.Payment}",
                            $"Receipt: {billPrefixes.Receipt}"
                            }));
                    }
                    else
                    {
                        throw new Exception("Invalid Nepali date format. Expected format: 2082-04-01");
                    }
                }
                else
                {
                    // ENGLISH FISCAL YEAR (default)
                    var startDate = DateTime.UtcNow;
                    var endDate = startDate.AddYears(1).AddDays(-1);
                    string fiscalYearName = $"{startDate.Year}/{endDate.Year.ToString().Substring(2)}";

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
                        BillPrefixes = billPrefixes // Set the generated prefixes
                    };

                    _logger.LogInformation("Generated bill prefixes: {BillPrefixes}",
                        string.Join(", ", new string[] {
                        $"Sales: {billPrefixes.Sales}",
                        $"Purchase: {billPrefixes.Purchase}",
                        $"Payment: {billPrefixes.Payment}",
                        $"Receipt: {billPrefixes.Receipt}"
                        }));
                }

                // Check if fiscal year already exists
                var existingFiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.CompanyId == company.Id && f.Name == fiscalYear.Name);

                if (existingFiscalYear != null)
                {
                    _logger.LogInformation("Using existing fiscal year {FiscalYearName} for company {CompanyId}",
                        fiscalYear.Name, company.Id);
                    return;
                }

                // Save the fiscal year
                _context.FiscalYears.Add(fiscalYear);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Created fiscal year {FiscalYearName} (ID: {FiscalYearId}) for company {CompanyId} with bill prefixes",
                    fiscalYear.Name, fiscalYear.Id, company.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating default fiscal year for company {CompanyId}", company.Id);
                throw;
            }
        }

        // private async Task CreateDefaultFiscalYearAsync(Company company)
        // {
        //     try
        //     {
        //         _logger.LogInformation("Creating default fiscal year for company {CompanyId}", company.Id);

        //         FiscalYear fiscalYear;

        //         if (company.DateFormat == DateFormatEnum.Nepali &&
        //             !string.IsNullOrEmpty(company.FiscalYearStartDate))
        //         {
        //             // NEPALI FISCAL YEAR
        //             var parts = company.FiscalYearStartDate.Split('-');
        //             if (parts.Length >= 3 &&
        //                 int.TryParse(parts[0], out int nepaliYear) &&
        //                 int.TryParse(parts[1], out int nepaliMonth) &&
        //                 int.TryParse(parts[2], out int nepaliDay))
        //             {
        //                 // Generate fiscal year name: "2082/83"
        //                 string fiscalYearName = $"{nepaliYear}/{(nepaliYear + 1).ToString().Substring(2)}";

        //                 // Calculate Nepali end date: One day before the anniversary
        //                 int endYear = nepaliYear + 1;
        //                 int endMonth = nepaliMonth;
        //                 int endDay = nepaliDay - 1;

        //                 // Handle day underflow
        //                 if (endDay < 1)
        //                 {
        //                     endMonth -= 1;
        //                     if (endMonth < 1)
        //                     {
        //                         endMonth = 12;
        //                         endYear -= 1;
        //                     }
        //                     int[] nepaliMonthDays = new int[] { 31, 31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30 };
        //                     endDay = nepaliMonthDays[endMonth - 1];
        //                 }

        //                 string nepaliEndDate = $"{endYear:0000}-{endMonth:00}-{endDay:00}";

        //                 fiscalYear = new FiscalYear
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     Name = fiscalYearName,
        //                     DateFormat = DateFormatEnum.Nepali,
        //                     StartDateNepali = company.FiscalYearStartDate,
        //                     EndDateNepali = nepaliEndDate,
        //                     StartDate = DateTime.MinValue,
        //                     EndDate = DateTime.MinValue,
        //                     IsActive = true,
        //                     CompanyId = company.Id,
        //                     CreatedAt = DateTime.UtcNow
        //                 };

        //                 _logger.LogInformation("Creating Nepali fiscal year {FiscalYearName} from {StartDate} to {EndDate}",
        //                     fiscalYearName, company.FiscalYearStartDate, nepaliEndDate);
        //             }
        //             else
        //             {
        //                 throw new Exception("Invalid Nepali date format. Expected format: 2082-04-01");
        //             }
        //         }
        //         else
        //         {
        //             // ENGLISH FISCAL YEAR (default)
        //             var startDate = DateTime.UtcNow;
        //             var endDate = startDate.AddYears(1).AddDays(-1);
        //             string fiscalYearName = $"{startDate.Year}/{endDate.Year.ToString().Substring(2)}";

        //             fiscalYear = new FiscalYear
        //             {
        //                 Id = Guid.NewGuid(),
        //                 Name = fiscalYearName,
        //                 DateFormat = DateFormatEnum.English,
        //                 StartDate = startDate,
        //                 EndDate = endDate,
        //                 StartDateNepali = null,
        //                 EndDateNepali = null,
        //                 IsActive = true,
        //                 CompanyId = company.Id,
        //                 CreatedAt = DateTime.UtcNow
        //             };

        //             _logger.LogInformation("Creating English fiscal year {FiscalYearName} from {StartDate} to {EndDate}",
        //                 fiscalYearName, startDate.ToString("yyyy-MM-dd"), endDate.ToString("yyyy-MM-dd"));
        //         }

        //         // Check if fiscal year already exists
        //         var existingFiscalYear = await _context.FiscalYears
        //             .FirstOrDefaultAsync(f => f.CompanyId == company.Id && f.Name == fiscalYear.Name);

        //         if (existingFiscalYear != null)
        //         {
        //             _logger.LogInformation("Using existing fiscal year {FiscalYearName} for company {CompanyId}",
        //                 fiscalYear.Name, company.Id);
        //             return;
        //         }

        //         // Save the fiscal year
        //         _context.FiscalYears.Add(fiscalYear);
        //         await _context.SaveChangesAsync();

        //         _logger.LogInformation("Created fiscal year {FiscalYearName} (ID: {FiscalYearId}) for company {CompanyId}",
        //             fiscalYear.Name, fiscalYear.Id, company.Id);
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error creating default fiscal year for company {CompanyId}", company.Id);
        //         throw;
        //     }
        // }

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
                company.FiscalYearStartDate = updatedCompany.FiscalYearStartDate;

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

                // Get the company with all related data
                var company = await _context.Companies
                    .Include(c => c.FiscalYears)
                    .Include(c => c.AccountGroups)
                    .Include(c => c.Users)
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                if (company == null)
                {
                    _logger.LogWarning("Company {CompanyId} not found for deletion", companyId);
                    return false;
                }

                // 1. Delete all fiscal years and their associated data
                await DeleteFiscalYearsAndRelatedDataAsync(companyId);

                // 2. Delete accounts FIRST (dependents of account groups)
                var accounts = await _context.Accounts
                    .Where(a => a.CompanyId == companyId)
                    .ToListAsync();

                if (accounts.Count > 0)
                {
                    _context.Accounts.RemoveRange(accounts);
                    _logger.LogInformation("Deleted {Count} accounts for company {CompanyId}",
                        accounts.Count, companyId);
                }

                // 3. Now delete account groups (parent of accounts)
                var accountGroups = await _context.AccountGroups
                    .Where(ag => ag.CompanyId == companyId)
                    .ToListAsync();

                if (accountGroups.Count > 0)
                {
                    _context.AccountGroups.RemoveRange(accountGroups);
                    _logger.LogInformation("Deleted {Count} account groups for company {CompanyId}",
                        accountGroups.Count, companyId);
                }

                // 4. Delete categories
                var categories = await _context.Categories
                    .Where(c => c.CompanyId == companyId)
                    .ToListAsync();

                if (categories.Count > 0)
                {
                    _context.Categories.RemoveRange(categories);
                    _logger.LogInformation("Deleted {Count} categories for company {CompanyId}",
                        categories.Count, companyId);
                }

                // 5. Delete item companies
                var itemCompanies = await _context.ItemCompanies
                    .Where(ic => ic.CompanyId == companyId)
                    .ToListAsync();

                if (itemCompanies.Count > 0)
                {
                    _context.ItemCompanies.RemoveRange(itemCompanies);
                    _logger.LogInformation("Deleted {Count} item companies for company {CompanyId}",
                        itemCompanies.Count, companyId);
                }

                // 6. Delete units
                var units = await _context.Units
                    .Where(u => u.CompanyId == companyId)
                    .ToListAsync();

                if (units.Count > 0)
                {
                    _context.Units.RemoveRange(units);
                    _logger.LogInformation("Deleted {Count} units for company {CompanyId}",
                        units.Count, companyId);
                }

                // 7. Delete main units
                var mainUnits = await _context.MainUnits
                    .Where(mu => mu.CompanyId == companyId)
                    .ToListAsync();

                if (mainUnits.Count > 0)
                {
                    _context.MainUnits.RemoveRange(mainUnits);
                    _logger.LogInformation("Deleted {Count} main units for company {CompanyId}",
                        mainUnits.Count, companyId);
                }

                // 8. Delete stores
                var stores = await _context.Stores
                    .Where(s => s.CompanyId == companyId)
                    .ToListAsync();

                if (stores.Count > 0)
                {
                    // First delete racks associated with these stores
                    var storeIds = stores.Select(s => s.Id).ToList();
                    var racks = await _context.Racks
                        .Where(r => storeIds.Contains(r.StoreId))
                        .ToListAsync();

                    if (racks.Count > 0)
                    {
                        _context.Racks.RemoveRange(racks);
                        _logger.LogInformation("Deleted {Count} racks for company {CompanyId}",
                            racks.Count, companyId);
                    }

                    _context.Stores.RemoveRange(stores);
                    _logger.LogInformation("Deleted {Count} stores for company {CompanyId}",
                        stores.Count, companyId);
                }

                // 10. Remove company from all users (but don't delete users)
                foreach (var user in company.Users.ToList())
                {
                    company.Users.Remove(user);
                }

                // 11. Finally, delete the company itself
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

        private async Task DeleteFiscalYearsAndRelatedDataAsync(Guid companyId)
        {
            try
            {
                _logger.LogInformation("Deleting fiscal years and related data for company {CompanyId}", companyId);

                // Get all fiscal years for this company
                var fiscalYears = await _context.FiscalYears
                    .Where(f => f.CompanyId == companyId)
                    .ToListAsync();

                if (fiscalYears.Count == 0)
                {
                    _logger.LogInformation("No fiscal years found for company {CompanyId}", companyId);
                    return;
                }

                foreach (var fiscalYear in fiscalYears)
                {
                    // Clear OriginalFiscalYearId from all accounts
                    var accountsWithThisFiscalYear = await _context.Accounts
                        .Where(a => a.OriginalFiscalYearId == fiscalYear.Id)
                        .ToListAsync();

                    if (accountsWithThisFiscalYear.Count > 0)
                    {
                        foreach (var account in accountsWithThisFiscalYear)
                        {
                            account.OriginalFiscalYearId = null;
                        }
                        _logger.LogInformation("Cleared OriginalFiscalYearId from {Count} accounts for fiscal year {FiscalYearId}",
                            accountsWithThisFiscalYear.Count, fiscalYear.Id);
                    }

                    // Delete opening balances by fiscal year
                    var openingBalances = await _context.OpeningBalances
                        .Where(ob => ob.FiscalYearId == fiscalYear.Id)
                        .ToListAsync();

                    if (openingBalances.Count > 0)
                    {
                        _context.OpeningBalances.RemoveRange(openingBalances);
                        _logger.LogInformation("Deleted {Count} opening balances for fiscal year {FiscalYearId}",
                            openingBalances.Count, fiscalYear.Id);
                    }

                    // Delete closing balances by fiscal year
                    var closingBalances = await _context.ClosingBalanceByFiscalYear
                        .Where(cb => cb.FiscalYearId == fiscalYear.Id)
                        .ToListAsync();

                    if (closingBalances.Count > 0)
                    {
                        _context.ClosingBalanceByFiscalYear.RemoveRange(closingBalances);
                        _logger.LogInformation("Deleted {Count} closing balances for fiscal year {FiscalYearId}",
                            closingBalances.Count, fiscalYear.Id);
                    }

                    // Delete opening balance by fiscal year
                    var openingBalanceByFiscalYears = await _context.OpeningBalanceByFiscalYear
                        .Where(obf => obf.FiscalYearId == fiscalYear.Id)
                        .ToListAsync();

                    if (openingBalanceByFiscalYears.Count > 0)
                    {
                        _context.OpeningBalanceByFiscalYear.RemoveRange(openingBalanceByFiscalYears);
                        _logger.LogInformation("Deleted {Count} opening balance by fiscal year records for fiscal year {FiscalYearId}",
                            openingBalanceByFiscalYears.Count, fiscalYear.Id);
                    }
                }

                // Save changes to clear foreign key references BEFORE deleting fiscal years
                await _context.SaveChangesAsync();

                // Now it's safe to delete all fiscal years
                _context.FiscalYears.RemoveRange(fiscalYears);
                _logger.LogInformation("Deleted {Count} fiscal years for company {CompanyId}",
                    fiscalYears.Count, companyId);

                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting fiscal years and related data for company {CompanyId}", companyId);
                throw;
            }
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
    }
}


