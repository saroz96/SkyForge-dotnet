using SkyForge.Dto.RetailerDto.SalesReturnDto;
using SkyForge.Models.Retailer.SalesReturnModel;
using SkyForge.Dto.RetailerDto.SalesBillDto;

namespace SkyForge.Services.Retailer.SalesReturnServices
{
    public interface ISalesReturnService
    {
        Task<SalesReturnResponseDTO> GetSalesReturnDataAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<string> GetNextSalesReturnBillNumberAsync(Guid companyId, Guid fiscalYearId);
        Task<string> GetCurrentSalesReturnBillNumberAsync(Guid companyId, Guid fiscalYearId);

        Task<SalesBillData?> GetSalesBillByNumberAsync(string billNumber, Guid companyId, Guid fiscalYearId);
        Task<SalesReturn> CreateSalesReturnAsync(CreateSalesReturnDTO dto, Guid userId, Guid companyId, Guid fiscalYearId);
        Task<SalesReturnFindsDTO> GetSalesReturnFindsAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<SalesReturnPartyInfoDTO?> GetSalesReturnPartyInfoAsync(string billNumber, Guid companyId, Guid fiscalYearId);
        Task<ChangeSalesReturnPartyResponseDTO> ChangeSalesReturnPartyAsync(string billNumber, Guid newAccountId, Guid companyId, Guid fiscalYearId, Guid userId);
        Task<SalesReturnBillIdResponseDTO> GetSalesReturnBillIdByNumberAsync(string billNumber, Guid companyId, Guid fiscalYearId);
        Task<SalesReturnEditDataDTO> GetSalesReturnEditDataAsync(Guid billId, Guid companyId, Guid fiscalYearId, Guid userId);
        Task<SalesReturn> UpdateSalesReturnAsync(Guid id, UpdateSalesReturnDTO dto, Guid companyId, Guid fiscalYearId, Guid userId);
        Task<SalesReturnResponseDTO> GetCashSalesReturnDataAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<string> GetNextCashSalesReturnBillNumberAsync(Guid companyId, Guid fiscalYearId);
        Task<string> GetCurrentCashSalesReturnBillNumberAsync(Guid companyId, Guid fiscalYearId);
        Task<SalesBillData?> GetCashSalesBillByNumberAsync(string billNumber, Guid companyId, Guid fiscalYearId);
        Task<SalesReturn> CreateCashSalesReturnAsync(CreateSalesReturnDTO dto, Guid userId, Guid companyId, Guid fiscalYearId);
        Task<CashSalesReturnFindsDTO> GetCashSalesReturnFindsAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<SalesReturnBillIdResponseDTO> GetCashSalesReturnBillIdByNumberAsync(string billNumber, Guid companyId, Guid fiscalYearId);
        Task<SalesReturnEditDataDTO> GetCashSalesReturnEditDataAsync(Guid billId, Guid companyId, Guid fiscalYearId, Guid userId);
        Task<SalesReturn> UpdateCashSalesReturnAsync(Guid id, UpdateSalesReturnDTO dto, Guid companyId, Guid fiscalYearId, Guid userId);
        Task<SalesReturnRegisterDataDTO> GetSalesReturnRegisterAsync(Guid companyId, Guid fiscalYearId, string? fromDate = null, string? toDate = null);
        Task<SalesReturnEntryDataDTO> GetSalesReturnRegisterEntryDataAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<SalesReturnPrintDTO> GetSalesReturnForPrintAsync(Guid id, Guid companyId, Guid userId, Guid fiscalYearId);
        Task<SalesReturnVatReportDTO> GetSalesReturnVatReportAsync(Guid companyId, Guid fiscalYearId, string? fromDate, string? toDate);
    }
}