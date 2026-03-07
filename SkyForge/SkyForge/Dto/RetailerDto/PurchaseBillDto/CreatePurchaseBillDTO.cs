
using SkyForge.Dto.RetailerDto.PurchaseBillDto;
using System.ComponentModel.DataAnnotations;
using SkyForge.Dto.AccountDto;
using SkyForge.Dto.RetailerDto;

namespace SkyForge.Dto.RetailerDto.PurchaseBillDto
{
    public class CreatePurchaseBillDTO
    {
        [StringLength(50)]
        public string? PurchaseSalesType { get; set; }

        [Range(1, int.MaxValue)]
        public int OriginalCopies { get; set; } = 1;

        [StringLength(100)]
        public string? PartyBillNumber { get; set; }

        public Guid? AccountId { get; set; }
        public Guid? VatAccountId { get; set; }
        public Guid? PurchaseAccountId { get; set; }
        public Guid? RoundOffAccountId { get; set; }
        public Guid? UnitId { get; set; }
        public Guid? SettingsId { get; set; }

        [Required]
        [MinLength(1)]
        public List<PurchaseBillItemDTO> Items { get; set; } = new();

        [Range(0, double.MaxValue)]
        public decimal? SubTotal { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? NonVatPurchase { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? TaxableAmount { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? TotalCcAmount { get; set; }

        [Range(0, 100)]
        public decimal? DiscountPercentage { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? DiscountAmount { get; set; }

        [Range(0, 100)]
        public decimal VatPercentage { get; set; } = 13;

        [Range(0, double.MaxValue)]
        public decimal? VatAmount { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? TotalAmount { get; set; }

        public bool IsVatExempt { get; set; } = false;

        [StringLength(50)]
        public string? IsVatAll { get; set; }

        [Range(-double.MaxValue, double.MaxValue)]
        public decimal? RoundOffAmount { get; set; }

        [StringLength(50)]
        public string? PaymentMode { get; set; }

        public DateTime NepaliDate { get; set; }
        public DateTime Date { get; set; }

        public DateTime TransactionDateNepali { get; set; }
        public DateTime TransactionDate { get; set; }
    }

    public class PurchaseEntryDataDTO
    {
        public CompanyInfoDTO Company { get; set; } = new();
        public List<AccountInfoDTO> Accounts { get; set; } = new();
        public DateInfoDTO Dates { get; set; } = new();
        public FiscalYearDTO CurrentFiscalYear { get; set; } = new();
        public string NextPurchaseBillNumber { get; set; } = string.Empty;
        public UserPreferencesDTO UserPreferences { get; set; } = new();
        public PermissionsDTO Permissions { get; set; } = new();
        public string CurrentCompanyName { get; set; } = string.Empty;
    }
}
