using SkyForge.Dto.RetailerDto.JournalVoucherDto;
using SkyForge.Models.Retailer.JournalVoucherModel;

namespace SkyForge.Services.Retailer.JournalVoucherServices
{
    public interface IJournalVoucherService
    {
        Task<JournalVoucherFormDataResponseDTO> GetJournalVoucherFormDataAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<string> GetNextBillNumberAsync(Guid companyId, Guid fiscalYearId);
        Task<string> GetCurrentBillNumberAsync(Guid companyId, Guid fiscalYearId);
        Task<JournalVoucher> CreateJournalVoucherAsync(CreateJournalVoucherDTO dto, Guid userId, Guid companyId, Guid fiscalYearId);
        Task<JournalVoucherFindsDTO> GetJournalVoucherFindsAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<BillIdResponseDTO> GetJournalBillIdByNumberAsync(string billNumber, Guid companyId, Guid fiscalYearId);
        Task<JournalVoucherEditDataDTO> GetJournalVoucherEditDataAsync(Guid journalId, Guid companyId, Guid fiscalYearId, Guid userId);
        Task<JournalVoucher> UpdateJournalVoucherAsync(Guid id, UpdateJournalVoucherDTO dto, Guid companyId, Guid fiscalYearId, Guid userId);
        Task<JournalVoucherRegisterDataDTO> GetJournalVouchersRegisterAsync(Guid companyId, Guid fiscalYearId, string? fromDate = null, string? toDate = null);
        Task<JournalVoucherEntryDataDTO> GetJournalVoucherEntryDataAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<JournalVoucherPrintDTO> GetJournalVoucherForPrintAsync(Guid id, Guid companyId, Guid userId, Guid fiscalYearId);
    }
}