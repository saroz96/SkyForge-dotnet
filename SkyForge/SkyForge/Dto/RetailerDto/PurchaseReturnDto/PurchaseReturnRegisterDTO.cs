using SkyForge.Dto.AccountDto;


namespace SkyForge.Dto.RetailerDto.PurchaseReturnDto
{
    public class PurchaseReturnRegisterDTO
    {
        public object? Company { get; set; }
        public FiscalYearDTO? CurrentFiscalYear { get; set; }
        public List<PurchaseReturnBillData> Bills { get; set; } = new();
        public AccountInfoDTO? Account { get; set; }

        public string? FromDate { get; set; }
        public string? ToDate { get; set; }
        public string? CurrentCompanyName { get; set; }
        public string? CompanyDateFormat { get; set; }
        public bool VatEnabled { get; set; }
        public bool IsVatExempt { get; set; }
    }

    public class PurchaseReturnRegisterDataDTO
    {
        public CompanyInfoDTO Company { get; set; } = new();
        public FiscalYearDTO? CurrentFiscalYear { get; set; }
        public List<PurchaseReturnResponseDTO> Bills { get; set; } = new();
        public string? FromDate { get; set; }
        public string? ToDate { get; set; }
        public string CurrentCompanyName { get; set; } = string.Empty;
        public string CompanyDateFormat { get; set; } = "english";
        public bool VatEnabled { get; set; }
        public bool IsVatExempt { get; set; }
        public bool IsAdminOrSupervisor { get; set; }
    }
}