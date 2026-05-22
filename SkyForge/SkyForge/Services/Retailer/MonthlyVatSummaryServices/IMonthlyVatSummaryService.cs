using SkyForge.Dto.RetailerDto;

namespace SkyForge.Services.Retailer.MonthlyVatSummaryServices
{
    public interface IMonthlyVatSummaryService
    {
        Task<MonthlyVatSummaryDTO> GetMonthlyVatSummaryAsync(
            Guid companyId,
            string? month,
            string? year,
            string? nepaliMonth,
            string? nepaliYear,
            string? periodType,
            string dateFormat,
            string? fromDate,
            string? toDate);
    }
}