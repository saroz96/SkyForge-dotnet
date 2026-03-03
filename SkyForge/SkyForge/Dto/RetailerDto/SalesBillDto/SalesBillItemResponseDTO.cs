using SkyForge.Dto.RetailerDto.SalesBillDto;
using SkyForge.Dto.AccountDto;
using System.Text.Json.Serialization;

namespace SkyForge.Dto.RetailerDto.SalesBillDto
{
    public class SalesBillItemResponseDTO
    {
        public Guid Id { get; set; }

        public Guid ItemId { get; set; }
        public string? ItemName { get; set; }
        public Guid SalesBillId { get; set; }
        public string? Hscode { get; set; }

        public int? UniqueNumber { get; set; }

        public Guid UnitId { get; set; }
        public string? UnitName { get; set; }

        public decimal Quantity { get; set; }
        public decimal? Price { get; set; }
        public decimal? NetPrice { get; set; }
        public decimal? PuPrice { get; set; }

        public decimal? Mrp { get; set; }
        public decimal? NetPuPrice { get; set; }

        public string? BatchNumber { get; set; }
        public DateOnly? ExpiryDate { get; set; }
        public Guid? PurchaseBillId { get; set; }

        public decimal DiscountPercentagePerItem { get; set; }
        public decimal DiscountAmountPerItem { get; set; }
        public string VatStatus { get; set; } = string.Empty;
        public string? UniqueUuid { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}