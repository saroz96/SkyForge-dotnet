using SkyForge.Dto.RetailerDto.PurchaseBillDto;
using System.Text.Json.Serialization;

namespace SkyForge.Dto.RetailerDto.PurchaseBillDto
{
    public class PurchaseRegisterResponseDTO
    {
        public bool Success { get; set; }
        public PurchaseRegisterDataDTO Data { get; set; } = new();
    }

    public class PurchaseRegisterDataDTO
    {
        public CompanyInfoDTO Company { get; set; } = new();
        public FiscalYearDTO? CurrentFiscalYear { get; set; }
        public List<PurchaseBillResponseDTO> Bills { get; set; } = new();
        public string? FromDate { get; set; }
        public string? ToDate { get; set; }
        public string CurrentCompanyName { get; set; } = string.Empty;
        public string CompanyDateFormat { get; set; } = "english";
        public bool VatEnabled { get; set; }
        public bool IsVatExempt { get; set; }
        public bool IsAdminOrSupervisor { get; set; }
    }
}