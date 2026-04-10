using SkyForge.Models.AccountGroupModel;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Collections.Generic;

namespace SkyForge.Models.Retailer.PaymentModel
{
    [Table("Payments")]
    public class Payment
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }

        [Required]
        [StringLength(50)]
        public string BillNumber { get; set; } = string.Empty;

        // Total amount for quick reference and validation
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalAmount { get; set; }

   
        [Column("date")]
        public DateTime Date { get; set; }

        [Column("nepali_date")]
        public DateTime NepaliDate { get; set; }

        [StringLength(500)]
        public string? Description { get; set; }

        [Required]
        [ForeignKey("User")]
        public Guid UserId { get; set; }
        public virtual UserModel.User User { get; set; } = null!;

        [Required]
        [ForeignKey("Company")]
        public Guid CompanyId { get; set; }
        public virtual CompanyModel.Company Company { get; set; } = null!;

        [Required]
        [ForeignKey("FiscalYear")]
        public Guid FiscalYearId { get; set; }
        public virtual FiscalYearModel.FiscalYear FiscalYear { get; set; } = null!;

        [Required]
        [Column(TypeName = "varchar(20)")]
        public PaymentStatus Status { get; set; } = PaymentStatus.Active;

        [Required]
        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // Navigation property for payment entries
        public virtual ICollection<PaymentEntry> PaymentEntries { get; set; } = new List<PaymentEntry>();
    }

    [Table("PaymentEntries")]
    public class PaymentEntry
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }

        [Required]
        [ForeignKey("Payment")]
        public Guid PaymentId { get; set; }
        public virtual Payment Payment { get; set; } = null!;

        [Required]
        [ForeignKey("Account")]
        public Guid AccountId { get; set; }
        public virtual AccountModel.Account Account { get; set; } = null!;

        [Required]
        [Column(TypeName = "varchar(10)")]
        public string EntryType { get; set; } = string.Empty; // "Debit" or "Credit"

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        [StringLength(500)]
        public string? Description { get; set; }

        // Payment instrument details (only for credit entries typically)
        [Column(TypeName = "varchar(20)")]
        public PaymentInstrumentType? InstType { get; set; }

        [StringLength(100)]
        public string? BankAcc { get; set; }

        [StringLength(100)]
        public string? InstNo { get; set; }

        // Reference to specific invoice/bill if applicable
        [StringLength(50)]
        public string? ReferenceNumber { get; set; }

        // For tracking which account group this entry belongs to (optional)
        [ForeignKey("AccountGroup")]
        public Guid? AccountGroupId { get; set; }
        public virtual AccountGroup AccountGroup { get; set; } = null!;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public enum PaymentInstrumentType
    {
        NA = 0,
        RTGS = 1,
        Fonepay = 2,
        Cheque = 3,
        ConnectIps = 4,
        Esewa = 5,
        Khalti = 6
    }

    public enum PaymentStatus
    {
        Active = 1,
        Canceled = 2
    }
}