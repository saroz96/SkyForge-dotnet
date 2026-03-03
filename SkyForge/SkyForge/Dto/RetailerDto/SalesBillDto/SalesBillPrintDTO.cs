using System.Text.Json.Serialization;

namespace SkyForge.Dto.RetailerDto.SalesBillDto
{
    public class SalesBillPrintDTO
    {
        public CompanyPrintDTO Company { get; set; } = new();
        public FiscalYearDTO? CurrentFiscalYear { get; set; }
        public SalesBillPrintBillDTO Bill { get; set; } = new();
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

    public class SalesBillPrintBillDTO
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        public bool FirstPrinted { get; set; }
        public int PrintCount { get; set; }
        public string PurchaseSalesType { get; set; } = string.Empty;
        public int OriginalCopies { get; set; }
        public string? PaymentMode { get; set; }
        public DateTime Date { get; set; }
        public DateTime TransactionDate { get; set; }
        public string NepaliDate { get; set; } = string.Empty;
        public string TransactionDateNepali { get; set; } = string.Empty;

        // Financial fields
        public decimal SubTotal { get; set; }
        public decimal NonVatSales { get; set; }
        public decimal TaxableAmount { get; set; }
        public decimal DiscountPercentage { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal VatPercentage { get; set; }
        public decimal VatAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public bool IsVatExempt { get; set; }
        public string? IsVatAll { get; set; }
        public decimal RoundOffAmount { get; set; }

        // Cash account details (for cash sales)
        public string? CashAccount { get; set; }
        public string? CashAccountAddress { get; set; }
        public string? CashAccountPan { get; set; }
        public string? CashAccountEmail { get; set; }
        public string? CashAccountPhone { get; set; }

        // Navigation properties
        public AccountPrintDTO? Account { get; set; }
        public UserPrintDTO? User { get; set; }
        public List<SalesBillItemPrintDTO> Items { get; set; } = new();
    }

    public class SalesBillItemPrintDTO
    {
        public Guid Id { get; set; }
        public Guid ItemId { get; set; }
        public string? ItemName { get; set; }
        public string? Hscode { get; set; }
        public int? UniqueNumber { get; set; }
        public Guid UnitId { get; set; }
        public string? UnitName { get; set; }

        // Quantities and prices
        public decimal Quantity { get; set; }
        public decimal Price { get; set; }
        public decimal? PuPrice { get; set; }
        public decimal? NetPuPrice { get; set; }

        // Discounts
        public decimal DiscountPercentagePerItem { get; set; }
        public decimal DiscountAmountPerItem { get; set; }
        public decimal NetPrice { get; set; }

        // Batch/expiry information
        public string? BatchNumber { get; set; }
        public DateOnly? ExpiryDate { get; set; }

        // VAT status
        public string VatStatus { get; set; } = string.Empty;

        // Tracking
        public string? UniqueUuid { get; set; }
        public Guid? PurchaseBillId { get; set; }

        // Calculated properties
        public decimal ItemTotal => Quantity * Price;
        public decimal ItemTotalWithDiscount => ItemTotal - DiscountAmountPerItem;
        public decimal ItemTotalWithVat => (ItemTotal - DiscountAmountPerItem) * (VatStatus == "vatable" ? 1.13m : 1m);
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

    public class UserPrintDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public bool IsAdmin { get; set; }
        public string? Role { get; set; }
        public UserPreferencesDTO? Preferences { get; set; }
    }

    public class AccountPrintDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Pan { get; set; }
        public string? Address { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public OpeningBalanceDTO? OpeningBalance { get; set; }
    }

    public class OpeningBalanceDTO
    {
        public decimal Amount { get; set; }
        public string Type { get; set; } = string.Empty;
    }
}