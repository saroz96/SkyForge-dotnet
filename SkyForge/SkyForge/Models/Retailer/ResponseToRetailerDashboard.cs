// Models/Retailer/RetailerDashboardModels.cs
using System.Text.Json.Serialization;

namespace SkyForge.Models.Retailer
{
    public class DashboardResponse
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("data")]
        public DashboardData? Data { get; set; }

        [JsonPropertyName("error")]
        public string? Error { get; set; }

        [JsonPropertyName("details")]
        public string? Details { get; set; }
    }

    public class DashboardData
    {
        [JsonPropertyName("financialSummary")]
        public FinancialSummary? FinancialSummary { get; set; }

        [JsonPropertyName("chartData")]
        public ChartData? ChartData { get; set; }

        [JsonPropertyName("company")]
        public CompanyInfo? Company { get; set; }

        [JsonPropertyName("fiscalYear")]
        public FiscalYearInfo? FiscalYear { get; set; }

        [JsonPropertyName("user")]
        public UserInfo? User { get; set; }
    }

    public class FinancialSummary
    {
        [JsonPropertyName("cashBalance")]
        public decimal CashBalance { get; set; }

        [JsonPropertyName("bankBalance")]
        public decimal BankBalance { get; set; }

        [JsonPropertyName("totalStockValue")]
        public decimal TotalStockValue { get; set; }

        [JsonPropertyName("netSales")]
        public decimal NetSales { get; set; }

        [JsonPropertyName("netPurchase")]
        public decimal NetPurchase { get; set; }

        [JsonPropertyName("grossSales")]
        public decimal GrossSales { get; set; }

        [JsonPropertyName("salesReturns")]
        public decimal SalesReturns { get; set; }

        [JsonPropertyName("grossPurchases")]
        public decimal GrossPurchases { get; set; }

        [JsonPropertyName("purchaseReturns")]
        public decimal PurchaseReturns { get; set; }
    }

    public class ChartData
    {
        [JsonPropertyName("categories")]
        public List<string> Categories { get; set; } = new();

        [JsonPropertyName("series")]
        public List<SeriesData> Series { get; set; } = new();
    }

    public class SeriesData
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("data")]
        public List<decimal> Data { get; set; } = new();
    }

    public class CompanyInfo
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("dateFormat")]
        public string DateFormat { get; set; } = string.Empty;

        [JsonPropertyName("vatEnabled")]
        public bool VatEnabled { get; set; }

        [JsonPropertyName("renewalDate")]
        public DateTime? RenewalDate { get; set; }
    }

    public class FiscalYearInfo
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("startDate")]
        public DateTime StartDate { get; set; }

        [JsonPropertyName("endDate")]
        public DateTime EndDate { get; set; }

        [JsonPropertyName("isActive")]
        public bool IsActive { get; set; }
    }

    public class UserInfo
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("email")]
        public string Email { get; set; } = string.Empty;

        [JsonPropertyName("isAdmin")]
        public bool IsAdmin { get; set; }

        [JsonPropertyName("role")]
        public string Role { get; set; } = string.Empty;

        [JsonPropertyName("isAdminOrSupervisor")]
        public bool IsAdminOrSupervisor { get; set; }
    }

    // Helper classes for query results
    internal class MonthlySalesData
    {
        public int Year { get; set; }
        public int Month { get; set; }
        public decimal TotalSales { get; set; }
    }

    internal class MonthlyReturnsData
    {
        public int Year { get; set; }
        public int Month { get; set; }
        public decimal TotalReturns { get; set; }
    }
}
