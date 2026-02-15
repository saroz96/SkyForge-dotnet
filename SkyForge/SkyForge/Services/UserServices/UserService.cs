//using Microsoft.EntityFrameworkCore;
//using Npgsql;
//using SkyForge.Data;
//using SkyForge.Models.CompanyModel;
//using SkyForge.Models.RoleModel;
//using SkyForge.Models.UserModel;
//using System;
//using System.Collections.Generic;
//using System.Linq;
//using System.Text.Json;
//using System.Threading.Tasks;

//namespace SkyForge.Services.UserServices
//{
//    public class UserService : IUserService
//    {
//        private readonly ApplicationDbContext _context;
//        private readonly IPasswordService _passwordService;
//        private readonly ILogger<UserService> _logger;

//        public UserService(ApplicationDbContext context, IPasswordService passwordService, ILogger<UserService> logger)
//        {
//            _context = context;
//            _passwordService = passwordService;
//            _logger = logger;
//        }

//        public async Task<User> CreateUserAsync(User user, string password, int? roleId = null)
//        {
//            Console.WriteLine("=== CREATE USER STARTED ===");
//            Console.WriteLine($"User email: {user.Email}");
//            Console.WriteLine($"User name: {user.Name}");
//            Console.WriteLine($"Role ID to assign: {(roleId.HasValue ? roleId.Value.ToString() : "None")}");

//            using var transaction = await _context.Database.BeginTransactionAsync();

//            try
//            {
//                // Validate email uniqueness
//                Console.WriteLine("Checking email uniqueness...");
//                var emailLower = user.Email.ToLower();
//                var existingUser = await _context.Users
//                    .FirstOrDefaultAsync(u => u.Email.ToLower() == emailLower);

//                if (existingUser != null)
//                {
//                    Console.WriteLine($"ERROR: Email {user.Email} already exists");
//                    throw new Exception($"Email '{user.Email}' already exists");
//                }
//                Console.WriteLine("Email is unique ✓");

//                // Hash password
//                Console.WriteLine("Hashing password...");
//                try
//                {
//                    user.PasswordHash = _passwordService.HashPassword(password);
//                    Console.WriteLine("Password hashed successfully ✓");
//                }
//                catch (Exception hashEx)
//                {
//                    Console.WriteLine($"Password hashing error: {hashEx.Message}");
//                    throw new Exception($"Password hashing failed: {hashEx.Message}");
//                }

//                user.Email = user.Email.ToLower().Trim();

//                // Generate email verification token
//                Console.WriteLine("Generating email verification token...");
//                try
//                {
//                    user.EmailVerificationToken = _passwordService.HashToken(Guid.NewGuid().ToString());
//                    user.EmailVerificationExpires = DateTime.UtcNow.AddDays(1);
//                    Console.WriteLine("Email verification token generated ✓");
//                }
//                catch (Exception tokenEx)
//                {
//                    Console.WriteLine($"Token generation error: {tokenEx.Message}");
//                    throw;
//                }

//                // Set default menu permissions
//                Console.WriteLine("Setting default menu permissions...");
//                try
//                {
//                    user.MenuPermissions = GetDefaultMenuPermissions();
//                    Console.WriteLine("Default menu permissions set ✓");
//                }
//                catch (Exception permEx)
//                {
//                    Console.WriteLine($"Menu permissions error: {permEx.Message}");
//                    throw;
//                }

//                // Set timestamps
//                user.CreatedAt = DateTime.UtcNow;
//                user.UpdatedAt = DateTime.UtcNow;
//                user.IsActive = true;
//                user.IsEmailVerified = false;
//                Console.WriteLine("Timestamps set ✓");

//                // Save user first to get ID
//                Console.WriteLine("Saving user to database...");
//                _context.Users.Add(user);
//                await _context.SaveChangesAsync();
//                Console.WriteLine($"User saved successfully with ID: {user.Id}");

//                // Assign role if specified
//                if (roleId.HasValue)
//                {
//                    Console.WriteLine($"Assigning role ID {roleId.Value} to user...");

//                    // Check if role exists
//                    var role = await _context.Roles.FindAsync(roleId.Value);
//                    if (role == null)
//                    {
//                        Console.WriteLine($"Warning: Role ID {roleId.Value} not found. Skipping role assignment.");
//                    }
//                    else if (!role.IsActive || !role.IsAssignable)
//                    {
//                        Console.WriteLine($"Warning: Role '{role.Name}' is not active or assignable. Skipping role assignment.");
//                    }
//                    else
//                    {
//                        Console.WriteLine($"Found role: {role.Name}");

//                        // Check if user already has this role
//                        var existingUserRole = await _context.UserRoles
//                            .FirstOrDefaultAsync(ur => ur.UserId == user.Id && ur.RoleId == roleId.Value);

//                        if (existingUserRole != null)
//                        {
//                            Console.WriteLine($"User already has role '{role.Name}'. Marking as primary.");
//                            existingUserRole.IsPrimary = true;
//                            existingUserRole.UpdatedAt = DateTime.UtcNow;
//                        }
//                        else
//                        {
//                            // Create new UserRole
//                            var userRole = new UserRole
//                            {
//                                UserId = user.Id,
//                                RoleId = roleId.Value,
//                                AssignedById = 1, // System/Admin user ID - update this as needed
//                                IsPrimary = true,
//                                AssignedAt = DateTime.UtcNow,
//                                CreatedAt = DateTime.UtcNow,
//                                UpdatedAt = DateTime.UtcNow
//                            };

//                            _context.UserRoles.Add(userRole);
//                            Console.WriteLine($"Role '{role.Name}' assigned to user");
//                        }

//                        await _context.SaveChangesAsync();
//                    }
//                }
//                else
//                {
//                    Console.WriteLine("No role specified, skipping role assignment");
//                }

//                // Commit transaction
//                await transaction.CommitAsync();

//                Console.WriteLine("=== CREATE USER COMPLETED SUCCESSFULLY ===");

//                // Reload the user with roles
//                var createdUser = await _context.Users
//                    .Include(u => u.UserRoles)
//                        .ThenInclude(ur => ur.Role)
//                    .FirstOrDefaultAsync(u => u.Id == user.Id);

//                if (createdUser != null && createdUser.UserRoles != null)
//                {
//                    Console.WriteLine($"User created with ID: {createdUser.Id}");
//                    Console.WriteLine($"User has {createdUser.UserRoles.Count} roles");

