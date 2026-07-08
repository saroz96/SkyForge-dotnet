// Models/Audit/AuditLog.cs
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.UserModel;

namespace SkyForge.Models.Audit
{
    public enum AuditActionType
    {
        Create,
        Update,
        Delete,
        View,
        Login,
        Logout,
        Print,
        Export,
        Import,
        ChangeParty,
        Restore,
        Cancel,
        Approve,
        Reject
    }

    public enum AuditEntityType
    {
        SalesBill,
        PurchaseBill,
        SalesReturn,
        PurchaseReturn,
        Account,
        Item,
        StockEntry,
        Transaction,
        User,
        Company,
        FiscalYear,
        Settings,
        Payment,
        Receipt
    }

    public class AuditLog
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid UserId { get; set; }

        [ForeignKey("UserId")]
        public virtual User User { get; set; }

        [Required]
        public Guid CompanyId { get; set; }

        [ForeignKey("CompanyId")]
        public virtual Company Company { get; set; }

        [Required]
        [MaxLength(50)]
        public AuditActionType Action { get; set; }

        [Required]
        [MaxLength(50)]
        public AuditEntityType EntityType { get; set; }

        [MaxLength(50)]
        public string? EntityId { get; set; } // Store as string for flexibility (GUID, int, etc.)

        [MaxLength(100)]
        public string? EntityName { get; set; } // Human-readable name of the entity

        [MaxLength(50)]
        public string? BillNumber { get; set; } // For bills specifically

        [Required]
        [MaxLength(500)]
        public string Description { get; set; }

        [MaxLength(4000)]
        public string? OldValues { get; set; } // JSON of old values

        [MaxLength(4000)]
        public string? NewValues { get; set; } // JSON of new values

        [MaxLength(255)]
        public string? IPAddress { get; set; }

        [MaxLength(255)]
        public string? UserAgent { get; set; }

        [MaxLength(50)]
        public string? SessionId { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Additional context
        [MaxLength(255)]
        public string? RequestPath { get; set; }

        [MaxLength(50)]
        public string? RequestMethod { get; set; }

        [MaxLength(100)]
        public string? ClientVersion { get; set; }
    }
}