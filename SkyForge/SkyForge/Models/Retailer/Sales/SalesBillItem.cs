using SkyForge.Models.Retailer.Items;
using SkyForge.Models.UnitModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkyForge.Models.Retailer.Sales
{
    [Table("sales_bill_items")]
    public class SalesBillItem
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("sales_bill_id")]
        public Guid SalesBillId { get; set; }

        [ForeignKey("SalesBillId")]
        public SalesBill SalesBill { get; set; } = null!;

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

        [Column("pu_price")]
        [Precision(18, 2)]
        public decimal? PuPrice { get; set; }

        [Column("mrp")]
        [Precision(18, 2)]
        public decimal? Mrp { get; set; }

        [Column("net_pu_price")]
        [Precision(18, 2)]
        public decimal? NetPuPrice { get; set; }

        [Column("discount_percentage_per_item")]
        [Precision(5, 2)]
        public decimal DiscountPercentagePerItem { get; set; } = 0;

        [Column("discount_amount_per_item")]
        [Precision(18, 2)]
        public decimal DiscountAmountPerItem { get; set; } = 0;

        [Column("net_price")]
        [Precision(18, 2)]
        public decimal NetPrice { get; set; } = 0;

        [Column("batch_number")]
        [StringLength(100)]
        public string? BatchNumber { get; set; }

        [Column("expiry_date")]
        public DateOnly? ExpiryDate { get; set; }

        [Column("margin_percentage")]
        [Precision(5, 2)]
        public decimal MarginPercentage { get; set; } = 0;

        [Required]
        [Column("vat_status")]
        [StringLength(20)]
        public string VatStatus { get; set; } = string.Empty; // 'vatable' or 'vatExempt'

        [Column("unique_uuid")]
        [StringLength(100)]
        public string? UniqueUuid { get; set; }

        [Column("purchase_bill_id")]
        public Guid? PurchaseBillId { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
