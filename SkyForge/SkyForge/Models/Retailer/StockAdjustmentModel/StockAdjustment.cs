// using System;
// using System.Collections.Generic;
// using System.ComponentModel.DataAnnotations;
// using System.ComponentModel.DataAnnotations.Schema;

// namespace SkyForge.Models.Retailer
// {
//     [Table("stock_adjustments")]
//     public class StockAdjustment
//     {
//         [Key]
//         [Column("id")]
//         public Guid Id { get; set; }

//         [Column("bill_number")]
//         [Required]
//         [MaxLength(100)]
//         public string BillNumber { get; set; }

//         [Column("date")]
//         public DateTime Date { get; set; } = DateTime.UtcNow;

//         [Column("note")]
//         public string? Note { get; set; }

//         [Column("adjustment_type")]
//         [Required]
//         [MaxLength(10)]
//         public string AdjustmentType { get; set; } // "xcess" or "short"

//         [Column("sub_total")]
//         public decimal SubTotal { get; set; }

//         [Column("non_vat_adjustment")]
//         public decimal NonVatAdjustment { get; set; }

//         [Column("taxable_amount")]
//         public decimal TaxableAmount { get; set; }

//         [Column("discount_percentage")]
//         public decimal DiscountPercentage { get; set; }

//         [Column("discount_amount")]
//         public decimal DiscountAmount { get; set; }

//         [Column("vat_percentage")]
//         public decimal VatPercentage { get; set; } = 13;

//         [Column("vat_amount")]
//         public decimal VatAmount { get; set; }

//         [Column("total_amount")]
//         public decimal TotalAmount { get; set; }

//         [Column("is_vat_exempt")]
//         public bool IsVatExempt { get; set; }

//         [Column("is_vat_all")]
//         [MaxLength(50)]
//         public string? IsVatAll { get; set; }

//         [Column("round_off_amount")]
//         public decimal RoundOffAmount { get; set; }

//         [Column("status")]
//         [MaxLength(20)]
//         public string Status { get; set; } = "active";

//         [Column("is_active")]
//         public bool IsActive { get; set; } = true;

//         // Foreign Keys
//         [Column("company_id")]
//         [ForeignKey("Company")]
//         public Guid CompanyId { get; set; }

//         [Column("user_id")]
//         [ForeignKey("User")]
//         public Guid UserId { get; set; }

//         [Column("fiscal_year_id")]
//         [ForeignKey("FiscalYear")]
//         public Guid FiscalYearId { get; set; }

//         // Navigation Properties
//         public virtual Company? Company { get; set; }
//         public virtual User? User { get; set; }
//         public virtual FiscalYear? FiscalYear { get; set; }
        
//         // Collection Navigation Property
//         public virtual ICollection<StockAdjustmentItem> Items { get; set; } = new List<StockAdjustmentItem>();

//         [Column("created_at")]
//         public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

//         [Column("updated_at")]
//         public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
//     }

//     [Table("stock_adjustment_items")]
//     public class StockAdjustmentItem
//     {
//         [Key]
//         [Column("id")]
//         public Guid Id { get; set; }

//         [Column("stock_adjustment_id")]
//         [ForeignKey("StockAdjustment")]
//         public Guid StockAdjustmentId { get; set; }

//         [Column("item_id")]
//         [ForeignKey("Item")]
//         public Guid ItemId { get; set; }

//         [Column("unit_id")]
//         [ForeignKey("Unit")]
//         public Guid UnitId { get; set; }

//         [Column("quantity")]
//         public decimal Quantity { get; set; }

//         [Column("batch_number")]
//         [MaxLength(100)]
//         public string? BatchNumber { get; set; }

//         [Column("expiry_date")]
//         public DateOnly? ExpiryDate { get; set; }

//         [Column("pu_price")]
//         public decimal PuPrice { get; set; }

//         [Column("reason")]
//         public string[] Reason { get; set; } = Array.Empty<string>();

//         [Column("vat_status")]
//         [Required]
//         [MaxLength(20)]
//         public string VatStatus { get; set; } // "vatable" or "vatExempt"

//         // Navigation Properties
//         public virtual StockAdjustment? StockAdjustment { get; set; }
//         public virtual Item? Item { get; set; }
//         public virtual Unit? Unit { get; set; }
//     }
// }

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.UserModel;

namespace SkyForge.Models.Retailer.StockAdjustmentModel
{
    [Table("stock_adjustments")]
    public class StockAdjustment
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("bill_number")]
        [Required]
        [MaxLength(100)]
        public string BillNumber { get; set; }

        [Column("date")]
        public DateTime Date { get; set; } = DateTime.UtcNow;

        [Column("note")]
        public string? Note { get; set; }

        [Column("adjustment_type")]
        [Required]
        [MaxLength(10)]
        public string AdjustmentType { get; set; } // "xcess" or "short"

        [Column("sub_total")]
        public decimal SubTotal { get; set; }

        [Column("non_vat_adjustment")]
        public decimal NonVatAdjustment { get; set; }

        [Column("taxable_amount")]
        public decimal TaxableAmount { get; set; }

        [Column("discount_percentage")]
        public decimal DiscountPercentage { get; set; }

        [Column("discount_amount")]
        public decimal DiscountAmount { get; set; }

        [Column("vat_percentage")]
        public decimal VatPercentage { get; set; } = 13;

        [Column("vat_amount")]
        public decimal VatAmount { get; set; }

        [Column("total_amount")]
        public decimal TotalAmount { get; set; }

        [Column("is_vat_exempt")]
        public bool IsVatExempt { get; set; }

        [Column("is_vat_all")]
        [MaxLength(50)]
        public string? IsVatAll { get; set; }

        [Column("round_off_amount")]
        public decimal RoundOffAmount { get; set; }

        [Column("status")]
        [MaxLength(20)]
        public string Status { get; set; } = "active";

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        // Foreign Keys
        [Column("company_id")]
        [ForeignKey("Company")]
        public Guid CompanyId { get; set; }

        [Column("user_id")]
        [ForeignKey("User")]
        public Guid UserId { get; set; }

        [Column("fiscal_year_id")]
        [ForeignKey("FiscalYear")]
        public Guid FiscalYearId { get; set; }

        // Navigation Properties
        public virtual Company? Company { get; set; }
        public virtual User? User { get; set; }
        public virtual FiscalYear? FiscalYear { get; set; }
        
        // Collection Navigation Property
        public virtual ICollection<StockAdjustmentItem> Items { get; set; } = new List<StockAdjustmentItem>();

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}