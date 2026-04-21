using SkyForge.Models.AccountModel;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.Retailer.SettingsModel;
using SkyForge.Models.UserModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkyForge.Models.Retailer.PurchaseReturnModel
{
    [Table("purchase_returns")]
    public class PurchaseReturn
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

        [Column("party_bill_number")]
        [StringLength(100)]
        public string? PartyBillNumber { get; set; }

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
        public decimal? SubTotal { get; set; }

        [Column("non_vat_purchase_return")]
        [Precision(18, 2)]
        public decimal? NonVatPurchaseReturn { get; set; }

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

        [Column("total_cc_amount")]
        [Precision(18, 2)]
        public decimal TotalCcAmount { get; set; } = 0;

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
        public virtual ICollection<PurchaseReturnItem> Items { get; set; } = new List<PurchaseReturnItem>();

        // Index for unique constraint
        [Index("IX_PurchaseReturn_BillNumber_Company_FiscalYear", IsUnique = true,
            Name = "IX_PurchaseReturn_BillNumber_Company_FiscalYear")]
        public class PurchaseReturnIndex
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