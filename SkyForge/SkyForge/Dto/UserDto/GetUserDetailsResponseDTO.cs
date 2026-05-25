// DTOs/UserDto/GetUserDetailsResponseDTO.cs
using SkyForge.Dto.RetailerDto;

namespace SkyForge.Dto.UserDto
{
    public class GetUserDetailsResponseDTO
    {
        public bool Success { get; set; }
        public UserDetailsDataDTO? Data { get; set; }
        public string? Error { get; set; }
    }

    public class UserDetailsDataDTO
    {
        public CompanyInfoDTO? Company { get; set; }
        public FiscalYearDTO? CurrentFiscalYear { get; set; }
        public UserInfoDTO? User { get; set; }
        public string? CurrentCompanyName { get; set; }
        public bool IsAdminOrSupervisor { get; set; }
    }

    public class UserListItemDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
        public string Role { get; set; }
        public bool IsActive { get; set; }
        public bool IsEmailVerified { get; set; }
        public bool IsOwner { get; set; }
        public UserPreferencesDTO Preferences { get; set; }
        public DateTime? LastLogin { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}