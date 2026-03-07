
using System.ComponentModel.DataAnnotations;
using SkyForge.Dto.RetailerDto.ItemDto;

namespace SkyForge.Dto.RetailerDto.SalesBillDto
{
    public class SalesBillItemDTO
    {
        public Guid? Id { get; set; } // For updates

        [Required]
        public Guid ItemId { get; set; }

        public string? ItemName { get; set; } // For response only
        public string? Hscode { get; set; }
        public int? UniqueNumber { get; set; }
        public CategoryInfoDTO? Category { get; set; }

        [Required]
        public Guid UnitId { get; set; }

        public string? UnitName { get; set; } // For response only

        [Required]
        [Range(0.001, double.MaxValue)]
        public decimal Quantity { get; set; }

        [Required]
        [Range(0, double.MaxValue)]
        public decimal Price { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? PuPrice { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? Mrp { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? NetPuPrice { get; set; }

        [Range(0, 100)]
        public decimal DiscountPercentagePerItem { get; set; } = 0;

        [Range(0, double.MaxValue)]
        public decimal DiscountAmountPerItem { get; set; } = 0;

        [Range(0, double.MaxValue)]
        public decimal NetPrice { get; set; } = 0;

        [StringLength(100)]
        public string? BatchNumber { get; set; }

        public DateOnly? ExpiryDate { get; set; }

        [Required]
        [StringLength(20)]
        [RegularExpression("^(vatable|vatExempt)$", ErrorMessage = "VatStatus must be either 'vatable' or 'vatExempt'")]
        public string VatStatus { get; set; } = string.Empty;

        [StringLength(100)]
        public string? UniqueUuid { get; set; }

        public Guid? PurchaseBillId { get; set; }

        // Calculated properties (for response)
        public ItemDetailsDTO? Item { get; set; }
        public decimal? ItemTotal { get; set; }
        public decimal? ItemVatAmount { get; set; }
    }
}