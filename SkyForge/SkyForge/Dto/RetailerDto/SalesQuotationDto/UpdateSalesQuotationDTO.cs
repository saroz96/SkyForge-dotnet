// Dto/RetailerDto/SalesQuotationDto/UpdateSalesQuotationDTO.cs
using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.RetailerDto.SalesQuotationDto
{
    public class UpdateSalesQuotationDTO
    {
        [Required]
        public Guid? AccountId { get; set; }

        [Required]
        [MinLength(1)]
        public List<SalesQuotationItemDTO> Items { get; set; } = new();

        public DateTime TransactionDate { get; set; }
        public DateTime TransactionDateNepali { get; set; }
        public DateTime Date { get; set; }
        public DateTime NepaliDate { get; set; }

        public string? IsVatExempt { get; set; } // Can be "true", "false", or "all"

        [Required]
        [StringLength(50)]
        public string? PaymentMode { get; set; }

        [StringLength(500)]
        public string? Description { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? SubTotal { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? NonVatSales { get; set; }

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

        public decimal? RoundOffAmount { get; set; }
        public Guid? SettingsId { get; set; }
    }
}