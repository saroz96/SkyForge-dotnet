using SkyForge.Dto.RetailerDto.PurchaseReturnDto;
using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.RetailerDto.PurchaseReturnDto
{
    public class CreatePurchaseReturnDTO
    {
        [Required]
        public Guid CompanyId { get; set; }

        [StringLength(50)]
        public string? PurchaseSalesReturnType { get; set; }

        [Range(1, int.MaxValue)]
        public int OriginalCopies { get; set; } = 1;

        [Required]
        public Guid UserId { get; set; }

        [Required]
        [StringLength(100)]
        public string BillNumber { get; set; } = string.Empty;

        [StringLength(100)]
        public string? PartyBillNumber { get; set; }

        public Guid? AccountId { get; set; }
        public Guid? SettingsId { get; set; }

        [Required]
        public Guid FiscalYearId { get; set; }

        [Required]
        [MinLength(1)]
        public List<PurchaseReturnItemDTO> Items { get; set; } = new();

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
        public decimal VatPercentage { get; set; } = 13;

        [Range(0, double.MaxValue)]
        public decimal? VatAmount { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? TotalAmount { get; set; }

        public bool IsVatExempt { get; set; } = false;

        [StringLength(50)]
        public string? IsVatAll { get; set; }

        [Range(-double.MaxValue, double.MaxValue)]
        public decimal? RoundOffAmount { get; set; }

        [StringLength(50)]
        public string? PaymentMode { get; set; }

        public DateTime? Date { get; set; }
        public DateTime? TransactionDate { get; set; }
    }
}
