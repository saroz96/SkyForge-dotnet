using System;
using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.RetailerDto.ItemCompanyDto
{
    public class ItemCompanyDTO
    {
        public Guid Id { get; set; }

        [Required(ErrorMessage = "Item company name is required")]
        [StringLength(100, ErrorMessage = "Name cannot exceed 100 characters")]
        public string Name { get; set; } = string.Empty;

        public Guid CompanyId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}