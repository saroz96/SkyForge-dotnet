using SkyForge.Models.AccountGroupModel;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkyForge.Models.AccountModel
{
    public class Account
    {
        [Key]
        public Guid Id { get; set; }

        [Required(ErrorMessage = "Account name is required")]
        [StringLength(200, ErrorMessage = "Name cannot exceed 200 characters")]
        public string Name { get; set; } = string.Empty;

        [StringLength(500, ErrorMessage = "Address cannot exceed 500 characters")]
        public string? Address { get; set; }

        public int? Ward { get; set; }

        public enum BalanceType
        {
            Dr,
            Cr
        }

        [StringLength(20, ErrorMessage = "Phone cannot exceed 20 characters")]
        [Phone(ErrorMessage = "Invalid phone number format")]
        public string? Phone { get; set; }

        [StringLength(20, ErrorMessage = "PAN cannot exceed 20 characters")]
        [RegularExpression(@"^\d{9}$", ErrorMessage = "PAN must be 9 digits")]
        public string? Pan { get; set; }

        [StringLength(100, ErrorMessage = "Contact person name cannot exceed 100 characters")]
        public string? ContactPerson { get; set; }

        [EmailAddress(ErrorMessage = "Invalid email format")]
        [StringLength(100, ErrorMessage = "Email cannot exceed 100 characters")]
        public string? Email { get; set; }

        [Range(1000, 9999, ErrorMessage = "Unique number must be 4 digits")]
        public int? UniqueNumber { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        [Range(0, double.MaxValue, ErrorMessage = "Credit limit cannot be negative")]
        public decimal? CreditLimit { get; set; }

        // Collections
        public virtual ICollection<OpeningBalanceByFiscalYear> OpeningBalanceByFiscalYear { get; set; } = new List<OpeningBalanceByFiscalYear>();
        public virtual ICollection<ClosingBalanceByFiscalYear> ClosingBalanceByFiscalYear { get; set; } = new List<ClosingBalanceByFiscalYear>();

        // Initial Opening Balance
        public virtual InitialOpeningBalance? InitialOpeningBalance { get; set; }

        // Current Opening Balance
        public virtual OpeningBalance? OpeningBalance { get; set; }

        [Required]
        [StringLength(2, MinimumLength = 2)] // Ensure exactly 2 characters (Dr or Cr)
        public string OpeningBalanceType { get; set; } = "Dr";

        public DateTime OpeningBalanceDate { get; set; } = DateTime.UtcNow;

        // Nepali Opening Balance Date (as string)
        [MaxLength(20)]
        public string? OpeningBalanceDateNepali { get; set; }

        // Foreign Keys
        [Required(ErrorMessage = "Account group is required")]
        public Guid AccountGroupsId { get; set; }

        [ForeignKey("AccountGroupsId")]
        public virtual AccountGroup? AccountGroup { get; set; }

        public Guid CompanyId { get; set; }

        // Navigation property
        [ForeignKey("CompanyId")]
        public virtual Company Company { get; set; } = null!;

        public Guid? OriginalFiscalYearId { get; set; }

        [ForeignKey("OriginalFiscalYearId")]
        public virtual FiscalYear? OriginalFiscalYear { get; set; }

        // Flags
        public bool DefaultCashAccount { get; set; } = false;
        public bool DefaultVatAccount { get; set; } = false;
        public bool IsDefaultAccount { get; set; } = false;

        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property for FiscalYears
        public virtual ICollection<FiscalYear> FiscalYears { get; set; } = new List<FiscalYear>();
    }
}