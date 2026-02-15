using System;
using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.RetailerDto.MainUnitDto
{
    public class CreateMainUnitDTO
    {
        [Required(ErrorMessage = "Main unit name is required")]
        [StringLength(50, ErrorMessage = "Name cannot exceed 50 characters")]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Company is required")]
        public Guid CompanyId { get; set; }
    }
}