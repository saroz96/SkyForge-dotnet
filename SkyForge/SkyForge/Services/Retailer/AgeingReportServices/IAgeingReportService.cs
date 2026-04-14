using System;
using System.Threading.Tasks;
using SkyForge.Dto.RetailerDto;

namespace SkyForge.Services.Retailer.AgeingReportServices
{
    public interface IAgeingReportService
    {
        Task<AgeingReportDataDto> GetAgeingReportAsync(Guid companyId, Guid fiscalYearId, DateTime asOnDate);
        Task<object> GetDayCountAgingForAccountAsync(Guid companyId, Guid fiscalYearId, Guid accountId, DateTime asOnDate);
    }
}