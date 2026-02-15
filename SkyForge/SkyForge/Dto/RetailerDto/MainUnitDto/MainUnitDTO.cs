using System;
using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.RetailerDto.MainUnitDto
{
    public class MainUnitDTO
    {
        public Guid Id { get; set; }

        [Required(ErrorMessage = "Main unit name is required")]
        [StringLength(50, ErrorMessage = "Name cannot exceed 50 characters")]
        public string Name { get; set; } = string.Empty;

        public Guid CompanyId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}