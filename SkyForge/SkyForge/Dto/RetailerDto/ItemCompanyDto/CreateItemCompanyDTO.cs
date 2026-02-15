using System;
using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.RetailerDto.ItemCompanyDto
{
    public class CreateItemCompanyDTO
    {
        [Required(ErrorMessage = "Item company name is required")]
        [StringLength(100, ErrorMessage = "Name cannot exceed 100 characters")]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Company is required")]
        public Guid CompanyId { get; set; } // Changed from int to Guid to match the entity
    }
}