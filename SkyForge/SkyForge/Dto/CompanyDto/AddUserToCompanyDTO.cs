//namespace SkyForge.Models.CompanyModel
//{
//    public class AddUserToCompanyDTO
//    {
//    }
//}

using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.CompanyDto
{
    public class AddUserToCompanyDTO
    {
        [Required(ErrorMessage = "User ID is required")]
        public Guid UserId { get; set; }

        [Required(ErrorMessage = "Added by user ID is required")]
        public Guid AddedBy { get; set; }

        public string? Role { get; set; } = "Employee";
    }
}
