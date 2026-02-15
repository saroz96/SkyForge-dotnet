using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.Retailer.CategoryModel;
using SkyForge.Models.Retailer.CompositionModel;
using SkyForge.Models.Retailer.ItemCompanyModel;
using SkyForge.Models.Retailer.Items;
using SkyForge.Models.Retailer.MainUnitModel;
using SkyForge.Models.Retailer.Purchase;
using SkyForge.Models.Retailer.PurchaseReturnModel;
using SkyForge.Models.Retailer.Sales;
using SkyForge.Models.Retailer.SalesReturnModel;
using SkyForge.Models.UnitModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkyForge.Models.Retailer.Items
{
    [Table("items")]
    public class Item
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("name")]
        [StringLength(255)]
        public string Name { get; set; } = string.Empty;

        [Column("hscode")]
        public string? Hscode { get; set; }

        [Required]
        [Column("category_id")]
        public Guid CategoryId { get; set; }

        [ForeignKey("CategoryId")]
        public Category Category { get; set; } = null!;

        [Required]
        [Column("items_company_id")]
        public Guid ItemsCompanyId { get; set; }

        [ForeignKey("ItemsCompanyId")]
        public ItemCompany ItemCompany { get; set; } = null!;

        [Column("price")]
        [Precision(18, 2)]
        public decimal? Price { get; set; }

        [Column("pu_price")]
        [Precision(18, 2)]
        public decimal? PuPrice { get; set; }

        [Column("main_unit_pu_price")]
        [Precision(18, 2)]
        public decimal MainUnitPuPrice { get; set; } = 0;

        [Column("main_unit_id")]
        public Guid? MainUnitId { get; set; }

        [ForeignKey("MainUnitId")]
        public MainUnit? MainUnit { get; set; }

        // Navigation property for compositions
        public virtual ICollection<ItemComposition> ItemCompositions { get; set; } = new List<ItemComposition>();

        [NotMapped]
        public virtual ICollection<Composition> Compositions
        {
            get => ItemCompositions?.Select(ic => ic.Composition).ToList() ?? new List<Composition>();
            set
            {
                ItemCompositions = value?.Select(c => new ItemComposition
                {
                    ItemId = Id,
                    CompositionId = c.Id,
                    Composition = c
                }).ToList() ?? new List<ItemComposition>();
            }
        }

        [Column("ws_unit")]
        [Precision(10, 3)]
        public decimal WsUnit { get; set; } = 0;

        [Required]
        [Column("unit_id")]
        public Guid UnitId { get; set; }

        [ForeignKey("UnitId")]
        public Unit Unit { get; set; } = null!;

        [Required]
        [Column("vat_status")]
        [StringLength(20)]
        public string VatStatus { get; set; } = string.Empty; // 'all', 'vatable', 'vatExempt'

        [Column("opening_stock")]
        [Precision(10, 3)]
        public decimal OpeningStock { get; set; } = 0;

        [Column("min_stock")]
        [Precision(10, 3)]
        public decimal MinStock { get; set; } = 0;

        [Column("max_stock")]
        [Precision(10, 3)]
        public decimal MaxStock { get; set; } = 100;

        [Column("reorder_level")]
        [Precision(10, 3)]
        public decimal ReorderLevel { get; set; } = 0;

        [Required]
        [Column("unique_number")]
        public int UniqueNumber { get; set; }

        [Required]
        [Column("barcode_number")]
        public long BarcodeNumber { get; set; }

        // Navigation properties for related documents
        public virtual ICollection<SalesBill> Sales { get; set; } = new List<SalesBill>();
        public virtual ICollection<SalesReturn> SalesReturns { get; set; } = new List<SalesReturn>();
        public virtual ICollection<PurchaseBill> Purchases { get; set; } = new List<PurchaseBill>();
        public virtual ICollection<PurchaseReturn> PurchaseReturns { get; set; } = new List<PurchaseReturn>();

        // Stock entries (FIFO)
        public virtual ICollection<StockEntry> StockEntries { get; set; } = new List<StockEntry>();

        [Required]
        [Column("company_id")]
        public Guid CompanyId { get; set; }

        [ForeignKey("CompanyId")]
        public Company Company { get; set; } = null!;

        [Required]
        [Column("fiscal_year_id")]
        public Guid FiscalYearId { get; set; }

        [ForeignKey("FiscalYearId")]
        public FiscalYear FiscalYear { get; set; } = null!;

        [Column("original_fiscal_year_id")]
        public Guid? OriginalFiscalYearId { get; set; }

        [ForeignKey("OriginalFiscalYearId")]
        public FiscalYear? OriginalFiscalYear { get; set; }

        [Required]
        [Column("status")]
        [StringLength(20)]
        public string Status { get; set; } = "active"; // 'active', 'inactive'

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("date")]
        public DateTime Date { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public virtual ItemInitialOpeningStock? InitialOpeningStock { get; set; }

        public virtual ICollection<ItemClosingStockByFiscalYear> ClosingStocksByFiscalYear { get; set; } = new List<ItemClosingStockByFiscalYear>();

        public virtual ICollection<ItemOpeningStockByFiscalYear> OpeningStocksByFiscalYear { get; set; } = new List<ItemOpeningStockByFiscalYear>();
    }
}
