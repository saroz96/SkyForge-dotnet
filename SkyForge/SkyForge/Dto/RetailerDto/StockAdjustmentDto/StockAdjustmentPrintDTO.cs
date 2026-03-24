using System.Text.Json.Serialization;
using SkyForge.Dto.RetailerDto;

namespace SkyForge.Dto.RetailerDto.StockAdjustmentDto
{
    public class StockAdjustmentPrintDTO
    {
        public CompanyPrintDTO Company { get; set; } = new();
        public FiscalYearDTO? CurrentFiscalYear { get; set; }
        public StockAdjustmentPrintAdjustmentDTO Adjustment { get; set; } = new();
        public StockAdjustmentTotalsDTO Totals { get; set; } = new();
        public string CurrentCompanyName { get; set; } = string.Empty;
        public CompanyPrintInfoDTO CurrentCompany { get; set; } = new();
        public bool FirstBill { get; set; }
        public string NepaliDate { get; set; } = string.Empty;
        public DateTime EnglishDate { get; set; }
        public string CompanyDateFormat { get; set; } = string.Empty;
        public UserPrintDTO User { get; set; } = new();
        public bool IsAdminOrSupervisor { get; set; }
    }

    public class StockAdjustmentPrintAdjustmentDTO
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        public string? Note { get; set; }
        public string AdjustmentType { get; set; } = string.Empty; // "xcess" or "short"
        public bool FirstPrinted { get; set; }
        public int PrintCount { get; set; }
        public string Status { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime Date { get; set; }
        public DateTime NepaliDate { get; set; }
        public DateTime EnglishDate { get; set; }

        // Financial fields
        public decimal SubTotal { get; set; }
        public decimal NonVatAdjustment { get; set; }
        public decimal TaxableAmount { get; set; }
        public decimal DiscountPercentage { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal VatPercentage { get; set; }
        public decimal VatAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public bool IsVatExempt { get; set; }
        public string? IsVatAll { get; set; }
        public decimal RoundOffAmount { get; set; }

        public UserPrintDTO? User { get; set; }

        public List<StockAdjustmentItemPrintDTO> Items { get; set; } = new();
    }

    public class StockAdjustmentItemPrintDTO
    {
        public Guid Id { get; set; }
        public Guid ItemId { get; set; }
        public string? ItemName { get; set; }
        public string? Hscode { get; set; }
        public int UniqueNumber { get; set; }
        public Guid? UnitId { get; set; }
        public string? UnitName { get; set; }

        // Quantities and prices
        public decimal Quantity { get; set; }
        public decimal PuPrice { get; set; }

        // Batch/expiry information
        public string? BatchNumber { get; set; }
        public DateOnly? ExpiryDate { get; set; }

        // Reason
        public string[] Reason { get; set; } = Array.Empty<string>();

        // VAT status
        public string VatStatus { get; set; } = string.Empty;

        // Calculated properties
        public decimal ItemTotal => Quantity * PuPrice;
    }

    public class StockAdjustmentTotalsDTO
    {
        public decimal TotalQuantity { get; set; }
        public decimal TotalValue { get; set; }
    }
}