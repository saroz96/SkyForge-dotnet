

using SkyForge.Dto.RetailerDto.CreditNoteDto;
using SkyForge.Models.Retailer.CreditNoteModel;

namespace SkyForge.Services.Retailer.CreditNoteServices
{
    public interface ICreditNoteService
    {
        Task<CreditNoteFormDataResponseDTO> GetCreditNoteFormDataAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<string> GetNextBillNumberAsync(Guid companyId, Guid fiscalYearId);
        Task<string> GetCurrentBillNumberAsync(Guid companyId, Guid fiscalYearId);
        Task<CreditNote> CreateCreditNoteAsync(CreateCreditNoteDTO dto, Guid userId, Guid companyId, Guid fiscalYearId);
        Task<CreditNoteFindsDTO> GetCreditNoteFindsAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<BillIdResponseDTO> GetCreditNoteBillIdByNumberAsync(string billNumber, Guid companyId, Guid fiscalYearId);
        Task<CreditNoteEditDataDTO> GetCreditNoteEditDataAsync(Guid creditNoteId, Guid companyId, Guid fiscalYearId, Guid userId);
        Task<CreditNote> UpdateCreditNoteAsync(Guid id, UpdateCreditNoteDTO dto, Guid companyId, Guid fiscalYearId, Guid userId);
        Task<CreditNoteRegisterDataDTO> GetCreditNotesRegisterAsync(Guid companyId, Guid fiscalYearId, string? fromDate = null, string? toDate = null);
        Task<CreditNoteEntryDataDTO> GetCreditNoteEntryDataAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<CreditNotePrintDTO> GetCreditNoteForPrintAsync(Guid id, Guid companyId, Guid userId, Guid fiscalYearId);
    }
}