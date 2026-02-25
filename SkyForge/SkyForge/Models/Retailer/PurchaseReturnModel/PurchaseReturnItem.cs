using SkyForge.Models.Retailer.Items;
using SkyForge.Models.Retailer.Purchase;
using SkyForge.Models.Retailer.PurchaseReturnModel;
using SkyForge.Models.UnitModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkyForge.Models.Retailer.PurchaseReturnModel
{
    [Table("purchase_return_items")]
    public class PurchaseReturnItem
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("purchase_return_id")]
        public Guid PurchaseReturnId { get; set; }

        [ForeignKey("PurchaseReturnId")]
        public PurchaseReturn PurchaseReturn { get; set; } = null!;

        [Required]
        [Column("item_id")]
        public Guid ItemId { get; set; }

        [ForeignKey("ItemId")]
        public Item Item { get; set; } = null!;

        [Required]
        [Column("unit_id")]
        public Guid UnitId { get; set; }

        [ForeignKey("UnitId")]
        public Unit Unit { get; set; } = null!;

        [Column("ws_unit")]
        [Precision(10, 3)]
        public decimal? WsUnit { get; set; }

        [Column("quantity")]
        [Precision(10, 3)]
        public decimal? Quantity { get; set; }

        [Column("price")]
        [Precision(18, 2)]
        public decimal? Price { get; set; }

        [Column("pu_price")]
        [Precision(18, 2)]
        public decimal? PuPrice { get; set; }
        [Column("discount_percentage_per_item")]
        [Precision(5, 2)]
        public decimal DiscountPercentagePerItem { get; set; } = 0;

        [Column("discount_amount_per_item")]
        [Precision(18, 2)]
        public decimal DiscountAmountPerItem { get; set; } = 0;

        [Column("net_pu_price")]
        [Precision(18, 2)]
        public decimal NetPuPrice { get; set; }


        [Column("mrp")]
        [Precision(18, 2)]
        public decimal Mrp { get; set; } = 0;

        [Column("margin_percentage")]
        [Precision(5, 2)]
        public decimal MarginPercentage { get; set; } = 0;

        [Column("currency")]
        [StringLength(10)]
        public string? Currency { get; set; }

        [Column("alt_quantity")]
        [Precision(10, 3)]
        public decimal? AltQuantity { get; set; }

        [Column("alt_price")]
        [Precision(18, 2)]
        public decimal? AltPrice { get; set; }

        [Column("alt_pu_price")]
        [Precision(18, 2)]
        public decimal? AltPuPrice { get; set; }

        [Column("batch_number")]
        [StringLength(100)]
        public string? BatchNumber { get; set; }

        [Column("expiry_date")]
        public DateOnly? ExpiryDate { get; set; }

        [Required]
        [Column("vat_status")]
        [StringLength(20)]
        public string VatStatus { get; set; } = string.Empty; // 'vatable' or 'vatExempt'

        [Column("unique_uuid")]
        [StringLength(100)]
        public string? UniqueUuid { get; set; }

        [Column("purchase_bill_id")]
        public Guid? PurchaseBillId { get; set; }

        [ForeignKey("PurchaseBillId")]
        public PurchaseBill? PurchaseBill { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Computed properties (for display/calculation)
        [NotMapped]
        public decimal? CalculatedAltQuantity => WsUnit.HasValue && WsUnit > 0 && Quantity.HasValue
            ? WsUnit.Value * Quantity.Value
            : Quantity;

        [NotMapped]
        public decimal? CalculatedAltPrice => WsUnit.HasValue && WsUnit > 0 && Price.HasValue
            ? Price.Value / WsUnit.Value
            : Price;

        [NotMapped]
        public decimal? CalculatedAltPuPrice => WsUnit.HasValue && WsUnit > 0 && PuPrice.HasValue
            ? PuPrice.Value / WsUnit.Value
            : PuPrice;

        [NotMapped]
        public decimal? ItemTotal => Quantity.HasValue && Price.HasValue ? Quantity.Value * Price.Value : 0;
    }
}
