using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.AccountGroupDto
{
    public class AccountGroupDTO
    {
        public int Id { get; set; }

        [Required(ErrorMessage = "Account group name is required")]
        [StringLength(200, ErrorMessage = "Name cannot exceed 200 characters")]
        public string Name { get; set; }

        [Required(ErrorMessage = "Primary group field is required")]
        [StringLength(3, MinimumLength = 2, ErrorMessage = "PrimaryGroup must be 'Yes' or 'No'")]
        [RegularExpression("^(Yes|No)$", ErrorMessage = "PrimaryGroup must be 'Yes' or 'No'")]
        public string PrimaryGroup { get; set; }

        [Required(ErrorMessage = "Type is required")]
        [StringLength(50)]
        public string Type { get; set; }

        public int CompanyId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

}
