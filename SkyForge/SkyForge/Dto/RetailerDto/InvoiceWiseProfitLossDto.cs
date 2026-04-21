// Dto/RetailerDto/InvoiceWiseProfitLossDto.cs
using System;
using System.Collections.Generic;

namespace SkyForge.Dto.RetailerDto
{
    public class InvoiceWiseProfitLossRequestDto
    {
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public string? BillNumber { get; set; }
    }

    public class InvoiceWiseProfitLossResponseDto
    {
        public bool Success { get; set; }
        public InvoiceWiseProfitLossDataDto Data { get; set; }
        public string? Error { get; set; }
        public string? Message { get; set; }
    }

    public class InvoiceWiseProfitLossDataDto
    {
        public List<InvoiceProfitLossDto> Results { get; set; }
        public ProfitLossSummaryDto Summary { get; set; }
        public string? FromDate { get; set; }
        public string? ToDate { get; set; }
        public string? BillNumber { get; set; }
        public CompanyInfoDTO Company { get; set; }
        public FiscalYearDTO CurrentFiscalYear { get; set; }
        public CompanyInfoDTO CurrentCompany { get; set; }
        public string? CurrentCompanyName { get; set; }
        public string? CompanyDateFormat { get; set; }
        public UserInfoDto User { get; set; }
    }

    public class InvoiceProfitLossDto
    {
        public Guid Id { get; set; }
        public string? BillNumber { get; set; }
        public DateTime Date { get; set; }
        public Guid? AccountId { get; set; }
        public string? AccountName { get; set; }
        public string? CashAccount { get; set; }
        public decimal TotalProfit { get; set; }
        public decimal TotalSales { get; set; }
        public decimal TotalCost { get; set; }
        public bool IsReturn { get; set; }
        public List<InvoiceItemDto> Items { get; set; } = new List<InvoiceItemDto>();
    }

    public class InvoiceItemDto
    {
        public decimal Quantity { get; set; }
        public decimal Price { get; set; }
        public decimal PuPrice { get; set; }
        public string? ItemName { get; set; }
        public bool IsReturn { get; set; }
    }

    public class ProfitLossSummaryDto
    {
        public decimal TotalProfit { get; set; }
        public decimal TotalSales { get; set; }
        public decimal TotalCost { get; set; }
        public int TotalInvoices { get; set; }
    }
}