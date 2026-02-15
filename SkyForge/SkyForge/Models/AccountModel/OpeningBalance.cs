using SkyForge.Models.FiscalYearModel;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkyForge.Models.AccountModel
{
    public class OpeningBalance
    {
        [Key]
        public Guid Id { get; set; }

        // Foreign Key to FiscalYear
        public Guid? FiscalYearId { get; set; }

        [ForeignKey("FiscalYearId")]
        public virtual FiscalYear FiscalYear { get; set; }

        [Required(ErrorMessage = "Amount is required")]
        [Column(TypeName = "decimal(18,2)")]
        [Range(0, double.MaxValue, ErrorMessage = "Amount cannot be negative")]
        public decimal Amount { get; set; }

        [Required(ErrorMessage = "Balance type is required")]
        [StringLength(2)]
        [RegularExpression("^(Dr|Cr)$", ErrorMessage = "Type must be 'Dr' or 'Cr'")]
        public string Type { get; set; } = "Dr";

        // English Date
        public DateTime Date { get; set; } = DateTime.UtcNow;

        // Nepali Date (as string)
        [MaxLength(20)]
        public string? DateNepali { get; set; }


        // Foreign Key to Account
        public Guid AccountId { get; set; }

        [ForeignKey("AccountId")]
        public virtual Account Account { get; set; }
    }
}
