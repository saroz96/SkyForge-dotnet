using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.Retailer.MainUnitModel;
using SkyForge.Dto.RetailerDto.MainUnitDto;
using SkyForge.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SkyForge.Controllers.Retailer
{
    [ApiController]
    [Route("api/retailer")]
    [Authorize]
    public class MainUnitsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<MainUnitsController> _logger;
        private readonly IMainUnitService _mainUnitService;

        public MainUnitsController(
            ApplicationDbContext context,
            ILogger<MainUnitsController> logger,
            IMainUnitService mainUnitService)
        {
            _context = context;
            _logger = logger;
            _mainUnitService = mainUnitService;
        }

        // GET: api/retailer/mainUnits
        [HttpGet("mainUnits")]
        public async Task<IActionResult> GetMainUnitsData()
        {
            try
            {
                _logger.LogInformation("=== GetMainUnitsData Started ===");

                // 1. Extract ALL user info from JWT claims
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var userName = User.FindFirst(ClaimTypes.Name)?.Value;
                var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
                var isAdminClaim = User.FindFirst("isAdmin")?.Value;
                var roleName = User.FindFirst(ClaimTypes.Role)?.Value;
                var roleId = User.FindFirst("roleId")?.Value;
                var isEmailVerifiedClaim = User.FindFirst("isEmailVerified")?.Value;

                // 2. Extract ALL company info from JWT claims
                var companyId = User.FindFirst("currentCompany")?.Value;
                var companyName = User.FindFirst("currentCompanyName")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                // 3. Parse boolean claims
                bool isAdmin = bool.TryParse(isAdminClaim, out bool admin) && admin;
                bool isEmailVerified = bool.TryParse(isEmailVerifiedClaim, out bool emailVerified) && emailVerified;

                // 4. Validate required claims exist
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    _logger.LogError("Invalid or missing userId claim");
                    return Unauthorized(new
                    {
                        success = false,
                        error = "Invalid user token. Please login again.",
                        redirectTo = "/login"
                    });
                }

                // 5. Check if company claim exists
                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    _logger.LogError("No company selected in JWT token. Missing 'currentCompany' claim.");
                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected. Please select a company first.",
                        redirectTo = "/user-dashboard"
                    });
                }

                // 6. Check if trade type claim exists and validate it's Retailer
                TradeType? tradeType = null;
                if (string.IsNullOrEmpty(tradeTypeClaim))
                {
                    _logger.LogError("Missing 'tradeType' claim in JWT token");

                    // Try to get trade type from database as fallback
                    var company = await _context.Companies
                        .Where(c => c.Id == companyIdGuid)
                        .Select(c => new { c.TradeType })
                        .FirstOrDefaultAsync();

                    if (company != null)
                    {
                        tradeType = company.TradeType;
                        _logger.LogInformation($"Fetched TradeType from DB: {tradeType}");
                    }
                    else
                    {
                        _logger.LogError($"Company not found in database: {companyIdGuid}");
                        return BadRequest(new
                        {
                            success = false,
                            error = "Company not found",
                            redirectTo = "/user-dashboard"
                        });
                    }
                }
                else
                {
                    if (Enum.TryParse<TradeType>(tradeTypeClaim, out var parsedTradeType))
                    {
                        tradeType = parsedTradeType;
                        _logger.LogInformation($"Parsed TradeType from JWT: {tradeType}");
                    }
                    else
                    {
                        _logger.LogError($"Invalid TradeType in JWT: {tradeTypeClaim}");
                        return BadRequest(new
                        {
                            success = false,
                            error = "Invalid trade type in token",
                            redirectTo = "/user-dashboard"
                        });
                    }
                }

                // 7. Validate trade type is Retailer
                if (tradeType.HasValue && tradeType.Value != TradeType.Retailer)
                {
                    _logger.LogWarning($"Access denied: TradeType is {tradeType.Value}, not Retailer");
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "Access forbidden for this trade type"
                    });
                }

                // 8. Get company details from database
                var companyDetails = await _context.Companies
                    .Where(c => c.Id == companyIdGuid)
                    .Select(c => new
                    {
                        c.Id,
                        c.Name,
                        c.RenewalDate,
                        c.DateFormat
                    })
                    .FirstOrDefaultAsync();

                if (companyDetails == null)
                {
                    _logger.LogError($"Company not found in database: {companyIdGuid}");
                    return NotFound(new
                    {
                        success = false,
                        error = "Company not found",
                        redirectTo = "/user-dashboard"
                    });
                }

                // 9. Get active fiscal year for the company
                var fiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                if (fiscalYear == null)
                {
                    // Try to get any fiscal year as fallback
                    fiscalYear = await _context.FiscalYears
                        .Where(f => f.CompanyId == companyIdGuid)
                        .OrderByDescending(f => f.StartDate)
                        .FirstOrDefaultAsync();

                    if (fiscalYear == null)
                    {
                        return BadRequest(new
                        {
                            success = false,
                            error = "No fiscal year found for this company",
                            redirectTo = "/fiscal-years"
                        });
                    }
                }

                // 10. Get main units for this company
                var mainUnits = await _mainUnitService.GetMainUnitsByCompanyAsync(companyIdGuid);

                // 11. Determine if user is admin or supervisor
                var userRole = roleName ?? "User";
                bool isAdminOrSupervisor = isAdmin || (userRole == "Supervisor" || userRole == "Admin");

                // 12. Prepare user info for response
                var userInfo = new
                {
                    _id = userId,
                    id = userId,
                    name = userName ?? "User",
                    email = userEmail ?? "",
                    isAdmin = isAdmin,
                    role = userRole,
                    roleId = roleId,
                    isEmailVerified = isEmailVerified,
                    preferences = new { theme = "light" }
                };

                // 13. Prepare main units data for response
                var mainUnitsData = mainUnits.Select(mu => new
                {
                    _id = mu.Id,
                    id = mu.Id,
                    name = mu.Name,
                    uniqueNumber = mu.UniqueNumber,
                    company = mu.CompanyId,
                    companyId = mu.CompanyId,
                    createdAt = mu.CreatedAt,
                    updatedAt = mu.UpdatedAt
                }).ToList();

                // 14. Prepare response matching Express route format
                var responseData = new
                {
                    success = true,
                    data = new
                    {
                        mainUnits = mainUnitsData,
                        company = new
                        {
                            _id = companyDetails.Id,
                            id = companyDetails.Id,
                            renewalDate = companyDetails.RenewalDate,
                            dateFormat = companyDetails.DateFormat?.ToString()?.ToLower() ?? "english"
                        },
                        currentFiscalYear = new
                        {
                            _id = fiscalYear.Id,
                            id = fiscalYear.Id,
                            name = fiscalYear.Name,
                            startDate = fiscalYear.StartDate,
                            endDate = fiscalYear.EndDate,
                            dateFormat = fiscalYear.DateFormat?.ToString()?.ToLower() ?? "english",
                            isActive = fiscalYear.IsActive
                        },
                        currentCompanyName = companyName ?? companyDetails.Name,
                        companyId = companyIdGuid,
                        user = userInfo,
                        isAdminOrSupervisor = isAdminOrSupervisor
                    }
                };

                _logger.LogInformation($"Successfully fetched {mainUnits.Count} main units for company {companyDetails.Name}");

                return Ok(responseData);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetMainUnitsData");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Server error occurred while fetching main units",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // POST: api/retailer/mainUnits
        [HttpPost("mainUnits")]
        public async Task<IActionResult> CreateMainUnit([FromBody] CreateMainUnitDTO request)
        {
            try
            {
                _logger.LogInformation("=== CreateMainUnit Started ===");

                // 1. Extract trade type from JWT claims
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                // 2. Check if trade type is Retailer
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "Access forbidden for this trade type"
                    });
                }

                // 3. Extract company info from JWT claims
                var companyId = User.FindFirst("currentCompany")?.Value;

                // 4. Check if company is selected
                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Company ID is required"
                    });
                }

                // 5. Validate required fields
                if (string.IsNullOrEmpty(request.Name) || request.Name.Trim() == "")
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Main unit name is required"
                    });
                }

                // 6. Create new main unit object
                var newMainUnit = new MainUnit
                {
                    Id = Guid.NewGuid(),
                    Name = request.Name.Trim(),
                    CompanyId = companyIdGuid,
                    CreatedAt = DateTime.UtcNow,
                    UniqueNumber = await _mainUnitService.GenerateUniqueMainUnitNumberAsync()
                };

                try
                {
                    // 7. Save the main unit using the service
                    var createdMainUnit = await _mainUnitService.CreateMainUnitAsync(newMainUnit);

                    // 8. Prepare response (match Express route response format)
                    var response = new
                    {
                        success = true,
                        message = "Main unit created successfully",
                        data = new
                        {
                            mainUnit = new
                            {
                                _id = createdMainUnit.Id,
                                id = createdMainUnit.Id,
                                name = createdMainUnit.Name,
                                company = createdMainUnit.CompanyId
                            }
                        }
                    };

                    _logger.LogInformation($"Successfully created main unit '{createdMainUnit.Name}' for company {companyIdGuid}");

                    return StatusCode(201, response);
                }
                catch (InvalidOperationException ex)
                {
                    // Duplicate main unit name
                    return Conflict(new
                    {
                        success = false,
                        error = "A main unit with this name already exists within the selected company"
                    });
                }
                catch (KeyNotFoundException ex)
                {
                    // Company not found
                    return NotFound(new
                    {
                        success = false,
                        error = ex.Message
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating main unit");

                // Return 500 error with message (matching Express route)
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while creating main unit"
                });
            }
        }

        // PUT: api/retailer/mainUnits/{id}
        [HttpPut("mainUnits/{id}")]
        public async Task<IActionResult> UpdateMainUnit(Guid id, [FromBody] UpdateMainUnitDTO request)
        {
            try
            {
                _logger.LogInformation("=== UpdateMainUnit Started ===");

                // 1. Extract trade type from JWT claims
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                // 2. Check if trade type is Retailer
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "Access forbidden for this trade type"
                    });
                }

                // 3. Extract company info from JWT claims
                var companyId = User.FindFirst("currentCompany")?.Value;

                // 4. Validate inputs
                if (id == Guid.Empty)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Main unit ID is required"
                    });
                }

                if (string.IsNullOrEmpty(request.Name) || request.Name.Trim() == "")
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Main unit name is required"
                    });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Company ID is required"
                    });
                }

                // 5. Check if the main unit exists
                var existingMainUnit = await _mainUnitService.GetMainUnitByIdAsync(id);
                if (existingMainUnit == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Main unit not found"
                    });
                }

                // 6. Prepare main unit for update
                var updatedMainUnit = new MainUnit
                {
                    Name = request.Name.Trim()
                };

                try
                {
                    // 7. Update the main unit using service
                    var result = await _mainUnitService.UpdateMainUnitAsync(id, updatedMainUnit);

                    // 8. Prepare response matching Express route format
                    var response = new
                    {
                        success = true,
                        message = "Main unit updated successfully",
                        data = new
                        {
                            mainUnit = new
                            {
                                _id = result.Id,
                                id = result.Id,
                                name = result.Name,
                                company = result.CompanyId
                            }
                        }
                    };

                    _logger.LogInformation($"Successfully updated main unit '{result.Name}' (ID: {id})");

                    return Ok(response);
                }
                catch (InvalidOperationException ex)
                {
                    // Duplicate main unit name
                    return Conflict(new
                    {
                        success = false,
                        error = "A main unit with this name already exists in your company"
                    });
                }
                catch (KeyNotFoundException ex)
                {
                    // Main unit not found
                    return NotFound(new
                    {
                        success = false,
                        error = "Main unit not found"
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating main unit");

                if (ex.Message.Contains("Invalid main unit ID") || ex is ArgumentException)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Invalid main unit ID"
                    });
                }

                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while updating main unit"
                });
            }
        }

        // DELETE: api/retailer/mainUnits/{id}
        [HttpDelete("mainUnits/{id}")]
        public async Task<IActionResult> DeleteMainUnit(Guid id)
        {
            try
            {
                _logger.LogInformation("=== DeleteMainUnit Started ===");

                // 1. Extract trade type from JWT claims
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                // 2. Check if trade type is Retailer
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "Access denied for this trade type"
                    });
                }

                // 3. Extract company info from JWT claims
                var companyId = User.FindFirst("currentCompany")?.Value;

                // 4. Validate inputs
                if (id == Guid.Empty)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Main unit ID is required"
                    });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Company ID is required"
                    });
                }

                // 5. Check if main unit exists and belongs to the company
                var mainUnit = await _mainUnitService.GetMainUnitByIdAsync(id);
                if (mainUnit == null || mainUnit.CompanyId != companyIdGuid)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Main unit not found or does not belong to your company"
                    });
                }

                // 6. Check if any items are using this main unit
                // Assuming you have an Item model with MainUnitId foreign key
                var itemsUsingMainUnit = await _context.Items
                    .AnyAsync(i => i.MainUnitId == id);

                if (itemsUsingMainUnit)
                {
                    return Conflict(new
                    {
                        success = false,
                        error = "Cannot delete - this main unit as it is being used"
                    });
                }

                // 7. Proceed with deletion
                var result = await _mainUnitService.DeleteMainUnitAsync(id);

                if (!result)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Main unit not found"
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = "Main unit deleted successfully",
                    data = new
                    {
                        deletedUnit = new
                        {
                            _id = id,
                            id = id,
                            name = mainUnit.Name
                        }
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting main unit");

                if (ex.Message.Contains("Invalid main unit ID") || ex is ArgumentException)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Invalid main unit ID format"
                    });
                }

                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while deleting main unit"
                });
            }
        }

        // GET: api/retailer/mainUnits/{id}
        [HttpGet("mainUnits/{id}")]
        public async Task<IActionResult> GetMainUnit(Guid id)
        {
            try
            {
                _logger.LogInformation("=== GetMainUnit Started ===");

                // 1. Extract user and company info from JWT claims
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;
                var companyName = User.FindFirst("currentCompanyName")?.Value;

                // 2. Validate required claims exist
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new
                    {
                        success = false,
                        error = "Invalid user token. Please login again."
                    });
                }

                // 3. Check if company is selected
                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected. Please select a company first."
                    });
                }

                // 4. Check if trade type is Retailer
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "Access restricted to retailer accounts"
                    });
                }

                // 5. Get the company
                var company = await _context.Companies
                    .FirstOrDefaultAsync(c => c.Id == companyIdGuid);

                if (company == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Company not found"
                    });
                }

                // 6. Get current active fiscal year
                var currentFiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                if (currentFiscalYear == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No active fiscal year found"
                    });
                }

                // 7. Get main unit
                var mainUnit = await _mainUnitService.GetMainUnitByIdAsync(id);
                if (mainUnit == null || mainUnit.CompanyId != companyIdGuid)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Main unit not found"
                    });
                }

                // 8. Prepare company information
                var companyInfo = new
                {
                    _id = company.Id,
                    id = company.Id,
                    renewalDate = company.RenewalDate,
                    dateFormat = company.DateFormat
                };

                // 9. Prepare fiscal year information
                var fiscalYearInfo = new
                {
                    _id = currentFiscalYear.Id,
                    id = currentFiscalYear.Id,
                    name = currentFiscalYear.Name,
                    startDate = currentFiscalYear.StartDate,
                    endDate = currentFiscalYear.EndDate,
                    isActive = currentFiscalYear.IsActive,
                    dateFormat = currentFiscalYear.DateFormat
                };

                // 10. Prepare user information
                var roleName = User.FindFirst(ClaimTypes.Role)?.Value;
                var isAdminClaim = User.FindFirst("isAdmin")?.Value;
                bool isAdmin = bool.TryParse(isAdminClaim, out bool admin) && admin;

                // 11. Prepare the main response
                var response = new
                {
                    success = true,
                    data = new
                    {
                        company = companyInfo,
                        mainUnit = new
                        {
                            _id = mainUnit.Id,
                            id = mainUnit.Id,
                            name = mainUnit.Name,
                            uniqueNumber = mainUnit.UniqueNumber,
                            companyId = mainUnit.CompanyId,
                            createdAt = mainUnit.CreatedAt,
                            updatedAt = mainUnit.UpdatedAt
                        },
                        currentFiscalYear = fiscalYearInfo,
                        currentCompanyName = companyName ?? company.Name,
                        user = new
                        {
                            id = userIdGuid,
                            role = roleName ?? "User",
                            isAdmin = isAdmin,
                            preferences = new object()
                        },
                        isAdminOrSupervisor = User.IsInRole("Admin") || User.IsInRole("Supervisor")
                    }
                };

                _logger.LogInformation($"Successfully retrieved main unit '{mainUnit.Name}'");

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetMainUnit");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching main unit",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/mainUnits/search
        [HttpGet("mainUnits/search")]
        public async Task<IActionResult> SearchMainUnits([FromQuery] string term)
        {
            try
            {
                _logger.LogInformation("=== SearchMainUnits Started ===");

                // 1. Extract user and company info from JWT claims
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                // 2. Validate required claims exist
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new
                    {
                        success = false,
                        error = "Invalid user token. Please login again."
                    });
                }

                // 3. Check if company is selected
                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected. Please select a company first."
                    });
                }

                // 4. Check if trade type is Retailer
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "Access restricted to retailer accounts"
                    });
                }

                // 5. Search main units using service
                var mainUnits = await _mainUnitService.SearchMainUnitsAsync(companyIdGuid, term);

                // 6. Prepare response
                var response = new
                {
                    success = true,
                    data = new
                    {
                        mainUnits = mainUnits.Select(mu => new
                        {
                            _id = mu.Id,
                            id = mu.Id,
                            name = mu.Name,
                            uniqueNumber = mu.UniqueNumber,
                            companyId = mu.CompanyId,
                            createdAt = mu.CreatedAt,
                            updatedAt = mu.UpdatedAt
                        })
                    }
                };

                _logger.LogInformation($"Found {mainUnits.Count} main units matching term '{term}'");

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in SearchMainUnits");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while searching main units",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // POST: api/retailer/mainUnits/default
        [HttpPost("mainUnits/default")]
        public async Task<IActionResult> AddDefaultMainUnits()
        {
            try
            {
                _logger.LogInformation("=== AddDefaultMainUnits Started ===");

                // 1. Extract user and company info from JWT claims
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                // 2. Validate required claims exist
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new
                    {
                        success = false,
                        error = "Invalid user token. Please login again."
                    });
                }

                // 3. Check if company is selected
                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected. Please select a company first."
                    });
                }

                // 4. Check if trade type is Retailer
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "Access denied for this trade type"
                    });
                }

                // 5. Add default main units using service
                var result = await _mainUnitService.AddDefaultMainUnitsAsync(companyIdGuid);

                if (!result)
                {
                    return Conflict(new
                    {
                        success = false,
                        error = "Default main units already exist or failed to add"
                    });
                }

                _logger.LogInformation($"Successfully added default main units for company ID: {companyIdGuid}");

                return Ok(new
                {
                    success = true,
                    message = "Default main units added successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in AddDefaultMainUnits");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while adding default main units",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // POST: api/retailer/mainUnits/bulk
        [HttpPost("mainUnits/bulk")]
        public async Task<IActionResult> BulkCreateMainUnits([FromBody] List<string> mainUnitNames)
        {
            try
            {
                _logger.LogInformation("=== BulkCreateMainUnits Started ===");

                // 1. Extract trade type from JWT claims
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                // 2. Check if trade type is Retailer
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "Access denied for this trade type"
                    });
                }

                // 3. Extract company info from JWT claims
                var companyId = User.FindFirst("currentCompany")?.Value;

                // 4. Check if company is selected
                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Company ID is required"
                    });
                }

                // 5. Validate main unit names
                if (mainUnitNames == null || mainUnitNames.Count == 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Main unit names are required"
                    });
                }

                // 6. Bulk create main units using service
                var result = await _mainUnitService.BulkCreateMainUnitsAsync(companyIdGuid, mainUnitNames);

                if (!result)
                {
                    return Conflict(new
                    {
                        success = false,
                        error = "Failed to create main units"
                    });
                }

                _logger.LogInformation($"Successfully bulk created main units for company {companyIdGuid}");

                return Ok(new
                {
                    success = true,
                    message = "Main units created successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in BulkCreateMainUnits");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while creating main units"
                });
            }
        }

        // GET: api/retailer/mainUnits/grouped
        [HttpGet("mainUnits/grouped")]
        public async Task<IActionResult> GetGroupedMainUnits()
        {
            try
            {
                _logger.LogInformation("=== GetGroupedMainUnits Started ===");

                // 1. Extract user and company info from JWT claims
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                // 2. Validate required claims exist
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new
                    {
                        success = false,
                        error = "Invalid user token. Please login again."
                    });
                }

                // 3. Check if company is selected
                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected. Please select a company first."
                    });
                }

                // 4. Check if trade type is Retailer
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "Access restricted to retailer accounts"
                    });
                }

                // 5. Get grouped main units using service
                var groupedMainUnits = await _mainUnitService.GetMainUnitsGroupedByCategoryAsync(companyIdGuid);

                // 6. Prepare response
                var response = new
                {
                    success = true,
                    data = new
                    {
                        groupedMainUnits = groupedMainUnits.ToDictionary(
                            kvp => kvp.Key,
                            kvp => kvp.Value.Select(mu => new
                            {
                                _id = mu.Id,
                                id = mu.Id,
                                name = mu.Name,
                                uniqueNumber = mu.UniqueNumber,
                                companyId = mu.CompanyId,
                                createdAt = mu.CreatedAt,
                                updatedAt = mu.UpdatedAt
                            }).ToList()
                        )
                    }
                };

                _logger.LogInformation($"Successfully grouped main units into {groupedMainUnits.Count} categories for company {companyIdGuid}");

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetGroupedMainUnits");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while grouping main units",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }
    }
}