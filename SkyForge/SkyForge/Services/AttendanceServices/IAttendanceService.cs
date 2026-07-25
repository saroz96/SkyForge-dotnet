using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SkyForge.Dto;
using SkyForge.Models;
using SkyForge.Models.CompanyModel;

namespace SkyForge.Services.AttendanceServices
{
    public interface IAttendanceService
    {
        // User Methods
        Task<Attendance> ClockInAsync(Guid userId, Guid companyId, LocationDto location);
        Task<Attendance> ClockOutAsync(Guid userId, Guid companyId, LocationDto location);
        Task<List<TodayStatusResponseDto>> GetTodayStatusAsync(Guid userId);
        Task<AttendanceResponseDto> GetMyAttendanceAsync(Guid userId, DateTime? startDate, DateTime? endDate, int page, int limit, Guid? companyId);
        Task<CompanyAttendanceSettings> GetCompanyDataAsync(Guid companyId);
        
        // Admin Methods
        Task<CompanyAttendanceResponseDto> GetCompanyAttendanceAsync(Guid companyId, Guid? userId, string? status, DateTime? startDate, DateTime? endDate, int page, int limit);
        Task<Attendance> AdjustAttendanceAsync(Guid attendanceId, Guid adminId, AdjustAttendanceDto adjustments);
        Task<BulkUpdateResultDto> BulkUpdateAttendanceAsync(Guid companyId, Guid adminId, List<BulkAttendanceUpdateItem> updates);
        Task<ReportResponseDto> GetReportsAsync(Guid companyId, DateTime? startDate, DateTime? endDate, string reportType);
        
        // Office Location Management
        Task<OfficeLocation> AddOfficeLocationAsync(Guid companyId, Guid adminId, OfficeLocationRequestDto request);
        Task<OfficeLocation> UpdateOfficeLocationAsync(Guid locationId, Guid companyId, Guid adminId, UpdateOfficeLocationDto updates);
        Task<bool> DeleteOfficeLocationAsync(Guid locationId, Guid companyId, Guid adminId);
        Task<OfficeLocation> GetOfficeLocationAsync(Guid locationId, Guid companyId);
        Task<bool> ToggleGeoFencingAsync(Guid companyId, Guid adminId, bool enabled);
    }
}