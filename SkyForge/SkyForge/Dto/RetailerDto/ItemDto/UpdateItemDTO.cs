using SkyForge.Dto.RetailerDto.StockEntryDto;
using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.RetailerDto.ItemDto
{
    public class UpdateItemDTO
    {
        [StringLength(255)]
        public string? Name { get; set; }

        public string? Hscode { get; set; }

        public Guid? CategoryId { get; set; }

        public Guid? ItemsCompanyId { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? Price { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? PuPrice { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? MainUnitPuPrice { get; set; }

        public Guid? MainUnitId { get; set; }

        public List<Guid>? CompositionIds { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? WsUnit { get; set; }

        public Guid? UnitId { get; set; }

        [StringLength(20)]
        [RegularExpression("^(all|vatable|vatExempt)$")]
        public string? VatStatus { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? OpeningStock { get; set; }

        public CreateInitialOpeningStockDTO? InitialOpeningStock { get; set; }

        //public InitialOpeningStockDTO? InitialOpeningStock { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? MinStock { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? MaxStock { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? ReorderLevel { get; set; }

        [StringLength(20)]
        [RegularExpression("^(active|inactive)$")]
        public string? Status { get; set; }

        public List<CreateStockEntryDTO>? StockEntries { get; set; }

        public List<CreateItemOpeningStockByFiscalYearDTO>? OpeningStocksByFiscalYear { get; set; }
        public List<CreateItemClosingStockByFiscalYearDTO>? ClosingStocksByFiscalYear { get; set; }
    }
}