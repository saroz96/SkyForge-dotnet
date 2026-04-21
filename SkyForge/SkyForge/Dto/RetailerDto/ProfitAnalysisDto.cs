using System;
using System.Collections.Generic;

namespace SkyForge.Dto.RetailerDto
{
    public class SalesAnalysisRequestDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
    }

    public class SalesAnalysisResponseDto
    {
        public bool Success { get; set; }
        public SalesAnalysisDataDto Data { get; set; }
        public string Error { get; set; }
        public string Message { get; set; }
    }

    public class SalesAnalysisDataDto
    {
        public List<NetSalesDto> NetSales { get; set; }
        public List<NetPurchasesDto> NetPurchases { get; set; }
        public List<DailyProfitDto> DailyProfit { get; set; }
        public SummaryDto Summary { get; set; }
        public string CompanyDateFormat { get; set; }
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public CompanyInfoDto Company { get; set; }
        public string CurrentCompanyName { get; set; }
        public FiscalYearDTO CurrentFiscalYear { get; set; }
        public UserInfoDto User { get; set; }
        public string Theme { get; set; }
        public bool IsAdminOrSupervisor { get; set; }
    }

    public class NetSalesDto
    {
        public DateTime Date { get; set; }
        public decimal GrossSales { get; set; }
        public decimal Returns { get; set; }
        public decimal NetSales { get; set; }
        public int SalesCount { get; set; }
        public int ReturnCount { get; set; }
    }

    public class NetPurchasesDto
    {
        public DateTime Date { get; set; }
        public decimal GrossPurchases { get; set; }
        public decimal GrossCost { get; set; }
        public decimal PurchaseReturns { get; set; }
        public decimal CostReturns { get; set; }
        public decimal NetPurchases { get; set; }
        public decimal NetCost { get; set; }
        public int PurchaseCount { get; set; }
        public int ReturnCount { get; set; }
    }

    public class DailyProfitDto
    {
        public DateTime Date { get; set; }
        public decimal GrossSales { get; set; }
        public decimal Returns { get; set; }
        public decimal NetSales { get; set; }
        public decimal GrossPurchases { get; set; }
        public decimal PurchaseReturns { get; set; }
        public decimal NetPurchases { get; set; }
        public decimal NetCost { get; set; }
        public decimal NetProfit { get; set; }
        public int SalesCount { get; set; }
        public int ReturnCount { get; set; }
        public int PurchaseCount { get; set; }
        public int TotalTransactions { get; set; }
        public decimal GrossProfit { get; set; }
        public decimal CpPercentage { get; set; }
        public decimal SpPercentage { get; set; }
    }

    public class SummaryDto
    {
        public decimal TotalGrossSales { get; set; }
        public decimal TotalSalesReturns { get; set; }
        public decimal TotalNetSales { get; set; }
        public decimal TotalGrossPurchases { get; set; }
        public decimal TotalPurchaseReturns { get; set; }
        public decimal TotalNetPurchases { get; set; }
        public int DaysWithProfit { get; set; }
        public int DaysWithLoss { get; set; }
        public decimal TotalGrossProfit { get; set; }
        public decimal TotalNetProfit { get; set; }
    }

    public class UserInfoDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public bool IsAdmin { get; set; }
        public string Role { get; set; }
        public object Preferences { get; set; }
    }
}