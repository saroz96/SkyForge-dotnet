//using System;
//using System.Collections.Generic;
//using System.Linq;
//using System.Threading.Tasks;
//using Microsoft.EntityFrameworkCore;
//using SkyForge.Data;
//using SkyForge.Models.RoleModel;

//namespace SkyForge.Services.RoleService
//{
//    public class RoleService : IRoleService
//    {
//        private readonly ApplicationDbContext _context;

//        public RoleService(ApplicationDbContext context)
//        {
//            _context = context;
//        }

//        public async Task<Role> CreateRoleAsync(Role role)
//        {
//            // Check if role name already exists
//            if (await _context.Roles.AnyAsync(r => r.Name == role.Name))
//                throw new Exception($"Role '{role.Name}' already exists");

//            role.CreatedAt = DateTime.UtcNow;
//            role.UpdatedAt = DateTime.UtcNow;

//            _context.Roles.Add(role);
//            await _context.SaveChangesAsync();

//            return role;
//        }

//        public async Task<Role?> GetRoleByIdAsync(int id)
//        {
//            return await _context.Roles.FindAsync(id);
//        }

//        public async Task<Role?> GetRoleByNameAsync(string name)
//        {
//            return await _context.Roles.FirstOrDefaultAsync(r => r.Name == name);
//        }

//        public async Task<List<Role>> GetAllRolesAsync()
//        {
//            return await _context.Roles
//                .Where(r => r.IsActive && r.IsAssignable)
//                .OrderBy(r => r.PermissionLevel)
//                .ThenBy(r => r.Name)
//                .ToListAsync();
//        }

//        public async Task<Role?> UpdateRoleAsync(int id, Role role)
//        {
//            var existingRole = await GetRoleByIdAsync(id);
//            if (existingRole == null)
//                throw new Exception("Role not found");

//            // Check if new name conflicts with other roles
//            if (existingRole.Name != role.Name &&
//                await _context.Roles.AnyAsync(r => r.Name == role.Name && r.Id != id))
//                throw new Exception($"Role name '{role.Name}' already exists");

//            existingRole.Name = role.Name;
//            existingRole.Description = role.Description;
//            existingRole.Type = role.Type;
//            existingRole.PermissionLevel = role.PermissionLevel;
//            existingRole.DefaultPermissions = role.DefaultPermissions;
//            existingRole.IsSystemRole = role.IsSystemRole;
//            existingRole.IsAssignable = role.IsAssignable;
//            existingRole.IsActive = role.IsActive;
//            existingRole.UpdatedAt = DateTime.UtcNow;

//            await _context.SaveChangesAsync();
//            return existingRole;
//        }

//        public async Task<bool> DeleteRoleAsync(int id)
//        {
//            var role = await GetRoleByIdAsync(id);
//            if (role == null)
//                return false;

//            if (role.IsSystemRole)
//                throw new Exception("Cannot delete system role");

//            // Check if role is assigned to any users
//            var hasUsers = await _context.UserRoles.AnyAsync(ur => ur.RoleId == id);
//            if (hasUsers)
//                throw new Exception("Cannot delete role that is assigned to users");

//            role.IsActive = false;
//            role.UpdatedAt = DateTime.UtcNow;

//            await _context.SaveChangesAsync();
//            return true;
//        }

//        public async Task<UserRole> AssignRoleToUserAsync(int userId, int roleId, int assignedById, bool isPrimary = false)
//        {
//            var user = await _context.Users.FindAsync(userId);
//            var role = await _context.Roles.FindAsync(roleId);

//            if (user == null || role == null)
//                throw new Exception("User or Role not found");

//            // Check if user already has this role
//            var existingUserRole = await _context.UserRoles
//                .FirstOrDefaultAsync(ur => ur.UserId == userId && ur.RoleId == roleId);

//            if (existingUserRole != null)
//                throw new Exception($"User already has role '{role.Name}'");

//            // If this is to be primary, remove primary from other roles
//            if (isPrimary)
//            {
//                var currentPrimary = await _context.UserRoles
//                    .Where(ur => ur.UserId == userId && ur.IsPrimary)
//                    .ToListAsync();

//                foreach (var ur in currentPrimary)
//                {
//                    ur.IsPrimary = false;
//                    ur.UpdatedAt = DateTime.UtcNow;
//                }
//            }

//            var userRole = new UserRole
//            {
//                UserId = userId,
//                RoleId = roleId,
//                AssignedById = assignedById,
//                IsPrimary = isPrimary,
//                AssignedAt = DateTime.UtcNow,
//                CreatedAt = DateTime.UtcNow,
//                UpdatedAt = DateTime.UtcNow
//            };

//            _context.UserRoles.Add(userRole);
//            await _context.SaveChangesAsync();

