
using System.Text.Json.Serialization;

namespace SkyForge.Dto.RetailerDto.PurchaseBillDto
{
    public class PurchaseBillResponseDTO
    {
        public Guid Id { get; set; }

        public Guid CompanyId { get; set; }
        public string? CompanyName { get; set; }

        public bool FirstPrinted { get; set; }
        public int PrintCount { get; set; }
        public string? PurchaseSalesType { get; set; }
        public int OriginalCopies { get; set; }

        public Guid UserId { get; set; }
        public string? UserName { get; set; }

        public string BillNumber { get; set; } = string.Empty;
        public string? PartyBillNumber { get; set; }

        public Guid? AccountId { get; set; }
        public string? AccountName { get; set; }

        public Guid? VatAccountId { get; set; }
        public string? VatAccountName { get; set; }

        public Guid? PurchaseAccountId { get; set; }
        public string? PurchaseAccountName { get; set; }

        public Guid? RoundOffAccountId { get; set; }
        public string? RoundOffAccountName { get; set; }

        public Guid? UnitId { get; set; }
        public string? UnitName { get; set; }

        public Guid? SettingsId { get; set; }

        public Guid FiscalYearId { get; set; }
        public string? FiscalYearName { get; set; }

        public List<PurchaseBillItemResponseDTO> Items { get; set; } = new();

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
        public string? IsVatAll { get; set; }
        public decimal? RoundOffAmount { get; set; }
        public string? PaymentMode { get; set; }

        public DateTime Date { get; set; }

        public DateTime TransactionDate { get; set; }

        public bool IsEditable { get; set; } = true;

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }
    }
}
