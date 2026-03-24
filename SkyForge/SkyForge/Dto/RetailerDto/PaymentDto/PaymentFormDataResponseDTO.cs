using SkyForge.Models.Retailer.PaymentModel;
using System;
using System.Collections.Generic;
using SkyForge.Dto.RetailerDto;
using SkyForge.Dto.AccountDto;


namespace SkyForge.Dto.RetailerDto.PaymentDto
{
    public class PaymentFormDataResponseDTO
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
        public string Payment { get; set; }
    }
}