using SkyForge.Dto.RetailerDto.StockEntryDto;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace SkyForge.Dto.RetailerDto.ItemDto
{
    public class ItemCompositionSummaryDto
    {
        public Guid CompositionId { get; set; }
        public string CompositionName { get; set; } = string.Empty;
        public int UniqueNumber { get; set; }
        public DateTime AddedAt { get; set; }
    }

    public class ItemResponseDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Hscode { get; set; }

        public Guid CategoryId { get; set; }
        public string? CategoryName { get; set; }

        public Guid ItemsCompanyId { get; set; }
        public string? ItemsCompanyName { get; set; }

        public decimal? Price { get; set; }
        public decimal? PuPrice { get; set; }
        public decimal MainUnitPuPrice { get; set; }

        public Guid? MainUnitId { get; set; }
        public string? MainUnitName { get; set; }

        public List<ItemCompositionSummaryDto> CompositionSummaries { get; set; } = new();

        public List<CompositionDTO> Compositions { get; set; } = new();
        public decimal WsUnit { get; set; }

        public Guid UnitId { get; set; }
        public string? UnitName { get; set; }

        public string VatStatus { get; set; } = string.Empty;
        public decimal OpeningStock { get; set; }

        public InitialOpeningStockResponseDTO? InitialOpeningStock { get; set; }

        public decimal MinStock { get; set; }
        public decimal MaxStock { get; set; }
        public decimal ReorderLevel { get; set; }

        public int UniqueNumber { get; set; }
        public long BarcodeNumber { get; set; }

        public Guid CompanyId { get; set; }
        public string? CompanyName { get; set; }

        public Guid FiscalYearId { get; set; }
        public string? FiscalYearName { get; set; }

        public Guid? OriginalFiscalYearId { get; set; }
        public string? OriginalFiscalYearName { get; set; }

        public string Status { get; set; } = "active";

        public List<StockEntryResponseDTO> StockEntries { get; set; } = new();
        public List<ItemClosingStockByFiscalYearResponseDTO> ClosingStocksByFiscalYear { get; set; } = new();
        public List<ItemOpeningStockByFiscalYearResponseDTO> OpeningStocksByFiscalYear { get; set; } = new();

        // Calculated properties
        public decimal TotalStock { get; set; }
        public decimal StockValue { get; set; }
        public ExpiryStatusDTO ExpiryStatus { get; set; } = new();

        public DateTime CreatedAt { get; set; }

        public DateTime Date { get; set; }

        public DateTime UpdatedAt { get; set; }
    }

    public class CompositionDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
    }

    public class InitialOpeningStockResponseDTO
    {
        public Guid? InitialFiscalYearId { get; set; }
        public string? InitialFiscalYearName { get; set; }
        public decimal OpeningStock { get; set; }
        public decimal OpeningStockValue { get; set; }
        public decimal PurchasePrice { get; set; }
        public decimal SalesPrice { get; set; }
        public DateTime Date { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class ItemClosingStockByFiscalYearResponseDTO
    {
        public Guid Id { get; set; }
        public Guid FiscalYearId { get; set; }
        public string? FiscalYearName { get; set; }
        public decimal ClosingStock { get; set; }
        public decimal ClosingStockValue { get; set; }
        public decimal PurchasePrice { get; set; }
        public decimal SalesPrice { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class ItemOpeningStockByFiscalYearResponseDTO
    {
        public Guid Id { get; set; }
        public Guid FiscalYearId { get; set; }
        public string? FiscalYearName { get; set; }
        public decimal OpeningStock { get; set; }
        public decimal OpeningStockValue { get; set; }
        public decimal PurchasePrice { get; set; }
        public decimal SalesPrice { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class ExpiryStatusDTO
    {
        public string Status { get; set; } = "safe";
        public int ExpiredItems { get; set; }
        public int DangerItems { get; set; }
        public int WarningItems { get; set; }
        public DateOnly? NearestExpiry { get; set; }
        public int DaysUntilNearestExpiry { get; set; }
    }

    public class BulkDeleteItemsRequestDto
    {
        [JsonRequired]
        [MinLength(1, ErrorMessage = "At least one item ID is required")]
        public List<Guid> ItemIds { get; set; } = new();
    }
    public class BulkDeleteItemsResponseDto
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public int TotalRequested { get; set; }
        public int DeletedCount { get; set; }
        public int FailedCount { get; set; }
        public List<BulkDeleteItemResultDto> Results { get; set; } = new();
    }

    public class BulkDeleteItemResultDto
    {
        public Guid ItemId { get; set; }
        public string? ItemName { get; set; }
        public bool Success { get; set; }
        public string? ErrorMessage { get; set; }
        public string? Status { get; set; } // "deleted", "not_found", "has_transactions", "error"
    }
}