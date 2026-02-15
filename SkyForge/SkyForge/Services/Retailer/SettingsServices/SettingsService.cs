
//using Microsoft.EntityFrameworkCore;
//using SkyForge.Data;
//using SkyForge.Models.Retailer.SettingsModel;
//using SkyForge.Services.Retailer.SettingsServices;
//using System;
//using System.Collections.Generic;
//using System.Text.Json;
//using System.Threading.Tasks;

//namespace SkyForge.Services.Retailer.SettingsServices
//{
//    public class SettingsService : ISettingsService
//    {
//        private readonly ApplicationDbContext _context;
//        private readonly ILogger<SettingsService> _logger;

//        public SettingsService(ApplicationDbContext context, ILogger<SettingsService> logger)
//        {
//            _context = context;
//            _logger = logger;
//        }

//        public async Task<Settings> GetCompanySettingsAsync(int companyId)
//        {
//            try
//            {
//                var settings = await _context.CompanySettings
//                    .Include(s => s.Company)
//                    .Include(s => s.User)
//                    .Include(s => s.FiscalYear)
//                    .FirstOrDefaultAsync(s => s.CompanyId == companyId);

//                if (settings == null)
//                {
//                    _logger.LogWarning("Settings not found for company {CompanyId}", companyId);
//                }

//                return settings;
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Error getting settings for company {CompanyId}", companyId);
//                throw;
//            }
//        }

//        public async Task<Settings> GetSettingsByCompanyAndUserAsync(int companyId, int userId, int? fiscalYearId = null)
//        {
//            try
//            {
//                var query = _context.CompanySettings
//                    .Include(s => s.Company)
//                    .Include(s => s.User)
//                    .Include(s => s.FiscalYear)
//                    .Where(s => s.CompanyId == companyId && s.UserId == userId);

//                if (fiscalYearId.HasValue)
//                {
//                    query = query.Where(s => s.FiscalYearId == fiscalYearId);
//                }

//                var settings = await query.FirstOrDefaultAsync();

//                if (settings == null)
//                {
//                    _logger.LogDebug("Settings not found for company {CompanyId}, user {UserId}, fiscal year {FiscalYearId}",
//                        companyId, userId, fiscalYearId);
//                }

//                return settings;
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Error getting settings for company {CompanyId}, user {UserId}", companyId, userId);
//                throw;
//            }
//        }

//        public async Task<Settings> CreateOrUpdateSettingsAsync(Settings settings)
//        {
//            try
//            {
//                var existingSettings = await _context.CompanySettings
//                    .FirstOrDefaultAsync(s => s.CompanyId == settings.CompanyId &&
//                                             s.UserId == settings.UserId &&
//                                             s.FiscalYearId == settings.FiscalYearId);

//                if (existingSettings != null)
//                {
//                    // Update existing settings
//                    existingSettings.RoundOffSales = settings.RoundOffSales;
//                    existingSettings.RoundOffPurchase = settings.RoundOffPurchase;
//                    existingSettings.RoundOffSalesReturn = settings.RoundOffSalesReturn;
//                    existingSettings.RoundOffPurchaseReturn = settings.RoundOffPurchaseReturn;
//                    existingSettings.DisplayTransactions = settings.DisplayTransactions;
//                    existingSettings.DisplayTransactionsForPurchase = settings.DisplayTransactionsForPurchase;
//                    existingSettings.DisplayTransactionsForSalesReturn = settings.DisplayTransactionsForSalesReturn;
//                    existingSettings.DisplayTransactionsForPurchaseReturn = settings.DisplayTransactionsForPurchaseReturn;
//                    existingSettings.StoreManagement = settings.StoreManagement;
//                    existingSettings.Value = settings.Value;
//                    existingSettings.UpdatedAt = DateTime.UtcNow;

//                    _context.CompanySettings.Update(existingSettings);
//                    await _context.SaveChangesAsync();

//                    _logger.LogInformation("Settings updated for company {CompanyId}, user {UserId}",
//                        settings.CompanyId, settings.UserId);

//                    return existingSettings;
//                }
//                else
//                {
//                    // Create new settings
//                    settings.CreatedAt = DateTime.UtcNow;
//                    _context.CompanySettings.Add(settings);
//                    await _context.SaveChangesAsync();

