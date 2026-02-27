using System.Text.Json.Serialization;

namespace SkyForge.Dto.CompositionDto
{
    public class CompositionResponseDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int UniqueNumber { get; set; }

        public Guid CompanyId { get; set; }
        public string? CompanyName { get; set; }

        public List<CompositionItemDto> Items { get; set; } = new();

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }

        // Statistics
        public int ItemCount { get; set; }
        public int ActiveItemCount { get; set; }
        public int InactiveItemCount { get; set; }
    }

    public class CompositionItemDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? VatStatus { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal? Price { get; set; }
        public decimal? PuPrice { get; set; }
        public string? UnitName { get; set; }
        public string? CategoryName { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