//                    foreach (var ur in createdUser.UserRoles)
//                    {
//                        Console.WriteLine($"  - Role: {ur.Role?.Name ?? "Unknown"} (ID: {ur.RoleId}, Primary: {ur.IsPrimary})");
//                    }
//                }

//                return createdUser ?? user;
//            }
//            catch (DbUpdateException dbEx)
//            {
//                await transaction.RollbackAsync();
//                Console.WriteLine($"Database update error: {dbEx.Message}");
//                Console.WriteLine($"Inner exception: {dbEx.InnerException?.Message}");

//                if (dbEx.InnerException is PostgresException pgEx)
//                {
//                    Console.WriteLine($"PostgreSQL error code: {pgEx.SqlState}");
//                    Console.WriteLine($"PostgreSQL error message: {pgEx.MessageText}");
//                    Console.WriteLine($"PostgreSQL detail: {pgEx.Detail}");

//                    if (pgEx.SqlState == "23505") // Unique violation
//                    {
//                        throw new Exception($"Email '{user.Email}' already exists");
//                    }
//                    else if (pgEx.SqlState == "23514") // Check violation
//                    {
//                        throw new Exception($"Data validation failed: {pgEx.MessageText}");
//                    }
//                    else if (pgEx.SqlState == "23503") // Foreign key violation
//                    {
//                        throw new Exception($"Referenced data not found: {pgEx.MessageText}");
//                    }
//                    else if (pgEx.SqlState == "23502") // Not null violation
//                    {
//                        throw new Exception($"Required field missing: {pgEx.MessageText}");
//                    }
//                }
//                throw;
//            }
//            catch (Exception ex)
//            {
//                await transaction.RollbackAsync();
//                Console.WriteLine($"=== CREATE USER FAILED ===");
//                Console.WriteLine($"Error: {ex.Message}");
//                Console.WriteLine($"Stack trace: {ex.StackTrace}");
//                if (ex.InnerException != null)
//                {
//                    Console.WriteLine($"Inner error: {ex.InnerException.Message}");
//                    Console.WriteLine($"Inner stack trace: {ex.InnerException.StackTrace}");
//                }
//                throw;
//            }
//        }
//        private async Task AssignDefaultRoleToUserAsync(int userId, int roleId)
//        {
//            try
//            {
//                // Check if role exists
//                var role = await _context.Roles.FindAsync(roleId);
//                if (role == null)
//                {
//                    Console.WriteLine($"Warning: Role ID {roleId} not found. Skipping role assignment.");
//                    return;
//                }

//                // Check if user already has this role
//                var existingRole = await _context.UserRoles
//                    .FirstOrDefaultAsync(ur => ur.UserId == userId && ur.RoleId == roleId);

//                if (existingRole != null)
//                {
//                    Console.WriteLine($"User already has role '{role.Name}'. Skipping assignment.");
//                    return;
//                }

//                var userRole = new UserRole
//                {
//                    UserId = userId,
//                    RoleId = roleId,
//                    AssignedById = userId, // Self-assigned
//                    IsPrimary = true,
//                    AssignedAt = DateTime.UtcNow,
//                    CreatedAt = DateTime.UtcNow
//                };

//                _context.UserRoles.Add(userRole);
//                await _context.SaveChangesAsync();
//                Console.WriteLine($"Role '{role.Name}' assigned successfully to user ID: {userId}");
//            }
//            catch (Exception ex)
//            {
//                Console.WriteLine($"Warning: Failed to assign role: {ex.Message}");
//                // Don't fail user creation if role assignment fails
//            }
//        }

//        public async Task<User> GetUserByIdAsync(int id)
//        {
//            return await _context.Users
//                .Include(u => u.OwnedCompanies)
//                .Include(u => u.AccessibleCompanies)
//                .Include(u => u.FiscalYear)
//                .Include(u => u.UserRoles)
//                    .ThenInclude(ur => ur.Role)
//                .FirstOrDefaultAsync(u => u.Id == id && u.IsActive);
//        }

//        public async Task<User> GetUserByEmailAsync(string email)
//        {
//            var emailLower = email.ToLower();
//            return await _context.Users
//                .Include(u => u.OwnedCompanies)
//                .Include(u => u.AccessibleCompanies)
//                .Include(u => u.FiscalYear)
//                .Include(u => u.UserRoles)
//                    .ThenInclude(ur => ur.Role)
//                .FirstOrDefaultAsync(u => u.Email.ToLower() == emailLower && u.IsActive);
//        }

//        public async Task<List<User>> GetAllUsersAsync()
//        {
//            return await _context.Users
//                .Where(u => u.IsActive)
//                .Include(u => u.OwnedCompanies)
//                .Include(u => u.AccessibleCompanies)
//                .Include(u => u.UserRoles)
//                    .ThenInclude(ur => ur.Role)
//                .ToListAsync();
//        }

//        public async Task<User> AuthenticateAsync(string email, string password)
//        {
//            var emailLower = email.ToLower();
//            var user = await _context.Users
//                .Include(u => u.OwnedCompanies)
//                .Include(u => u.AccessibleCompanies)
//                .Include(u => u.FiscalYear)
//                .Include(u => u.UserRoles)
//                    .ThenInclude(ur => ur.Role)
//                .FirstOrDefaultAsync(u => u.Email.ToLower() == emailLower && u.IsActive);

//            if (user == null || !_passwordService.VerifyPassword(password, user.PasswordHash))
//                return null;

//            return user;
//        }

//        public async Task<User> UpdateUserAsync(int id, User updatedUser)
//        {
//            var user = await GetUserByIdAsync(id);
//            if (user == null)
//                throw new Exception("User not found");

//            // Update basic info
//            user.Name = updatedUser.Name ?? user.Name;
//            user.Email = updatedUser.Email?.ToLower().Trim() ?? user.Email;
//            user.IsAdmin = updatedUser.IsAdmin;
//            user.UpdatedAt = DateTime.UtcNow;

//            // Update preferences if provided
//            if (updatedUser.Preferences != null)
//            {
//                user.Preferences = updatedUser.Preferences;
//            }

//            await _context.SaveChangesAsync();
//            return user;
//        }

//        public async Task<bool> AddCompanyToUserAsync(int userId, int companyId)
//        {
//            using var transaction = await _context.Database.BeginTransactionAsync();

//            try
//            {
//                _logger.LogInformation("Adding company {CompanyId} to user {UserId}", companyId, userId);

