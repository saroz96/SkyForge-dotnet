using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SkyForge.Data;
using SkyForge.Dto.CompanyDto;
using SkyForge.Models;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.RoleModel;
using SkyForge.Models.Shared;
using SkyForge.Models.UserModel;
using SkyForge.Services;
using SkyForge.Services.AccountGroupServices;
using SkyForge.Services.AccountServices;
using SkyForge.Services.CategoryServices;
using SkyForge.Services.ItemCompanyServices;
using SkyForge.Services.Retailer.SettingsServices;
using SkyForge.Services.StoreServices;
using SkyForge.Services.UnitServices;
using SkyForge.Services.UserServices;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace SkyForge.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CompaniesController : ControllerBase
    {
        private readonly ICompanyService _companyService;
        private readonly IFiscalYearService _fiscalYearService;
        private readonly IUserService _userService;
        private readonly IAccountGroupService _accountGroupService;
        private readonly IAccountService _accountService;
        private readonly ICategoryService _categoryService;
        private readonly IItemCompanyService _itemCompanyService;
        private readonly IUnitService _unitService;
        private readonly IMainUnitService _mainUnitService;
        private readonly IStoreService _storeService;
        private readonly ISettingsService _settingsService;
        private readonly ILogger<CompaniesController> _logger;
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;

        public CompaniesController(
            ICompanyService companyService,
            IFiscalYearService fiscalYearService,
            IUserService userService,
            IAccountGroupService accountGroupService,
            IAccountService accountService,
            ICategoryService categoryService,
            IItemCompanyService itemCompanyService,
            IUnitService unitService,
            IMainUnitService mainUnitService,
            IStoreService storeService,
            ISettingsService settingsService,
            ApplicationDbContext context,
            ILogger<CompaniesController> logger,
            IConfiguration configuration)
        {
            _companyService = companyService;
            _fiscalYearService = fiscalYearService;
            _userService = userService;
            _accountService = accountService;
            _categoryService = categoryService;
            _accountGroupService = accountGroupService;
            _itemCompanyService = itemCompanyService;
            _unitService = unitService;
            _mainUnitService = mainUnitService;
            _storeService = storeService;
            _settingsService = settingsService;
            _context = context;
            _logger = logger;
            _configuration = configuration;
        }

        /// <summary>
        /// Get companies for the authenticated user
        /// </summary>
        [HttpGet("user-companies")]
        [ProducesResponseType(typeof(List<CompaniesResponseDTO>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ErrorResponseDTO), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetUserCompanies()
        {
            try
            {
                // Get current user from JWT token
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId))
                {
                    return Unauthorized(new ErrorResponseDTO
                    {
                        Success = false,
                        Error = "Invalid user token",
                        Type = "AuthenticationError"
                    });
                }

                // Check if user is admin
                var isAdminClaim = User.FindFirst("isAdmin")?.Value;
                bool isAdmin = bool.TryParse(isAdminClaim, out bool admin) && admin;

                List<Company> companies;

                if (isAdmin)
                {
                    // Admin sees all companies they own
                    _logger.LogInformation("Fetching companies for admin user {UserId}", userId);
                    companies = await _companyService.GetCompaniesByOwnerAsync(userId);
                }
                else
                {
                    // Regular users see companies they're associated with
                    _logger.LogInformation("Fetching companies for regular user {UserId}", userId);
                    companies = await _companyService.GetCompaniesByUserAsync(userId);
                }

                // Map to DTO
                var companyDTOs = companies.Select(c => MapToCompanyResponseDTO(c)).ToList();

                _logger.LogInformation("Returning {Count} companies for user {UserId}", companyDTOs.Count, userId);
                return Ok(companyDTOs);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching user companies");
                return StatusCode(500, new ErrorResponseDTO
                {
                    Success = false,
                    Error = "Failed to fetch companies",
                    Type = "ServerError"
                });
            }
        }

        /// <summary>
        /// Switch to a company and set the active fiscal year
        /// </summary>
        [HttpGet("switch/{companyId}")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> SwitchCompany(Guid companyId)
        {
            try
            {
                // Get current user from JWT token
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId))
                {
                    return Unauthorized(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Invalid user token",
                        Data = null
                    });
                }

                // Get the company
                var company = await _companyService.GetCompanyByIdAsync(companyId);
                if (company == null)
                {
                    return NotFound(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Company not found",
                        Data = null
                    });
                }

                // Verify user has access to this company
                var isAdminClaim = User.FindFirst("isAdmin")?.Value;
                bool isAdmin = bool.TryParse(isAdminClaim, out bool admin) && admin;

                // Check if user is owner or has access
                bool hasAccess = company.OwnerId == userId ||
                                 company.Users.Any(u => u.Id == userId) ||
                                 isAdmin;

                if (!hasAccess)
                {
                    return Forbid();
                }

                // Get the latest/active fiscal year for this company
                var fiscalYear = await _fiscalYearService.GetActiveFiscalYearAsync(companyId);
                if (fiscalYear == null)
                {
                    // Get any fiscal year for this company as fallback
                    var anyFiscalYear = await _context.FiscalYears
                        .Where(f => f.CompanyId == companyId)
                        .OrderByDescending(f => f.StartDate)
                        .FirstOrDefaultAsync();

                    if (anyFiscalYear == null)
                    {
                        return BadRequest(new ApiResponse<object>
                        {
                            Success = false,
                            Message = "No fiscal year found for this company",
                            Data = new { redirectPath = "/fiscal-years" }
                        });
                    }

                    fiscalYear = anyFiscalYear;
                }

                // Get the user to generate new token
                var user = await _context.Users
                    .Include(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                {
                    return Unauthorized(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "User not found",
                        Data = null
                    });
                }

                // Get user's primary role
                var primaryRole = user.UserRoles?.FirstOrDefault(ur => ur.IsPrimary)?.Role;

                // Generate NEW JWT token with updated company claims
                var newToken = GenerateJwtTokenWithCompany(user, primaryRole, company);

                // Determine the redirect path based on the company's trade type
                string redirectPath = GetDashboardPath(company.TradeType);

                _logger.LogInformation("User {UserId} switched to company {CompanyId}", userId, companyId);

                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Message = $"Switched to: {company.Name}",
                    Data = new
                    {
                        // Return the NEW token with company claims
                        token = newToken,
                        sessionData = new
                        {
                            company = new
                            {
                                id = company.Id,
                                name = company.Name,
                                tradeType = company.TradeType.ToString()
                            },
                            fiscalYear = new
                            {
                                id = fiscalYear.Id,
                                name = fiscalYear.Name,
                                startDate = fiscalYear.DateFormat == DateFormatEnum.Nepali ?
                                    fiscalYear.StartDateNepali :
                                    fiscalYear.StartDate?.ToString("yyyy-MM-dd"),
                                endDate = fiscalYear.DateFormat == DateFormatEnum.Nepali ?
                                    fiscalYear.EndDateNepali :
                                    fiscalYear.EndDate?.ToString("yyyy-MM-dd"),
                                dateFormat = fiscalYear.DateFormat.ToString()
                            }
                        },
                        redirectPath
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error switching company {CompanyId}", companyId);
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Failed to switch company",
                    Data = ex.Message
                });
            }
        }

        // Add this method to generate JWT with company info
        private string GenerateJwtTokenWithCompany(User user, Role? primaryRole = null, Company? company = null)
        {
            var claims = new List<Claim>
        {
        new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
        new Claim(ClaimTypes.Email, user.Email),
        new Claim(ClaimTypes.Name, user.Name),
        new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        new Claim("userId", user.Id.ToString()),
        new Claim("isAdmin", user.IsAdmin.ToString()),
        new Claim("isEmailVerified", user.IsEmailVerified.ToString()),
        };

            // Add role claim if exists
            if (primaryRole != null)
            {
                claims.Add(new Claim(ClaimTypes.Role, primaryRole.Name));
                claims.Add(new Claim("roleId", primaryRole.Id.ToString()));
            }

            // Add company info to claims (CRITICAL - this adds TradeType and currentCompany)
            if (company != null)
            {
                claims.Add(new Claim("tradeType", company.TradeType.ToString()));
                claims.Add(new Claim("currentCompany", company.Id.ToString()));
                claims.Add(new Claim("currentCompanyName", company.Name));
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

        [HttpPost]
        [ProducesResponseType(typeof(ApiResponse<CompaniesResponseDTO>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CreateCompany([FromBody] CreateCompanyDTO request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var errors = ModelState.Values
                        .SelectMany(v => v.Errors)
                        .Select(e => e.ErrorMessage)
                        .ToList();

                    _logger.LogWarning("Create company validation failed: {Errors}", string.Join(", ", errors));

                    return BadRequest(new ApiResponse<object>
                    {
                        Success = false,
                        Message = string.Join(", ", errors),
                        Data = null
                    });
                }

                // Get current user from JWT token (Owner from authenticated user)
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid ownerId))
                {
                    return Unauthorized(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Invalid user token",
                        Data = null
                    });
                }

                // Check if company already exists
                var existingCompany = await _companyService.GetCompanyByNameAsync(request.Name);
                if (existingCompany != null)
                {
                    return BadRequest(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Company already exists",
                        Data = new { existingCompanyId = existingCompany.Id }
                    });
                }

                // Determine the fiscal year dates based on dateFormat
                string fiscalYearStartDate;
                DateTime? startDate, endDate;

                // Parse date format from string to enum (case-insensitive)
                var dateFormatLower = request.DateFormat?.ToLower();
                var dateFormatEnum = dateFormatLower == "nepali" ? DateFormatEnum.Nepali : DateFormatEnum.English;

                if (dateFormatEnum == DateFormatEnum.Nepali)
                {
                    // For Nepali dates, store as string
                    fiscalYearStartDate = request.StartDateNepali ?? string.Empty;
                    startDate = null;
                    endDate = null;
                }
                else
                {
                    // English dates
                    if (!string.IsNullOrEmpty(request.StartDateEnglish) &&
                        DateTime.TryParse(request.StartDateEnglish, out var parsedStartDate))
                    {
                        startDate = parsedStartDate;
                        endDate = startDate.Value.AddYears(1).AddDays(-1);
                        fiscalYearStartDate = request.StartDateEnglish;
                    }
                    else
                    {
                        // Default to current date if not provided
                        startDate = DateTime.Today;
                        endDate = startDate.Value.AddYears(1).AddDays(-1);
                        fiscalYearStartDate = startDate.Value.ToString("yyyy-MM-dd");
                    }
                }

                // Parse trade type from string
                TradeType tradeTypeEnum;
                if (!Enum.TryParse<TradeType>(request.TradeType, true, out tradeTypeEnum))
                {
                    tradeTypeEnum = TradeType.Retailer; // Default
                }

                // Create the company entity
                var company = new Company
                {
                    Id = Guid.NewGuid(), // Generate new Guid
                    Name = request.Name,
                    Address = request.Address,
                    Country = request.Country,
                    State = request.State,
                    City = request.City,
                    Pan = request.Pan,
                    Phone = request.Phone,
                    Ward = request.Ward,
                    Email = request.Email,
                    TradeType = tradeTypeEnum,
                    DateFormat = dateFormatEnum,
                    VatEnabled = request.VatEnabled,
                    FiscalYearStartDate = fiscalYearStartDate,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = null
                };

                // Save company with authenticated user as owner
                var createdCompany = await _companyService.CreateCompanyAsync(company, ownerId);

                // Get the active fiscal year for the created company
                var activeFiscalYear = await _fiscalYearService.GetActiveFiscalYearAsync(createdCompany.Id);

                if (activeFiscalYear != null)
                {
                    // Create default settings
                    await _settingsService.CreateDefaultSettingsAsync(createdCompany.Id, ownerId, activeFiscalYear.Id);
                }

                // Update user with new company
                await _userService.AddCompanyToUserAsync(ownerId, createdCompany.Id);

                _logger.LogInformation("Company created: {CompanyId} by user {OwnerId}", createdCompany.Id, ownerId);

                var responseDto = MapToCompanyResponseDTO(createdCompany);

                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Message = "Company created successfully",
                    Data = new
                    {
                        company = responseDto,
                        redirectUrl = "/user-dashboard",
                        dashboardPath = "/user-dashboard"
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating company");
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = ex.Message,
                    Data = null
                });
            }
        }

        /// <summary>
        /// Get company by ID
        /// </summary>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(CompaniesResponseDTO), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ErrorResponseDTO), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetCompany(Guid id)
        {
            try
            {
                var company = await _companyService.GetCompanyByIdAsync(id);
                if (company == null)
                {
                    _logger.LogWarning("Company not found: {CompanyId}", id);
                    return NotFound(new ErrorResponseDTO
                    {
                        Success = false,
                        Error = "Company not found",
                        Type = "NotFound"
                    });
                }

                return Ok(MapToCompanyResponseDTO(company));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching company {CompanyId}", id);
                return StatusCode(500, new ErrorResponseDTO
                {
                    Success = false,
                    Error = "Failed to fetch company",
                    Type = "ServerError"
                });
            }
        }

        /// <summary>
        /// Add user to company
        /// </summary>
        [HttpPost("{companyId}/users")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ErrorResponseDTO), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> AddUserToCompany(Guid companyId, [FromBody] AddUserToCompanyDTO request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(new ErrorResponseDTO
                    {
                        Success = false,
                        Error = "Invalid request data",
                        Type = "ValidationError"
                    });
                }

                // Get current user ID from JWT for addedByUserId
                var currentUserIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(currentUserIdClaim) || !Guid.TryParse(currentUserIdClaim, out Guid addedByUserId))
                {
                    return Unauthorized(new ErrorResponseDTO
                    {
                        Success = false,
                        Error = "Invalid user token",
                        Type = "AuthenticationError"
                    });
                }

                var result = await _companyService.AddUserToCompanyAsync(companyId, request.UserId, addedByUserId);
                if (!result)
                {
                    _logger.LogWarning("Failed to add user {UserId} to company {CompanyId}", request.UserId, companyId);
                    return BadRequest(new ErrorResponseDTO
                    {
                        Success = false,
                        Error = "Failed to add user to company",
                        Type = "OperationFailed"
                    });
                }

                _logger.LogInformation("User {UserId} added to company {CompanyId} by {AddedBy}",
                    request.UserId, companyId, addedByUserId);
                return Ok(new { success = true, message = "User added to company successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding user to company");
                return BadRequest(new ErrorResponseDTO
                {
                    Success = false,
                    Error = ex.Message,
                    Type = "ServerError"
                });
            }
        }

        /// <summary>
        /// Delete company and all associated data
        /// </summary>
        [HttpDelete("{companyId}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ErrorResponseDTO), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> DeleteCompany(Guid companyId)
        {
            try
            {
                // Get current user from JWT token
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid currentUserId))
                {
                    return Unauthorized(new ErrorResponseDTO
                    {
                        Success = false,
                        Error = "Invalid user token",
                        Type = "AuthenticationError"
                    });
                }

                // Check if user has permission (must be owner)
                var company = await _companyService.GetCompanyByIdAsync(companyId);
                if (company == null)
                {
                    return NotFound(new ErrorResponseDTO
                    {
                        Success = false,
                        Error = "Company not found",
                        Type = "NotFound"
                    });
                }

                // Only owner can delete company
                if (company.OwnerId != currentUserId)
                {
                    return Forbid();
                }

                // Delete company and all associated data
                var result = await _companyService.DeleteCompanyAsync(companyId);

                if (!result)
                {
                    _logger.LogWarning("Failed to delete company {CompanyId}", companyId);
                    return BadRequest(new ErrorResponseDTO
                    {
                        Success = false,
                        Error = "Failed to delete company",
                        Type = "OperationFailed"
                    });
                }

                _logger.LogInformation("Company {CompanyId} deleted successfully by user {UserId}", companyId, currentUserId);
                return Ok(new
                {
                    success = true,
                    message = "Company and all associated data deleted successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting company {CompanyId}", companyId);
                return BadRequest(new ErrorResponseDTO
                {
                    Success = false,
                    Error = ex.Message,
                    Type = "ServerError"
                });
            }
        }

        /// <summary>
        /// Remove user from company
        /// </summary>
        [HttpDelete("{companyId}/users/{userId}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ErrorResponseDTO), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> RemoveUserFromCompany(Guid companyId, Guid userId)
        {
            try
            {
                var result = await _companyService.RemoveUserFromCompanyAsync(companyId, userId);
                if (!result)
                {
                    _logger.LogWarning("Failed to remove user {UserId} from company {CompanyId}", userId, companyId);
                    return BadRequest(new ErrorResponseDTO
                    {
                        Success = false,
                        Error = "Failed to remove user from company",
                        Type = "OperationFailed"
                    });
                }

                _logger.LogInformation("User {UserId} removed from company {CompanyId}", userId, companyId);
                return Ok(new { success = true, message = "User removed from company successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing user from company");
                return BadRequest(new ErrorResponseDTO
                {
                    Success = false,
                    Error = ex.Message,
                    Type = "ServerError"
                });
            }
        }
        /// <summary>
        /// Update company
        /// </summary>
        [HttpPut("{id}")]
        [ProducesResponseType(typeof(CompaniesResponseDTO), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ErrorResponseDTO), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> UpdateCompany(Guid id, [FromBody] UpdateCompanyDTO request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var errors = ModelState.Values
                        .SelectMany(v => v.Errors)
                        .Select(e => e.ErrorMessage)
                        .ToList();

                    return BadRequest(new ErrorResponseDTO
                    {
                        Success = false,
                        Error = string.Join(", ", errors),
                        Type = "ValidationError"
                    });
                }

                // Map DTO to Company entity - use the enum values directly from request
                var company = new Company
                {
                    Name = request.Name,
                    Address = request.Address,
                    Country = request.Country,
                    State = request.State,
                    City = request.City,
                    Pan = request.Pan,
                    Phone = request.Phone,
                    Ward = request.Ward,
                    Email = request.Email,
                    TradeType = request.TradeType, // Already enum type
                    DateFormat = request.DateFormat, // Already nullable enum type
                    VatEnabled = request.VatEnabled,
                    StoreManagement = request.StoreManagement,
                    RenewalDate = request.RenewalDate,
                    FiscalYearStartDate = request.FiscalYearStartDate,
                    NotificationEmails = request.NotificationEmails ?? new(),
                    AttendanceSettings = request.AttendanceSettings != null
                        ? new CompanyAttendanceSettings
                        {
                            GeoFencingEnabled = request.AttendanceSettings.GeoFencingEnabled,
                            OfficeLocations = request.AttendanceSettings.OfficeLocations?.Select(l => new OfficeLocation
                            {
                                Name = l.Name,
                                Coordinates = new Coordinates
                                {
                                    Lat = l.Coordinates?.Lat,
                                    Lng = l.Coordinates?.Lng
                                },
                                Radius = l.Radius,
                                Address = l.Address,
                                IsActive = l.IsActive
                            }).ToList() ?? new(),
                            WorkingHours = new WorkingHours
                            {
                                StartTime = request.AttendanceSettings.WorkingHours?.StartTime ?? "09:00",
                                EndTime = request.AttendanceSettings.WorkingHours?.EndTime ?? "17:00",
                                GracePeriod = request.AttendanceSettings.WorkingHours?.GracePeriod ?? 15
                            },
                            AutoClockOut = new AutoClockOutSettings
                            {
                                Enabled = request.AttendanceSettings.AutoClockOut?.Enabled ?? false,
                                Time = request.AttendanceSettings.AutoClockOut?.Time ?? "18:00"
                            }
                        }
                        : new CompanyAttendanceSettings()
                };

                var updatedCompany = await _companyService.UpdateCompanyAsync(id, company);

                _logger.LogInformation("Company updated: {CompanyId}", id);
                return Ok(MapToCompanyResponseDTO(updatedCompany));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating company {CompanyId}", id);
                return BadRequest(new ErrorResponseDTO
                {
                    Success = false,
                    Error = ex.Message,
                    Type = "ServerError"
                });
            }
        }
        /// <summary>
        /// Helper method to map Company entity to CompanyResponseDTO
        /// </summary>
        public class CompaniesResponseDTO
        {
            public Guid Id { get; set; }
            public string Name { get; set; } = string.Empty;
            public string Address { get; set; } = string.Empty;
            public string Country { get; set; } = string.Empty;
            public string State { get; set; } = string.Empty;
            public string City { get; set; } = string.Empty;
            public string Pan { get; set; } = string.Empty;
            public string Phone { get; set; } = string.Empty;
            public int? Ward { get; set; }
            public string Email { get; set; } = string.Empty;
            public string TradeType { get; set; } = string.Empty;
            public string DateFormat { get; set; } = string.Empty;
            public bool VatEnabled { get; set; }
            public string FiscalYearStartDate { get; set; } = string.Empty;
            public DateTime CreatedAt { get; set; }
            public DateTime? UpdatedAt { get; set; }
            public Guid OwnerId { get; set; }
            public string OwnerName { get; set; } = string.Empty;
            public string OwnerEmail { get; set; } = string.Empty;
            public string DashboardPath { get; set; } = "/dashboard";
        }

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
                DateFormat = company.DateFormat.ToString(),
                VatEnabled = company.VatEnabled,
                FiscalYearStartDate = company.FiscalYearStartDate,
                CreatedAt = company.CreatedAt,
                UpdatedAt = company.UpdatedAt,
                OwnerId = company.OwnerId,
                OwnerName = company.Owner?.Name ?? string.Empty,
                OwnerEmail = company.Owner?.Email ?? string.Empty,
                DashboardPath = GetDashboardPath(company.TradeType)
            };
        }

        private string GetDashboardPath(TradeType tradeType)
        {
            return tradeType switch
            {
                TradeType.Retailer => "/retailerDashboard/indexv1",
                TradeType.Pharmacy => "/pharmacyDashboard",
                _ => "/dashboard"
            };
        }
    }
}