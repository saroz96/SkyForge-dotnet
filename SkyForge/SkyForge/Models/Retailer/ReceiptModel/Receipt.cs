using SkyForge.Models.AccountGroupModel;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkyForge.Models.Retailer.ReceiptModel
{
    [Table("Receipts")]
    public class Receipt
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }

        [Required]
        [StringLength(50)]
        public string BillNumber { get; set; }

        [ForeignKey("Account")]
        public Guid? AccountId { get; set; }
        public virtual AccountModel.Account Account { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Debit { get; set; } = 0;

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Credit { get; set; } = 0;

        [ForeignKey("ReceiptAccount")]
        public Guid? ReceiptAccountId { get; set; }
        public virtual AccountModel.Account ReceiptAccount { get; set; }

        [Required]
        [Column(TypeName = "varchar(20)")]
        public InstrumentType InstType { get; set; } = InstrumentType.NA;

        [StringLength(100)]
        public string BankAcc { get; set; }

        [StringLength(100)]
        public string InstNo { get; set; }

        [Required]
        [ForeignKey("User")]
        public Guid UserId { get; set; }
        public virtual UserModel.User User { get; set; } = null!;

        [ForeignKey("AccountGroup")]
        public Guid? AccountGroupId { get; set; }
        public virtual AccountGroup AccountGroup { get; set; }

        [Required]
        [ForeignKey("Company")]
        public Guid CompanyId { get; set; }
        public virtual CompanyModel.Company Company { get; set; } = null!;

        [StringLength(500)]
        public string Description { get; set; }

        [Required]
        [Column(TypeName = "varchar(20)")]
        public ReceiptStatus Status { get; set; } = ReceiptStatus.Active;

        [Required]
        public bool IsActive { get; set; } = true;

        [Required]
        [ForeignKey("FiscalYear")]
        public Guid FiscalYearId { get; set; }
        public virtual FiscalYearModel.FiscalYear FiscalYear { get; set; } = null!;

        [Required]
        public DateTime Date { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime BillDate { get; set; } = DateTime.UtcNow;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }

    public enum InstrumentType
    {
        NA,
        RTGS,
        Fonepay,
        Cheque,
        ConnectIps,
        Esewa,
        Khalti
    }

    public enum ReceiptStatus
    {
        Active,
        Canceled
    }
}
