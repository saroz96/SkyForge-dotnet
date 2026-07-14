// Dto/AccountDto/AccountImportDto.cs
using System;
using System.Collections.Generic;

namespace SkyForge.Dto.AccountDto
{
    public class AccountImportDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Address { get; set; }
        public int? Ward { get; set; }
        public string? Phone { get; set; }
        public string? Pan { get; set; }
        public string? ContactPerson { get; set; }
        public string? Email { get; set; }
        public string? GroupName { get; set; }
        public decimal? CreditLimit { get; set; }
        public decimal? OpeningBalance { get; set; }
        public string? OpeningBalanceType { get; set; } = "Dr";
        public bool? IsActive { get; set; } = true;
    }

    public class AccountImportResponseDto
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public string? Warning { get; set; }
        public string? Code { get; set; }
        public AccountImportResultData? Data { get; set; }
    }

    public class AccountImportResultData
    {
        public List<AccountImportResult> Results { get; set; } = new();
        public int TotalProcessed { get; set; }
        public int SuccessCount { get; set; }
        public int FailedCount { get; set; }
        public int SkippedCount { get; set; }
        public List<string> Errors { get; set; } = new();
        public List<string> Warnings { get; set; } = new();
    }

    public class AccountImportResult
    {
        public int RowNumber { get; set; }
        public string AccountName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty; // "Success", "Failed", "Skipped"
        public string? ErrorMessage { get; set; }
        public string? AccountId { get; set; }
    }
}