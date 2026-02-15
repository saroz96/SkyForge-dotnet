//using System.Collections.Generic;
//using System.Threading.Tasks;
//using SkyForge.Models.CompanyModel;
//using SkyForge.Models.RoleModel;
//using SkyForge.Models.UserModel;

//namespace SkyForge.Services.UserServices
//{
//    public interface IUserService
//    {
//        // User CRUD
//        Task<User> CreateUserAsync(User user, string password, int? roleId = null);
//        Task<User> GetUserByIdAsync(int id);
//        Task<User> GetUserByEmailAsync(string email);
//        Task<List<User>> GetAllUsersAsync();
//        Task<User> UpdateUserAsync(int id, User user);
//        Task<bool> DeleteUserAsync(int id);

//        // Authentication
//        Task<User> AuthenticateAsync(string email, string password);

//        // Password Management
//        Task<bool> ChangePasswordAsync(int userId, string currentPassword, string newPassword);
//        Task<string> GeneratePasswordResetTokenAsync(string email);
//        Task<bool> ResetPasswordAsync(string token, string newPassword);

//        // Email Verification
//        Task<string> GenerateEmailVerificationTokenAsync(int userId);
//        Task<bool> VerifyEmailAsync(string token);

//        // User Management
//        Task<bool> DeactivateUserAsync(int userId);
//        Task<bool> ActivateUserAsync(int userId);

//        // Role & Permissions
//        Task<UserRole> UpdateUserRoleAsync(int userId, int roleId, bool isPrimary = false);
//        Task<Dictionary<string, bool>> UpdateMenuPermissionsAsync(int userId, Dictionary<string, bool> permissions, int grantedById);
//        Task<bool> HasMenuPermissionAsync(int userId, string menuKey);
//        Task<Dictionary<string, bool>> GetUserPermissionsAsync(int userId);

//        // Company Management
//        Task<bool> AddUserToCompanyAsync(int userId, int companyId);
//        Task<bool> RemoveUserFromCompanyAsync(int userId, int companyId);
//        Task<List<Company>> GetUserCompaniesAsync(int userId);
//        Task<bool> AddCompanyToUserAsync(int userId, int companyId);
//        Task<bool> RemoveCompanyFromUserAsync(int userId, int companyId);
//        Task<bool> UserHasAccessToCompanyAsync(int userId, int companyId);

//        // Preferences
//        Task<User> UpdateUserPreferencesAsync(int userId, UserPreferences preferences);

//        // Utility
//        Task<bool> IsEmailUniqueAsync(string email, int? excludeUserId = null);
//        Task<bool> IsUserActiveAsync(int userId);
//    }
//}
using System.Collections.Generic;
using System.Threading.Tasks;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.RoleModel;
using SkyForge.Models.UserModel;

namespace SkyForge.Services.UserServices
{
    public interface IUserService
    {
        // User CRUD
        Task<User> CreateUserAsync(User user, string password, Guid? roleId = null);
        Task<User> GetUserByIdAsync(Guid id);
        Task<User> GetUserByEmailAsync(string email);
        Task<List<User>> GetAllUsersAsync();
        Task<User> UpdateUserAsync(Guid id, User user);
        Task<bool> DeleteUserAsync(Guid id);

        // Authentication
        Task<User> AuthenticateAsync(string email, string password);

        // Password Management
        Task<bool> ChangePasswordAsync(Guid userId, string currentPassword, string newPassword);
        Task<string> GeneratePasswordResetTokenAsync(string email);
        Task<bool> ResetPasswordAsync(string token, string newPassword);

        // Email Verification
        Task<string> GenerateEmailVerificationTokenAsync(Guid userId);
        Task<bool> VerifyEmailAsync(string token);

        // User Management
        Task<bool> DeactivateUserAsync(Guid userId);
        Task<bool> ActivateUserAsync(Guid userId);

        // Role & Permissions
        Task<UserRole> UpdateUserRoleAsync(Guid userId, Guid roleId, bool isPrimary = false);
        Task<Dictionary<string, bool>> UpdateMenuPermissionsAsync(Guid userId, Dictionary<string, bool> permissions, Guid grantedById);
        Task<bool> HasMenuPermissionAsync(Guid userId, string menuKey);
        Task<Dictionary<string, bool>> GetUserPermissionsAsync(Guid userId);

        // Company Management
        Task<bool> AddUserToCompanyAsync(Guid userId, Guid companyId);
        Task<bool> RemoveUserFromCompanyAsync(Guid userId, Guid companyId);
        Task<List<Company>> GetUserCompaniesAsync(Guid userId);
        Task<bool> AddCompanyToUserAsync(Guid userId, Guid companyId);
        Task<bool> RemoveCompanyFromUserAsync(Guid userId, Guid companyId);
        Task<bool> UserHasAccessToCompanyAsync(Guid userId, Guid companyId);

        // Preferences
        Task<User> UpdateUserPreferencesAsync(Guid userId, UserPreferences preferences);

        // Utility
        Task<bool> IsEmailUniqueAsync(string email, Guid? excludeUserId = null);
        Task<bool> IsUserActiveAsync(Guid userId);
    }
}