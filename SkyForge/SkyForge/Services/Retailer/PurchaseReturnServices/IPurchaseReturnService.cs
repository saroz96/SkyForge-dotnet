using SkyForge.Dto.RetailerDto.PurchaseReturnDto;
using SkyForge.Models.Retailer.PurchaseReturnModel;

namespace SkyForge.Services.Retailer.PurchaseReturnServices
{
    public interface IPurchaseReturnService
    {
        Task<PurchaseReturnResponseDTO> GetPurchaseReturnAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<string> GetNextBillNumberAsync(Guid companyId, Guid fiscalYearId);
        Task<string> GetCurrentBillNumberAsync(Guid companyId, Guid fiscalYearId);
        Task<PurchaseReturn> CreatePurchaseReturnAsync(CreatePurchaseReturnDTO dto, Guid userId, Guid companyId, Guid fiscalYearId);
        Task<PurchaseReturnRegisterDataDTO> GetPurchaseReturnRegisterAsync(Guid companyId, Guid fiscalYearId, string? fromDate = null, string? toDate = null);
        Task<PurchaseReturnEntryDataDTO> GetPurchaseReturnEntryDataAsync(Guid companyId, Guid fiscalYearId, Guid userId);

        Task<PurchaseReturnFindsDTO> GetPurchaseReturnFindsAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<PurchaseReturnPartyInfoDTO?> GetPurchaseReturnPartyInfoAsync(string billNumber, Guid companyId, Guid fiscalYearId);
        Task<ChangePurchaseReturnPartyResponseDTO> ChangePurchaseReturnPartyAsync(string billNumber, Guid newAccountId, Guid companyId, Guid fiscalYearId, Guid userId);
        Task<BillIdResponseDTO> GetPurchaseReturnBillIdByNumberAsync(string billNumber, Guid companyId, Guid fiscalYearId);

        // Add this method to your IPurchaseReturnService interface
        Task<PurchaseReturnEditDataDTO> GetPurchaseReturnEditDataAsync(Guid billId, Guid companyId, Guid fiscalYearId, Guid userId);
        // In IPurchaseReturnService.cs
        Task<PurchaseReturn> UpdatePurchaseReturnAsync(Guid id, UpdatePurchaseReturnDTO dto, Guid companyId, Guid fiscalYearId, Guid userId);
        Task<PurchaseReturnPrintDTO> GetPurchaseReturnForPrintAsync(Guid id, Guid companyId, Guid userId, Guid fiscalYearId);

    }
}