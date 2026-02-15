//using System.Collections.Generic;
//using System.Threading.Tasks;
//using SkyForge.Models.RoleModel;

//namespace SkyForge.Services.RoleService
//{
//    public interface IRoleService
//    {
//        Task<Role> CreateRoleAsync(Role role);
//        Task<Role> GetRoleByIdAsync(int id);
//        Task<Role> GetRoleByNameAsync(string name);
//        Task<List<Role>> GetAllRolesAsync();
//        Task<Role> UpdateRoleAsync(int id, Role role);
//        Task<bool> DeleteRoleAsync(int id);

//        // User-Role management
//        Task<UserRole> AssignRoleToUserAsync(int userId, int roleId, int assignedById, bool isPrimary = false);
//        Task<bool> RemoveRoleFromUserAsync(int userId, int roleId);
//        Task<List<UserRole>> GetUserRolesAsync(int userId);
//        Task<UserRole> GetUserPrimaryRoleAsync(int userId);
//        Task<bool> SetUserPrimaryRoleAsync(int userId, int roleId);

//        // Permissions
//        Task<Dictionary<string, bool>> GetEffectivePermissionsAsync(int userId);
//        Task<bool> HasPermissionAsync(int userId, string permissionKey);

//        // Seed default roles
//        Task SeedDefaultRolesAsync();
//    }
//}

using System.Collections.Generic;
using System.Threading.Tasks;
using SkyForge.Models.RoleModel;

namespace SkyForge.Services.RoleService
{
    public interface IRoleService
    {
        Task<Role> CreateRoleAsync(Role role);
        Task<Role> GetRoleByIdAsync(Guid id);
        Task<Role> GetRoleByNameAsync(string name);
        Task<List<Role>> GetAllRolesAsync();
        Task<Role> UpdateRoleAsync(Guid id, Role role);
        Task<bool> DeleteRoleAsync(Guid id);

        // User-Role management
        Task<UserRole> AssignRoleToUserAsync(Guid userId, Guid roleId, Guid assignedById, bool isPrimary = false);
        Task<bool> RemoveRoleFromUserAsync(Guid userId, Guid roleId);
        Task<List<UserRole>> GetUserRolesAsync(Guid userId);
        Task<UserRole> GetUserPrimaryRoleAsync(Guid userId);
        Task<bool> SetUserPrimaryRoleAsync(Guid userId, Guid roleId);

        // Permissions
        Task<Dictionary<string, bool>> GetEffectivePermissionsAsync(Guid userId);
        Task<bool> HasPermissionAsync(Guid userId, string permissionKey);

        // Seed default roles
        Task SeedDefaultRolesAsync();
    }
}