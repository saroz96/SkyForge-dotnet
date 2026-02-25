using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.RetailerDto.PurchaseReturnDto
{
    public class PurchaseReturnItemDTO
    {
        public Guid? Id { get; set; } // For updates

        [Required]
        public Guid ItemId { get; set; }

        [Required]
        public Guid UnitId { get; set; }

        [Range(0.001, double.MaxValue)]
        public decimal? WsUnit { get; set; }

        [Range(0.001, double.MaxValue)]
        public decimal Quantity { get; set; }

        [Range(0, double.MaxValue)]
        public decimal Price { get; set; }

        [Range(0, double.MaxValue)]
        public decimal PuPrice { get; set; }
        [Range(0, 100)]
        public decimal DiscountPercentagePerItem { get; set; } = 0;

        [Range(0, double.MaxValue)]
        public decimal DiscountAmountPerItem { get; set; } = 0;

        [Range(0, double.MaxValue)]
        public decimal NetPuPrice { get; set; }

        [Range(0, double.MaxValue)]
        public decimal Mrp { get; set; } = 0;

        [Range(0, 100)]
        public decimal MarginPercentage { get; set; } = 0;

        [StringLength(10)]
        public string? Currency { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? AltQuantity { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? AltPrice { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? AltPuPrice { get; set; }

        [StringLength(100)]
        public string? BatchNumber { get; set; }

        public DateOnly? ExpiryDate { get; set; }

        [Required]
        [StringLength(20)]
        [RegularExpression("^(vatable|vatExempt)$")]
        public string VatStatus { get; set; } = string.Empty;

        [StringLength(100)]
        public string? UniqueUuid { get; set; }

        public Guid? PurchaseBillId { get; set; }

        // For response only
        public string? ItemName { get; set; }
        public string? UnitName { get; set; }
        public string? ItemCode { get; set; }
    }
}
