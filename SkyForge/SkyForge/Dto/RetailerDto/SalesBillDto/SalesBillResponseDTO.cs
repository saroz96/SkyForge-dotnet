using SkyForge.Dto.RetailerDto.SalesBillDto;
using SkyForge.Dto.AccountDto;
using System.Text.Json.Serialization;

namespace SkyForge.Dto.RetailerDto.SalesBillDto
{
    public class SalesBillData
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        public AccountInfoDTO? Account { get; set; }
        public decimal TotalAmount { get; set; }
        public List<SalesBillItemDTO> Items { get; set; } = new();
        public decimal VatAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal RoundOffAmount { get; set; }
        public decimal SubTotal { get; set; }
        public decimal TaxableAmount { get; set; }
        public decimal NonVatSales { get; set; }
        public bool IsVatExempt { get; set; }
        public decimal VatPercentage { get; set; }
        public string PaymentMode { get; set; } = string.Empty;
        public DateTime NepaliDate { get; set; }
        public DateTime Date { get; set; }
        public DateTime TransactionDateNepali { get; set; }
        public DateTime TransactionDate { get; set; }
        public UserInfo? User { get; set; }
    }

    public class SalesBillResponseDTO
    {
        public Guid Id { get; set; }
        public Guid SalesBillId { get; set; }
        public Guid CompanyId { get; set; }
        public string? CompanyName { get; set; }
        public CompanyInfoDTO Company { get; set; }
        public CompanyInfoDTO CurrentCompany { get; set; }

        public bool FirstPrinted { get; set; }
        public int PrintCount { get; set; }
        public string? PurchaseSalesType { get; set; }
        public int OriginalCopies { get; set; }

        public Guid UserId { get; set; }
        public string? UserName { get; set; }

        public string BillNumber { get; set; } = string.Empty;

        public Guid? AccountId { get; set; }
        public string? AccountName { get; set; }

        public string? CashAccount { get; set; }
        public string? CashAccountAddress { get; set; }
        public string? CashAccountPan { get; set; }
        public string? CashAccountEmail { get; set; }
        public string? CashAccountPhone { get; set; }

        public Guid? SettingsId { get; set; }

        public Guid FiscalYearId { get; set; }
        public string? FiscalYearName { get; set; }

        public List<SalesBillItemResponseDTO> Items { get; set; } = new();

        public DatesDTO? Dates { get; set; }
        public string NextSalesBillNumber { get; set; } = string.Empty;
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
        public decimal? NonVatSales { get; set; }
        public bool IsVatExempt { get; set; }
        public string? IsVatAll { get; set; }
        public decimal? VatPercentage { get; set; }
        public decimal? TotalAmount { get; set; }
        public string? PaymentMode { get; set; }

        public DateTime NepaliDate { get; set; }
        public DateTime Date { get; set; }

        public DateTime TransactionDateNepali { get; set; }
        public DateTime TransactionDate { get; set; }

        public UserInfo? User { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }


    // Supporting DTOs (if not already defined elsewhere)
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

    public class CompanyGroupInfoDTO
    {
        public Guid Id { get; set; }
        public string? Name { get; set; }
    }

    public class CategoryInfoDTO
    {
        public Guid Id { get; set; }
        public string? Name { get; set; }
    }

    public class UnitInfoDTO
    {
        public Guid Id { get; set; }
        public string? Name { get; set; }
        public string? Code { get; set; }
    }

    public class UserInfo
    {
        public string Name { get; set; } = string.Empty;
    }

}