//                    _logger.LogInformation("Settings created for company {CompanyId}, user {UserId}",
//                        settings.CompanyId, settings.UserId);

//                    return settings;
//                }
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Error creating/updating settings for company {CompanyId}", settings.CompanyId);
//                throw;
//            }
//        }

//        public async Task<T> GetValueAsync<T>(int companyId, string key) where T : class
//        {
//            try
//            {
//                var settings = await GetCompanySettingsAsync(companyId);
//                if (settings == null || string.IsNullOrEmpty(settings.Value))
//                {
//                    _logger.LogDebug("Settings or value not found for company {CompanyId}, key {Key}", companyId, key);
//                    return default;
//                }

//                try
//                {
//                    var jsonObject = JsonSerializer.Deserialize<JsonElement>(settings.Value);
//                    if (jsonObject.TryGetProperty(key, out var valueElement))
//                    {
//                        return JsonSerializer.Deserialize<T>(valueElement.GetRawText());
//                    }
//                    else
//                    {
//                        _logger.LogDebug("Key {Key} not found in settings for company {CompanyId}", key, companyId);
//                        return default;
//                    }
//                }
//                catch (JsonException ex)
//                {
//                    _logger.LogError(ex, "JSON deserialization error for company {CompanyId}, key {Key}", companyId, key);
//                    return default;
//                }
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Error getting value for company {CompanyId}, key {Key}", companyId, key);
//                throw;
//            }
//        }

//        public async Task SetValueAsync<T>(int companyId, string key, T value) where T : class
//        {
//            try
//            {
//                var settings = await GetCompanySettingsAsync(companyId);
//                if (settings == null)
//                {
//                    throw new KeyNotFoundException($"Settings not found for company ID: {companyId}");
//                }

//                Dictionary<string, object> values;
//                if (!string.IsNullOrEmpty(settings.Value))
//                {
//                    try
//                    {
//                        values = JsonSerializer.Deserialize<Dictionary<string, object>>(settings.Value);
//                    }
//                    catch (JsonException ex)
//                    {
//                        _logger.LogWarning(ex, "Failed to deserialize settings value for company {CompanyId}. Creating new dictionary.", companyId);
//                        values = new Dictionary<string, object>();
//                    }
//                }
//                else
//                {
//                    values = new Dictionary<string, object>();
//                }

//                values[key] = value;
//                settings.Value = JsonSerializer.Serialize(values);
//                settings.UpdatedAt = DateTime.UtcNow;

//                _context.CompanySettings.Update(settings);
//                await _context.SaveChangesAsync();

//                _logger.LogInformation("Value set for company {CompanyId}, key {Key}", companyId, key);
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Error setting value for company {CompanyId}, key {Key}", companyId, key);
//                throw;
//            }
//        }

//        public async Task<Settings> CreateDefaultSettingsAsync(int companyId, int userId, int fiscalYearId)
//        {
//            try
//            {
//                _logger.LogInformation("Creating default settings for company {CompanyId}, user {UserId}, fiscal year {FiscalYearId}",
//                    companyId, userId, fiscalYearId);

//                // Check if company exists
//                var company = await _context.Companies.FindAsync(companyId);
//                if (company == null)
//                {
//                    throw new KeyNotFoundException($"Company with ID {companyId} not found");
//                }

//                // Check if user exists
//                var user = await _context.Users.FindAsync(userId);
//                if (user == null)
//                {
//                    throw new KeyNotFoundException($"User with ID {userId} not found");
//                }

//                // Check if fiscal year exists
//                var fiscalYear = await _context.FiscalYears.FindAsync(fiscalYearId);
//                if (fiscalYear == null)
//                {
//                    throw new KeyNotFoundException($"Fiscal year with ID {fiscalYearId} not found");
//                }

//                // Check if settings already exist
//                var existingSettings = await GetSettingsByCompanyAndUserAsync(companyId, userId, fiscalYearId);
//                if (existingSettings != null)
//                {
//                    _logger.LogInformation("Settings already exist for company {CompanyId}, user {UserId}", companyId, userId);
//                    return existingSettings;
//                }

