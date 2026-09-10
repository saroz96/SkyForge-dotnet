// DTOs/AuditReportDto.cs
using System;
using System.Collections.Generic;

namespace SkyForge.Dto.AuditReportDto
{
    public class AuditReportRequestDTO
    {
        public Guid CompanyId { get; set; }
        public Guid FiscalYearId { get; set; }
        public DateTime? AsOnDate { get; set; }
        public string? AsOnDateNepali { get; set; }
        public string ReportType { get; set; } = string.Empty; // "OpeningTrialBalance", "ClosingTrialBalance", "ProfitAndLoss", "BalanceSheet"
        public bool IncludeSubGroups { get; set; } = true;
        public bool IncludeZeroBalances { get; set; } = false;
    }

    public class AuditReportResponseDTO
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public AuditReportDataDTO? Data { get; set; }
        public List<string> Errors { get; set; } = new();
    }

    public class AuditReportDataDTO
    {
        public CompanyInfoDTO Company { get; set; } = new();
        public FiscalYearInfoDTO FiscalYear { get; set; } = new();
        public string ReportName { get; set; } = string.Empty;
        public string ReportType { get; set; } = string.Empty;
        public DateTime GeneratedDate { get; set; }
        public string GeneratedDateNepali { get; set; } = string.Empty;
        public DateTime AsOnDate { get; set; }
        public string AsOnDateNepali { get; set; } = string.Empty;
        public List<AccountGroupSummaryDTO> AccountGroups { get; set; } = new();
        public List<AccountDetailDTO> AccountDetails { get; set; } = new();
        public ReportSummaryDTO Summary { get; set; } = new();
        public bool IsNepaliFormat { get; set; }
        public string DateFormat { get; set; } = "english";
    }

    public class CompanyInfoDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Pan { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string DateFormat { get; set; } = "english";
    }

    public class FiscalYearInfoDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? StartDateNepali { get; set; }
        public string? EndDateNepali { get; set; }
        public bool IsActive { get; set; }
    }

    public class AccountGroupSummaryDTO
    {
        public string GroupName { get; set; } = string.Empty;
        public string GroupType { get; set; } = string.Empty;
        public bool IsPrimaryGroup { get; set; }
        public decimal TotalDebit { get; set; }
        public decimal TotalCredit { get; set; }
        public decimal NetBalance { get; set; }
        public string BalanceType { get; set; } = string.Empty;
        public List<AccountDetailDTO> Accounts { get; set; } = new();
    }

    public class AccountDetailDTO
    {
        public Guid AccountId { get; set; }
        public string AccountName { get; set; } = string.Empty;
        public string AccountGroupName { get; set; } = string.Empty;
        public decimal OpeningBalance { get; set; }
        public decimal Debit { get; set; }
        public decimal Credit { get; set; }
        public decimal ClosingBalance { get; set; }
        public string BalanceType { get; set; } = string.Empty;
        public string AccountType { get; set; } = string.Empty; // "Asset", "Liability", "Income", "Expense", "Equity"
    }

    public class ReportSummaryDTO
    {
        public decimal TotalDebit { get; set; }
        public decimal TotalCredit { get; set; }
        public decimal NetProfit { get; set; }
        public decimal TotalAssets { get; set; }
        public decimal TotalLiabilities { get; set; }
        public decimal TotalEquity { get; set; }
        public decimal GrandTotal { get; set; }
        public bool IsBalanced { get; set; }
        public string BalanceStatus { get; set; } = string.Empty;
    }
}