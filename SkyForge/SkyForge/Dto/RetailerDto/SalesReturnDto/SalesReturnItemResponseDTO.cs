using System.Text.Json.Serialization;

namespace SkyForge.Dto.RetailerDto.SalesReturnDto
{
    public class SalesReturnItemResponseDTO
    {
        public Guid Id { get; set; }
        public Guid SalesReturnId { get; set; }

        public Guid ItemId { get; set; }
        public string? ItemName { get; set; }
        public string? ItemCode { get; set; }

        public Guid UnitId { get; set; }
        public string? UnitName { get; set; }

        public decimal Quantity { get; set; }
        public decimal Price { get; set; }
        public decimal? NetPrice { get; set; }
        public decimal? PuPrice { get; set; }
        public decimal DiscountPercentagePerItem { get; set; }
        public decimal DiscountAmountPerItem { get; set; }
        public decimal NetPuPrice { get; set; }
        public string? BatchNumber { get; set; }
        public DateOnly? ExpiryDate { get; set; }
        public string VatStatus { get; set; } = string.Empty;
        public string? UniqueUuid { get; set; }

        // Calculated properties
        public decimal ItemTotal => Quantity * Price;
        public decimal ItemTotalWithDiscount => ItemTotal - DiscountAmountPerItem;
        public decimal EffectivePrice => Price - (DiscountAmountPerItem / Quantity);
        public decimal? VatAmount => VatStatus == "vatable" ? ItemTotal * 0.13m : 0; // Assuming 13% VAT

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }
    }
}
