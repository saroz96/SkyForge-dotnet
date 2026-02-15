using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.RetailerDto.ItemDto
{
    public class CreateInitialOpeningStockDTO
    {
        [Required]
        public Guid ItemId { get; set; }

        public Guid? InitialFiscalYearId { get; set; }

        [Required]
        [Range(0, double.MaxValue)]
        public decimal OpeningStock { get; set; } = 0;

        [Required]
        [Range(0, double.MaxValue)]
        public decimal OpeningStockValue { get; set; } = 0;

        [Required]
        [Range(0, double.MaxValue)]
        public decimal PurchasePrice { get; set; } = 0;

        [Required]
        [Range(0, double.MaxValue)]
        public decimal SalesPrice { get; set; } = 0;

        public DateTime? Date { get; set; }
    }

    public class UpdateInitialOpeningStockDTO
    {
        public Guid? InitialFiscalYearId { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? OpeningStock { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? OpeningStockValue { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? PurchasePrice { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? SalesPrice { get; set; }

        public DateTime? Date { get; set; }
    }
}