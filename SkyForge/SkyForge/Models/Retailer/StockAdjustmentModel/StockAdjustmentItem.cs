// Models/Retailer/StockAdjustmentItem.cs
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SkyForge.Models.Retailer.Items;
using SkyForge.Models.UnitModel;

namespace SkyForge.Models.Retailer.StockAdjustmentModel
{
    [Table("stock_adjustment_items")]
    public class StockAdjustmentItem
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("stock_adjustment_id")]
        [ForeignKey("StockAdjustment")]
        public Guid StockAdjustmentId { get; set; }

        [Column("item_id")]
        [ForeignKey("Item")]
        public Guid ItemId { get; set; }

        [Column("unit_id")]
        [ForeignKey("Unit")]
        public Guid UnitId { get; set; }

        [Column("quantity")]
        public decimal Quantity { get; set; }

        [Column("batch_number")]
        [MaxLength(100)]
        public string? BatchNumber { get; set; }

        [Column("expiry_date")]
        public DateOnly? ExpiryDate { get; set; }

        [Column("pu_price")]
        public decimal PuPrice { get; set; }

        [Column("reason")]
        public string[] Reason { get; set; } = Array.Empty<string>();

        [Column("vat_status")]
        [Required]
        [MaxLength(20)]
        public string VatStatus { get; set; } // "vatable" or "vatExempt"

        // Navigation Properties
        public virtual StockAdjustment? StockAdjustment { get; set; }
        public virtual Item? Item { get; set; }
        public virtual Unit? Unit { get; set; }
    }
}