using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.CompositionDto
{
    public class UpdateCompositionDTO
    {
        [StringLength(255)]
        public string? Name { get; set; }

        [Range(1000, 9999)]
        public int? UniqueNumber { get; set; }
    }
}
