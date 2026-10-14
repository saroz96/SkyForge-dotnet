using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkyForge.Models.UserModel
{
    public enum DeviceStatus
    {
        Pending,      // Client registered, waiting for admin
        Approved,     // Admin approved
        Rejected,     // Admin rejected
        Revoked,      // Previously approved, now revoked
        Blocked       // Suspicious activity
    }

    public enum DeviceType
    {
        Desktop,
        Laptop,
        Tablet,
        Mobile,
        Unknown
    }

    [Table("UserDevices")]
    public class UserDevice
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }

        [Required]
        public Guid UserId { get; set; }

        [ForeignKey("UserId")]
        public virtual User User { get; set; }

        // Unique hardware fingerprint (SHA-256 hash)
        [Required]
        [MaxLength(128)]
        public string DeviceFingerprint { get; set; }

        // Human-readable device name
        [MaxLength(200)]
        public string? DeviceName { get; set; }

        [MaxLength(100)]
        public string? OperatingSystem { get; set; }

        [MaxLength(100)]
        public string? BrowserName { get; set; }

        [MaxLength(50)]
        public string? BrowserVersion { get; set; }

        [MaxLength(100)]
        public string? ScreenResolution { get; set; }

        [MaxLength(100)]
        public string? TimeZone { get; set; }

        [MaxLength(50)]
        public string? Language { get; set; }

        public DeviceType DeviceType { get; set; } = DeviceType.Unknown;

        // Network info
        [MaxLength(50)]
        public string? RegistrationIpAddress { get; set; }

        [MaxLength(50)]
        public string? LastKnownIpAddress { get; set; }

        [MaxLength(200)]
        public string? RegistrationLocation { get; set; }  // City, Country

        [MaxLength(200)]
        public string? LastKnownLocation { get; set; }

        // Status
        public DeviceStatus Status { get; set; } = DeviceStatus.Pending;

        // Approval info
        public Guid? ApprovedById { get; set; }

        [ForeignKey("ApprovedById")]
        public virtual User? ApprovedBy { get; set; }

        public DateTime? ApprovedAt { get; set; }

        [MaxLength(500)]
        public string? RejectionReason { get; set; }

        // Trust score (0-100) for risk-based auth
        public int TrustScore { get; set; } = 50;

        // Usage tracking
        public DateTime? LastUsedAt { get; set; }
        public int LoginCount { get; set; } = 0;

        // Client verification
        public bool ClientConfirmed { get; set; } = false;
        public DateTime? ClientConfirmedAt { get; set; }

        // Metadata
        [MaxLength(500)]
        public string? Notes { get; set; }  // Admin notes

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}