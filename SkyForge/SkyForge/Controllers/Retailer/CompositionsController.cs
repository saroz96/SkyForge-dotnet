using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.Retailer.CompositionModel;
using SkyForge.Dto.RetailerDto.CompositionDto;
using SkyForge.Dto.RetailerDto.ItemDto;
using SkyForge.Services.Retailer.CompositionServices;
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
    public class CompositionsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<CompositionsController> _logger;
        private readonly ICompositionService _compositionService;

        public CompositionsController(
            ApplicationDbContext context,
            ILogger<CompositionsController> logger,
            ICompositionService compositionService)
        {
            _context = context;
            _logger = logger;
            _compositionService = compositionService;
        }

        // GET: api/retailer/compositions
        [HttpGet("compositions")]
        public async Task<IActionResult> GetCompositionsData()
        {
            try
            {
                _logger.LogInformation("=== GetCompositionsData Started ===");

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

                // 10. Get compositions for this company
                var compositions = await _compositionService.GetCompositionsWithItemsAsync(companyIdGuid);

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

                // 13. Prepare compositions data for response
                // Prepare compositions data for response
var compositionsData = compositions.Select(c => new
{
    _id = c.Id,
    name = c.Name,
    uniqueNumber = c.UniqueNumber,
    company = c.CompanyId,
    companyName = c.Company?.Name,
    createdAt = c.CreatedAt,
    updatedAt = c.UpdatedAt,
    items = c.ItemCompositions?.Select(ic => new ItemDetailsDTO
    {
        Id = ic.Item?.Id ?? Guid.Empty,
        Name = ic.Item?.Name ?? string.Empty,
        Price = ic.Item?.Price,
        PuPrice = ic.Item?.PuPrice,
        MainUnitPuPrice = ic.Item?.MainUnitPuPrice ?? 0,
        UnitName = ic.Item?.Unit?.Name,
        OpeningStock = ic.Item?.OpeningStock ?? 0,
        MinStock = ic.Item?.MinStock ?? 0,
        MaxStock = ic.Item?.MaxStock ?? 0,
        ReorderLevel = ic.Item?.ReorderLevel ?? 0,
        UniqueNumber = ic.Item?.UniqueNumber ?? 0,
        BarcodeNumber = ic.Item?.BarcodeNumber ?? 0,
        CategoryId = ic.Item?.CategoryId ?? Guid.Empty,
        CategoryName = ic.Item?.Category?.Name,
        UnitId = ic.Item?.UnitId ?? Guid.Empty,
        Status = ic.Item?.Status ?? "active",
        CreatedAt = ic.Item?.CreatedAt ?? DateTime.MinValue,
        UpdatedAt = ic.Item?.UpdatedAt ?? DateTime.MinValue,
        // Add other properties as needed
    }).ToList() ?? new List<ItemDetailsDTO>(),
    itemCount = c.ItemCompositions?.Count ?? 0
}).ToList();

                // 14. Prepare response matching Express route format
                var responseData = new
                {
                    success = true,
                    data = new
                    {
                        compositions = compositionsData,
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
                        companyId = companyId,
                        currentCompanyName = companyName ?? companyDetails.Name,
                        user = userInfo,
                        isAdminOrSupervisor = isAdminOrSupervisor
                    }
                };

                // _logger.LogInformation($"Successfully fetched {compositions.Count} compositions for company {companyDetails.Name}");

                return Ok(responseData);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCompositionsData");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Server error occurred while fetching compositions",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // POST: api/retailer/compositions
        [HttpPost("compositions")]
        public async Task<IActionResult> CreateComposition([FromBody] CompositionCreateDTO request)
        {
            try
            {
                _logger.LogInformation("=== CreateComposition Started ===");

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
                        error = "Composition name is required and must be a non-empty string"
                    });
                }   

                // 7. Create new composition object
                var newComposition = new Composition
                {
                    Id = Guid.NewGuid(),
                    Name = request.Name.Trim(),
                    CompanyId = companyIdGuid,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                try
                {
                    // 8. Save the composition using the service
                    var createdComposition = await _compositionService.CreateCompositionAsync(newComposition);

                    // 9. Add items to composition if provided
                    if (request.ItemIds != null && request.ItemIds.Any())
                    {
                        await _compositionService.AddItemsToCompositionAsync(createdComposition.Id, request.ItemIds);
                    }

                    // 10. Prepare response (match Express route response format)
                    var response = new
                    {
                        success = true,
                        message = "Successfully created a new composition",
                        data = new
                        {
                            composition = new
                            {
                                _id = createdComposition.Id,
                                name = createdComposition.Name,
                                company = createdComposition.CompanyId,
                                createdAt = createdComposition.CreatedAt,
                                updatedAt = createdComposition.UpdatedAt
                            }
                        }
                    };

                    _logger.LogInformation($"Successfully created composition '{createdComposition.Name}' for company {companyIdGuid}");

                    return StatusCode(201, response);
                }
                catch (InvalidOperationException ex) when (ex.Message.Contains("already exists"))
                {
                    // Duplicate composition name
                    return Conflict(new
                    {
                        success = false,
                        error = "A composition with this name already exists within the selected company"
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
                _logger.LogError(ex, "Error creating composition");

                // Return 500 error with message (matching Express route)
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // PUT: api/retailer/compositions/{id}
        [HttpPut("compositions/{id}")]
        public async Task<IActionResult> UpdateComposition(Guid id, [FromBody] CompositionUpdateDTO request)
        {
            try
            {
                _logger.LogInformation("=== UpdateComposition Started ===");

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
                        error = "Composition ID is required"
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

                // 5. Validate that composition belongs to the company
                var composition = await _compositionService.GetCompositionByIdAsync(id);
                if (composition == null || composition.CompanyId != companyIdGuid)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Composition not found"
                    });
                }

                // 6. Prepare composition for update
                var updatedComposition = new Composition
                {
                    Name = request.Name?.Trim() ?? composition.Name,
                };

                try
                {
                    // 7. Update the composition using service
                    var result = await _compositionService.UpdateCompositionAsync(id, updatedComposition);

                    // 8. Update items if provided
                    if (request.ItemIds != null)
                    {
                        // Remove all existing items first
                        var existingItemIds = composition.ItemCompositions?.Select(ic => ic.ItemId).ToList() ?? new List<Guid>();
                        if (existingItemIds.Any())
                        {
                            await _compositionService.RemoveItemsFromCompositionAsync(id, existingItemIds);
                        }
                        
                        // Add new items
                        if (request.ItemIds.Any())
                        {
                            await _compositionService.AddItemsToCompositionAsync(id, request.ItemIds);
                        }
                    }

                    // 9. Get updated composition with items
                    var updatedCompositionWithItems = await _compositionService.GetCompositionByIdAsync(id);

var response = new
{
    success = true,
    message = "Composition updated successfully",
    data = new
    {
        composition = new
        {
            _id = result.Id,
            name = result.Name,
            company = result.CompanyId,
            createdAt = result.CreatedAt,
            updatedAt = result.UpdatedAt,
            items = updatedCompositionWithItems?.ItemCompositions?.Select(ic => new
            {
                _id = ic.Item?.Id,
                name = ic.Item?.Name
            }).ToList<object>() ?? new List<object>()  // Use ToList<object>() here
        }
    }
};

                    _logger.LogInformation($"Successfully updated composition '{result.Name}' (ID: {id})");

                    return Ok(response);
                }
                catch (InvalidOperationException ex) when (ex.Message.Contains("already exists"))
                {
                    // Duplicate composition name
                    return Conflict(new
                    {
                        success = false,
                        error = "A composition with this name already exists within the selected company"
                    });
                }
                catch (KeyNotFoundException ex)
                {
                    // Composition not found
                    return NotFound(new
                    {
                        success = false,
                        error = "Composition not found"
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating composition");

                if (ex.Message.Contains("Invalid composition ID") || ex is ArgumentException)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Invalid composition ID"
                    });
                }

                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while updating composition",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // DELETE: api/retailer/compositions/{id}
        [HttpDelete("compositions/{id}")]
        public async Task<IActionResult> DeleteComposition(Guid id)
        {
            try
            {
                _logger.LogInformation("=== DeleteComposition Started ===");

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
                        error = "Composition ID is required"
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

                // 5. Check if composition exists and belongs to the company
                var composition = await _compositionService.GetCompositionByIdAsync(id);
                if (composition == null || composition.CompanyId != companyIdGuid)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Composition not found"
                    });
                }

                // 6. Check if composition has items
                if (composition.ItemCompositions.Any())
                {
                    return Conflict(new
                    {
                        success = false,
                        error = "Cannot delete - this composition has items assigned to it"
                    });
                }

                // 7. Proceed with deletion
                var result = await _compositionService.DeleteCompositionAsync(id);

                if (!result)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Composition not found"
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = "Composition deleted successfully",
                    data = new
                    {
                        id = id,
                        name = composition.Name
                    }
                });
            }
            catch (InvalidOperationException ex) when (ex.Message.Contains("Cannot delete composition"))
            {
                return Conflict(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting composition");

                if (ex.Message.Contains("Invalid composition ID") || ex is ArgumentException)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Invalid composition ID format"
                    });
                }

                return StatusCode(500, new
                {
                    success = false,
                    error = "Failed to delete composition",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/compositions/{id}
        [HttpGet("compositions/{id}")]
        public async Task<IActionResult> GetComposition(Guid id)
        {
            try
            {
                _logger.LogInformation("=== GetComposition Started ===");

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

                // 7. Get composition
                var composition = await _compositionService.GetCompositionByIdAsync(id);
                if (composition == null || composition.CompanyId != companyIdGuid)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Composition not found"
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

                var compositionData = new
{
    _id = composition.Id,
    name = composition.Name,
    uniqueNumber = composition.UniqueNumber,
    companyId = composition.CompanyId,
    companyName = composition.Company?.Name,
    createdAt = composition.CreatedAt,
    updatedAt = composition.UpdatedAt,
    items = composition.ItemCompositions?.Select(ic => new
    {
        _id = ic.Item?.Id,
        name = ic.Item?.Name,
        price = ic.Item?.Price,
        unitName = ic.Item?.Unit?.Name
    }).ToList<object>() ?? new List<object>(),  // Add .ToList<object>() here
    itemCount = composition.ItemCompositions?.Count ?? 0,
    status = "active"
};
                // 12. Prepare the main response
                var response = new
                {
                    success = true,
                    data = new
                    {
                        company = companyInfo,
                        composition = compositionData,
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

                _logger.LogInformation($"Successfully retrieved composition '{composition.Name}'");

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetComposition");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching composition",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/compositions/search
        [HttpGet("compositions/search")]
        public async Task<IActionResult> SearchCompositions([FromQuery] string term)
        {
            try
            {
                _logger.LogInformation("=== SearchCompositions Started ===");

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

                // 5. Search compositions using service
                var compositions = await _compositionService.SearchCompositionsAsync(companyIdGuid, term);

               // 6. Prepare response
var response = new
{
    success = true,
    data = new
    {
        compositions = compositions.Select(c => new
        {
            _id = c.Id,
            name = c.Name,
            uniqueNumber = c.UniqueNumber,
            companyId = c.CompanyId,
            companyName = c.Company?.Name,
            createdAt = c.CreatedAt,
            updatedAt = c.UpdatedAt,
            items = c.ItemCompositions?.Select(ic => new
            {
                _id = ic.Item?.Id,
                name = ic.Item?.Name
            }).ToList<object>() ?? new List<object>(),  // Add .ToList<object>() here
            itemCount = c.ItemCompositions?.Count ?? 0,
            status = "active"
        })
    }
};

                // _logger.LogInformation($"Found {compositions.Count} compositions matching term '{term}'");

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in SearchCompositions");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while searching compositions",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // POST: api/retailer/compositions/{id}/items
        [HttpPost("compositions/{id}/items")]
        public async Task<IActionResult> AddItemsToComposition(Guid id, [FromBody] ItemCompositionBulkCreateDTO request)
        {
            try
            {
                _logger.LogInformation("=== AddItemsToComposition Started ===");

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
                        error = "Composition ID is required"
                    });
                }

                if (request == null || !request.ItemIds.Any())
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Item IDs are required"
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

                // 5. Check if composition exists and belongs to the company
                var composition = await _compositionService.GetCompositionByIdAsync(id);
                if (composition == null || composition.CompanyId != companyIdGuid)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Composition not found"
                    });
                }

                // 6. Add items to composition
                var result = await _compositionService.AddItemsToCompositionAsync(id, request.ItemIds);

                if (!result)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Failed to add items to composition"
                    });
                }

                // 7. Get updated composition
                var updatedComposition = await _compositionService.GetCompositionByIdAsync(id);

                return Ok(new
                {
                    success = true,
                    message = "Items added to composition successfully",
                    data = new
                    {
                        composition = new
                        {
                            _id = updatedComposition.Id,
                            name = updatedComposition.Name,
                            itemCount = updatedComposition.ItemCompositions?.Count ?? 0
                        }
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in AddItemsToComposition");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while adding items to composition",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // DELETE: api/retailer/compositions/{id}/items
        [HttpDelete("compositions/{id}/items")]
        public async Task<IActionResult> RemoveItemsFromComposition(Guid id, [FromBody] List<Guid> itemIds)
        {
            try
            {
                _logger.LogInformation("=== RemoveItemsFromComposition Started ===");

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
                        error = "Composition ID is required"
                    });
                }

                if (itemIds == null || !itemIds.Any())
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Item IDs are required"
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

                // 5. Check if composition exists and belongs to the company
                var composition = await _compositionService.GetCompositionByIdAsync(id);
                if (composition == null || composition.CompanyId != companyIdGuid)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Composition not found"
                    });
                }

                // 6. Remove items from composition
                var result = await _compositionService.RemoveItemsFromCompositionAsync(id, itemIds);

                if (!result)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Items not found in composition"
                    });
                }

                // 7. Get updated composition
                var updatedComposition = await _compositionService.GetCompositionByIdAsync(id);

                return Ok(new
                {
                    success = true,
                    message = "Items removed from composition successfully",
                    data = new
                    {
                        composition = new
                        {
                            _id = updatedComposition.Id,
                            name = updatedComposition.Name,
                            itemCount = updatedComposition.ItemCompositions?.Count ?? 0
                        }
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in RemoveItemsFromComposition");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while removing items from composition",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }
    }
}