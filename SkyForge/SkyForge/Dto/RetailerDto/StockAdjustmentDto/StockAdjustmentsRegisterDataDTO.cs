using System;
using System.Collections.Generic;
using SkyForge.Dto.RetailerDto;
using SkyForge.Dto.AccountDto;

namespace SkyForge.Dto.RetailerDto.StockAdjustmentDto
{
    public class StockAdjustmentsRegisterDataDTO
    {
        public CompanyInfoDTO Company { get; set; } = new();
        public FiscalYearDTO? CurrentFiscalYear { get; set; }
        public List<StockAdjustmentItemDetailDTO> StockAdjustments { get; set; } = new();
        public List<ItemInfoDTO> Items { get; set; } = new();
        public string? FromDate { get; set; }
        public string? ToDate { get; set; }
        public string CurrentCompanyName { get; set; } = string.Empty;
        public string CompanyDateFormat { get; set; } = "english";
        public string? NepaliDate { get; set; }
        public UserPreferencesDTO UserPreferences { get; set; } = new();
    }

    public class StockAdjustmentItemDetailDTO
    {
        public DateTime Date { get; set; }
        public DateTime NepaliDate { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        public Guid ItemId { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public Guid UnitId { get; set; }
        public string UnitName { get; set; } = string.Empty;
        public decimal PuPrice { get; set; }
        public string AdjustmentType { get; set; } = string.Empty; // "xcess" or "short"
        public string Reason { get; set; } = string.Empty;
        public string VatStatus { get; set; } = string.Empty;
        public Guid UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public Guid AdjustmentId { get; set; }
        public string? Note { get; set; }
    }

    public class StockAdjustmentsEntryDataDTO
    {
        public CompanyInfoDTO Company { get; set; } = new();
        public List<ItemInfoDTO> Items { get; set; } = new();
        public List<CategoryInfoDTO> Categories { get; set; } = new();
        public List<UnitInfoDTO> Units { get; set; } = new();
        public DateInfoDTO Dates { get; set; } = new();
        public FiscalYearDTO CurrentFiscalYear { get; set; } = new();
        public UserPreferencesDTO UserPreferences { get; set; } = new();
        public PermissionsDTO Permissions { get; set; } = new();
        public string CurrentCompanyName { get; set; } = string.Empty;
    }

    public class ItemInfoDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Code { get; set; }
        public string VatStatus { get; set; } = "vatable";
        public Guid? ItemCategoryId { get; set; }
    }
}