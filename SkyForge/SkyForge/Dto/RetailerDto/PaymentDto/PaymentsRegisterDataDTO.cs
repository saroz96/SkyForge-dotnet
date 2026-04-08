using System;
using System.Collections.Generic;
using SkyForge.Dto.AccountDto;

namespace SkyForge.Dto.RetailerDto.PaymentDto
{
    public class PaymentsRegisterDataDTO
    {
        public CompanyInfoDTO Company { get; set; } = new();
        public FiscalYearDTO? CurrentFiscalYear { get; set; }
        public List<PaymentResponseItemDTO> Payments { get; set; } = new();
        public string? FromDate { get; set; }
        public string? ToDate { get; set; }
        public string CurrentCompanyName { get; set; } = string.Empty;
        public string CompanyDateFormat { get; set; } = "english";
        public string NepaliDate { get; set; } = string.Empty;
        public UserPreferencesDTO? UserPreferences { get; set; }
        public bool IsAdminOrSupervisor { get; set; }
    }

    public class PaymentResponseItemDTO
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public DateTime NepaliDate { get; set; }
        public Guid AccountId { get; set; }
        public string AccountName { get; set; } = string.Empty;
        public string AccountUniqueNumber { get; set; } = string.Empty;
        public decimal Debit { get; set; }
        public decimal Credit { get; set; }
        public Guid PaymentAccountId { get; set; }
        public string PaymentAccountName { get; set; } = string.Empty;
        public string InstType { get; set; } = string.Empty;
        public string? InstNo { get; set; }
        public string? BankAcc { get; set; }
        public string? Description { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}