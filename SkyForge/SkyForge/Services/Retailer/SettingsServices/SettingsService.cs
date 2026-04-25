using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto.RetailerDto;
using SkyForge.Models.Retailer.SettingsModel;
using SkyForge.Services.Retailer.SettingsServices;
using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;

namespace SkyForge.Services.Retailer.SettingsServices
{
    public class SettingsService : ISettingsService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<SettingsService> _logger;

        public SettingsService(ApplicationDbContext context, ILogger<SettingsService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<Settings> GetCompanySettingsAsync(Guid companyId)
        {
            try
            {
                var settings = await _context.CompanySettings
                    .Include(s => s.Company)
                    .Include(s => s.User)
                    .Include(s => s.FiscalYear)
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId);

                if (settings == null)
                {
                    _logger.LogWarning("Settings not found for company {CompanyId}", companyId);
                }

                return settings;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting settings for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<Settings> GetSettingsByCompanyAndUserAsync(Guid companyId, Guid userId, Guid? fiscalYearId = null)
        {
            try
            {
                var query = _context.CompanySettings
                    .Include(s => s.Company)
                    .Include(s => s.User)
                    .Include(s => s.FiscalYear)
                    .Where(s => s.CompanyId == companyId && s.UserId == userId);

                if (fiscalYearId.HasValue)
                {
                    query = query.Where(s => s.FiscalYearId == fiscalYearId);
                }

                var settings = await query.FirstOrDefaultAsync();

                if (settings == null)
                {
                    _logger.LogDebug("Settings not found for company {CompanyId}, user {UserId}, fiscal year {FiscalYearId}",
                        companyId, userId, fiscalYearId);
                }

                return settings;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting settings for company {CompanyId}, user {UserId}", companyId, userId);
                throw;
            }
        }

        public async Task<Settings> CreateOrUpdateSettingsAsync(Settings settings)
        {
            try
            {
                var existingSettings = await _context.CompanySettings
                    .FirstOrDefaultAsync(s => s.CompanyId == settings.CompanyId &&
                                             s.UserId == settings.UserId &&
                                             s.FiscalYearId == settings.FiscalYearId);

                if (existingSettings != null)
                {
                    // Update existing settings
                    existingSettings.RoundOffSales = settings.RoundOffSales;
                    existingSettings.RoundOffPurchase = settings.RoundOffPurchase;
                    existingSettings.RoundOffSalesReturn = settings.RoundOffSalesReturn;
                    existingSettings.RoundOffPurchaseReturn = settings.RoundOffPurchaseReturn;
                    existingSettings.DisplayTransactions = settings.DisplayTransactions;
                    existingSettings.DisplayTransactionsForPurchase = settings.DisplayTransactionsForPurchase;
                    existingSettings.DisplayTransactionsForSalesReturn = settings.DisplayTransactionsForSalesReturn;
                    existingSettings.DisplayTransactionsForPurchaseReturn = settings.DisplayTransactionsForPurchaseReturn;
                    existingSettings.StoreManagement = settings.StoreManagement;
                    existingSettings.Value = settings.Value;
                    existingSettings.UpdatedAt = DateTime.UtcNow;

                    _context.CompanySettings.Update(existingSettings);
                    await _context.SaveChangesAsync();

                    _logger.LogInformation("Settings updated for company {CompanyId}, user {UserId}",
                        settings.CompanyId, settings.UserId);

                    return existingSettings;
                }
                else
                {
                    // Create new settings
                    settings.CreatedAt = DateTime.UtcNow;
                    _context.CompanySettings.Add(settings);
                    await _context.SaveChangesAsync();

                    _logger.LogInformation("Settings created for company {CompanyId}, user {UserId}",
                        settings.CompanyId, settings.UserId);

                    return settings;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating/updating settings for company {CompanyId}", settings.CompanyId);
                throw;
            }
        }

        public async Task<T> GetValueAsync<T>(Guid companyId, string key) where T : class
        {
            try
            {
                var settings = await GetCompanySettingsAsync(companyId);
                if (settings == null || string.IsNullOrEmpty(settings.Value))
                {
                    _logger.LogDebug("Settings or value not found for company {CompanyId}, key {Key}", companyId, key);
                    return default;
                }

                try
                {
                    var jsonObject = JsonSerializer.Deserialize<JsonElement>(settings.Value);
                    if (jsonObject.TryGetProperty(key, out var valueElement))
                    {
                        return JsonSerializer.Deserialize<T>(valueElement.GetRawText());
                    }
                    else
                    {
                        _logger.LogDebug("Key {Key} not found in settings for company {CompanyId}", key, companyId);
                        return default;
                    }
                }
                catch (JsonException ex)
                {
                    _logger.LogError(ex, "JSON deserialization error for company {CompanyId}, key {Key}", companyId, key);
                    return default;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting value for company {CompanyId}, key {Key}", companyId, key);
                throw;
            }
        }

        public async Task SetValueAsync<T>(Guid companyId, string key, T value) where T : class
        {
            try
            {
                var settings = await GetCompanySettingsAsync(companyId);
                if (settings == null)
                {
                    throw new KeyNotFoundException($"Settings not found for company ID: {companyId}");
                }

                Dictionary<string, object> values;
                if (!string.IsNullOrEmpty(settings.Value))
                {
                    try
                    {
                        values = JsonSerializer.Deserialize<Dictionary<string, object>>(settings.Value);
                    }
                    catch (JsonException ex)
                    {
                        _logger.LogWarning(ex, "Failed to deserialize settings value for company {CompanyId}. Creating new dictionary.", companyId);
                        values = new Dictionary<string, object>();
                    }
                }
                else
                {
                    values = new Dictionary<string, object>();
                }

                values[key] = value;
                settings.Value = JsonSerializer.Serialize(values);
                settings.UpdatedAt = DateTime.UtcNow;

                _context.CompanySettings.Update(settings);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Value set for company {CompanyId}, key {Key}", companyId, key);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error setting value for company {CompanyId}, key {Key}", companyId, key);
                throw;
            }
        }

        public async Task<Settings> CreateDefaultSettingsAsync(Guid companyId, Guid userId, Guid fiscalYearId)
        {
            try
            {
                _logger.LogInformation("Creating default settings for company {CompanyId}, user {UserId}, fiscal year {FiscalYearId}",
                    companyId, userId, fiscalYearId);

                // Check if company exists
                var company = await _context.Companies.FindAsync(companyId);
                if (company == null)
                {
                    throw new KeyNotFoundException($"Company with ID {companyId} not found");
                }

                // Check if user exists
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    throw new KeyNotFoundException($"User with ID {userId} not found");
                }

                // Check if fiscal year exists
                var fiscalYear = await _context.FiscalYears.FindAsync(fiscalYearId);
                if (fiscalYear == null)
                {
                    throw new KeyNotFoundException($"Fiscal year with ID {fiscalYearId} not found");
                }

                // Check if settings already exist
                var existingSettings = await GetSettingsByCompanyAndUserAsync(companyId, userId, fiscalYearId);
                if (existingSettings != null)
                {
                    _logger.LogInformation("Settings already exist for company {CompanyId}, user {UserId}", companyId, userId);
                    return existingSettings;
                }

                // Create default settings
                var defaultSettings = new Settings
                {
                    CompanyId = companyId,
                    UserId = userId,
                    FiscalYearId = fiscalYearId,
                    RoundOffSales = false,
                    RoundOffPurchase = false,
                    RoundOffSalesReturn = false,
                    RoundOffPurchaseReturn = false,
                    DisplayTransactions = false,
                    DisplayTransactionsForPurchase = false,
                    DisplayTransactionsForSalesReturn = false,
                    DisplayTransactionsForPurchaseReturn = false,
                    StoreManagement = false,
                    Value = "{}", // Empty JSON object
                    CreatedAt = DateTime.UtcNow
                };

                _context.CompanySettings.Add(defaultSettings);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Default settings created for company {CompanyId}, user {UserId}", companyId, userId);

                return defaultSettings;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating default settings for company {CompanyId}", companyId);
                throw;
            }
        }

        // Additional helper methods

        public async Task<bool> SettingsExistAsync(Guid companyId, Guid userId, Guid? fiscalYearId = null)
        {
            try
            {
                var query = _context.CompanySettings
                    .Where(s => s.CompanyId == companyId && s.UserId == userId);

                if (fiscalYearId.HasValue)
                {
                    query = query.Where(s => s.FiscalYearId == fiscalYearId);
                }

                return await query.AnyAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking if settings exist for company {CompanyId}, user {UserId}", companyId, userId);
                throw;
            }
        }

        public async Task<Settings> UpdateSpecificSettingsAsync(Guid companyId, Guid userId, Action<Settings> updateAction)
        {
            try
            {
                var settings = await GetSettingsByCompanyAndUserAsync(companyId, userId);
                if (settings == null)
                {
                    throw new KeyNotFoundException($"Settings not found for company {companyId} and user {userId}");
                }

                updateAction(settings);
                settings.UpdatedAt = DateTime.UtcNow;

                _context.CompanySettings.Update(settings);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Specific settings updated for company {CompanyId}, user {UserId}", companyId, userId);

                return settings;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating specific settings for company {CompanyId}, user {UserId}", companyId, userId);
                throw;
            }
        }

        public async Task<Dictionary<string, object>> GetAllValuesAsync(Guid companyId)
        {
            try
            {
                var settings = await GetCompanySettingsAsync(companyId);
                if (settings == null || string.IsNullOrEmpty(settings.Value))
                {
                    return new Dictionary<string, object>();
                }

                try
                {
                    return JsonSerializer.Deserialize<Dictionary<string, object>>(settings.Value);
                }
                catch (JsonException ex)
                {
                    _logger.LogError(ex, "Failed to deserialize all values for company {CompanyId}", companyId);
                    return new Dictionary<string, object>();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all values for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<bool> RemoveValueAsync(Guid companyId, string key)
        {
            try
            {
                var settings = await GetCompanySettingsAsync(companyId);
                if (settings == null || string.IsNullOrEmpty(settings.Value))
                {
                    return false;
                }

                try
                {
                    var values = JsonSerializer.Deserialize<Dictionary<string, object>>(settings.Value);
                    if (values.ContainsKey(key))
                    {
                        values.Remove(key);
                        settings.Value = JsonSerializer.Serialize(values);
                        settings.UpdatedAt = DateTime.UtcNow;

                        _context.CompanySettings.Update(settings);
                        await _context.SaveChangesAsync();

                        _logger.LogInformation("Value removed for company {CompanyId}, key {Key}", companyId, key);
                        return true;
                    }
                    return false;
                }
                catch (JsonException ex)
                {
                    _logger.LogError(ex, "JSON deserialization error for company {CompanyId}", companyId);
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing value for company {CompanyId}, key {Key}", companyId, key);
                throw;
            }
        }

        public async Task<SettingsDataDTO> GetRoundOffSalesSettingsAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetRoundOffSalesSettingsAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}",
                    companyId, userId, fiscalYearId);

                // Get company with renewal date and fiscal year
                var company = await _context.Companies
                    .Where(c => c.Id == companyId)
                    .Select(c => new CompanyInfoDTO
                    {
                        RenewalDate = c.RenewalDate,
                        DateFormat = c.DateFormat.ToString()
                    })
                    .FirstOrDefaultAsync();

                if (company == null)
                {
                    throw new ArgumentException("Company not found");
                }

                // Get current fiscal year
                var currentFiscalYear = await _context.FiscalYears
                    .Where(f => f.Id == fiscalYearId && f.CompanyId == companyId)
                    .Select(f => new FiscalYearDTO
                    {
                        Id = f.Id,
                        Name = f.Name,
                        StartDate = f.StartDate,
                        EndDate = f.EndDate,
                        DateFormat = f.DateFormat.ToString(),
                        IsActive = f.IsActive
                    })
                    .FirstOrDefaultAsync();

                // Get settings using existing method
                var settingsEntity = await GetSettingsByCompanyAndUserAsync(companyId, userId, fiscalYearId);

                UserInfoDTO settings;

                if (settingsEntity == null)
                {
                    // Default settings matching Node.js code
                    settings = new UserInfoDTO
                    {
                        RoundOffSales = false,
                        RoundOffPurchase = false,
                        DisplayTransactions = false,
                        StoreManagement = false
                    };
                }
                else
                {
                    // Parse settings from entity
                    settings = new UserInfoDTO
                    {
                        RoundOffSales = settingsEntity.RoundOffSales,
                        RoundOffPurchase = settingsEntity.RoundOffPurchase,
                        DisplayTransactions = settingsEntity.DisplayTransactions,
                        StoreManagement = settingsEntity.StoreManagement
                    };
                }

                // Get user with preferences and roles
                var user = await _context.Users
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                {
                    throw new ArgumentException("User not found");
                }

                bool isAdmin = user.IsAdmin;
                string userRole = "User";

                if (isAdmin)
                {
                    userRole = "Admin";
                }
                else if (user.UserRoles != null)
                {
                    var primaryRole = user.UserRoles.FirstOrDefault(ur => ur.IsPrimary);
                    if (primaryRole?.Role != null)
                    {
                        userRole = primaryRole.Role.Name;
                    }
                }

                // Get theme from user preferences
                string theme = user.Preferences?.Theme.ToString() ?? "light";

                // Get current company name
                var companyName = await _context.Companies
                    .Where(c => c.Id == companyId)
                    .Select(c => c.Name)
                    .FirstOrDefaultAsync();

                // Prepare response
                var response = new SettingsDataDTO
                {
                    Company = company,
                    CurrentFiscalYear = currentFiscalYear,
                    Settings = settings,
                    CurrentCompanyName = companyName ?? string.Empty,
                    User = new UserInfoDTO
                    {
                        Id = user.Id,
                        Role = userRole,
                        IsAdmin = isAdmin,
                        Preferences = new UserPreferencesDTO
                        {
                            Theme = theme
                        }
                    },
                    Theme = theme,
                    IsAdminOrSupervisor = isAdmin || userRole == "Supervisor"
                };

                _logger.LogInformation("Successfully fetched settings for Company: {CompanyId}, User: {UserId}", companyId, userId);
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetRoundOffSalesSettingsAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }


        // public async Task<Settings> UpdateRoundOffSalesSettingsAsync(Guid companyId, Guid fiscalYearId, Guid userId, bool roundOffSales)
        // {
        //     try
        //     {
        //         _logger.LogInformation("UpdateRoundOffSalesSettingsAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}, RoundOffSales: {RoundOffSales}",
        //             companyId, userId, fiscalYearId, roundOffSales);

        //         // Try to find existing settings
        //         var existingSettings = await _context.CompanySettings
        //             .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
        //                                      s.UserId == userId &&
        //                                      s.FiscalYearId == fiscalYearId);

        //         Settings settings;

        //         if (existingSettings == null)
        //         {
        //             // Create new settings if not exists
        //             settings = new Settings
        //             {
        //                 Id = Guid.NewGuid(),
        //                 CompanyId = companyId,
        //                 UserId = userId,
        //                 FiscalYearId = fiscalYearId,
        //                 RoundOffSales = roundOffSales,
        //                 RoundOffPurchase = false,
        //                 RoundOffSalesReturn = false,
        //                 RoundOffPurchaseReturn = false,
        //                 DisplayTransactions = false,
        //                 DisplayTransactionsForPurchase = false,
        //                 DisplayTransactionsForSalesReturn = false,
        //                 DisplayTransactionsForPurchaseReturn = false,
        //                 StoreManagement = false,
        //                 Value = "{}",
        //                 CreatedAt = DateTime.UtcNow
        //             };

        //             _context.CompanySettings.Add(settings);
        //             _logger.LogInformation("Created new settings for company {CompanyId}, user {UserId}", companyId, userId);
        //         }
        //         else
        //         {
        //             // Update existing settings
        //             existingSettings.RoundOffSales = roundOffSales;
        //             existingSettings.UpdatedAt = DateTime.UtcNow;
        //             settings = existingSettings;

        //             _context.CompanySettings.Update(existingSettings);
        //             _logger.LogInformation("Updated existing settings for company {CompanyId}, user {UserId}", companyId, userId);
        //         }

        //         await _context.SaveChangesAsync();

        //         _logger.LogInformation("Successfully updated roundOffSales setting for Company: {CompanyId}, User: {UserId}", companyId, userId);

        //         return settings;
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error in UpdateRoundOffSalesSettingsAsync for Company: {CompanyId}", companyId);
        //         throw;
        //     }
        // }

        public async Task<Settings> UpdateRoundOffSalesSettingsAsync(Guid companyId, Guid fiscalYearId, Guid userId, bool roundOffSales)
        {
            try
            {
                _logger.LogInformation($"Updating RoundOffSales to {roundOffSales} for Company {companyId}, User {userId}, FiscalYear {fiscalYearId}");

                // Find existing settings
                var settings = await _context.CompanySettings
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                             s.UserId == userId &&
                                             s.FiscalYearId == fiscalYearId);

                if (settings == null)
                {
                    _logger.LogInformation("Creating new settings record");
                    settings = new Settings
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        UserId = userId,
                        FiscalYearId = fiscalYearId,
                        RoundOffSales = roundOffSales,
                        RoundOffPurchase = false,
                        RoundOffSalesReturn = false,
                        RoundOffPurchaseReturn = false,
                        DisplayTransactions = false,
                        DisplayTransactionsForPurchase = false,
                        DisplayTransactionsForSalesReturn = false,
                        DisplayTransactionsForPurchaseReturn = false,
                        StoreManagement = false,
                        Value = "{}",
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.CompanySettings.Add(settings);
                }
                else
                {
                    _logger.LogInformation($"Updating existing settings. Current value: {settings.RoundOffSales}, New value: {roundOffSales}");
                    settings.RoundOffSales = roundOffSales;
                    settings.UpdatedAt = DateTime.UtcNow;

                    // Force Entity Framework to recognize the change
                    _context.Entry(settings).Property(x => x.RoundOffSales).IsModified = true;
                }

                // Save changes
                var result = await _context.SaveChangesAsync();
                _logger.LogInformation($"SaveChangesAsync result: {result} rows affected");

                // Verify the update
                var verifySettings = await _context.CompanySettings
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.Id == settings.Id);

                _logger.LogInformation($"Verification - RoundOffSales is now: {verifySettings?.RoundOffSales}");

                return settings;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating RoundOffSales settings");
                throw;
            }
        }

        public async Task<SalesReturnSettingsDataDTO> GetRoundOffSalesReturnSettingsAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetRoundOffSalesReturnSettingsAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}",
                    companyId, userId, fiscalYearId);

                // Get settings using existing method
                var settingsEntity = await GetSettingsByCompanyAndUserAsync(companyId, userId, fiscalYearId);

                object settingsForSalesReturn;

                if (settingsEntity == null)
                {
                    // Default settings matching Node.js code
                    settingsForSalesReturn = new
                    {
                        roundOffSales = false,
                        roundOffPurchase = false,
                        roundOffSalesReturn = false,
                        displayTransactions = false,
                        displayTransactionsForSalesReturn = false,
                        displayTransactionsForPurchase = false
                    };
                }
                else
                {
                    // Parse settings from entity
                    settingsForSalesReturn = new
                    {
                        roundOffSales = settingsEntity.RoundOffSales,
                        roundOffPurchase = settingsEntity.RoundOffPurchase,
                        roundOffSalesReturn = settingsEntity.RoundOffSalesReturn,
                        displayTransactions = settingsEntity.DisplayTransactions,
                        displayTransactionsForSalesReturn = settingsEntity.DisplayTransactionsForSalesReturn,
                        displayTransactionsForPurchase = settingsEntity.DisplayTransactionsForPurchase
                    };
                }

                // Get user with preferences and roles
                var user = await _context.Users
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                {
                    throw new ArgumentException("User not found");
                }

                bool isAdmin = user.IsAdmin;
                string userRole = "User";

                if (isAdmin)
                {
                    userRole = "Admin";
                }
                else if (user.UserRoles != null)
                {
                    var primaryRole = user.UserRoles.FirstOrDefault(ur => ur.IsPrimary);
                    if (primaryRole?.Role != null)
                    {
                        userRole = primaryRole.Role.Name;
                    }
                }

                // Get theme from user preferences
                string theme = user.Preferences?.Theme.ToString() ?? "light";

                // Get current company name
                var companyName = await _context.Companies
                    .Where(c => c.Id == companyId)
                    .Select(c => c.Name)
                    .FirstOrDefaultAsync();

                // Prepare response
                var response = new SalesReturnSettingsDataDTO
                {
                    SettingsForSalesReturn = settingsForSalesReturn,
                    CurrentCompanyName = companyName ?? string.Empty,
                    User = new UserInfoDTO
                    {
                        Id = user.Id,
                        Name = user.Name,
                        Email = user.Email,
                        IsAdmin = isAdmin,
                        Role = userRole
                    },
                    Preferences = new UserPreferencesDTO
                    {
                        Theme = theme
                    },
                    IsAdminOrSupervisor = isAdmin || userRole == "Supervisor"
                };

                _logger.LogInformation("Successfully fetched sales return settings for Company: {CompanyId}, User: {UserId}", companyId, userId);
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetRoundOffSalesReturnSettingsAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<Settings> UpdateRoundOffSalesReturnSettingsAsync(Guid companyId, Guid fiscalYearId, Guid userId, bool roundOffSalesReturn)
        {
            try
            {
                _logger.LogInformation("UpdateRoundOffSalesReturnSettingsAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}, RoundOffSalesReturn: {RoundOffSalesReturn}",
                    companyId, userId, fiscalYearId, roundOffSalesReturn);

                // Try to find existing settings
                var existingSettings = await _context.CompanySettings
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                             s.UserId == userId &&
                                             s.FiscalYearId == fiscalYearId);

                Settings settings;

                if (existingSettings == null)
                {
                    // Create new settings if not exists
                    settings = new Settings
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        UserId = userId,
                        FiscalYearId = fiscalYearId,
                        RoundOffSales = false,
                        RoundOffPurchase = false,
                        RoundOffSalesReturn = roundOffSalesReturn,
                        RoundOffPurchaseReturn = false,
                        DisplayTransactions = false,
                        DisplayTransactionsForPurchase = false,
                        DisplayTransactionsForSalesReturn = false,
                        DisplayTransactionsForPurchaseReturn = false,
                        StoreManagement = false,
                        Value = "{}",
                        CreatedAt = DateTime.UtcNow
                    };

                    _context.CompanySettings.Add(settings);
                    _logger.LogInformation("Created new settings for company {CompanyId}, user {UserId}", companyId, userId);
                }
                else
                {
                    // Update existing settings
                    existingSettings.RoundOffSalesReturn = roundOffSalesReturn;
                    existingSettings.UpdatedAt = DateTime.UtcNow;
                    settings = existingSettings;

                    _context.CompanySettings.Update(existingSettings);
                    _logger.LogInformation("Updated existing settings for company {CompanyId}, user {UserId}", companyId, userId);
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("Successfully updated roundOffSalesReturn setting for Company: {CompanyId}, User: {UserId}", companyId, userId);

                return settings;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in UpdateRoundOffSalesReturnSettingsAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<PurchaseSettingsDataDTO> GetRoundOffPurchaseSettingsAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetRoundOffPurchaseSettingsAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}",
                    companyId, userId, fiscalYearId);

                // Get settings using existing method
                var settingsEntity = await GetSettingsByCompanyAndUserAsync(companyId, userId, fiscalYearId);

                object settingsForPurchase;

                if (settingsEntity == null)
                {
                    // Default settings matching Node.js code
                    settingsForPurchase = new
                    {
                        roundOffSales = false,
                        roundOffPurchase = false,
                        displayTransactions = false
                    };
                }
                else
                {
                    // Parse settings from entity
                    settingsForPurchase = new
                    {
                        roundOffSales = settingsEntity.RoundOffSales,
                        roundOffPurchase = settingsEntity.RoundOffPurchase,
                        displayTransactions = settingsEntity.DisplayTransactions
                    };
                }

                // Get user with preferences and roles
                var user = await _context.Users
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                {
                    throw new ArgumentException("User not found");
                }

                bool isAdmin = user.IsAdmin;
                string userRole = "User";

                if (isAdmin)
                {
                    userRole = "Admin";
                }
                else if (user.UserRoles != null)
                {
                    var primaryRole = user.UserRoles.FirstOrDefault(ur => ur.IsPrimary);
                    if (primaryRole?.Role != null)
                    {
                        userRole = primaryRole.Role.Name;
                    }
                }

                // Get theme from user preferences
                string theme = user.Preferences?.Theme.ToString() ?? "light";

                // Get current company name
                var companyName = await _context.Companies
                    .Where(c => c.Id == companyId)
                    .Select(c => c.Name)
                    .FirstOrDefaultAsync();

                // Prepare response
                var response = new PurchaseSettingsDataDTO
                {
                    SettingsForPurchase = settingsForPurchase,
                    CurrentCompanyName = companyName ?? string.Empty,
                    User = new UserInfoDTO
                    {
                        Id = user.Id,
                        Role = userRole,
                        IsAdmin = isAdmin,
                        Preferences = new UserPreferencesDTO
                        {
                            Theme = theme
                        }
                    },
                    Theme = theme,
                    IsAdminOrSupervisor = isAdmin || userRole == "Supervisor"
                };

                _logger.LogInformation("Successfully fetched purchase settings for Company: {CompanyId}, User: {UserId}", companyId, userId);
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetRoundOffPurchaseSettingsAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<Settings> UpdateRoundOffPurchaseSettingsAsync(Guid companyId, Guid fiscalYearId, Guid userId, bool roundOffPurchase)
        {
            try
            {
                _logger.LogInformation("UpdateRoundOffPurchaseSettingsAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}, RoundOffPurchase: {RoundOffPurchase}",
                    companyId, userId, fiscalYearId, roundOffPurchase);

                // Try to find existing settings
                var existingSettings = await _context.CompanySettings
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                             s.UserId == userId &&
                                             s.FiscalYearId == fiscalYearId);

                Settings settings;

                if (existingSettings == null)
                {
                    // Create new settings if not exists
                    settings = new Settings
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        UserId = userId,
                        FiscalYearId = fiscalYearId,
                        RoundOffSales = false,
                        RoundOffPurchase = roundOffPurchase,
                        RoundOffSalesReturn = false,
                        RoundOffPurchaseReturn = false,
                        DisplayTransactions = false,
                        DisplayTransactionsForPurchase = false,
                        DisplayTransactionsForSalesReturn = false,
                        DisplayTransactionsForPurchaseReturn = false,
                        StoreManagement = false,
                        Value = "{}",
                        CreatedAt = DateTime.UtcNow
                    };

                    _context.CompanySettings.Add(settings);
                    _logger.LogInformation("Created new settings for company {CompanyId}, user {UserId}", companyId, userId);
                }
                else
                {
                    // Update existing settings
                    existingSettings.RoundOffPurchase = roundOffPurchase;
                    existingSettings.UpdatedAt = DateTime.UtcNow;
                    settings = existingSettings;

                    _context.CompanySettings.Update(existingSettings);
                    _logger.LogInformation("Updated existing settings for company {CompanyId}, user {UserId}", companyId, userId);
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("Successfully updated roundOffPurchase setting for Company: {CompanyId}, User: {UserId}", companyId, userId);

                return settings;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in UpdateRoundOffPurchaseSettingsAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<PurchaseReturnSettingsDataDTO> GetRoundOffPurchaseReturnSettingsAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetRoundOffPurchaseReturnSettingsAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}",
                    companyId, userId, fiscalYearId);

                // Get settings using existing method
                var settingsEntity = await GetSettingsByCompanyAndUserAsync(companyId, userId, fiscalYearId);

                object settingsForPurchaseReturn;

                if (settingsEntity == null)
                {
                    // Default settings matching Node.js code
                    settingsForPurchaseReturn = new
                    {
                        roundOffSales = false,
                        roundOffPurchase = false,
                        roundOffPurchaseReturn = false,
                        displayTransactions = false
                    };
                }
                else
                {
                    // Parse settings from entity
                    settingsForPurchaseReturn = new
                    {
                        roundOffSales = settingsEntity.RoundOffSales,
                        roundOffPurchase = settingsEntity.RoundOffPurchase,
                        roundOffPurchaseReturn = settingsEntity.RoundOffPurchaseReturn,
                        displayTransactions = settingsEntity.DisplayTransactions
                    };
                }

                // Get user with preferences and roles
                var user = await _context.Users
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                {
                    throw new ArgumentException("User not found");
                }

                bool isAdmin = user.IsAdmin;
                string userRole = "User";

                if (isAdmin)
                {
                    userRole = "Admin";
                }
                else if (user.UserRoles != null)
                {
                    var primaryRole = user.UserRoles.FirstOrDefault(ur => ur.IsPrimary);
                    if (primaryRole?.Role != null)
                    {
                        userRole = primaryRole.Role.Name;
                    }
                }

                // Get theme from user preferences
                string theme = user.Preferences?.Theme.ToString() ?? "light";

                // Get current company name
                var companyName = await _context.Companies
                    .Where(c => c.Id == companyId)
                    .Select(c => c.Name)
                    .FirstOrDefaultAsync();

                // Prepare response
                var response = new PurchaseReturnSettingsDataDTO
                {
                    SettingsForPurchaseReturn = settingsForPurchaseReturn,
                    CurrentCompanyName = companyName ?? string.Empty,
                    User = new UserInfoDTO
                    {
                        Id = user.Id,
                        Name = user.Name,
                        Email = user.Email,
                        IsAdmin = isAdmin,
                        Role = userRole
                    },
                    Preferences = new UserPreferencesDTO
                    {
                        Theme = theme
                    },
                    IsAdminOrSupervisor = isAdmin || userRole == "Supervisor"
                };

                _logger.LogInformation("Successfully fetched purchase return settings for Company: {CompanyId}, User: {UserId}", companyId, userId);
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetRoundOffPurchaseReturnSettingsAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<Settings> UpdateRoundOffPurchaseReturnSettingsAsync(Guid companyId, Guid fiscalYearId, Guid userId, bool roundOffPurchaseReturn)
        {
            try
            {
                _logger.LogInformation("UpdateRoundOffPurchaseReturnSettingsAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}, RoundOffPurchaseReturn: {RoundOffPurchaseReturn}",
                    companyId, userId, fiscalYearId, roundOffPurchaseReturn);

                // Try to find existing settings
                var existingSettings = await _context.CompanySettings
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                             s.UserId == userId &&
                                             s.FiscalYearId == fiscalYearId);

                Settings settings;

                if (existingSettings == null)
                {
                    // Create new settings if not exists
                    settings = new Settings
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        UserId = userId,
                        FiscalYearId = fiscalYearId,
                        RoundOffSales = false,
                        RoundOffPurchase = false,
                        RoundOffSalesReturn = false,
                        RoundOffPurchaseReturn = roundOffPurchaseReturn,
                        DisplayTransactions = false,
                        DisplayTransactionsForPurchase = false,
                        DisplayTransactionsForSalesReturn = false,
                        DisplayTransactionsForPurchaseReturn = false,
                        StoreManagement = false,
                        Value = "{}",
                        CreatedAt = DateTime.UtcNow
                    };

                    _context.CompanySettings.Add(settings);
                    _logger.LogInformation("Created new settings for company {CompanyId}, user {UserId}", companyId, userId);
                }
                else
                {
                    // Update existing settings
                    existingSettings.RoundOffPurchaseReturn = roundOffPurchaseReturn;
                    existingSettings.UpdatedAt = DateTime.UtcNow;
                    settings = existingSettings;

                    _context.CompanySettings.Update(existingSettings);
                    _logger.LogInformation("Updated existing settings for company {CompanyId}, user {UserId}", companyId, userId);
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("Successfully updated roundOffPurchaseReturn setting for Company: {CompanyId}, User: {UserId}", companyId, userId);

                return settings;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in UpdateRoundOffPurchaseReturnSettingsAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<DisplaySalesTransactionsDataDTO> GetDisplaySalesTransactionsAsync(Guid companyId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetDisplaySalesTransactionsAsync called for Company: {CompanyId}, User: {UserId}",
                    companyId, userId);

                // Validate inputs
                if (companyId == Guid.Empty || userId == Guid.Empty)
                {
                    throw new ArgumentException("Invalid company or user information.");
                }

                // Get settings without fiscal year filter (matches Node.js behavior)
                var settingsEntity = await _context.CompanySettings
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId && s.UserId == userId);

                // If settings exist, return the displayTransactions setting; otherwise, return false
                bool displayTransactions = settingsEntity != null && settingsEntity.DisplayTransactions;

                // Get user with roles
                var user = await _context.Users
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                {
                    throw new ArgumentException("User not found");
                }

                bool isAdmin = user.IsAdmin;
                string userRole = "User";

                if (isAdmin)
                {
                    userRole = "Admin";
                }
                else if (user.UserRoles != null)
                {
                    var primaryRole = user.UserRoles.FirstOrDefault(ur => ur.IsPrimary);
                    if (primaryRole?.Role != null)
                    {
                        userRole = primaryRole.Role.Name;
                    }
                }

                // Get current company name
                var companyName = await _context.Companies
                    .Where(c => c.Id == companyId)
                    .Select(c => c.Name)
                    .FirstOrDefaultAsync();

                // Prepare response
                var response = new DisplaySalesTransactionsDataDTO
                {
                    DisplayTransactions = displayTransactions,
                    CurrentCompanyName = companyName ?? string.Empty,
                    Company = companyId,
                    User = new UserInfoDTO
                    {
                        Id = user.Id,
                        Name = user.Name,
                        Email = user.Email,
                        IsAdmin = isAdmin,
                        Role = userRole
                    },
                    IsAdminOrSupervisor = isAdmin || userRole == "Supervisor"
                };

                _logger.LogInformation("Successfully fetched display transactions setting for Company: {CompanyId}, User: {UserId}, Value: {DisplayTransactions}",
                    companyId, userId, displayTransactions);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetDisplaySalesTransactionsAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<Settings> UpdateDisplayTransactionsForSalesAsync(Guid companyId, Guid userId, Guid fiscalYearId, bool displayTransactions)
        {
            try
            {
                _logger.LogInformation("UpdateDisplayTransactionsForSalesAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}, DisplayTransactions: {DisplayTransactions}",
                    companyId, userId, fiscalYearId, displayTransactions);

                // Validate inputs
                if (companyId == Guid.Empty || userId == Guid.Empty)
                {
                    throw new ArgumentException("Company ID and User ID are required");
                }

                // FIX: Find existing settings WITH fiscal year filter (matching GET method)
                var existingSettings = await _context.CompanySettings
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                             s.UserId == userId &&
                                             s.FiscalYearId == fiscalYearId);

                Settings settings;

                if (existingSettings == null)
                {
                    _logger.LogInformation("No existing settings found for fiscal year {FiscalYearId}, creating new record", fiscalYearId);

                    // Create new settings if not exists
                    settings = new Settings
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        UserId = userId,
                        FiscalYearId = fiscalYearId,
                        RoundOffSales = false,
                        RoundOffPurchase = false,
                        RoundOffSalesReturn = false,
                        RoundOffPurchaseReturn = false,
                        DisplayTransactions = displayTransactions,
                        DisplayTransactionsForPurchase = false,
                        DisplayTransactionsForSalesReturn = false,
                        DisplayTransactionsForPurchaseReturn = false,
                        StoreManagement = false,
                        Value = "{}",
                        CreatedAt = DateTime.UtcNow
                    };

                    _context.CompanySettings.Add(settings);
                    _logger.LogInformation("Created new settings record with DisplayTransactions = {DisplayTransactions}", displayTransactions);
                }
                else
                {
                    _logger.LogInformation("Found existing settings with ID: {SettingsId}, Current DisplayTransactions: {CurrentValue}, New Value: {NewValue}",
                        existingSettings.Id, existingSettings.DisplayTransactions, displayTransactions);

                    // Update existing settings
                    existingSettings.DisplayTransactions = displayTransactions;
                    existingSettings.UpdatedAt = DateTime.UtcNow;
                    settings = existingSettings;

                    _logger.LogInformation("Updated DisplayTransactions from {OldValue} to {NewValue}",
                        existingSettings.DisplayTransactions, displayTransactions);
                }

                // Save changes and get the number of affected rows
                var saveResult = await _context.SaveChangesAsync();
                _logger.LogInformation("SaveChangesAsync completed. Rows affected: {RowsAffected}", saveResult);

                // Verify the update by fetching the record again
                var verifySettings = await _context.CompanySettings
                    .FirstOrDefaultAsync(s => s.Id == settings.Id);

                _logger.LogInformation("Verification - Settings ID: {SettingsId}, DisplayTransactions: {DisplayTransactions}",
                    verifySettings?.Id, verifySettings?.DisplayTransactions);

                return settings;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in UpdateDisplayTransactionsForSalesAsync");
                throw;
            }
        }

        public async Task<DisplaySalesReturnTransactionsDataDTO> GetDisplaySalesReturnTransactionsAsync(Guid companyId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetDisplaySalesReturnTransactionsAsync called for Company: {CompanyId}, User: {UserId}",
                    companyId, userId);

                // Validate inputs
                if (companyId == Guid.Empty || userId == Guid.Empty)
                {
                    throw new ArgumentException("Invalid company or user information.");
                }

                // Get settings without fiscal year filter (matches Node.js behavior)
                var settingsEntity = await _context.CompanySettings
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId && s.UserId == userId);

                // If settings exist, return the displayTransactionsForSalesReturn setting; otherwise, return false
                bool displayTransactionsForSalesReturn = settingsEntity != null && settingsEntity.DisplayTransactionsForSalesReturn;

                // Get user with roles
                var user = await _context.Users
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                {
                    throw new ArgumentException("User not found");
                }

                bool isAdmin = user.IsAdmin;
                string userRole = "User";

                if (isAdmin)
                {
                    userRole = "Admin";
                }
                else if (user.UserRoles != null)
                {
                    var primaryRole = user.UserRoles.FirstOrDefault(ur => ur.IsPrimary);
                    if (primaryRole?.Role != null)
                    {
                        userRole = primaryRole.Role.Name;
                    }
                }

                // Get current company name
                var companyName = await _context.Companies
                    .Where(c => c.Id == companyId)
                    .Select(c => c.Name)
                    .FirstOrDefaultAsync();

                // Prepare user info
                var userInfo = new UserInfoDTO
                {
                    Id = user.Id,
                    Name = user.Name,
                    Email = user.Email,
                    IsAdmin = isAdmin,
                    Role = userRole,
                    Preferences = new UserPreferencesDTO
                    {
                        Theme = user.Preferences?.Theme.ToString() ?? "light"
                    }
                };

                // Prepare response
                var response = new DisplaySalesReturnTransactionsDataDTO
                {
                    DisplayTransactionsForSalesReturn = displayTransactionsForSalesReturn,
                    CurrentCompanyName = companyName ?? string.Empty,
                    Company = companyId,
                    User = userInfo,
                    IsAdminOrSupervisor = isAdmin || userRole == "Supervisor"
                };

                _logger.LogInformation("Successfully fetched display transactions for sales return setting for Company: {CompanyId}, User: {UserId}, Value: {DisplayTransactionsForSalesReturn}",
                    companyId, userId, displayTransactionsForSalesReturn);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetDisplaySalesReturnTransactionsAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }
        public async Task<Settings> UpdateDisplayTransactionsForSalesReturnAsync(Guid companyId, Guid userId, Guid fiscalYearId, bool displayTransactionsForSalesReturn)
        {
            try
            {
                _logger.LogInformation("UpdateDisplayTransactionsForSalesReturnAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}, DisplayTransactionsForSalesReturn: {DisplayTransactionsForSalesReturn}",
                    companyId, userId, fiscalYearId, displayTransactionsForSalesReturn);

                // Validate inputs
                if (companyId == Guid.Empty || userId == Guid.Empty)
                {
                    throw new ArgumentException("Company ID and User ID are required");
                }

                // Find and update the settings with fiscal year filter (matches Node.js behavior)
                var existingSettings = await _context.CompanySettings
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                             s.UserId == userId &&
                                             s.FiscalYearId == fiscalYearId);

                Settings settings;

                if (existingSettings == null)
                {
                    // Create new settings if not exists
                    settings = new Settings
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        UserId = userId,
                        FiscalYearId = fiscalYearId,
                        RoundOffSales = false,
                        RoundOffPurchase = false,
                        RoundOffSalesReturn = false,
                        RoundOffPurchaseReturn = false,
                        DisplayTransactions = false,
                        DisplayTransactionsForPurchase = false,
                        DisplayTransactionsForSalesReturn = displayTransactionsForSalesReturn,
                        DisplayTransactionsForPurchaseReturn = false,
                        StoreManagement = false,
                        Value = "{}",
                        CreatedAt = DateTime.UtcNow
                    };

                    _context.CompanySettings.Add(settings);
                    _logger.LogInformation("Created new settings for company {CompanyId}, user {UserId}", companyId, userId);
                }
                else
                {
                    // Update existing settings
                    existingSettings.DisplayTransactionsForSalesReturn = displayTransactionsForSalesReturn;
                    existingSettings.UpdatedAt = DateTime.UtcNow;
                    settings = existingSettings;

                    _context.CompanySettings.Update(existingSettings);
                    _logger.LogInformation("Updated display transactions for sales return setting for company {CompanyId}, user {UserId}", companyId, userId);
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("Successfully updated displayTransactionsForSalesReturn setting for Company: {CompanyId}, User: {UserId}", companyId, userId);

                return settings;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in UpdateDisplayTransactionsForSalesReturnAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<DisplayPurchaseTransactionsDataDTO> GetDisplayPurchaseTransactionsAsync(Guid companyId, Guid userId, Guid fiscalYearId)
        {
            try
            {
                _logger.LogInformation("GetDisplayPurchaseTransactionsAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}",
                    companyId, userId, fiscalYearId);

                // Validate inputs
                if (companyId == Guid.Empty || userId == Guid.Empty)
                {
                    throw new ArgumentException("Invalid company or user information.");
                }

                // Get fiscal year details
                var fiscalYear = await _context.FiscalYears
                    .Where(f => f.Id == fiscalYearId && f.CompanyId == companyId)
                    .Select(f => new FiscalYearDTO
                    {
                        Id = f.Id,
                        Name = f.Name,
                        StartDate = f.StartDate,
                        EndDate = f.EndDate
                    })
                    .FirstOrDefaultAsync();

                if (fiscalYear == null)
                {
                    throw new ArgumentException("Fiscal year not found");
                }

                // Get settings with fiscal year filter (matches Node.js behavior)
                var settingsEntity = await _context.CompanySettings
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                             s.UserId == userId &&
                                             s.FiscalYearId == fiscalYearId);

                // If settings exist, return the displayTransactionsForPurchase setting; otherwise, return false
                bool displayTransactionsForPurchase = settingsEntity != null && settingsEntity.DisplayTransactionsForPurchase;

                // Get user with roles
                var user = await _context.Users
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                {
                    throw new ArgumentException("User not found");
                }

                bool isAdmin = user.IsAdmin;
                string userRole = "User";

                if (isAdmin)
                {
                    userRole = "Admin";
                }
                else if (user.UserRoles != null)
                {
                    var primaryRole = user.UserRoles.FirstOrDefault(ur => ur.IsPrimary);
                    if (primaryRole?.Role != null)
                    {
                        userRole = primaryRole.Role.Name;
                    }
                }

                // Get current company name
                var companyName = await _context.Companies
                    .Where(c => c.Id == companyId)
                    .Select(c => c.Name)
                    .FirstOrDefaultAsync();

                // Prepare user info
                var userInfo = new UserInfoDTO
                {
                    Id = user.Id,
                    Name = user.Name,
                    Email = user.Email,
                    IsAdmin = isAdmin,
                    Role = userRole,
                    Preferences = new UserPreferencesDTO
                    {
                        Theme = user.Preferences?.Theme.ToString() ?? "light"
                    }
                };

                // Prepare response
                var response = new DisplayPurchaseTransactionsDataDTO
                {
                    DisplayTransactionsForPurchase = displayTransactionsForPurchase,
                    CurrentCompanyName = companyName ?? string.Empty,
                    Company = companyId,
                    FiscalYear = fiscalYear,
                    User = userInfo,
                    IsAdminOrSupervisor = isAdmin || userRole == "Supervisor"
                };

                _logger.LogInformation("Successfully fetched display transactions for purchase setting for Company: {CompanyId}, User: {UserId}, Value: {DisplayTransactionsForPurchase}",
                    companyId, userId, displayTransactionsForPurchase);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetDisplayPurchaseTransactionsAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<Settings> UpdateDisplayTransactionsForPurchaseAsync(Guid companyId, Guid userId, Guid fiscalYearId, bool displayTransactionsForPurchase)
        {
            try
            {
                _logger.LogInformation("UpdateDisplayTransactionsForPurchaseAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}, DisplayTransactionsForPurchase: {DisplayTransactionsForPurchase}",
                    companyId, userId, fiscalYearId, displayTransactionsForPurchase);

                // Validate inputs
                if (companyId == Guid.Empty || userId == Guid.Empty)
                {
                    throw new ArgumentException("Company ID and User ID are required");
                }

                // Find and update the settings with fiscal year filter (matches Node.js behavior)
                var existingSettings = await _context.CompanySettings
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                             s.UserId == userId &&
                                             s.FiscalYearId == fiscalYearId);

                Settings settings;

                if (existingSettings == null)
                {
                    // Create new settings if not exists
                    settings = new Settings
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        UserId = userId,
                        FiscalYearId = fiscalYearId,
                        RoundOffSales = false,
                        RoundOffPurchase = false,
                        RoundOffSalesReturn = false,
                        RoundOffPurchaseReturn = false,
                        DisplayTransactions = false,
                        DisplayTransactionsForPurchase = displayTransactionsForPurchase,
                        DisplayTransactionsForSalesReturn = false,
                        DisplayTransactionsForPurchaseReturn = false,
                        StoreManagement = false,
                        Value = "{}",
                        CreatedAt = DateTime.UtcNow
                    };

                    _context.CompanySettings.Add(settings);
                    _logger.LogInformation("Created new settings for company {CompanyId}, user {UserId}", companyId, userId);
                }
                else
                {
                    // Update existing settings
                    existingSettings.DisplayTransactionsForPurchase = displayTransactionsForPurchase;
                    existingSettings.UpdatedAt = DateTime.UtcNow;
                    settings = existingSettings;

                    _context.CompanySettings.Update(existingSettings);
                    _logger.LogInformation("Updated display transactions for purchase setting for company {CompanyId}, user {UserId}", companyId, userId);
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("Successfully updated displayTransactionsForPurchase setting for Company: {CompanyId}, User: {UserId}", companyId, userId);

                return settings;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in UpdateDisplayTransactionsForPurchaseAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<DisplayPurchaseReturnTransactionsDataDTO> GetDisplayPurchaseReturnTransactionsAsync(Guid companyId, Guid userId, Guid fiscalYearId)
        {
            try
            {
                _logger.LogInformation("GetDisplayPurchaseReturnTransactionsAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}",
                    companyId, userId, fiscalYearId);

                // Validate inputs
                if (companyId == Guid.Empty || userId == Guid.Empty)
                {
                    throw new ArgumentException("Invalid company or user information.");
                }

                // Get fiscal year details
                var fiscalYear = await _context.FiscalYears
                    .Where(f => f.Id == fiscalYearId && f.CompanyId == companyId)
                    .Select(f => new FiscalYearDTO
                    {
                        Id = f.Id,
                        Name = f.Name,
                        StartDate = f.StartDate,
                        EndDate = f.EndDate
                    })
                    .FirstOrDefaultAsync();

                if (fiscalYear == null)
                {
                    throw new ArgumentException("Fiscal year not found");
                }

                // Get settings with fiscal year filter (matches Node.js behavior)
                var settingsEntity = await _context.CompanySettings
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                             s.UserId == userId &&
                                             s.FiscalYearId == fiscalYearId);

                // If settings exist, return the displayTransactionsForPurchaseReturn setting; otherwise, return false
                bool displayTransactionsForPurchaseReturn = settingsEntity != null && settingsEntity.DisplayTransactionsForPurchaseReturn;

                // Get user with roles
                var user = await _context.Users
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                {
                    throw new ArgumentException("User not found");
                }

                bool isAdmin = user.IsAdmin;
                string userRole = "User";

                if (isAdmin)
                {
                    userRole = "Admin";
                }
                else if (user.UserRoles != null)
                {
                    var primaryRole = user.UserRoles.FirstOrDefault(ur => ur.IsPrimary);
                    if (primaryRole?.Role != null)
                    {
                        userRole = primaryRole.Role.Name;
                    }
                }

                // Get current company name
                var companyName = await _context.Companies
                    .Where(c => c.Id == companyId)
                    .Select(c => c.Name)
                    .FirstOrDefaultAsync();

                // Prepare user info
                var userInfo = new UserInfoDTO
                {
                    Id = user.Id,
                    Name = user.Name,
                    Email = user.Email,
                    IsAdmin = isAdmin,
                    Role = userRole,
                    Preferences = new UserPreferencesDTO
                    {
                        Theme = user.Preferences?.Theme.ToString() ?? "light"
                    }
                };

                // Prepare response
                var response = new DisplayPurchaseReturnTransactionsDataDTO
                {
                    DisplayTransactionsForPurchaseReturn = displayTransactionsForPurchaseReturn,
                    CurrentCompanyName = companyName ?? string.Empty,
                    Company = companyId,
                    FiscalYear = fiscalYear,
                    User = userInfo,
                    IsAdminOrSupervisor = isAdmin || userRole == "Supervisor"
                };

                _logger.LogInformation("Successfully fetched display transactions for purchase return setting for Company: {CompanyId}, User: {UserId}, Value: {DisplayTransactionsForPurchaseReturn}",
                    companyId, userId, displayTransactionsForPurchaseReturn);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetDisplayPurchaseReturnTransactionsAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<Settings> UpdateDisplayTransactionsForPurchaseReturnAsync(Guid companyId, Guid userId, Guid fiscalYearId, bool displayTransactionsForPurchaseReturn)
        {
            try
            {
                _logger.LogInformation("UpdateDisplayTransactionsForPurchaseReturnAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}, DisplayTransactionsForPurchaseReturn: {DisplayTransactionsForPurchaseReturn}",
                    companyId, userId, fiscalYearId, displayTransactionsForPurchaseReturn);

                // Validate inputs
                if (companyId == Guid.Empty || userId == Guid.Empty)
                {
                    throw new ArgumentException("Company ID and User ID are required");
                }

                // Find and update the settings with fiscal year filter (matches Node.js behavior)
                var existingSettings = await _context.CompanySettings
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                             s.UserId == userId &&
                                             s.FiscalYearId == fiscalYearId);

                Settings settings;

                if (existingSettings == null)
                {
                    // Create new settings if not exists
                    settings = new Settings
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        UserId = userId,
                        FiscalYearId = fiscalYearId,
                        RoundOffSales = false,
                        RoundOffPurchase = false,
                        RoundOffSalesReturn = false,
                        RoundOffPurchaseReturn = false,
                        DisplayTransactions = false,
                        DisplayTransactionsForPurchase = false,
                        DisplayTransactionsForSalesReturn = false,
                        DisplayTransactionsForPurchaseReturn = displayTransactionsForPurchaseReturn,
                        StoreManagement = false,
                        Value = "{}",
                        CreatedAt = DateTime.UtcNow
                    };

                    _context.CompanySettings.Add(settings);
                    _logger.LogInformation("Created new settings for company {CompanyId}, user {UserId}", companyId, userId);
                }
                else
                {
                    // Update existing settings
                    existingSettings.DisplayTransactionsForPurchaseReturn = displayTransactionsForPurchaseReturn;
                    existingSettings.UpdatedAt = DateTime.UtcNow;
                    settings = existingSettings;

                    _context.CompanySettings.Update(existingSettings);
                    _logger.LogInformation("Updated display transactions for purchase return setting for company {CompanyId}, user {UserId}", companyId, userId);
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("Successfully updated displayTransactionsForPurchaseReturn setting for Company: {CompanyId}, User: {UserId}", companyId, userId);

                return settings;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in UpdateDisplayTransactionsForPurchaseReturnAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        // public async Task<Settings> UpdateDatePreferenceForPurchaseAsync(Guid companyId, Guid fiscalYearId, Guid userId, bool useVoucherLastDate)
        // {
        //     try
        //     {
        //         _logger.LogInformation("UpdateDatePreferenceForPurchaseAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}, UseVoucherLastDate: {UseVoucherLastDate}",
        //             companyId, userId, fiscalYearId, useVoucherLastDate);

        //         var existingSettings = await _context.CompanySettings
        //             .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
        //                                      s.UserId == userId &&
        //                                      s.FiscalYearId == fiscalYearId);

        //         Settings settings;

        //         if (existingSettings == null)
        //         {
        //             settings = new Settings
        //             {
        //                 Id = Guid.NewGuid(),
        //                 CompanyId = companyId,
        //                 UserId = userId,
        //                 FiscalYearId = fiscalYearId,
        //                 UseVoucherLastDateForPurchase = useVoucherLastDate,
        //                 CreatedAt = DateTime.UtcNow
        //             };
        //             _context.CompanySettings.Add(settings);
        //         }
        //         else
        //         {
        //             existingSettings.UseVoucherLastDateForPurchase = useVoucherLastDate;
        //             existingSettings.UpdatedAt = DateTime.UtcNow;
        //             settings = existingSettings;
        //             _context.CompanySettings.Update(existingSettings);
        //         }

        //         await _context.SaveChangesAsync();
        //         return settings;
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error updating date preference for purchase");
        //         throw;
        //     }
        // }

        public async Task<DatePreferenceResponseDTO> GetDatePreferenceForPurchaseAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetDatePreferenceForPurchaseAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}",
                    companyId, userId, fiscalYearId);

                var settings = await _context.CompanySettings
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                             s.UserId == userId &&
                                             s.FiscalYearId == fiscalYearId);

                return new DatePreferenceResponseDTO
                {
                    UseVoucherLastDate = settings?.UseVoucherLastDateForPurchase ?? false,
                    SettingsId = settings?.Id,
                    LastUpdated = settings?.UpdatedAt ?? settings?.CreatedAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting date preference for purchase");
                throw;
            }
        }

        public async Task<Settings> UpdateDatePreferenceForPurchaseAsync(Guid companyId, Guid fiscalYearId, Guid userId, bool useVoucherLastDate)
        {
            try
            {
                _logger.LogInformation("UpdateDatePreferenceForPurchaseAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}, UseVoucherLastDate: {UseVoucherLastDate}",
                    companyId, userId, fiscalYearId, useVoucherLastDate);

                var existingSettings = await _context.CompanySettings
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                             s.UserId == userId &&
                                             s.FiscalYearId == fiscalYearId);

                Settings settings;

                if (existingSettings == null)
                {
                    // Create new settings with default values
                    settings = new Settings
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        UserId = userId,
                        FiscalYearId = fiscalYearId,
                        UseVoucherLastDateForPurchase = useVoucherLastDate,
                        // Set other properties with default values
                        RoundOffSales = false,
                        RoundOffPurchase = false,
                        RoundOffSalesReturn = false,
                        RoundOffPurchaseReturn = false,
                        DisplayTransactions = false,
                        DisplayTransactionsForPurchase = false,
                        DisplayTransactionsForSalesReturn = false,
                        DisplayTransactionsForPurchaseReturn = false,
                        StoreManagement = false,
                        Value = "{}",
                        UseVoucherLastDateForSales = false,
                        UseVoucherLastDateForSalesReturn = false,
                        UseVoucherLastDateForPurchaseReturn = false,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.CompanySettings.Add(settings);
                    _logger.LogInformation("Created new settings with date preference for purchase");
                }
                else
                {
                    existingSettings.UseVoucherLastDateForPurchase = useVoucherLastDate;
                    existingSettings.UpdatedAt = DateTime.UtcNow;
                    settings = existingSettings;
                    _context.CompanySettings.Update(existingSettings);
                    _logger.LogInformation("Updated date preference for purchase");
                }

                await _context.SaveChangesAsync();
                return settings;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating date preference for purchase");
                throw;
            }
        }

        // Sales Date Preference Methods
        public async Task<DatePreferenceResponseDTO> GetDatePreferenceForSalesAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetDatePreferenceForSalesAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}",
                    companyId, userId, fiscalYearId);

                var settings = await _context.CompanySettings
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                             s.UserId == userId &&
                                             s.FiscalYearId == fiscalYearId);

                return new DatePreferenceResponseDTO
                {
                    UseVoucherLastDate = settings?.UseVoucherLastDateForSales ?? false,
                    SettingsId = settings?.Id,
                    LastUpdated = settings?.UpdatedAt ?? settings?.CreatedAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting date preference for sales");
                throw;
            }
        }

        public async Task<Settings> UpdateDatePreferenceForSalesAsync(Guid companyId, Guid fiscalYearId, Guid userId, bool useVoucherLastDate)
        {
            try
            {
                _logger.LogInformation("UpdateDatePreferenceForSalesAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}, UseVoucherLastDate: {UseVoucherLastDate}",
                    companyId, userId, fiscalYearId, useVoucherLastDate);

                var existingSettings = await _context.CompanySettings
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                             s.UserId == userId &&
                                             s.FiscalYearId == fiscalYearId);

                Settings settings;

                if (existingSettings == null)
                {
                    settings = new Settings
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        UserId = userId,
                        FiscalYearId = fiscalYearId,
                        UseVoucherLastDateForSales = useVoucherLastDate,
                        // Set other properties with default values
                        RoundOffSales = false,
                        RoundOffPurchase = false,
                        RoundOffSalesReturn = false,
                        RoundOffPurchaseReturn = false,
                        DisplayTransactions = false,
                        DisplayTransactionsForPurchase = false,
                        DisplayTransactionsForSalesReturn = false,
                        DisplayTransactionsForPurchaseReturn = false,
                        StoreManagement = false,
                        Value = "{}",
                        UseVoucherLastDateForPurchase = false,
                        UseVoucherLastDateForSalesReturn = false,
                        UseVoucherLastDateForPurchaseReturn = false,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.CompanySettings.Add(settings);
                }
                else
                {
                    existingSettings.UseVoucherLastDateForSales = useVoucherLastDate;
                    existingSettings.UpdatedAt = DateTime.UtcNow;
                    settings = existingSettings;
                    _context.CompanySettings.Update(existingSettings);
                }

                await _context.SaveChangesAsync();
                return settings;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating date preference for sales");
                throw;
            }
        }

        // Sales Return Date Preference Methods
        public async Task<DatePreferenceResponseDTO> GetDatePreferenceForSalesReturnAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetDatePreferenceForSalesReturnAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}",
                    companyId, userId, fiscalYearId);

                var settings = await _context.CompanySettings
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                             s.UserId == userId &&
                                             s.FiscalYearId == fiscalYearId);

                return new DatePreferenceResponseDTO
                {
                    UseVoucherLastDate = settings?.UseVoucherLastDateForSalesReturn ?? false,
                    SettingsId = settings?.Id,
                    LastUpdated = settings?.UpdatedAt ?? settings?.CreatedAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting date preference for sales return");
                throw;
            }
        }

        public async Task<Settings> UpdateDatePreferenceForSalesReturnAsync(Guid companyId, Guid fiscalYearId, Guid userId, bool useVoucherLastDate)
        {
            try
            {
                _logger.LogInformation("UpdateDatePreferenceForSalesReturnAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}, UseVoucherLastDate: {UseVoucherLastDate}",
                    companyId, userId, fiscalYearId, useVoucherLastDate);

                var existingSettings = await _context.CompanySettings
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                             s.UserId == userId &&
                                             s.FiscalYearId == fiscalYearId);

                Settings settings;

                if (existingSettings == null)
                {
                    settings = new Settings
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        UserId = userId,
                        FiscalYearId = fiscalYearId,
                        UseVoucherLastDateForSalesReturn = useVoucherLastDate,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.CompanySettings.Add(settings);
                }
                else
                {
                    existingSettings.UseVoucherLastDateForSalesReturn = useVoucherLastDate;
                    existingSettings.UpdatedAt = DateTime.UtcNow;
                    settings = existingSettings;
                    _context.CompanySettings.Update(existingSettings);
                }

                await _context.SaveChangesAsync();
                return settings;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating date preference for sales return");
                throw;
            }
        }

        // Purchase Return Date Preference Methods
        public async Task<DatePreferenceResponseDTO> GetDatePreferenceForPurchaseReturnAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetDatePreferenceForPurchaseReturnAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}",
                    companyId, userId, fiscalYearId);

                var settings = await _context.CompanySettings
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                             s.UserId == userId &&
                                             s.FiscalYearId == fiscalYearId);

                return new DatePreferenceResponseDTO
                {
                    UseVoucherLastDate = settings?.UseVoucherLastDateForPurchaseReturn ?? false,
                    SettingsId = settings?.Id,
                    LastUpdated = settings?.UpdatedAt ?? settings?.CreatedAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting date preference for purchase return");
                throw;
            }
        }

        public async Task<Settings> UpdateDatePreferenceForPurchaseReturnAsync(Guid companyId, Guid fiscalYearId, Guid userId, bool useVoucherLastDate)
        {
            try
            {
                _logger.LogInformation("UpdateDatePreferenceForPurchaseReturnAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}, UseVoucherLastDate: {UseVoucherLastDate}",
                    companyId, userId, fiscalYearId, useVoucherLastDate);

                var existingSettings = await _context.CompanySettings
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                             s.UserId == userId &&
                                             s.FiscalYearId == fiscalYearId);

                Settings settings;

                if (existingSettings == null)
                {
                    settings = new Settings
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        UserId = userId,
                        FiscalYearId = fiscalYearId,
                        UseVoucherLastDateForPurchaseReturn = useVoucherLastDate,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.CompanySettings.Add(settings);
                }
                else
                {
                    existingSettings.UseVoucherLastDateForPurchaseReturn = useVoucherLastDate;
                    existingSettings.UpdatedAt = DateTime.UtcNow;
                    settings = existingSettings;
                    _context.CompanySettings.Update(existingSettings);
                }

                await _context.SaveChangesAsync();
                return settings;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating date preference for purchase return");
                throw;
            }
        }


        // Payment Date Preference Methods
        public async Task<DatePreferenceResponseDTO> GetDatePreferenceForPaymentAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetDatePreferenceForPaymentAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}",
                    companyId, userId, fiscalYearId);

                var settings = await _context.CompanySettings
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                             s.UserId == userId &&
                                             s.FiscalYearId == fiscalYearId);

                return new DatePreferenceResponseDTO
                {
                    UseVoucherLastDate = settings?.UseVoucherLastDateForPayment ?? false,
                    SettingsId = settings?.Id,
                    LastUpdated = settings?.UpdatedAt ?? settings?.CreatedAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting date preference for payment");
                throw;
            }
        }

        public async Task<Settings> UpdateDatePreferenceForPaymentAsync(Guid companyId, Guid fiscalYearId, Guid userId, bool useVoucherLastDate)
        {
            try
            {
                _logger.LogInformation("UpdateDatePreferenceForPaymentAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}, UseVoucherLastDate: {UseVoucherLastDate}",
                    companyId, userId, fiscalYearId, useVoucherLastDate);

                var existingSettings = await _context.CompanySettings
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                             s.UserId == userId &&
                                             s.FiscalYearId == fiscalYearId);

                Settings settings;

                if (existingSettings == null)
                {
                    settings = new Settings
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        UserId = userId,
                        FiscalYearId = fiscalYearId,
                        UseVoucherLastDateForPayment = useVoucherLastDate,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.CompanySettings.Add(settings);
                }
                else
                {
                    existingSettings.UseVoucherLastDateForPayment = useVoucherLastDate;
                    existingSettings.UpdatedAt = DateTime.UtcNow;
                    settings = existingSettings;
                    _context.CompanySettings.Update(existingSettings);
                }

                await _context.SaveChangesAsync();
                return settings;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating date preference for payment");
                throw;
            }
        }

        // Receipt Date Preference Methods
        public async Task<DatePreferenceResponseDTO> GetDatePreferenceForReceiptAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetDatePreferenceForReceiptAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}",
                    companyId, userId, fiscalYearId);

                var settings = await _context.CompanySettings
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                             s.UserId == userId &&
                                             s.FiscalYearId == fiscalYearId);

                return new DatePreferenceResponseDTO
                {
                    UseVoucherLastDate = settings?.UseVoucherLastDateForReceipt ?? false,
                    SettingsId = settings?.Id,
                    LastUpdated = settings?.UpdatedAt ?? settings?.CreatedAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting date preference for receipt");
                throw;
            }
        }

        public async Task<Settings> UpdateDatePreferenceForReceiptAsync(Guid companyId, Guid fiscalYearId, Guid userId, bool useVoucherLastDate)
        {
            try
            {
                _logger.LogInformation("UpdateDatePreferenceForReceiptAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}, UseVoucherLastDate: {UseVoucherLastDate}",
                    companyId, userId, fiscalYearId, useVoucherLastDate);

                var existingSettings = await _context.CompanySettings
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                             s.UserId == userId &&
                                             s.FiscalYearId == fiscalYearId);

                Settings settings;

                if (existingSettings == null)
                {
                    settings = new Settings
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        UserId = userId,
                        FiscalYearId = fiscalYearId,
                        UseVoucherLastDateForReceipt = useVoucherLastDate,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.CompanySettings.Add(settings);
                }
                else
                {
                    existingSettings.UseVoucherLastDateForReceipt = useVoucherLastDate;
                    existingSettings.UpdatedAt = DateTime.UtcNow;
                    settings = existingSettings;
                    _context.CompanySettings.Update(existingSettings);
                }

                await _context.SaveChangesAsync();
                return settings;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating date preference for receipt");
                throw;
            }
        }

        // Journal Date Preference Methods
        public async Task<DatePreferenceResponseDTO> GetDatePreferenceForJournalAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetDatePreferenceForJournalAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}",
                    companyId, userId, fiscalYearId);

                var settings = await _context.CompanySettings
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                             s.UserId == userId &&
                                             s.FiscalYearId == fiscalYearId);

                return new DatePreferenceResponseDTO
                {
                    UseVoucherLastDate = settings?.UseVoucherLastDateForJournal ?? false,
                    SettingsId = settings?.Id,
                    LastUpdated = settings?.UpdatedAt ?? settings?.CreatedAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting date preference for journal");
                throw;
            }
        }

        public async Task<Settings> UpdateDatePreferenceForJournalAsync(Guid companyId, Guid fiscalYearId, Guid userId, bool useVoucherLastDate)
        {
            try
            {
                _logger.LogInformation("UpdateDatePreferenceForJournalAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}, UseVoucherLastDate: {UseVoucherLastDate}",
                    companyId, userId, fiscalYearId, useVoucherLastDate);

                var existingSettings = await _context.CompanySettings
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                             s.UserId == userId &&
                                             s.FiscalYearId == fiscalYearId);

                Settings settings;

                if (existingSettings == null)
                {
                    settings = new Settings
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        UserId = userId,
                        FiscalYearId = fiscalYearId,
                        UseVoucherLastDateForJournal = useVoucherLastDate,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.CompanySettings.Add(settings);
                }
                else
                {
                    existingSettings.UseVoucherLastDateForJournal = useVoucherLastDate;
                    existingSettings.UpdatedAt = DateTime.UtcNow;
                    settings = existingSettings;
                    _context.CompanySettings.Update(existingSettings);
                }

                await _context.SaveChangesAsync();
                return settings;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating date preference for journal");
                throw;
            }
        }

        // Debit Note Date Preference Methods
        public async Task<DatePreferenceResponseDTO> GetDatePreferenceForDebitNoteAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetDatePreferenceForDebitNoteAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}",
                    companyId, userId, fiscalYearId);

                var settings = await _context.CompanySettings
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                             s.UserId == userId &&
                                             s.FiscalYearId == fiscalYearId);

                return new DatePreferenceResponseDTO
                {
                    UseVoucherLastDate = settings?.UseVoucherLastDateForDebitNote ?? false,
                    SettingsId = settings?.Id,
                    LastUpdated = settings?.UpdatedAt ?? settings?.CreatedAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting date preference for debit note");
                throw;
            }
        }

        public async Task<Settings> UpdateDatePreferenceForDebitNoteAsync(Guid companyId, Guid fiscalYearId, Guid userId, bool useVoucherLastDate)
        {
            try
            {
                _logger.LogInformation("UpdateDatePreferenceForDebitNoteAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}, UseVoucherLastDate: {UseVoucherLastDate}",
                    companyId, userId, fiscalYearId, useVoucherLastDate);

                var existingSettings = await _context.CompanySettings
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                             s.UserId == userId &&
                                             s.FiscalYearId == fiscalYearId);

                Settings settings;

                if (existingSettings == null)
                {
                    settings = new Settings
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        UserId = userId,
                        FiscalYearId = fiscalYearId,
                        UseVoucherLastDateForDebitNote = useVoucherLastDate,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.CompanySettings.Add(settings);
                }
                else
                {
                    existingSettings.UseVoucherLastDateForDebitNote = useVoucherLastDate;
                    existingSettings.UpdatedAt = DateTime.UtcNow;
                    settings = existingSettings;
                    _context.CompanySettings.Update(existingSettings);
                }

                await _context.SaveChangesAsync();
                return settings;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating date preference for debit note");
                throw;
            }
        }

        // Credit Note Date Preference Methods
        public async Task<DatePreferenceResponseDTO> GetDatePreferenceForCreditNoteAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetDatePreferenceForCreditNoteAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}",
                    companyId, userId, fiscalYearId);

                var settings = await _context.CompanySettings
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                             s.UserId == userId &&
                                             s.FiscalYearId == fiscalYearId);

                return new DatePreferenceResponseDTO
                {
                    UseVoucherLastDate = settings?.UseVoucherLastDateForCreditNote ?? false,
                    SettingsId = settings?.Id,
                    LastUpdated = settings?.UpdatedAt ?? settings?.CreatedAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting date preference for credit note");
                throw;
            }
        }

        public async Task<Settings> UpdateDatePreferenceForCreditNoteAsync(Guid companyId, Guid fiscalYearId, Guid userId, bool useVoucherLastDate)
        {
            try
            {
                _logger.LogInformation("UpdateDatePreferenceForCreditNoteAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}, UseVoucherLastDate: {UseVoucherLastDate}",
                    companyId, userId, fiscalYearId, useVoucherLastDate);

                var existingSettings = await _context.CompanySettings
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                             s.UserId == userId &&
                                             s.FiscalYearId == fiscalYearId);

                Settings settings;

                if (existingSettings == null)
                {
                    settings = new Settings
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        UserId = userId,
                        FiscalYearId = fiscalYearId,
                        UseVoucherLastDateForCreditNote = useVoucherLastDate,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.CompanySettings.Add(settings);
                }
                else
                {
                    existingSettings.UseVoucherLastDateForCreditNote = useVoucherLastDate;
                    existingSettings.UpdatedAt = DateTime.UtcNow;
                    settings = existingSettings;
                    _context.CompanySettings.Update(existingSettings);
                }

                await _context.SaveChangesAsync();
                return settings;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating date preference for credit note");
                throw;
            }
        }


        // Sales Quotation Date Preference Methods
        public async Task<DatePreferenceResponseDTO> GetDatePreferenceForSalesQuotationAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetDatePreferenceForSalesQuotationAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}",
                    companyId, userId, fiscalYearId);

                var settings = await _context.CompanySettings
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                             s.UserId == userId &&
                                             s.FiscalYearId == fiscalYearId);

                return new DatePreferenceResponseDTO
                {
                    UseVoucherLastDate = settings?.UseVoucherLastDateForSalesQuotation ?? false,
                    SettingsId = settings?.Id,
                    LastUpdated = settings?.UpdatedAt ?? settings?.CreatedAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting date preference for sales quotation");
                throw;
            }
        }

        public async Task<Settings> UpdateDatePreferenceForSalesQuotationAsync(Guid companyId, Guid fiscalYearId, Guid userId, bool useVoucherLastDate)
        {
            try
            {
                _logger.LogInformation("UpdateDatePreferenceForSalesQuotationAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}, UseVoucherLastDate: {UseVoucherLastDate}",
                    companyId, userId, fiscalYearId, useVoucherLastDate);

                var existingSettings = await _context.CompanySettings
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                             s.UserId == userId &&
                                             s.FiscalYearId == fiscalYearId);

                Settings settings;

                if (existingSettings == null)
                {
                    settings = new Settings
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        UserId = userId,
                        FiscalYearId = fiscalYearId,
                        UseVoucherLastDateForSalesQuotation = useVoucherLastDate,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.CompanySettings.Add(settings);
                }
                else
                {
                    existingSettings.UseVoucherLastDateForSalesQuotation = useVoucherLastDate;
                    existingSettings.UpdatedAt = DateTime.UtcNow;
                    settings = existingSettings;
                    _context.CompanySettings.Update(existingSettings);
                }

                await _context.SaveChangesAsync();
                return settings;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating date preference for sales quotation");
                throw;
            }
        }

        // Stock Adjustment Date Preference Methods
        public async Task<DatePreferenceResponseDTO> GetDatePreferenceForStockAdjustmentAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetDatePreferenceForStockAdjustmentAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}",
                    companyId, userId, fiscalYearId);

                var settings = await _context.CompanySettings
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                             s.UserId == userId &&
                                             s.FiscalYearId == fiscalYearId);

                return new DatePreferenceResponseDTO
                {
                    UseVoucherLastDate = settings?.UseVoucherLastDateForStockAdjustment ?? false,
                    SettingsId = settings?.Id,
                    LastUpdated = settings?.UpdatedAt ?? settings?.CreatedAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting date preference for stock adjustment");
                throw;
            }
        }

        public async Task<Settings> UpdateDatePreferenceForStockAdjustmentAsync(Guid companyId, Guid fiscalYearId, Guid userId, bool useVoucherLastDate)
        {
            try
            {
                _logger.LogInformation("UpdateDatePreferenceForStockAdjustmentAsync called for Company: {CompanyId}, User: {UserId}, FiscalYear: {FiscalYearId}, UseVoucherLastDate: {UseVoucherLastDate}",
                    companyId, userId, fiscalYearId, useVoucherLastDate);

                var existingSettings = await _context.CompanySettings
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                             s.UserId == userId &&
                                             s.FiscalYearId == fiscalYearId);

                Settings settings;

                if (existingSettings == null)
                {
                    settings = new Settings
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        UserId = userId,
                        FiscalYearId = fiscalYearId,
                        UseVoucherLastDateForStockAdjustment = useVoucherLastDate,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.CompanySettings.Add(settings);
                }
                else
                {
                    existingSettings.UseVoucherLastDateForStockAdjustment = useVoucherLastDate;
                    existingSettings.UpdatedAt = DateTime.UtcNow;
                    settings = existingSettings;
                    _context.CompanySettings.Update(existingSettings);
                }

                await _context.SaveChangesAsync();
                return settings;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating date preference for stock adjustment");
                throw;
            }
        }

    }
}