//            return userRole;
//        }

//        public async Task<bool> RemoveRoleFromUserAsync(int userId, int roleId)
//        {
//            var userRole = await _context.UserRoles
//                .FirstOrDefaultAsync(ur => ur.UserId == userId && ur.RoleId == roleId);

//            if (userRole == null)
//                return false;

//            _context.UserRoles.Remove(userRole);
//            await _context.SaveChangesAsync();
//            return true;
//        }

//        public async Task<List<UserRole>> GetUserRolesAsync(int userId)
//        {
//            return await _context.UserRoles
//                .Include(ur => ur.Role)
//                .Where(ur => ur.UserId == userId &&
//                           (ur.ExpiresAt == null || ur.ExpiresAt > DateTime.UtcNow))
//                .ToListAsync();
//        }

//        public async Task<UserRole?> GetUserPrimaryRoleAsync(int userId)
//        {
//            return await _context.UserRoles
//                .Include(ur => ur.Role)
//                .FirstOrDefaultAsync(ur => ur.UserId == userId && ur.IsPrimary);
//        }

//        public async Task<bool> SetUserPrimaryRoleAsync(int userId, int roleId)
//        {
//            // Remove primary from all current roles
//            var currentPrimary = await _context.UserRoles
//                .Where(ur => ur.UserId == userId && ur.IsPrimary)
//                .ToListAsync();

//            foreach (var ur in currentPrimary)
//            {
//                ur.IsPrimary = false;
//                ur.UpdatedAt = DateTime.UtcNow;
//            }

//            // Set new primary
//            var newPrimary = await _context.UserRoles
//                .FirstOrDefaultAsync(ur => ur.UserId == userId && ur.RoleId == roleId);

//            if (newPrimary == null)
//                return false;

//            newPrimary.IsPrimary = true;
//            newPrimary.UpdatedAt = DateTime.UtcNow;

//            await _context.SaveChangesAsync();
//            return true;
//        }

//        public async Task<Dictionary<string, bool>> GetEffectivePermissionsAsync(int userId)
//        {
//            var userRoles = await _context.UserRoles
//                .Include(ur => ur.Role)
//                .Where(ur => ur.UserId == userId &&
//                           (ur.ExpiresAt == null || ur.ExpiresAt > DateTime.UtcNow))
//                .ToListAsync();

//            var permissions = new Dictionary<string, bool>();

//            // Start with default permissions
//            var defaultPermissions = GetDefaultMenuPermissions();
//            foreach (var perm in defaultPermissions)
//            {
//                permissions[perm.Key] = perm.Value;
//            }

//            // Apply role permissions (role with highest permission level wins)
//            foreach (var userRole in userRoles.OrderByDescending(ur => ur.Role.PermissionLevel))
//            {
//                // Apply role's default permissions
//                if (userRole.Role.DefaultPermissions != null)
//                {
//                    foreach (var perm in userRole.Role.DefaultPermissions)
//                    {
//                        permissions[perm.Key] = perm.Value;
//                    }
//                }

//                // Apply custom permissions override if exists
//                if (userRole.CustomPermissions != null)
//                {
//                    foreach (var perm in userRole.CustomPermissions)
//                    {
//                        permissions[perm.Key] = perm.Value;
//                    }
//                }
//            }

//            return permissions;
//        }

//        public async Task<bool> HasPermissionAsync(int userId, string permissionKey)
//        {
//            var permissions = await GetEffectivePermissionsAsync(userId);
//            return permissions.TryGetValue(permissionKey, out bool hasPermission) && hasPermission;
//        }

