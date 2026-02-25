using SkyForge.Models.Retailer.Items;
using SkyForge.Models.UnitModel;
using SkyForge.Models.Retailer.SalesQuotationModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkyForge.Models.Retailer.SalesQuotationModel
{
    [Table("sales_quotation_items")]
    public class SalesQuotationItem
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("sales_quotation_id")]
        public Guid SalesQuotationId { get; set; }

        [ForeignKey("SalesQuotationId")]
        public SalesQuotation SalesQuotation { get; set; } = null!;

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

        [Required]
        [Column("price")]
        [Precision(18, 2)]
        public decimal Price { get; set; }

        [Required]
        [Column("vat_status")]
        [StringLength(20)]
        public string VatStatus { get; set; } = string.Empty; // 'vatable' or 'vatExempt'

        [Column("unique_uuid")]
        [StringLength(100)]
        public string? UniqueUuid { get; set; }

        [Column("description")]
        [StringLength(500)]
        public string? Description { get; set; }

        public decimal? PuPrice { get; set; }
        [Column("discount_percentage_per_item")]
        [Precision(5, 2)]
        public decimal DiscountPercentagePerItem { get; set; } = 0;

        [Column("discount_amount_per_item")]
        [Precision(18, 2)]
        public decimal DiscountAmountPerItem { get; set; } = 0;


        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
