using SkyForge.Dto.RetailerDto.SalesBillDto;
using SkyForge.Dto.AccountDto;
using System.Text.Json.Serialization;
using SkyForge.Dto.RetailerDto;

namespace SkyForge.Dto.RetailerDto.StockAdjustmentDto
{
    public class StockAdjustmentResponseDTO
    {
        public CompanyInfoDTO Company { get; set; } = new();
        public FiscalYearDTO? FiscalYear { get; set; }
        public List<CategoryInfoDTO> Categories { get; set; } = new();
        public List<UnitInfoDTO> Units { get; set; } = new();
        public DateInfoDTO Dates { get; set; } = new();
        public UserInfoDTO User { get; set; } = new();
        public string? CurrentCompanyName { get; set; }
        public FiscalYearDTO? CurrentFiscalYear { get; set; }
        public UserPreferencesDTO? UserPreferences { get; set; }
        public PermissionsDTO? Permissions { get; set; }
    }
}