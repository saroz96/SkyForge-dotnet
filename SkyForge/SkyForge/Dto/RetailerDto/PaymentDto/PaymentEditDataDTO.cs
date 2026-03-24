using SkyForge.Dto.AccountDto;


namespace SkyForge.Dto.RetailerDto.PaymentDto
{
    public class PaymentEditDataDTO
    {
        public CompanyInfoDTO Company { get; set; } = new();
        public PaymentEditDTO Payment { get; set; } = new();
        public List<AccountInfoDTO> Accounts { get; set; } = new();
        public List<AccountInfoDTO> CashAccounts { get; set; } = new();
        public List<AccountInfoDTO> BankAccounts { get; set; } = new();
        public List<AccountInfoDTO> PaymentAccounts { get; set; } = new();
        public FiscalYearDTO CurrentFiscalYear { get; set; } = new();
        public string NepaliDate { get; set; } = string.Empty;
        public string CompanyDateFormat { get; set; } = "english";
        public string CurrentCompanyName { get; set; } = string.Empty;
        public DateTime CurrentDate { get; set; }
        public UserEditInfoDTO User { get; set; } = new();
        public bool IsAdminOrSupervisor { get; set; }
    }

    public class PaymentEditDTO
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public DateTime NepaliDate { get; set; }
        public Guid AccountId { get; set; }
        public string AccountName { get; set; } = string.Empty;
        public decimal Debit { get; set; }
        public Guid PaymentAccountId { get; set; }
        public string PaymentAccountName { get; set; } = string.Empty;
        public string InstType { get; set; } = string.Empty;
        public string? InstNo { get; set; }
        public string? Description { get; set; }
        public string UserName { get; set; } = string.Empty;
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