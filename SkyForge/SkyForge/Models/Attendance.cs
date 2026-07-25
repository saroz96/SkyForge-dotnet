using SkyForge.Models.CompanyModel;
using SkyForge.Models.UserModel;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkyForge.Models
{
    [Table("Attendances")]
    public class Attendance
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }

        [Required]
        public Guid UserId { get; set; }

        [ForeignKey("UserId")]
        public virtual User User { get; set; } = null!;

        [Required]
        public Guid CompanyId { get; set; }

        [ForeignKey("CompanyId")]
        public virtual Company Company { get; set; } = null!;

        [Required]
        public DateTime Date { get; set; }

        // Reference to duty schedule
        public Guid? DutyScheduleId { get; set; }

        // Store duty hours for that day (in case schedule changes later)
        [Column(TypeName = "jsonb")]
        public ScheduledDutyHours? ScheduledDutyHours { get; set; }

        // Clock In
        [Column(TypeName = "jsonb")]
        public ClockInData? ClockIn { get; set; }

        // Clock Out
        [Column(TypeName = "jsonb")]
        public ClockOutData? ClockOut { get; set; }

        [MaxLength(50)]
        public string Status { get; set; } = "absent";

        public decimal TotalHours { get; set; } = 0;

        public decimal Overtime { get; set; } = 0;

        public int LateMinutes { get; set; } = 0;

        public int EarlyDepartureMinutes { get; set; } = 0;

        [MaxLength(50)]
        public string Source { get; set; } = "geo-fence";

        [Column(TypeName = "jsonb")]
        public DeviceInfo? DeviceInfo { get; set; }

        public string? Notes { get; set; }

        public Guid? AdjustedBy { get; set; }

        public DateTime? AdjustedAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }

    // Complex types for Attendance
    [ComplexType]
    public class ScheduledDutyHours
    {
        public string StartTime { get; set; } = "09:00"; // HH:MM format
        public string EndTime { get; set; } = "17:00";   // HH:MM format
        public int GracePeriod { get; set; } = 15; // in minutes
        public Guid? OfficeLocationId { get; set; }
    }

    [ComplexType]
    public class ClockInData
    {
        public DateTime Time { get; set; }
        public LocationData? Location { get; set; }
        public Guid? OfficeLocationId { get; set; }
    }

    [ComplexType]
    public class ClockOutData
    {
        public DateTime Time { get; set; }
        public LocationData? Location { get; set; }
        public Guid? OfficeLocationId { get; set; }
    }

    [ComplexType]
    public class LocationData
    {
        public double? Lat { get; set; }
        public double? Lng { get; set; }
        public double? Accuracy { get; set; }
        public string? Address { get; set; }
    }

    [ComplexType]
    public class DeviceInfo
    {
        public string? Browser { get; set; }
        public string? OS { get; set; }
        public string? IP { get; set; }
    }

    // Enums
    public enum AttendanceStatus
    {
        present,
        absent,
        half_day,
        leave,
        holiday,
        off_duty
    }

    public enum AttendanceSource
    {
        geo_fence,
        manual,
        qr_code,
        admin
    }
}