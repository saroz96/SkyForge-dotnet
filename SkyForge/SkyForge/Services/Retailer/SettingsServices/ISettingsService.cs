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

        Task<Settings> UpdateDatePreferenceForPurchaseAsync(Guid companyId, Guid fiscalYearId, Guid userId, bool useVoucherLastDate);
        Task<DatePreferenceResponseDTO> GetDatePreferenceForPurchaseAsync(Guid companyId, Guid fiscalYearId, Guid userId);

        // Date preference methods for Sales
        Task<Settings> UpdateDatePreferenceForSalesAsync(Guid companyId, Guid fiscalYearId, Guid userId, bool useVoucherLastDate);
        Task<DatePreferenceResponseDTO> GetDatePreferenceForSalesAsync(Guid companyId, Guid fiscalYearId, Guid userId);

        // Date preference methods for Sales Return
        Task<Settings> UpdateDatePreferenceForSalesReturnAsync(Guid companyId, Guid fiscalYearId, Guid userId, bool useVoucherLastDate);
        Task<DatePreferenceResponseDTO> GetDatePreferenceForSalesReturnAsync(Guid companyId, Guid fiscalYearId, Guid userId);

        // Date preference methods for Purchase Return
        Task<Settings> UpdateDatePreferenceForPurchaseReturnAsync(Guid companyId, Guid fiscalYearId, Guid userId, bool useVoucherLastDate);
        Task<DatePreferenceResponseDTO> GetDatePreferenceForPurchaseReturnAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<Settings> UpdateDatePreferenceForPaymentAsync(Guid companyId, Guid fiscalYearId, Guid userId, bool useVoucherLastDate);
        Task<DatePreferenceResponseDTO> GetDatePreferenceForPaymentAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<Settings> UpdateDatePreferenceForReceiptAsync(Guid companyId, Guid fiscalYearId, Guid userId, bool useVoucherLastDate);
        Task<DatePreferenceResponseDTO> GetDatePreferenceForReceiptAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<Settings> UpdateDatePreferenceForJournalAsync(Guid companyId, Guid fiscalYearId, Guid userId, bool useVoucherLastDate);
        Task<DatePreferenceResponseDTO> GetDatePreferenceForJournalAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<Settings> UpdateDatePreferenceForDebitNoteAsync(Guid companyId, Guid fiscalYearId, Guid userId, bool useVoucherLastDate);
        Task<DatePreferenceResponseDTO> GetDatePreferenceForDebitNoteAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<Settings> UpdateDatePreferenceForCreditNoteAsync(Guid companyId, Guid fiscalYearId, Guid userId, bool useVoucherLastDate);
        Task<DatePreferenceResponseDTO> GetDatePreferenceForCreditNoteAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<Settings> UpdateDatePreferenceForSalesQuotationAsync(Guid companyId, Guid fiscalYearId, Guid userId, bool useVoucherLastDate);
        Task<DatePreferenceResponseDTO> GetDatePreferenceForSalesQuotationAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<Settings> UpdateDatePreferenceForStockAdjustmentAsync(Guid companyId, Guid fiscalYearId, Guid userId, bool useVoucherLastDate);
        Task<DatePreferenceResponseDTO> GetDatePreferenceForStockAdjustmentAsync(Guid companyId, Guid fiscalYearId, Guid userId);
    }
}