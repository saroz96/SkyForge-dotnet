using SkyForge.Models.AccountModel;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.Retailer.SettingsModel;
using SkyForge.Models.UserModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkyForge.Models.Retailer.Sales
{
    [Table("sales_bills")]
    public class SalesBill
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
            
        [Required]
        [Column("purchase_sales_type")]
        [StringLength(50)]
        public string PurchaseSalesType { get; set; } = string.Empty;

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
        public decimal SubTotal { get; set; } = 0;

        [Column("non_vat_sales")]
        [Precision(18, 2)]
        public decimal NonVatSales { get; set; } = 0;

        [Column("taxable_amount")]
        [Precision(18, 2)]
        public decimal TaxableAmount { get; set; } = 0;

        [Column("discount_percentage")]
        [Precision(5, 2)]
        public decimal DiscountPercentage { get; set; } = 0;

        [Column("discount_amount")]
        [Precision(18, 2)]
        public decimal DiscountAmount { get; set; } = 0;

        [Column("vat_percentage")]
        [Precision(5, 2)]
        public decimal VatPercentage { get; set; } = 13;

        [Column("vat_amount")]
        [Precision(18, 2)]
        public decimal VatAmount { get; set; } = 0;

        [Column("total_amount")]
        [Precision(18, 2)]
        public decimal TotalAmount { get; set; } = 0;

        [Column("is_vat_exempt")]
        public bool IsVatExempt { get; set; } = false;

        [Column("is_vat_all")]
        [StringLength(50)]
        public string? IsVatAll { get; set; }

        [Column("round_off_amount")]
        [Precision(18, 2)]
        public decimal RoundOffAmount { get; set; } = 0;

        [Column("payment_mode")]
        [StringLength(50)]
        public string? PaymentMode { get; set; }

        [Column("date")]
        public DateTime Date { get; set; } = DateTime.UtcNow;

        [Column("transaction_date")]
        public DateTime TransactionDate { get; set; } = DateTime.UtcNow;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public virtual ICollection<SalesBillItem> Items { get; set; } = new List<SalesBillItem>();

        // Index for unique constraint
        [Index("IX_SalesBill_BillNumber_Company_FiscalYear", IsUnique = true,
            Name = "IX_SalesBill_BillNumber_Company_FiscalYear")]
        public class SalesBillIndex
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
