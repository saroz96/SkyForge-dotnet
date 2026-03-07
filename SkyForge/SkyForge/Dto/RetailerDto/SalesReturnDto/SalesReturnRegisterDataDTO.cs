using SkyForge.Dto.AccountDto;

namespace SkyForge.Dto.RetailerDto.SalesReturnDto
{
    public class SalesReturnRegisterDTO
    {
        public object? Company { get; set; }
        public FiscalYearDTO? CurrentFiscalYear { get; set; }
        public List<SalesReturnResponseDTO> Bills { get; set; } = new();
        public string? FromDate { get; set; }
        public string? ToDate { get; set; }
        public string? CurrentCompanyName { get; set; }
        public string? CompanyDateFormat { get; set; }
        public bool VatEnabled { get; set; }
        public bool IsVatExempt { get; set; }
    }

    public class SalesReturnRegisterDataDTO
    {
        public CompanyInfoDTO Company { get; set; } = new();
        public FiscalYearDTO? CurrentFiscalYear { get; set; }
        public List<SalesReturnResponseDTO> Bills { get; set; } = new();
        public string? FromDate { get; set; }
        public string? ToDate { get; set; }
        public string CurrentCompanyName { get; set; } = string.Empty;
        public string CompanyDateFormat { get; set; } = "english";
        public bool VatEnabled { get; set; }
        public bool IsVatExempt { get; set; }
    }

    public class SalesReturnEntryDataDTO
    {
        public CompanyInfoDTO Company { get; set; } = new();
        public List<AccountInfoDTO> Accounts { get; set; } = new();
        public List<CategoryInfoDTO> Categories { get; set; } = new();
        public List<UnitInfoDTO> Units { get; set; } = new();
        public DateInfoDTO Dates { get; set; } = new();
        public FiscalYearDTO CurrentFiscalYear { get; set; } = new();
        public UserPreferencesDTO UserPreferences { get; set; } = new();
        public PermissionsDTO Permissions { get; set; } = new();
        public string CurrentCompanyName { get; set; } = string.Empty;
    }
}