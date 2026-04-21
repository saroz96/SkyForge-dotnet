
using System.Text.Json.Serialization;

namespace SkyForge.Dto.RetailerDto.StockEntryDto
{
    public class StockEntryResponseDTO
    {
        public Guid Id { get; set; }
        public Guid ItemId { get; set; }
        public string? ItemName { get; set; }

        public DateTime Date { get; set; }

        public decimal? WsUnit { get; set; }
        public decimal Quantity { get; set; }
        public decimal BillQty { get; set; }
        public decimal ActualQty { get; set; }

        public decimal? Bonus { get; set; }
        public string BatchNumber { get; set; } = string.Empty;
        public DateOnly ExpiryDate { get; set; }

        public decimal Price { get; set; }
        public decimal NetPrice { get; set; }
        public decimal PuPrice { get; set; }
        public decimal CcPercentage { get; set; }
        public decimal ItemCcAmount { get; set; }
        public decimal DiscountPercentagePerItem { get; set; }
        public decimal DiscountAmountPerItem { get; set; }
        public decimal NetPuPrice { get; set; }
        public decimal MainUnitPuPrice { get; set; }
        public decimal Mrp { get; set; }
        public decimal MarginPercentage { get; set; }
        public string? Currency { get; set; }

        public Guid? FiscalYearId { get; set; }
        public string? FiscalYearName { get; set; }

        public string? UniqueUuid { get; set; }
        public Guid? PurchaseBillId { get; set; }
        public string? PurchaseBillNumber { get; set; }

        public string ExpiryStatus { get; set; } = string.Empty;
        public int DaysUntilExpiry { get; set; }

        public Guid? StoreId { get; set; }
        public string? StoreName { get; set; }

        public Guid? RackId { get; set; }
        public string? RackName { get; set; }

        public SourceTransferResponseDto? SourceTransfer { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }

        // Calculated properties
        public decimal TotalValue => Quantity * (PuPrice > 0 ? PuPrice : Price);
        public bool IsExpired => ExpiryStatus == "expired";
        public bool IsNearExpiry => ExpiryStatus == "danger" || ExpiryStatus == "warning";
    }

    public class SourceTransferResponseDto
    {
        public Guid? FromStoreId { get; set; }
        public string? FromStoreName { get; set; }
        public Guid? OriginalEntryId { get; set; }

        public DateTime? TransferDate { get; set; }
    }
}

