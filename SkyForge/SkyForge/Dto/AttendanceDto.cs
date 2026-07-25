using System;
using System.Collections.Generic;
using SkyForge.Models.CompanyModel;

namespace SkyForge.Dto
{
    public class ClockInRequestDto
    {
        public LocationDto? Location { get; set; }
        public Guid CompanyId { get; set; }
    }

    public class ClockOutRequestDto
    {
        public LocationDto? Location { get; set; }
        public Guid CompanyId { get; set; }
    }

    public class LocationDto
    {
        public double Lat { get; set; }
        public double Lng { get; set; }
        public double? Accuracy { get; set; }
        public string? Address { get; set; }
    }

    public class AttendanceResponseDto
    {
        // Individual properties
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public Guid CompanyId { get; set; }
        public string CompanyName { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public ClockInDataDto? ClockIn { get; set; }
        public ClockOutDataDto? ClockOut { get; set; }
        public string Status { get; set; } = "absent";
        public decimal TotalHours { get; set; }
        public decimal Overtime { get; set; }
        public int LateMinutes { get; set; }
        public int EarlyDepartureMinutes { get; set; }
        public string Source { get; set; } = "geo-fence";
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        
        // Collection properties for list views
        public List<AttendanceResponseDto>? Attendance { get; set; }
        public PaginationInfo? Pagination { get; set; }
        public List<AttendanceSummaryDto>? Summary { get; set; }
    }

    public class ClockInDataDto
    {
        public DateTime Time { get; set; }
        public LocationDto? Location { get; set; }
        public string? OfficeLocationName { get; set; }
    }

    public class ClockOutDataDto
    {
        public DateTime Time { get; set; }
        public LocationDto? Location { get; set; }
        public string? OfficeLocationName { get; set; }
    }

    public class TodayStatusResponseDto
    {
        public CompanyInfoDto Company { get; set; } = new CompanyInfoDto();
        public bool HasClockedIn { get; set; }
        public bool HasClockedOut { get; set; }
        public DateTime? ClockIn { get; set; }
        public DateTime? ClockOut { get; set; }
        public decimal TotalHours { get; set; }
        public string Status { get; set; } = "absent";
        public int LateMinutes { get; set; }
        public decimal Overtime { get; set; }
    }

    public class CompanyInfoDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public CompanyAttendanceSettings? AttendanceSettings { get; set; }
    }

    public class AttendanceStatsDto
    {
        public int Present { get; set; }
        public int Absent { get; set; }
        public int HalfDay { get; set; }
        public int Total { get; set; }
    }

    public class CompanyAttendanceResponseDto
    {
        public List<AttendanceResponseDto> Attendance { get; set; } = new List<AttendanceResponseDto>();
        public List<UserSummaryDto> Users { get; set; } = new List<UserSummaryDto>();
        public List<AttendanceSummaryDto> Summary { get; set; } = new List<AttendanceSummaryDto>();
        public PaginationInfo Pagination { get; set; } = new PaginationInfo();
    }

    public class UserSummaryDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Role { get; set; }
    }

    public class AttendanceSummaryDto
    {
        public string Status { get; set; } = string.Empty;
        public int Count { get; set; }
        public decimal AvgHours { get; set; }  // Changed from double to decimal
    }

    public class PaginationInfo
    {
        public int Page { get; set; } = 1;
        public int Limit { get; set; } = 50;
        public int Total { get; set; }
        public int Pages { get; set; }
    }

    public class AdjustAttendanceDto
    {
        public DateTime? ClockInTime { get; set; }
        public DateTime? ClockOutTime { get; set; }
        public LocationDto? ClockInLocation { get; set; }
        public LocationDto? ClockOutLocation { get; set; }
        public string? Status { get; set; }
        public string? Notes { get; set; }
    }

    public class BulkUpdateAttendanceDto
    {
        public Guid CompanyId { get; set; }
        public List<BulkAttendanceUpdateItem> Updates { get; set; } = new List<BulkAttendanceUpdateItem>();
    }

    public class BulkAttendanceUpdateItem
    {
        public Guid UserId { get; set; }
        public DateTime Date { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Notes { get; set; }
    }

    public class BulkUpdateResultDto
    {
        public int Total { get; set; }
        public int Success { get; set; }
        public int Failed { get; set; }
        public List<BulkUpdateSuccessItem> SuccessItems { get; set; } = new List<BulkUpdateSuccessItem>();
        public List<BulkUpdateFailedItem> FailedItems { get; set; } = new List<BulkUpdateFailedItem>();
    }

    public class BulkUpdateSuccessItem
    {
        public Guid UserId { get; set; }
        public DateTime Date { get; set; }
        public string Status { get; set; } = string.Empty;
        public Guid AttendanceId { get; set; }
    }

    public class BulkUpdateFailedItem
    {
        public Guid? UserId { get; set; }
        public DateTime? Date { get; set; }
        public string? Status { get; set; }
        public string? Error { get; set; }
    }

    public class ReportRequestDto
    {
        public Guid CompanyId { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string ReportType { get; set; } = "daily";
    }

    public class ReportResponseDto
    {
        public CompanyInfoDto Company { get; set; } = new CompanyInfoDto();
        public string ReportType { get; set; } = string.Empty;
        public DateRangeDto DateRange { get; set; } = new DateRangeDto();
        public object Report { get; set; } = new object();
    }

    public class DateRangeDto
    {
        public string Start { get; set; } = string.Empty;
        public string End { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
    }
}