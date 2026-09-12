// Services/Interfaces/IAuditReportService.cs
using SkyForge.Dto.AuditReportDto;

namespace SkyForge.Services.AuditReportServices
{
    public interface IAuditReportService
    {
        Task<AuditReportResponseDTO> GetOpeningTrialBalanceAsync(Guid companyId, Guid fiscalYearId, DateTime? asOnDate = null);
        Task<AuditReportResponseDTO> GetClosingTrialBalanceAsync(Guid companyId, Guid fiscalYearId, DateTime? asOnDate = null);
        Task<AuditReportResponseDTO> GetProfitAndLossAccountAsync(Guid companyId, Guid fiscalYearId, DateTime? asOnDate = null);
        Task<AuditReportResponseDTO> GetBalanceSheetAsync(Guid companyId, Guid fiscalYearId, DateTime? asOnDate = null);
        Task<AuditReportResponseDTO> GetComprehensiveAuditReportAsync(Guid companyId, Guid fiscalYearId, DateTime? asOnDate = null);
        Task<AuditReportResponseDTO> GetCogsPeriodicAsync(Guid companyId, Guid fiscalYearId, DateTime? asOnDate = null);
    }
}