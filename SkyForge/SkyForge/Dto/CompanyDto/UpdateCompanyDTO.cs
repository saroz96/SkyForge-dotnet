using SkyForge.Models.CompanyModel;
using SkyForge.Models.Shared;
using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.CompanyDto
{
    public class UpdateCompanyDTO
    {
        [Required(ErrorMessage = "Company name is required")]
        [MaxLength(200, ErrorMessage = "Company name cannot exceed 200 characters")]
        public string Name { get; set; }

        [MaxLength(500, ErrorMessage = "Address cannot exceed 500 characters")]
        public string Address { get; set; }

        [MaxLength(100, ErrorMessage = "Country cannot exceed 100 characters")]
        public string Country { get; set; }

        [MaxLength(100, ErrorMessage = "State cannot exceed 100 characters")]
        public string State { get; set; }

        [MaxLength(100, ErrorMessage = "City cannot exceed 100 characters")]
        public string City { get; set; }

        [StringLength(9, MinimumLength = 9, ErrorMessage = "PAN must be 9 characters")]
        public string Pan { get; set; }

        [MaxLength(50, ErrorMessage = "Phone cannot exceed 50 characters")]
        [Phone(ErrorMessage = "Invalid phone number")]
        public string Phone { get; set; }

        public int? Ward { get; set; }

        [EmailAddress(ErrorMessage = "Invalid email format")]
        [MaxLength(100, ErrorMessage = "Email cannot exceed 100 characters")]
        public string Email { get; set; }

        [Required(ErrorMessage = "Trade type is required")]
        public TradeType TradeType { get; set; }

        public DateFormatEnum? DateFormat { get; set; } = DateFormatEnum.English;

        public bool VatEnabled { get; set; }

        public bool StoreManagement { get; set; }

        [Required(ErrorMessage = "Renewal date is required")]
        public string RenewalDate { get; set; }

        [Required(ErrorMessage = "Fiscal year start date is required")]
        public string FiscalYearStartDate { get; set; }

        public List<string> NotificationEmails { get; set; } = new();

        public CompanyAttendanceSettingsDTO AttendanceSettings { get; set; }
    }
}