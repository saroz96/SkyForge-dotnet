using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.RetailerDto.CategoryDto
{
    public class UpdateCategoryDTO
    {
        [StringLength(100, ErrorMessage = "Name cannot exceed 100 characters")]
        public string? Name { get; set; }
    }
}