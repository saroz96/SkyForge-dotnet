using System.Text.Json.Serialization;

namespace SkyForge.Dto.RetailerDto.SalesReturnDto
{
    public class SalesReturnResponseDTO
    {
        public Guid Id { get; set; }

        public Guid CompanyId { get; set; }
        public string? CompanyName { get; set; }

        public bool FirstPrinted { get; set; }
        public int PrintCount { get; set; }

        public Guid? OriginalSalesBillId { get; set; }
        public string? OriginalSalesBillNumber { get; set; }
        public string? OriginalSalesBillFullNumber { get; set; }

        public string? PurchaseSalesReturnType { get; set; }
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

        public Guid? UnitId { get; set; }
        public string? UnitName { get; set; }

        public Guid? SettingsId { get; set; }

        public Guid FiscalYearId { get; set; }
        public string? FiscalYearName { get; set; }

        public List<SalesReturnItemResponseDTO> Items { get; set; } = new();

        public decimal? SubTotal { get; set; }
        public decimal? NonVatSalesReturn { get; set; }
        public decimal? TaxableAmount { get; set; }
        public decimal? DiscountPercentage { get; set; }
        public decimal? DiscountAmount { get; set; }
        public decimal VatPercentage { get; set; }
        public decimal? VatAmount { get; set; }
        public decimal? TotalAmount { get; set; }
        public bool IsVatExempt { get; set; }
        public string? IsVatAll { get; set; }
        public decimal? RoundOffAmount { get; set; }
        public string? PaymentMode { get; set; }
        public decimal? Quantity { get; set; }
        public decimal? Price { get; set; }

        public bool IsEditable { get; set; } = true;

        public DateTime Date { get; set; }

        public DateTime TransactionDate { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }
    }
}