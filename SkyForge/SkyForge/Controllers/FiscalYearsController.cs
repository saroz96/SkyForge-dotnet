using Microsoft.AspNetCore.Mvc;
using SkyForge.Data;
using SkyForge.Dto;
using SkyForge.Dto.RetailerDto;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.Shared;
using SkyForge.Services;
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using SkyForge.Services;
using SkyForge.Models;

namespace SkyForge.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FiscalYearsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<FiscalYearsController> _logger;
        private readonly IFiscalYearService _fiscalYearService;
        private readonly IJwtService _jwtService;
        private readonly IFiscalYearTransferService _fiscalYearTransferService;
        public FiscalYearsController(
            ApplicationDbContext context,
            ILogger<FiscalYearsController> logger,
            IFiscalYearService fiscalYearService,
            IJwtService jwtService,
            IFiscalYearTransferService fiscalYearTransferService)
        {
            _context = context;
            _logger = logger;
            _fiscalYearService = fiscalYearService;
            _jwtService = jwtService;
            _fiscalYearTransferService = fiscalYearTransferService;
        }

        [HttpGet("change-fiscal-year")]
        public async Task<IActionResult> GetChangeFiscalYearData()
        {
            try
            {
                _logger.LogInformation("=== GetChangeFiscalYearData Started ===");

                // Extract claims from JWT token
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyIdClaim = User.FindFirst("currentCompany")?.Value;
                var currentCompanyName = User.FindFirst("currentCompanyName")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
                var isAdminClaim = User.FindFirst("isAdmin")?.Value;

                // Validate trade type (must be retailer)
                if (string.IsNullOrEmpty(tradeTypeClaim) || tradeTypeClaim.ToLower() != "retailer")
                {
                    return StatusCode(403, new ChangeFiscalYearResponseDto
                    {
                        Success = false,
                        Error = "Access denied for this trade type",
                        Message = "Only retailer accounts can access this resource"
                    });
                }

                // Validate user
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
                {
                    return Unauthorized(new ChangeFiscalYearResponseDto
                    {
                        Success = false,
                        Error = "Invalid user token",
                        Message = "Please login again"
                    });
                }

                // Validate company
                if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out var companyIdGuid))
                {
                    return BadRequest(new ChangeFiscalYearResponseDto
                    {
                        Success = false,
                        Error = "No company selected",
                        Message = "Please select a company first"
                    });
                }

                // Get company details
                var company = await _context.Companies
                    .Include(c => c.FiscalYears)
                    .FirstOrDefaultAsync(c => c.Id == companyIdGuid);

                if (company == null)
                {
                    return NotFound(new ChangeFiscalYearResponseDto
                    {
                        Success = false,
                        Error = "Company not found",
                        Message = "The selected company does not exist"
                    });
                }

                // Get today's date and Nepali date
                var today = DateTime.UtcNow;
                var nepaliDate = today.ToString("yyyy-MM-dd"); // You might want to use a proper Nepali date converter
                var companyDateFormat = company.DateFormat?.ToString().ToLower() ?? "english";

                // Handle fiscal year from claims or get from company
                FiscalYear currentFiscalYear = null;
                string fiscalYearId = null;

                if (!string.IsNullOrEmpty(fiscalYearIdClaim) && Guid.TryParse(fiscalYearIdClaim, out var claimFiscalYearId))
                {
                    currentFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.Id == claimFiscalYearId && f.CompanyId == companyIdGuid);
                    fiscalYearId = claimFiscalYearId.ToString();
                }

                // If no fiscal year in claims, get from company's active fiscal year
                if (currentFiscalYear == null)
                {
                    currentFiscalYear = company.FiscalYears?.FirstOrDefault(f => f.IsActive);
                    if (currentFiscalYear != null)
                    {
                        fiscalYearId = currentFiscalYear.Id.ToString();
                        _logger.LogInformation($"Using active fiscal year from company: {currentFiscalYear.Name}");
                    }
                }

                if (currentFiscalYear == null)
                {
                    return BadRequest(new ChangeFiscalYearResponseDto
                    {
                        Success = false,
                        Error = "No fiscal year found",
                        Message = "No fiscal year found in session or company"
                    });
                }

                // Calculate next fiscal year start date (day after current end date)
                string nextFiscalYearStartDate = null;
                if (currentFiscalYear.EndDate.HasValue)
                {
                    var nextDate = currentFiscalYear.EndDate.Value.AddDays(1);
                    nextFiscalYearStartDate = nextDate.ToString("yyyy-MM-dd");
                }

                // Get user details
                var user = await _context.Users
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Id == userGuid);

                // Determine user role
                string role = "User";
                bool isAdmin = false;

                if (user != null)
                {
                    isAdmin = user.IsAdmin;
                    if (isAdmin)
                    {
                        role = "Admin";
                    }
                    else if (user.UserRoles != null && user.UserRoles.Any())
                    {
                        var primaryRole = user.UserRoles.FirstOrDefault(ur => ur.IsPrimary);
                        if (primaryRole?.Role != null)
                        {
                            role = primaryRole.Role.Name;
                        }
                    }
                }

                // Determine if user is admin or supervisor
                bool isAdminOrSupervisor = false;
                if (bool.TryParse(isAdminClaim, out var isAdminFromClaim))
                {
                    isAdminOrSupervisor = isAdminFromClaim;
                }
                else if (!string.IsNullOrEmpty(userRole))
                {
                    isAdminOrSupervisor = userRole == "Admin" || userRole == "Supervisor";
                }

                // Get theme from user preferences
                string theme = "light";
                if (user?.Preferences != null)
                {
                    var themeObj = user.Preferences.Theme;
                    if (themeObj != null)
                    {
                        theme = themeObj.ToString().ToLower();
                    }
                }

                // Prepare response
                var response = new ChangeFiscalYearResponseDto
                {
                    Success = true,
                    Data = new ChangeFiscalYearDataDto
                    {
                        Company = new CompanyChangeInfoDto
                        {
                            Id = company.Id,
                            RenewalDate = company.RenewalDate,
                            DateFormat = company.DateFormat?.ToString() ?? "English",
                            FiscalYear = currentFiscalYear != null ? new FiscalYearChangeDto
                            {
                                Id = currentFiscalYear.Id,
                                StartDate = currentFiscalYear.StartDate,
                                EndDate = currentFiscalYear.EndDate,
                                StartDateNepali = currentFiscalYear.StartDateNepali,
                                EndDateNepali = currentFiscalYear.EndDateNepali,
                                Name = currentFiscalYear.Name,
                                DateFormat = currentFiscalYear.DateFormat?.ToString() ?? "English",
                                IsActive = currentFiscalYear.IsActive
                            } : null
                        },
                        NextFiscalYearStartDate = nextFiscalYearStartDate,
                        CurrentFiscalYear = currentFiscalYear != null ? new FiscalYearChangeDto
                        {
                            Id = currentFiscalYear.Id,
                            StartDate = currentFiscalYear.StartDate,
                            EndDate = currentFiscalYear.EndDate,
                            StartDateNepali = currentFiscalYear.StartDateNepali,
                            EndDateNepali = currentFiscalYear.EndDateNepali,
                            Name = currentFiscalYear.Name,
                            DateFormat = currentFiscalYear.DateFormat?.ToString() ?? "English",
                            IsActive = currentFiscalYear.IsActive
                        } : null,
                        CurrentCompanyName = currentCompanyName ?? company.Name,
                        NepaliDate = nepaliDate,
                        CompanyDateFormat = companyDateFormat,
                        User = new UserChangeInfoDto
                        {
                            Id = user?.Id ?? userGuid,
                            Username = user?.Name ?? string.Empty,
                            Email = user?.Email ?? string.Empty,
                            IsAdmin = isAdmin,
                            Role = role,
                            Preferences = new UserPreferencesDto
                            {
                                Theme = theme
                            }
                        },
                        Theme = theme,
                        IsAdminOrSupervisor = isAdminOrSupervisor
                    }
                };

                _logger.LogInformation("Successfully retrieved change fiscal year data for company: {CompanyName}", company.Name);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching change fiscal year data");
                return StatusCode(500, new ChangeFiscalYearResponseDto
                {
                    Success = false,
                    Error = "Failed to load fiscal year data",
                    Message = ex.Message
                });
            }
        }

        [HttpPost("create-next")]
        public async Task<IActionResult> CreateNextFiscalYear([FromBody] CreateNextFiscalYearRequest request)
        {
            try
            {
                _logger.LogInformation("=== CreateNextFiscalYear Started ===");

                var companyIdClaim = User.FindFirst("currentCompany")?.Value;
                if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out var companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                var company = await _context.Companies
                    .Include(c => c.FiscalYears)
                    .FirstOrDefaultAsync(c => c.Id == companyIdGuid);

                if (company == null)
                {
                    return NotFound(new { success = false, error = "Company not found" });
                }

                // Get current active fiscal year
                var currentFiscalYear = company.FiscalYears?.FirstOrDefault(f => f.IsActive);
                if (currentFiscalYear == null)
                {
                    return BadRequest(new { success = false, error = "No active fiscal year found" });
                }

                // Get dates from request (sent from frontend)
                DateTime? nextStartDate = null;
                DateTime? nextEndDate = null;
                string? nextStartDateNepali = null;
                string? nextEndDateNepali = null;
                string nextYearName = string.Empty;

                var isNepaliFormat = currentFiscalYear.DateFormat == DateFormatEnum.Nepali;

                if (isNepaliFormat)
                {
                    // For Nepali format, use Nepali dates from request
                    nextStartDateNepali = request.StartDateNepali;
                    nextEndDateNepali = request.EndDateNepali;

                    // ALSO use English dates from request (these are already calculated in frontend)
                    nextStartDate = request.StartDate;
                    nextEndDate = request.EndDate;

                    // Generate name from Nepali start year (e.g., 2082/83)
                    if (!string.IsNullOrEmpty(nextStartDateNepali))
                    {
                        var parts = nextStartDateNepali.Split('-');
                        if (parts.Length == 3)
                        {
                            int startYear = int.Parse(parts[0]);
                            int endYear = startYear + 1;
                            nextYearName = $"{startYear}/{endYear % 100:D2}";
                        }
                        else
                        {
                            nextYearName = $"FY {DateTime.UtcNow.Year}-{(DateTime.UtcNow.Year + 1) % 100}";
                        }
                    }
                    else
                    {
                        nextYearName = $"FY {DateTime.UtcNow.Year}-{(DateTime.UtcNow.Year + 1) % 100}";
                    }
                }
                else
                {
                    // For English format, use English dates from request
                    nextStartDate = request.StartDate;
                    nextEndDate = request.EndDate;

                    // Also use Nepali dates from request
                    nextStartDateNepali = request.StartDateNepali;
                    nextEndDateNepali = request.EndDateNepali;

                    // Generate name from English start year (e.g., 2024/25)
                    if (nextStartDate.HasValue)
                    {
                        int startYear = nextStartDate.Value.Year;
                        int endYear = startYear + 1;
                        nextYearName = $"{startYear}/{endYear % 100:D2}";
                    }
                    else
                    {
                        nextYearName = $"FY {DateTime.UtcNow.Year}-{(DateTime.UtcNow.Year + 1) % 100}";
                    }
                }

                // Create new fiscal year
                var newFiscalYear = new FiscalYear
                {
                    Id = Guid.NewGuid(),
                    Name = nextYearName,
                    StartDate = nextStartDate,
                    EndDate = nextEndDate,
                    StartDateNepali = nextStartDateNepali,
                    EndDateNepali = nextEndDateNepali,
                    DateFormat = currentFiscalYear.DateFormat,
                    CompanyId = companyIdGuid,
                    IsActive = false, // Not active until transfer is done
                    BillPrefixes = new BillPrefixes
                    {
                        Sales = GenerateUniquePrefix(),
                        SalesQuotation = GenerateUniquePrefix(),
                        SalesReturn = GenerateUniquePrefix(),
                        Purchase = GenerateUniquePrefix(),
                        PurchaseReturn = GenerateUniquePrefix(),
                        Payment = GenerateUniquePrefix(),
                        Receipt = GenerateUniquePrefix(),
                        StockAdjustment = GenerateUniquePrefix(),
                        DebitNote = GenerateUniquePrefix(),
                        CreditNote = GenerateUniquePrefix(),
                        JournalVoucher = GenerateUniquePrefix()
                    },
                    CreatedAt = DateTime.UtcNow
                };

                _context.FiscalYears.Add(newFiscalYear);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Created new fiscal year: {Name} for company: {CompanyName}", newFiscalYear.Name, company.Name);

                return Ok(new
                {
                    success = true,
                    message = "New fiscal year created successfully",
                    data = new
                    {
                        fiscalYear = new
                        {
                            newFiscalYear.Id,
                            newFiscalYear.Name,
                            newFiscalYear.StartDate,
                            newFiscalYear.EndDate,
                            newFiscalYear.StartDateNepali,
                            newFiscalYear.EndDateNepali,
                            newFiscalYear.DateFormat
                        },
                        sourceFiscalYearId = currentFiscalYear.Id,
                        targetFiscalYearId = newFiscalYear.Id
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating next fiscal year");
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        // Request DTO for creating next fiscal year
        public class CreateNextFiscalYearRequest
        {
            public DateTime? StartDate { get; set; }
            public DateTime? EndDate { get; set; }
            public string? StartDateNepali { get; set; }
            public string? EndDateNepali { get; set; }
        }

        private string GenerateUniquePrefix()
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            var random = new Random();
            return new string(Enumerable.Repeat(chars, 4)
                .Select(s => s[random.Next(s.Length)]).ToArray());
        }

        [HttpGet("transfer-preview")]
        public async Task<IActionResult> GetTransferPreview([FromQuery] Guid sourceFiscalYearId, [FromQuery] Guid targetFiscalYearId)
        {
            try
            {
                var companyIdClaim = User.FindFirst("currentCompany")?.Value;
                if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out var companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                var preview = await _fiscalYearTransferService.GetTransferPreviewAsync(sourceFiscalYearId, targetFiscalYearId, companyIdGuid);
                return Ok(new { success = true, data = preview });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting transfer preview");
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        [HttpPost("transfer")]
        public async Task<IActionResult> TransferFiscalYearBalances([FromBody] FiscalYearTransferRequestDto request)
        {
            try
            {
                _logger.LogInformation("=== TransferFiscalYearBalances Started ===");

                var companyIdClaim = User.FindFirst("currentCompany")?.Value;
                if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out var companyIdGuid))
                {
                    return BadRequest(new FiscalYearTransferResponseDto
                    {
                        Success = false,
                        Message = "No company selected",
                        Errors = new List<string> { "Please select a company first" }
                    });
                }

                // Validate dates
                if (request.TransferDate == default)
                {
                    request.TransferDate = DateTime.UtcNow;
                }

                var result = await _fiscalYearTransferService.TransferFiscalYearBalancesAsync(request, companyIdGuid);

                if (result.Success)
                {
                    _logger.LogInformation("Fiscal year transfer completed successfully");
                    return Ok(result);
                }

                return BadRequest(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error transferring fiscal year balances");
                return StatusCode(500, new FiscalYearTransferResponseDto
                {
                    Success = false,
                    Message = "Internal server error",
                    Errors = new List<string> { ex.Message }
                });
            }
        }

        [HttpPost("transfer/validate")]
        public async Task<IActionResult> ValidateTransfer([FromBody] ValidateTransferRequestDto request)
        {
            try
            {
                var companyIdClaim = User.FindFirst("currentCompany")?.Value;
                if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out var companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                var result = await _fiscalYearTransferService.ValidateTransferAsync(
                    request.SourceFiscalYearId,
                    request.TargetFiscalYearId,
                    companyIdGuid);

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating transfer");
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        public class ValidateTransferRequestDto
        {
            public Guid SourceFiscalYearId { get; set; }
            public Guid TargetFiscalYearId { get; set; }
        }


        [HttpGet("switch-fiscal-year")]
        public async Task<IActionResult> GetSwitchFiscalYearData()
        {
            try
            {
                _logger.LogInformation("=== GetSwitchFiscalYearData Started ===");

                // Extract claims from JWT token
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyIdClaim = User.FindFirst("currentCompany")?.Value;
                var currentCompanyName = User.FindFirst("currentCompanyName")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
                var isAdminClaim = User.FindFirst("isAdmin")?.Value;

                // Validate user
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
                {
                    return Unauthorized(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Invalid user token"
                    });
                }

                // Validate company
                if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out var companyIdGuid))
                {
                    return BadRequest(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "No company selected"
                    });
                }

                // Get company with fiscal years collection
                var company = await _context.Companies
                    .Include(c => c.FiscalYears)
                    .FirstOrDefaultAsync(c => c.Id == companyIdGuid);

                if (company == null)
                {
                    return NotFound(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Company not found"
                    });
                }

                // Get initial current fiscal year (the active one)
                var activeFiscalYear = company.FiscalYears?.FirstOrDefault(f => f.IsActive);
                var initialCurrentFiscalYear = activeFiscalYear != null ? MapToFiscalYearDto(activeFiscalYear) : null;

                // Fetch all fiscal years for the company
                var fiscalYears = await _context.FiscalYears
                    .Where(f => f.CompanyId == companyIdGuid)
                    .OrderBy(f => f.StartDate)
                    .ToListAsync();

                // Handle current fiscal year from claims or get the active one
                string currentFiscalYearId = null;

                if (!string.IsNullOrEmpty(fiscalYearIdClaim) && Guid.TryParse(fiscalYearIdClaim, out var claimFiscalYearId))
                {
                    currentFiscalYearId = claimFiscalYearId.ToString();
                }
                else if (activeFiscalYear != null)
                {
                    currentFiscalYearId = activeFiscalYear.Id.ToString();
                    _logger.LogInformation($"Setting current fiscal year to active one: {activeFiscalYear.Name}");
                }
                else if (fiscalYears.Any())
                {
                    // Get the last fiscal year (most recent) if no active one
                    var lastFiscalYear = fiscalYears.LastOrDefault();
                    if (lastFiscalYear != null)
                    {
                        currentFiscalYearId = lastFiscalYear.Id.ToString();
                        _logger.LogInformation($"Setting current fiscal year to last one: {lastFiscalYear.Name}");
                    }
                }

                // Get user preferences
                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.Id == userGuid);

                // Determine if user is admin or supervisor
                bool isAdminOrSupervisor = false;
                if (bool.TryParse(isAdminClaim, out var isAdmin))
                {
                    isAdminOrSupervisor = isAdmin;
                }
                else if (!string.IsNullOrEmpty(userRole))
                {
                    isAdminOrSupervisor = userRole == "Admin" || userRole == "Supervisor";
                }

                // Get theme from user preferences (handling enum if needed)
                string theme = "light";
                if (user?.Preferences != null)
                {
                    // If Preferences.Theme is an enum, convert to string
                    var themeObj = user.Preferences.Theme;
                    if (themeObj != null)
                    {
                        theme = themeObj.ToString().ToLower();
                    }
                }

                // Prepare response using ApiResponse format
                var responseData = new SwitchFiscalYearDataDto
                {
                    Company = new CompanyInfoDTO
                    {
                        Id = company.Id,
                        Name = company.Name,
                        Address = company.Address,
                        City = company.City,
                        Phone = company.Phone,
                        Pan = company.Pan,
                        RenewalDate = company.RenewalDate,
                        DateFormat = company.DateFormat?.ToString() ?? "English",
                        VatEnabled = company.VatEnabled,
                        FiscalYear = initialCurrentFiscalYear
                    },
                    CurrentFiscalYear = currentFiscalYearId,
                    InitialCurrentFiscalYear = initialCurrentFiscalYear,
                    FiscalYears = fiscalYears.Select(f => MapToFiscalYearDto(f)).ToList(),
                    CurrentCompanyName = currentCompanyName ?? company.Name,
                    User = new UserInfoForFiscalYearDto
                    {
                        Id = userGuid,
                        Preferences = new UserPreferencesDto
                        {
                            Theme = theme
                        },
                        IsAdminOrSupervisor = isAdminOrSupervisor
                    }
                };

                _logger.LogInformation("Successfully retrieved fiscal year data for company: {CompanyName}", company.Name);

                return Ok(new ApiResponse<SwitchFiscalYearDataDto>
                {
                    Success = true,
                    Message = "Fiscal year data retrieved successfully",
                    Data = responseData
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching fiscal years data");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Failed to fetch fiscal years data: " + ex.Message
                });
            }
        }
        private FiscalYearDTO MapToFiscalYearDto(FiscalYear fiscalYear)
        {
            if (fiscalYear == null) return null;

            return new FiscalYearDTO
            {
                Id = fiscalYear.Id,
                Name = fiscalYear.Name,
                StartDate = fiscalYear.StartDate,
                EndDate = fiscalYear.EndDate,
                StartDateNepali = fiscalYear.StartDateNepali,
                EndDateNepali = fiscalYear.EndDateNepali,
                IsActive = fiscalYear.IsActive,
                DateFormat = fiscalYear.DateFormat?.ToString() ?? "English"
            };
        }

        [HttpPost("switch-fiscal-year")]
        public async Task<IActionResult> SwitchFiscalYear([FromBody] SwitchFiscalYearRequestDto request)
        {
            try
            {
                _logger.LogInformation("=== SwitchFiscalYear Started ===");

                // Validate request
                if (request.FiscalYearId == Guid.Empty)
                {
                    return BadRequest(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Fiscal Year ID is required"
                    });
                }

                // Extract existing claims from current JWT token
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyIdClaim = User.FindFirst("currentCompany")?.Value;
                var currentCompanyName = User.FindFirst("currentCompanyName")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
                var isAdminClaim = User.FindFirst("isAdmin")?.Value;
                var isEmailVerifiedClaim = User.FindFirst("isEmailVerified")?.Value;

                // Validate user
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
                {
                    return Unauthorized(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Invalid user token"
                    });
                }

                // Validate company
                if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out var companyIdGuid))
                {
                    return BadRequest(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "No company selected"
                    });
                }

                // Fetch the selected fiscal year
                var fiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.Id == request.FiscalYearId && f.CompanyId == companyIdGuid);

                if (fiscalYear == null)
                {
                    return NotFound(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Fiscal Year not found"
                    });
                }

                // Get the user for token generation
                var user = await _context.Users
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Id == userGuid);

                if (user == null)
                {
                    return NotFound(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "User not found"
                    });
                }

                // Get company details with fiscal years
                var company = await _context.Companies
                    .Include(c => c.FiscalYears)
                    .FirstOrDefaultAsync(c => c.Id == companyIdGuid);

                if (company == null)
                {
                    return NotFound(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Company not found"
                    });
                }

                using var dbTransaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    // Get all fiscal years for this company
                    var allFiscalYears = await _context.FiscalYears
                        .Where(f => f.CompanyId == companyIdGuid)
                        .ToListAsync();

                    // Update IsActive flag: set selected fiscal year to true, all others to false
                    foreach (var fy in allFiscalYears)
                    {
                        fy.IsActive = (fy.Id == request.FiscalYearId);
                    }

                    await _context.SaveChangesAsync();
                    await dbTransaction.CommitAsync();

                    _logger.LogInformation("Updated fiscal year active status: {FiscalYearName} is now active", fiscalYear.Name);
                }
                catch (Exception ex)
                {
                    await dbTransaction.RollbackAsync();
                    _logger.LogError(ex, "Error updating fiscal year active status");
                    throw;
                }


                // Get user's primary role
                var primaryRole = user.UserRoles?.FirstOrDefault(ur => ur.IsPrimary)?.Role;

                // Prepare ALL claims - MUST include BOTH company AND fiscal year claims
                var allClaims = new Dictionary<string, string>
                {
                    // User claims
                    ["userId"] = user.Id.ToString(),
                    ["isAdmin"] = user.IsAdmin.ToString(),
                    ["isEmailVerified"] = user.IsEmailVerified.ToString(),

                    // Company claims (CRITICAL - these must be included)
                    ["currentCompany"] = company.Id.ToString(),
                    ["currentCompanyName"] = company.Name,
                    ["tradeType"] = company.TradeType.ToString(),

                    // Fiscal year claims (CRITICAL for EnsureFiscalYearMiddleware)
                    ["fiscalYearId"] = fiscalYear.Id.ToString(),
                    ["fiscalYearName"] = fiscalYear.Name,
                    ["fiscalYearStartDate"] = GetFormattedDateForClaim(fiscalYear.StartDate, fiscalYear.DateFormat, fiscalYear.StartDateNepali),
                    ["fiscalYearEndDate"] = GetFormattedDateForClaim(fiscalYear.EndDate, fiscalYear.DateFormat, fiscalYear.EndDateNepali),
                    ["fiscalYearDateFormat"] = fiscalYear.DateFormat?.ToString() ?? "English"
                };

                // Add role claim if exists
                if (primaryRole != null)
                {
                    allClaims[ClaimTypes.Role] = primaryRole.Name;
                    allClaims["roleId"] = primaryRole.Id.ToString();
                }
                else if (!string.IsNullOrEmpty(userRole))
                {
                    allClaims[ClaimTypes.Role] = userRole;
                }

                // Also add email and name claims for completeness
                allClaims[ClaimTypes.Email] = user.Email;
                allClaims[ClaimTypes.Name] = user.Name;
                allClaims[ClaimTypes.NameIdentifier] = user.Id.ToString();

                // Generate new JWT token with ALL claims (both company and fiscal year)
                var newToken = _jwtService.GenerateTokenWithClaims(user, allClaims, primaryRole);

                // Return success response with new token
                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Message = $"Switched to fiscal year: {fiscalYear.Name}",
                    Data = new
                    {
                        token = newToken,
                        sessionData = new
                        {
                            company = new
                            {
                                id = company.Id,
                                name = company.Name,
                                tradeType = company.TradeType.ToString(),
                                dateFormat = company.DateFormat?.ToString() ?? "English"
                            },
                            fiscalYear = new
                            {
                                id = fiscalYear.Id,
                                name = fiscalYear.Name,
                                startDate = fiscalYear.StartDate?.ToString("yyyy-MM-dd"),
                                endDate = fiscalYear.EndDate?.ToString("yyyy-MM-dd"),
                                startDateNepali = fiscalYear.StartDateNepali,
                                endDateNepali = fiscalYear.EndDateNepali,
                                dateFormat = fiscalYear.DateFormat?.ToString() ?? "English",
                                isActive = true
                            }
                        }
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error switching fiscal year");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Failed to switch fiscal year: " + ex.Message
                });
            }
        }

        private string GetFormattedDateForClaim(DateTime? date, DateFormatEnum? dateFormat, string nepaliDate)
        {
            if (!date.HasValue) return string.Empty;

            if (dateFormat == DateFormatEnum.Nepali && !string.IsNullOrEmpty(nepaliDate))
            {
                return nepaliDate;
            }

            return date.Value.ToString("yyyy-MM-dd");
        }

        [HttpPost]
        public async Task<IActionResult> CreateFiscalYear([FromBody] CreateFiscalYearRequest request)
        {
            try
            {
                var fiscalYear = new FiscalYear
                {
                    Id = Guid.NewGuid(),
                    Name = request.Name,
                    StartDate = request.StartDate,
                    EndDate = request.EndDate,
                    StartDateNepali = request.StartDateNepali,
                    EndDateNepali = request.EndDateNepali,
                    DateFormat = request.DateFormat,
                    CompanyId = request.CompanyId,
                    BillPrefixes = request.BillPrefixes ?? new BillPrefixes(),
                    CreatedAt = DateTime.UtcNow
                };

                var createdFiscalYear = await _fiscalYearService.CreateFiscalYearAsync(fiscalYear);
                return Ok(createdFiscalYear);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpGet("company/{companyId}/active")]
        public async Task<IActionResult> GetActiveFiscalYear(Guid companyId)
        {
            var fiscalYear = await _fiscalYearService.GetActiveFiscalYearAsync(companyId);
            if (fiscalYear == null)
                return NotFound(new { message = "No active fiscal year found" });

            return Ok(fiscalYear);
        }

        [HttpGet("company/{companyId}")]
        public async Task<IActionResult> GetCompanyFiscalYears(Guid companyId)
        {
            var fiscalYears = await _fiscalYearService.GetCompanyFiscalYearsAsync(companyId);
            return Ok(fiscalYears);
        }

        [HttpPost("{id}/activate")]
        public async Task<IActionResult> ActivateFiscalYear(Guid id, [FromQuery] Guid companyId)
        {
            try
            {
                var result = await _fiscalYearService.ActivateFiscalYearAsync(id, companyId);
                if (!result)
                    return BadRequest("Failed to activate fiscal year");

                return Ok(new { message = "Fiscal year activated successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }


        // Controllers/FiscalYearsController.cs - Add this method

        [HttpGet("split-fiscal-year")]
        public async Task SplitFiscalYear(CancellationToken cancellationToken)
        {
            try
            {
                _logger.LogInformation("Split fiscal year SSE endpoint hit");

                // Set SSE headers
                Response.Headers.Append("Content-Type", "text/event-stream");
                Response.Headers.Append("Cache-Control", "no-cache");
                Response.Headers.Append("Connection", "keep-alive");
                Response.Headers.Append("Access-Control-Allow-Origin", "*");

                // Get parameters from query string
                var sourceCompanyIdParam = Request.Query["sourceCompanyId"].ToString();
                var fiscalYearIdParam = Request.Query["fiscalYearId"].ToString();
                var newCompanyName = Request.Query["newCompanyName"].ToString();
                var deleteAfterSplitParam = Request.Query["deleteAfterSplit"].ToString();

                _logger.LogInformation("SSE Split request params: SourceCompanyId={SourceCompanyId}, FiscalYearId={FiscalYearId}, NewCompanyName={NewCompanyName}, DeleteAfterSplit={DeleteAfterSplit}",
                    sourceCompanyIdParam, fiscalYearIdParam, newCompanyName, deleteAfterSplitParam);

                // Validate input
                if (string.IsNullOrEmpty(sourceCompanyIdParam) || !Guid.TryParse(sourceCompanyIdParam, out var sourceCompanyId))
                {
                    await SendSseEvent("error", new { error = "Valid source company ID is required" });
                    return;
                }

                if (string.IsNullOrEmpty(fiscalYearIdParam) || !Guid.TryParse(fiscalYearIdParam, out var fiscalYearId))
                {
                    await SendSseEvent("error", new { error = "Valid fiscal year ID is required" });
                    return;
                }

                if (string.IsNullOrEmpty(newCompanyName))
                {
                    await SendSseEvent("error", new { error = "New company name is required" });
                    return;
                }

                // Extract user ID from claims
                var userIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
                {
                    await SendSseEvent("error", new { error = "User not authenticated" });
                    return;
                }

                var deleteAfterSplit = deleteAfterSplitParam?.ToLower() == "true";

                var request = new SplitFiscalYearRequestDto
                {
                    SourceCompanyId = sourceCompanyId,
                    FiscalYearId = fiscalYearId,
                    NewCompanyName = newCompanyName,
                    DeleteAfterSplit = deleteAfterSplit
                };

                // Flag to track if operation completed successfully
                var operationCompleted = false;

                // Setup progress handler
                var progressHandler = new Func<SplitFiscalYearProgressEventDto, Task>(async (progress) =>
                {
                    await SendSseEvent(progress.Type, new
                    {
                        progress.Value,
                        progress.Message,
                        error = progress.Error,
                        details = progress.Details,
                        data = progress.Data
                    });

                    if (progress.Type == "complete" || progress.Type == "error")
                    {
                        operationCompleted = true;
                    }
                });

                try
                {
                    await _fiscalYearService.SplitFiscalYearAsync(request, userId, progressHandler, cancellationToken);
                }
                catch (OperationCanceledException)
                {
                    _logger.LogWarning("Split operation was cancelled by client disconnect");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Unhandled error in SplitFiscalYear SSE endpoint");
                    await SendSseEvent("error", new { error = ex.Message, details = ex.StackTrace });
                }
                finally
                {
                    if (!operationCompleted)
                    {
                        await SendSseEvent("error", new { error = "Operation terminated unexpectedly" });
                    }
                    await Response.Body.FlushAsync(cancellationToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in SplitFiscalYear SSE endpoint");
            }

            // Helper function to send SSE events
            async Task SendSseEvent(string eventType, object data)
            {
                try
                {
                    var jsonData = System.Text.Json.JsonSerializer.Serialize(data);
                    await Response.WriteAsync($"data: {jsonData}\n\n");
                    await Response.Body.FlushAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error sending SSE event");
                }
            }


        }


        public class CreateFiscalYearRequest
        {
            public string Name { get; set; }
            public DateTime? StartDate { get; set; }
            public DateTime? EndDate { get; set; }
            public string? StartDateNepali { get; set; }
            public string? EndDateNepali { get; set; }
            public DateFormatEnum? DateFormat { get; set; } = DateFormatEnum.English;
            public Guid CompanyId { get; set; }
            public BillPrefixes BillPrefixes { get; set; }
        }
    }
}