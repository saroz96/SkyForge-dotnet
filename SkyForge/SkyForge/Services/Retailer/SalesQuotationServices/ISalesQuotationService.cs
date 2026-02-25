using SkyForge.Dto.RetailerDto.SalesQuotationDto;
using SkyForge.Models.Retailer.SalesQuotationModel;

namespace SkyForge.Services.Retailer.SalesQuotationServices
{
    public interface ISalesQuotationService
    {
        Task<SalesQuotationResponseDTO> GetSalesQuotationAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<string> GetNextBillNumberAsync(Guid companyId, Guid fiscalYearId);
        Task<string> GetCurrentBillNumberAsync(Guid companyId, Guid fiscalYearId);
        Task<SalesQuotation> CreateSalesQuotationAsync(CreateSalesQuotationDTO dto, Guid userId, Guid companyId, Guid fiscalYearId);
        Task<SalesQuotationRegisterDataDTO> GetSalesQuotationRegisterAsync(Guid companyId, Guid fiscalYearId, string? fromDate = null, string? toDate = null);
        Task<SalesQuotationRegisterDataDTO> GetSalesQuotationEntryDataAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<SalesQuotationFindsDTO> GetSalesQuotationFindsAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<SalesQuotationPartyInfoDTO?> GetSalesQuotationPartyInfoAsync(string billNumber, Guid companyId, Guid fiscalYearId);
        Task<ChangeSalesQuotationPartyResponseDTO> ChangeSalesQuotationPartyAsync(string billNumber, Guid newAccountId, Guid companyId, Guid fiscalYearId, Guid userId);
        Task<BillIdResponseDTO> GetSalesQuotationVoucherIdByNumberAsync(string billNumber, Guid companyId, Guid fiscalYearId);
        Task<SalesQuotationEditDataDTO> GetSalesQuotationEditDataAsync(Guid billId, Guid companyId, Guid fiscalYearId, Guid userId);
        // Interfaces/ISalesQuotationService.cs
        Task<SalesQuotation> UpdateSalesQuotationAsync(Guid id, UpdateSalesQuotationDTO dto, Guid userId, Guid companyId, Guid fiscalYearId);
        Task<SalesQuotationPrintDTO> GetSalesQuotationForPrintAsync(Guid id, Guid companyId, Guid userId, Guid fiscalYearId);
    }
}