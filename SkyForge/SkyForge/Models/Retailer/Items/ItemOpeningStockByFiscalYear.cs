
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SkyForge.Models.FiscalYearModel;

namespace SkyForge.Models.Retailer.Items
{
    [Table("item_opening_stock_by_fiscal_year")]
    public class ItemOpeningStockByFiscalYear
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("item_id")]
        public Guid ItemId { get; set; }

        [ForeignKey("ItemId")]
        public Item Item { get; set; } = null!;

        [Required]
        [Column("fiscal_year_id")]
        public Guid FiscalYearId { get; set; }

        [ForeignKey("FiscalYearId")]
        public FiscalYear FiscalYear { get; set; } = null!;

        [Required]
        [Column("opening_stock")]
        [Precision(10, 3)]
        public decimal OpeningStock { get; set; } = 0;

        [Required]
        [Column("opening_stock_value")]
        [Precision(18, 2)]
        public decimal OpeningStockValue { get; set; } = 0;

        [Required]
        [Column("purchase_price")]
        [Precision(18, 2)]
        public decimal PurchasePrice { get; set; } = 0;

        [Required]
        [Column("sales_price")]
        [Precision(18, 2)]
        public decimal SalesPrice { get; set; } = 0;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
