using System;
using SkyForge.Models.FiscalYearModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkyForge.Models.Retailer.CategoryModel
{
    public class Category
    {
        [Key]
        public Guid Id { get; set; }

        [Required(ErrorMessage = "Category name is required")]
        [StringLength(100, ErrorMessage = "Name cannot exceed 100 characters")]
        public string Name { get; set; } = string.Empty;

        [Range(1000, 9999, ErrorMessage = "Unique number must be 4 digits")]
        public int? UniqueNumber { get; set; }

        [Required(ErrorMessage = "Company is required")]
        public Guid CompanyId { get; set; }

        [ForeignKey("CompanyId")]
        public virtual CompanyModel.Company? Company { get; set; }

        [Required]
        [Column("fiscal_year_id")]
        public Guid FiscalYearId { get; set; }

        [ForeignKey("FiscalYearId")]
        public FiscalYear FiscalYear { get; set; } = null!;

        [Column("original_fiscal_year_id")]
        public Guid? OriginalFiscalYearId { get; set; }

        [ForeignKey("OriginalFiscalYearId")]
        public FiscalYear? OriginalFiscalYear { get; set; }

        [Column("date")]
        public DateTime Date { get; set; } = DateTime.UtcNow;
        public string? NepaliDate { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}


