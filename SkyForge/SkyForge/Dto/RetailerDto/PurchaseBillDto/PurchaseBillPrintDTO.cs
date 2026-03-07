using System.Text.Json.Serialization;
using SkyForge.Dto.RetailerDto;


namespace SkyForge.Dto.RetailerDto.PurchaseBillDto
{
    public class PurchaseBillPrintDTO
    {
        public CompanyPrintDTO Company { get; set; } = new();
        public FiscalYearDTO? CurrentFiscalYear { get; set; }
        public PurchaseBillPrintBillDTO Bill { get; set; } = new();
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

    public class PurchaseBillPrintBillDTO
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        public string? PartyBillNumber { get; set; }
        public bool FirstPrinted { get; set; }
        public int PrintCount { get; set; }
        public string? PaymentMode { get; set; }

        public DateTime Date { get; set; }

        public DateTime EnglishDate { get; set; }

        public DateTime TransactionDate { get; set; }

        public decimal? SubTotal { get; set; }
        public decimal? NonVatPurchase { get; set; }
        public decimal? TaxableAmount { get; set; }
        public decimal? TotalCcAmount { get; set; }
        public decimal? DiscountPercentage { get; set; }
        public decimal? DiscountAmount { get; set; }
        public decimal VatPercentage { get; set; }
        public decimal? VatAmount { get; set; }
        public decimal? TotalAmount { get; set; }
        public bool IsVatExempt { get; set; }
        public decimal? RoundOffAmount { get; set; }

        public AccountPrintDTO? Account { get; set; }
        public UserPrintDTO? User { get; set; }
        public List<PurchaseBillItemPrintDTO> Items { get; set; } = new();
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

    public class PurchaseBillItemPrintDTO
    {
        public Guid Id { get; set; }
        public Guid ItemId { get; set; }
        public string? ItemName { get; set; }
        public string? Hscode { get; set; }  // Add this
        public int? UniqueNumber { get; set; }  // Add this
        public Guid UnitId { get; set; }
        public string? UnitName { get; set; }
        public decimal? WsUnit { get; set; }
        public decimal Quantity { get; set; }
        public decimal? Bonus { get; set; }
        public decimal? Price { get; set; }
        public decimal PuPrice { get; set; }
        public decimal DiscountPercentagePerItem { get; set; }
        public decimal DiscountAmountPerItem { get; set; }
        public decimal NetPuPrice { get; set; }
        public decimal CcPercentage { get; set; }
        public decimal ItemCcAmount { get; set; }
        public decimal Mrp { get; set; }
        public decimal MarginPercentage { get; set; }
        public string? Currency { get; set; }
        public string? BatchNumber { get; set; }
        public DateOnly? ExpiryDate { get; set; }
        public string VatStatus { get; set; } = string.Empty;

        // Calculated properties
        public decimal ItemTotal => Quantity * PuPrice;
        public decimal ItemTotalWithDiscount => ItemTotal - DiscountAmountPerItem;
    }
}