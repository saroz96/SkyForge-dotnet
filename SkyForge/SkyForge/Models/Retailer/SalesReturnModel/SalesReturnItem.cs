
using SkyForge.Models.Retailer.Items;
using SkyForge.Models.Retailer.SalesReturnModel;
using SkyForge.Models.UnitModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkyForge.Models.Retailer.SalesReturnModel
{
    [Table("sales_return_items")]
    public class SalesReturnItem
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("sales_return_id")]
        public Guid SalesReturnId { get; set; }

        [ForeignKey("SalesReturnId")]
        public SalesReturn SalesReturn { get; set; } = null!;

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

        [Required]
        [Column("quantity")]
        [Precision(10, 3)]
        public decimal Quantity { get; set; }

        [Required]
        [Column("price")]
        [Precision(18, 2)]
        public decimal Price { get; set; }

        [Column("net_price")]
        [Precision(18, 2)]
        public decimal? NetPrice { get; set; }

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
        public decimal NetPuPrice { get; set; } = 0;

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

        // Calculated properties
        [NotMapped]
        public decimal ItemTotal => Quantity * Price;

        [NotMapped]
        public decimal ItemTotalWithDiscount => ItemTotal - DiscountAmountPerItem;

        [NotMapped]
        public decimal EffectivePrice => Price - (DiscountAmountPerItem / Quantity);
    }
}