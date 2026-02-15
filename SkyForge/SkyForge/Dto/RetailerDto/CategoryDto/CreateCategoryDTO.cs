using System;
using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.RetailerDto.CategoryDto
{
    public class CreateCategoryDTO
    {
        [Required(ErrorMessage = "Category name is required")]
        [StringLength(100, ErrorMessage = "Name cannot exceed 100 characters")]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Company is required")]
        public Guid CompanyId { get; set; }
    }
}