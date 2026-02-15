using SkyForge.Dto.CompositionDto;
using System.Text.Json.Serialization;

namespace SkyForge.Dto.RetailerDto.ItemDto
{
    public class ItemWithCompositionsDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Hscode { get; set; }
        public Guid CategoryId { get; set; }
        public string? CategoryName { get; set; }
        public Guid ItemsCompanyId { get; set; }
        public string? ItemsCompanyName { get; set; }
        public decimal? Price { get; set; }
        public decimal? PuPrice { get; set; }
        public decimal MainUnitPuPrice { get; set; }
        public Guid? MainUnitId { get; set; }
        public string? MainUnitName { get; set; }
        public decimal WsUnit { get; set; }
        public Guid UnitId { get; set; }
        public string? UnitName { get; set; }
        public string VatStatus { get; set; } = string.Empty;
        public decimal OpeningStock { get; set; }
        public decimal CurrentStock { get; set; }
        public decimal MinStock { get; set; }
        public decimal MaxStock { get; set; }
        public decimal ReorderLevel { get; set; }
        public int UniqueNumber { get; set; }
        public long BarcodeNumber { get; set; }
        public Guid CompanyId { get; set; }
        public string? CompanyName { get; set; }
        public Guid FiscalYearId { get; set; }
        public string? FiscalYearName { get; set; }
        public string Status { get; set; } = "active";
        public decimal StockValue { get; set; }
        
        public ICollection<CompositionResponseDTO> Compositions { get; set; } = new List<CompositionResponseDTO>();
        public int CompositionCount { get; set; }
        
        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }
    }
}