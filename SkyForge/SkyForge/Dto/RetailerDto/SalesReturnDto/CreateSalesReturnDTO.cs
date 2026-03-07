using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.RetailerDto.SalesReturnDto
{
    public class CreateSalesReturnDTO
    {
        public Guid? OriginalSalesBillId { get; set; }
        public string? OriginalSalesBillNumber { get; set; }
        public string? PurchaseSalesReturnType { get; set; }
        public int OriginalCopies { get; set; } = 1;

        public Guid? AccountId { get; set; }

        // Cash Account Details (for cash returns)
        public string? CashAccount { get; set; }
        public string? CashAccountAddress { get; set; }
        public string? CashAccountPan { get; set; }
        public string? CashAccountEmail { get; set; }
        public string? CashAccountPhone { get; set; }

        public Guid? UnitId { get; set; }
        public Guid? SettingsId { get; set; }

        // Financial Fields
        public decimal? SubTotal { get; set; }
        public decimal? NonVatSalesReturn { get; set; }
        public decimal? TaxableAmount { get; set; }
        public decimal? DiscountPercentage { get; set; }
        public decimal? DiscountAmount { get; set; }
        public decimal VatPercentage { get; set; } = 13;
        public decimal? VatAmount { get; set; }
        public decimal? TotalAmount { get; set; }
        public string IsVatExempt { get; set; } // "true", "false", or "all"
        public string? IsVatAll { get; set; }
        public decimal? RoundOffAmount { get; set; }
        public string? PaymentMode { get; set; }
        public decimal? Quantity { get; set; }
        public decimal? Price { get; set; }

        // Dates
        public DateTime NepaliDate { get; set; }
        public DateTime Date { get; set; }
        public DateTime TransactionDateNepali { get; set; }
        public DateTime TransactionDate { get; set; }

        // Items
        public List<SalesReturnItemDTO> Items { get; set; } = new();
    }

}
