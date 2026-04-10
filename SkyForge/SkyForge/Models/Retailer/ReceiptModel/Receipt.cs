// using SkyForge.Models.AccountGroupModel;
// using System;
// using System.ComponentModel.DataAnnotations;
// using System.ComponentModel.DataAnnotations.Schema;
// using SkyForge.Models.Retailer.PaymentModel;

// namespace SkyForge.Models.Retailer.ReceiptModel
// {
//     [Table("Receipts")]
//     public class Receipt
//     {
//         [Key]
//         [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
//         public Guid Id { get; set; }

//         [Required]
//         [StringLength(50)]
//         public string BillNumber { get; set; }

//         [ForeignKey("Account")]
//         public Guid? AccountId { get; set; }
//         public virtual AccountModel.Account Account { get; set; }

//         [Required]
//         [Column(TypeName = "decimal(18,2)")]
//         public decimal Debit { get; set; } = 0;

//         [Required]
//         [Column(TypeName = "decimal(18,2)")]
//         public decimal Credit { get; set; } = 0;

//         [ForeignKey("ReceiptAccount")]
//         public Guid? ReceiptAccountId { get; set; }
//         public virtual AccountModel.Account ReceiptAccount { get; set; }

//         [Column(TypeName = "varchar(20)")]
//         public ReceiptInstrumentType InstType { get; set; } = ReceiptInstrumentType.NA;

//         [StringLength(100)]
//         public string BankAcc { get; set; }

//         [StringLength(100)]
//         public string InstNo { get; set; }

//         [Required]
//         [ForeignKey("User")]
//         public Guid UserId { get; set; }
//         public virtual UserModel.User User { get; set; } = null!;

//         [ForeignKey("AccountGroup")]
//         public Guid? AccountGroupId { get; set; }
//         public virtual AccountGroup AccountGroup { get; set; }

//         [Required]
//         [ForeignKey("Company")]
//         public Guid CompanyId { get; set; }
//         public virtual CompanyModel.Company Company { get; set; } = null!;

//         [StringLength(500)]
//         public string Description { get; set; }

//         [Required]
//         [Column(TypeName = "varchar(20)")]
//         public ReceiptStatus Status { get; set; } = ReceiptStatus.Active;

//         [Required]
//         public bool IsActive { get; set; } = true;

//         [Required]
//         [ForeignKey("FiscalYear")]
//         public Guid FiscalYearId { get; set; }
//         public virtual FiscalYearModel.FiscalYear FiscalYear { get; set; } = null!;

//         [Required]
//         public DateTime Date { get; set; } = DateTime.UtcNow;

//         [Column("nepali_date")]
//         public DateTime NepaliDate { get; set; }

//         public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
//         public DateTime? UpdatedAt { get; set; }
//     }

//     public enum ReceiptInstrumentType
//     {
//         NA,
//         RTGS,
//         Fonepay,
//         Cheque,
//         ConnectIps,
//         Esewa,
//         Khalti
//     }

//     public enum ReceiptStatus
//     {
//         Active,
//         Canceled
//     }
// }

//-------------------------------------------------------------------end

using SkyForge.Models.AccountGroupModel;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Collections.Generic;

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
        public ReceiptStatus Status { get; set; } = ReceiptStatus.Active;

        [Required]
        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // Navigation property for receipt entries
        public virtual ICollection<ReceiptEntry> ReceiptEntries { get; set; } = new List<ReceiptEntry>();
    }

    [Table("ReceiptEntries")]
    public class ReceiptEntry
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }

        [Required]
        [ForeignKey("Receipt")]
        public Guid ReceiptId { get; set; }
        public virtual Receipt Receipt { get; set; } = null!;

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

        // Payment instrument details (only for debit entries typically)
        [Column(TypeName = "varchar(20)")]
        public ReceiptInstrumentType? InstType { get; set; }

        [StringLength(100)]
        public string? BankAcc { get; set; }

        [StringLength(100)]
        public string? InstNo { get; set; }

        // Reference to specific invoice/bill if applicable
        [StringLength(50)]
        public string? ReferenceNumber { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public enum ReceiptInstrumentType
    {
        NA = 0,
        RTGS = 1,
        Fonepay = 2,
        Cheque = 3,
        ConnectIps = 4,
        Esewa = 5,
        Khalti = 6
    }

    public enum ReceiptStatus
    {
        Active = 1,
        Canceled = 2
    }
}