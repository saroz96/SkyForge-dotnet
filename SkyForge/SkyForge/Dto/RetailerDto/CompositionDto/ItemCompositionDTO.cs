using SkyForge.Dto.RetailerDto.ItemDto;

namespace SkyForge.Dto.RetailerDto.CompositionDto
{
    public class ItemCompositionDTO
    {
        public Guid ItemId { get; set; }
        public Guid CompositionId { get; set; }
        public DateTime CreatedAt { get; set; }
        
        public ItemResponseDTO? Item { get; set; }
        public CompositionDTO? Composition { get; set; }
    }

    public class ItemCompositionCreateDTO
    {
        public Guid ItemId { get; set; }
        
        public Guid CompositionId { get; set; }
    }

    public class ItemCompositionBulkCreateDTO
    {
        public Guid CompositionId { get; set; }
        
        public ICollection<Guid> ItemIds { get; set; } = new List<Guid>();
    }
}