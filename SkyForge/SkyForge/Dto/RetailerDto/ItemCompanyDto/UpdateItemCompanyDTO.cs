using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.RetailerDto.ItemCompanyDto
{
    public class UpdateItemCompanyDTO
    {
        [StringLength(100, ErrorMessage = "Name cannot exceed 100 characters")]
        public string? Name { get; set; }
    }
}