using System.Text.Json.Serialization;
using SkyForge.Dto.AccountDto;

namespace SkyForge.Dto.RetailerDto.PurchaseReturnDto
{

    public class PurchaseReturnBillData
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; } = string.Empty;

        public AccountInfoDTO? Account { get; set; }
        public decimal TotalAmount { get; set; }
        public List<PurchaseReturnItemDTO> Items { get; set; } = new();
        public decimal VatAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal RoundOffAmount { get; set; }
        public decimal SubTotal { get; set; }
        public decimal TaxableAmount { get; set; }
        public decimal NonVatPurchaseReturn { get; set; }
        public bool IsVatExempt { get; set; }
        public decimal VatPercentage { get; set; }
        public string PaymentMode { get; set; } = string.Empty;
        public string PartyBillNumber { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public DateTime TransactionDate { get; set; }
        public UserInfo? User { get; set; }
    }
    public class PurchaseReturnResponseDTO
    {
        public Guid Id { get; set; }
        public Guid CompanyId { get; set; }
        public string? CompanyName { get; set; }
        public bool FirstPrinted { get; set; }
        public int PrintCount { get; set; }
        public string? PurchaseSalesReturnType { get; set; }
        public int OriginalCopies { get; set; }
        public Guid UserId { get; set; }
        public string? UserName { get; set; }

        public string BillNumber { get; set; } = string.Empty;
        public string? PartyBillNumber { get; set; }
        public Guid? AccountId { get; set; }
        public string? AccountName { get; set; }
        public Guid? PurchaseReturnAccountId { get; set; }
        public string? PurchaseReturnAccountName { get; set; }
        public Guid? SettingsId { get; set; }

        public Guid FiscalYearId { get; set; }
        public string? FiscalYearName { get; set; }
        public List<PurchaseReturnItemResponseDTO> Items { get; set; } = new();
        public CompanyInfoDTO? Company { get; set; }
        public DatesDTO? Dates { get; set; }
        public string NextPurchaseReturnBillNumber { get; set; } = string.Empty;
        public FiscalYearInfoDTO? CurrentFiscalYear { get; set; }
        public List<CategoryInfoDTO> Categories { get; set; } = new();
        public List<UnitInfoDTO> Units { get; set; } = new();
        public List<CompanyGroupInfoDTO> CompanyGroups { get; set; } = new();
        public UserPreferencesDTO? UserPreferences { get; set; }
        public PermissionsDTO? Permissions { get; set; }
        public string? CurrentCompanyName { get; set; }

        public decimal? VatAmount { get; set; }
        public decimal? DiscountPercentage { get; set; }
        public decimal? DiscountAmount { get; set; }
        public decimal? RoundOffAmount { get; set; }
        public decimal? SubTotal { get; set; }
        public decimal? TaxableAmount { get; set; }
        public decimal? NonVatPurchaseReturn { get; set; }
        public bool IsVatExempt { get; set; }
        public string? IsVatAll { get; set; }
        public decimal? VatPercentage { get; set; }
        public decimal? TotalAmount { get; set; }
        public string? PaymentMode { get; set; } = string.Empty;
        public DateTime nepaliDate { get; set; }
        public DateTime Date { get; set; }
        public DateTime transactionDateNepali { get; set; }
        public DateTime TransactionDate { get; set; }
        public UserInfo? User { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // public class CompanyInfoDTO
    // {
    //     public Guid Id { get; set; }
    //     public DateTime? RenewalDate { get; set; }
    //     public string? DateFormat { get; set; }
    //     public bool VatEnabled { get; set; }
    //     public FiscalYearInfoDTO? FiscalYear { get; set; }
    // }

    public class FiscalYearInfoDTO
    {
        public Guid Id { get; set; }
        public string? Name { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public bool IsActive { get; set; }
        public string? DateFormat { get; set; }
    }

    public class DatesDTO
    {
        public string? NepaliDate { get; set; }
        public string? TransactionDateNepali { get; set; }
        public string? CompanyDateFormat { get; set; }
    }

    // public class CategoryInfoDTO
    // {
    //     public Guid Id { get; set; }
    //     public string? Name { get; set; }
    // }

    // public class UnitInfoDTO
    // {
    //     public Guid Id { get; set; }
    //     public string? Name { get; set; }
    // }

    public class CompanyGroupInfoDTO
    {
        public Guid Id { get; set; }
        public string? Name { get; set; }
    }

    // public class UserPreferencesDTO
    // {
    //     public string Theme { get; set; } = "light";
    // }

    // public class PermissionsDTO
    // {
    //     public bool IsAdminOrSupervisor { get; set; }
    // }

    public class UserInfo
    {
        public string Name { get; set; } = string.Empty;
    }
}