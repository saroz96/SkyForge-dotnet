using SkyForge.Models.AccountModel;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.UserModel;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkyForge.Models.Retailer.JournalVoucherModel
{
    [Table("JournalVouchers")]
    public class JournalVoucher
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }

        [Required]
        [StringLength(100, MinimumLength = 1)]
        public string BillNumber { get; set; } = string.Empty;

        // Total amount for quick reference and validation
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalAmount { get; set; }

        [Required]
        public DateTime Date { get; set; } = DateTime.UtcNow;

        [Column("nepali_date")]
        public DateTime NepaliDate { get; set; }

        [StringLength(1000)]
        public string? Description { get; set; }

        [Required]
        [ForeignKey("User")]
        public Guid UserId { get; set; }
        public virtual User User { get; set; } = null!;

        [Required]
        [ForeignKey("Company")]
        public Guid CompanyId { get; set; }
        public virtual Company Company { get; set; } = null!;

        [Required]
        [ForeignKey("FiscalYear")]
        public Guid FiscalYearId { get; set; }
        public virtual FiscalYear FiscalYear { get; set; } = null!;

        [Required]
        [Column(TypeName = "varchar(20)")]
        public VoucherStatus Status { get; set; } = VoucherStatus.Active;

        [Required]
        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // Navigation property for journal entries (unified)
        public virtual ICollection<JournalEntry> JournalEntries { get; set; } = new List<JournalEntry>();
    }

    [Table("JournalEntries")]
    public class JournalEntry
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }

        [Required]
        [ForeignKey("JournalVoucher")]
        public Guid JournalVoucherId { get; set; }
        public virtual JournalVoucher JournalVoucher { get; set; } = null!;

        [Required]
        [ForeignKey("Account")]
        public Guid AccountId { get; set; }
        public virtual Account Account { get; set; } = null!;

        [Required]
        [Column(TypeName = "varchar(10)")]
        public string EntryType { get; set; } = string.Empty; // "Debit" or "Credit"

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        [StringLength(500)]
        public string? Description { get; set; }

        // Optional: For tracking sequence/line number
        public int LineNumber { get; set; }

        // Optional: For reference to other documents
        [StringLength(100)]
        public string? ReferenceNumber { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }

    public enum VoucherStatus
    {
        Active = 1,
        Canceled = 2
    }
}