// using System;
// using System.ComponentModel.DataAnnotations;
// using System.ComponentModel.DataAnnotations.Schema;

// namespace SkyForge.Models.Retailer.MainUnitModel
// {
//     public class MainUnit
//     {
//         [Key]
//         public Guid Id { get; set; }

//         [Required(ErrorMessage = "Main unit name is required")]
//         [StringLength(50, ErrorMessage = "Name cannot exceed 50 characters")]
//         public string Name { get; set; } = string.Empty;


//         [Range(1000, 9999, ErrorMessage = "Unique number must be 4 digits")]
//         public int? UniqueNumber { get; set; }

//         [Required(ErrorMessage = "Company is required")]
//         public Guid CompanyId { get; set; }

//         [ForeignKey("CompanyId")]
//         public virtual CompanyModel.Company? Company { get; set; }

//         public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
//         public DateTime? UpdatedAt { get; set; }
//     }

//     // DTO for MainUnit
//     public class MainUnitDTO
//     {
//         public Guid Id { get; set; }

//         [Required(ErrorMessage = "Main unit name is required")]
//         [StringLength(50, ErrorMessage = "Name cannot exceed 50 characters")]
//         public string Name { get; set; } = string.Empty;

//         public Guid CompanyId { get; set; }
//         public DateTime CreatedAt { get; set; }
//         public DateTime? UpdatedAt { get; set; }
//     }

//     public class CreateMainUnitDTO
//     {
//         [Required(ErrorMessage = "Main unit name is required")]
//         [StringLength(50, ErrorMessage = "Name cannot exceed 50 characters")]
//         public string Name { get; set; } = string.Empty;

//         [Required(ErrorMessage = "Company is required")]
//         public Guid CompanyId { get; set; }
//     }

//     public class UpdateMainUnitDTO
//     {
//         [StringLength(50, ErrorMessage = "Name cannot exceed 50 characters")]
//         public string? Name { get; set; }
//     }
// }

using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkyForge.Models.Retailer.MainUnitModel
{
    public class MainUnit
    {
        [Key]
        public Guid Id { get; set; }

        [Required(ErrorMessage = "Main unit name is required")]
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
