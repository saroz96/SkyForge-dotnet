//using SkyForge.Models.Retailer.SettingsModel;
//using System.Threading.Tasks;

//namespace SkyForge.Services.Retailer.SettingsServices
//{
//    public interface ISettingsService
//    {
//        Task<Settings> GetCompanySettingsAsync(int companyId);
//        Task<Settings> CreateOrUpdateSettingsAsync(Settings settings);
//        Task<Settings> GetSettingsByCompanyAndUserAsync(int companyId, int userId, int? fiscalYearId = null);
//        Task<T> GetValueAsync<T>(int companyId, string key) where T : class;
//        Task SetValueAsync<T>(int companyId, string key, T value) where T : class;
//        Task<Settings> CreateDefaultSettingsAsync(int companyId, int userId, int fiscalYearId);
//    }
//}

using SkyForge.Models.Retailer.SettingsModel;
using System;
using System.Threading.Tasks;

namespace SkyForge.Services.Retailer.SettingsServices
{
    public interface ISettingsService
    {
        Task<Settings> GetCompanySettingsAsync(Guid companyId);
        Task<Settings> CreateOrUpdateSettingsAsync(Settings settings);
        Task<Settings> GetSettingsByCompanyAndUserAsync(Guid companyId, Guid userId, Guid? fiscalYearId = null);
        Task<T> GetValueAsync<T>(Guid companyId, string key) where T : class;
        Task SetValueAsync<T>(Guid companyId, string key, T value) where T : class;
        Task<Settings> CreateDefaultSettingsAsync(Guid companyId, Guid userId, Guid fiscalYearId);
    }
}