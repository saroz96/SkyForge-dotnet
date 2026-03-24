using System;
using System.Collections.Generic;
using SkyForge.Dto.AccountDto;

namespace SkyForge.Dto.RetailerDto.ReceiptDto
{
    public class ReceiptsRegisterDataDTO
    {
        public CompanyInfoDTO Company { get; set; } = new();
        public FiscalYearDTO? CurrentFiscalYear { get; set; }
        public List<ReceiptResponseItemDTO> Receipts { get; set; } = new();
        public string? FromDate { get; set; }
        public string? ToDate { get; set; }
        public string CurrentCompanyName { get; set; } = string.Empty;
        public string CompanyDateFormat { get; set; } = "english";
        public string NepaliDate { get; set; } = string.Empty;
        public UserPreferencesDTO? UserPreferences { get; set; }
        public bool IsAdminOrSupervisor { get; set; }
    }

    public class ReceiptResponseItemDTO
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public DateTime NepaliDate { get; set; }
        public Guid AccountId { get; set; }
        public string AccountName { get; set; } = string.Empty;
        public string AccountUniqueNumber { get; set; } = string.Empty;
        public decimal Credit { get; set; }
        public decimal Debit { get; set; }
        public Guid ReceiptAccountId { get; set; }
        public string ReceiptAccountName { get; set; } = string.Empty;
        public string InstType { get; set; } = string.Empty;
        public string? InstNo { get; set; }
        public string? BankAcc { get; set; }
        public string? Description { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class ReceiptEntryDataDTO
    {
        public CompanyInfoDTO Company { get; set; } = new();
        public List<AccountInfoDTO> Accounts { get; set; } = new();
        public List<AccountInfoDTO> CashAccounts { get; set; } = new();
        public List<AccountInfoDTO> BankAccounts { get; set; } = new();
        public DateInfoDTO Dates { get; set; } = new();
        public FiscalYearDTO CurrentFiscalYear { get; set; } = new();
        public string NextReceiptBillNumber { get; set; } = string.Empty;
        public UserPreferencesDTO UserPreferences { get; set; } = new();
        public PermissionsDTO Permissions { get; set; } = new();
        public string CurrentCompanyName { get; set; } = string.Empty;
    }

    // public class DateInfoDTO
    // {
    //     public string NepaliDate { get; set; } = string.Empty;
    //     public string TransactionDateNepali { get; set; } = string.Empty;
    //     public string CompanyDateFormat { get; set; } = "english";
    // }

    // public class UserPreferencesDTO
    // {
    //     public string Theme { get; set; } = "light";
    // }

    // public class PermissionsDTO
    // {
    //     public bool IsAdminOrSupervisor { get; set; }
    //     public bool StoreManagementEnabled { get; set; }
    // }
}