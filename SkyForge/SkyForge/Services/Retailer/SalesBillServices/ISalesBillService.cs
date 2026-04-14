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

        Task<SalesOpenResponseDTO> GetCreditSalesOpenDataAsync(Guid companyId, Guid fiscalYearId, Guid userId);

        Task<string> GetNextCreditSalesOpenBillNumberAsync(Guid companyId, Guid fiscalYearId);
        Task<string> GetCurrentCreditSalesOpenBillNumberAsync(Guid companyId, Guid fiscalYearId);

        Task<SalesBill> CreateCreditSalesOpenBillAsync(CreateSalesOpenDTO dto, Guid userId, Guid companyId, Guid fiscalYearId);

        Task<CreditSalesFindsDTO> GetCreditSalesFindsAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<CreditSalesPartyInfoDTO?> GetCreditSalesPartyInfoAsync(string billNumber, Guid companyId, Guid fiscalYearId);
        Task<ChangeCreditSalesPartyResponseDTO> ChangeCreditSalesPartyAsync(string billNumber, Guid newAccountId, Guid companyId, Guid fiscalYearId, Guid userId);
        Task<BillIdResponseDTO> GetCreditSalesBillIdByNumberAsync(string billNumber, Guid companyId, Guid fiscalYearId);
        Task<SalesEditDataDTO> GetCreditSalesEditDataAsync(Guid billId, Guid companyId, Guid fiscalYearId, Guid userId);
        Task<SalesBill> UpdateCreditSalesBillAsync(Guid billId, UpdateSalesBillDTO dto, Guid userId, Guid companyId, Guid fiscalYearId);
        Task<SalesBillResponseDTO> GetCashSalesDataAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<string> GetNextCashSalesBillNumberAsync(Guid companyId, Guid fiscalYearId);
        Task<string> GetCurrentCashSalesBillNumberAsync(Guid companyId, Guid fiscalYearId);

        Task<SalesBill> CreateCashSalesBillAsync(CreateSalesBillDTO dto, Guid userId, Guid companyId, Guid fiscalYearId);

        Task<SalesOpenResponseDTO> GetCashSalesOpenDataAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<SalesBill> CreateCashSalesOpenBillAsync(CreateSalesOpenDTO dto, Guid userId, Guid companyId, Guid fiscalYearId);
        Task<string> GetNextCashSalesOpenBillNumberAsync(Guid companyId, Guid fiscalYearId);
        Task<string> GetCurrentCashSalesOpenBillNumberAsync(Guid companyId, Guid fiscalYearId);

        Task<CreditSalesFindsDTO> GetCashSalesFindsAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<BillIdResponseDTO> GetCashSalesBillIdByNumberAsync(string billNumber, Guid companyId, Guid fiscalYearId);
        Task<SalesEditDataDTO> GetCashSalesEditDataAsync(Guid billId, Guid companyId, Guid fiscalYearId, Guid userId);
        Task<SalesBill> UpdateCashSalesBillAsync(Guid billId, UpdateSalesBillDTO dto, Guid userId, Guid companyId, Guid fiscalYearId);
        Task<SalesRegisterDataDTO> GetSalesRegisterAsync(Guid companyId, Guid fiscalYearId, string? fromDate = null, string? toDate = null);
        Task<SalesBillEntryDataDTO> GetSalesRegisterEntryDataAsync(Guid companyId, Guid fiscalYearId, Guid userId);

        Task<SalesBillPrintDTO> GetSalesForPrintAsync(Guid id, Guid companyId, Guid userId, Guid fiscalYearId);

        Task<SalesVatReportDTO> GetSalesVatReportAsync(Guid companyId, Guid fiscalYearId, string? fromDate, string? toDate);
    }
}