using SkyForge.Dto.AccountDto;
using SkyForge.Dto.RetailerDto;


namespace SkyForge.Dto.RetailerDto.PaymentDto
{
    public class PaymentFindsDTO
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
}