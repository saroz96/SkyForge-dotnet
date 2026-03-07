using System.Text.Json.Serialization;
using SkyForge.Dto.RetailerDto;
using SkyForge.Dto.RetailerDto.SalesBillDto;

namespace SkyForge.Dto.RetailerDto.SalesReturnDto
{
    public class SalesReturnPrintDTO
    {
        public CompanyPrintDTO Company { get; set; } = new();
        public FiscalYearDTO? CurrentFiscalYear { get; set; }
        public SalesReturnPrintBillDTO Bill { get; set; } = new();
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

    public class SalesReturnPrintBillDTO
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; } = string.Empty;

        // Original Sales Bill Reference
        public Guid? OriginalSalesBillId { get; set; }
        public string? OriginalSalesBillNumber { get; set; }
        public SalesBillPrintBillDTO? OriginalSalesBill { get; set; }
        public AccountPrintDTO? Account { get; set; }

        public bool FirstPrinted { get; set; }
        public int PrintCount { get; set; }
        public string? PaymentMode { get; set; }
        public DateTime Date { get; set; }
        public DateTime TransactionDate { get; set; }

        // Financial fields
        public decimal SubTotal { get; set; }
        public decimal NonVatSalesReturn { get; set; }
        public decimal TaxableAmount { get; set; }
        public decimal DiscountPercentage { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal VatPercentage { get; set; }
        public decimal VatAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public bool IsVatExempt { get; set; }
        public string? IsVatAll { get; set; }
        public decimal RoundOffAmount { get; set; }

        // Account/Cash Account Information
        public string? CashAccount { get; set; }
        public string? CashAccountAddress { get; set; }
        public string? CashAccountPan { get; set; }
        public string? CashAccountEmail { get; set; }
        public string? CashAccountPhone { get; set; }
        public UserPrintDTO? User { get; set; }

        public List<SalesReturnItemPrintDTO> Items { get; set; } = new();
    }


    public class SalesReturnItemPrintDTO
    {
        public Guid Id { get; set; }
        public Guid ItemId { get; set; }
        public string? ItemName { get; set; }
        public string? Hscode { get; set; }
        public int UniqueNumber { get; set; }
        public Guid? UnitId { get; set; }
        public string? UnitName { get; set; }

        // Quantities and prices
        public decimal Quantity { get; set; }
        public decimal Price { get; set; }
        public decimal PuPrice { get; set; }
        public decimal NetPuPrice { get; set; }
        public decimal NetPrice { get; set; }

        // Discounts
        public decimal DiscountPercentagePerItem { get; set; }
        public decimal DiscountAmountPerItem { get; set; }

        // Batch/expiry information
        public string? BatchNumber { get; set; }
        public DateOnly? ExpiryDate { get; set; }

        // VAT status
        public string VatStatus { get; set; } = string.Empty;

        // Calculated properties
        public decimal ItemTotal => Quantity * Price;
        public decimal ItemTotalWithDiscount => ItemTotal - DiscountAmountPerItem;
        public decimal ItemTotalWithVat => (ItemTotal - DiscountAmountPerItem) * (VatStatus == "vatable" ? 1.13m : 1m);
    }
}