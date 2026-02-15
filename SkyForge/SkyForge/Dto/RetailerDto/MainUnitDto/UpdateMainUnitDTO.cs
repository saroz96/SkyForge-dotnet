using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.RetailerDto.MainUnitDto
{
    public class UpdateMainUnitDTO
    {
        [StringLength(50, ErrorMessage = "Name cannot exceed 50 characters")]
        public string? Name { get; set; }
    }
}