//                // Get user with companies
//                var user = await _context.Users
//                    .Include(u => u.AccessibleCompanies)
//                    .FirstOrDefaultAsync(u => u.Id == userId);

//                if (user == null)
//                {
//                    _logger.LogWarning("User {UserId} not found", userId);
//                    return false;
//                }

//                // Get company
//                var company = await _context.Companies.FindAsync(companyId);
//                if (company == null)
//                {
//                    _logger.LogWarning("Company {CompanyId} not found", companyId);
//                    return false;
//                }

//                // Check if user is already the owner
//                if (company.OwnerId == userId)
//                {
//                    _logger.LogInformation("User {UserId} is already the owner of company {CompanyId}", userId, companyId);
//                    return true; // Return true since owner already has access
//                }

//                // Check if user already has access to this company
//                if (user.AccessibleCompanies.Any(c => c.Id == companyId))
//                {
//                    _logger.LogInformation("User {UserId} already has access to company {CompanyId}", userId, companyId);
//                    return true; // Already has access
//                }

//                // Add company to user's accessible companies
//                user.AccessibleCompanies.Add(company);
//                await _context.SaveChangesAsync();

//                // Also add user to company's users (bidirectional relationship)
//                if (!company.Users.Any(u => u.Id == userId))
//                {
//                    company.Users.Add(user);
//                    await _context.SaveChangesAsync();
//                }

//                await transaction.CommitAsync();

//                _logger.LogInformation("Successfully added company {CompanyId} to user {UserId}", companyId, userId);
//                return true;
//            }
//            catch (Exception ex)
//            {
//                await transaction.RollbackAsync();
//                _logger.LogError(ex, "Error adding company {CompanyId} to user {UserId}", companyId, userId);
//                throw;
//            }
//        }

//        // NEW: Remove company from user's accessible companies
//        public async Task<bool> RemoveCompanyFromUserAsync(int userId, int companyId)
//        {
//            using var transaction = await _context.Database.BeginTransactionAsync();

//            try
//            {
//                _logger.LogInformation("Removing company {CompanyId} from user {UserId}", companyId, userId);

//                // Get user with companies
//                var user = await _context.Users
//                    .Include(u => u.AccessibleCompanies)
//                    .FirstOrDefaultAsync(u => u.Id == userId);

//                if (user == null)
//                {
//                    _logger.LogWarning("User {UserId} not found", userId);
//                    return false;
//                }

//                // Get company
//                var company = await _context.Companies
//                    .Include(c => c.Users)
//                    .FirstOrDefaultAsync(c => c.Id == companyId);

//                if (company == null)
//                {
//                    _logger.LogWarning("Company {CompanyId} not found", companyId);
//                    return false;
//                }

//                // Check if user is the owner
//                if (company.OwnerId == userId)
//                {
//                    _logger.LogWarning("Cannot remove owner {UserId} from their own company {CompanyId}", userId, companyId);
//                    return false;
//                }

//                // Remove company from user's accessible companies
//                var companyToRemove = user.AccessibleCompanies.FirstOrDefault(c => c.Id == companyId);
//                if (companyToRemove != null)
//                {
//                    user.AccessibleCompanies.Remove(companyToRemove);
//                    await _context.SaveChangesAsync();
//                }

//                // Remove user from company's users
//                var userToRemove = company.Users.FirstOrDefault(u => u.Id == userId);
//                if (userToRemove != null)
//                {
//                    company.Users.Remove(userToRemove);
//                    await _context.SaveChangesAsync();
//                }

//                await transaction.CommitAsync();

//                _logger.LogInformation("Successfully removed company {CompanyId} from user {UserId}", companyId, userId);
//                return true;
//            }
//            catch (Exception ex)
//            {
//                await transaction.RollbackAsync();
//                _logger.LogError(ex, "Error removing company {CompanyId} from user {UserId}", companyId, userId);
//                throw;
//            }
//        }

//        // NEW: Get all companies accessible to user
//        public async Task<List<Company>> GetUserCompaniesAsync(int userId)
//        {
//            try
//            {
//                _logger.LogInformation("Getting companies for user {UserId}", userId);

//                var user = await _context.Users
//                    .Include(u => u.OwnedCompanies)
//                    .Include(u => u.AccessibleCompanies)
//                    .FirstOrDefaultAsync(u => u.Id == userId);

//                if (user == null)
//                {
//                    _logger.LogWarning("User {UserId} not found", userId);
//                    return new List<Company>();
//                }

//                // Combine owned companies and accessible companies
//                var allCompanies = new List<Company>();
//                allCompanies.AddRange(user.OwnedCompanies);
//                allCompanies.AddRange(user.AccessibleCompanies);

//                // Remove duplicates (in case user owns a company they also have access to)
//                var distinctCompanies = allCompanies
//                    .GroupBy(c => c.Id)
//                    .Select(g => g.First())
//                    .ToList();

//                _logger.LogInformation("Found {Count} companies for user {UserId}", distinctCompanies.Count, userId);
//                return distinctCompanies;
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Error getting companies for user {UserId}", userId);
//                throw;
//            }
//        }

//        // NEW: Check if user has access to a specific company
//        public async Task<bool> UserHasAccessToCompanyAsync(int userId, int companyId)
//        {
//            try
//            {
//                var user = await _context.Users
//                    .Include(u => u.OwnedCompanies)
//                    .Include(u => u.AccessibleCompanies)
//                    .FirstOrDefaultAsync(u => u.Id == userId);

//                if (user == null)
//                    return false;

//                // Check if user owns the company or has access to it
//                return user.OwnedCompanies.Any(c => c.Id == companyId) ||
//                       user.AccessibleCompanies.Any(c => c.Id == companyId);
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Error checking access for user {UserId} to company {CompanyId}", userId, companyId);
//                throw;
//            }
//        }

//public async Task<bool> ChangePasswordAsync(int userId, string currentPassword, string newPassword)
//        {
//            var user = await GetUserByIdAsync(userId);
//            if (user == null || !_passwordService.VerifyPassword(currentPassword, user.PasswordHash))
//                return false;

//            user.PasswordHash = _passwordService.HashPassword(newPassword);
//            user.UpdatedAt = DateTime.UtcNow;

//            await _context.SaveChangesAsync();
//            return true;
//        }

