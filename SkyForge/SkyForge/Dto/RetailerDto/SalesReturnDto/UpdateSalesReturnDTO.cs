using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.RetailerDto.SalesReturnDto
{
    public class UpdateSalesReturnDTO
    {
        public Guid? OriginalSalesBillId { get; set; }

        [StringLength(100)]
        public string? OriginalSalesBillNumber { get; set; }

        [StringLength(50)]
        public string? PurchaseSalesReturnType { get; set; }

        [Range(1, int.MaxValue)]
        public int? OriginalCopies { get; set; }

        public bool? FirstPrinted { get; set; }

        [StringLength(100)]
        public string? BillNumber { get; set; }

        public Guid? AccountId { get; set; }

        [StringLength(255)]
        public string? CashAccount { get; set; }

        [StringLength(500)]
        public string? CashAccountAddress { get; set; }

        [StringLength(50)]
        public string? CashAccountPan { get; set; }

        [EmailAddress]
        [StringLength(255)]
        public string? CashAccountEmail { get; set; }

        [Phone]
        [StringLength(20)]
        public string? CashAccountPhone { get; set; }

        public Guid? UnitId { get; set; }
        public Guid? SettingsId { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? SubTotal { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? NonVatSalesReturn { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? TaxableAmount { get; set; }

        [Range(0, 100)]
        public decimal? DiscountPercentage { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? DiscountAmount { get; set; }

        [Range(0, 100)]
        public decimal? VatPercentage { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? VatAmount { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? TotalAmount { get; set; }

        public bool? IsVatExempt { get; set; }

        [StringLength(50)]
        public string? IsVatAll { get; set; }

        [Range(-double.MaxValue, double.MaxValue)]
        public decimal? RoundOffAmount { get; set; }

        [StringLength(50)]
        public string? PaymentMode { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? Quantity { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? Price { get; set; }

        public DateTime Date { get; set; }
        public DateTime TransactionDate { get; set; }

        public DateTime NepaliDate { get; set; }
        public DateTime TransactionDateNepali { get; set; }

        public List<SalesReturnItemDTO>? Items { get; set; }
    }
}