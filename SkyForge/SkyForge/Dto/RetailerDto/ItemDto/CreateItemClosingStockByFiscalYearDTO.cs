using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.RetailerDto.ItemDto
{
    public class CreateItemClosingStockByFiscalYearDTO
    {
        [Required]
        public Guid FiscalYearId { get; set; }

        [Required]
        [Range(0, double.MaxValue)]
        public decimal ClosingStock { get; set; } = 0;

        [Required]
        [Range(0, double.MaxValue)]
        public decimal ClosingStockValue { get; set; } = 0;

        [Required]
        [Range(0, double.MaxValue)]
        public decimal PurchasePrice { get; set; } = 0;

        [Required]
        [Range(0, double.MaxValue)]
        public decimal SalesPrice { get; set; } = 0;
    }
}