//                // Create default settings
//                var defaultSettings = new Settings
//                {
//                    CompanyId = companyId,
//                    UserId = userId,
//                    FiscalYearId = fiscalYearId,
//                    RoundOffSales = false,
//                    RoundOffPurchase = false,
//                    RoundOffSalesReturn = false,
//                    RoundOffPurchaseReturn = false,
//                    DisplayTransactions = false,
//                    DisplayTransactionsForPurchase = false,
//                    DisplayTransactionsForSalesReturn = false,
//                    DisplayTransactionsForPurchaseReturn = false,
//                    StoreManagement = false,
//                    Value = "{}", // Empty JSON object
//                    CreatedAt = DateTime.UtcNow
//                };

//                _context.CompanySettings.Add(defaultSettings);
//                await _context.SaveChangesAsync();

//                _logger.LogInformation("Default settings created for company {CompanyId}, user {UserId}", companyId, userId);

//                return defaultSettings;
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Error creating default settings for company {CompanyId}", companyId);
//                throw;
//            }
//        }

//        // Additional helper methods

//        public async Task<bool> SettingsExistAsync(int companyId, int userId, int? fiscalYearId = null)
//        {
//            try
//            {
//                var query = _context.CompanySettings
//                    .Where(s => s.CompanyId == companyId && s.UserId == userId);

//                if (fiscalYearId.HasValue)
//                {
//                    query = query.Where(s => s.FiscalYearId == fiscalYearId);
//                }

//                return await query.AnyAsync();
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Error checking if settings exist for company {CompanyId}, user {UserId}", companyId, userId);
//                throw;
//            }
//        }

//        public async Task<Settings> UpdateSpecificSettingsAsync(int companyId, int userId, Action<Settings> updateAction)
//        {
//            try
//            {
//                var settings = await GetSettingsByCompanyAndUserAsync(companyId, userId);
//                if (settings == null)
//                {
//                    throw new KeyNotFoundException($"Settings not found for company {companyId} and user {userId}");
//                }

//                updateAction(settings);
//                settings.UpdatedAt = DateTime.UtcNow;

//                _context.CompanySettings.Update(settings);
//                await _context.SaveChangesAsync();

//                _logger.LogInformation("Specific settings updated for company {CompanyId}, user {UserId}", companyId, userId);

//                return settings;
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Error updating specific settings for company {CompanyId}, user {UserId}", companyId, userId);
//                throw;
//            }
//        }

//        public async Task<Dictionary<string, object>> GetAllValuesAsync(int companyId)
//        {
//            try
//            {
//                var settings = await GetCompanySettingsAsync(companyId);
//                if (settings == null || string.IsNullOrEmpty(settings.Value))
//                {
//                    return new Dictionary<string, object>();
//                }

//                try
//                {
//                    return JsonSerializer.Deserialize<Dictionary<string, object>>(settings.Value);
//                }
//                catch (JsonException ex)
//                {
//                    _logger.LogError(ex, "Failed to deserialize all values for company {CompanyId}", companyId);
//                    return new Dictionary<string, object>();
//                }
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Error getting all values for company {CompanyId}", companyId);
//                throw;
//            }
//        }

//        public async Task<bool> RemoveValueAsync(int companyId, string key)
//        {
//            try
//            {
//                var settings = await GetCompanySettingsAsync(companyId);
//                if (settings == null || string.IsNullOrEmpty(settings.Value))
//                {
//                    return false;
//                }

//                try
//                {
//                    var values = JsonSerializer.Deserialize<Dictionary<string, object>>(settings.Value);
//                    if (values.ContainsKey(key))
//                    {
//                        values.Remove(key);
//                        settings.Value = JsonSerializer.Serialize(values);
//                        settings.UpdatedAt = DateTime.UtcNow;

//                        _context.CompanySettings.Update(settings);
//                        await _context.SaveChangesAsync();

//                        _logger.LogInformation("Value removed for company {CompanyId}, key {Key}", companyId, key);
//                        return true;
//                    }
//                    return false;
//                }
//                catch (JsonException ex)
//                {
//                    _logger.LogError(ex, "JSON deserialization error for company {CompanyId}", companyId);
//                    return false;
//                }
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Error removing value for company {CompanyId}, key {Key}", companyId, key);
//                throw;
//            }
//        }
//    }
//}

using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
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
    }
}