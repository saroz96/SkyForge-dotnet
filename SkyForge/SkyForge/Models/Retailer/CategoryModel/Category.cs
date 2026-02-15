// using System;
// using System.ComponentModel.DataAnnotations;
// using System.ComponentModel.DataAnnotations.Schema;

// namespace SkyForge.Models.Retailer.CategoryModel
// {
//     public class Category
//     {
//         [Key]
//         public Guid Id { get; set; }

//         [Required(ErrorMessage = "Category name is required")]
//         [StringLength(100, ErrorMessage = "Name cannot exceed 100 characters")]
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

//     // DTO for Category
//     public class CategoryDTO
//     {
//         public Guid Id { get; set; }

//         [Required(ErrorMessage = "Category name is required")]
//         [StringLength(100, ErrorMessage = "Name cannot exceed 100 characters")]
//         public string Name { get; set; } = string.Empty;

//         public Guid CompanyId { get; set; }
//         public DateTime CreatedAt { get; set; }
//         public DateTime? UpdatedAt { get; set; }
//     }

//     public class CreateCategoryDTO
//     {
//         [Required(ErrorMessage = "Category name is required")]
//         [StringLength(100, ErrorMessage = "Name cannot exceed 100 characters")]
//         public string Name { get; set; } = string.Empty;

//         [Required(ErrorMessage = "Company is required")]
//         public Guid CompanyId { get; set; }
//     }

//     public class UpdateCategoryDTO
//     {
//         [StringLength(100, ErrorMessage = "Name cannot exceed 100 characters")]
//         public string? Name { get; set; }
//     }
// }

using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkyForge.Models.Retailer.CategoryModel
{
    public class Category
    {
        [Key]
        public Guid Id { get; set; }

        [Required(ErrorMessage = "Category name is required")]
        [StringLength(100, ErrorMessage = "Name cannot exceed 100 characters")]
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


