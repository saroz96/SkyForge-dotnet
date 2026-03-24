using SkyForge.Models.Retailer.PaymentModel;
using System;
using System.Collections.Generic;
using SkyForge.Dto.RetailerDto;
using SkyForge.Dto.AccountDto;

namespace SkyForge.Dto.RetailerDto.ReceiptDto
{
    public class ReceiptFormDataResponseDTO
    {
        public CompanyInfoDTO Company { get; set; }
        public FiscalYearDTO CurrentFiscalYear { get; set; }
        public List<AccountInfoDTO> Accounts { get; set; } = new();
        public List<AccountInfoDTO> CashAccounts { get; set; } = new();
        public List<AccountInfoDTO> BankAccounts { get; set; } = new();
        public string NextBillNumber { get; set; }
        public string NepaliDate { get; set; }
        public string CompanyDateFormat { get; set; }
        public string CurrentCompanyName { get; set; }
        public DateTime CurrentDate { get; set; }
        public UserInfoDTO User { get; set; }
        public UserPreferencesDTO? UserPreferences { get; set; }
        public PermissionsDTO? Permissions { get; set; }
        public bool IsAdminOrSupervisor { get; set; }
    }

    public class BillPrefixesDTO
    {
        public string Receipt { get; set; }
    }

    // public class UserInfoDTO
    // {
    //     public Guid Id { get; set; }
    //     public string Name { get; set; }
    //     public bool IsAdmin { get; set; }
    //     public string Role { get; set; }
    // }

    // public class UserPreferencesDTO
    // {
    //     public string Theme { get; set; }
    // }

    // public class PermissionsDTO
    // {
    //     public bool IsAdminOrSupervisor { get; set; }
    // }

    // public class CompanyInfoDTO
    // {
    //     public Guid Id { get; set; }
    //     public string Name { get; set; }
    //     public string DateFormat { get; set; }
    //     public DateTime? RenewalDate { get; set; }
    // }

    // public class FiscalYearDTO
    // {
    //     public Guid Id { get; set; }
    //     public string Name { get; set; }
    //     public DateTime StartDate { get; set; }
    //     public DateTime EndDate { get; set; }
    //     public bool IsActive { get; set; }
    //     public string DateFormat { get; set; }
    //     public BillPrefixesDTO BillPrefixes { get; set; }
    // }
}