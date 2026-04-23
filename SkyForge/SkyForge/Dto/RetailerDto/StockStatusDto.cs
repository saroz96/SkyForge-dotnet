// using SkyForge.Dto.RetailerDto;
// using SkyForge.Models.CompanyModel;
// using SkyForge.Models.FiscalYearModel;

// namespace SkyForge.Dto.RetailerDto
// {
//     public class StockStatusResponseDTO
//     {
//         public CompanyInfoDTO? Company { get; set; }
//         public FiscalYearDTO? CurrentFiscalYear { get; set; }
//         public CompanyInfoDTO? CurrentCompany { get; set; }
//         public string CurrentCompanyName { get; set; } = string.Empty;
//         public string CompanyDateFormat { get; set; } = string.Empty;
//         public List<StockStatusItemDTO> Items { get; set; } = new();
//         public PaginationDTO Pagination { get; set; } = new();
//         public bool IsAdminOrSupervisor { get; set; }
//         public DateTime AsOnDate { get; set; }
//     }

//     public class StockStatusItemDTO
//     {
//         public Guid Id { get; set; }
//         public string Name { get; set; } = string.Empty;
//         public string Code { get; set; } = string.Empty;
//         public string? Category { get; set; }
//         public string? Unit { get; set; }
//         public decimal MinStock { get; set; }
//         public decimal MaxStock { get; set; }
//         public decimal OpeningStock { get; set; }
//         public decimal TotalQtyIn { get; set; }
//         public decimal TotalQtyOut { get; set; }
//         public decimal Stock { get; set; }
//         public decimal AvgPuPrice { get; set; }
//         public decimal AvgPrice { get; set; }
//         public decimal TotalStockValuePurchase { get; set; }
//         public decimal TotalStockValueSales { get; set; }
//     }

//     public class PaginationDTO
//     {
//         public int Current { get; set; }
//         public int Pages { get; set; }
//         public int Total { get; set; }
//     }
// }

//---------------------------------------------------------------end

using SkyForge.Dto.RetailerDto;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;

namespace SkyForge.Dto.RetailerDto
{
    public class StockStatusResponseDTO
    {
        public CompanyInfoDTO? Company { get; set; }
        public FiscalYearDTO? CurrentFiscalYear { get; set; }
        public CompanyInfoDTO? CurrentCompany { get; set; }
        public string CurrentCompanyName { get; set; } = string.Empty;
        public string CompanyDateFormat { get; set; } = string.Empty;
        public List<StockStatusItemDTO> Items { get; set; } = new();
        public PaginationDTO Pagination { get; set; } = new();
        public bool IsAdminOrSupervisor { get; set; }
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
    }

    public class StockStatusItemDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string? Category { get; set; }
        public string? Unit { get; set; }
        public decimal MinStock { get; set; }
        public decimal MaxStock { get; set; }
        public decimal OpeningStock { get; set; }
        public decimal TotalQtyIn { get; set; }
        public decimal TotalQtyOut { get; set; }
        public decimal Stock { get; set; }
        public decimal AvgPuPrice { get; set; }
        public decimal AvgPrice { get; set; }
        public decimal TotalStockValuePurchase { get; set; }
        public decimal TotalStockValueSales { get; set; }
    }

    public class PaginationDTO
    {
        public int Current { get; set; }
        public int Pages { get; set; }
        public int Total { get; set; }
    }
}