//        public async Task<string> GeneratePasswordResetTokenAsync(string email)
//        {
//            var user = await GetUserByEmailAsync(email);
//            if (user == null)
//                throw new Exception("User not found");

//            var token = _passwordService.GenerateResetToken();
//            user.ResetPasswordToken = _passwordService.HashToken(token);
//            user.ResetPasswordExpires = DateTime.UtcNow.AddMinutes(10);

//            await _context.SaveChangesAsync();
//            return token;
//        }

//        public async Task<bool> ResetPasswordAsync(string token, string newPassword)
//        {
//            var hashedToken = _passwordService.HashToken(token);

//            var user = await _context.Users
//                .FirstOrDefaultAsync(u => u.ResetPasswordToken == hashedToken &&
//                                         u.ResetPasswordExpires > DateTime.UtcNow);

//            if (user == null)
//                return false;

//            user.PasswordHash = _passwordService.HashPassword(newPassword);
//            user.ResetPasswordToken = null;
//            user.ResetPasswordExpires = null;
//            user.UpdatedAt = DateTime.UtcNow;

//            await _context.SaveChangesAsync();
//            return true;
//        }

//        public async Task<string> GenerateEmailVerificationTokenAsync(int userId)
//        {
//            var user = await GetUserByIdAsync(userId);
//            if (user == null)
//                throw new Exception("User not found");

//            var token = Guid.NewGuid().ToString();
//            user.EmailVerificationToken = _passwordService.HashToken(token);
//            user.EmailVerificationExpires = DateTime.UtcNow.AddDays(1);

//            await _context.SaveChangesAsync();
//            return token;
//        }

//        public async Task<bool> VerifyEmailAsync(string token)
//        {
//            var hashedToken = _passwordService.HashToken(token);

//            var user = await _context.Users
//                .FirstOrDefaultAsync(u => u.EmailVerificationToken == hashedToken &&
//                                         u.EmailVerificationExpires > DateTime.UtcNow);

//            if (user == null)
//                return false;

//            user.IsEmailVerified = true;
//            user.EmailVerificationToken = null;
//            user.EmailVerificationExpires = null;
//            user.UpdatedAt = DateTime.UtcNow;

//            await _context.SaveChangesAsync();
//            return true;
//        }

//        public async Task<bool> DeactivateUserAsync(int userId)
//        {
//            var user = await GetUserByIdAsync(userId);
//            if (user == null)
//                return false;

//            user.IsActive = false;
//            user.UpdatedAt = DateTime.UtcNow;

//            await _context.SaveChangesAsync();
//            return true;
//        }

//        public async Task<bool> ActivateUserAsync(int userId)
//        {
//            var user = await _context.Users.FindAsync(userId);
//            if (user == null)
//                return false;

//            user.IsActive = true;
//            user.UpdatedAt = DateTime.UtcNow;

//            await _context.SaveChangesAsync();
//            return true;
//        }

//        public async Task<UserRole> UpdateUserRoleAsync(int userId, int roleId, bool isPrimary = false)
//        {
//            var user = await GetUserByIdAsync(userId);
//            if (user == null)
//                throw new Exception("User not found");

//            var role = await _context.Roles.FindAsync(roleId);
//            if (role == null)
//                throw new Exception("Role not found");

//            // Remove old primary role if setting new one
//            if (isPrimary)
//            {
//                var currentPrimary = await _context.UserRoles
//                    .Where(ur => ur.UserId == userId && ur.IsPrimary)
//                    .ToListAsync();

//                foreach (var ur in currentPrimary)
//                {
//                    ur.IsPrimary = false;
//                }
//            }

//            // Check if user already has this role
//            var existingUserRole = await _context.UserRoles
//                .FirstOrDefaultAsync(ur => ur.UserId == userId && ur.RoleId == roleId);

//            UserRole userRole;
//            if (existingUserRole != null)
//            {
//                existingUserRole.IsPrimary = isPrimary;
//                existingUserRole.UpdatedAt = DateTime.UtcNow;
//                userRole = existingUserRole;
//            }
//            else
//            {
//                userRole = new UserRole
//                {
//                    UserId = userId,
//                    RoleId = roleId,
//                    AssignedById = userId,
//                    IsPrimary = isPrimary,
//                    AssignedAt = DateTime.UtcNow,
//                    CreatedAt = DateTime.UtcNow
//                };
//                _context.UserRoles.Add(userRole);
//            }

//            await _context.SaveChangesAsync();
//            return userRole;
//        }

//        public async Task<Dictionary<string, bool>> UpdateMenuPermissionsAsync(int userId, Dictionary<string, bool> permissions, int grantedById)
//        {
//            var user = await GetUserByIdAsync(userId);
//            if (user == null)
//                throw new Exception("User not found");

//            user.MenuPermissions = permissions;
//            user.GrantedById = grantedById;
//            user.LastPermissionUpdate = DateTime.UtcNow;
//            user.UpdatedAt = DateTime.UtcNow;

//            await _context.SaveChangesAsync();
//            return permissions;
//        }

//        public async Task<bool> HasMenuPermissionAsync(int userId, string menuKey)
//        {
//            var user = await GetUserByIdAsync(userId);
//            if (user == null || user.MenuPermissions == null)
//                return false;

//            return user.MenuPermissions.TryGetValue(menuKey, out bool hasPermission) && hasPermission;
//        }

//        public async Task<Dictionary<string, bool>> GetUserPermissionsAsync(int userId)
//        {
//            var user = await GetUserByIdAsync(userId);
//            if (user == null)
//                return new Dictionary<string, bool>();

//            return user.MenuPermissions ?? GetDefaultMenuPermissions();
//        }

//        public async Task<bool> AddUserToCompanyAsync(int userId, int companyId)
//        {
//            var user = await _context.Users
//                .Include(u => u.AccessibleCompanies)
//                .FirstOrDefaultAsync(u => u.Id == userId);

//            var company = await _context.Companies.FindAsync(companyId);

//            if (user == null || company == null)
//                return false;

//            // Check if user already has access
//            if (user.AccessibleCompanies.Any(c => c.Id == companyId))
//                return false;

//            user.AccessibleCompanies.Add(company);
//            await _context.SaveChangesAsync();

//            return true;
//        }

//        public async Task<bool> RemoveUserFromCompanyAsync(int userId, int companyId)
//        {
//            var user = await _context.Users
//                .Include(u => u.AccessibleCompanies)
//                .FirstOrDefaultAsync(u => u.Id == userId);

