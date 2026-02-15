using SkyForge.Models.CompanyModel;
using SkyForge.Models.Retailer.StoreModel;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkyForge.Models.RackModel
{
    public class Rack
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }

        [Required(ErrorMessage = "Rack name is required")]
        [StringLength(50, ErrorMessage = "Rack name cannot exceed 50 characters")]
        public string Name { get; set; } = string.Empty;

        [StringLength(500, ErrorMessage = "Description cannot exceed 500 characters")]
        public string? Description { get; set; }

        [Required(ErrorMessage = "Store is required")]
        public Guid StoreId { get; set; }

        [ForeignKey("StoreId")]
        public virtual Store? Store { get; set; }

        [Required(ErrorMessage = "Company is required")]
        public Guid CompanyId { get; set; }

        [ForeignKey("CompanyId")]
        public virtual Company? Company { get; set; }

        public bool IsActive { get; set; } = true;

        // Timestamps
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }

    // DTOs for Rack
    public class RackDTO
    {
        public Guid Id { get; set; }

        [Required(ErrorMessage = "Rack name is required")]
        [StringLength(50, ErrorMessage = "Rack name cannot exceed 50 characters")]
        public string Name { get; set; } = string.Empty;

        [StringLength(500, ErrorMessage = "Description cannot exceed 500 characters")]
        public string? Description { get; set; }

        public Guid StoreId { get; set; }
        public string? StoreName { get; set; }

        public Guid CompanyId { get; set; }
        public string? CompanyName { get; set; }

        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class CreateRackDTO
    {
        [Required(ErrorMessage = "Rack name is required")]
        [StringLength(50, ErrorMessage = "Rack name cannot exceed 50 characters")]
        public string Name { get; set; } = string.Empty;

        [StringLength(500, ErrorMessage = "Description cannot exceed 500 characters")]
        public string? Description { get; set; }

        [Required(ErrorMessage = "Store is required")]
        public Guid StoreId { get; set; }

        [Required(ErrorMessage = "Company is required")]
        public Guid CompanyId { get; set; }

        public bool IsActive { get; set; } = true;
    }

    public class UpdateRackDTO
    {
        [StringLength(50, ErrorMessage = "Rack name cannot exceed 50 characters")]
        public string? Name { get; set; }

        [StringLength(500, ErrorMessage = "Description cannot exceed 500 characters")]
        public string? Description { get; set; }

        public Guid? StoreId { get; set; }
        public bool? IsActive { get; set; }
    }
}
