namespace SkyForge.Dto.RetailerDto
{
    public class MonthlyVatSummaryDTO
    {
        public string CompanyDateFormat { get; set; } = string.Empty;
        public string NepaliDate { get; set; } = string.Empty;
        public object Company { get; set; } = null!;
        public object CurrentFiscalYear { get; set; } = null!;
        public int? CurrentNepaliYear { get; set; }
        public object CurrentCompany { get; set; } = null!;
        public VatTotalsDTO? Totals { get; set; }
        public List<MonthlyVatDataDTO>? MonthlyData { get; set; }
        public string? Month { get; set; }
        public string? Year { get; set; }
        public string? NepaliMonth { get; set; }
        public string? NepaliYear { get; set; }
        public string ReportDateRange { get; set; } = string.Empty;
        public string CurrentCompanyName { get; set; } = string.Empty;
        public bool IsAdminOrSupervisor { get; set; }
    }

    public class VatTotalsDTO
    {
        public VatCategoryDTO Sales { get; set; } = new();
        public VatCategoryDTO SalesReturn { get; set; } = new();
        public VatCategoryDTO Purchase { get; set; } = new();
        public VatCategoryDTO PurchaseReturn { get; set; } = new();
        public decimal NetSalesVat { get; set; }
        public decimal NetPurchaseVat { get; set; }
        public decimal NetVat { get; set; }
    }

    public class VatCategoryDTO
    {
        public decimal TaxableAmount { get; set; }
        public decimal NonVatAmount { get; set; }
        public decimal VatAmount { get; set; }
    }

    public class MonthlyVatDataDTO
    {
        public string ReportDateRange { get; set; } = string.Empty;
        public VatTotalsDTO Totals { get; set; } = new();
    }

    public class MonthDataResult
    {
        public string ReportDateRange { get; set; } = string.Empty;
        public VatTotalsDTO Totals { get; set; } = new();
    }
}