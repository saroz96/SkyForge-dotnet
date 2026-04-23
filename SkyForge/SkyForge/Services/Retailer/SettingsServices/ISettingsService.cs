using SkyForge.Dto.RetailerDto;
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
        Task<SettingsDataDTO> GetRoundOffSalesSettingsAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<Settings> UpdateRoundOffSalesSettingsAsync(Guid companyId, Guid fiscalYearId, Guid userId, bool roundOffSales);
        Task<SalesReturnSettingsDataDTO> GetRoundOffSalesReturnSettingsAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<Settings> UpdateRoundOffSalesReturnSettingsAsync(Guid companyId, Guid fiscalYearId, Guid userId, bool roundOffSalesReturn);
        Task<PurchaseSettingsDataDTO> GetRoundOffPurchaseSettingsAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<Settings> UpdateRoundOffPurchaseSettingsAsync(Guid companyId, Guid fiscalYearId, Guid userId, bool roundOffPurchase);
        Task<PurchaseReturnSettingsDataDTO> GetRoundOffPurchaseReturnSettingsAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<Settings> UpdateRoundOffPurchaseReturnSettingsAsync(Guid companyId, Guid fiscalYearId, Guid userId, bool roundOffPurchaseReturn);
        Task<DisplaySalesTransactionsDataDTO> GetDisplaySalesTransactionsAsync(Guid companyId, Guid userId);
        Task<Settings> UpdateDisplayTransactionsForSalesAsync(Guid companyId, Guid userId, Guid fiscalYearId, bool displayTransactions);
        Task<DisplaySalesReturnTransactionsDataDTO> GetDisplaySalesReturnTransactionsAsync(Guid companyId, Guid userId);
        Task<Settings> UpdateDisplayTransactionsForSalesReturnAsync(Guid companyId, Guid userId, Guid fiscalYearId, bool displayTransactionsForSalesReturn);
        Task<DisplayPurchaseTransactionsDataDTO> GetDisplayPurchaseTransactionsAsync(Guid companyId, Guid userId, Guid fiscalYearId);
        Task<Settings> UpdateDisplayTransactionsForPurchaseAsync(Guid companyId, Guid userId, Guid fiscalYearId, bool displayTransactionsForPurchase);
        Task<DisplayPurchaseReturnTransactionsDataDTO> GetDisplayPurchaseReturnTransactionsAsync(Guid companyId, Guid userId, Guid fiscalYearId);
        Task<Settings> UpdateDisplayTransactionsForPurchaseReturnAsync(Guid companyId, Guid userId, Guid fiscalYearId, bool displayTransactionsForPurchaseReturn);
    }
}