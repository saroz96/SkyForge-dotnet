using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.RetailerDto.SalesReturnDto
{
    public class SalesReturnItemDTO
    {
        public Guid? Id { get; set; }

        [Required]
        public Guid ItemId { get; set; }

        [Required]
        public Guid UnitId { get; set; }

        [Required]
        [Range(0.001, double.MaxValue)]
        public decimal Quantity { get; set; }

        [Required]
        [Range(0, double.MaxValue)]
        public decimal Price { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? NetPrice { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? PuPrice { get; set; }

        [Range(0, 100)]
        public decimal DiscountPercentagePerItem { get; set; } = 0;

        [Range(0, double.MaxValue)]
        public decimal DiscountAmountPerItem { get; set; } = 0;

        [Range(0, double.MaxValue)]
        public decimal NetPuPrice { get; set; } = 0;

        [StringLength(100)]
        public string? BatchNumber { get; set; }

        public DateOnly? ExpiryDate { get; set; }

        [Required]
        [StringLength(20)]
        [RegularExpression("^(vatable|vatExempt)$")]
        public string VatStatus { get; set; } = string.Empty;

        [StringLength(100)]
        public string? UniqueUuid { get; set; }

        // For response only
        public string? ItemName { get; set; }
        public string? UnitName { get; set; }
        public string? ItemCode { get; set; }
        public decimal? AvailableStock { get; set; }
    }
}
