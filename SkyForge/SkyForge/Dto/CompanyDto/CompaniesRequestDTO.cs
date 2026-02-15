//namespace SkyForge.Models.CompanyModel
//{
//    public class CompaniesRequestDTO
//    {
//    }
//}

using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.CompanyDto
{
    public class CompaniesRequestDTO
    {
        [Required]
        public Guid UserId { get; set; }
    }
}
