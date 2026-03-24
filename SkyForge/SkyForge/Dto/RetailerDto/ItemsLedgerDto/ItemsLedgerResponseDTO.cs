using System;
using System.Collections.Generic;
using SkyForge.Dto.RetailerDto;

namespace SkyForge.Dto.RetailerDto.ItemsLedgerDto
{
    public class ItemsLedgerResponseDTO
    {
        public decimal OpeningStock { get; set; }
        public decimal PurchasePrice { get; set; }
        public List<LedgerEntryDTO> Entries { get; set; } = new();
        public CompanyLedgerDTO? Company { get; set; }
        public CurrentCompanyDTO? CurrentCompany { get; set; }
        public string CurrentCompanyName { get; set; } = string.Empty;
        public string CompanyDateFormat { get; set; } = "english";
        public LedgerSummaryDTO Summary { get; set; } = new();
        public ItemLedgerInfoDTO? Item { get; set; }
    }

    public class LedgerEntryDTO
    {
        public DateTime Date { get; set; }
        public DateTime nepaliDate { get; set; }
        public Guid TransactionId { get; set; }
        public string PartyName { get; set; } = string.Empty;
        public string BillNumber { get; set; } = string.Empty;
        public LedgerEntryType Type { get; set; }
        public string TypeDisplay { get; set; } = string.Empty;
        public decimal QtyIn { get; set; }
        public decimal Bonus { get; set; }
        public decimal QtyOut { get; set; }
        public decimal Price { get; set; }
        public string Unit { get; set; } = string.Empty;
        public string BatchNumber { get; set; } = string.Empty;
        public string ExpiryDate { get; set; } = string.Empty;
        public decimal Balance { get; set; }
        public string? PaymentMode { get; set; }
        public string? Reason { get; set; }
    }

    public enum LedgerEntryType
    {
        Purchase,
        PurchaseReturn,
        Sales,
        SalesReturn,
        Excess,
        Short
    }

    public class LedgerSummaryDTO
    {
        public decimal TotalPurchases { get; set; }
        public decimal TotalSales { get; set; }
        public decimal TotalPurchaseReturns { get; set; }
        public decimal TotalSalesReturns { get; set; }
        public decimal TotalAdjustments { get; set; }
    }

    public class CompanyLedgerDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? Phone { get; set; }
        public string? Pan { get; set; }
        public string DateFormat { get; set; } = "english";
        public string? RenewalDate { get; set; }
        public FiscalYearDTO? FiscalYear { get; set; }
    }

    public class CurrentCompanyDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Pan { get; set; }
        public string? Address { get; set; }
    }


    public class ItemLedgerInfoDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Code { get; set; }
        public string? Hscode { get; set; }
        public int? UniqueNumber { get; set; }
        public string? UnitName { get; set; }
        public string? CategoryName { get; set; }
    }
}