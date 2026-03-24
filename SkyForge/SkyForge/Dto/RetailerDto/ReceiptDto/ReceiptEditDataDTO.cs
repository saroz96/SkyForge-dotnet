using SkyForge.Dto.AccountDto;

namespace SkyForge.Dto.RetailerDto.ReceiptDto
{
    public class ReceiptEditDataDTO
    {
        public CompanyInfoDTO Company { get; set; } = new();
        public ReceiptEditDTO Receipt { get; set; } = new();
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
        public Guid AccountId { get; set; }
        public string AccountName { get; set; } = string.Empty;
        public string AccountPan { get; set; } = string.Empty;
        public string AccountAddress { get; set; } = string.Empty;
        public decimal Credit { get; set; }
        public Guid ReceiptAccountId { get; set; }
        public string ReceiptAccountName { get; set; } = string.Empty;
        public string ReceiptAccountCode { get; set; } = string.Empty;
        public string ReceiptAccountUniqueNumber { get; set; } = string.Empty;
        public string InstType { get; set; } = string.Empty;
        public string? InstNo { get; set; }
        public string? BankAcc { get; set; }
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

    // public class UserPreferencesDTO
    // {
    //     public string Theme { get; set; } = "light";
    // }
}