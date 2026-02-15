
using SkyForge.Dto.RetailerDto.StockEntryDto;
using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.RetailerDto.ItemDto
{
    public class CreateItemDTO
    {
        [Required]
        [StringLength(255)]
        public string Name { get; set; } = string.Empty;

        public string? Hscode { get; set; }

        [Required]
        public Guid CategoryId { get; set; }

        [Required]
        public Guid ItemsCompanyId { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? Price { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? PuPrice { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? NetPuPrice { get; set; }

        [Range(0, double.MaxValue)]
        public decimal MainUnitPuPrice { get; set; } = 0;

        public Guid? MainUnitId { get; set; }

        public List<Guid>? CompositionIds { get; set; }

        [Range(0, double.MaxValue)]
        public decimal WsUnit { get; set; } = 0;

        [Required]
        public Guid UnitId { get; set; }

        [Required]
        [StringLength(20)]
        [RegularExpression("^(all|vatable|vatExempt)$")]
        public string VatStatus { get; set; } = string.Empty;

        [Range(0, double.MaxValue)]
        public decimal OpeningStock { get; set; } = 0;

        //public InitialOpeningStockDTO? InitialOpeningStock { get; set; }

        public CreateInitialOpeningStockDTO? InitialOpeningStock { get; set; }

        [Range(0, double.MaxValue)]
        public decimal MinStock { get; set; } = 0;

        [Range(0, double.MaxValue)]
        public decimal MaxStock { get; set; } = 100;

        [Range(0, double.MaxValue)]
        public decimal ReorderLevel { get; set; } = 0;
        [StringLength(10)]
        public string? Currency { get; set; }
        public Guid? StoreId { get; set; }
        public Guid? RackId { get; set; }

        [Required]
        public Guid CompanyId { get; set; }

        [Required]
        public Guid FiscalYearId { get; set; }

        public List<CreateStockEntryDTO>? StockEntries { get; set; }

        [StringLength(20)]
        [RegularExpression("^(active|inactive)$")]
        public string Status { get; set; } = "active";

        public List<CreateItemOpeningStockByFiscalYearDTO>? OpeningStocksByFiscalYear { get; set; }
        public List<CreateItemClosingStockByFiscalYearDTO>? ClosingStocksByFiscalYear { get; set; }
    }
}
