
using SkyForge.Dto.AccountDto;

namespace SkyForge.Dto.RetailerDto.SalesQuotationDto
{
    public class SalesQuotationRegisterDTO
    {
        public object? Company { get; set; }
        public FiscalYearInfoDTO? CurrentFiscalYear { get; set; }
        public List<SalesQuotationResponseDTO> Bills { get; set; } = new();
        public AccountInfoDTO? Account { get; set; }
        public DateInfoDTO Dates { get; set; } = new();

        public string? FromDate { get; set; }
        public string? ToDate { get; set; }
        public string? CurrentCompanyName { get; set; }
        public string? CompanyDateFormat { get; set; }
        public bool VatEnabled { get; set; }
        public bool IsVatExempt { get; set; }
    }

    public class SalesQuotationRegisterDataDTO
    {
        public CompanyInfoDTO Company { get; set; } = new();
        public AccountInfoDTO? Account { get; set; }
        public FiscalYearInfoDTO? CurrentFiscalYear { get; set; }
        public List<SalesQuotationResponseDTO> Bills { get; set; } = new();
        public DateInfoDTO Dates { get; set; } = new();
        public string? FromDate { get; set; }
        public string? ToDate { get; set; }
        public string CurrentCompanyName { get; set; } = string.Empty;
        public string CompanyDateFormat { get; set; } = "english";
        public bool VatEnabled { get; set; }
        public bool IsVatExempt { get; set; }
        public bool IsAdminOrSupervisor { get; set; }
        public UserPreferencesDTO? UserPreferences { get; set; }
        public PermissionsDTO? Permissions { get; set; }
    }

    public class DateInfoDTO
    {
        public string NepaliDate { get; set; } = string.Empty;
        public string TransactionDateNepali { get; set; } = string.Empty;
        public string CompanyDateFormat { get; set; } = string.Empty;
    }
}