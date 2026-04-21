// DTOs/RetailerDto/PartySummaryDto.cs
using SkyForge.Models.Shared;

namespace SkyForge.Dto.RetailerDto
{
    public class PartySummaryResponseDto
    {
        public CompanyInfoDto Company { get; set; } = new();
        public PartyInfoDto Party { get; set; } = new();
        public string FiscalYear { get; set; } = string.Empty;
        public string DateFormat { get; set; } = "english";
        public PeriodInfoDto Period { get; set; } = new();
        public PartySummaryDataDto Summary { get; set; } = new();
        public DateTime GeneratedDate { get; set; }
    }

    public class CompanyInfoDto
    {
        public string Name { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Pan { get; set; } = string.Empty;
        public List<object> CompanyGroups { get; set; } = new();
    }

    public class PartyInfoDto
    {
        public string Name { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string Pan { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string UniqueNumber { get; set; } = string.Empty;
        public List<object> CompanyGroups { get; set; } = new();
    }

    public class PeriodInfoDto
    {
        public DateTime Start { get; set; }
        public DateTime End { get; set; }
    }

    public class PartySummaryDataDto
    {
        // Sales related
        public decimal TaxableSales { get; set; }
        public decimal TaxableSalesVAT { get; set; }
        public decimal NonTaxableSales { get; set; }
        public decimal SalesReturn { get; set; }
        public decimal SalesReturnVAT { get; set; }

        // Purchase related
        public decimal TaxablePurchase { get; set; }
        public decimal TaxablePurchaseVAT { get; set; }
        public decimal NonTaxablePurchase { get; set; }
        public decimal PurchaseReturn { get; set; }
        public decimal PurchaseReturnVAT { get; set; }

        // Other transactions
        public decimal Payments { get; set; }
        public decimal Receipts { get; set; }
        public decimal JournalDebit { get; set; }
        public decimal JournalCredit { get; set; }
        public decimal DebitNotes { get; set; }
        public decimal CreditNotes { get; set; }

        // Balance information
        public decimal OpeningBalance { get; set; }
        public decimal ClosingBalance { get; set; }
        public decimal TotalDebit { get; set; }
        public decimal TotalCredit { get; set; }

        // Additional
        public decimal StockAdjustment { get; set; }
        public decimal RoundOff { get; set; }

        // Calculated values
        public decimal NetSales { get; set; }
        public decimal NetSalesVAT { get; set; }
        public decimal NetPurchase { get; set; }
        public decimal NetPurchaseVAT { get; set; }
        public decimal NetPaymentReceipt { get; set; }

        // Counts
        public int TransactionCount { get; set; }
        public int SalesBillCount { get; set; }
        public int PurchaseBillCount { get; set; }
        public int SalesReturnCount { get; set; }
        public int PurchaseReturnCount { get; set; }
        public int PaymentCount { get; set; }
        public int ReceiptCount { get; set; }
    }
}