//        public async Task SeedDefaultRolesAsync()
//        {
//            var defaultRoles = new List<Role>
//            {
//                new Role
//                {
//                    Name = "ADMINISTRATOR",
//                    Description = "Full system administrator with all permissions",
//                    Type = RoleType.System,
//                    PermissionLevel = 100,
//                    IsSystemRole = true,
//                    IsAssignable = true,
//                    IsActive = true,
//                    DefaultPermissions = GetAdminPermissions()
//                },
//                new Role
//                {
//                    Name = "Admin",
//                    Description = "Administrator with management permissions",
//                    Type = RoleType.System,
//                    PermissionLevel = 90,
//                    IsSystemRole = true,
//                    IsAssignable = true,
//                    IsActive = true,
//                    DefaultPermissions = GetAdminPermissions()
//                },
//                new Role
//                {
//                    Name = "Account",
//                    Description = "Account department role",
//                    Type = RoleType.Department,
//                    PermissionLevel = 80,
//                    IsSystemRole = true,
//                    IsAssignable = true,
//                    IsActive = true,
//                    DefaultPermissions = GetAccountPermissions()
//                },
//                new Role
//                {
//                    Name = "Sales",
//                    Description = "Sales department role",
//                    Type = RoleType.Department,
//                    PermissionLevel = 70,
//                    IsSystemRole = true,
//                    IsAssignable = true,
//                    IsActive = true,
//                    DefaultPermissions = GetSalesPermissions()
//                },
//                new Role
//                {
//                    Name = "Purchase",
//                    Description = "Purchase department role",
//                    Type = RoleType.Department,
//                    PermissionLevel = 70,
//                    IsSystemRole = true,
//                    IsAssignable = true,
//                    IsActive = true,
//                    DefaultPermissions = GetPurchasePermissions()
//                },
//                new Role
//                {
//                    Name = "Supervisor",
//                    Description = "Supervisor role with oversight permissions",
//                    Type = RoleType.Custom,
//                    PermissionLevel = 85,
//                    IsSystemRole = true,
//                    IsAssignable = true,
//                    IsActive = true,
//                    DefaultPermissions = GetSupervisorPermissions()
//                },
//                new Role
//                {
//                    Name = "User",
//                    Description = "Basic user role",
//                    Type = RoleType.Custom,
//                    PermissionLevel = 50,
//                    IsSystemRole = true,
//                    IsAssignable = true,
//                    IsActive = true,
//                    DefaultPermissions = GetUserPermissions()
//                }
//            };

//            foreach (var role in defaultRoles)
//            {
//                if (!await _context.Roles.AnyAsync(r => r.Name == role.Name))
//                {
//                    role.CreatedAt = DateTime.UtcNow;
//                    _context.Roles.Add(role);
//                }
//            }

//            await _context.SaveChangesAsync();
//        }

//        private Dictionary<string, bool> GetAdminPermissions()
//        {
//            var permissions = GetDefaultMenuPermissions();
//            foreach (var key in permissions.Keys.ToList())
//            {
//                permissions[key] = true;
//            }
//            return permissions;
//        }

//        private Dictionary<string, bool> GetDefaultMenuPermissions()
//        {
//            return new Dictionary<string, bool>
//            {
//                ["dashboard"] = true,
//                ["accountsHeader"] = false,
//                ["account"] = false,
//                ["accountGroup"] = false,
//                ["itemsHeader"] = false,
//                ["createItem"] = false,
//                ["category"] = false,
//                ["company"] = false,
//                ["unit"] = false,
//                ["mainUnit"] = false,
//                ["composition"] = false,
//                ["salesQuotation"] = false,
//                ["salesDepartment"] = false,
//                ["creditSales"] = false,
//                ["creditSalesModify"] = false,
//                ["cashSales"] = false,
//                ["cashSalesModify"] = false,
//                ["salesRegister"] = false,
//                ["creditSalesRtn"] = false,
//                ["cashSalesRtn"] = false,
//                ["salesRtnRegister"] = false,
//                ["purchaseDepartment"] = false,
//                ["createPurchase"] = false,
//                ["purchaseModify"] = false,
//                ["purchaseRegister"] = false,
//                ["createPurchaseRtn"] = false,
//                ["purchaseRtnModify"] = false,
//                ["purchaseRtnRegister"] = false,
//                ["accountDepartment"] = false,
//                ["payment"] = false,
//                ["paymentModify"] = false,
//                ["paymentRegister"] = false,
//                ["receipt"] = false,
//                ["receiptModify"] = false,
//                ["receiptRegister"] = false,
//                ["journal"] = false,
//                ["journalModify"] = false,
//                ["journalRegister"] = false,
//                ["debitNote"] = false,
//                ["debitNoteModify"] = false,
//                ["debitNoteRegister"] = false,
//                ["creditNote"] = false,
//                ["creditNoteModify"] = false,
//                ["creditNoteRegister"] = false,
//                ["inventoryHeader"] = false,
//                ["itemLedger"] = false,
//                ["createStockAdj"] = false,
//                ["stockAdjRegister"] = false,
//                ["storeRackSubHeader"] = false,
//                ["store"] = false,
//                ["rack"] = false,
//                ["stockStatus"] = false,
//                ["reorderLevel"] = false,
//                ["itemSalesReport"] = false,
//                ["outstandingHeader"] = false,
//                ["ageingSubHeader"] = false,
//                ["ageingFIFO"] = false,
//                ["ageingDayWise"] = false,
//                ["ageingAllParty"] = false,
//                ["statements"] = false,
//                ["reportsSubHeader"] = false,
//                ["dailyProfitSaleAnalysis"] = false,
//                ["invoiceWiseProfitLoss"] = false,
//                ["vatSummaryHeader"] = false,
//                ["salesVatRegister"] = false,
//                ["salesRtnVatRegister"] = false,
//                ["purchaseVatRegister"] = false,
//                ["purchaseRtnVatRegister"] = false,
//                ["monthlyVatSummary"] = false,
//                ["configurationHeader"] = false,
//                ["voucherConfiguration"] = false,
//                ["changeFiscalYear"] = false,
//                ["existingFiscalYear"] = false,
//                ["importExportSubHeader"] = false,
//                ["itemsImport"] = false,
//                ["attendance"] = false
//            };
//        }

