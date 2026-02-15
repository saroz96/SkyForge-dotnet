
using SkyForge.Dto.RetailerDto.PurchaseReturnDto;
using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.RetailerDto.PurchaseReturnDto
{
    public class UpdatePurchaseReturnDTO
    {
        [StringLength(50)]
        public string? PurchaseSalesReturnType { get; set; }

        [Range(1, int.MaxValue)]
        public int? OriginalCopies { get; set; }

        public bool? FirstPrinted { get; set; }

        [StringLength(100)]
        public string? BillNumber { get; set; }

        [StringLength(100)]
        public string? PartyBillNumber { get; set; }

        public Guid? AccountId { get; set; }
        public Guid? SettingsId { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? SubTotal { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? NonVatPurchaseReturn { get; set; }

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

        public DateTime? Date { get; set; }
        public DateTime? TransactionDate { get; set; }

        public List<PurchaseReturnItemDTO>? Items { get; set; }
    }
}