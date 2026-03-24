using SkyForge.Dto.RetailerDto.StockAdjustmentDto;
using SkyForge.Models.Retailer.StockAdjustmentModel;

namespace SkyForge.Services.Retailer.StockAdjustmentServices
{
    public interface IStockAdjustmentService
    {
        Task<StockAdjustmentResponseDTO?> GetNewStockAdjustmentDataAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<string> GetNextStockAdjustmentBillNumberAsync(Guid companyId, Guid fiscalYearId);
        Task<string> GetCurrentStockAdjustmentBillNumberAsync(Guid companyId, Guid fiscalYearId);
        Task<StockAdjustment> CreateStockAdjustmentAsync(CreateStockAdjustmentDTO dto, Guid userId, Guid companyId, Guid fiscalYearId);
        Task<StockAdjustmentsRegisterDataDTO> GetStockAdjustmentsRegisterAsync(Guid companyId, Guid fiscalYearId, string? fromDate = null, string? toDate = null);
        Task<StockAdjustmentsEntryDataDTO> GetStockAdjustmentsRegisterEntryDataAsync(Guid companyId, Guid fiscalYearId, Guid userId);

        Task<StockAdjustmentPrintDTO> GetStockAdjustmentForPrintAsync(Guid id, Guid companyId, Guid userId, Guid fiscalYearId);
    }
}