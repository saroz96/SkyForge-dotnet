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
        public string AccountGroupName { get; set; } = string.Empty;
        public string AccountCode { get; set; } = string.Empty;
        public decimal DebitAmount { get; set; }
        public decimal CreditAmount { get; set; }
        public string BalanceType { get; set; } = string.Empty;
    }

    public class CarryForwardCheckResponseDto
    {
        public bool Success { get; set; }
        public bool NeedCarryForward { get; set; }
        public string Message { get; set; } = string.Empty;
        public CarryForwardInfoDto Data { get; set; } = new();
    }

    public class CarryForwardInfoDto
    {
        public Guid SourceFiscalYearId { get; set; }
        public string SourceFiscalYearName { get; set; } = string.Empty;
        public Guid TargetFiscalYearId { get; set; }
        public string TargetFiscalYearName { get; set; } = string.Empty;
        public bool IsForwardSwitch { get; set; } // True if switching to newer year
        public int YearsDifference { get; set; }
        public DateTime? SourceEndDate { get; set; }
        public DateTime? TargetStartDate { get; set; }
        public string? SourceEndDateNepali { get; set; }
        public string? TargetStartDateNepali { get; set; }
    }

    public class CarryForwardRequestDto
    {
        public Guid SourceFiscalYearId { get; set; }
        public Guid TargetFiscalYearId { get; set; }
        public bool CarryBalances { get; set; }
        public string CarryType { get; set; } = "All"; // "All" or "NewAndChanged"
        public DateTime TransferDate { get; set; }
        public string? TransferDateNepali { get; set; }
    }

    public class CarryForwardResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public CarryForwardResultDto? Data { get; set; }
        public List<string> Errors { get; set; } = new();
    }

    public class CarryForwardResultDto
    {
        public Guid SourceFiscalYearId { get; set; }
        public Guid TargetFiscalYearId { get; set; }
        public string TransferType { get; set; } = string.Empty;
        public int AccountsTransferred { get; set; }
        public int ItemsTransferred { get; set; }
        public decimal TotalBalance { get; set; }
        public DateTime CompletedAt { get; set; }
    }

    public class UpdateBalancesResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public UpdateBalancesDataDto Data { get; set; } = new();
        public List<string> Errors { get; set; } = new();
    }

    public class UpdateBalancesDataDto
    {
        public Guid SourceFiscalYearId { get; set; }
        public string SourceFiscalYearName { get; set; } = string.Empty;
        public Guid TargetFiscalYearId { get; set; }
        public string TargetFiscalYearName { get; set; } = string.Empty;
        public string CarryType { get; set; } = "All";
        public List<AccountBalanceUpdateDto> AccountBalances { get; set; } = new();
        public List<ItemStockUpdateDto> ItemStocks { get; set; } = new();
        public TransferSummaryDto Summary { get; set; } = new();
    }

    public class AccountBalanceUpdateDto
    {
        public Guid AccountId { get; set; }
        public string AccountName { get; set; } = string.Empty;
        public string AccountGroupName { get; set; } = string.Empty;
        public decimal CurrentBalance { get; set; }
        public decimal UpdatedBalance { get; set; }
        public string BalanceType { get; set; } = "Dr";
        public bool IsNew { get; set; }
        public bool IsChanged { get; set; }
        public bool IsSelected { get; set; } = true;
    }

    public class ItemStockUpdateDto
    {
        public Guid ItemId { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public string CategoryName { get; set; } = string.Empty;
        public decimal ClosingStock { get; set; }
        public decimal OpeningStock { get; set; }
        public decimal ClosingStockValue { get; set; }
        public decimal OpeningStockValue { get; set; }
         public decimal AveragePurchaseRate { get; set; }
        public decimal AverageSalesRate { get; set; }
        public bool IsNew { get; set; }
        public bool IsChanged { get; set; }
        public bool IsSelected { get; set; } = true;
        public bool ExistedInSourceFiscalYear { get; set; } = true;
    }

    public class TransferSummaryDto
    {
        public int TotalAccounts { get; set; }
        public int TotalItems { get; set; }
        public decimal TotalDebitBalance { get; set; }
        public decimal TotalCreditBalance { get; set; }
        public decimal TotalStockValue { get; set; }
    }

    public class UpdateBalancesRequestDto
    {
        public Guid SourceFiscalYearId { get; set; }
        public Guid TargetFiscalYearId { get; set; }
        public string CarryType { get; set; } = "All";
        public List<UpdatedAccountBalanceDto> UpdatedAccounts { get; set; } = new();
        public List<UpdatedItemStockDto> UpdatedItems { get; set; } = new();
        public DateTime TransferDate { get; set; }
        public string? TransferDateNepali { get; set; }
        public bool FinalizeTransfer { get; set; } = true;
    }

    public class UpdatedAccountBalanceDto
    {
        public Guid AccountId { get; set; }
        public decimal NewBalance { get; set; }
        public string BalanceType { get; set; } = "Dr";
        public bool IsSelected { get; set; } = true;
    }

    public class UpdatedItemStockDto
    {
        public Guid ItemId { get; set; }
        public decimal OpeningStock { get; set; }
        public decimal OpeningStockValue { get; set; }
        public bool IsSelected { get; set; } = true;
    }
}