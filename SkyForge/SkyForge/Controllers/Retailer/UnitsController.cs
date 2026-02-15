using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.UnitModel;
using SkyForge.Dto.RetailerDto.UnitDto;
using SkyForge.Services.UnitServices;
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
    public class UnitsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<UnitsController> _logger;
        private readonly IUnitService _unitService;

        public UnitsController(
            ApplicationDbContext context,
            ILogger<UnitsController> logger,
            IUnitService unitService)
        {
            _context = context;
            _logger = logger;
            _unitService = unitService;
        }

        // GET: api/retailer/units
        [HttpGet("units")]
        public async Task<IActionResult> GetUnitsData()
        {
            try
            {
                _logger.LogInformation("=== GetUnitsData Started ===");

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
                        error = "Access forbidden for this trade type",
                        redirectTo = "/user-dashboard"
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

                // 10. Get units for this company
                var units = await _unitService.GetUnitsByCompanyAsync(companyIdGuid);

                // 11. Determine if user is admin or supervisor
                var userRole = roleName ?? "User";
                bool isAdminOrSupervisor = isAdmin || (userRole == "Supervisor" || userRole == "Admin");

                // 12. Prepare user info for response
                var userInfo = new
                {
                    _id = userId,
                    name = userName ?? "User",
                    email = userEmail ?? "",
                    isAdmin = isAdmin,
                    role = userRole,
                    roleId = roleId,
                    isEmailVerified = isEmailVerified,
                    preferences = new { theme = "light" }
                };

                // 13. Prepare units data for response
                var unitsData = units.Select(u => new
                {
                    _id = u.Id,
                    name = u.Name,
                    uniqueNumber = u.UniqueNumber,
                    company = u.CompanyId,
                    createdAt = u.CreatedAt,
                    updatedAt = u.UpdatedAt,
                    status = "active"
                }).ToList();

                // 14. Prepare response matching Express route format
                var responseData = new
                {
                    success = true,
                    data = new
                    {
                        units = unitsData,
                        company = new
                        {
                            _id = companyDetails.Id,
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
                        user = userInfo,
                        isAdminOrSupervisor = isAdminOrSupervisor
                    }
                };

                _logger.LogInformation($"Successfully fetched {units.Count} units for company {companyDetails.Name}");

                return Ok(responseData);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetUnitsData");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Server error occurred while fetching units",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // POST: api/retailer/units
        [HttpPost("units")]
        public async Task<IActionResult> CreateUnit([FromBody] CreateUnitDTO request)
        {
            try
            {
                _logger.LogInformation("=== CreateUnit Started ===");

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
                        error = "Unit name is required"
                    });
                }

                // 6. Create new unit object
                var newUnit = new Unit
                {
                    Id = Guid.NewGuid(),
                    Name = request.Name.Trim(),
                    CompanyId = companyIdGuid,
                    CreatedAt = DateTime.UtcNow,
                    UniqueNumber = await _unitService.GenerateUniqueUnitNumberAsync()
                };

                try
                {
                    // 7. Save the unit using the service
                    var createdUnit = await _unitService.CreateUnitAsync(newUnit);

                    // 8. Prepare response (match Express route response format)
                    var response = new
                    {
                        success = true,
                        message = "Unit created successfully",
                        data = new
                        {
                            _id = createdUnit.Id,
                            name = createdUnit.Name,
                            company = createdUnit.CompanyId
                        }
                    };

                    _logger.LogInformation($"Successfully created unit '{createdUnit.Name}' for company {companyIdGuid}");

                    return StatusCode(201, response);
                }
                catch (InvalidOperationException ex)
                {
                    // Duplicate unit name
                    return Conflict(new
                    {
                        success = false,
                        error = "A unit with this name already exists within the selected company"
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
                _logger.LogError(ex, "Error creating unit");

                // Return 500 error with message (matching Express route)
                return StatusCode(500, new
                {
                    success = false,
                    error = "Server error occurred while creating unit"
                });
            }
        }

        // PUT: api/retailer/units/{id}
        [HttpPut("units/{id}")]
        public async Task<IActionResult> UpdateUnit(Guid id, [FromBody] UpdateUnitDTO request)
        {
            try
            {
                _logger.LogInformation("=== UpdateUnit Started ===");

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
                        error = "Unit ID is required"
                    });
                }

                if (string.IsNullOrEmpty(request.Name) || request.Name.Trim() == "")
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Unit name is required"
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

                // 5. Prepare unit for update
                var updatedUnit = new Unit
                {
                    Name = request.Name.Trim()
                };

                try
                {
                    // 6. Update the unit using service
                    var result = await _unitService.UpdateUnitAsync(id, updatedUnit);

                    // 7. Prepare response matching Express route format
                    var response = new
                    {
                        success = true,
                        message = "Unit updated successfully",
                        data = new
                        {
                            _id = result.Id,
                            name = result.Name,
                            uniqueNumber = result.UniqueNumber,
                            company = result.CompanyId,
                            createdAt = result.CreatedAt,
                            updatedAt = result.UpdatedAt
                        }
                    };

                    _logger.LogInformation($"Successfully updated unit '{result.Name}' (ID: {id})");

                    return Ok(response);
                }
                catch (InvalidOperationException ex)
                {
                    // Duplicate unit name
                    return Conflict(new
                    {
                        success = false,
                        error = "A unit with this name already exists within the selected company"
                    });
                }
                catch (KeyNotFoundException ex)
                {
                    // Unit not found
                    return NotFound(new
                    {
                        success = false,
                        error = "Unit not found"
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating unit");

                if (ex.Message.Contains("Invalid unit ID") || ex is ArgumentException)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Invalid unit ID"
                    });
                }

                return StatusCode(500, new
                {
                    success = false,
                    error = "Server error occurred while updating unit"
                });
            }
        }

        // DELETE: api/retailer/units/{id}
        [HttpDelete("units/{id}")]
        public async Task<IActionResult> DeleteUnit(Guid id)
        {
            try
            {
                _logger.LogInformation("=== DeleteUnit Started ===");

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
                        error = "Unit ID is required"
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

                // 5. Check if unit exists and belongs to the company
                var unit = await _unitService.GetUnitByIdAsync(id);
                if (unit == null || unit.CompanyId != companyIdGuid)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Unit not found or does not belong to your company"
                    });
                }

                // 6. Check if any items are using this unit
                // Assuming you have an Item model with UnitId foreign key
                var itemsUsingUnit = await _context.Items
                    .AnyAsync(i => i.UnitId == id);

                if (itemsUsingUnit)
                {
                    return Conflict(new
                    {
                        success = false,
                        error = "Cannot delete unit as it is being used by one or more items"
                    });
                }

                // 7. Proceed with deletion
                var result = await _unitService.DeleteUnitAsync(id);

                if (!result)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Unit not found"
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = "Unit deleted successfully",
                    data = new { id }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting unit");

                if (ex.Message.Contains("Invalid unit ID") || ex is ArgumentException)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Invalid unit ID format"
                    });
                }

                return StatusCode(500, new
                {
                    success = false,
                    error = "Server error occurred while deleting unit"
                });
            }
        }

        // GET: api/retailer/units/{id}
        [HttpGet("units/{id}")]
        public async Task<IActionResult> GetUnit(Guid id)
        {
            try
            {
                _logger.LogInformation("=== GetUnit Started ===");

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

                // 7. Get unit
                var unit = await _unitService.GetUnitByIdAsync(id);
                if (unit == null || unit.CompanyId != companyIdGuid)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Unit not found"
                    });
                }

                // 8. Prepare company information
                var companyInfo = new
                {
                    id = company.Id,
                    renewalDate = company.RenewalDate,
                    dateFormat = company.DateFormat
                };

                // 9. Prepare fiscal year information
                var fiscalYearInfo = new
                {
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
                        unit = new
                        {
                            _id = unit.Id,
                            name = unit.Name,
                            uniqueNumber = unit.UniqueNumber,
                            companyId = unit.CompanyId,
                            createdAt = unit.CreatedAt,
                            updatedAt = unit.UpdatedAt,
                            status = "active"
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

                _logger.LogInformation($"Successfully retrieved unit '{unit.Name}'");

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetUnit");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching unit",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/units/search
        [HttpGet("units/search")]
        public async Task<IActionResult> SearchUnits([FromQuery] string term)
        {
            try
            {
                _logger.LogInformation("=== SearchUnits Started ===");

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

                // 5. Search units using service
                var units = await _unitService.SearchUnitsAsync(companyIdGuid, term);

                // 6. Prepare response
                var response = new
                {
                    success = true,
                    data = new
                    {
                        units = units.Select(u => new
                        {
                            _id = u.Id,
                            name = u.Name,
                            uniqueNumber = u.UniqueNumber,
                            companyId = u.CompanyId,
                            createdAt = u.CreatedAt,
                            updatedAt = u.UpdatedAt,
                            status = "active"
                        })
                    }
                };

                _logger.LogInformation($"Found {units.Count} units matching term '{term}'");

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in SearchUnits");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while searching units",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // POST: api/retailer/units/default
        [HttpPost("units/default")]
        public async Task<IActionResult> AddDefaultUnits()
        {
            try
            {
                _logger.LogInformation("=== AddDefaultUnits Started ===");

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

                // 5. Add default units using service
                var result = await _unitService.AddDefaultUnitsAsync(companyIdGuid);

                if (!result)
                {
                    return Conflict(new
                    {
                        success = false,
                        error = "Default units already exist or failed to add"
                    });
                }

                _logger.LogInformation($"Successfully added default units for company ID: {companyIdGuid}");

                return Ok(new
                {
                    success = true,
                    message = "Default units added successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in AddDefaultUnits");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while adding default units",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // POST: api/retailer/units/bulk
        [HttpPost("units/bulk")]
        public async Task<IActionResult> BulkCreateUnits([FromBody] List<string> unitNames)
        {
            try
            {
                _logger.LogInformation("=== BulkCreateUnits Started ===");

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

                // 5. Validate unit names
                if (unitNames == null || unitNames.Count == 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Unit names are required"
                    });
                }

                // 6. Bulk create units using service
                var result = await _unitService.BulkCreateUnitsAsync(companyIdGuid, unitNames);

                if (!result)
                {
                    return Conflict(new
                    {
                        success = false,
                        error = "Failed to create units"
                    });
                }

                _logger.LogInformation($"Successfully bulk created units for company {companyIdGuid}");

                return Ok(new
                {
                    success = true,
                    message = "Units created successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in BulkCreateUnits");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while creating units"
                });
            }
        }
    }
}