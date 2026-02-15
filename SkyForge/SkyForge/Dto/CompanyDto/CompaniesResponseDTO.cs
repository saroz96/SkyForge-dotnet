using System;
using System.Collections.Generic;

namespace SkyForge.Dto.CompanyDto
{
    public class CompaniesResponseDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string Address { get; set; }
        public string Country { get; set; }
        public string State { get; set; }
        public string City { get; set; }
        public string Pan { get; set; }
        public string Phone { get; set; }
        public int? Ward { get; set; }
        public string Email { get; set; }
        public string TradeType { get; set; }
        public string DateFormat { get; set; }
        public bool VatEnabled { get; set; }
        public bool StoreManagement { get; set; }
        public string RenewalDate { get; set; }
        public string FiscalYearStartDate { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public List<string> NotificationEmails { get; set; } = new();
        public CompanyAttendanceSettingsDTO AttendanceSettings { get; set; }
        public Guid OwnerId { get; set; }
        public string OwnerName { get; set; }
        public string OwnerEmail { get; set; }
    }

    public class CompanyAttendanceSettingsDTO
    {
        public bool GeoFencingEnabled { get; set; }
        public List<OfficeLocationDTO> OfficeLocations { get; set; } = new();
        public WorkingHoursDTO WorkingHours { get; set; }
        public AutoClockOutSettingsDTO AutoClockOut { get; set; }
    }

    public class OfficeLocationDTO
    {
        public string Name { get; set; }
        public CoordinatesDTO Coordinates { get; set; }
        public int Radius { get; set; }
        public string Address { get; set; }
        public bool IsActive { get; set; }
    }

    public class CoordinatesDTO
    {
        public double? Lat { get; set; }
        public double? Lng { get; set; }
    }

    public class WorkingHoursDTO
    {
        public string StartTime { get; set; }
        public string EndTime { get; set; }
        public int GracePeriod { get; set; }
    }

    public class AutoClockOutSettingsDTO
    {
        public bool Enabled { get; set; }
        public string Time { get; set; }
    }
}
