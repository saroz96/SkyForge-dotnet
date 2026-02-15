
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
    public class JournalVoucher
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [StringLength(50)]
        public string BillNumber { get; set; }

        [Required]
        public DateTime Date { get; set; }

        // Navigation properties for related entities
        [Required]
        public Guid UserId { get; set; }

        [Required]
        public Guid CompanyId { get; set; }

        [Required]
        public Guid FiscalYearId { get; set; }

        [StringLength(500)]
        public string Description { get; set; }

        [Required]
        public VoucherStatus Status { get; set; } = VoucherStatus.Active;

        [Required]
        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // Collections for debit and credit accounts
        public virtual ICollection<DebitEntry> DebitAccounts { get; set; } = new List<DebitEntry>();
        public virtual ICollection<CreditEntry> CreditAccounts { get; set; } = new List<CreditEntry>();

        // Navigation properties
        [ForeignKey("UserId")]
        public virtual User User { get; set; }

        [ForeignKey("CompanyId")]
        public virtual Company Company { get; set; }

        [ForeignKey("FiscalYearId")]
        public virtual FiscalYear FiscalYear { get; set; }
    }

    public enum VoucherStatus
    {
        Active,
        Canceled
    }

    // Separate entities for debit and credit entries
    public class DebitEntry
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid JournalVoucherId { get; set; }

        [Required]
        public Guid AccountId { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Debit { get; set; }

        [ForeignKey("JournalVoucherId")]
        public virtual JournalVoucher JournalVoucher { get; set; }

        [ForeignKey("AccountId")]
        public virtual Account Account { get; set; }
    }

    public class CreditEntry
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid JournalVoucherId { get; set; }

        [Required]
        public Guid AccountId { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Credit { get; set; }

        [ForeignKey("JournalVoucherId")]
        public virtual JournalVoucher JournalVoucher { get; set; }

        [ForeignKey("AccountId")]
        public virtual Account Account { get; set; }
    }
}
