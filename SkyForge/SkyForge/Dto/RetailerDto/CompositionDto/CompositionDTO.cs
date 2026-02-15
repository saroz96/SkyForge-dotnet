using SkyForge.Dto.RetailerDto.ItemDto;
using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.RetailerDto.CompositionDto
{
    public class CompositionDTO
    {
        public Guid Id { get; set; }
        
        [Required]
        [StringLength(255)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        public int UniqueNumber { get; set; }
        
        [Required]
        public Guid CompanyId { get; set; }
        
        public string CompanyName { get; set; } = string.Empty;
        
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        
        public ICollection<ItemCompositionDTO> ItemCompositions { get; set; } = new List<ItemCompositionDTO>();
        
        public ICollection<ItemResponseDTO> Items { get; set; } = new List<ItemResponseDTO>();
    }

    public class CompositionCreateDTO
    {
        [Required]
        [StringLength(255)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        public Guid CompanyId { get; set; }
        
        public ICollection<Guid> ItemIds { get; set; } = new List<Guid>();
    }

    public class CompositionUpdateDTO
    {
        [StringLength(255)]
        public string? Name { get; set; }
                
        public ICollection<Guid>? ItemIds { get; set; }
    }
}