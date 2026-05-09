using SkyForge.Models.Shared;
using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.CompanyDto
{
    public class CreateCompanyDTO
    {
        [Required(ErrorMessage = "Company name is required")]
        [MaxLength(200, ErrorMessage = "Company name cannot exceed 200 characters")]
        public string Name { get; set; } = string.Empty;

        [MaxLength(500, ErrorMessage = "Address cannot exceed 500 characters")]
        public string Address { get; set; } = string.Empty;

        [MaxLength(100, ErrorMessage = "Country cannot exceed 100 characters")]
        public string Country { get; set; } = "Nepal"; // Default like React

        [MaxLength(100, ErrorMessage = "State cannot exceed 100 characters")]
        public string State { get; set; } = string.Empty;

        [MaxLength(100, ErrorMessage = "City cannot exceed 100 characters")]
        public string City { get; set; } = string.Empty;

        [StringLength(9, MinimumLength = 9, ErrorMessage = "PAN must be 9 characters")]
        public string Pan { get; set; } = string.Empty;

        [MaxLength(50, ErrorMessage = "Phone cannot exceed 50 characters")]
        [Phone(ErrorMessage = "Invalid phone number")]
        public string Phone { get; set; } = string.Empty;

        public int? Ward { get; set; }

        [EmailAddress(ErrorMessage = "Invalid email format")]
        [MaxLength(100, ErrorMessage = "Email cannot exceed 100 characters")]
        public string Email { get; set; } = string.Empty;

        // Change from TradeType enum to string to match React
        [Required(ErrorMessage = "Business type is required")]
        public string TradeType { get; set; } = "retailer"; // Default like React

        // Remove OwnerId - will be set from authenticated user
        // public int OwnerId { get; set; }

        // Change DateFormat to string to match React
        [Required(ErrorMessage = "Date format is required")]
        public string DateFormat { get; set; } = "english"; // Default like React

        public bool VatEnabled { get; set; } = false;
        public string? StartDateEnglish { get; set; }
        public string? EndDateEnglish { get; set; }
        public string? StartDateNepali { get; set; }
        public string? EndDateNepali { get; set; }
    }
}