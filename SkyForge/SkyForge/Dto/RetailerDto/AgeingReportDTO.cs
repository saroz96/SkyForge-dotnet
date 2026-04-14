using System;
using System.Collections.Generic;

namespace SkyForge.Dto.RetailerDto
{
    public class AgeingReportRequestDto
    {
        public Guid CompanyId { get; set; }
        public Guid FiscalYearId { get; set; }
    }

    public class AgeingReportResponseDto
    {
        public bool Success { get; set; }
        public AgeingReportDataDto Data { get; set; } = null!;
        public string? Error { get; set; }
        public string? Message { get; set; }
    }

    public class AgeingReportDataDto
    {
        public List<AgeingAccountDto> Report { get; set; } = new();
        public AgeingBucketDto ReceivableTotals { get; set; } = new();
        public AgeingBucketDto PayableTotals { get; set; } = new();
        public AgeingBucketDto NetTotals { get; set; } = new();
        public CompanyInfoDTO Company { get; set; } = null!;
        public object CurrentCompany { get; set; } = null!;
        public string CompanyDateFormat { get; set; } = string.Empty;
        public FiscalYearDTO CurrentFiscalYear { get; set; } = null!;
        public FiscalYearDTO InitialFiscalYear { get; set; } = null!;
        public string CurrentCompanyName { get; set; } = string.Empty;
    }

    public class AgeingAccountDto
    {
        public string AccountName { get; set; } = string.Empty;
        public AgeingBucketDto Buckets { get; set; } = new();
        public bool IsReceivable { get; set; }
        public decimal NetBalance { get; set; }
        public decimal OpeningBalance { get; set; }
    }

    public class AgeingBucketDto
    {
        public decimal Range0To30 { get; set; }
        public decimal Range30To60 { get; set; }
        public decimal Range60To90 { get; set; }
        public decimal Range90To120 { get; set; }
        public decimal Over120 { get; set; }
        public decimal Total { get; set; }

        public Dictionary<string, decimal> ToDictionary()
        {
            return new Dictionary<string, decimal>
            {
                ["0-30"] = Range0To30,
                ["30-60"] = Range30To60,
                ["60-90"] = Range60To90,
                ["90-120"] = Range90To120,
                ["over-120"] = Over120,
                ["total"] = Total
            };
        }
    }

    public class UnsettledItemDto
    {
        public DateTime Date { get; set; }
        public decimal Amount { get; set; }
        public Guid? FiscalYearId { get; set; }
        public DateTime NepaliDate { get; set; }
    }








    public class DayWiseAgeingResponseDto
    {
        public bool Success { get; set; }
        public DayWiseAgeingDataDto Data { get; set; } = null!;
        public string? Error { get; set; }
    }

    public class DayWiseAgeingDataDto
    {
        public DayWiseAgeingAccountDto Account { get; set; } = null!;
        public DayWiseAgeingData AgingData { get; set; } = null!;
        public CompanyInfoDTO Company { get; set; } = null!;
        public FiscalYearDTO? CurrentFiscalYear { get; set; }
        public List<DayWiseAgeingAccountListDto> Accounts { get; set; } = new();
        public string CurrentCompanyName { get; set; } = string.Empty;
        public DateTime AsOnDate { get; set; }
        public bool HasDateFilter { get; set; }
    }

    public class DayWiseAgeingAccountDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public Guid? CompanyGroups { get; set; }
        public decimal OpeningBalance { get; set; }
        public string OpeningBalanceType { get; set; } = "Dr";  // IMPORTANT: This field!
        public DateTime OpeningBalanceDate { get; set; }
        public Guid? InitialFiscalYear { get; set; }
        public object? InitialOpeningBalance { get; set; }
    }

    public class DayWiseAgeingData
    {
        public decimal TotalOutstanding { get; set; }
        public DayWiseAgeingBreakdown AgingBreakdown { get; set; } = new();
        public List<DayWiseAgeingTransactionDto> Transactions { get; set; } = new();
        public DayWiseAgeingSummary Summary { get; set; } = new();
    }

    public class DayWiseAgeingBreakdown
    {
        public decimal Current { get; set; }
        public decimal OneToThirty { get; set; }
        public decimal ThirtyOneToSixty { get; set; }
        public decimal SixtyOneToNinety { get; set; }
        public decimal NinetyPlus { get; set; }
    }

    public class DayWiseAgeingTransactionDto
    {
        public Guid Id { get; set; }
        public DateTime Date { get; set; }
        public DateTime NepaliDate { get; set; }
        public decimal Debit { get; set; }
        public decimal Credit { get; set; }
        public decimal Balance { get; set; }
        public int Age { get; set; }
        public string AgeCategory { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string ReferenceNumber { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string VoucherIdentifier { get; set; } = string.Empty;
        public bool IsGrouped { get; set; }
        public int TotalItems { get; set; }
        public bool HasMainTransaction { get; set; }
    }

    public class DayWiseAgeingSummary
    {
        public int TotalTransactions { get; set; }
        public DateTime AsOnDate { get; set; }
        public DayWiseAgeingInitialBalanceUsed InitialBalanceUsed { get; set; } = new();
    }

    public class DayWiseAgeingInitialBalanceUsed
    {
        public decimal Amount { get; set; }
        public string Type { get; set; } = string.Empty;
        public DateTime Date { get; set; }
    }

    public class DayWiseAgeingAccountListDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public Guid? CompanyGroups { get; set; }
    }
}