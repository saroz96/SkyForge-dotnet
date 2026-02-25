using SkyForge.Models.AccountModel;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.Retailer.SettingsModel;
using SkyForge.Models.UserModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkyForge.Models.Retailer.SalesQuotationModel
{
    [Table("sales_quotations")]
    public class SalesQuotation
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("company_id")]
        public Guid CompanyId { get; set; }

        [ForeignKey("CompanyId")]
        public Company Company { get; set; } = null!;

        [Required]
        [Column("purchase_sales_type")]
        [StringLength(50)]
        public string PurchaseSalesType { get; set; } = string.Empty;

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

        [Column("description")]
        [StringLength(500)]
        public string? Description { get; set; }

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
        public virtual ICollection<SalesQuotationItem> Items { get; set; } = new List<SalesQuotationItem>();
    }
}