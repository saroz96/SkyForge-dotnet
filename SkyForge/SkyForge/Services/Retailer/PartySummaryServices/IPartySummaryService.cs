using SkyForge.Dto.RetailerDto;

namespace SkyForge.Services.Retailer.PartySummaryServices
{
    public interface IPartySummaryService
    {
        Task<PartySummaryResponseDto> GetPartySummaryAsync(
            Guid companyId,
            Guid fiscalYearId,
            Guid accountId,
            string? startDate,
            string? endDate);

        Task<PartySummaryResponseDto> GetPartySummaryByMonthRangeAsync(
            Guid companyId,
            Guid fiscalYearId,
            Guid accountId,
            int startYear,
            int startMonth,
            int endYear,
            int endMonth);
    }
}