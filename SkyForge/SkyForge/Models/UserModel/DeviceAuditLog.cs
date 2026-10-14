using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkyForge.Models.UserModel
{
    [Table("DeviceAuditLogs")]
    public class DeviceAuditLog
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }

        // Which device this log belongs to (nullable - some actions are pre-registration)
        public Guid? DeviceId { get; set; }

        [ForeignKey("DeviceId")]
        public virtual UserDevice? Device { get; set; }

        // Which user performed/triggered the action
        public Guid? UserId { get; set; }

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }

        // Action performed:
        // Registered, RegisterAttempt_AlreadyExists, RegisterAttempt_LimitReached,
        // VerifySuccess, VerifyAttempt_NotRegistered, VerifyAttempt_PendingApproval,
        // VerifyAttempt_Rejected, VerifyAttempt_Revoked, VerifyAttempt_Blocked,
        // Approved, Rejected, AdminRevoked, Blocked, ClientRevoked
        [Required]
        [MaxLength(100)]
        public string Action { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? IpAddress { get; set; }

        [MaxLength(500)]
        public string? UserAgent { get; set; }

        [MaxLength(1000)]
        public string? Details { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}