
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SkyForge.Data;
using SkyForge.Dto.CompanyDto;
using SkyForge.Dto.RetailerDto;
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
        private readonly IPasswordService _passwordService;
        private readonly ILogger<UserController> _logger;

        public UserController(
            IUserService userService,
            IEmailService emailService,
            ApplicationDbContext context,
            IJwtService jwtService,
            IConfiguration configuration,
            ICompanyService companyService,
            IPasswordService passwordService,
            ILogger<UserController> logger)
        {
            _userService = userService;
            _emailService = emailService;
            _context = context;
            _jwtService = jwtService;
            _configuration = configuration;
            _companyService = companyService;
            _passwordService = passwordService;
            _logger = logger;
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

        // GET: api/user/admin/users/list
        [HttpGet("admin/users/list")]
        public async Task<IActionResult> GetUsersList()
        {
            try
            {
                _logger.LogInformation("=== GetUsersList Started ===");

                // Extract claims from JWT token
                var currentUserIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var tokenCompanyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;
                var userRoleClaim = User.FindFirst(ClaimTypes.Role)?.Value;
                var isAdminClaim = User.FindFirst("isAdmin")?.Value;

                // Validate user ID
                if (string.IsNullOrEmpty(currentUserIdClaim) || !Guid.TryParse(currentUserIdClaim, out Guid currentUserId))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token. Please login again." });
                }

                // Get company ID from claim
                if (string.IsNullOrEmpty(tokenCompanyId) || !Guid.TryParse(tokenCompanyId, out Guid companyId))
                {
                    return BadRequest(new { success = false, error = "No company selected. Please select a company first." });
                }

                _logger.LogInformation($"Current User ID: {currentUserId}, Company ID: {companyId}");

                // Get current user to check permissions
                var currentUser = await _userService.GetUserByIdAsync(currentUserId);
                if (currentUser == null)
                {
                    return Unauthorized(new { success = false, error = "User not found" });
                }

                // Authorization check
                var isAdmin = currentUser.IsAdmin;
                var isSupervisor = await _userService.UserHasRoleAsync(currentUserId, "Supervisor");

                if (!isAdmin && !isSupervisor)
                {
                    return StatusCode(403, new { success = false, error = "You do not have permission to view this page" });
                }

                // Get company details with owner
                var company = await _context.Companies
                    .Include(c => c.Owner)
                    .Include(c => c.FiscalYears)
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                if (company == null)
                {
                    return NotFound(new { success = false, error = "Company not found" });
                }

                // Handle fiscal year
                FiscalYearDTO currentFiscalYear = null;
                Guid? fiscalYearId = null;

                // Try from claim first
                if (!string.IsNullOrEmpty(fiscalYearIdClaim) && Guid.TryParse(fiscalYearIdClaim, out Guid claimFyId))
                {
                    var fiscalYear = company.FiscalYears?.FirstOrDefault(f => f.Id == claimFyId);
                    if (fiscalYear != null)
                    {
                        currentFiscalYear = new FiscalYearDTO
                        {
                            Id = fiscalYear.Id,
                            StartDate = fiscalYear.StartDate,
                            EndDate = fiscalYear.EndDate,
                            Name = fiscalYear.Name,
                            DateFormat = fiscalYear.DateFormat?.ToString() ?? "English",
                            IsActive = fiscalYear.IsActive
                        };
                        fiscalYearId = fiscalYear.Id;
                    }
                }

                // If no fiscal year in claim, get active one
                if (currentFiscalYear == null && company.FiscalYears != null)
                {
                    var activeFiscalYear = company.FiscalYears.FirstOrDefault(f => f.IsActive);
                    if (activeFiscalYear == null)
                    {
                        activeFiscalYear = company.FiscalYears.OrderByDescending(f => f.StartDate).FirstOrDefault();
                    }

                    if (activeFiscalYear != null)
                    {
                        currentFiscalYear = new FiscalYearDTO
                        {
                            Id = activeFiscalYear.Id,
                            StartDate = activeFiscalYear.StartDate,
                            EndDate = activeFiscalYear.EndDate,
                            Name = activeFiscalYear.Name,
                            DateFormat = activeFiscalYear.DateFormat?.ToString() ?? "English",
                            IsActive = activeFiscalYear.IsActive
                        };
                        fiscalYearId = activeFiscalYear.Id;
                    }
                }

                if (fiscalYearId == null)
                {
                    return BadRequest(new { success = false, error = "No fiscal year found for this company." });
                }

                // Get all users associated with this company
                var companyUsers = await _context.Users
                    .Where(u => u.AccessibleCompanies.Any(c => c.Id == companyId) || u.OwnedCompanies.Any(c => c.Id == companyId))
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .ToListAsync();

                var userList = new List<UserListItemDTO>();

                foreach (var user in companyUsers)
                {
                    // Get user's primary role
                    var primaryRole = user.UserRoles?.FirstOrDefault(ur => ur.IsPrimary)?.Role;
                    var userRole = primaryRole?.Name ?? "User";

                    userList.Add(new UserListItemDTO
                    {
                        Id = user.Id,
                        Name = user.Name,
                        Email = user.Email,
                        Role = userRole,
                        IsActive = user.IsActive,
                        IsEmailVerified = user.IsEmailVerified,
                        IsOwner = company.OwnerId == user.Id,
                        Preferences = new UserPreferencesDTO
                        {
                            Theme = user.Preferences?.Theme.ToString() ?? "Light"
                        },
                        LastLogin = null, // Add last login tracking if you have it
                        CreatedAt = user.CreatedAt
                    });
                }

                // Ensure owner is included and marked as owner
                if (company.Owner != null)
                {
                    var ownerExists = userList.Any(u => u.Id == company.Owner.Id);
                    if (!ownerExists)
                    {
                        var ownerRole = company.Owner.UserRoles?.FirstOrDefault(ur => ur.IsPrimary)?.Role;
                        userList.Add(new UserListItemDTO
                        {
                            Id = company.Owner.Id,
                            Name = company.Owner.Name,
                            Email = company.Owner.Email,
                            Role = ownerRole?.Name ?? "Admin",
                            IsActive = company.Owner.IsActive,
                            IsEmailVerified = company.Owner.IsEmailVerified,
                            IsOwner = true,
                            Preferences = new UserPreferencesDTO
                            {
                                Theme = company.Owner.Preferences?.Theme.ToString() ?? "Light"
                            },
                            CreatedAt = company.Owner.CreatedAt
                        });
                    }
                    else
                    {
                        // Mark existing user as owner
                        var ownerInList = userList.FirstOrDefault(u => u.Id == company.Owner.Id);
                        if (ownerInList != null)
                        {
                            ownerInList.IsOwner = true;
                        }
                    }
                }

                // Sort users with owner first
                var sortedUsers = userList.OrderByDescending(u => u.IsOwner).ThenBy(u => u.Name).ToList();

                // Get current user's theme preference
                var currentUserTheme = currentUser.Preferences?.Theme.ToString() ?? "light";

                // Prepare response
                var response = new
                {
                    success = true,
                    data = new
                    {
                        company = new
                        {
                            id = company.Id,
                            renewalDate = company.RenewalDate,
                            dateFormat = company.DateFormat?.ToString() ?? "English",
                            owner = company.Owner != null ? new
                            {
                                id = company.Owner.Id,
                                name = company.Owner.Name,
                                email = company.Owner.Email,
                                role = company.Owner.UserRoles?.FirstOrDefault(ur => ur.IsPrimary)?.Role?.Name ?? "Admin"
                            } : null
                        },
                        currentFiscalYear = currentFiscalYear != null ? new
                        {
                            id = currentFiscalYear.Id,
                            startDate = currentFiscalYear.StartDate,
                            endDate = currentFiscalYear.EndDate,
                            name = currentFiscalYear.Name,
                            dateFormat = currentFiscalYear.DateFormat,
                            isActive = currentFiscalYear.IsActive
                        } : null,
                        users = sortedUsers.Select(u => new
                        {
                            id = u.Id,
                            name = u.Name,
                            email = u.Email,
                            role = u.Role,
                            isActive = u.IsActive,
                            isEmailVerified = u.IsEmailVerified,
                            isOwner = u.IsOwner,
                            preferences = u.Preferences,
                            lastLogin = u.LastLogin,
                            createdAt = u.CreatedAt
                        }),
                        currentCompanyName = company.Name,
                        currentUser = new
                        {
                            id = currentUser.Id,
                            name = currentUser.Name,
                            role = currentUser.UserRoles?.FirstOrDefault(ur => ur.IsPrimary)?.Role?.Name ?? "User",
                            isAdmin = currentUser.IsAdmin,
                            theme = currentUserTheme
                        },
                        isAdminOrSupervisor = isAdmin || isSupervisor
                    }
                };

                _logger.LogInformation($"Successfully fetched {sortedUsers.Count} users for company {company.Name}");
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetUsersList");
                return StatusCode(500, new
                {
                    success = false,
                    error = "An error occurred while fetching users",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/user/admin/users/view/{id}
        // [HttpGet("admin/users/view/{id}")]
        // public async Task<IActionResult> GetUserDetailsForAdmin(Guid id, [FromQuery] Guid companyId)
        // {
        //     try
        //     {
        //         _logger.LogInformation("=== GetUserDetailsForAdmin Started ===");
        //         _logger.LogInformation($"Target User ID: {id}, Company ID: {companyId}");

        //         // Extract claims from JWT token
        //         var currentUserIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        //         var tokenCompanyId = User.FindFirst("currentCompany")?.Value;
        //         var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
        //         var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

        //         // Validate user ID
        //         if (string.IsNullOrEmpty(currentUserIdClaim) || !Guid.TryParse(currentUserIdClaim, out Guid currentUserId))
        //         {
        //             return Unauthorized(new { success = false, error = "Invalid user token. Please login again." });
        //         }

        //         // Use companyId from query param or from token claim
        //         Guid effectiveCompanyId;
        //         if (companyId != Guid.Empty)
        //         {
        //             effectiveCompanyId = companyId;
        //         }
        //         else if (!string.IsNullOrEmpty(tokenCompanyId) && Guid.TryParse(tokenCompanyId, out Guid claimCompanyId))
        //         {
        //             effectiveCompanyId = claimCompanyId;
        //         }
        //         else
        //         {
        //             return BadRequest(new { success = false, error = "No company selected. Please select a company first." });
        //         }

        //         _logger.LogInformation($"Current User ID: {currentUserId}, Effective Company ID: {effectiveCompanyId}");

        //         // Get current user with roles
        //         var currentUser = await _userService.GetUserByIdAsync(currentUserId);
        //         if (currentUser == null)
        //         {
        //             return Unauthorized(new { success = false, error = "User not found" });
        //         }

        //         // Check if user has access to the company
        //         var hasAccess = await _userService.UserHasAccessToCompanyAsync(currentUserId, effectiveCompanyId);
        //         if (!hasAccess)
        //         {
        //             return StatusCode(403, new { success = false, error = "You do not have access to this company" });
        //         }

        //         // Check if user is Admin or Supervisor
        //         var isAdmin = currentUser.IsAdmin;
        //         var isSupervisor = await _userService.UserHasRoleAsync(currentUserId, "Supervisor");

        //         if (!isAdmin && !isSupervisor)
        //         {
        //             return StatusCode(403, new { success = false, error = "You do not have permission to view this page" });
        //         }

        //         // Get company details with fiscal years
        //         var company = await _context.Companies
        //             .Include(c => c.FiscalYears)  // Include the fiscal years collection
        //             .FirstOrDefaultAsync(c => c.Id == effectiveCompanyId);

        //         if (company == null)
        //         {
        //             return NotFound(new { success = false, error = "Company not found" });
        //         }

        //         // Get fiscal year - from claim first, then get active one from company's fiscal years
        //         FiscalYearDTO currentFiscalYear = null;
        //         Guid? fiscalYearId = null;

        //         // Try from claim first
        //         if (!string.IsNullOrEmpty(fiscalYearIdClaim) && Guid.TryParse(fiscalYearIdClaim, out Guid claimFyId))
        //         {
        //             var fiscalYear = company.FiscalYears?.FirstOrDefault(f => f.Id == claimFyId);
        //             if (fiscalYear != null)
        //             {
        //                 currentFiscalYear = new FiscalYearDTO
        //                 {
        //                     Id = fiscalYear.Id,
        //                     StartDate = fiscalYear.StartDate,
        //                     EndDate = fiscalYear.EndDate,
        //                     Name = fiscalYear.Name,
        //                     DateFormat = fiscalYear.DateFormat?.ToString() ?? "English",
        //                     IsActive = fiscalYear.IsActive
        //                 };
        //                 fiscalYearId = fiscalYear.Id;
        //             }
        //         }

        //         // If no fiscal year in claim, get the active fiscal year from company's collection
        //         if (currentFiscalYear == null && company.FiscalYears != null)
        //         {
        //             var activeFiscalYear = company.FiscalYears.FirstOrDefault(f => f.IsActive);

        //             // If no active, get the most recent one
        //             if (activeFiscalYear == null)
        //             {
        //                 activeFiscalYear = company.FiscalYears
        //                     .OrderByDescending(f => f.StartDate)
        //                     .FirstOrDefault();
        //             }

        //             if (activeFiscalYear != null)
        //             {
        //                 currentFiscalYear = new FiscalYearDTO
        //                 {
        //                     Id = activeFiscalYear.Id,
        //                     StartDate = activeFiscalYear.StartDate,
        //                     EndDate = activeFiscalYear.EndDate,
        //                     Name = activeFiscalYear.Name,
        //                     DateFormat = activeFiscalYear.DateFormat?.ToString() ?? "English",
        //                     IsActive = activeFiscalYear.IsActive
        //                 };
        //                 fiscalYearId = activeFiscalYear.Id;
        //             }
        //         }

        //         if (fiscalYearId == null)
        //         {
        //             return BadRequest(new { success = false, error = "No fiscal year found for this company." });
        //         }

        //         // Fetch the target user
        //         var targetUser = await _userService.GetUserByIdAsync(id);
        //         if (targetUser == null)
        //         {
        //             return NotFound(new { success = false, error = "User not found." });
        //         }

        //         // Get user's primary role
        //         var primaryRole = targetUser.PrimaryRole;
        //         var userRole = primaryRole?.Name ?? "User";

        //         // Get company name from claim or company
        //         var currentCompanyName = User.FindFirst("currentCompanyName")?.Value ?? company.Name;

        //         // Get fiscal year reference for company response (active or first one)
        //         var companyFiscalYearRef = company.FiscalYears?.FirstOrDefault(f => f.IsActive) ?? company.FiscalYears?.FirstOrDefault();

        //         // Build the response matching the frontend expected structure
        //         var response = new
        //         {
        //             success = true,
        //             data = new
        //             {
        //                 company = new
        //                 {
        //                     renewalDate = company.RenewalDate,
        //                     fiscalYear = companyFiscalYearRef != null ? new
        //                     {
        //                         id = companyFiscalYearRef.Id,
        //                         name = companyFiscalYearRef.Name,
        //                         startDate = companyFiscalYearRef.StartDate,
        //                         endDate = companyFiscalYearRef.EndDate
        //                     } : null,
        //                     dateFormat = company.DateFormat?.ToString() ?? "English"
        //                 },
        //                 currentFiscalYear = currentFiscalYear != null ? new
        //                 {
        //                     id = currentFiscalYear.Id,
        //                     startDate = currentFiscalYear.StartDate,
        //                     endDate = currentFiscalYear.EndDate,
        //                     name = currentFiscalYear.Name,
        //                     dateFormat = currentFiscalYear.DateFormat,
        //                     isActive = currentFiscalYear.IsActive
        //                 } : null,
        //                 user = new
        //                 {
        //                     id = targetUser.Id,
        //                     name = targetUser.Name,
        //                     email = targetUser.Email,
        //                     role = userRole,
        //                     isActive = targetUser.IsActive,
        //                     preferences = new
        //                     {
        //                         theme = targetUser.Preferences?.Theme.ToString() ?? "Light"
        //                     },
        //                     lastLogin = (DateTime?)null,
        //                     createdAt = targetUser.CreatedAt,
        //                     updatedAt = targetUser.UpdatedAt
        //                 },
        //                 currentCompanyName = currentCompanyName,
        //                 isAdminOrSupervisor = isAdmin || isSupervisor
        //             }
        //         };

        //         _logger.LogInformation($"Successfully fetched user details for User ID: {id}");
        //         return Ok(response);
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error in GetUserDetailsForAdmin for User ID: {UserId}", id);
        //         return StatusCode(500, new
        //         {
        //             success = false,
        //             error = "An error occurred while fetching user details.",
        //             details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
        //         });
        //     }
        // }

        // GET: api/user/admin/create-user/new
        [HttpGet("admin/create-user/new")]
        public async Task<IActionResult> GetCreateUserFormData([FromQuery] Guid? companyId = null)
        {
            try
            {
                _logger.LogInformation("=== GetCreateUserFormData Started ===");

                // Extract claims from JWT token
                var currentUserIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                // Validate user ID
                if (string.IsNullOrEmpty(currentUserIdClaim) || !Guid.TryParse(currentUserIdClaim, out Guid currentUserId))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token. Please login again." });
                }

                // Get company ID - first from query, then from claim, then from user's first company
                Guid companyIdGuid;

                if (companyId.HasValue && companyId.Value != Guid.Empty)
                {
                    companyIdGuid = companyId.Value;
                }
                else
                {
                    // Try to get from claim
                    var tokenCompanyId = User.FindFirst("currentCompany")?.Value;
                    if (!string.IsNullOrEmpty(tokenCompanyId) && Guid.TryParse(tokenCompanyId, out Guid claimCompanyId))
                    {
                        companyIdGuid = claimCompanyId;
                    }
                    else
                    {
                        // Get user's first accessible company
                        var userCompanies = await _userService.GetUserCompaniesAsync(currentUserId);
                        var firstCompany = userCompanies.FirstOrDefault();
                        if (firstCompany == null)
                        {
                            return BadRequest(new { success = false, error = "No company associated with your account. Please contact administrator." });
                        }
                        companyIdGuid = firstCompany.Id;
                    }
                }

                _logger.LogInformation($"Current User ID: {currentUserId}, Company ID: {companyIdGuid}");

                // Get current user to check permissions
                var currentUser = await _userService.GetUserByIdAsync(currentUserId);
                if (currentUser == null)
                {
                    return Unauthorized(new { success = false, error = "User not found" });
                }

                // Authorization check
                var isAdmin = currentUser.IsAdmin;
                var isSupervisor = await _userService.UserHasRoleAsync(currentUserId, "Supervisor");

                if (!isAdmin && !isSupervisor)
                {
                    return StatusCode(403, new { success = false, error = "You do not have permission to access this page" });
                }

                // Get company details
                var company = await _context.Companies
                    .Include(c => c.FiscalYears)
                    .FirstOrDefaultAsync(c => c.Id == companyIdGuid);

                if (company == null)
                {
                    return NotFound(new { success = false, error = "Company not found" });
                }

                // Get fiscal year - from query or claim or active
                Guid? fiscalYearId = null;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;

                if (!string.IsNullOrEmpty(fiscalYearIdClaim) && Guid.TryParse(fiscalYearIdClaim, out Guid claimFyId))
                {
                    fiscalYearId = claimFyId;
                }

                FiscalYearDTO currentFiscalYear = null;

                if (fiscalYearId.HasValue)
                {
                    var fiscalYear = company.FiscalYears?.FirstOrDefault(f => f.Id == fiscalYearId.Value);
                    if (fiscalYear != null)
                    {
                        currentFiscalYear = new FiscalYearDTO
                        {
                            Id = fiscalYear.Id,
                            StartDate = fiscalYear.StartDate,
                            EndDate = fiscalYear.EndDate,
                            Name = fiscalYear.Name,
                            DateFormat = fiscalYear.DateFormat?.ToString() ?? "English",
                            IsActive = fiscalYear.IsActive
                        };
                    }
                }

                // If no fiscal year found, get active one
                if (currentFiscalYear == null && company.FiscalYears != null)
                {
                    var activeFiscalYear = company.FiscalYears.FirstOrDefault(f => f.IsActive);
                    if (activeFiscalYear == null)
                    {
                        activeFiscalYear = company.FiscalYears.OrderByDescending(f => f.StartDate).FirstOrDefault();
                    }

                    if (activeFiscalYear != null)
                    {
                        currentFiscalYear = new FiscalYearDTO
                        {
                            Id = activeFiscalYear.Id,
                            StartDate = activeFiscalYear.StartDate,
                            EndDate = activeFiscalYear.EndDate,
                            Name = activeFiscalYear.Name,
                            DateFormat = activeFiscalYear.DateFormat?.ToString() ?? "English",
                            IsActive = activeFiscalYear.IsActive
                        };
                    }
                }

                // Get available roles (only assignable roles)
                var availableRoles = await _context.Roles
                    .Where(r => r.IsActive && r.IsAssignable)
                    .Select(r => new { r.Id, r.Name, r.Description })
                    .ToListAsync();

                // Prepare response
                var response = new
                {
                    success = true,
                    data = new
                    {
                        company = new
                        {
                            id = company.Id,
                            renewalDate = company.RenewalDate,
                            dateFormat = company.DateFormat?.ToString() ?? "English",
                            fiscalYear = company.FiscalYears != null && company.FiscalYears.Any() ? new
                            {
                                id = company.FiscalYears.First().Id,
                                name = company.FiscalYears.First().Name,
                                startDate = company.FiscalYears.First().StartDate,
                                endDate = company.FiscalYears.First().EndDate,
                                isActive = company.FiscalYears.First().IsActive
                            } : null
                        },
                        currentFiscalYear = currentFiscalYear,
                        currentCompanyName = company.Name,
                        availableRoles = availableRoles,
                        currentUser = new
                        {
                            id = currentUser.Id,
                            name = currentUser.Name,
                            role = currentUser.UserRoles?.FirstOrDefault(ur => ur.IsPrimary)?.Role?.Name ?? "User",
                            isAdmin = currentUser.IsAdmin,
                            theme = currentUser.Preferences?.Theme.ToString() ?? "light"
                        },
                        isAdminOrSupervisor = isAdmin || isSupervisor
                    }
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCreateUserFormData");
                return StatusCode(500, new
                {
                    success = false,
                    error = "An error occurred while loading user creation form",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // POST: api/user/admin/create-user
        [HttpPost("admin/create-user")]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserRequestDTO request)
        {
            try
            {
                _logger.LogInformation("=== CreateUser Started ===");
                _logger.LogInformation($"Creating user with email: {request.Email}, Name: {request.Name}, Role: {request.Role}");

                // Extract claims from JWT token
                var currentUserIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var tokenCompanyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;

                // Validate user ID
                if (string.IsNullOrEmpty(currentUserIdClaim) || !Guid.TryParse(currentUserIdClaim, out Guid currentUserId))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token. Please login again." });
                }

                // Get company ID from claim
                if (string.IsNullOrEmpty(tokenCompanyId) || !Guid.TryParse(tokenCompanyId, out Guid companyId))
                {
                    return BadRequest(new { success = false, error = "No company selected. Please select a company first." });
                }

                // Get current user to check permissions
                var currentUser = await _userService.GetUserByIdAsync(currentUserId);
                if (currentUser == null)
                {
                    return Unauthorized(new { success = false, error = "User not found" });
                }

                // Authorization check
                var isAdmin = currentUser.IsAdmin;
                var isSupervisor = await _userService.UserHasRoleAsync(currentUserId, "Supervisor");

                if (!isAdmin && !isSupervisor)
                {
                    return StatusCode(403, new { success = false, error = "You do not have permission to create users" });
                }

                // Validation list
                var errors = new List<ValidationErrorDTO>();

                // Validate required fields
                if (string.IsNullOrWhiteSpace(request.Name))
                {
                    errors.Add(new ValidationErrorDTO { Field = "name", Msg = "Name is required" });
                }

                if (string.IsNullOrWhiteSpace(request.Email))
                {
                    errors.Add(new ValidationErrorDTO { Field = "email", Msg = "Email is required" });
                }
                else if (!IsValidEmail(request.Email))
                {
                    errors.Add(new ValidationErrorDTO { Field = "email", Msg = "Invalid email format" });
                }

                if (string.IsNullOrWhiteSpace(request.Password))
                {
                    errors.Add(new ValidationErrorDTO { Field = "password", Msg = "Password is required" });
                }

                if (string.IsNullOrWhiteSpace(request.Password2))
                {
                    errors.Add(new ValidationErrorDTO { Field = "password2", Msg = "Please confirm your password" });
                }

                // Validate password match
                if (!string.IsNullOrWhiteSpace(request.Password) && !string.IsNullOrWhiteSpace(request.Password2))
                {
                    if (request.Password != request.Password2)
                    {
                        errors.Add(new ValidationErrorDTO { Field = "password2", Msg = "Passwords do not match" });
                    }
                }

                // Validate password length
                if (!string.IsNullOrWhiteSpace(request.Password) && request.Password.Length < 5)
                {
                    errors.Add(new ValidationErrorDTO { Field = "password", Msg = "Password must be at least 5 characters" });
                }

                // Check if user already exists
                if (!string.IsNullOrWhiteSpace(request.Email))
                {
                    var existingUser = await _userService.GetUserByEmailAsync(request.Email);
                    if (existingUser != null)
                    {
                        errors.Add(new ValidationErrorDTO { Field = "email", Msg = "User with this email already exists" });
                    }
                }

                // If there are validation errors, return them
                if (errors.Any())
                {
                    return BadRequest(new
                    {
                        success = false,
                        errors = errors,
                        formData = new
                        {
                            name = request.Name,
                            email = request.Email,
                            role = request.Role
                        }
                    });
                }

                // Get the role
                var roleEntity = await _context.Roles
                    .FirstOrDefaultAsync(r => r.Name == request.Role && r.IsActive && r.IsAssignable);

                if (roleEntity == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        errors = new List<ValidationErrorDTO>
                {
                    new ValidationErrorDTO { Field = "role", Msg = $"Role '{request.Role}' not found or not assignable" }
                }
                    });
                }

                // Get fiscal year
                Guid fiscalYearId;
                if (!string.IsNullOrEmpty(fiscalYearIdClaim) && Guid.TryParse(fiscalYearIdClaim, out Guid claimFyId))
                {
                    fiscalYearId = claimFyId;
                }
                else
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyId && f.IsActive);

                    if (activeFiscalYear == null)
                    {
                        return BadRequest(new { success = false, error = "No fiscal year found for this company" });
                    }
                    fiscalYearId = activeFiscalYear.Id;
                }

                // Create new user
                var newUser = new User
                {
                    Id = Guid.NewGuid(),
                    Name = request.Name.Trim(),
                    Email = request.Email.Trim().ToLower(),
                    IsAdmin = request.Role == "Admin",
                    IsActive = true,
                    IsEmailVerified = false,
                    FiscalYearId = fiscalYearId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                // Create user with password and role
                var createdUser = await _userService.CreateUserAsync(newUser, request.Password, roleEntity.Id, currentUserId);

                // CRITICAL: Add user to the company through the many-to-many relationship
                // Get the company
                var company = await _context.Companies
                    .Include(c => c.Users)
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                if (company != null)
                {
                    // Add user to company's Users collection
                    if (!company.Users.Any(u => u.Id == createdUser.Id))
                    {
                        company.Users.Add(createdUser);
                        await _context.SaveChangesAsync();
                        _logger.LogInformation($"User {createdUser.Email} added to company {company.Name}");
                    }
                }

                // Also update user's AccessibleCompanies collection (bidirectional)
                if (createdUser.AccessibleCompanies == null)
                {
                    createdUser.AccessibleCompanies = new List<Company>();
                }

                if (!createdUser.AccessibleCompanies.Any(c => c.Id == companyId))
                {
                    createdUser.AccessibleCompanies.Add(company);
                    await _context.SaveChangesAsync();
                }

                var verificationToken = await _userService.GenerateEmailVerificationTokenAsync(createdUser.Id);

                // Send welcome email
                await _emailService.SendWelcomeEmailAsync(createdUser.Email, createdUser.Name);

                // Send verification email with the CORRECT token
                await _emailService.SendVerificationEmailAsync(createdUser.Email, createdUser.Name, verificationToken);
                _logger.LogInformation($"User created successfully: {createdUser.Id} - {createdUser.Name}");

                // Return success response
                return StatusCode(201, new CreateUserResponseDTO
                {
                    Success = true,
                    Message = $"User {createdUser.Name} created successfully with role {request.Role}",
                    User = new CreateUserDataDTO
                    {
                        Id = createdUser.Id,
                        Name = createdUser.Name,
                        Email = createdUser.Email,
                        Role = request.Role
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating user");
                return StatusCode(500, new
                {
                    success = false,
                    error = "An error occurred while creating the user",
                    message = ex.Message
                });
            }
        }


        // // GET: api/user/users/view/{id}
        // [HttpGet("users/view/{id}")]
        // public async Task<IActionResult> GetUserById(Guid id)
        // {
        //     try
        //     {
        //         _logger.LogInformation("=== GetUserById Started ===");
        //         _logger.LogInformation($"Target User ID: {id}");

        //         // Extract claims from JWT token
        //         var currentUserIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        //         var tokenCompanyId = User.FindFirst("currentCompany")?.Value;
        //         var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
        //         var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

        //         // Validate user ID
        //         if (string.IsNullOrEmpty(currentUserIdClaim) || !Guid.TryParse(currentUserIdClaim, out Guid currentUserId))
        //         {
        //             return Unauthorized(new { success = false, error = "Invalid user token. Please login again." });
        //         }

        //         // Get company ID from claim
        //         if (string.IsNullOrEmpty(tokenCompanyId) || !Guid.TryParse(tokenCompanyId, out Guid companyId))
        //         {
        //             return BadRequest(new { success = false, error = "No company selected. Please select a company first." });
        //         }

        //         _logger.LogInformation($"Current User ID: {currentUserId}, Company ID: {companyId}");

        //         // Get current user to check permissions
        //         var currentUser = await _userService.GetUserByIdAsync(currentUserId);
        //         if (currentUser == null)
        //         {
        //             return Unauthorized(new { success = false, error = "User not found" });
        //         }

        //         // Authorization check - only Admin or Supervisor can view user details
        //         var isAdmin = currentUser.IsAdmin;
        //         var isSupervisor = await _userService.UserHasRoleAsync(currentUserId, "Supervisor");

        //         if (!isAdmin && !isSupervisor)
        //         {
        //             return StatusCode(403, new { success = false, error = "You do not have permission to view this page" });
        //         }

        //         // Get company details with owner and fiscal years
        //         var company = await _context.Companies
        //             .Include(c => c.Owner)
        //             .Include(c => c.FiscalYears)
        //             .FirstOrDefaultAsync(c => c.Id == companyId);

        //         if (company == null)
        //         {
        //             return NotFound(new { success = false, error = "Company not found" });
        //         }

        //         // Handle fiscal year
        //         FiscalYearDTO currentFiscalYear = null;
        //         Guid? fiscalYearId = null;

        //         // Try from claim first
        //         if (!string.IsNullOrEmpty(fiscalYearIdClaim) && Guid.TryParse(fiscalYearIdClaim, out Guid claimFyId))
        //         {
        //             var fiscalYear = company.FiscalYears?.FirstOrDefault(f => f.Id == claimFyId);
        //             if (fiscalYear != null)
        //             {
        //                 currentFiscalYear = new FiscalYearDTO
        //                 {
        //                     Id = fiscalYear.Id,
        //                     StartDate = fiscalYear.StartDate,
        //                     EndDate = fiscalYear.EndDate,
        //                     Name = fiscalYear.Name,
        //                     DateFormat = fiscalYear.DateFormat?.ToString() ?? "English",
        //                     IsActive = fiscalYear.IsActive
        //                 };
        //                 fiscalYearId = fiscalYear.Id;
        //             }
        //         }

        //         // If no fiscal year in claim, get active one
        //         if (currentFiscalYear == null && company.FiscalYears != null)
        //         {
        //             var activeFiscalYear = company.FiscalYears.FirstOrDefault(f => f.IsActive);
        //             if (activeFiscalYear == null)
        //             {
        //                 activeFiscalYear = company.FiscalYears.OrderByDescending(f => f.StartDate).FirstOrDefault();
        //             }

        //             if (activeFiscalYear != null)
        //             {
        //                 currentFiscalYear = new FiscalYearDTO
        //                 {
        //                     Id = activeFiscalYear.Id,
        //                     StartDate = activeFiscalYear.StartDate,
        //                     EndDate = activeFiscalYear.EndDate,
        //                     Name = activeFiscalYear.Name,
        //                     DateFormat = activeFiscalYear.DateFormat?.ToString() ?? "English",
        //                     IsActive = activeFiscalYear.IsActive
        //                 };
        //                 fiscalYearId = activeFiscalYear.Id;
        //             }
        //         }

        //         if (fiscalYearId == null)
        //         {
        //             return BadRequest(new { success = false, error = "No fiscal year found for this company." });
        //         }

        //         // Fetch the target user details
        //         var targetUser = await _context.Users
        //             .Include(u => u.UserRoles)
        //                 .ThenInclude(ur => ur.Role)
        //             .Include(u => u.FiscalYear)
        //             .FirstOrDefaultAsync(u => u.Id == id);

        //         if (targetUser == null)
        //         {
        //             return NotFound(new { success = false, error = "User not found" });
        //         }

        //         // Get user's primary role
        //         var primaryRole = targetUser.UserRoles?.FirstOrDefault(ur => ur.IsPrimary)?.Role;
        //         var userRole = primaryRole?.Name ?? "User";

        //         // Get user's associated companies (if any)
        //         var userCompanies = await _context.Users
        //             .Where(u => u.Id == id)
        //             .SelectMany(u => u.AccessibleCompanies.Select(c => new { c.Id, c.Name }))
        //             .ToListAsync();

        //         var userCompany = userCompanies.FirstOrDefault();

        //         // Get current user's theme preference
        //         var currentUserTheme = currentUser.Preferences?.Theme.ToString() ?? "light";

        //         // Prepare response
        //         var response = new
        //         {
        //             success = true,
        //             data = new
        //             {
        //                 user = new
        //                 {
        //                     id = targetUser.Id,
        //                     name = targetUser.Name,
        //                     email = targetUser.Email,
        //                     role = userRole,
        //                     isActive = targetUser.IsActive,
        //                     isAdmin = targetUser.IsAdmin,
        //                     createdAt = targetUser.CreatedAt,
        //                     lastLogin = (DateTime?)null, // Add last login tracking if you have it
        //                     company = userCompany != null ? new
        //                     {
        //                         id = userCompany.Id,
        //                         name = userCompany.Name
        //                     } : null,
        //                     fiscalYear = targetUser.FiscalYear != null ? new
        //                     {
        //                         id = targetUser.FiscalYear.Id,
        //                         name = targetUser.FiscalYear.Name
        //                     } : null
        //                 },
        //                 company = new
        //                 {
        //                     id = company.Id,
        //                     name = company.Name,
        //                     renewalDate = company.RenewalDate,
        //                     dateFormat = company.DateFormat?.ToString() ?? "English",
        //                     owner = company.Owner != null ? new
        //                     {
        //                         id = company.Owner.Id,
        //                         name = company.Owner.Name
        //                     } : null
        //                 },
        //                 currentFiscalYear = currentFiscalYear != null ? new
        //                 {
        //                     id = currentFiscalYear.Id,
        //                     name = currentFiscalYear.Name,
        //                     startDate = currentFiscalYear.StartDate,
        //                     endDate = currentFiscalYear.EndDate,
        //                     dateFormat = currentFiscalYear.DateFormat,
        //                     isActive = currentFiscalYear.IsActive
        //                 } : null,
        //                 currentCompanyName = company.Name,
        //                 currentUser = new
        //                 {
        //                     id = currentUser.Id,
        //                     name = currentUser.Name,
        //                     role = currentUser.UserRoles?.FirstOrDefault(ur => ur.IsPrimary)?.Role?.Name ?? "User",
        //                     isAdmin = currentUser.IsAdmin,
        //                     theme = currentUserTheme
        //                 },
        //                 isAdminOrSupervisor = isAdmin || isSupervisor
        //             }
        //         };

        //         _logger.LogInformation($"Successfully fetched user details for User ID: {id}");
        //         return Ok(response);
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error in GetUserById for User ID: {UserId}", id);
        //         return StatusCode(500, new
        //         {
        //             success = false,
        //             error = "An error occurred while fetching user details",
        //             details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
        //         });
        //     }
        // }

        // GET: api/user/users/view/{id}
        // [HttpGet("users/view/{id}")]
        // public async Task<IActionResult> GetUserById(Guid id)
        // {
        //     try
        //     {
        //         _logger.LogInformation("=== GetUserById Started ===");
        //         _logger.LogInformation($"Target User ID: {id}");

        //         // Extract claims from JWT token
        //         var currentUserIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        //         var tokenCompanyId = User.FindFirst("currentCompany")?.Value;
        //         var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
        //         var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

        //         // Validate user ID
        //         if (string.IsNullOrEmpty(currentUserIdClaim) || !Guid.TryParse(currentUserIdClaim, out Guid currentUserId))
        //         {
        //             return Unauthorized(new { success = false, error = "Invalid user token. Please login again." });
        //         }

        //         // Get company ID from claim
        //         if (string.IsNullOrEmpty(tokenCompanyId) || !Guid.TryParse(tokenCompanyId, out Guid companyId))
        //         {
        //             return BadRequest(new { success = false, error = "No company selected. Please select a company first." });
        //         }

        //         _logger.LogInformation($"Current User ID: {currentUserId}, Company ID: {companyId}");

        //         // Get current user to check permissions
        //         var currentUser = await _userService.GetUserByIdAsync(currentUserId);
        //         if (currentUser == null)
        //         {
        //             return Unauthorized(new { success = false, error = "User not found" });
        //         }

        //         // Authorization check - Allow if:
        //         // 1. User is Admin or Supervisor, OR
        //         // 2. User is viewing their own profile
        //         var isAdmin = currentUser.IsAdmin;
        //         var isSupervisor = await _userService.UserHasRoleAsync(currentUserId, "Supervisor");
        //         var isViewingOwnProfile = currentUserId == id;

        //         if (!isAdmin && !isSupervisor && !isViewingOwnProfile)
        //         {
        //             return StatusCode(403, new { success = false, error = "You do not have permission to view this page" });
        //         }

        //         // Get company details with owner and fiscal years
        //         var company = await _context.Companies
        //             .Include(c => c.Owner)
        //             .Include(c => c.FiscalYears)
        //             .FirstOrDefaultAsync(c => c.Id == companyId);

        //         if (company == null)
        //         {
        //             return NotFound(new { success = false, error = "Company not found" });
        //         }

        //         // Handle fiscal year
        //         FiscalYearDTO currentFiscalYear = null;
        //         Guid? fiscalYearId = null;

        //         // Try from claim first
        //         if (!string.IsNullOrEmpty(fiscalYearIdClaim) && Guid.TryParse(fiscalYearIdClaim, out Guid claimFyId))
        //         {
        //             var fiscalYear = company.FiscalYears?.FirstOrDefault(f => f.Id == claimFyId);
        //             if (fiscalYear != null)
        //             {
        //                 currentFiscalYear = new FiscalYearDTO
        //                 {
        //                     Id = fiscalYear.Id,
        //                     StartDate = fiscalYear.StartDate,
        //                     EndDate = fiscalYear.EndDate,
        //                     Name = fiscalYear.Name,
        //                     DateFormat = fiscalYear.DateFormat?.ToString() ?? "English",
        //                     IsActive = fiscalYear.IsActive
        //                 };
        //                 fiscalYearId = fiscalYear.Id;
        //             }
        //         }

        //         // If no fiscal year in claim, get active one
        //         if (currentFiscalYear == null && company.FiscalYears != null)
        //         {
        //             var activeFiscalYear = company.FiscalYears.FirstOrDefault(f => f.IsActive);
        //             if (activeFiscalYear == null)
        //             {
        //                 activeFiscalYear = company.FiscalYears.OrderByDescending(f => f.StartDate).FirstOrDefault();
        //             }

        //             if (activeFiscalYear != null)
        //             {
        //                 currentFiscalYear = new FiscalYearDTO
        //                 {
        //                     Id = activeFiscalYear.Id,
        //                     StartDate = activeFiscalYear.StartDate,
        //                     EndDate = activeFiscalYear.EndDate,
        //                     Name = activeFiscalYear.Name,
        //                     DateFormat = activeFiscalYear.DateFormat?.ToString() ?? "English",
        //                     IsActive = activeFiscalYear.IsActive
        //                 };
        //                 fiscalYearId = activeFiscalYear.Id;
        //             }
        //         }

        //         if (fiscalYearId == null)
        //         {
        //             return BadRequest(new { success = false, error = "No fiscal year found for this company." });
        //         }

        //         // Fetch the target user details
        //         var targetUser = await _context.Users
        //             .Include(u => u.UserRoles)
        //                 .ThenInclude(ur => ur.Role)
        //             .Include(u => u.FiscalYear)
        //             .FirstOrDefaultAsync(u => u.Id == id);

        //         if (targetUser == null)
        //         {
        //             return NotFound(new { success = false, error = "User not found" });
        //         }

        //         // Get user's primary role
        //         var primaryRole = targetUser.UserRoles?.FirstOrDefault(ur => ur.IsPrimary)?.Role;
        //         var userRole = primaryRole?.Name ?? "User";

        //         // Get user's associated companies (if any)
        //         var userCompanies = await _context.Users
        //             .Where(u => u.Id == id)
        //             .SelectMany(u => u.AccessibleCompanies.Select(c => new { c.Id, c.Name }))
        //             .ToListAsync();

        //         var userCompany = userCompanies.FirstOrDefault();

        //         // Get current user's theme preference
        //         var currentUserTheme = currentUser.Preferences?.Theme.ToString() ?? "light";

        //         // Prepare response
        //         var response = new
        //         {
        //             success = true,
        //             data = new
        //             {
        //                 user = new
        //                 {
        //                     id = targetUser.Id,
        //                     name = targetUser.Name,
        //                     email = targetUser.Email,
        //                     role = userRole,
        //                     isActive = targetUser.IsActive,
        //                     isAdmin = targetUser.IsAdmin,
        //                     createdAt = targetUser.CreatedAt,
        //                     lastLogin = (DateTime?)null, // Add last login tracking if you have it
        //                     company = userCompany != null ? new
        //                     {
        //                         id = userCompany.Id,
        //                         name = userCompany.Name
        //                     } : null,
        //                     fiscalYear = targetUser.FiscalYear != null ? new
        //                     {
        //                         id = targetUser.FiscalYear.Id,
        //                         name = targetUser.FiscalYear.Name
        //                     } : null
        //                 },
        //                 company = new
        //                 {
        //                     id = company.Id,
        //                     name = company.Name,
        //                     renewalDate = company.RenewalDate,
        //                     dateFormat = company.DateFormat?.ToString() ?? "English",
        //                     owner = company.Owner != null ? new
        //                     {
        //                         id = company.Owner.Id,
        //                         name = company.Owner.Name
        //                     } : null
        //                 },
        //                 currentFiscalYear = currentFiscalYear != null ? new
        //                 {
        //                     id = currentFiscalYear.Id,
        //                     name = currentFiscalYear.Name,
        //                     startDate = currentFiscalYear.StartDate,
        //                     endDate = currentFiscalYear.EndDate,
        //                     dateFormat = currentFiscalYear.DateFormat,
        //                     isActive = currentFiscalYear.IsActive
        //                 } : null,
        //                 currentCompanyName = company.Name,
        //                 currentUser = new
        //                 {
        //                     id = currentUser.Id,
        //                     name = currentUser.Name,
        //                     role = currentUser.UserRoles?.FirstOrDefault(ur => ur.IsPrimary)?.Role?.Name ?? "User",
        //                     isAdmin = currentUser.IsAdmin,
        //                     theme = currentUserTheme
        //                 },
        //                 isAdminOrSupervisor = isAdmin || isSupervisor
        //             }
        //         };

        //         _logger.LogInformation($"Successfully fetched user details for User ID: {id}");
        //         return Ok(response);
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error in GetUserById for User ID: {UserId}", id);
        //         return StatusCode(500, new
        //         {
        //             success = false,
        //             error = "An error occurred while fetching user details",
        //             details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
        //         });
        //     }
        // }

        // GET: api/user/users/view/{id}
        [HttpGet("users/view/{id}")]
        public async Task<IActionResult> GetUserById(Guid id)
        {
            try
            {
                _logger.LogInformation("=== GetUserById Started ===");
                _logger.LogInformation($"Target User ID: {id}");

                // Extract claims from JWT token
                var currentUserIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var tokenCompanyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                // Validate user ID
                if (string.IsNullOrEmpty(currentUserIdClaim) || !Guid.TryParse(currentUserIdClaim, out Guid currentUserId))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token. Please login again." });
                }

                // Get company ID from claim
                if (string.IsNullOrEmpty(tokenCompanyId) || !Guid.TryParse(tokenCompanyId, out Guid companyId))
                {
                    return BadRequest(new { success = false, error = "No company selected. Please select a company first." });
                }

                _logger.LogInformation($"Current User ID: {currentUserId}, Company ID: {companyId}");

                // Get current user to check permissions
                var currentUser = await _userService.GetUserByIdAsync(currentUserId);
                if (currentUser == null)
                {
                    return Unauthorized(new { success = false, error = "User not found" });
                }

                // Authorization check - Allow if:
                // 1. User is Admin or Supervisor, OR
                // 2. User is viewing their own profile
                var isAdmin = currentUser.IsAdmin;
                var isSupervisor = await _userService.UserHasRoleAsync(currentUserId, "Supervisor");
                var isViewingOwnProfile = currentUserId == id;

                if (!isAdmin && !isSupervisor && !isViewingOwnProfile)
                {
                    return StatusCode(403, new { success = false, error = "You do not have permission to view this page" });
                }

                // Get company details with owner and fiscal years
                var company = await _context.Companies
                    .Include(c => c.Owner)
                    .Include(c => c.FiscalYears)
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                if (company == null)
                {
                    return NotFound(new { success = false, error = "Company not found" });
                }

                // Handle fiscal year
                FiscalYearDTO currentFiscalYear = null;
                Guid? fiscalYearId = null;

                // Try from claim first
                if (!string.IsNullOrEmpty(fiscalYearIdClaim) && Guid.TryParse(fiscalYearIdClaim, out Guid claimFyId))
                {
                    var fiscalYear = company.FiscalYears?.FirstOrDefault(f => f.Id == claimFyId);
                    if (fiscalYear != null)
                    {
                        currentFiscalYear = new FiscalYearDTO
                        {
                            Id = fiscalYear.Id,
                            StartDate = fiscalYear.StartDate,
                            EndDate = fiscalYear.EndDate,
                            Name = fiscalYear.Name,
                            DateFormat = fiscalYear.DateFormat?.ToString() ?? "English",
                            IsActive = fiscalYear.IsActive
                        };
                        fiscalYearId = fiscalYear.Id;
                    }
                }

                // If no fiscal year in claim, get active one
                if (currentFiscalYear == null && company.FiscalYears != null)
                {
                    var activeFiscalYear = company.FiscalYears.FirstOrDefault(f => f.IsActive);
                    if (activeFiscalYear == null)
                    {
                        activeFiscalYear = company.FiscalYears.OrderByDescending(f => f.StartDate).FirstOrDefault();
                    }

                    if (activeFiscalYear != null)
                    {
                        currentFiscalYear = new FiscalYearDTO
                        {
                            Id = activeFiscalYear.Id,
                            StartDate = activeFiscalYear.StartDate,
                            EndDate = activeFiscalYear.EndDate,
                            Name = activeFiscalYear.Name,
                            DateFormat = activeFiscalYear.DateFormat?.ToString() ?? "English",
                            IsActive = activeFiscalYear.IsActive
                        };
                        fiscalYearId = activeFiscalYear.Id;
                    }
                }

                if (fiscalYearId == null)
                {
                    return BadRequest(new { success = false, error = "No fiscal year found for this company." });
                }

                // Fetch the target user details with all associated companies
                var targetUser = await _context.Users
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .Include(u => u.FiscalYear)
                    .Include(u => u.AccessibleCompanies) // Include all accessible companies
                    .Include(u => u.OwnedCompanies) // Include owned companies
                    .FirstOrDefaultAsync(u => u.Id == id);

                if (targetUser == null)
                {
                    return NotFound(new { success = false, error = "User not found" });
                }

                // Get user's primary role
                var primaryRole = targetUser.UserRoles?.FirstOrDefault(ur => ur.IsPrimary)?.Role;
                var userRole = primaryRole?.Name ?? "User";

                // Get ALL associated companies (both accessible and owned)
                var allCompanies = new List<object>();

                // Add accessible companies
                if (targetUser.AccessibleCompanies != null && targetUser.AccessibleCompanies.Any())
                {
                    foreach (var comp in targetUser.AccessibleCompanies)
                    {
                        allCompanies.Add(new
                        {
                            id = comp.Id,
                            name = comp.Name,
                            type = "Accessible",
                            role = comp.OwnerId == targetUser.Id ? "Owner" : "Member"
                        });
                    }
                }

                // Add owned companies (if not already in accessible list)
                if (targetUser.OwnedCompanies != null && targetUser.OwnedCompanies.Any())
                {
                    foreach (var comp in targetUser.OwnedCompanies)
                    {
                        // Check if already added
                        if (!allCompanies.Any(c =>
                            ((dynamic)c).id == comp.Id))
                        {
                            allCompanies.Add(new
                            {
                                id = comp.Id,
                                name = comp.Name,
                                type = "Owned",
                                role = "Owner"
                            });
                        }
                    }
                }

                // Get current user's theme preference
                var currentUserTheme = currentUser.Preferences?.Theme.ToString() ?? "light";

                // Prepare response with multiple companies
                var response = new
                {
                    success = true,
                    data = new
                    {
                        user = new
                        {
                            id = targetUser.Id,
                            name = targetUser.Name,
                            email = targetUser.Email,
                            role = userRole,
                            isActive = targetUser.IsActive,
                            isAdmin = targetUser.IsAdmin,
                            createdAt = targetUser.CreatedAt,
                            lastLogin = (DateTime?)null,
                            companies = allCompanies, // Return all companies as array
                            fiscalYear = targetUser.FiscalYear != null ? new
                            {
                                id = targetUser.FiscalYear.Id,
                                name = targetUser.FiscalYear.Name
                            } : null
                        },
                        company = new
                        {
                            id = company.Id,
                            name = company.Name,
                            renewalDate = company.RenewalDate,
                            dateFormat = company.DateFormat?.ToString() ?? "English",
                            owner = company.Owner != null ? new
                            {
                                id = company.Owner.Id,
                                name = company.Owner.Name
                            } : null
                        },
                        currentFiscalYear = currentFiscalYear != null ? new
                        {
                            id = currentFiscalYear.Id,
                            name = currentFiscalYear.Name,
                            startDate = currentFiscalYear.StartDate,
                            endDate = currentFiscalYear.EndDate,
                            dateFormat = currentFiscalYear.DateFormat,
                            isActive = currentFiscalYear.IsActive
                        } : null,
                        currentCompanyName = company.Name,
                        currentUser = new
                        {
                            id = currentUser.Id,
                            name = currentUser.Name,
                            role = currentUser.UserRoles?.FirstOrDefault(ur => ur.IsPrimary)?.Role?.Name ?? "User",
                            isAdmin = currentUser.IsAdmin,
                            theme = currentUserTheme
                        },
                        isAdminOrSupervisor = isAdmin || isSupervisor
                    }
                };

                _logger.LogInformation($"Successfully fetched user details for User ID: {id} with {allCompanies.Count} companies");
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetUserById for User ID: {UserId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "An error occurred while fetching user details",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/user/users/edit-name/{id}
        [HttpGet("users/edit-name/{id}")]
        public async Task<IActionResult> GetEditNameForm(Guid id)
        {
            try
            {
                _logger.LogInformation("=== GetEditNameForm Started ===");
                _logger.LogInformation($"Target User ID: {id}");

                // Extract claims from JWT token
                var currentUserIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var tokenCompanyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;

                // Validate user ID
                if (string.IsNullOrEmpty(currentUserIdClaim) || !Guid.TryParse(currentUserIdClaim, out Guid currentUserId))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token. Please login again." });
                }

                // Get company ID from claim
                if (string.IsNullOrEmpty(tokenCompanyId) || !Guid.TryParse(tokenCompanyId, out Guid companyId))
                {
                    return BadRequest(new { success = false, error = "No company selected. Please select a company first." });
                }

                _logger.LogInformation($"Current User ID: {currentUserId}, Company ID: {companyId}");

                // Authorization check - Only the user themselves can edit their name
                if (currentUserId != id)
                {
                    return StatusCode(403, new { success = false, error = "You can only edit your own name" });
                }

                // Fetch the target user
                var targetUser = await _context.Users
                    .FirstOrDefaultAsync(u => u.Id == id);

                if (targetUser == null)
                {
                    return NotFound(new { success = false, error = "User not found" });
                }

                // Get company details
                var company = await _context.Companies
                    .Include(c => c.FiscalYears)
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                if (company == null)
                {
                    return NotFound(new { success = false, error = "Company not found" });
                }

                // Handle fiscal year
                FiscalYearDTO currentFiscalYear = null;
                Guid? fiscalYearId = null;

                if (!string.IsNullOrEmpty(fiscalYearIdClaim) && Guid.TryParse(fiscalYearIdClaim, out Guid claimFyId))
                {
                    var fiscalYear = company.FiscalYears?.FirstOrDefault(f => f.Id == claimFyId);
                    if (fiscalYear != null)
                    {
                        currentFiscalYear = new FiscalYearDTO
                        {
                            Id = fiscalYear.Id,
                            StartDate = fiscalYear.StartDate,
                            EndDate = fiscalYear.EndDate,
                            Name = fiscalYear.Name,
                            DateFormat = fiscalYear.DateFormat?.ToString() ?? "English",
                            IsActive = fiscalYear.IsActive
                        };
                        fiscalYearId = fiscalYear.Id;
                    }
                }

                if (currentFiscalYear == null && company.FiscalYears != null)
                {
                    var activeFiscalYear = company.FiscalYears.FirstOrDefault(f => f.IsActive);
                    if (activeFiscalYear == null)
                    {
                        activeFiscalYear = company.FiscalYears.OrderByDescending(f => f.StartDate).FirstOrDefault();
                    }

                    if (activeFiscalYear != null)
                    {
                        currentFiscalYear = new FiscalYearDTO
                        {
                            Id = activeFiscalYear.Id,
                            StartDate = activeFiscalYear.StartDate,
                            EndDate = activeFiscalYear.EndDate,
                            Name = activeFiscalYear.Name,
                            DateFormat = activeFiscalYear.DateFormat?.ToString() ?? "English",
                            IsActive = activeFiscalYear.IsActive
                        };
                        fiscalYearId = activeFiscalYear.Id;
                    }
                }

                // Prepare response
                var response = new
                {
                    success = true,
                    data = new
                    {
                        user = new
                        {
                            id = targetUser.Id,
                            name = targetUser.Name,
                            email = targetUser.Email
                        },
                        company = new
                        {
                            id = company.Id,
                            name = company.Name,
                            dateFormat = company.DateFormat?.ToString() ?? "English"
                        },
                        currentFiscalYear = currentFiscalYear != null ? new
                        {
                            id = currentFiscalYear.Id,
                            name = currentFiscalYear.Name,
                            startDate = currentFiscalYear.StartDate,
                            endDate = currentFiscalYear.EndDate
                        } : null,
                        currentCompanyName = company.Name,
                        isOwnProfile = true
                    }
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetEditNameForm for User ID: {UserId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "An error occurred while loading the edit form",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // PUT: api/user/users/edit-name/{id}
        [HttpPut("users/edit-name/{id}")]
        public async Task<IActionResult> UpdateUserName(Guid id, [FromBody] UpdateUserNameRequest request)
        {
            try
            {
                _logger.LogInformation("=== UpdateUserName Started ===");
                _logger.LogInformation($"Target User ID: {id}, New Name: {request.Name}");

                // Extract claims from JWT token
                var currentUserIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                // Validate user ID
                if (string.IsNullOrEmpty(currentUserIdClaim) || !Guid.TryParse(currentUserIdClaim, out Guid currentUserId))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token. Please login again." });
                }

                // Authorization check - Only the user themselves can edit their name
                if (currentUserId != id)
                {
                    return StatusCode(403, new { success = false, error = "You can only edit your own name" });
                }

                // Validate request
                if (request == null || string.IsNullOrWhiteSpace(request.Name))
                {
                    return BadRequest(new { success = false, error = "Name is required" });
                }

                // Trim and validate name length
                var newName = request.Name.Trim();
                if (newName.Length < 2)
                {
                    return BadRequest(new { success = false, error = "Name must be at least 2 characters long" });
                }

                if (newName.Length > 100)
                {
                    return BadRequest(new { success = false, error = "Name cannot exceed 100 characters" });
                }

                // Fetch the user
                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.Id == id);

                if (user == null)
                {
                    return NotFound(new { success = false, error = "User not found" });
                }

                // Update the name
                var oldName = user.Name;
                user.Name = newName;
                user.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation($"User {user.Email} changed name from '{oldName}' to '{newName}'");

                return Ok(new
                {
                    success = true,
                    message = "Name updated successfully",
                    data = new
                    {
                        id = user.Id,
                        name = user.Name,
                        email = user.Email,
                        updatedAt = user.UpdatedAt
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in UpdateUserName for User ID: {UserId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "An error occurred while updating the name",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // POST: api/user/admin/users/{id}/activate
        [HttpPost("admin/users/{id}/activate")]
        public async Task<IActionResult> ActivateUser(Guid id)
        {
            try
            {
                _logger.LogInformation("=== ActivateUser Started ===");
                _logger.LogInformation($"Target User ID: {id}");

                // Extract claims from JWT token
                var currentUserIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrEmpty(currentUserIdClaim) || !Guid.TryParse(currentUserIdClaim, out Guid currentUserId))
                {
                    return Unauthorized(new { success = false, message = "Invalid user token. Please login again." });
                }

                var currentUser = await _userService.GetUserByIdAsync(currentUserId);
                if (currentUser == null)
                {
                    return Unauthorized(new { success = false, message = "User not found" });
                }

                // Check if user has admin privileges
                if (!currentUser.IsAdmin)
                {
                    return StatusCode(403, new { success = false, message = "Unauthorized: Only admins can activate users" });
                }

                // Prevent admin from activating themselves (optional)
                if (currentUserId == id)
                {
                    return BadRequest(new { success = false, message = "You cannot activate your own account" });
                }

                // Direct database update for activation without loading the entity
                var result = await _context.Users
                    .Where(u => u.Id == id)
                    .ExecuteUpdateAsync(setters => setters
                        .SetProperty(u => u.IsActive, true)
                        .SetProperty(u => u.UpdatedAt, DateTime.UtcNow)
                    );

                if (result == 0)
                {
                    return NotFound(new { success = false, message = "User not found" });
                }

                _logger.LogInformation($"User {id} activated successfully by admin {currentUserId}");

                return Ok(new
                {
                    success = true,
                    message = "User activated successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error activating user {id}");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Error activating user",
                    error = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // POST: api/user/admin/users/{id}/deactivate
        [HttpPost("admin/users/{id}/deactivate")]
        public async Task<IActionResult> DeactivateUser(Guid id)
        {
            try
            {
                _logger.LogInformation("=== DeactivateUser Started ===");
                _logger.LogInformation($"Target User ID: {id}");

                // Extract claims from JWT token
                var currentUserIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrEmpty(currentUserIdClaim) || !Guid.TryParse(currentUserIdClaim, out Guid currentUserId))
                {
                    return Unauthorized(new { success = false, message = "Invalid user token. Please login again." });
                }

                var currentUser = await _userService.GetUserByIdAsync(currentUserId);
                if (currentUser == null)
                {
                    return Unauthorized(new { success = false, message = "User not found" });
                }

                // Check if user has admin privileges
                if (!currentUser.IsAdmin)
                {
                    return StatusCode(403, new { success = false, message = "Unauthorized: Only admins can deactivate users" });
                }

                // Prevent admin from deactivating themselves
                if (currentUserId == id)
                {
                    return BadRequest(new { success = false, message = "You cannot deactivate your own account" });
                }

                // Direct database update for deactivation without loading the entity
                var result = await _context.Users
                    .Where(u => u.Id == id)
                    .ExecuteUpdateAsync(setters => setters
                        .SetProperty(u => u.IsActive, false)
                        .SetProperty(u => u.UpdatedAt, DateTime.UtcNow)
                    );

                if (result == 0)
                {
                    return NotFound(new { success = false, message = "User not found" });
                }

                _logger.LogInformation($"User {id} deactivated successfully by admin {currentUserId}");

                return Ok(new
                {
                    success = true,
                    message = "User deactivated successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error deactivating user {id}");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Error deactivating user",
                    error = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // PUT: api/user/admin/users/{id}/role
        [HttpPut("admin/users/{id}/role")]
        public async Task<IActionResult> UpdateUserRole(Guid id, [FromBody] UpdateUserRoleRequest request)
        {
            try
            {
                _logger.LogInformation("=== UpdateUserRole Started ===");
                _logger.LogInformation($"Target User ID: {id}, New Role: {request.Role}");

                // Extract claims from JWT token
                var currentUserIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrEmpty(currentUserIdClaim) || !Guid.TryParse(currentUserIdClaim, out Guid currentUserId))
                {
                    return Unauthorized(new { success = false, message = "Invalid user token. Please login again." });
                }

                // Get current user to check permissions
                var currentUser = await _userService.GetUserByIdAsync(currentUserId);
                if (currentUser == null)
                {
                    return Unauthorized(new { success = false, message = "User not found" });
                }

                // Only admin can change the role
                if (!currentUser.IsAdmin)
                {
                    return StatusCode(403, new { success = false, message = "You do not have permission to change user roles." });
                }

                // Validate the role
                var validRoles = new List<string> { "Account", "Sales", "Purchase", "Supervisor", "Admin", "User" };
                var normalizedRole = request.Role == "ADMINISTRATOR" ? "Admin" : request.Role;

                if (string.IsNullOrEmpty(normalizedRole) || !validRoles.Contains(normalizedRole))
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Invalid role.",
                        validRoles = validRoles
                    });
                }

                // Get the role entity
                var roleEntity = await _context.Roles
                    .FirstOrDefaultAsync(r => r.Name == normalizedRole && r.IsActive && r.IsAssignable);

                if (roleEntity == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = $"Role '{request.Role}' not found or not assignable."
                    });
                }

                // Find the user
                var user = await _context.Users
                    .Include(u => u.UserRoles)
                    .FirstOrDefaultAsync(u => u.Id == id);

                if (user == null)
                {
                    return NotFound(new { success = false, message = "User not found." });
                }

                // REMOVE all existing roles for this user (replace, don't add)
                if (user.UserRoles != null && user.UserRoles.Any())
                {
                    _context.UserRoles.RemoveRange(user.UserRoles);
                    _logger.LogInformation($"Removed {user.UserRoles.Count} existing roles from user {user.Name}");
                }

                // Add the NEW role only
                var newUserRole = new UserRole
                {
                    Id = Guid.NewGuid(),
                    UserId = user.Id,
                    RoleId = roleEntity.Id,
                    AssignedById = currentUserId,
                    IsPrimary = true,
                    AssignedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.UserRoles.Add(newUserRole);

                // Update IsAdmin flag on User entity
                user.IsAdmin = normalizedRole == "Admin";
                user.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation($"Role of user {user.Name} (ID: {id}) has been updated to {normalizedRole} (replaced existing roles)");

                return Ok(new
                {
                    success = true,
                    message = $"Role of {user.Name} has been updated to {normalizedRole}.",
                    user = new
                    {
                        id = user.Id,
                        name = user.Name,
                        email = user.Email,
                        role = normalizedRole,
                        isActive = user.IsActive,
                        isAdmin = user.IsAdmin
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating role for user {id}");
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while updating the user role.",
                    error = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }


        // GET: api/user/admin/users/user-permissions/{id}
        [HttpGet("admin/users/user-permissions/{id}")]
        public async Task<IActionResult> GetUserPermissions(Guid id)
        {
            try
            {
                _logger.LogInformation("=== GetUserPermissions Started ===");
                _logger.LogInformation($"Target User ID: {id}");

                // Extract claims from JWT token
                var currentUserIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var tokenCompanyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;

                // Validate user ID
                if (string.IsNullOrEmpty(currentUserIdClaim) || !Guid.TryParse(currentUserIdClaim, out Guid currentUserId))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token. Please login again." });
                }

                // Get company ID from claim
                if (string.IsNullOrEmpty(tokenCompanyId) || !Guid.TryParse(tokenCompanyId, out Guid companyId))
                {
                    return BadRequest(new { success = false, error = "No company selected. Please select a company first." });
                }

                _logger.LogInformation($"Current User ID: {currentUserId}, Company ID: {companyId}");

                // Get current user to check permissions
                var currentUser = await _userService.GetUserByIdAsync(currentUserId);
                if (currentUser == null)
                {
                    return Unauthorized(new { success = false, error = "User not found" });
                }

                // Check if user is Admin or Supervisor
                var isAdmin = currentUser.IsAdmin;
                var isSupervisor = await _userService.UserHasRoleAsync(currentUserId, "Supervisor");

                if (!isAdmin && !isSupervisor)
                {
                    return StatusCode(403, new { success = false, error = "You do not have permission to view this page" });
                }

                // Get company details
                var company = await _context.Companies
                    .Include(c => c.FiscalYears)
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                if (company == null)
                {
                    return NotFound(new { success = false, error = "Company not found" });
                }

                // Handle fiscal year
                FiscalYearDTO currentFiscalYear = null;
                Guid? fiscalYearId = null;

                // Try from claim first
                if (!string.IsNullOrEmpty(fiscalYearIdClaim) && Guid.TryParse(fiscalYearIdClaim, out Guid claimFyId))
                {
                    var fiscalYear = company.FiscalYears?.FirstOrDefault(f => f.Id == claimFyId);
                    if (fiscalYear != null)
                    {
                        currentFiscalYear = new FiscalYearDTO
                        {
                            Id = fiscalYear.Id,
                            StartDate = fiscalYear.StartDate,
                            EndDate = fiscalYear.EndDate,
                            Name = fiscalYear.Name,
                            DateFormat = fiscalYear.DateFormat?.ToString() ?? "English",
                            IsActive = fiscalYear.IsActive
                        };
                        fiscalYearId = fiscalYear.Id;
                    }
                }

                // If no fiscal year in claim, get active one
                if (currentFiscalYear == null && company.FiscalYears != null)
                {
                    var activeFiscalYear = company.FiscalYears.FirstOrDefault(f => f.IsActive);
                    if (activeFiscalYear == null)
                    {
                        activeFiscalYear = company.FiscalYears.OrderByDescending(f => f.StartDate).FirstOrDefault();
                    }

                    if (activeFiscalYear != null)
                    {
                        currentFiscalYear = new FiscalYearDTO
                        {
                            Id = activeFiscalYear.Id,
                            StartDate = activeFiscalYear.StartDate,
                            EndDate = activeFiscalYear.EndDate,
                            Name = activeFiscalYear.Name,
                            DateFormat = activeFiscalYear.DateFormat?.ToString() ?? "English",
                            IsActive = activeFiscalYear.IsActive
                        };
                        fiscalYearId = activeFiscalYear.Id;
                    }
                }

                if (fiscalYearId == null)
                {
                    return BadRequest(new { success = false, error = "No fiscal year found for this company." });
                }

                // Fetch the target user
                var targetUser = await _context.Users
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Id == id);

                if (targetUser == null)
                {
                    return NotFound(new { success = false, error = "User not found" });
                }

                // Get user's primary role
                var primaryRole = targetUser.UserRoles?.FirstOrDefault(ur => ur.IsPrimary)?.Role;
                var userRole = primaryRole?.Name ?? "User";

                // Get menu permissions (convert Dictionary to object for frontend)
                var permissions = targetUser.MenuPermissions ?? GetDefaultMenuPermissions();

                // Get user's theme preference
                var userTheme = targetUser.Preferences?.Theme.ToString() ?? "light";

                // Get current company name
                var currentCompanyName = User.FindFirst("currentCompanyName")?.Value ?? company.Name;

                // Prepare response
                var response = new
                {
                    success = true,
                    data = new
                    {
                        user = new
                        {
                            id = targetUser.Id,
                            name = targetUser.Name,
                            email = targetUser.Email,
                            role = userRole
                        },
                        permissions = permissions,
                        company = new
                        {
                            renewalDate = company.RenewalDate,
                            fiscalYear = company.FiscalYears != null && company.FiscalYears.Any() ? new
                            {
                                id = company.FiscalYears.First().Id,
                                name = company.FiscalYears.First().Name,
                                startDate = company.FiscalYears.First().StartDate,
                                endDate = company.FiscalYears.First().EndDate,
                                isActive = company.FiscalYears.First().IsActive
                            } : null,
                            dateFormat = company.DateFormat?.ToString() ?? "English"
                        },
                        currentFiscalYear = currentFiscalYear != null ? new
                        {
                            id = currentFiscalYear.Id,
                            startDate = currentFiscalYear.StartDate,
                            endDate = currentFiscalYear.EndDate,
                            name = currentFiscalYear.Name,
                            dateFormat = currentFiscalYear.DateFormat,
                            isActive = currentFiscalYear.IsActive
                        } : null,
                        currentCompanyName = currentCompanyName,
                        theme = userTheme,
                        isAdminOrSupervisor = isAdmin || isSupervisor
                    }
                };

                _logger.LogInformation($"Successfully fetched permissions for user {targetUser.Name} (ID: {id})");
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting permissions for user {id}");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Server error",
                    error = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // PUT: api/user/admin/users/user-permissions/{id}
        [HttpPut("admin/users/user-permissions/{id}")]
        public async Task<IActionResult> UpdateUserPermissions(Guid id, [FromBody] UpdateUserPermissionsRequest request)
        {
            try
            {
                _logger.LogInformation("=== UpdateUserPermissions Started ===");
                _logger.LogInformation($"Target User ID: {id}");

                // Validate permissions object
                if (request.Permissions == null || request.Permissions.Count == 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Invalid permissions format",
                        details = "Permissions must be a valid object with at least one permission"
                    });
                }

                // Extract claims from JWT token
                var currentUserIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var tokenCompanyId = User.FindFirst("currentCompany")?.Value;

                if (string.IsNullOrEmpty(currentUserIdClaim) || !Guid.TryParse(currentUserIdClaim, out Guid currentUserId))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token. Please login again." });
                }

                // Get company ID from claim
                if (string.IsNullOrEmpty(tokenCompanyId) || !Guid.TryParse(tokenCompanyId, out Guid companyId))
                {
                    return BadRequest(new { success = false, error = "No company selected. Please select a company first." });
                }

                // Get current user to check permissions
                var currentUser = await _userService.GetUserByIdAsync(currentUserId);
                if (currentUser == null)
                {
                    return Unauthorized(new { success = false, error = "User not found" });
                }

                // Check if user is Admin or Supervisor
                var isAdmin = currentUser.IsAdmin;
                var isSupervisor = await _userService.UserHasRoleAsync(currentUserId, "Supervisor");

                if (!isAdmin && !isSupervisor)
                {
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "You do not have permission to update permissions"
                    });
                }

                // Find the target user
                var targetUser = await _context.Users
                    .FirstOrDefaultAsync(u => u.Id == id);

                if (targetUser == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "User not found",
                        details = $"No user found with ID: {id}"
                    });
                }

                // Get existing permissions or initialize new dictionary
                var existingPermissions = targetUser.MenuPermissions ?? new Dictionary<string, bool>();

                // Update each permission
                var updatedFields = new List<string>();
                foreach (var permission in request.Permissions)
                {
                    existingPermissions[permission.Key] = permission.Value;
                    updatedFields.Add(permission.Key);
                }

                // Update user properties
                targetUser.MenuPermissions = existingPermissions;
                targetUser.GrantedById = currentUserId;
                targetUser.LastPermissionUpdate = DateTime.UtcNow;
                targetUser.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation($"Successfully updated permissions for user {targetUser.Name} (ID: {id}) by admin {currentUserId}");

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        message = "Permissions updated successfully",
                        userId = targetUser.Id,
                        updatedBy = currentUserId,
                        updateTimestamp = targetUser.LastPermissionUpdate,
                        permissions = targetUser.MenuPermissions
                    },
                    metadata = new
                    {
                        updatedFields = updatedFields,
                        totalPermissionsUpdated = updatedFields.Count
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating permissions for user {id}");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Server error",
                    message = "Failed to update user permissions",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
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

                // SEND VERIFICATION EMAIL
                try
                {
                    var token = await _userService.GenerateEmailVerificationTokenAsync(createdUser.Id);
                    await _emailService.SendVerificationEmailAsync(createdUser.Email, createdUser.Name, token);
                    Console.WriteLine("Verification email sent successfully ✓");
                }
                catch (Exception emailEx)
                {
                    Console.WriteLine($"Warning: Email sending failed: {emailEx.Message}");
                    // Don't fail registration if email fails
                }

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
                FiscalYearStartDateNepali = company.FiscalYearStartDateNepali,
                FiscalYearStartDateEnglish = company.FiscalYearStartDateEnglish,
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

        // [HttpPost("verify-email")]
        // public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest request)
        // {
        //     var result = await _userService.VerifyEmailAsync(request.Token!);
        //     if (!result)
        //         return BadRequest(new { error = "Invalid or expired verification token" });

        //     return Ok(new { success = true, message = "Email verified successfully!" });
        // }

        // GET: api/user/verify-email?token=xyz
        [HttpGet("verify-email")]
        public async Task<IActionResult> VerifyEmail([FromQuery] string token)
        {
            if (string.IsNullOrEmpty(token))
            {
                return BadRequest(new { success = false, error = "Verification token is required" });
            }

            var result = await _userService.VerifyEmailAsync(token);

            if (!result)
            {
                // Return a user-friendly HTML page for the browser
                return Content(@"
            <!DOCTYPE html>
            <html>
            <head>
                <title>Email Verification Failed</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                    .error { color: #dc3545; }
                    .container { max-width: 500px; margin: 0 auto; }
                </style>
            </head>
            <body>
                <div class='container'>
                    <h1 class='error'>Verification Failed</h1>
                    <p>The verification link is invalid or has expired.</p>
                    <p>Please contact support if you need assistance.</p>
                    <a href='/auth/login'>Go to Login</a>
                </div>
            </body>
            </html>
        ", "text/html");
            }

            // Return success HTML page
            return Content(@"
        <!DOCTYPE html>
        <html>
        <head>
            <title>Email Verified Successfully</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .success { color: #28a745; }
                .container { max-width: 500px; margin: 0 auto; }
                .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class='container'>
                <h1 class='success'>Email Verified Successfully!</h1>
                <p>Your email has been verified. You can now log in to your account.</p>
                <a href='/auth/login' class='button'>Proceed to Login</a>
            </div>
        </body>
        </html>
    ", "text/html");
        }

        // [HttpPost("forgot-password")]
        // public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        // {
        //     try
        //     {
        //         var token = await _userService.GeneratePasswordResetTokenAsync(request.Email!);
        //         await SendPasswordResetEmailAsync(request.Email!, token);

        //         return Ok(new
        //         {
        //             success = true,
        //             message = "Password reset email sent"
        //         });
        //     }
        //     catch (Exception ex)
        //     {
        //         return BadRequest(new { error = ex.Message });
        //     }
        // }

        // POST: api/user/forgot-password
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            try
            {
                _logger.LogInformation("=== ForgotPassword Started ===");
                _logger.LogInformation($"Email: {request.Email}");

                // Validate email
                if (string.IsNullOrWhiteSpace(request.Email))
                {
                    return BadRequest(new { success = false, message = "Email is required" });
                }

                // Find user by email
                var user = await _userService.GetUserByEmailAsync(request.Email);

                // For security, don't reveal if email exists
                if (user == null)
                {
                    _logger.LogWarning($"Password reset requested for non-existent email: {request.Email}");
                    // Return success even if user not found (security best practice)
                    return Ok(new
                    {
                        success = true,
                        message = "If your email is registered, you will receive a password reset link."
                    });
                }

                // Generate reset token
                var resetToken = await _userService.GeneratePasswordResetTokenAsync(request.Email);

                // Create reset URL (using frontend URL or backend URL)
                var appUrl = _configuration["AppUrl"] ?? "https://localhost:7142";
                var resetUrl = $"{appUrl}/reset-password/{resetToken}";

                // Send email
                await _emailService.SendPasswordResetEmailAsync(user.Email, resetToken);

                _logger.LogInformation($"Password reset email sent to {user.Email}");

                return Ok(new
                {
                    success = true,
                    message = "Password reset link sent to your email!"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in ForgotPassword");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Error processing your request. Please try again later."
                });
            }
        }

        // [HttpPost("reset-password/{token}")]
        // public async Task<IActionResult> ResetPassword(string token, [FromBody] ResetPasswordRequest request)
        // {
        //     try
        //     {
        //         _logger.LogInformation("=== ResetPassword Started ===");
        //         _logger.LogInformation($"Raw token from URL: {token}");

        //         // URL decode the token if needed
        //         var decodedToken = Uri.UnescapeDataString(token);
        //         _logger.LogInformation($"Decoded token: {decodedToken}");

        //         // Validate inputs
        //         if (string.IsNullOrEmpty(decodedToken))
        //         {
        //             return BadRequest(new { success = false, message = "Token is required" });
        //         }

        //         if (string.IsNullOrWhiteSpace(request.Password))
        //         {
        //             return BadRequest(new { success = false, message = "Password is required" });
        //         }

        //         if (string.IsNullOrWhiteSpace(request.Password2))
        //         {
        //             return BadRequest(new { success = false, message = "Password confirmation is required" });
        //         }

        //         if (request.Password != request.Password2)
        //         {
        //             return BadRequest(new { success = false, message = "Passwords do not match" });
        //         }

        //         if (request.Password.Length < 6)
        //         {
        //             return BadRequest(new { success = false, message = "Password must be at least 6 characters long" });
        //         }

        //         // Let the UserService handle the hashing and comparison
        //         var result = await _userService.ResetPasswordAsync(decodedToken, request.Password);

        //         if (!result)
        //         {
        //             return BadRequest(new { success = false, message = "Token is invalid or has expired" });
        //         }

        //         return Ok(new
        //         {
        //             success = true,
        //             message = "Password updated successfully! You can now log in with your new password."
        //         });
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error in ResetPassword");
        //         return StatusCode(500, new
        //         {
        //             success = false,
        //             message = "Error resetting your password. Please try again."
        //         });
        //     }
        // }


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

        // GET: api/user/user/change-password
        [HttpGet("user/change-password")]
        public async Task<IActionResult> GetChangePasswordForm()
        {
            try
            {
                _logger.LogInformation("=== GetChangePasswordForm Started ===");

                // Extract claims from JWT token
                var currentUserIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var tokenCompanyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;

                // Validate user ID
                if (string.IsNullOrEmpty(currentUserIdClaim) || !Guid.TryParse(currentUserIdClaim, out Guid currentUserId))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token. Please login again." });
                }

                // Get company ID from claim
                if (string.IsNullOrEmpty(tokenCompanyId) || !Guid.TryParse(tokenCompanyId, out Guid companyId))
                {
                    return BadRequest(new { success = false, error = "No company selected. Please select a company first." });
                }

                _logger.LogInformation($"Current User ID: {currentUserId}, Company ID: {companyId}");

                // Get current user details
                var currentUser = await _userService.GetUserByIdAsync(currentUserId);
                if (currentUser == null)
                {
                    return Unauthorized(new { success = false, error = "User not found" });
                }

                // Get company details
                var company = await _context.Companies
                    .Include(c => c.FiscalYears)
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                if (company == null)
                {
                    return NotFound(new { success = false, error = "Company not found" });
                }

                // Handle fiscal year
                FiscalYearDTO currentFiscalYear = null;
                Guid? fiscalYearId = null;

                // Try from claim first
                if (!string.IsNullOrEmpty(fiscalYearIdClaim) && Guid.TryParse(fiscalYearIdClaim, out Guid claimFyId))
                {
                    var fiscalYear = company.FiscalYears?.FirstOrDefault(f => f.Id == claimFyId);
                    if (fiscalYear != null)
                    {
                        currentFiscalYear = new FiscalYearDTO
                        {
                            Id = fiscalYear.Id,
                            StartDate = fiscalYear.StartDate,
                            EndDate = fiscalYear.EndDate,
                            Name = fiscalYear.Name,
                            DateFormat = fiscalYear.DateFormat?.ToString() ?? "English",
                            IsActive = fiscalYear.IsActive
                        };
                        fiscalYearId = fiscalYear.Id;
                    }
                }

                // If no fiscal year in claim, get active one
                if (currentFiscalYear == null && company.FiscalYears != null)
                {
                    var activeFiscalYear = company.FiscalYears.FirstOrDefault(f => f.IsActive);
                    if (activeFiscalYear == null)
                    {
                        activeFiscalYear = company.FiscalYears.OrderByDescending(f => f.StartDate).FirstOrDefault();
                    }

                    if (activeFiscalYear != null)
                    {
                        currentFiscalYear = new FiscalYearDTO
                        {
                            Id = activeFiscalYear.Id,
                            StartDate = activeFiscalYear.StartDate,
                            EndDate = activeFiscalYear.EndDate,
                            Name = activeFiscalYear.Name,
                            DateFormat = activeFiscalYear.DateFormat?.ToString() ?? "English",
                            IsActive = activeFiscalYear.IsActive
                        };
                        fiscalYearId = activeFiscalYear.Id;
                    }
                }

                if (fiscalYearId == null)
                {
                    return BadRequest(new { success = false, error = "No fiscal year found for this company." });
                }

                // Get user's primary role
                var primaryRole = currentUser.UserRoles?.FirstOrDefault(ur => ur.IsPrimary)?.Role;
                var userRole = primaryRole?.Name ?? "User";

                // Get user's theme preference
                var userTheme = currentUser.Preferences?.Theme.ToString() ?? "light";

                // Get current company name
                var currentCompanyName = User.FindFirst("currentCompanyName")?.Value ?? company.Name;

                // Prepare response
                var response = new
                {
                    success = true,
                    data = new
                    {
                        company = new
                        {
                            renewalDate = company.RenewalDate,
                            dateFormat = company.DateFormat?.ToString() ?? "English",
                            fiscalYear = company.FiscalYears != null && company.FiscalYears.Any() ? new
                            {
                                id = company.FiscalYears.First().Id,
                                name = company.FiscalYears.First().Name,
                                startDate = company.FiscalYears.First().StartDate,
                                endDate = company.FiscalYears.First().EndDate,
                                isActive = company.FiscalYears.First().IsActive
                            } : null
                        },
                        currentFiscalYear = currentFiscalYear != null ? new
                        {
                            id = currentFiscalYear.Id,
                            startDate = currentFiscalYear.StartDate,
                            endDate = currentFiscalYear.EndDate,
                            name = currentFiscalYear.Name,
                            dateFormat = currentFiscalYear.DateFormat,
                            isActive = currentFiscalYear.IsActive
                        } : null,
                        currentCompanyName = currentCompanyName,
                        user = new
                        {
                            id = currentUser.Id,
                            name = currentUser.Name,
                            email = currentUser.Email,
                            role = userRole,
                            isAdmin = currentUser.IsAdmin,
                            preferences = new
                            {
                                theme = userTheme
                            }
                        },
                        theme = userTheme,
                        isAdminOrSupervisor = currentUser.IsAdmin || userRole == "Supervisor"
                    }
                };

                _logger.LogInformation($"Successfully loaded change password form for user {currentUser.Email}");
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetChangePasswordForm");
                return StatusCode(500, new
                {
                    success = false,
                    error = "An error occurred while processing your request",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // POST: api/user/user/change-password
        [HttpPost("user/change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequestDTO request)
        {
            try
            {
                _logger.LogInformation("=== ChangePassword Started ===");

                // Extract claims from JWT token
                var currentUserIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrEmpty(currentUserIdClaim) || !Guid.TryParse(currentUserIdClaim, out Guid currentUserId))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token. Please login again." });
                }

                // Validate request
                if (request == null)
                {
                    return BadRequest(new { success = false, error = "Invalid request data" });
                }

                var errors = new List<object>();

                if (string.IsNullOrWhiteSpace(request.CurrentPassword))
                {
                    errors.Add(new { msg = "Current password is required", field = "currentPassword" });
                }

                if (string.IsNullOrWhiteSpace(request.NewPassword))
                {
                    errors.Add(new { msg = "New password is required", field = "newPassword" });
                }

                if (string.IsNullOrWhiteSpace(request.ConfirmNewPassword))
                {
                    errors.Add(new { msg = "Confirm new password is required", field = "confirmNewPassword" });
                }

                // Check if new password and confirm new password match
                if (!string.IsNullOrWhiteSpace(request.NewPassword) && !string.IsNullOrWhiteSpace(request.ConfirmNewPassword))
                {
                    if (request.NewPassword != request.ConfirmNewPassword)
                    {
                        errors.Add(new { msg = "New passwords do not match", field = "confirmNewPassword" });
                    }
                }

                // Validate password strength
                if (!string.IsNullOrWhiteSpace(request.NewPassword) && request.NewPassword.Length < 5)
                {
                    errors.Add(new { msg = "Password must be at least 5 characters long", field = "newPassword" });
                }

                if (errors.Any())
                {
                    return BadRequest(new { success = false, errors = errors });
                }

                // Find the user
                var user = await _userService.GetUserByIdAsync(currentUserId);
                if (user == null)
                {
                    return NotFound(new { success = false, error = "User not found" });
                }

                // Use the UserService to change password (NOT _passwordService directly)
                var result = await _userService.ChangePasswordAsync(currentUserId, request.CurrentPassword, request.NewPassword);

                if (!result)
                {
                    return BadRequest(new { success = false, error = "Current password is incorrect" });
                }

                _logger.LogInformation($"Password changed successfully for user {user.Email}");

                return Ok(new
                {
                    success = true,
                    message = "Password updated successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error changing password");
                return StatusCode(500, new
                {
                    success = false,
                    error = "An error occurred while changing the password"
                });
            }
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

        // private List<object> ValidatePasswordReset(ResetPasswordRequest request)
        // {
        //     var errors = new List<object>();

        //     if (string.IsNullOrEmpty(request.Password))
        //         errors.Add(new { msg = "Please fill in password field" });

        //     if (string.IsNullOrEmpty(request.Password2))
        //         errors.Add(new { msg = "Please fill in confirm password field" });

        //     if (request.Password != request.Password2)
        //         errors.Add(new { msg = "Passwords do not match" });

        //     if (request.Password!.Length < 6)
        //         errors.Add(new { msg = "Password should be at least 6 characters" });

        //     return errors;
        // }

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

        private async Task SendVerificationEmailToUser(User user)
        {
            try
            {
                var token = await _userService.GenerateEmailVerificationTokenAsync(user.Id);
                await _emailService.SendVerificationEmailAsync(user.Email, user.Name, token);
                _logger.LogInformation($"Verification email sent to {user.Email}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send verification email to {user.Email}");
                // Don't throw - email failure shouldn't break user creation
            }
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

    public class UpdateUserNameRequest
    {
        public required string Name { get; set; }
    }
    public class UpdateUserRequest
    {
        public string? Name { get; set; }
        public string? Email { get; set; }
        public bool IsAdmin { get; set; }
    }

    public class UpdateUserRoleRequest
    {
        public required string Role { get; set; }
    }

    public class UpdateUserPermissionsRequest
    {
        public required Dictionary<string, bool> Permissions { get; set; }
    }

    public class ChangePasswordRequestDTO
    {
        public required string CurrentPassword { get; set; }
        public required string NewPassword { get; set; }
        public required string ConfirmNewPassword { get; set; }
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