//            if (user == null)
//                return false;

//            var company = user.AccessibleCompanies.FirstOrDefault(c => c.Id == companyId);
//            if (company == null)
//                return false;

//            user.AccessibleCompanies.Remove(company);
//            await _context.SaveChangesAsync();

//            return true;
//        }

//        public async Task<User> UpdateUserPreferencesAsync(int userId, UserPreferences preferences)
//        {
//            var user = await GetUserByIdAsync(userId);
//            if (user == null)
//                throw new Exception("User not found");

//            user.Preferences = preferences;
//            user.UpdatedAt = DateTime.UtcNow;

//            await _context.SaveChangesAsync();
//            return user;
//        }

//        public async Task<bool> IsEmailUniqueAsync(string email, int? excludeUserId = null)
//        {
//            var query = _context.Users.Where(u => u.Email.ToLower() == email.ToLower());

//            if (excludeUserId.HasValue)
//            {
//                query = query.Where(u => u.Id != excludeUserId.Value);
//            }

//            return !await query.AnyAsync();
//        }

//        public async Task<bool> IsUserActiveAsync(int userId)
//        {
//            var user = await _context.Users.FindAsync(userId);
//            return user?.IsActive ?? false;
//        }

//        public async Task<bool> DeleteUserAsync(int id)
//        {
//            var user = await GetUserByIdAsync(id);
//            if (user == null)
//                return false;

//            _context.Users.Remove(user);
//            await _context.SaveChangesAsync();
//            return true;
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
//    }
//}

