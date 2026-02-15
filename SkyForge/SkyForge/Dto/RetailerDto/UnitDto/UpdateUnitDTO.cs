using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.RetailerDto.UnitDto

{
    public class UpdateUnitDTO
    {
        [StringLength(50, ErrorMessage = "Name cannot exceed 50 characters")]
        public string? Name { get; set; }
    }
}