//        private Dictionary<string, bool> GetAccountPermissions()
//        {
//            var permissions = GetDefaultMenuPermissions();
//            // Enable account-related permissions
//            permissions["accountsHeader"] = true;
//            permissions["account"] = true;
//            permissions["accountGroup"] = true;
//            permissions["accountDepartment"] = true;
//            permissions["payment"] = true;
//            permissions["receipt"] = true;
//            permissions["journal"] = true;
//            permissions["debitNote"] = true;
//            permissions["creditNote"] = true;
//            permissions["outstandingHeader"] = true;
//            permissions["ageingSubHeader"] = true;
//            permissions["ageingFIFO"] = true;
//            permissions["ageingDayWise"] = true;
//            permissions["ageingAllParty"] = true;
//            permissions["statements"] = true;
//            permissions["reportsSubHeader"] = true;
//            permissions["dailyProfitSaleAnalysis"] = true;
//            permissions["invoiceWiseProfitLoss"] = true;
//            permissions["vatSummaryHeader"] = true;
//            permissions["salesVatRegister"] = true;
//            permissions["salesRtnVatRegister"] = true;
//            permissions["purchaseVatRegister"] = true;
//            permissions["purchaseRtnVatRegister"] = true;
//            permissions["monthlyVatSummary"] = true;
//            return permissions;
//        }

//        private Dictionary<string, bool> GetSalesPermissions()
//        {
//            var permissions = GetDefaultMenuPermissions();
//            permissions["salesQuotation"] = true;
//            permissions["salesDepartment"] = true;
//            permissions["creditSales"] = true;
//            permissions["cashSales"] = true;
//            permissions["salesRegister"] = true;
//            permissions["creditSalesRtn"] = true;
//            permissions["cashSalesRtn"] = true;
//            permissions["salesRtnRegister"] = true;
//            return permissions;
//        }

//        private Dictionary<string, bool> GetPurchasePermissions()
//        {
//            var permissions = GetDefaultMenuPermissions();
//            permissions["purchaseDepartment"] = true;
//            permissions["createPurchase"] = true;
//            permissions["purchaseRegister"] = true;
//            permissions["createPurchaseRtn"] = true;
//            permissions["purchaseRtnRegister"] = true;
//            return permissions;
//        }

//        private Dictionary<string, bool> GetSupervisorPermissions()
//        {
//            var permissions = GetDefaultMenuPermissions();
//            // Supervisor can view most things but not modify
//            permissions["dashboard"] = true;
//            permissions["salesRegister"] = true;
//            permissions["purchaseRegister"] = true;
//            permissions["paymentRegister"] = true;
//            permissions["receiptRegister"] = true;
//            permissions["journalRegister"] = true;
//            permissions["stockAdjRegister"] = true;
//            permissions["itemLedger"] = true;
//            permissions["stockStatus"] = true;
//            permissions["reorderLevel"] = true;
//            permissions["itemSalesReport"] = true;
//            permissions["outstandingHeader"] = true;
//            permissions["ageingSubHeader"] = true;
//            permissions["ageingFIFO"] = true;
//            permissions["ageingDayWise"] = true;
//            permissions["ageingAllParty"] = true;
//            permissions["statements"] = true;
//            permissions["reportsSubHeader"] = true;
//            permissions["dailyProfitSaleAnalysis"] = true;
//            permissions["invoiceWiseProfitLoss"] = true;
//            return permissions;
//        }

//        private Dictionary<string, bool> GetUserPermissions()
//        {
//            var permissions = GetDefaultMenuPermissions();
//            permissions["dashboard"] = true;
//            permissions["attendance"] = true;
//            return permissions;
//        }
//    }
//}

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Models.RoleModel;

namespace SkyForge.Services.RoleService
{
    public class RoleService : IRoleService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<RoleService> _logger;

