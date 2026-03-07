using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkyForge.Models.UnitModel
{
    public class Unit
    {
        [Key]
        public Guid Id { get; set; }

        [Required(ErrorMessage = "Unit name is required")]
        [StringLength(50, ErrorMessage = "Name cannot exceed 50 characters")]
        public string Name { get; set; } = string.Empty;

        [Range(1000, 9999, ErrorMessage = "Unique number must be 4 digits")]
        public int? UniqueNumber { get; set; }

        [Required(ErrorMessage = "Company is required")]
        public Guid CompanyId { get; set; }

        [ForeignKey("CompanyId")]
        public virtual CompanyModel.Company? Company { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
