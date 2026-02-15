using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto.RetailerDto.ItemCompanyDto;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.Retailer.ItemCompanyModel;
using SkyForge.Services.ItemCompanyServices;
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
    public class ItemCompanyController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<ItemCompanyController> _logger;
        private readonly IItemCompanyService _itemCompanyService;

        public ItemCompanyController(
            ApplicationDbContext context,
            ILogger<ItemCompanyController> logger,
            IItemCompanyService itemCompanyService)
        {
            _context = context;
            _logger = logger;
            _itemCompanyService = itemCompanyService;
        }

        // GET: api/retailer/items-company
        [HttpGet("items-company")]
        public async Task<IActionResult> GetItemCompaniesData()
        {
            try
            {
                _logger.LogInformation("=== GetItemCompaniesData Started ===");

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
                        error = "Access denied for this trade type. This is a Retailer-only feature.",
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

                // 10. Check if current fiscal year is the initial fiscal year
                var initialFiscalYear = await _context.FiscalYears
                    .Where(f => f.CompanyId == companyIdGuid)
                    .OrderBy(f => f.CreatedAt)
                    .FirstOrDefaultAsync();

                bool isInitialFiscalYear = fiscalYear.Id == initialFiscalYear?.Id;

                // 11. Get item companies for this company
                var itemCompanies = await _itemCompanyService.GetItemCompaniesByCompanyAsync(companyIdGuid);

                // 12. Determine if user is admin or supervisor
                var userRole = roleName ?? "User";
                bool isAdminOrSupervisor = isAdmin || (userRole == "Supervisor" || userRole == "Admin");

                // 13. Prepare user info for response
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

                // 14. Prepare response (matching Express route format)
                var responseData = new
                {
                    success = true,
                    data = new
                    {
                        itemsCompanies = itemCompanies.Select(ic => new
                        {
                            _id = ic.Id,
                            name = ic.Name,
                            uniqueNumber = ic.UniqueNumber,
                            companyId = ic.CompanyId,
                            createdAt = ic.CreatedAt,
                            updatedAt = ic.UpdatedAt,
                            status = "active"
                        }),
                        company = new
                        {
                            _id = companyDetails.Id,
                            renewalDate = companyDetails.RenewalDate,
                            dateFormat = companyDetails.DateFormat?.ToString()?.ToLower() ?? "english",
                        },
                        currentFiscalYear = fiscalYear != null ? new
                        {
                            _id = fiscalYear.Id,
                            startDate = fiscalYear.StartDate,
                            endDate = fiscalYear.EndDate,
                            name = fiscalYear.Name,
                            dateFormat = fiscalYear.DateFormat?.ToString()?.ToLower() ?? "english",
                            isActive = fiscalYear.IsActive
                        } : null,
                        currentCompanyName = companyName ?? companyDetails.Name,
                        companyId = companyIdGuid.ToString(),
                        user = userInfo,
                        theme = "light",
                        isAdminOrSupervisor = isAdminOrSupervisor
                    }
                };

                _logger.LogInformation($"Successfully fetched {itemCompanies.Count} item companies for company {companyDetails.Name}");
                _logger.LogInformation($"JWT Claims used - CompanyId: {companyId}, TradeType: {tradeTypeClaim}, UserId: {userId}");

                return Ok(responseData);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetItemCompaniesData");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    message = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // POST: api/retailer/items-company
        [HttpPost("items-company")]
        public async Task<IActionResult> CreateItemCompany([FromBody] CreateItemCompanyDTO request)
        {
            try
            {
                _logger.LogInformation("=== CreateItemCompany Started ===");

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

                // 5. Validate required fields
                if (string.IsNullOrEmpty(request.Name) || request.Name.Trim() == "")
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Item company name is required"
                    });
                }

                // 6. Create new item company object
                var newItemCompany = new ItemCompany
                {
                    Id = Guid.NewGuid(),
                    Name = request.Name.Trim(),
                    CompanyId = companyIdGuid,
                    CreatedAt = DateTime.UtcNow,
                    UniqueNumber = await _itemCompanyService.GenerateUniqueItemCompanyNumberAsync()
                };

                // 7. Save the item company using the service
                try
                {
                    var createdItemCompany = await _itemCompanyService.CreateItemCompanyAsync(newItemCompany);

                    // 8. Prepare response (match Express route response format)
                    var response = new
                    {
                        success = true,
                        message = "Successfully saved a company",
                        data = new
                        {
                            _id = createdItemCompany.Id,
                            name = createdItemCompany.Name,
                            company = createdItemCompany.CompanyId
                        }
                    };

                    _logger.LogInformation($"Successfully created item company '{createdItemCompany.Name}' for company {companyIdGuid}");

                    return StatusCode(201, response);
                }
                catch (InvalidOperationException ex) // Catch duplicate item company exception from service
                {
                    return Conflict(new
                    {
                        success = false,
                        error = "A company with this name already exists within the selected company."
                    });
                }
                catch (KeyNotFoundException ex) // Catch company not found exception from service
                {
                    return NotFound(new
                    {
                        success = false,
                        error = ex.Message
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating item company");
                
                // Return 500 error with message (matching Express route)
                return StatusCode(500, new
                {
                    success = false,
                    error = "Server error occurred while processing your request",
                    message = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // PUT: api/retailer/items-company/{id}
        [HttpPut("items-company/{id}")]
        public async Task<IActionResult> UpdateItemCompany(Guid id, [FromBody] UpdateItemCompanyDTO request)
        {
            try
            {
                _logger.LogInformation("=== UpdateItemCompany Started ===");

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
                        error = "Company name is required"
                    });
                }

                // 6. Check if item company ID is provided
                if (id == Guid.Empty)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Item company ID is required"
                    });
                }

                // 7. Prepare item company for update
                var itemCompanyUpdate = new ItemCompany
                {
                    Name = request.Name.Trim()
                };

                // 8. Update the item company using service
                try
                {
                    var updatedItemCompany = await _itemCompanyService.UpdateItemCompanyAsync(id, itemCompanyUpdate);

                    // 9. Prepare response (matching Express route format)
                    var response = new
                    {
                        success = true,
                        message = "Company updated successfully",
                        data = new
                        {
                            _id = updatedItemCompany.Id,
                            name = updatedItemCompany.Name,
                            company = updatedItemCompany.CompanyId,
                            updatedAt = updatedItemCompany.UpdatedAt
                        }
                    };

                    return Ok(response);
                }
                catch (KeyNotFoundException ex)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Item company not found"
                    });
                }
                catch (InvalidOperationException ex)
                {
                    return Conflict(new
                    {
                        success = false,
                        error = "A company with this name already exists"
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating item company");

                // Return 500 error with message (matching Express route)
                return StatusCode(500, new
                {
                    success = false,
                    error = "Server error occurred while updating company",
                    message = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // DELETE: api/retailer/items-company/{id}
        [HttpDelete("items-company/{id}")]
        public async Task<IActionResult> DeleteItemCompany(Guid id)
        {
            try
            {
                _logger.LogInformation("=== DeleteItemCompany Started ===");

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

                // 3. Check if item company ID is provided
                if (id == Guid.Empty)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Company ID is required"
                    });
                }

                // 4. Get the item company to check if it exists and if it's the "General" company
                var itemCompany = await _itemCompanyService.GetItemCompanyByIdAsync(id);
                if (itemCompany == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Company not found"
                    });
                }

                // 5. Check if it's the default "General" company
                if (itemCompany.Name.Equals("General", StringComparison.OrdinalIgnoreCase))
                {
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "The default \"General\" company cannot be deleted"
                    });
                }

                // 6. Check for associated items
                var associatedItems = await _context.Items
                    .AnyAsync(i => i.ItemsCompanyId == id);
                    
                if (associatedItems)
                {
                    return Conflict(new
                    {
                        success = false,
                        error = "Company cannot be deleted because it is associated with items"
                    });
                }

                // 7. Proceed with deletion
                var result = await _itemCompanyService.DeleteItemCompanyAsync(id);
                
                if (!result)
                {
                    return StatusCode(500, new
                    {
                        success = false,
                        error = "Failed to delete company"
                    });
                }

                // 8. Prepare response (matching Express route format)
                return Ok(new
                {
                    success = true,
                    message = "Company deleted successfully",
                    data = new { id = id.ToString() }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting item company");
                
                return StatusCode(500, new
                {
                    success = false,
                    error = "An error occurred while deleting the company",
                    message = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/items-company/{id}
        [HttpGet("items-company/{id}")]
        public async Task<IActionResult> GetItemCompany(Guid id)
        {
            try
            {
                _logger.LogInformation("=== GetItemCompany Started ===");

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

                // 5. Get the company with fiscal year
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

                // 7. Get item company
                var itemCompany = await _itemCompanyService.GetItemCompanyByIdAsync(id);

                if (itemCompany == null || itemCompany.CompanyId != companyIdGuid)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Item company not found or does not belong to your company"
                    });
                }

                // 8. Prepare company information
                var companyInfo = new
                {
                    _id = company.Id,
                    renewalDate = company.RenewalDate,
                    dateFormat = company.DateFormat?.ToString()?.ToLower() ?? "english"
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
                    dateFormat = currentFiscalYear.DateFormat?.ToString()?.ToLower() ?? "english"
                };

                // 10. Prepare user info
                var isAdminClaim = User.FindFirst("isAdmin")?.Value;
                bool isAdmin = bool.TryParse(isAdminClaim, out bool admin) && admin;
                var roleName = User.FindFirst(ClaimTypes.Role)?.Value ?? "User";
                var userName = User.FindFirst(ClaimTypes.Name)?.Value;
                var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;

                var userInfo = new
                {
                    _id = userId,
                    name = userName ?? "User",
                    email = userEmail ?? "",
                    isAdmin = isAdmin,
                    role = roleName,
                    preferences = new { theme = "light" }
                };

                // 11. Prepare the main response
                var response = new
                {
                    success = true,
                    data = new
                    {
                        company = companyInfo,
                        itemsCompany = new
                        {
                            _id = itemCompany.Id,
                            name = itemCompany.Name,
                            uniqueNumber = itemCompany.UniqueNumber,
                            companyId = itemCompany.CompanyId,
                            createdAt = itemCompany.CreatedAt,
                            updatedAt = itemCompany.UpdatedAt,
                            status = "active"
                        },
                        currentFiscalYear = fiscalYearInfo,
                        currentCompanyName = company.Name,
                        companyId = companyIdGuid.ToString(),
                        user = userInfo,
                        theme = "light",
                        isAdminOrSupervisor = isAdmin || (roleName == "Supervisor" || roleName == "Admin")
                    }
                };

                _logger.LogInformation($"Successfully retrieved item company '{itemCompany.Name}'");

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetItemCompany");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching item company",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/items-company/search
        [HttpGet("items-company/search")]
        public async Task<IActionResult> SearchItemCompanies([FromQuery] string term)
        {
            try
            {
                _logger.LogInformation("=== SearchItemCompanies Started ===");

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

                // 5. Search item companies using service
                var itemCompanies = await _itemCompanyService.SearchItemCompaniesAsync(companyIdGuid, term);

                // 6. Prepare response
                var response = new
                {
                    success = true,
                    data = new
                    {
                        itemsCompanies = itemCompanies.Select(ic => new
                        {
                            _id = ic.Id,
                            name = ic.Name,
                            uniqueNumber = ic.UniqueNumber,
                            companyId = ic.CompanyId,
                            createdAt = ic.CreatedAt,
                            updatedAt = ic.UpdatedAt,
                            status = "active"
                        })
                    }
                };

                _logger.LogInformation($"Found {itemCompanies.Count} item companies matching term '{term}'");

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in SearchItemCompanies");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while searching item companies",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // POST: api/retailer/items-company/default
        [HttpPost("items-company/default")]
        public async Task<IActionResult> AddDefaultItemCompany()
        {
            try
            {
                _logger.LogInformation("=== AddDefaultItemCompany Started ===");

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

                // 5. Add default item company using service
                var result = await _itemCompanyService.AddDefaultItemCompanyAsync(companyIdGuid);

                if (!result)
                {
                    return Conflict(new
                    {
                        success = false,
                        error = "Default item company already exists"
                    });
                }

                _logger.LogInformation($"Successfully added default item company for company ID: {companyIdGuid}");

                return Ok(new
                {
                    success = true,
                    message = "Default item company added successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in AddDefaultItemCompany");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while adding default item company",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }
    }
}