        public RoleService(ApplicationDbContext context, ILogger<RoleService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<Role> CreateRoleAsync(Role role)
        {
            try
            {
                // Check if role name already exists
                if (await _context.Roles.AnyAsync(r => r.Name == role.Name))
                    throw new Exception($"Role '{role.Name}' already exists");

                role.CreatedAt = DateTime.UtcNow;
                role.UpdatedAt = DateTime.UtcNow;

                _context.Roles.Add(role);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Role '{RoleName}' created with ID {RoleId}", role.Name, role.Id);
                return role;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating role '{RoleName}'", role.Name);
                throw;
            }
        }

        public async Task<Role> GetRoleByIdAsync(Guid id)
        {
            try
            {
                var role = await _context.Roles.FindAsync(id);
                if (role == null)
                {
                    _logger.LogWarning("Role {RoleId} not found", id);
                }
                return role;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting role {RoleId}", id);
                throw;
            }
        }

        public async Task<Role> GetRoleByNameAsync(string name)
        {
            try
            {
                var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == name);
                if (role == null)
                {
                    _logger.LogDebug("Role '{RoleName}' not found", name);
                }
                return role;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting role '{RoleName}'", name);
                throw;
            }
        }

        public async Task<List<Role>> GetAllRolesAsync()
        {
            try
            {
                var roles = await _context.Roles
                    .Where(r => r.IsActive && r.IsAssignable)
                    .OrderBy(r => r.PermissionLevel)
                    .ThenBy(r => r.Name)
                    .ToListAsync();

                _logger.LogInformation("Retrieved {Count} active roles", roles.Count);
                return roles;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all roles");
                throw;
            }
        }

        public async Task<Role> UpdateRoleAsync(Guid id, Role role)
        {
            try
            {
                var existingRole = await GetRoleByIdAsync(id);
                if (existingRole == null)
                    throw new Exception("Role not found");

                // Check if new name conflicts with other roles
                if (existingRole.Name != role.Name &&
                    await _context.Roles.AnyAsync(r => r.Name == role.Name && r.Id != id))
                    throw new Exception($"Role name '{role.Name}' already exists");

                existingRole.Name = role.Name;
                existingRole.Description = role.Description;
                existingRole.Type = role.Type;
                existingRole.PermissionLevel = role.PermissionLevel;
                existingRole.DefaultPermissions = role.DefaultPermissions;
                existingRole.IsSystemRole = role.IsSystemRole;
                existingRole.IsAssignable = role.IsAssignable;
                existingRole.IsActive = role.IsActive;
                existingRole.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Role {RoleId} '{RoleName}' updated", id, existingRole.Name);
                return existingRole;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating role {RoleId}", id);
                throw;
            }
        }

