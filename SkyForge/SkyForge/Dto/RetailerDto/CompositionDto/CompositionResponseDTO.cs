
namespace SkyForge.Dto.RetailerDto.CompositionDto
{
    public class CompositionResponseDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int UniqueNumber { get; set; }
        public Guid CompanyId { get; set; }
        public string CompanyName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public ICollection<CompositionItemDTO> Items { get; set; } = new List<CompositionItemDTO>();
        public int ItemCount { get; set; }
        public decimal TotalStockValue { get; set; }
        public decimal TotalCurrentStock { get; set; }
    }

    public class CompositionItemDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Sku { get; set; }
        public decimal Price { get; set; }
        public decimal? PuPrice { get; set; }
        public decimal CurrentStock { get; set; }
        public decimal StockValue { get; set; }
        public string UnitName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}