using Microsoft.EntityFrameworkCore;
using Npgsql;
using SkyForge.Data;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.RoleModel;
using SkyForge.Models.UserModel;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SkyForge.Services.UserServices
{
    public class UserService : IUserService
    {
        private readonly ApplicationDbContext _context;
        private readonly IPasswordService _passwordService;
        private readonly ILogger<UserService> _logger;

        public UserService(ApplicationDbContext context, IPasswordService passwordService, ILogger<UserService> logger)
        {
            _context = context;
            _passwordService = passwordService;
            _logger = logger;
        }

        public async Task<User> CreateUserAsync(User user, string password, Guid? roleId = null)
        {
            _logger.LogInformation("=== CREATE USER STARTED ===");
            _logger.LogInformation($"User email: {user.Email}");
            _logger.LogInformation($"User name: {user.Name}");
            _logger.LogInformation($"Role ID to assign: {(roleId.HasValue ? roleId.Value.ToString() : "None")}");

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // Validate email uniqueness
                _logger.LogInformation("Checking email uniqueness...");
                var emailLower = user.Email.ToLower();
                var existingUser = await _context.Users
                    .FirstOrDefaultAsync(u => u.Email.ToLower() == emailLower);

                if (existingUser != null)
                {
                    _logger.LogError($"Email {user.Email} already exists");
                    throw new Exception($"Email '{user.Email}' already exists");
                }
                _logger.LogInformation("Email is unique ✓");

                // Hash password
                _logger.LogInformation("Hashing password...");
                try
                {
                    user.PasswordHash = _passwordService.HashPassword(password);
                    _logger.LogInformation("Password hashed successfully ✓");
                }
                catch (Exception hashEx)
                {
                    _logger.LogError($"Password hashing error: {hashEx.Message}");
                    throw new Exception($"Password hashing failed: {hashEx.Message}");
                }

                user.Email = user.Email.ToLower().Trim();

                // Generate email verification token
                _logger.LogInformation("Generating email verification token...");
                try
                {
                    user.EmailVerificationToken = _passwordService.HashToken(Guid.NewGuid().ToString());
                    user.EmailVerificationExpires = DateTime.UtcNow.AddDays(1);
                    _logger.LogInformation("Email verification token generated ✓");
                }
                catch (Exception tokenEx)
                {
                    _logger.LogError($"Token generation error: {tokenEx.Message}");
                    throw;
                }

                // Set default menu permissions
                _logger.LogInformation("Setting default menu permissions...");
                try
                {
                    user.MenuPermissions = GetDefaultMenuPermissions();
                    _logger.LogInformation("Default menu permissions set ✓");
                }
                catch (Exception permEx)
                {
                    _logger.LogError($"Menu permissions error: {permEx.Message}");
                    throw;
                }

                // Set timestamps
                user.CreatedAt = DateTime.UtcNow;
                user.UpdatedAt = DateTime.UtcNow;
                user.IsActive = true;
                user.IsEmailVerified = false;
                _logger.LogInformation("Timestamps set ✓");

                // Save user first to get ID
                _logger.LogInformation("Saving user to database...");
                _context.Users.Add(user);
                await _context.SaveChangesAsync();
                _logger.LogInformation($"User saved successfully with ID: {user.Id}");

                // Assign role if specified
                if (roleId.HasValue)
                {
                    _logger.LogInformation($"Assigning role ID {roleId.Value} to user...");

                    // Check if role exists
                    var role = await _context.Roles.FindAsync(roleId.Value);
                    if (role == null)
                    {
                        _logger.LogWarning($"Role ID {roleId.Value} not found. Skipping role assignment.");
                    }
                    else if (!role.IsActive || !role.IsAssignable)
                    {
                        _logger.LogWarning($"Role '{role.Name}' is not active or assignable. Skipping role assignment.");
                    }
                    else
                    {
                        _logger.LogInformation($"Found role: {role.Name}");

                        // Check if user already has this role
                        var existingUserRole = await _context.UserRoles
                            .FirstOrDefaultAsync(ur => ur.UserId == user.Id && ur.RoleId == roleId.Value);

                        if (existingUserRole != null)
                        {
                            _logger.LogInformation($"User already has role '{role.Name}'. Marking as primary.");
                            existingUserRole.IsPrimary = true;
                            existingUserRole.UpdatedAt = DateTime.UtcNow;
                        }
                        else
                        {
                            // Create new UserRole
                            var userRole = new UserRole
                            {
                                UserId = user.Id,
                                RoleId = roleId.Value,
                                AssignedById = user.Id, // Self-assigned for now
                                IsPrimary = true,
                                AssignedAt = DateTime.UtcNow,
                                CreatedAt = DateTime.UtcNow,
                                UpdatedAt = DateTime.UtcNow
                            };

                            _context.UserRoles.Add(userRole);
                            _logger.LogInformation($"Role '{role.Name}' assigned to user");
                        }

                        await _context.SaveChangesAsync();
                    }
                }
                else
                {
                    _logger.LogInformation("No role specified, skipping role assignment");
                }

                // Commit transaction
                await transaction.CommitAsync();

                _logger.LogInformation("=== CREATE USER COMPLETED SUCCESSFULLY ===");

                // Reload the user with roles
                var createdUser = await _context.Users
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Id == user.Id);

                if (createdUser != null && createdUser.UserRoles != null)
                {
                    _logger.LogInformation($"User created with ID: {createdUser.Id}");
                    _logger.LogInformation($"User has {createdUser.UserRoles.Count} roles");

                    foreach (var ur in createdUser.UserRoles)
                    {
                        _logger.LogInformation($"  - Role: {ur.Role?.Name ?? "Unknown"} (ID: {ur.RoleId}, Primary: {ur.IsPrimary})");
                    }
                }

                return createdUser ?? user;
            }
            catch (DbUpdateException dbEx)
            {
                await transaction.RollbackAsync();
                _logger.LogError($"Database update error: {dbEx.Message}");
                _logger.LogError($"Inner exception: {dbEx.InnerException?.Message}");

                if (dbEx.InnerException is PostgresException pgEx)
                {
                    _logger.LogError($"PostgreSQL error code: {pgEx.SqlState}");
                    _logger.LogError($"PostgreSQL error message: {pgEx.MessageText}");
                    _logger.LogError($"PostgreSQL detail: {pgEx.Detail}");

                    if (pgEx.SqlState == "23505") // Unique violation
                    {
                        throw new Exception($"Email '{user.Email}' already exists");
                    }
                    else if (pgEx.SqlState == "23514") // Check violation
                    {
                        throw new Exception($"Data validation failed: {pgEx.MessageText}");
                    }
                    else if (pgEx.SqlState == "23503") // Foreign key violation
                    {
                        throw new Exception($"Referenced data not found: {pgEx.MessageText}");
                    }
                    else if (pgEx.SqlState == "23502") // Not null violation
                    {
                        throw new Exception($"Required field missing: {pgEx.MessageText}");
                    }
                }
                throw;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError($"=== CREATE USER FAILED ===");
                _logger.LogError($"Error: {ex.Message}");
                _logger.LogError($"Stack trace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    _logger.LogError($"Inner error: {ex.InnerException.Message}");
                    _logger.LogError($"Inner stack trace: {ex.InnerException.StackTrace}");
                }
                throw;
            }
        }

        public async Task<User> GetUserByIdAsync(Guid id)
        {
            try
            {
                var user = await _context.Users
                    .Include(u => u.OwnedCompanies)
                    .Include(u => u.AccessibleCompanies)
                    .Include(u => u.FiscalYear)
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Id == id && u.IsActive);

                if (user == null)
                {
                    _logger.LogWarning("User {UserId} not found", id);
                }

                return user;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user {UserId}", id);
                throw;
            }
        }

        public async Task<User> GetUserByEmailAsync(string email)
        {
            try
            {
                var emailLower = email.ToLower();
                var user = await _context.Users
                    .Include(u => u.OwnedCompanies)
                    .Include(u => u.AccessibleCompanies)
                    .Include(u => u.FiscalYear)
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Email.ToLower() == emailLower && u.IsActive);

                if (user == null)
                {
                    _logger.LogDebug("User with email {Email} not found", email);
                }

                return user;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user by email {Email}", email);
                throw;
            }
        }

        public async Task<List<User>> GetAllUsersAsync()
        {
            try
            {
                var users = await _context.Users
                    .Where(u => u.IsActive)
                    .Include(u => u.OwnedCompanies)
                    .Include(u => u.AccessibleCompanies)
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .ToListAsync();

                _logger.LogInformation("Retrieved {Count} active users", users.Count);
                return users;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all users");
                throw;
            }
        }

        public async Task<User> AuthenticateAsync(string email, string password)
        {
            try
            {
                var emailLower = email.ToLower();
                var user = await _context.Users
                    .Include(u => u.OwnedCompanies)
                    .Include(u => u.AccessibleCompanies)
                    .Include(u => u.FiscalYear)
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Email.ToLower() == emailLower && u.IsActive);

                if (user == null || !_passwordService.VerifyPassword(password, user.PasswordHash))
                {
                    _logger.LogWarning("Authentication failed for email {Email}", email);
                    return null;
                }

                _logger.LogInformation("User {UserId} authenticated successfully", user.Id);
                return user;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error authenticating user with email {Email}", email);
                throw;
            }
        }

        public async Task<User> UpdateUserAsync(Guid id, User updatedUser)
        {
            try
            {
                var user = await GetUserByIdAsync(id);
                if (user == null)
                    throw new Exception("User not found");

                // Update basic info
                user.Name = updatedUser.Name ?? user.Name;
                user.Email = updatedUser.Email?.ToLower().Trim() ?? user.Email;
                user.IsAdmin = updatedUser.IsAdmin;
                user.UpdatedAt = DateTime.UtcNow;

                // Update preferences if provided
                if (updatedUser.Preferences != null)
                {
                    user.Preferences = updatedUser.Preferences;
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("User {UserId} updated successfully", id);
                return user;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating user {UserId}", id);
                throw;
            }
        }

        public async Task<bool> AddCompanyToUserAsync(Guid userId, Guid companyId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                _logger.LogInformation("Adding company {CompanyId} to user {UserId}", companyId, userId);

                // Get user with companies
                var user = await _context.Users
                    .Include(u => u.AccessibleCompanies)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                {
                    _logger.LogWarning("User {UserId} not found", userId);
                    return false;
                }

                // Get company
                var company = await _context.Companies.FindAsync(companyId);
                if (company == null)
                {
                    _logger.LogWarning("Company {CompanyId} not found", companyId);
                    return false;
                }

                // Check if user is already the owner
                if (company.OwnerId == userId)
                {
                    _logger.LogInformation("User {UserId} is already the owner of company {CompanyId}", userId, companyId);
                    return true; // Return true since owner already has access
                }

                // Check if user already has access to this company
                if (user.AccessibleCompanies.Any(c => c.Id == companyId))
                {
                    _logger.LogInformation("User {UserId} already has access to company {CompanyId}", userId, companyId);
                    return true; // Already has access
                }

                // Add company to user's accessible companies
                user.AccessibleCompanies.Add(company);
                await _context.SaveChangesAsync();

                // Also add user to company's users (bidirectional relationship)
                if (!company.Users.Any(u => u.Id == userId))
                {
                    company.Users.Add(user);
                    await _context.SaveChangesAsync();
                }

                await transaction.CommitAsync();

                _logger.LogInformation("Successfully added company {CompanyId} to user {UserId}", companyId, userId);
                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error adding company {CompanyId} to user {UserId}", companyId, userId);
                throw;
            }
        }

        public async Task<bool> RemoveCompanyFromUserAsync(Guid userId, Guid companyId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                _logger.LogInformation("Removing company {CompanyId} from user {UserId}", companyId, userId);

                // Get user with companies
                var user = await _context.Users
                    .Include(u => u.AccessibleCompanies)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                {
                    _logger.LogWarning("User {UserId} not found", userId);
                    return false;
                }

                // Get company
                var company = await _context.Companies
                    .Include(c => c.Users)
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                if (company == null)
                {
                    _logger.LogWarning("Company {CompanyId} not found", companyId);
                    return false;
                }

                // Check if user is the owner
                if (company.OwnerId == userId)
                {
                    _logger.LogWarning("Cannot remove owner {UserId} from their own company {CompanyId}", userId, companyId);
                    return false;
                }

                // Remove company from user's accessible companies
                var companyToRemove = user.AccessibleCompanies.FirstOrDefault(c => c.Id == companyId);
                if (companyToRemove != null)
                {
                    user.AccessibleCompanies.Remove(companyToRemove);
                    await _context.SaveChangesAsync();
                }

                // Remove user from company's users
                var userToRemove = company.Users.FirstOrDefault(u => u.Id == userId);
                if (userToRemove != null)
                {
                    company.Users.Remove(userToRemove);
                    await _context.SaveChangesAsync();
                }

                await transaction.CommitAsync();

                _logger.LogInformation("Successfully removed company {CompanyId} from user {UserId}", companyId, userId);
                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error removing company {CompanyId} from user {UserId}", companyId, userId);
                throw;
            }
        }

        public async Task<List<Company>> GetUserCompaniesAsync(Guid userId)
        {
            try
            {
                _logger.LogInformation("Getting companies for user {UserId}", userId);

                var user = await _context.Users
                    .Include(u => u.OwnedCompanies)
                    .Include(u => u.AccessibleCompanies)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                {
                    _logger.LogWarning("User {UserId} not found", userId);
                    return new List<Company>();
                }

                // Combine owned companies and accessible companies
                var allCompanies = new List<Company>();
                allCompanies.AddRange(user.OwnedCompanies);
                allCompanies.AddRange(user.AccessibleCompanies);

                // Remove duplicates (in case user owns a company they also have access to)
                var distinctCompanies = allCompanies
                    .GroupBy(c => c.Id)
                    .Select(g => g.First())
                    .ToList();

                _logger.LogInformation("Found {Count} companies for user {UserId}", distinctCompanies.Count, userId);
                return distinctCompanies;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting companies for user {UserId}", userId);
                throw;
            }
        }

        public async Task<bool> UserHasAccessToCompanyAsync(Guid userId, Guid companyId)
        {
            try
            {
                var user = await _context.Users
                    .Include(u => u.OwnedCompanies)
                    .Include(u => u.AccessibleCompanies)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                    return false;

                // Check if user owns the company or has access to it
                return user.OwnedCompanies.Any(c => c.Id == companyId) ||
                       user.AccessibleCompanies.Any(c => c.Id == companyId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking access for user {UserId} to company {CompanyId}", userId, companyId);
                throw;
            }
        }

        public async Task<bool> ChangePasswordAsync(Guid userId, string currentPassword, string newPassword)
        {
            try
            {
                var user = await GetUserByIdAsync(userId);
                if (user == null || !_passwordService.VerifyPassword(currentPassword, user.PasswordHash))
                {
                    _logger.LogWarning("Password change failed for user {UserId}", userId);
                    return false;
                }

                user.PasswordHash = _passwordService.HashPassword(newPassword);
                user.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Password changed successfully for user {UserId}", userId);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error changing password for user {UserId}", userId);
                throw;
            }
        }

        public async Task<string> GeneratePasswordResetTokenAsync(string email)
        {
            try
            {
                var user = await GetUserByEmailAsync(email);
                if (user == null)
                    throw new Exception("User not found");

                var token = _passwordService.GenerateResetToken();
                user.ResetPasswordToken = _passwordService.HashToken(token);
                user.ResetPasswordExpires = DateTime.UtcNow.AddMinutes(10);

                await _context.SaveChangesAsync();

                _logger.LogInformation("Password reset token generated for user {UserId}", user.Id);
                return token;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating password reset token for email {Email}", email);
                throw;
            }
        }

        public async Task<bool> ResetPasswordAsync(string token, string newPassword)
        {
            try
            {
                var hashedToken = _passwordService.HashToken(token);

                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.ResetPasswordToken == hashedToken &&
                                             u.ResetPasswordExpires > DateTime.UtcNow);

                if (user == null)
                {
                    _logger.LogWarning("Invalid or expired password reset token");
                    return false;
                }

                user.PasswordHash = _passwordService.HashPassword(newPassword);
                user.ResetPasswordToken = null;
                user.ResetPasswordExpires = null;
                user.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Password reset successfully for user {UserId}", user.Id);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resetting password with token");
                throw;
            }
        }

        public async Task<string> GenerateEmailVerificationTokenAsync(Guid userId)
        {
            try
            {
                var user = await GetUserByIdAsync(userId);
                if (user == null)
                    throw new Exception("User not found");

                var token = Guid.NewGuid().ToString();
                user.EmailVerificationToken = _passwordService.HashToken(token);
                user.EmailVerificationExpires = DateTime.UtcNow.AddDays(1);

                await _context.SaveChangesAsync();

                _logger.LogInformation("Email verification token generated for user {UserId}", userId);
                return token;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating email verification token for user {UserId}", userId);
                throw;
            }
        }

        public async Task<bool> VerifyEmailAsync(string token)
        {
            try
            {
                var hashedToken = _passwordService.HashToken(token);

                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.EmailVerificationToken == hashedToken &&
                                             u.EmailVerificationExpires > DateTime.UtcNow);

                if (user == null)
                {
                    _logger.LogWarning("Invalid or expired email verification token");
                    return false;
                }

                user.IsEmailVerified = true;
                user.EmailVerificationToken = null;
                user.EmailVerificationExpires = null;
                user.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Email verified successfully for user {UserId}", user.Id);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verifying email with token");
                throw;
            }
        }

        public async Task<bool> DeactivateUserAsync(Guid userId)
        {
            try
            {
                var user = await GetUserByIdAsync(userId);
                if (user == null)
                    return false;

                user.IsActive = false;
                user.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("User {UserId} deactivated", userId);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deactivating user {UserId}", userId);
                throw;
            }
        }

        public async Task<bool> ActivateUserAsync(Guid userId)
        {
            try
            {
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                    return false;

                user.IsActive = true;
                user.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("User {UserId} activated", userId);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error activating user {UserId}", userId);
                throw;
            }
        }

        public async Task<UserRole> UpdateUserRoleAsync(Guid userId, Guid roleId, bool isPrimary = false)
        {
            try
            {
                var user = await GetUserByIdAsync(userId);
                if (user == null)
                    throw new Exception("User not found");

                var role = await _context.Roles.FindAsync(roleId);
                if (role == null)
                    throw new Exception("Role not found");

                // Remove old primary role if setting new one
                if (isPrimary)
                {
                    var currentPrimary = await _context.UserRoles
                        .Where(ur => ur.UserId == userId && ur.IsPrimary)
                        .ToListAsync();

                    foreach (var ur in currentPrimary)
                    {
                        ur.IsPrimary = false;
                    }
                }

                // Check if user already has this role
                var existingUserRole = await _context.UserRoles
                    .FirstOrDefaultAsync(ur => ur.UserId == userId && ur.RoleId == roleId);

                UserRole userRole;
                if (existingUserRole != null)
                {
                    existingUserRole.IsPrimary = isPrimary;
                    existingUserRole.UpdatedAt = DateTime.UtcNow;
                    userRole = existingUserRole;
                }
                else
                {
                    userRole = new UserRole
                    {
                        UserId = userId,
                        RoleId = roleId,
                        AssignedById = userId,
                        IsPrimary = isPrimary,
                        AssignedAt = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.UserRoles.Add(userRole);
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("Role {RoleId} updated for user {UserId}", roleId, userId);
                return userRole;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating role for user {UserId}", userId);
                throw;
            }
        }

        public async Task<Dictionary<string, bool>> UpdateMenuPermissionsAsync(Guid userId, Dictionary<string, bool> permissions, Guid grantedById)
        {
            try
            {
                var user = await GetUserByIdAsync(userId);
                if (user == null)
                    throw new Exception("User not found");

                user.MenuPermissions = permissions;
                user.GrantedById = grantedById;
                user.LastPermissionUpdate = DateTime.UtcNow;
                user.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Menu permissions updated for user {UserId} by {GrantedById}", userId, grantedById);
                return permissions;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating menu permissions for user {UserId}", userId);
                throw;
            }
        }

        public async Task<bool> HasMenuPermissionAsync(Guid userId, string menuKey)
        {
            try
            {
                var user = await GetUserByIdAsync(userId);
                if (user == null || user.MenuPermissions == null)
                    return false;

                return user.MenuPermissions.TryGetValue(menuKey, out bool hasPermission) && hasPermission;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking menu permission for user {UserId}, key {MenuKey}", userId, menuKey);
                throw;
            }
        }

        public async Task<Dictionary<string, bool>> GetUserPermissionsAsync(Guid userId)
        {
            try
            {
                var user = await GetUserByIdAsync(userId);
                if (user == null)
                    return new Dictionary<string, bool>();

                return user.MenuPermissions ?? GetDefaultMenuPermissions();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting permissions for user {UserId}", userId);
                throw;
            }
        }

        public async Task<bool> AddUserToCompanyAsync(Guid userId, Guid companyId)
        {
            try
            {
                var user = await _context.Users
                    .Include(u => u.AccessibleCompanies)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                var company = await _context.Companies.FindAsync(companyId);

                if (user == null || company == null)
                    return false;

                // Check if user already has access
                if (user.AccessibleCompanies.Any(c => c.Id == companyId))
                    return false;

                user.AccessibleCompanies.Add(company);
                await _context.SaveChangesAsync();

                _logger.LogInformation("User {UserId} added to company {CompanyId}", userId, companyId);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding user {UserId} to company {CompanyId}", userId, companyId);
                throw;
            }
        }

        public async Task<bool> RemoveUserFromCompanyAsync(Guid userId, Guid companyId)
        {
            try
            {
                var user = await _context.Users
                    .Include(u => u.AccessibleCompanies)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                    return false;

                var company = user.AccessibleCompanies.FirstOrDefault(c => c.Id == companyId);
                if (company == null)
                    return false;

                user.AccessibleCompanies.Remove(company);
                await _context.SaveChangesAsync();

                _logger.LogInformation("User {UserId} removed from company {CompanyId}", userId, companyId);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing user {UserId} from company {CompanyId}", userId, companyId);
                throw;
            }
        }

        public async Task<User> UpdateUserPreferencesAsync(Guid userId, UserPreferences preferences)
        {
            try
            {
                var user = await GetUserByIdAsync(userId);
                if (user == null)
                    throw new Exception("User not found");

                user.Preferences = preferences;
                user.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Preferences updated for user {UserId}", userId);
                return user;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating preferences for user {UserId}", userId);
                throw;
            }
        }

        public async Task<bool> IsEmailUniqueAsync(string email, Guid? excludeUserId = null)
        {
            try
            {
                var query = _context.Users.Where(u => u.Email.ToLower() == email.ToLower());

                if (excludeUserId.HasValue)
                {
                    query = query.Where(u => u.Id != excludeUserId.Value);
                }

                return !await query.AnyAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking email uniqueness for {Email}", email);
                throw;
            }
        }

        public async Task<bool> IsUserActiveAsync(Guid userId)
        {
            try
            {
                var user = await _context.Users.FindAsync(userId);
                return user?.IsActive ?? false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking if user {UserId} is active", userId);
                throw;
            }
        }

        public async Task<bool> DeleteUserAsync(Guid id)
        {
            try
            {
                var user = await GetUserByIdAsync(id);
                if (user == null)
                    return false;

                _context.Users.Remove(user);
                await _context.SaveChangesAsync();

                _logger.LogInformation("User {UserId} deleted", id);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting user {UserId}", id);
                throw;
            }
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
    }
}