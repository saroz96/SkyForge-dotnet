using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.UserDto
{
    public class RegisterRequestDTO
    {
        [Required]
        [MaxLength(200)]
        public string? Name { get; set; }

        [Required]
        [EmailAddress]
        [MaxLength(100)]    
        public string? Email { get; set; }

        [Required]
        [MinLength(6)]
        public string? Password { get; set; }

        [Required]
        [Compare("Password", ErrorMessage = "Passwords do not match")]
        public string? Password2 { get; set; }

        public bool? IsAdmin { get; set; } = false;
    }
}
