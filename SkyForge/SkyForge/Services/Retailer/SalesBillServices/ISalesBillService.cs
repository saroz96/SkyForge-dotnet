using SkyForge.Dto.RetailerDto.SalesBillDto;
using SkyForge.Models.Retailer.Sales;

namespace SkyForge.Services.Retailer.SalesBillServices
{
    public interface ISalesBillService
    {
        Task<SalesBillResponseDTO> GetCreditSalesDataAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<string> GetNextCreditSalesBillNumberAsync(Guid companyId, Guid fiscalYearId);
        Task<string> GetCurrentCreditSalesBillNumberAsync(Guid companyId, Guid fiscalYearId);

        Task<SalesBill> CreateCreditSalesBillAsync(CreateSalesBillDTO dto, Guid userId, Guid companyId, Guid fiscalYearId);

        Task<CreditSalesOpenResponseDTO> GetCreditSalesOpenDataAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<string> GetNextCreditSalesOpenBillNumberAsync(Guid companyId, Guid fiscalYearId);
        Task<string> GetCurrentCreditSalesOpenBillNumberAsync(Guid companyId, Guid fiscalYearId);
        Task<SalesBill> CreateCreditSalesOpenBillAsync(CreateCreditSalesOpenDTO dto, Guid userId, Guid companyId, Guid fiscalYearId);
        Task<CreditSalesFindsDTO> GetCreditSalesFindsAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<CreditSalesPartyInfoDTO?> GetCreditSalesPartyInfoAsync(string billNumber, Guid companyId, Guid fiscalYearId);
        Task<ChangeCreditSalesPartyResponseDTO> ChangeCreditSalesPartyAsync(string billNumber, Guid newAccountId, Guid companyId, Guid fiscalYearId, Guid userId);
        Task<BillIdResponseDTO> GetCreditSalesBillIdByNumberAsync(string billNumber, Guid companyId, Guid fiscalYearId);
        Task<CreditSalesEditDataDTO> GetCreditSalesEditDataAsync(Guid billId, Guid companyId, Guid fiscalYearId, Guid userId);
        Task<SalesBill> UpdateCreditSalesBillAsync(Guid billId, UpdateCreditSalesBillDTO dto, Guid userId, Guid companyId, Guid fiscalYearId);
        Task<SalesRegisterDataDTO> GetSalesRegisterAsync(Guid companyId, Guid fiscalYearId, string? fromDate = null, string? toDate = null);
    }
}