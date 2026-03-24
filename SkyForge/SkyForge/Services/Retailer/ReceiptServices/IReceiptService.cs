using SkyForge.Dto.RetailerDto.ReceiptDto;
using SkyForge.Models.Retailer.ReceiptModel;

namespace SkyForge.Services.Retailer.ReceiptServices
{
    public interface IReceiptService
    {
        Task<ReceiptFormDataResponseDTO> GetReceiptFormDataAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<string> GetNextBillNumberAsync(Guid companyId, Guid fiscalYearId);
        Task<string> GetCurrentBillNumberAsync(Guid companyId, Guid fiscalYearId);
        Task<Receipt> CreateReceiptAsync(CreateReceiptDTO dto, Guid userId, Guid companyId, Guid fiscalYearId);
        Task<ReceiptFindsDTO> GetReceiptFindsAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        
        Task<BillIdResponseDTO> GetReceiptBillIdByNumberAsync(string billNumber, Guid companyId, Guid fiscalYearId);
        Task<ReceiptEditDataDTO> GetReceiptEditDataAsync(Guid receiptId, Guid companyId, Guid fiscalYearId, Guid userId);
        Task<Receipt> UpdateReceiptAsync(Guid id, UpdateReceiptDTO dto, Guid companyId, Guid fiscalYearId, Guid userId);
        Task<ReceiptsRegisterDataDTO> GetReceiptsRegisterAsync(Guid companyId, Guid fiscalYearId, string? fromDate = null, string? toDate = null);
        Task<ReceiptEntryDataDTO> GetReceiptEntryDataAsync(Guid companyId, Guid fiscalYearId, Guid userId);
    }
}