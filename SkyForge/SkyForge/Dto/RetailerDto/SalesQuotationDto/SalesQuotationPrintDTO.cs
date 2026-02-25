using System.Text.Json.Serialization;

namespace SkyForge.Dto.RetailerDto.SalesQuotationDto
{
    public class SalesQuotationPrintDTO
    {
        public CompanyPrintDTO Company { get; set; } = new();
        public FiscalYearDTO? CurrentFiscalYear { get; set; }
        public SalesQuotationPrintBillDTO Bill { get; set; } = new();
        public string CurrentCompanyName { get; set; } = string.Empty;
        public CompanyPrintInfoDTO CurrentCompany { get; set; } = new();
        public bool FirstBill { get; set; }
        public decimal? LastBalance { get; set; }
        public string BalanceLabel { get; set; } = string.Empty;
        public string PaymentMode { get; set; } = string.Empty;
        public string NepaliDate { get; set; } = string.Empty;
        public string TransactionDateNepali { get; set; } = string.Empty;
        public DateTime EnglishDate { get; set; }
        public string CompanyDateFormat { get; set; } = string.Empty;
        public UserPrintDTO User { get; set; } = new();
        public bool IsAdminOrSupervisor { get; set; }
    }

    public class CompanyPrintDTO
    {
        public Guid Id { get; set; }
        public DateTime? RenewalDate { get; set; }
        public string DateFormat { get; set; } = string.Empty;
        public FiscalYearDTO? FiscalYear { get; set; }
    }

    public class CompanyPrintInfoDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Pan { get; set; }
        public string? Address { get; set; }
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
    }

    public class UserPrintDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public bool IsAdmin { get; set; }
        public string? Role { get; set; }
        public UserPreferencesDTO? Preferences { get; set; }
    }

    public class SalesQuotationPrintBillDTO
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        public string? PurchaseSalesType { get; set; }
        public bool FirstPrinted { get; set; }
        public int PrintCount { get; set; }
        public string? PaymentMode { get; set; }
        public string? Description { get; set; }

        public DateTime Date { get; set; }
        public DateTime EnglishDate { get; set; }
        public DateTime TransactionDate { get; set; }
        public DateTime NepaliDate { get; set; }
        public DateTime TransactionDateNepali { get; set; }

        // Financial fields
        public decimal? SubTotal { get; set; }
        public decimal? NonVatSales { get; set; }
        public decimal? TaxableAmount { get; set; }
        public decimal? DiscountPercentage { get; set; }
        public decimal? DiscountAmount { get; set; }
        public decimal VatPercentage { get; set; }
        public decimal? VatAmount { get; set; }
        public decimal? TotalAmount { get; set; }
        public bool IsVatExempt { get; set; }
        public string? IsVatAll { get; set; }
        public decimal? RoundOffAmount { get; set; }

        // Navigation properties
        public AccountPrintDTO? Account { get; set; }
        public UserPrintDTO? User { get; set; }
        public SettingsPrintDTO? Settings { get; set; }
        public List<SalesQuotationItemPrintDTO> Items { get; set; } = new();
    }

    public class AccountPrintDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Pan { get; set; }
        public string? Address { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? City { get; set; }
        public string? Country { get; set; }
        public OpeningBalanceDTO? OpeningBalance { get; set; }
    }

    public class SettingsPrintDTO
    {
        public Guid Id { get; set; }
        public string? Name { get; set; }
        public string? Template { get; set; }
        public bool? ShowLogo { get; set; }
        public string? HeaderText { get; set; }
        public string? FooterText { get; set; }
    }

    public class OpeningBalanceDTO
    {
        public decimal Amount { get; set; }
        public string Type { get; set; } = string.Empty;
    }

    public class SalesQuotationItemPrintDTO
    {
        public Guid Id { get; set; }
        public Guid ItemId { get; set; }
        public string? ItemName { get; set; }
        public string? ItemCode { get; set; }
        public string? Hscode { get; set; }
        public int? UniqueNumber { get; set; }

        public Guid UnitId { get; set; }
        public string? UnitName { get; set; }
        public decimal? WsUnit { get; set; }

        public decimal Quantity { get; set; }
        public decimal? Bonus { get; set; }
        public decimal? Price { get; set; }
        public decimal PuPrice { get; set; }
        public decimal? Mrp { get; set; }

        public decimal DiscountPercentagePerItem { get; set; }
        public decimal DiscountAmountPerItem { get; set; }
        public decimal NetPuPrice { get; set; }

        public decimal MarginPercentage { get; set; }
        public string? Currency { get; set; }
        public decimal? AltQuantity { get; set; }
        public decimal? AltPrice { get; set; }
        public decimal? AltPuPrice { get; set; }

        public string? BatchNumber { get; set; }
        public DateOnly? ExpiryDate { get; set; }
        public string VatStatus { get; set; } = string.Empty;
        public string? UniqueUuid { get; set; }
        public string? Description { get; set; }

        // Calculated properties
        public decimal ItemTotal => Quantity * PuPrice;
        public decimal ItemTotalWithDiscount => ItemTotal - DiscountAmountPerItem;
        public decimal VatAmount => VatStatus == "vatable" ? ItemTotalWithDiscount * 0.13m : 0; // Assuming 13% VAT
    }
}