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

    // Models/Retailer/RetailerDashboardModels.cs - Add this class
    public class PieChartData
    {
        [JsonPropertyName("totalIncome")]
        public decimal TotalIncome { get; set; }

        [JsonPropertyName("totalExpenses")]
        public decimal TotalExpenses { get; set; }

        [JsonPropertyName("segments")]
        public List<PieChartSegment> Segments { get; set; } = new();
    }

    public class PieChartSegment
    {
        [JsonPropertyName("label")]
        public string Label { get; set; } = string.Empty;

        [JsonPropertyName("value")]
        public decimal Value { get; set; }

        [JsonPropertyName("color")]
        public string Color { get; set; } = string.Empty;

        [JsonPropertyName("type")]
        public string Type { get; set; } = string.Empty; // "Income" or "Expense"
    }

    public class DashboardData
    {
        [JsonPropertyName("financialSummary")]
        public FinancialSummary? FinancialSummary { get; set; }

        [JsonPropertyName("chartData")]
        public ChartData? ChartData { get; set; }

        [JsonPropertyName("pieChartData")]  // NEW
        public PieChartData? PieChartData { get; set; }  // NEW

        [JsonPropertyName("company")]
        public CompanyInfo? Company { get; set; }

        [JsonPropertyName("fiscalYear")]
        public FiscalYearInfo? FiscalYear { get; set; }

        [JsonPropertyName("user")]
        public UserInfo? User { get; set; }

        public List<TopItemDto> TopItemsByTransaction { get; set; } = new List<TopItemDto>();
        public List<TopItemDto> TopItemsByRevenue { get; set; } = new List<TopItemDto>();
        public List<TopItemDto> TopItemsByFrequency { get; set; } = new List<TopItemDto>();

        public List<TopAccountDto> TopCustomersByPurchase { get; set; } = new List<TopAccountDto>();
        public List<TopAccountDto> TopCustomersByFrequency { get; set; } = new List<TopAccountDto>();
        public List<TopAccountDto> TopCustomersByAverageValue { get; set; } = new List<TopAccountDto>();
        public List<TopAccountDto> TopCustomersByOutstanding { get; set; } = new List<TopAccountDto>();
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
        public string RenewalDate { get; set; } = string.Empty;
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

    public class TopItemDto
    {
        public Guid ItemId { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public decimal TotalQuantity { get; set; }
        public decimal TotalAmount { get; set; }
        public int TransactionCount { get; set; }
        public decimal LatestPrice { get; set; }
        public string UnitName { get; set; } = "Unit";
    }

    public class TopItemsResponse
    {
        public List<TopItemDto> TopSellingItems { get; set; } = new();
        public List<TopItemDto> TopPurchasedItems { get; set; } = new();
        public List<TopItemDto> TopProfitItems { get; set; } = new();
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int TopCount { get; set; } = 10;
    }

    public class TopAccountDto
    {
        public Guid AccountId { get; set; }
        public string AccountName { get; set; } = string.Empty;
        public string? AccountPhone { get; set; }
        public string? AccountEmail { get; set; }
        public string? AccountPan { get; set; }
        public string? AccountAddress { get; set; }
        public decimal TotalPurchaseAmount { get; set; }
        public decimal TotalSales { get; set; }      // ✅ NEW: Gross Sales
        public decimal TotalReturns { get; set; }    // ✅ NEW: Total Returns
        public decimal TotalPayments { get; set; }      // ✅ NEW: Total payments made/received
        public decimal TotalReceipts { get; set; }     // ✅ NEW: Total receipts
        public int TransactionCount { get; set; }
        public decimal AverageTransactionValue { get; set; }
        public DateTime LastTransactionDate { get; set; }
        public decimal OutstandingBalance { get; set; }
        public string? AccountGroupName { get; set; }

        public string OutstandingDisplay => OutstandingBalance > 0
            ? $"Receivable: {OutstandingBalance:C}"
            : $"Payable: {Math.Abs(OutstandingBalance):C}";
    }
}
