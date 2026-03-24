using SkyForge.Models.Retailer.Items;
using SkyForge.Models.Retailer.Purchase;
using SkyForge.Models.UnitModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SkyForge.Dto.RetailerDto.ItemDto;

namespace SkyForge.Models.Retailer.Purchase
{
    [Table("purchase_bill_items")]
    public class PurchaseBillItem
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("purchase_bill_id")]
        public Guid PurchaseBillId { get; set; }

        [ForeignKey("PurchaseBillId")]
        public PurchaseBill PurchaseBill { get; set; } = null!;

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

        [Required]
        [Column("quantity")]
        [Precision(10, 3)]
        public decimal Quantity { get; set; }

        [Column("bonus")]
        [Precision(10, 3)]
        public decimal? Bonus { get; set; }

        [Column("alt_bonus")]
        [Precision(10, 3)]
        public decimal? AltBonus { get; set; }

        [Column("price")]
        [Precision(18, 2)]
        public decimal Price { get; set; }

        [Required]
        [Column("pu_price")]
        [Precision(18, 2)]
        public decimal PuPrice { get; set; }

        [Column("discount_percentage_per_item")]
        [Precision(5, 2)]
        public decimal DiscountPercentagePerItem { get; set; } = 0;

        [Column("discount_amount_per_item")]
        [Precision(18, 2)]
        public decimal DiscountAmountPerItem { get; set; } = 0;

        [Column("net_pu_price")]
        [Precision(18, 2)]
        public decimal NetPuPrice { get; set; }

        [Column("cc_percentage")]
        [Precision(5, 2)]
        public decimal CcPercentage { get; set; } = 0;

        [Column("item_cc_amount")]
        [Precision(18, 2)]
        public decimal ItemCcAmount { get; set; } = 0;

        [Column("mrp")]
        [Precision(18, 2)]
        public decimal Mrp { get; set; } = 0;

        [Column("alt_mrp")]
        [Precision(18, 2)]
        public decimal? AltMrp { get; set; }

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

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Computed properties (will be calculated in code, not stored)
        [NotMapped]
        public decimal CalculatedAltBonus => WsUnit.HasValue && WsUnit > 0 ? WsUnit.Value * (Bonus ?? 0) : 0;

        [NotMapped]
        public decimal CalculatedNetPuPrice => WsUnit.HasValue && WsUnit > 0 ? NetPuPrice / WsUnit.Value : NetPuPrice;

        [NotMapped]
        public decimal CalculatedAltQuantity => WsUnit.HasValue && WsUnit > 0 ? WsUnit.Value * (AltQuantity ?? 0) : 0;

        [NotMapped]
        public decimal CalculatedAltPrice => WsUnit.HasValue && WsUnit > 0 ? (AltPrice ?? 0) / WsUnit.Value : 0;

        [NotMapped]
        public decimal CalculatedAltPuPrice => WsUnit.HasValue && WsUnit > 0 ? (AltPuPrice ?? 0) / WsUnit.Value : 0;
    }
}
