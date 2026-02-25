using SkyForge.Dto.AccountDto;

namespace SkyForge.Dto.RetailerDto.SalesQuotationDto
{
    public class SalesQuotationFindsDTO
    {
        public CompanyInfoDTO Company { get; set; } = new();
        public string BillNumber { get; set; } = string.Empty;
        public FiscalYearDTO CurrentFiscalYear { get; set; } = new();
        public string CompanyDateFormat { get; set; } = string.Empty;
        public string CurrentCompanyName { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;
        public UserInfoDTO User { get; set; } = new();
        public string Theme { get; set; } = "light";
        public bool IsAdminOrSupervisor { get; set; }
    }

    public class UserInfoDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public bool IsAdmin { get; set; }
        public string Role { get; set; } = string.Empty;
        public UserPreferencesDTO Preferences { get; set; } = new();
    }
}