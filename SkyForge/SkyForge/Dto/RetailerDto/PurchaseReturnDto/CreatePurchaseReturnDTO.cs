using SkyForge.Dto.RetailerDto.PurchaseReturnDto;
using System.ComponentModel.DataAnnotations;
using SkyForge.Dto.AccountDto;


namespace SkyForge.Dto.RetailerDto.PurchaseReturnDto
{
    public class CreatePurchaseReturnDTO
    {
        [Required]
        public Guid CompanyId { get; set; }

        [StringLength(50)]
        public string? PurchaseSalesReturnType { get; set; }

        [Range(1, int.MaxValue)]
        public int OriginalCopies { get; set; } = 1;

        [Required]
        public Guid UserId { get; set; }

        [StringLength(100)]
        public string BillNumber { get; set; } = string.Empty;

        [StringLength(100)]
        public string? PartyBillNumber { get; set; }

        public Guid? AccountId { get; set; }
        public Guid? SettingsId { get; set; }

        [Required]
        public Guid FiscalYearId { get; set; }

        [Required]
        [MinLength(1)]
        public List<PurchaseReturnItemDTO> Items { get; set; } = new();

        [Range(0, double.MaxValue)]
        public decimal? SubTotal { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? NonVatPurchaseReturn { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? TaxableAmount { get; set; }

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

    public class CompanyInfoDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Pan { get; set; } = string.Empty;
        public string? RenewalDate { get; set; }
        public string DateFormat { get; set; } = string.Empty; // Make sure this is string
        public bool VatEnabled { get; set; }

        public FiscalYearDTO FiscalYear { get; set; }
    }

    public class FiscalYearDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? StartDateNepali { get; set; }
        public string? EndDateNepali { get; set; }
        public bool IsActive { get; set; }
        public string DateFormat { get; set; } = "English";
    }
    public class DateInfoDTO
    {
        public string NepaliDate { get; set; } = string.Empty;
        public string TransactionDateNepali { get; set; } = string.Empty;
        public string CompanyDateFormat { get; set; } = string.Empty;
    }
    public class UserPreferencesDTO
    {
        public string Theme { get; set; } = "light";
    }
    public class PermissionsDTO
    {
        public bool IsAdminOrSupervisor { get; set; }
        public bool StoreManagementEnabled { get; set; }
    }

    public class PurchaseReturnEntryDataDTO
    {
        public CompanyInfoDTO Company { get; set; } = new();
        public List<AccountInfoDTO> Accounts { get; set; } = new();
        public DateInfoDTO Dates { get; set; } = new();
        public FiscalYearDTO CurrentFiscalYear { get; set; } = new();
        public string NextPurchaseReturnBillNumber { get; set; } = string.Empty;
        public UserPreferencesDTO UserPreferences { get; set; } = new();
        public PermissionsDTO Permissions { get; set; } = new();
        public string CurrentCompanyName { get; set; } = string.Empty;
    }
}
