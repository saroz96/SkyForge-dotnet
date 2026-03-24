using System.ComponentModel.DataAnnotations;
using SkyForge.Dto.RetailerDto;

namespace SkyForge.Dto.RetailerDto.StockAdjustmentDto
{
    public class CreateStockAdjustmentDTO
    {
        [Required]
        [MinLength(1)]
        public List<StockAdjustmentItemDTO> Items { get; set; } = new();

        [Required]
        [StringLength(10)]
        [RegularExpression("^(xcess|short)$", ErrorMessage = "Adjustment type must be either 'xcess' or 'short'")]
        public string AdjustmentType { get; set; } = string.Empty;

        public string? Note { get; set; }

        public DateTime NepaliDate { get; set; }
        public DateTime BillDate { get; set; }

        public string IsVatExempt { get; set; } = "false"; // "true", "false", or "all"

        [Range(0, 100)]
        public decimal VatPercentage { get; set; } = 13;

        [Range(0, 100)]
        public decimal DiscountPercentage { get; set; } = 0;
    }

    public class StockAdjustmentItemDTO
    {
        [Required]
        public Guid ItemId { get; set; }

        [Required]
        public Guid UnitId { get; set; }

        public string? BatchNumber { get; set; }

        public DateTime? ExpiryDate { get; set; }

        public decimal? MarginPercentage { get; set; }

        public decimal? Mrp { get; set; }

        [Required]
        [Range(0.001, double.MaxValue)]
        public decimal Price { get; set; }

        [Required]
        [Range(0.001, double.MaxValue)]
        public decimal Quantity { get; set; }

        [Required]
        [Range(0, double.MaxValue)]
        public decimal PuPrice { get; set; }

        public List<string> Reason { get; set; } = new();

        [Required]
        [StringLength(20)]
        [RegularExpression("^(vatable|vatExempt)$", ErrorMessage = "VatStatus must be either 'vatable' or 'vatExempt'")]
        public string VatStatus { get; set; } = string.Empty;

        public string? UniqueUuid { get; set; } // For short adjustments to identify specific batch
    }
}