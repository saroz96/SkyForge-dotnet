using SkyForge.Models.Retailer;

namespace SkyForge.Services.Retailer.RetailerDashboardServices
{
    public interface IRetailerDashboardService
    {
        Task<DashboardResponse> GetDashboardDataAsync(Guid companyId, string currentCompanyName, string? fiscalYearJson);

        Task<List<TopItemDto>> GetTopItemsByTransactionAsync(Guid companyId, DateTime startDate, DateTime endDate, int topCount = 10);
        Task<List<TopItemDto>> GetTopItemsByRevenueAsync(Guid companyId, DateTime startDate, DateTime endDate, int topCount = 10);
        Task<List<TopItemDto>> GetTopItemsByFrequencyAsync(Guid companyId, DateTime startDate, DateTime endDate, int topCount = 10);

        Task<List<TopAccountDto>> GetTopCustomersByPurchaseAsync(Guid companyId, DateTime startDate, DateTime endDate, int topCount = 10);
        Task<List<TopAccountDto>> GetTopCustomersByFrequencyAsync(Guid companyId, DateTime startDate, DateTime endDate, int topCount = 10);
        Task<List<TopAccountDto>> GetTopCustomersByAverageValueAsync(Guid companyId, DateTime startDate, DateTime endDate, int topCount = 10);
        Task<List<TopAccountDto>> GetTopCustomersByOutstandingAsync(Guid companyId, int topCount = 10);
    }
}
