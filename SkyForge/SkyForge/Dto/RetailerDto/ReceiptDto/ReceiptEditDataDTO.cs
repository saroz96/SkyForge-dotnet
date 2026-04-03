using SkyForge.Dto.AccountDto;
using SkyForge.Models.Retailer.ReceiptModel;
using System;
using System.Collections.Generic;

namespace SkyForge.Dto.RetailerDto.ReceiptDto
{
    public class ReceiptEditDataDTO
    {
        public CompanyInfoDTO Company { get; set; } = new();
        public ReceiptEditDTO Receipt { get; set; } = new();
        public List<ReceiptEntryEditDTO> Entries { get; set; } = new();
        public List<AccountInfoDTO> Accounts { get; set; } = new();
        public List<AccountInfoDTO> CashAccounts { get; set; } = new();
        public List<AccountInfoDTO> BankAccounts { get; set; } = new();
        public List<AccountInfoDTO> ReceiptAccounts { get; set; } = new();
        public FiscalYearDTO CurrentFiscalYear { get; set; } = new();
        public string NepaliDate { get; set; } = string.Empty;
        public string CompanyDateFormat { get; set; } = "english";
        public string CurrentCompanyName { get; set; } = string.Empty;
        public DateTime CurrentDate { get; set; }
        public UserEditInfoDTO User { get; set; } = new();
        public bool IsAdminOrSupervisor { get; set; }
    }

    public class ReceiptEditDTO
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public DateTime NepaliDate { get; set; }
        public decimal TotalAmount { get; set; }
        public string? Description { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string UserEmail { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class UserEditInfoDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public bool IsAdmin { get; set; }
        public string Role { get; set; } = string.Empty;
        public UserPreferencesDTO Preferences { get; set; } = new();
    }
}