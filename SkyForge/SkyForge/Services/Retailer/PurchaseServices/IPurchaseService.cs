using SkyForge.Dto.RetailerDto.PurchaseBillDto;
using SkyForge.Models.Retailer.Purchase;

namespace SkyForge.Services.Retailer.PurchaseServices
{
    public interface IPurchaseService
    {
        Task<PurchaseBill> CreatePurchaseBillAsync(CreatePurchaseBillDTO dto, Guid userId, Guid companyId, Guid fiscalYearId);
        Task<LastPurchaseDataDTO> GetLastPurchaseDataAsync(Guid itemId, Guid companyId);
        Task<PurchaseBillResponseDTO> GetPurchaseBillAsync(Guid id, Guid companyId);
        Task<IEnumerable<PurchaseBillResponseDTO>> GetPurchaseBillsAsync(Guid companyId, DateTime? fromDate = null, DateTime? toDate = null);
        Task<bool> DeletePurchaseBillAsync(Guid id, Guid companyId);
        Task<string> GetNextBillNumberAsync(Guid companyId, Guid fiscalYearId);
        Task<bool> CheckDuplicateInvoiceAsync(string partyBillNumber, Guid companyId);
        Task<PurchaseEntryDataDTO> GetPurchaseEntryDataAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<string> GetCurrentBillNumberAsync(Guid companyId, Guid fiscalYearId);
        Task<PurchaseRegisterDataDTO> GetPurchaseRegisterAsync(Guid companyId, Guid fiscalYearId, string? fromDate = null, string? toDate = null);
        Task<PurchaseBillPrintDTO> GetPurchaseBillForPrintAsync(Guid id, Guid companyId, Guid userId, Guid fiscalYearId);
        Task<PurchaseFindsDTO> GetPurchaseFindsAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<BillIdResponseDTO> GetPurchaseBillIdByNumberAsync(string billNumber, Guid companyId, Guid fiscalYearId);
        Task<PurchaseEditDataDTO> GetPurchaseEditDataAsync(Guid billId, Guid companyId, Guid fiscalYearId, Guid userId);
        Task<PurchaseBill> UpdatePurchaseBillAsync(Guid id, UpdatePurchaseBillDTO dto, Guid companyId, Guid fiscalYearId, Guid userId);
        Task<PurchasePartyInfoDto?> GetPurchasePartyInfoAsync(string billNumber, Guid companyId, Guid fiscalYearId);
        Task<ChangePartyResponseDto> ChangePartyAsync(string billNumber, Guid newAccountId, Guid companyId, Guid fiscalYearId, Guid userId);
        Task<PurchaseVatReportDTO> GetPurchaseVatReportAsync(Guid companyId, Guid fiscalYearId, string? fromDate, string? toDate);
    }
}