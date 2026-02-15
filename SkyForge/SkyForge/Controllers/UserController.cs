
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SkyForge.Data;
using SkyForge.Dto.CompanyDto;
using SkyForge.Dto.UserDto;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.RoleModel;
using SkyForge.Models.UserModel;
using SkyForge.Services;
using SkyForge.Services.UserServices;
using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;

namespace SkyForge.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly IEmailService _emailService;
        private readonly ApplicationDbContext _context;
        private readonly IJwtService _jwtService;
        private readonly IConfiguration _configuration;
        private readonly ICompanyService _companyService;

        public UserController(
            IUserService userService,
            IEmailService emailService,
            ApplicationDbContext context,
            IJwtService jwtService,
            IConfiguration configuration,
            ICompanyService companyService)
        {
            _userService = userService;
            _emailService = emailService;
            _context = context;
            _jwtService = jwtService;
            _configuration = configuration;
            _companyService = companyService;
        }

        [HttpGet("protected")]
        [Authorize]
        public IActionResult GetProtectedData()
        {
            var userId = User.FindFirst("userId")?.Value;
            var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
            var userName = User.FindFirst(ClaimTypes.Name)?.Value;
            var isAdmin = User.FindFirst("isAdmin")?.Value;

            return Ok(new
            {
                message = "This is protected data!",
                userId,
                userEmail,
                userName,
                isAdmin,
                isAuthenticated = User.Identity?.IsAuthenticated ?? false
            });
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequestDTO request)
        {
            Console.WriteLine($"=== REGISTER REQUEST STARTED ===");

            if (request == null)
            {
                return BadRequest(new
                {
                    errors = new[] { new { msg = "Request body is required" } }
                });
            }

            Console.WriteLine($"Request data: Name={request.Name}, Email={request.Email}, IsAdmin={request.IsAdmin}");

            var validationErrors = new List<object>();

            if (string.IsNullOrWhiteSpace(request.Name))
                validationErrors.Add(new { msg = "Name is required", field = "name" });

            if (string.IsNullOrWhiteSpace(request.Email))
                validationErrors.Add(new { msg = "Email is required", field = "email" });
            else if (!IsValidEmail(request.Email))
                validationErrors.Add(new { msg = "Invalid email format", field = "email" });

            if (string.IsNullOrWhiteSpace(request.Password))
                validationErrors.Add(new { msg = "Password is required", field = "password" });
            else if (request.Password.Length < 6)
                validationErrors.Add(new { msg = "Password must be at least 6 characters", field = "password" });

            if (string.IsNullOrWhiteSpace(request.Password2))
                validationErrors.Add(new { msg = "Password confirmation is required", field = "password2" });
            else if (request.Password != request.Password2)
                validationErrors.Add(new { msg = "Passwords do not match", field = "password2" });

            if (validationErrors.Any())
            {
                Console.WriteLine($"Validation failed: {validationErrors.Count} errors");
                return BadRequest(new { errors = validationErrors });
            }

            try
            {
                var existingUser = await _context.Users
                    .FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email!.ToLower());

                if (existingUser != null)
                {
                    return BadRequest(new
                    {
                        errors = new[] { new { msg = "Email already exists", field = "email" } }
                    });
                }

                // AUTO-ASSIGN ROLE BASED ON isAdmin
                Guid? roleId = null;

                if (request.IsAdmin == true)
                {
                    Console.WriteLine("User is admin, finding Admin role...");
                    var adminRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Admin");

                    if (adminRole == null)
                    {
                        Console.WriteLine("Admin role not found, creating it...");
                        adminRole = new Role
                        {
                            Id = Guid.NewGuid(),
                            Name = "Admin",
                            Description = "Administrator with management permissions",
                            Type = RoleType.System,
                            PermissionLevel = 90,
                            IsSystemRole = true,
                            IsAssignable = true,
                            IsActive = true,
                            DefaultPermissions = new Dictionary<string, bool>()
                        };

                        _context.Roles.Add(adminRole);
                        await _context.SaveChangesAsync();
                        Console.WriteLine($"Created Admin role with ID: {adminRole.Id}");
                    }

                    roleId = adminRole.Id;
                    Console.WriteLine($"Assigning Admin role ID: {roleId}");
                }
                else
                {
                    Console.WriteLine("User is not admin, assigning default User role...");
                    var userRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "User");

                    if (userRole == null)
                    {
                        Console.WriteLine("User role not found, creating it...");
                        userRole = new Role
                        {
                            Id = Guid.NewGuid(),
                            Name = "User",
                            Description = "Regular user with basic access",
                            Type = RoleType.Custom,
                            PermissionLevel = 50,
                            IsSystemRole = true,
                            IsAssignable = true,
                            IsActive = true,
                            DefaultPermissions = new Dictionary<string, bool>()
                        };

                        _context.Roles.Add(userRole);
                        await _context.SaveChangesAsync();
                        Console.WriteLine($"Created User role with ID: {userRole.Id}");
                    }

                    roleId = userRole.Id;
                    Console.WriteLine($"Assigning User role ID: {roleId}");
                }

                var newUser = new User
                {
                    Id = Guid.NewGuid(),
                    Name = request.Name!,
                    Email = request.Email!.ToLower().Trim(),
                    IsAdmin = request.IsAdmin ?? false,
                    IsEmailVerified = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                Console.WriteLine($"Creating user with email: {newUser.Email}");

                // Pass the auto-assigned roleId to CreateUserAsync
                var createdUser = await _userService.CreateUserAsync(newUser, request.Password!, roleId);

                Console.WriteLine($"User created with ID: {createdUser.Id}");

                // Verify role was assigned
                var userWithRoles = await _context.Users
                    .Include(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Id == createdUser.Id);

                var userRolesList = new List<object>();
                if (userWithRoles?.UserRoles != null && userWithRoles.UserRoles.Any())
                {
                    foreach (var userRole in userWithRoles.UserRoles)
                    {
                        Console.WriteLine($"✓ User assigned role: {userRole.Role?.Name} (ID: {userRole.RoleId})");
                        userRolesList.Add(new
                        {
                            roleId = userRole.RoleId,
                            roleName = userRole.Role?.Name,
                            isPrimary = userRole.IsPrimary
                        });
                    }
                }
                else
                {
                    Console.WriteLine("⚠️ Warning: No roles assigned to user");
                }

                try
                {
                    await SendVerificationEmailAsync(createdUser);
                    Console.WriteLine("Verification email sent ✓");
                }
                catch (Exception emailEx)
                {
                    Console.WriteLine($"Warning: Email sending failed: {emailEx.Message}");
                    // Don't fail registration if email fails
                }

                Console.WriteLine("=== REGISTRATION COMPLETED SUCCESSFULLY ===");

                return Ok(new
                {
                    success = true,
                    message = "Registration successful! Please check your email to verify your account.",
                    userId = createdUser.Id,
                    email = createdUser.Email,
                    isAdmin = createdUser.IsAdmin,
                    roles = userRolesList
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"=== REGISTRATION FAILED ===");
                Console.WriteLine($"Error: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");

                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner exception: {ex.InnerException.Message}");
                }

                var errorMessage = ex.Message.ToLower();

                if (errorMessage.Contains("already exists"))
                    return BadRequest(new { errors = new[] { new { msg = "Email already exists" } } });

                if (errorMessage.Contains("password"))
                    return BadRequest(new { errors = new[] { new { msg = "Password validation failed" } } });

                if (errorMessage.Contains("validation"))
                    return BadRequest(new { errors = new[] { new { msg = "Data validation failed" } } });

                if (errorMessage.Contains("role"))
                    return BadRequest(new { errors = new[] { new { msg = "Role assignment failed" } } });

                return StatusCode(500, new
                {
                    errors = new[]
                    {
                        new
                        {
                            msg = "An error occurred during registration",
                            detail = ex.Message,
                            type = ex.GetType().Name
                        }
                    }
                });
            }
        }

        private bool IsValidEmail(string email)
        {
            try
            {
                var addr = new System.Net.Mail.MailAddress(email);
                return addr.Address == email;
            }
            catch
            {
                return false;
            }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var user = await _userService.AuthenticateAsync(request.Email!, request.Password!);
            if (user == null)
                return Unauthorized(new { success = false, error = "Invalid email or password" });

            if (!user.IsEmailVerified)
                return Unauthorized(new { success = false, error = "Please verify your email before logging in" });

            if (!user.IsActive)
                return Unauthorized(new { success = false, error = "Account is deactivated" });

            // Get user's primary role
            var primaryRole = user.UserRoles?.FirstOrDefault(ur => ur.IsPrimary)?.Role;

            // Get user's companies
            var userCompanies = await GetUserCompanies(user.Id);

            // Generate JWT Token
            var token = GenerateJwtToken(user, primaryRole);

            return Ok(new
            {
                success = true,
                token = token,
                user = new
                {
                    id = user.Id,
                    name = user.Name,
                    email = user.Email,
                    role = primaryRole?.Name,
                    roleId = primaryRole?.Id,
                    isAdmin = user.IsAdmin,
                    isEmailVerified = user.IsEmailVerified,
                    preferences = user.Preferences,
                    menuPermissions = user.MenuPermissions
                },
                companies = userCompanies,
                message = "Login successful",
                expiresIn = 3600
            });
        }

        [HttpGet("current")]
        [Authorize]
        public async Task<IActionResult> GetCurrentUser()
        {
            var userIdClaim = User.FindFirst("userId")?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId))
            {
                return Unauthorized(new { success = false, error = "Invalid user token" });
            }

            var user = await _userService.GetUserByIdAsync(userId);
            if (user == null)
                return NotFound(new { success = false, error = "User not found" });

            // Get user's primary role
            var primaryRole = user.UserRoles?.FirstOrDefault(ur => ur.IsPrimary)?.Role;

            // Get user's companies
            var userCompanies = await GetUserCompanies(userId);

            return Ok(new
            {
                success = true,
                user = new
                {
                    id = user.Id,
                    name = user.Name,
                    email = user.Email,
                    role = primaryRole?.Name,
                    roleId = primaryRole?.Id,
                    isAdmin = user.IsAdmin,
                    isEmailVerified = user.IsEmailVerified,
                    preferences = user.Preferences,
                    menuPermissions = user.MenuPermissions
                },
                companies = userCompanies,
                message = "User data retrieved successfully"
            });
        }

        // Helper method to get user companies
        private async Task<List<CompaniesResponseDTO>> GetUserCompanies(Guid userId)
        {
            try
            {
                var companies = new List<Company>();

                // Get user from service to check if admin
                var user = await _userService.GetUserByIdAsync(userId);

                if (user.IsAdmin)
                {
                    // Admin sees all companies they own
                    companies = await _companyService.GetCompaniesByOwnerAsync(userId);
                }
                else
                {
                    // Regular users see companies they're associated with
                    companies = await _companyService.GetCompaniesByUserAsync(userId);
                }

                // Map to DTO
                return companies.Select(c => MapToCompanyResponseDTO(c)).ToList();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting user companies: {ex.Message}");
                return new List<CompaniesResponseDTO>();
            }
        }

        // Add this method to UserController
        private CompaniesResponseDTO MapToCompanyResponseDTO(Company company)
        {
            return new CompaniesResponseDTO
            {
                Id = company.Id,
                Name = company.Name,
                Address = company.Address,
                Country = company.Country,
                State = company.State,
                City = company.City,
                Pan = company.Pan,
                Phone = company.Phone,
                Ward = company.Ward,
                Email = company.Email,
                TradeType = company.TradeType.ToString(),
                DateFormat = company.DateFormat?.ToString() ?? "English",
                VatEnabled = company.VatEnabled,
                StoreManagement = company.StoreManagement,
                RenewalDate = company.RenewalDate,
                FiscalYearStartDate = company.FiscalYearStartDate,
                CreatedAt = company.CreatedAt,
                UpdatedAt = company.UpdatedAt,
                NotificationEmails = company.NotificationEmails ?? new(),
                AttendanceSettings = company.AttendanceSettings != null
                    ? new CompanyAttendanceSettingsDTO
                    {
                        GeoFencingEnabled = company.AttendanceSettings.GeoFencingEnabled,
                        OfficeLocations = company.AttendanceSettings.OfficeLocations?.Select(l => new OfficeLocationDTO
                        {
                            Name = l.Name,
                            Coordinates = new CoordinatesDTO
                            {
                                Lat = l.Coordinates?.Lat,
                                Lng = l.Coordinates?.Lng
                            },
                            Radius = l.Radius,
                            Address = l.Address,
                            IsActive = l.IsActive
                        }).ToList() ?? new(),
                        WorkingHours = new WorkingHoursDTO
                        {
                            StartTime = company.AttendanceSettings.WorkingHours?.StartTime ?? "09:00",
                            EndTime = company.AttendanceSettings.WorkingHours?.EndTime ?? "17:00",
                            GracePeriod = company.AttendanceSettings.WorkingHours?.GracePeriod ?? 15
                        },
                        AutoClockOut = new AutoClockOutSettingsDTO
                        {
                            Enabled = company.AttendanceSettings.AutoClockOut?.Enabled ?? false,
                            Time = company.AttendanceSettings.AutoClockOut?.Time ?? "18:00"
                        }
                    }
                    : new CompanyAttendanceSettingsDTO(),
                OwnerId = company.OwnerId,
                OwnerName = company.Owner?.Name,
                OwnerEmail = company.Owner?.Email
            };
        }

        private string GenerateJwtToken(User user, Role? primaryRole = null)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, user.Name),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim("userId", user.Id.ToString()),
                new Claim("isAdmin", user.IsAdmin.ToString()),
                new Claim("isEmailVerified", user.IsEmailVerified.ToString())
            };

            // Add role claim if exists
            if (primaryRole != null)
            {
                claims.Add(new Claim(ClaimTypes.Role, primaryRole.Name));
                claims.Add(new Claim("roleId", primaryRole.Id.ToString()));
            }

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var expires = DateTime.UtcNow.AddMinutes(
                Convert.ToDouble(_configuration["Jwt:ExpireMinutes"] ?? "60"));

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: expires,
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        [HttpPost("logout")]
        [Authorize]
        public IActionResult Logout()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;

                Console.WriteLine($"User logout: ID={userId}, Email={userEmail}");

                var response = new LogoutResponseDTO
                {
                    Success = true,
                    Message = "Logged out successfully. Please clear your token on the client side.",
                    LoggedOutAt = DateTime.UtcNow
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Logout error: {ex}");

                var errorResponse = new LogoutResponseDTO
                {
                    Success = false,
                    Message = $"Error during logout: {ex.Message}",
                    LoggedOutAt = DateTime.UtcNow
                };

                return StatusCode(500, errorResponse);
            }
        }

        [HttpPost("verify-email")]
        public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest request)
        {
            var result = await _userService.VerifyEmailAsync(request.Token!);
            if (!result)
                return BadRequest(new { error = "Invalid or expired verification token" });

            return Ok(new { success = true, message = "Email verified successfully!" });
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            try
            {
                var token = await _userService.GeneratePasswordResetTokenAsync(request.Email!);
                await SendPasswordResetEmailAsync(request.Email!, token);

                return Ok(new
                {
                    success = true,
                    message = "Password reset email sent"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            var errors = ValidatePasswordReset(request);
            if (errors.Count > 0)
                return BadRequest(new { errors });

            var result = await _userService.ResetPasswordAsync(request.Token!, request.Password!);
            if (!result)
                return BadRequest(new { error = "Invalid or expired token" });

            return Ok(new { success = true, message = "Password reset successfully" });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetUser(Guid id)
        {
            var user = await _userService.GetUserByIdAsync(id);
            if (user == null)
                return NotFound();

            return Ok(user);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UpdateUserRequest request)
        {
            try
            {
                var user = new User
                {
                    Name = request.Name,
                    Email = request.Email,
                    IsAdmin = request.IsAdmin
                };

                var updatedUser = await _userService.UpdateUserAsync(id, user);
                return Ok(updatedUser);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost("{id}/change-password")]
        public async Task<IActionResult> ChangePassword(Guid id, [FromBody] ChangePasswordRequest request)
        {
            var result = await _userService.ChangePasswordAsync(id, request.CurrentPassword!, request.NewPassword!);
            if (!result)
                return BadRequest(new { error = "Current password is incorrect" });

            return Ok(new { success = true, message = "Password changed successfully" });
        }

        [HttpPut("{id}/permissions")]
        public async Task<IActionResult> UpdatePermissions(Guid id, [FromBody] UpdatePermissionsRequest request)
        {
            try
            {
                var permissions = await _userService.UpdateMenuPermissionsAsync(id, request.Permissions!, request.GrantedById);
                return Ok(new { permissions, message = "Permissions updated successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPut("{id}/preferences")]
        public async Task<IActionResult> UpdatePreferences(Guid id, [FromBody] UserPreferences preferences)
        {
            try
            {
                var user = await _userService.UpdateUserPreferencesAsync(id, preferences);
                return Ok(new { preferences = user.Preferences, message = "Preferences updated successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // Helper Methods
        private List<object> ValidateRegistration(RegisterRequest request)
        {
            var errors = new List<object>();

            if (string.IsNullOrEmpty(request.Name))
                errors.Add(new { msg = "Please fill in name field", field = "name" });

            if (string.IsNullOrEmpty(request.Email))
                errors.Add(new { msg = "Please fill in email field", field = "email" });
            else if (!new EmailAddressAttribute().IsValid(request.Email))
                errors.Add(new { msg = "Invalid email address", field = "email" });

            if (string.IsNullOrEmpty(request.Password))
                errors.Add(new { msg = "Please fill in password field", field = "password" });

            if (string.IsNullOrEmpty(request.Password2))
                errors.Add(new { msg = "Please fill in confirm password field", field = "password2" });

            if (request.Password != request.Password2)
                errors.Add(new { msg = "Passwords do not match", field = "password2" });

            if (request.Password!.Length < 6)
                errors.Add(new { msg = "Password should be at least 6 characters", field = "password" });

            return errors;
        }

        private List<object> ValidatePasswordReset(ResetPasswordRequest request)
        {
            var errors = new List<object>();

            if (string.IsNullOrEmpty(request.Password))
                errors.Add(new { msg = "Please fill in password field" });

            if (string.IsNullOrEmpty(request.Password2))
                errors.Add(new { msg = "Please fill in confirm password field" });

            if (request.Password != request.Password2)
                errors.Add(new { msg = "Passwords do not match" });

            if (request.Password!.Length < 6)
                errors.Add(new { msg = "Password should be at least 6 characters" });

            return errors;
        }

        private async Task SendVerificationEmailAsync(User user)
        {
            var token = await _userService.GenerateEmailVerificationTokenAsync(user.Id);
            var verificationLink = $"{Request.Scheme}://{Request.Host}/api/user/verify-email?token={token}";

            var emailBody = $@"
                <h1>Verify Your Email</h1>
                <p>Hello {user.Name},</p>
                <p>Please click the link below to verify your email address:</p>
                <a href='{verificationLink}'>Verify Email</a>
                <p>This link will expire in 24 hours.</p>
                <p>If you didn't create an account, you can ignore this email.</p>
            ";

            await _emailService.SendEmailAsync(user.Email, "Verify Your Email - SkyForge", emailBody);
        }

        private async Task SendPasswordResetEmailAsync(string email, string token)
        {
            var resetLink = $"{Request.Scheme}://{Request.Host}/reset-password?token={token}";

            var emailBody = $@"
                <h1>Reset Your Password</h1>
                <p>You requested a password reset. Click the link below to reset your password:</p>
                <a href='{resetLink}'>Reset Password</a>
                <p>This link will expire in 10 minutes.</p>
                <p>If you didn't request a password reset, please ignore this email.</p>
            ";

            await _emailService.SendEmailAsync(email, "Reset Your Password - SkyForge", emailBody);
        }
    }

    // Request DTOs
    public class RegisterRequest
    {
        public required string Name { get; set; }
        public required string Email { get; set; }
        public required string Password { get; set; }
        public required string Password2 { get; set; }
        public bool? IsAdmin { get; set; }
        public Guid? RoleId { get; set; }
    }

    public class LoginRequest
    {
        public required string Email { get; set; }
        public required string Password { get; set; }
    }

    public class VerifyEmailRequest
    {
        public required string Token { get; set; }
    }

    public class ForgotPasswordRequest
    {
        public required string Email { get; set; }
    }

    public class ResetPasswordRequest
    {
        public required string Token { get; set; }
        public required string Password { get; set; }
        public required string Password2 { get; set; }
    }

    public class UpdateUserRequest
    {
        public string? Name { get; set; }
        public string? Email { get; set; }
        public bool IsAdmin { get; set; }
    }

    public class ChangePasswordRequest
    {
        public required string CurrentPassword { get; set; }
        public required string NewPassword { get; set; }
        public required string ConfirmPassword { get; set; }
    }

    public class UpdatePermissionsRequest
    {
        public required Dictionary<string, bool> Permissions { get; set; }
        public Guid GrantedById { get; set; }
    }

    public class LogoutResponseDTO
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime LoggedOutAt { get; set; }
    }
}
