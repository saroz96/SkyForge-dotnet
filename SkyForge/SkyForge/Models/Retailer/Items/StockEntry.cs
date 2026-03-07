using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.RackModel;
using SkyForge.Models.Retailer.Purchase;
using SkyForge.Models.Retailer.StoreModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SkyForge.Models.Retailer.SalesReturnModel;

namespace SkyForge.Models.Retailer.Items
{
    [Table("stock_entries")]
    public class StockEntry
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("item_id")]
        public Guid ItemId { get; set; }

        [ForeignKey("ItemId")]
        public Item Item { get; set; } = null!;

        [Column("date")]
        public DateTime Date { get; set; } = DateTime.UtcNow;

        [Column("ws_unit")]
        [Precision(10, 3)]
        public decimal? WsUnit { get; set; }

        [Required]
        [Column("quantity")]
        [Precision(10, 3)]
        public decimal Quantity { get; set; }

        [Column("bonus")]
        [Precision(10, 3)]
        public decimal? Bonus { get; set; } = 0;

        [Column("batch_number")]
        [StringLength(100)]
        public string BatchNumber { get; set; } = "XXX";

        [Column("expiry_date")]
        public DateOnly ExpiryDate { get; set; }

        [Column("price")]
        [Precision(18, 2)]
        public decimal Price { get; set; } = 0;

        [Column("net_price")]
        [Precision(18, 2)]
        public decimal NetPrice { get; set; } = 0;

        [Column("pu_price")]
        [Precision(18, 2)]
        public decimal PuPrice { get; set; } = 0;

        [Column("item_cc_amount")]
        [Precision(18, 2)]
        public decimal ItemCcAmount { get; set; } = 0;

        [Column("discount_percentage_per_item")]
        [Precision(5, 2)]
        public decimal DiscountPercentagePerItem { get; set; } = 0;

        [Column("discount_amount_per_item")]
        [Precision(18, 2)]
        public decimal DiscountAmountPerItem { get; set; } = 0;

        [Column("net_pu_price")]
        [Precision(18, 2)]
        public decimal NetPuPrice { get; set; } = 0;

        [Column("main_unit_pu_price")]
        [Precision(18, 2)]
        public decimal MainUnitPuPrice { get; set; } = 0;

        [Column("mrp")]
        [Precision(18, 2)]
        public decimal Mrp { get; set; } = 0;

        [Column("margin_percentage")]
        [Precision(5, 2)]
        public decimal MarginPercentage { get; set; } = 0;

        [Column("currency")]
        [StringLength(10)]
        public string? Currency { get; set; }

        [Column("fiscal_year_id")]
        public Guid? FiscalYearId { get; set; }

        [ForeignKey("FiscalYearId")]
        public FiscalYear? FiscalYear { get; set; }

        [Column("unique_uuid")]
        [StringLength(100)]
        public string? UniqueUuid { get; set; }

        [Column("purchase_bill_id")]
        public Guid? PurchaseBillId { get; set; }

        [ForeignKey("PurchaseBillId")]
        public PurchaseBill? PurchaseBill { get; set; }

        [Column("sales_return_bill_id")]
        public Guid? SalesReturnBillId { get; set; }

        [ForeignKey("SalesReturnBillId")]
        public SalesReturn? SalesReturnBill { get; set; }
        [Required]
        [Column("expiry_status")]
        [StringLength(20)]
        public string ExpiryStatus { get; set; } = "safe"; // 'safe', 'warning', 'danger', 'expired'

        [Required]
        [Column("days_until_expiry")]
        public int DaysUntilExpiry { get; set; } = 730; // Default 2 years in days

        [Column("store_id")]
        public Guid? StoreId { get; set; }

        [ForeignKey("StoreId")]
        public Store? Store { get; set; }

        [Column("rack_id")]
        public Guid? RackId { get; set; }

        [ForeignKey("RackId")]
        public Rack? Rack { get; set; }

        [Column("source_transfer_from_store_id")]
        public Guid? SourceTransferFromStoreId { get; set; }

        [Column("source_transfer_original_entry_id")]
        public Guid? SourceTransferOriginalEntryId { get; set; }

        [Column("source_transfer_date")]
        public DateTime? SourceTransferDate { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property back to Item
        public Item? ParentItem { get; set; }
    }
}
