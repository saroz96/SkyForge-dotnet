
using SkyForge.Models.Dto.RetailerDto.SalesBillDto;
using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.RetailerDto.SalesBillDto
{
    public class UpdateSalesBillDTO
    {
        [StringLength(50)]
        public string? PurchaseSalesType { get; set; }

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

        public Guid? SettingsId { get; set; }

        [Range(0, 100)]
        public decimal? DiscountPercentage { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? DiscountAmount { get; set; }

        [Range(0, 100)]
        public decimal? VatPercentage { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? RoundOffAmount { get; set; }

        [StringLength(50)]
        public string? PaymentMode { get; set; }

        public DateTime? Date { get; set; }

        public DateTime? TransactionDate { get; set; }

        public bool? IsVatExempt { get; set; }

        [StringLength(50)]
        public string? IsVatAll { get; set; }

        public List<SalesBillItemDTO>? Items { get; set; }
    }
}