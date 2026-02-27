using System.Text.Json.Serialization;

namespace SkyForge.Dto.RetailerDto.PurchaseBillDto
{
    public class PurchaseBillItemResponseDTO
    {
        public Guid Id { get; set; }
        public Guid PurchaseBillId { get; set; }

        public Guid ItemId { get; set; }
        public string? ItemName { get; set; }
        public string? Hscode { get; set; }
        public int? UniqueNumber { get; set; }

        public Guid UnitId { get; set; }
        public string? UnitName { get; set; }

        public decimal? WsUnit { get; set; }
        public decimal Quantity { get; set; }
        public decimal? Bonus { get; set; }
        public decimal? AltBonus { get; set; }
        public decimal? Price { get; set; }
        public decimal PuPrice { get; set; }
        public decimal DiscountPercentagePerItem { get; set; }
        public decimal DiscountAmountPerItem { get; set; }
        public decimal NetPuPrice { get; set; }
        public decimal CcPercentage { get; set; }
        public decimal ItemCcAmount { get; set; }
        public decimal Mrp { get; set; }
        public decimal MarginPercentage { get; set; }
        public string? Currency { get; set; }
        public decimal? AltQuantity { get; set; }
        public decimal? AltPrice { get; set; }
        public decimal? AltPuPrice { get; set; }
        public string? BatchNumber { get; set; }
        public DateOnly? ExpiryDate { get; set; }
        public string VatStatus { get; set; } = string.Empty;
        public string? UniqueUuid { get; set; }

        // Calculated properties
        public decimal CalculatedAltBonus { get; set; }
        public decimal CalculatedNetPuPrice { get; set; }
        public decimal CalculatedAltQuantity { get; set; }
        public decimal CalculatedAltPrice { get; set; }
        public decimal CalculatedAltPuPrice { get; set; }
        public decimal ItemTotal => Quantity * PuPrice;
        public decimal ItemTotalWithDiscount => ItemTotal - DiscountAmountPerItem;

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }
    }
}
