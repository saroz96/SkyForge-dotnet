using SkyForge.Dto.RetailerDto;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.UserModel;

namespace SkyForge.Services.Retailer.StockStatusServices
{
    public interface IStockStatusService
    {
        Task<StockStatusResponseDTO> GetStockStatusAsync(
            Guid companyId,
            Guid fiscalYearId,
            Company company,
            string dateFormat,
            int limit,
            int page,
            string search,
            bool showPurchaseValue,
            bool showSalesValue,
            User user,
            DateTime asOnDate,
            bool isNepaliFormat);
    }
}