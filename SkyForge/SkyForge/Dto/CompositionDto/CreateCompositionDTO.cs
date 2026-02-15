
using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.CompositionDto
{
    public class CreateCompositionDTO
    {
        [Required]
        [StringLength(255)]
        public string Name { get; set; } = string.Empty;

        [Required]
        public Guid CompanyId { get; set; }

        // Optional: If you want to allow manual unique number assignment
        [Range(1000, 9999)]
        public int? UniqueNumber { get; set; }
    }
}
