using SkyForge.Models.Retailer;

namespace SkyForge.Services.Retailer.RetailerDashboardServices
{
    public interface IRetailerDashboardService
    {
        Task<DashboardResponse> GetDashboardDataAsync(Guid companyId, string currentCompanyName, string? fiscalYearJson);
    }
}
