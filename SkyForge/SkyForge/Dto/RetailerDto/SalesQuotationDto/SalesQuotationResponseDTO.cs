using System.Text.Json.Serialization;
using SkyForge.Dto.AccountDto;

namespace SkyForge.Dto.RetailerDto.SalesQuotationDto
{
    public class SalesQuotationResponseDTO
    {
        // Basic Information
        public CompanyInfoDTO? Company { get; set; }
        public string? CompanyName { get; set; }
        public DatesDTO? Dates { get; set; }
        public string NextQuotationNumber { get; set; } = string.Empty;
        public FiscalYearInfoDTO? CurrentFiscalYear { get; set; }

        // Master Data
        public List<AccountInfoDTO> Accounts { get; set; } = new();
        public List<CategoryInfoDTO> Categories { get; set; } = new();
        public List<UnitInfoDTO> Units { get; set; } = new();
        public List<CompanyGroupInfoDTO> CompanyGroups { get; set; } = new();

        // User Preferences & Permissions
        public UserPreferencesDTO? UserPreferences { get; set; }
        public PermissionsDTO? Permissions { get; set; }

        // Additional Data (similar to purchase return)
        public Guid Id { get; set; }
        public Guid CompanyId { get; set; }
        public string? CurrentCompanyName { get; set; }
        public Guid UserId { get; set; }
        public string? UserName { get; set; }
        public Guid FiscalYearId { get; set; }
        public string? FiscalYearName { get; set; }

        // Quotation specific fields
        public string? PurchaseSalesType { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        public Guid? AccountId { get; set; }
        public string? AccountName { get; set; }
        public Guid? SettingsId { get; set; }

        // Financial fields
        public decimal? SubTotal { get; set; }
        public decimal? NonVatSales { get; set; }
        public decimal? TaxableAmount { get; set; }
        public decimal? DiscountPercentage { get; set; }
        public decimal? DiscountAmount { get; set; }
        public decimal? VatPercentage { get; set; }
        public decimal? VatAmount { get; set; }
        public decimal? TotalAmount { get; set; }
        public bool IsVatExempt { get; set; }
        public string? IsVatAll { get; set; }
        public decimal? RoundOffAmount { get; set; }
        public string? PaymentMode { get; set; }
        public string? Description { get; set; }

        // Dates
        public DateTime nepaliDate { get; set; }
        public DateTime Date { get; set; }
        public DateTime transactionDateNepali { get; set; }
        public DateTime TransactionDate { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        // Navigation
        public UserInfo? User { get; set; }
        public List<SalesQuotationItemResponseDTO> Items { get; set; } = new();
    }

    public class CompanyInfoDTO
    {
        public Guid Id { get; set; }
        public FiscalYearInfoDTO? FiscalYear { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Pan { get; set; } = string.Empty;
        public string? RenewalDate { get; set; }
        public string DateFormat { get; set; } = string.Empty; // Make sure this is string
        public bool VatEnabled { get; set; }
    }

    public class FiscalYearInfoDTO
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

    public class DatesDTO
    {
        public string? NepaliDate { get; set; }
        public string? TransactionDateNepali { get; set; }
        public string? CompanyDateFormat { get; set; }
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
    }

    public class CompanyGroupInfoDTO
    {
        public Guid Id { get; set; }
        public string? Name { get; set; }
    }

    public class UserPreferencesDTO
    {
        public string Theme { get; set; } = "light";
    }

    public class PermissionsDTO
    {
        public bool IsAdminOrSupervisor { get; set; }
    }

    public class UserInfo
    {
        public string Name { get; set; } = string.Empty;
    }
}