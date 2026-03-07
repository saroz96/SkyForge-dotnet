using SkyForge.Dto.AccountDto;


namespace SkyForge.Dto.RetailerDto.SalesBillDto
{
    public class SalesRegisterDTO
    {
        public object? Company { get; set; }
        public FiscalYearDTO? CurrentFiscalYear { get; set; }
        public List<SalesBillData> Bills { get; set; } = new();
        public AccountInfoDTO? Account { get; set; }

        public string? FromDate { get; set; }
        public string? ToDate { get; set; }
        public string? CurrentCompanyName { get; set; }
        public string? CompanyDateFormat { get; set; }
        public bool VatEnabled { get; set; }
        public bool IsVatExempt { get; set; }
    }

    public class SalesRegisterDataDTO
    {
        public CompanyInfoDTO Company { get; set; } = new();
        public FiscalYearDTO? CurrentFiscalYear { get; set; }
        public List<SalesBillResponseDTO> Bills { get; set; } = new();
        public string? FromDate { get; set; }
        public string? ToDate { get; set; }
        public string CurrentCompanyName { get; set; } = string.Empty;
        public string CompanyDateFormat { get; set; } = "english";
        public bool VatEnabled { get; set; }
        public bool IsVatExempt { get; set; }
        public bool IsAdminOrSupervisor { get; set; }
    }

    public class SalesBillEntryDataDTO
    {
        public CompanyInfoDTO Company { get; set; } = new();
        public List<AccountInfoDTO> Accounts { get; set; } = new();
        public DateInfoDTO Dates { get; set; } = new();
        public FiscalYearDTO CurrentFiscalYear { get; set; } = new();
        public UserPreferencesDTO UserPreferences { get; set; } = new();
        public PermissionsDTO Permissions { get; set; } = new();
        public string CurrentCompanyName { get; set; } = string.Empty;
    }
}