        public async Task<bool> DeleteRoleAsync(Guid id)
        {
            try
            {
                var role = await GetRoleByIdAsync(id);
                if (role == null)
                    return false;

                if (role.IsSystemRole)
                    throw new Exception("Cannot delete system role");

                // Check if role is assigned to any users
                var hasUsers = await _context.UserRoles.AnyAsync(ur => ur.RoleId == id);
                if (hasUsers)
                    throw new Exception("Cannot delete role that is assigned to users");

                role.IsActive = false;
                role.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Role {RoleId} '{RoleName}' marked as inactive", id, role.Name);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting role {RoleId}", id);
                throw;
            }
        }

        public async Task<UserRole> AssignRoleToUserAsync(Guid userId, Guid roleId, Guid assignedById, bool isPrimary = false)
        {
            try
            {
                var user = await _context.Users.FindAsync(userId);
                var role = await _context.Roles.FindAsync(roleId);

                if (user == null || role == null)
                    throw new Exception("User or Role not found");

                // Check if user already has this role
                var existingUserRole = await _context.UserRoles
                    .FirstOrDefaultAsync(ur => ur.UserId == userId && ur.RoleId == roleId);

                if (existingUserRole != null)
                    throw new Exception($"User already has role '{role.Name}'");

                // If this is to be primary, remove primary from other roles
                if (isPrimary)
                {
                    var currentPrimary = await _context.UserRoles
                        .Where(ur => ur.UserId == userId && ur.IsPrimary)
                        .ToListAsync();

                    foreach (var ur in currentPrimary)
                    {
                        ur.IsPrimary = false;
                        ur.UpdatedAt = DateTime.UtcNow;
                    }
                }

                var userRole = new UserRole
                {
                    UserId = userId,
                    RoleId = roleId,
                    AssignedById = assignedById,
                    IsPrimary = isPrimary,
                    AssignedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.UserRoles.Add(userRole);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Role '{RoleName}' assigned to user {UserId} by {AssignedById}",
                    role.Name, userId, assignedById);

                return userRole;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error assigning role {RoleId} to user {UserId}", roleId, userId);
                throw;
            }
        }

        public async Task<bool> RemoveRoleFromUserAsync(Guid userId, Guid roleId)
        {
            try
            {
                var userRole = await _context.UserRoles
                    .FirstOrDefaultAsync(ur => ur.UserId == userId && ur.RoleId == roleId);

                if (userRole == null)
                    return false;

                // Check if this is the primary role
                if (userRole.IsPrimary)
                {
                    throw new Exception("Cannot remove primary role. Set another role as primary first.");
                }

                _context.UserRoles.Remove(userRole);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Role {RoleId} removed from user {UserId}", roleId, userId);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing role {RoleId} from user {UserId}", roleId, userId);
                throw;
            }
        }

        public async Task<List<UserRole>> GetUserRolesAsync(Guid userId)
        {
            try
            {
                var userRoles = await _context.UserRoles
                    .Include(ur => ur.Role)
                    .Where(ur => ur.UserId == userId &&
                               (ur.ExpiresAt == null || ur.ExpiresAt > DateTime.UtcNow))
                    .ToListAsync();

                _logger.LogDebug("Retrieved {Count} roles for user {UserId}", userRoles.Count, userId);
                return userRoles;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting roles for user {UserId}", userId);
                throw;
            }
        }

        public async Task<UserRole> GetUserPrimaryRoleAsync(Guid userId)
        {
            try
            {
                var primaryRole = await _context.UserRoles
                    .Include(ur => ur.Role)
                    .FirstOrDefaultAsync(ur => ur.UserId == userId && ur.IsPrimary);

                if (primaryRole == null)
                {
                    _logger.LogDebug("No primary role found for user {UserId}", userId);
                }

                return primaryRole;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting primary role for user {UserId}", userId);
                throw;
            }
        }

        public async Task<bool> SetUserPrimaryRoleAsync(Guid userId, Guid roleId)
        {
            try
            {
                // Check if the user has the role
                var userRole = await _context.UserRoles
                    .FirstOrDefaultAsync(ur => ur.UserId == userId && ur.RoleId == roleId);

                if (userRole == null)
                {
                    throw new Exception($"User does not have role {roleId}");
                }

                // Remove primary from all current roles
                var currentPrimary = await _context.UserRoles
                    .Where(ur => ur.UserId == userId && ur.IsPrimary)
                    .ToListAsync();

                foreach (var ur in currentPrimary)
                {
                    ur.IsPrimary = false;
                    ur.UpdatedAt = DateTime.UtcNow;
                }

                // Set new primary
                userRole.IsPrimary = true;
                userRole.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Primary role set to {RoleId} for user {UserId}", roleId, userId);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error setting primary role {RoleId} for user {UserId}", roleId, userId);
                throw;
            }
        }

        public async Task<Dictionary<string, bool>> GetEffectivePermissionsAsync(Guid userId)
        {
            try
            {
                var userRoles = await _context.UserRoles
                    .Include(ur => ur.Role)
                    .Where(ur => ur.UserId == userId &&
                               (ur.ExpiresAt == null || ur.ExpiresAt > DateTime.UtcNow))
                    .ToListAsync();

                var permissions = new Dictionary<string, bool>();

                // Start with default permissions
                var defaultPermissions = GetDefaultMenuPermissions();
                foreach (var perm in defaultPermissions)
                {
                    permissions[perm.Key] = perm.Value;
                }

                // Apply role permissions (role with highest permission level wins)
                foreach (var userRole in userRoles.OrderByDescending(ur => ur.Role.PermissionLevel))
                {
                    // Apply role's default permissions
                    if (userRole.Role.DefaultPermissions != null)
                    {
                        foreach (var perm in userRole.Role.DefaultPermissions)
                        {
                            permissions[perm.Key] = perm.Value;
                        }
                    }

                    // Apply custom permissions override if exists
                    if (userRole.CustomPermissions != null)
                    {
                        foreach (var perm in userRole.CustomPermissions)
                        {
                            permissions[perm.Key] = perm.Value;
                        }
                    }
                }

                _logger.LogDebug("Retrieved effective permissions for user {UserId} ({Count} permissions)",
                    userId, permissions.Count);

                return permissions;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting effective permissions for user {UserId}", userId);
                throw;
            }
        }

        public async Task<bool> HasPermissionAsync(Guid userId, string permissionKey)
        {
            try
            {
                var permissions = await GetEffectivePermissionsAsync(userId);
                var hasPermission = permissions.TryGetValue(permissionKey, out bool hasPerm) && hasPerm;

                _logger.LogDebug("Permission check for user {UserId}, key '{PermissionKey}': {HasPermission}",
                    userId, permissionKey, hasPermission);

                return hasPermission;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking permission '{PermissionKey}' for user {UserId}",
                    permissionKey, userId);
                throw;
            }
        }

        public async Task SeedDefaultRolesAsync()
        {
            try
            {
                _logger.LogInformation("Seeding default roles...");

                var defaultRoles = new List<Role>
                {
                    new Role
                    {
                        Name = "ADMINISTRATOR",
                        Description = "Full system administrator with all permissions",
                        Type = RoleType.System,
                        PermissionLevel = 100,
                        IsSystemRole = true,
                        IsAssignable = true,
                        IsActive = true,
                        DefaultPermissions = GetAdminPermissions()
                    },
                    new Role
                    {
                        Name = "Admin",
                        Description = "Administrator with management permissions",
                        Type = RoleType.System,
                        PermissionLevel = 90,
                        IsSystemRole = true,
                        IsAssignable = true,
                        IsActive = true,
                        DefaultPermissions = GetAdminPermissions()
                    },
                    new Role
                    {
                        Name = "Account",
                        Description = "Account department role",
                        Type = RoleType.Department,
                        PermissionLevel = 80,
                        IsSystemRole = true,
                        IsAssignable = true,
                        IsActive = true,
                        DefaultPermissions = GetAccountPermissions()
                    },
                    new Role
                    {
                        Name = "Sales",
                        Description = "Sales department role",
                        Type = RoleType.Department,
                        PermissionLevel = 70,
                        IsSystemRole = true,
                        IsAssignable = true,
                        IsActive = true,
                        DefaultPermissions = GetSalesPermissions()
                    },
                    new Role
                    {
                        Name = "Purchase",
                        Description = "Purchase department role",
                        Type = RoleType.Department,
                        PermissionLevel = 70,
                        IsSystemRole = true,
                        IsAssignable = true,
                        IsActive = true,
                        DefaultPermissions = GetPurchasePermissions()
                    },
                    new Role
                    {
                        Name = "Supervisor",
                        Description = "Supervisor role with oversight permissions",
                        Type = RoleType.Custom,
                        PermissionLevel = 85,
                        IsSystemRole = true,
                        IsAssignable = true,
                        IsActive = true,
                        DefaultPermissions = GetSupervisorPermissions()
                    },
                    new Role
                    {
                        Name = "User",
                        Description = "Basic user role",
                        Type = RoleType.Custom,
                        PermissionLevel = 50,
                        IsSystemRole = true,
                        IsAssignable = true,
                        IsActive = true,
                        DefaultPermissions = GetUserPermissions()
                    }
                };

                int addedCount = 0;
                foreach (var role in defaultRoles)
                {
                    if (!await _context.Roles.AnyAsync(r => r.Name == role.Name))
                    {
                        role.CreatedAt = DateTime.UtcNow;
                        _context.Roles.Add(role);
                        addedCount++;
                    }
                }

                if (addedCount > 0)
                {
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Successfully seeded {Count} default roles", addedCount);
                }
                else
                {
                    _logger.LogInformation("All default roles already exist");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error seeding default roles");
                throw;
            }
        }

        private Dictionary<string, bool> GetAdminPermissions()
        {
            var permissions = GetDefaultMenuPermissions();
            foreach (var key in permissions.Keys.ToList())
            {
                permissions[key] = true;
            }
            return permissions;
        }

        private Dictionary<string, bool> GetDefaultMenuPermissions()
        {
            return new Dictionary<string, bool>
            {
                ["dashboard"] = true,
                ["accountsHeader"] = false,
                ["account"] = false,
                ["accountGroup"] = false,
                ["itemsHeader"] = false,
                ["createItem"] = false,
                ["category"] = false,
                ["company"] = false,
                ["unit"] = false,
                ["mainUnit"] = false,
                ["composition"] = false,
                ["salesQuotation"] = false,
                ["salesDepartment"] = false,
                ["creditSales"] = false,
                ["creditSalesModify"] = false,
                ["cashSales"] = false,
                ["cashSalesModify"] = false,
                ["salesRegister"] = false,
                ["creditSalesRtn"] = false,
                ["cashSalesRtn"] = false,
                ["salesRtnRegister"] = false,
                ["purchaseDepartment"] = false,
                ["createPurchase"] = false,
                ["purchaseModify"] = false,
                ["purchaseRegister"] = false,
                ["createPurchaseRtn"] = false,
                ["purchaseRtnModify"] = false,
                ["purchaseRtnRegister"] = false,
                ["accountDepartment"] = false,
                ["payment"] = false,
                ["paymentModify"] = false,
                ["paymentRegister"] = false,
                ["receipt"] = false,
                ["receiptModify"] = false,
                ["receiptRegister"] = false,
                ["journal"] = false,
                ["journalModify"] = false,
                ["journalRegister"] = false,
                ["debitNote"] = false,
                ["debitNoteModify"] = false,
                ["debitNoteRegister"] = false,
                ["creditNote"] = false,
                ["creditNoteModify"] = false,
                ["creditNoteRegister"] = false,
                ["inventoryHeader"] = false,
                ["itemLedger"] = false,
                ["createStockAdj"] = false,
                ["stockAdjRegister"] = false,
                ["storeRackSubHeader"] = false,
                ["store"] = false,
                ["rack"] = false,
                ["stockStatus"] = false,
                ["reorderLevel"] = false,
                ["itemSalesReport"] = false,
                ["outstandingHeader"] = false,
                ["ageingSubHeader"] = false,
                ["ageingFIFO"] = false,
                ["ageingDayWise"] = false,
                ["ageingAllParty"] = false,
                ["statements"] = false,
                ["reportsSubHeader"] = false,
                ["dailyProfitSaleAnalysis"] = false,
                ["invoiceWiseProfitLoss"] = false,
                ["vatSummaryHeader"] = false,
                ["salesVatRegister"] = false,
                ["salesRtnVatRegister"] = false,
                ["purchaseVatRegister"] = false,
                ["purchaseRtnVatRegister"] = false,
                ["monthlyVatSummary"] = false,
                ["configurationHeader"] = false,
                ["voucherConfiguration"] = false,
                ["changeFiscalYear"] = false,
                ["existingFiscalYear"] = false,
                ["importExportSubHeader"] = false,
                ["itemsImport"] = false,
                ["attendance"] = false
            };
        }

        private Dictionary<string, bool> GetAccountPermissions()
        {
            var permissions = GetDefaultMenuPermissions();
            // Enable account-related permissions
            permissions["accountsHeader"] = true;
            permissions["account"] = true;
            permissions["accountGroup"] = true;
            permissions["accountDepartment"] = true;
            permissions["payment"] = true;
            permissions["receipt"] = true;
            permissions["journal"] = true;
            permissions["debitNote"] = true;
            permissions["creditNote"] = true;
            permissions["outstandingHeader"] = true;
            permissions["ageingSubHeader"] = true;
            permissions["ageingFIFO"] = true;
            permissions["ageingDayWise"] = true;
            permissions["ageingAllParty"] = true;
            permissions["statements"] = true;
            permissions["reportsSubHeader"] = true;
            permissions["dailyProfitSaleAnalysis"] = true;
            permissions["invoiceWiseProfitLoss"] = true;
            permissions["vatSummaryHeader"] = true;
            permissions["salesVatRegister"] = true;
            permissions["salesRtnVatRegister"] = true;
            permissions["purchaseVatRegister"] = true;
            permissions["purchaseRtnVatRegister"] = true;
            permissions["monthlyVatSummary"] = true;
            return permissions;
        }

        private Dictionary<string, bool> GetSalesPermissions()
        {
            var permissions = GetDefaultMenuPermissions();
            permissions["salesQuotation"] = true;
            permissions["salesDepartment"] = true;
            permissions["creditSales"] = true;
            permissions["cashSales"] = true;
            permissions["salesRegister"] = true;
            permissions["creditSalesRtn"] = true;
            permissions["cashSalesRtn"] = true;
            permissions["salesRtnRegister"] = true;
            return permissions;
        }

        private Dictionary<string, bool> GetPurchasePermissions()
        {
            var permissions = GetDefaultMenuPermissions();
            permissions["purchaseDepartment"] = true;
            permissions["createPurchase"] = true;
            permissions["purchaseRegister"] = true;
            permissions["createPurchaseRtn"] = true;
            permissions["purchaseRtnRegister"] = true;
            return permissions;
        }

        private Dictionary<string, bool> GetSupervisorPermissions()
        {
            var permissions = GetDefaultMenuPermissions();
            // Supervisor can view most things but not modify
            permissions["dashboard"] = true;
            permissions["salesRegister"] = true;
            permissions["purchaseRegister"] = true;
            permissions["paymentRegister"] = true;
            permissions["receiptRegister"] = true;
            permissions["journalRegister"] = true;
            permissions["stockAdjRegister"] = true;
            permissions["itemLedger"] = true;
            permissions["stockStatus"] = true;
            permissions["reorderLevel"] = true;
            permissions["itemSalesReport"] = true;
            permissions["outstandingHeader"] = true;
            permissions["ageingSubHeader"] = true;
            permissions["ageingFIFO"] = true;
            permissions["ageingDayWise"] = true;
            permissions["ageingAllParty"] = true;
            permissions["statements"] = true;
            permissions["reportsSubHeader"] = true;
            permissions["dailyProfitSaleAnalysis"] = true;
            permissions["invoiceWiseProfitLoss"] = true;
            return permissions;
        }

        private Dictionary<string, bool> GetUserPermissions()
        {
            var permissions = GetDefaultMenuPermissions();
            permissions["dashboard"] = true;
            permissions["attendance"] = true;
            return permissions;
        }
    }
}