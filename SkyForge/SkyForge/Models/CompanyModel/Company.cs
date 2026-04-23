using SkyForge.Models.AccountGroupModel;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.Retailer.SettingsModel;
using SkyForge.Models.Shared;
using SkyForge.Models.UserModel;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkyForge.Models.CompanyModel
{
    public enum TradeType
    {
        Retailer,
        Pharmacy,
        Other
    }

    [Table("Companies")]
    public class Company
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }

        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(500)]
        public string Address { get; set; } = string.Empty;

        [MaxLength(100)]
        public string Country { get; set; } = string.Empty;

        [MaxLength(100)]
        public string State { get; set; } = string.Empty;

        [MaxLength(100)]
        public string City { get; set; } = string.Empty;

        [StringLength(9, MinimumLength = 9)]
        public string Pan { get; set; } = string.Empty;

        [MaxLength(50)]
        public string Phone { get; set; } = string.Empty;

        public int? Ward { get; set; }

        [EmailAddress]
        [MaxLength(100)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [Column(TypeName = "varchar(50)")]
        public TradeType TradeType { get; set; }

        // Owner relationship (One company has one owner)
        [ForeignKey("Owner")]
        public Guid OwnerId { get; set; }
        public virtual User Owner { get; set; } = null!;

        // Many-to-many with Users (users who can access this company)
        public virtual ICollection<User> Users { get; set; } = new List<User>();
        public virtual ICollection<AccountGroup> AccountGroups { get; set; } = new List<AccountGroup>();
        // public virtual Settings Settings { get; set; } = null!;

        public virtual ICollection<Settings> Settings { get; set; } = new List<Settings>();

        [Column(TypeName = "varchar(20)")]
        public DateFormatEnum? DateFormat { get; set; } = DateFormatEnum.English;

        [MaxLength(50)]
        public string RenewalDate { get; set; } = string.Empty;

        [MaxLength(50)]
        public string FiscalYearStartDate { get; set; } = string.Empty;

        public bool VatEnabled { get; set; } = false;

        public bool StoreManagement { get; set; } = false;

        // JSON array for emails
        [Column(TypeName = "jsonb")]
        public List<string> NotificationEmails { get; set; } = new List<string>();

        // Complex type for attendance settings
        public CompanyAttendanceSettings AttendanceSettings { get; set; } = new CompanyAttendanceSettings();

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // Navigation properties
        public virtual ICollection<FiscalYear> FiscalYears { get; set; } = new List<FiscalYear>();
    }

    // Complex type for AttendanceSettings
    [ComplexType]
    public class CompanyAttendanceSettings
    {
        public bool GeoFencingEnabled { get; set; } = false;

        public List<OfficeLocation> OfficeLocations { get; set; } = new List<OfficeLocation>();

        public WorkingHours WorkingHours { get; set; } = new WorkingHours();

        public AutoClockOutSettings AutoClockOut { get; set; } = new AutoClockOutSettings();
    }

    [ComplexType]
    public class OfficeLocation
    {
        [MaxLength(100)]
        public string Name { get; set; }

        public Coordinates Coordinates { get; set; } = new Coordinates();

        public int Radius { get; set; } = 100; // in meters

        [MaxLength(500)]
        public string Address { get; set; }

        public bool IsActive { get; set; } = true;
    }

    [ComplexType]
    public class Coordinates
    {
        public double? Lat { get; set; }
        public double? Lng { get; set; }
    }

    [ComplexType]
    public class WorkingHours
    {
        [RegularExpression(@"^([01]?[0-9]|2[0-3]):[0-5][0-9]$")]
        public string StartTime { get; set; } = "09:00";

        [RegularExpression(@"^([01]?[0-9]|2[0-3]):[0-5][0-9]$")]
        public string EndTime { get; set; } = "17:00";

        [Range(0, 120)]
        public int GracePeriod { get; set; } = 15; // in minutes
    }

    [ComplexType]
    public class AutoClockOutSettings
    {
        public bool Enabled { get; set; }

        [RegularExpression(@"^([01]?[0-9]|2[0-3]):[0-5][0-9]$")]
        public string Time { get; set; } = "18:00";
    }
}
