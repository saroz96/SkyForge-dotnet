// using System;
// using System.Collections.Generic;
// using System.ComponentModel.DataAnnotations;
// using System.ComponentModel.DataAnnotations.Schema;

// namespace SkyForge.Models.Retailer.CreditNoteModel
// {
//     [Table("CreditNotes")]
//     public class CreditNote
//     {
//         [Key]
//         [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
//         public Guid Id { get; set; }

//         [Required]
//         [StringLength(50)]
//         public string BillNumber { get; set; }

//         [Required]
//         public DateTime Date { get; set; }

//         [Required]
//         [ForeignKey("FiscalYear")]
//         public Guid FiscalYearId { get; set; }
//         public virtual FiscalYearModel.FiscalYear FiscalYear { get; set; } = null!;

//         [Required]
//         [ForeignKey("User")]
//         public Guid UserId { get; set; }
//         public virtual UserModel.User User { get; set; } = null!;

//         [Required]
//         [ForeignKey("Company")]
//         public Guid CompanyId { get; set; }
//         public virtual CompanyModel.Company Company { get; set; } = null!;

//         [StringLength(500)]
//         public string Description { get; set; }

//         [Required]
//         [Column(TypeName = "varchar(20)")]
//         public CreditNoteStatus Status { get; set; } = CreditNoteStatus.Active;

//         [Required]
//         public bool IsActive { get; set; } = true;

//         public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
//         public DateTime? UpdatedAt { get; set; }

//         // Navigation properties for debit and credit entries
//         public virtual ICollection<CreditNoteDebitEntry> DebitAccounts { get; set; } = new List<CreditNoteDebitEntry>();
//         public virtual ICollection<CreditNoteCreditEntry> CreditAccounts { get; set; } = new List<CreditNoteCreditEntry>();
//     }

//     public enum CreditNoteStatus
//     {
//         Active,
//         Canceled
//     }

//     // Separate entity for debit entries
//     [Table("CreditNoteDebitEntries")]
//     public class CreditNoteDebitEntry
//     {
//         [Key]
//         [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
//         public Guid Id { get; set; }

//         [Required]
//         [ForeignKey("CreditNote")]
//         public Guid CreditNoteId { get; set; }
//         public virtual CreditNote CreditNote { get; set; } = null!;

//         [Required]
//         [ForeignKey("Account")]
//         public Guid AccountId { get; set; }
//         public virtual AccountModel.Account Account { get; set; } = null!;

//         [Required]
//         [Column(TypeName = "decimal(18,2)")]
//         public decimal Debit { get; set; }

//         public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
//     }

//     // Separate entity for credit entries
//     [Table("CreditNoteCreditEntries")]
//     public class CreditNoteCreditEntry
//     {
//         [Key]
//         [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
//         public Guid Id { get; set; }

//         [Required]
//         [ForeignKey("CreditNote")]
//         public Guid CreditNoteId { get; set; }
//         public virtual CreditNote CreditNote { get; set; } = null!;

//         [Required]
//         [ForeignKey("Account")]
//         public Guid AccountId { get; set; }
//         public virtual AccountModel.Account Account { get; set; } = null!;

//         [Required]
//         [Column(TypeName = "decimal(18,2)")]
//         public decimal Credit { get; set; }

//         public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
//     }
// }


//----------------------------------------------------------------------------end

using SkyForge.Models.AccountModel;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.UserModel;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkyForge.Models.Retailer.CreditNoteModel
{
    [Table("CreditNotes")]
    public class CreditNote
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


        [Column("date")]
        public DateTime Date { get; set; }

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
        public CreditNoteStatus Status { get; set; } = CreditNoteStatus.Active;

        [Required]
        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // Navigation property for credit note entries (unified)
        public virtual ICollection<CreditNoteEntry> CreditNoteEntries { get; set; } = new List<CreditNoteEntry>();
    }

    [Table("CreditNoteEntries")]
    public class CreditNoteEntry
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }

        [Required]
        [ForeignKey("CreditNote")]
        public Guid CreditNoteId { get; set; }
        public virtual CreditNote CreditNote { get; set; } = null!;

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

    public enum CreditNoteStatus
    {
        Active = 1,
        Canceled = 2
    }
}