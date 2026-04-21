using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.RetailerDto.StockEntryDto
{
    public class CreateStockEntryDTO
    {
        [Required]
        public Guid ItemId { get; set; }

        public DateTime? Date { get; set; }

        [Range(0.001, double.MaxValue)]
        public decimal? WsUnit { get; set; }

        [Required]
        [Range(0.001, double.MaxValue)]
        public decimal Quantity { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? Bonus { get; set; }

        [StringLength(100)]
        public string BatchNumber { get; set; } = "XXX";

        [Required]
        public DateOnly ExpiryDate { get; set; }

        [Range(0, double.MaxValue)]
        public decimal Price { get; set; } = 0;

        [Range(0, double.MaxValue)]
        public decimal NetPrice { get; set; } = 0;

        [Range(0, double.MaxValue)]
        public decimal PuPrice { get; set; } = 0;

        [Range(0, double.MaxValue)]
        public decimal CcPercentage { get; set; } = 0;

        [Range(0, double.MaxValue)]
        public decimal ItemCcAmount { get; set; } = 0;

        [Range(0, 100)]
        public decimal DiscountPercentagePerItem { get; set; } = 0;

        [Range(0, double.MaxValue)]
        public decimal DiscountAmountPerItem { get; set; } = 0;

        [Range(0, double.MaxValue)]
        public decimal NetPuPrice { get; set; }

        [Range(0, double.MaxValue)]
        public decimal MainUnitPuPrice { get; set; } = 0;

        [Range(0, double.MaxValue)]
        public decimal Mrp { get; set; } = 0;

        [Range(0, 100)]
        public decimal MarginPercentage { get; set; } = 0;

        [StringLength(10)]
        public string? Currency { get; set; }

        public Guid? FiscalYearId { get; set; }

        [StringLength(100)]
        public string? UniqueUuid { get; set; }

        public Guid? PurchaseBillId { get; set; }

        [StringLength(20)]
        [RegularExpression("^(safe|warning|danger|expired)$")]
        public string ExpiryStatus { get; set; } = "safe"; // Added this field

        public int? DaysUntilExpiry { get; set; } // Made this nullable

        public Guid? StoreId { get; set; }

        public Guid? RackId { get; set; }

        public SourceTransferDto? SourceTransfer { get; set; }

        // Optional: You might want to add these for completeness
        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class SourceTransferDto
    {
        public Guid? FromStoreId { get; set; }
        public Guid? OriginalEntryId { get; set; }
        public DateTime? TransferDate { get; set; }
    }
}