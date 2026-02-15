using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.AccountGroupDto
{
    // Create DTO for AccountGroup
    public class CreateAccountGroupDTO
    {
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

        [Required(ErrorMessage = "Company ID is required")]
        public int CompanyId { get; set; }
    }

}
