using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.AccountGroupDto
{
    public class UpdateAccountGroupDTO
    {
        [StringLength(200, ErrorMessage = "Name cannot exceed 200 characters")]
        public string? Name { get; set; }

        [StringLength(3, MinimumLength = 2, ErrorMessage = "PrimaryGroup must be 'Yes' or 'No'")]
        [RegularExpression("^(Yes|No)$", ErrorMessage = "PrimaryGroup must be 'Yes' or 'No'")]
        public string? PrimaryGroup { get; set; }

        [StringLength(50)]
        public string? Type { get; set; }
    }
}
