

using SkyForge.Dto.RetailerDto.DebitNoteDto;
using SkyForge.Models.Retailer.DebitNoteModel;

namespace SkyForge.Services.Retailer.DebitNoteServices
{
    public interface IDebitNoteService
    {
        Task<DebitNoteFormDataResponseDTO> GetDebitNoteFormDataAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<string> GetNextBillNumberAsync(Guid companyId, Guid fiscalYearId);
        Task<string> GetCurrentBillNumberAsync(Guid companyId, Guid fiscalYearId);
        Task<DebitNote> CreateDebitNoteAsync(CreateDebitNoteDTO dto, Guid userId, Guid companyId, Guid fiscalYearId);
        Task<DebitNoteFindsDTO> GetDebitNoteFindsAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<BillIdResponseDTO> GetDebitNoteBillIdByNumberAsync(string billNumber, Guid companyId, Guid fiscalYearId);
        Task<DebitNoteEditDataDTO> GetDebitNoteEditDataAsync(Guid debitNoteId, Guid companyId, Guid fiscalYearId, Guid userId);
        Task<DebitNote> UpdateDebitNoteAsync(Guid id, UpdateDebitNoteDTO dto, Guid companyId, Guid fiscalYearId, Guid userId);
        Task<DebitNoteRegisterDataDTO> GetDebitNotesRegisterAsync(Guid companyId, Guid fiscalYearId, string? fromDate = null, string? toDate = null);
        Task<DebitNoteEntryDataDTO> GetDebitNoteEntryDataAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<DebitNotePrintDTO> GetDebitNoteForPrintAsync(Guid id, Guid companyId, Guid userId, Guid fiscalYearId);
    }
}