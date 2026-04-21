using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SkyForge.Models.FiscalYearModel;

namespace SkyForge.Models.Retailer.Items
{
    [Table("item_initial_opening_stocks")]
    public class ItemInitialOpeningStock
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        // One-to-One relationship with Item
        [Required]
        [Column("item_id")]
        public Guid ItemId { get; set; }

        [ForeignKey("ItemId")]
        public Item Item { get; set; } = null!;

        [Column("initial_fiscal_year_id")]
        public Guid? InitialFiscalYearId { get; set; }

        [ForeignKey("InitialFiscalYearId")]
        public FiscalYear? InitialFiscalYear { get; set; }

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

        [Column("date")]
        public DateTime Date { get; set; } = DateTime.UtcNow;

         [Column("Nepali_Date")]
        public DateTime? NepaliDate { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
