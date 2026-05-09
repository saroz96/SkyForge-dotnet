// Add to SkyForge/Dto/FiscalYearTransferDto.cs
using System;
using System.Collections.Generic;

namespace SkyForge.Dto
{
    public class FiscalYearTransferRequestDto
    {
        public Guid SourceFiscalYearId { get; set; }
        public Guid TargetFiscalYearId { get; set; }
        public DateTime TransferDate { get; set; }
        public string? TransferDateNepali { get; set; }
        public bool TransferItems { get; set; } = true;
        public bool TransferAccounts { get; set; } = true;
    }

    public class FiscalYearTransferResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public FiscalYearTransferSummaryDto? Data { get; set; }
        public List<string> Errors { get; set; } = new();
    }

    public class FiscalYearTransferSummaryDto
    {
        public Guid SourceFiscalYearId { get; set; }
        public string SourceFiscalYearName { get; set; } = string.Empty;
        public Guid TargetFiscalYearId { get; set; }
        public string TargetFiscalYearName { get; set; } = string.Empty;
        public DateTime TransferDate { get; set; }
        public string? TransferDateNepali { get; set; }
        public ItemTransferSummaryDto? ItemsSummary { get; set; }
        public AccountTransferSummaryDto? AccountsSummary { get; set; }
        
        public Guid OpeningBalanceTransactionId { get; set; }
        public string OpeningBalanceVoucherNo { get; set; } = string.Empty;
        public DateTime CompletedAt { get; set; }
    }

    public class ItemTransferSummaryDto
    {
        public int ItemsProcessed { get; set; }
        public int ItemsWithStock { get; set; }
        public decimal TotalClosingStockQuantity { get; set; }
        public decimal TotalClosingStockValue { get; set; }
        public List<ItemStockSummaryDto> ItemDetails { get; set; } = new();
    }

    public class ItemStockSummaryDto
    {
        public Guid ItemId { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public decimal ClosingQuantity { get; set; }
        public decimal ClosingValue { get; set; }
        public decimal AverageRate { get; set; }
    }

    public class AccountTransferSummaryDto
    {
        public int AccountsProcessed { get; set; }
        public decimal TotalDebitBalance { get; set; }
        public decimal TotalCreditBalance { get; set; }
        public List<AccountBalanceSummaryDto> AccountDetails { get; set; } = new();
    }

    public class AccountBalanceSummaryDto
    {
        public Guid AccountId { get; set; }
        public string AccountName { get; set; } = string.Empty;
        public string AccountCode { get; set; } = string.Empty;
        public decimal DebitAmount { get; set; }
        public decimal CreditAmount { get; set; }
        public string BalanceType { get; set; } = string.Empty;
    }
}