using SkyForge.Models.AccountModel;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.Retailer.Sales;
using SkyForge.Models.Retailer.SettingsModel;
using SkyForge.Models.UnitModel;
using SkyForge.Models.UserModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkyForge.Models.Retailer.SalesReturnModel
{
    [Table("sales_returns")]
    public class SalesReturn
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("company_id")]
        public Guid CompanyId { get; set; }

        [ForeignKey("CompanyId")]
        public Company Company { get; set; } = null!;

        [Column("first_printed")]
        public bool FirstPrinted { get; set; } = false;

        [Column("print_count")]
        public int PrintCount { get; set; } = 0;

        [Column("original_sales_bill_id")]
        public Guid? OriginalSalesBillId { get; set; }

        [ForeignKey("OriginalSalesBillId")]
        public SalesBill? OriginalSalesBill { get; set; }

        [Column("original_sales_bill_number")]
        [StringLength(100)]
        public string? OriginalSalesBillNumber { get; set; }

        [Column("purchase_sales_return_type")]
        [StringLength(50)]
        public string? PurchaseSalesReturnType { get; set; }

        [Column("type")]
        [StringLength(50)]
        public string? Type { get; set; }

        [Column("original_copies")]
        public int OriginalCopies { get; set; } = 1;

        [Required]
        [Column("user_id")]
        public Guid UserId { get; set; }

        [ForeignKey("UserId")]
        public User User { get; set; } = null!;

        [Required]
        [Column("bill_number")]
        [StringLength(100)]
        public string BillNumber { get; set; } = string.Empty;

        [Column("account_id")]
        public Guid? AccountId { get; set; }

        [ForeignKey("AccountId")]
        public Account? Account { get; set; }

        [Column("cash_account")]
        [StringLength(255)]
        public string? CashAccount { get; set; }

        [Column("cash_account_address")]
        [StringLength(500)]
        public string? CashAccountAddress { get; set; }

        [Column("cash_account_pan")]
        [StringLength(50)]
        public string? CashAccountPan { get; set; }

        [Column("cash_account_email")]
        [StringLength(255)]
        public string? CashAccountEmail { get; set; }

        [Column("cash_account_phone")]
        [StringLength(20)]
        public string? CashAccountPhone { get; set; }

        [Column("unit_id")]
        public Guid? UnitId { get; set; }

        [ForeignKey("UnitId")]
        public Unit? Unit { get; set; }

        [Column("settings_id")]
        public Guid? SettingsId { get; set; }

        [ForeignKey("SettingsId")]
        public Settings? Settings { get; set; }

        [Required]
        [Column("fiscal_year_id")]
        public Guid FiscalYearId { get; set; }

        [ForeignKey("FiscalYearId")]
        public FiscalYear FiscalYear { get; set; } = null!;

        [Column("sub_total")]
        [Precision(18, 2)]
        public decimal? SubTotal { get; set; }

        [Column("non_vat_sales_return")]
        [Precision(18, 2)]
        public decimal? NonVatSalesReturn { get; set; }

        [Column("taxable_amount")]
        [Precision(18, 2)]
        public decimal? TaxableAmount { get; set; }

        [Column("discount_percentage")]
        [Precision(5, 2)]
        public decimal? DiscountPercentage { get; set; }

        [Column("discount_amount")]
        [Precision(18, 2)]
        public decimal? DiscountAmount { get; set; }

        [Column("vat_percentage")]
        [Precision(5, 2)]
        public decimal VatPercentage { get; set; } = 13;

        [Column("vat_amount")]
        [Precision(18, 2)]
        public decimal? VatAmount { get; set; }

        [Column("total_amount")]
        [Precision(18, 2)]
        public decimal? TotalAmount { get; set; }

        [Column("is_vat_exempt")]
        public bool IsVatExempt { get; set; } = false;

        [Column("is_vat_all")]
        [StringLength(50)]
        public string? IsVatAll { get; set; }

        [Column("round_off_amount")]
        [Precision(18, 2)]
        public decimal? RoundOffAmount { get; set; }

        [Column("payment_mode")]
        [StringLength(50)]
        public string? PaymentMode { get; set; }

        [Column("quantity")]
        [Precision(10, 3)]
        public decimal? Quantity { get; set; }

        [Column("price")]
        [Precision(18, 2)]
        public decimal? Price { get; set; }

        [Column("nepali_date")]
        public DateTime nepaliDate { get; set; }

        [Column("date")]
        public DateTime Date { get; set; }

        [Column("transaction_date_nepali")]
        public DateTime transactionDateNepali { get; set; }

        [Column("transaction_date")]
        public DateTime TransactionDate { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public virtual ICollection<SalesReturnItem> Items { get; set; } = new List<SalesReturnItem>();

        // Index for unique constraint
        [Index("IX_SalesReturn_BillNumber_Company_FiscalYear", IsUnique = true,
            Name = "IX_SalesReturn_BillNumber_Company_FiscalYear")]
        public class SalesReturnIndex
        {
            [Column("bill_number")]
            public string BillNumber { get; set; } = string.Empty;

            [Column("company_id")]
            public Guid CompanyId { get; set; }

            [Column("fiscal_year_id")]
            public Guid FiscalYearId { get; set; }
        }
    }
}
