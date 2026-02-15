using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto.RetailerDto.CategoryDto;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.Retailer.CategoryModel;
using SkyForge.Services.CategoryServices;
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
    public class CategoriesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<CategoriesController> _logger;
        private readonly ICategoryService _categoryService;

        public CategoriesController(
            ApplicationDbContext context,
            ILogger<CategoriesController> logger,
            ICategoryService categoryService)
        {
            _context = context;
            _logger = logger;
            _categoryService = categoryService;
        }

        // GET: api/retailer/categories
        [HttpGet("categories")]
        public async Task<IActionResult> GetCategoriesData()
        {
            try
            {
                _logger.LogInformation("=== GetCategoriesData Started ===");

                // Debug: Log all claims from JWT token
                _logger.LogInformation("=== All JWT Claims ===");
                foreach (var claim in User.Claims)
                {
                    _logger.LogInformation($"Claim Type: {claim.Type}, Value: {claim.Value}");
                }

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

                // 5. Check if company claim exists - THIS IS THE CRITICAL CHECK
                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    _logger.LogError("No company selected in JWT token. Missing 'currentCompany' claim.");
                    _logger.LogInformation("Available claims with 'current':");
                    foreach (var claim in User.Claims.Where(c => c.Type.Contains("current", StringComparison.OrdinalIgnoreCase)))
                    {
                        _logger.LogInformation($"  {claim.Type}: {claim.Value}");
                    }

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

                // 11. Get categories for this company
                var categories = await _context.Categories
                    .Where(c => c.CompanyId == companyIdGuid)
                    .Select(c => new
                    {
                        _id = c.Id,
                        name = c.Name,
                        uniqueNumber = c.UniqueNumber,
                        companyId = c.CompanyId,
                        createdAt = c.CreatedAt,
                        updatedAt = c.UpdatedAt,
                        status = "active"
                    })
                    .ToListAsync();

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

                // 14. Prepare response
                var responseData = new
                {
                    success = true,
                    data = new
                    {
                        categories = categories,
                        company = new
                        {
                            _id = companyDetails.Id,
                            companyName = companyDetails.Name,
                            renewalDate = companyDetails.RenewalDate,
                            dateFormat = companyDetails.DateFormat?.ToString()?.ToLower() ?? "english",
                            fiscalYear = new
                            {
                                _id = fiscalYear.Id,
                                id = fiscalYear.Id,
                                name = fiscalYear.Name,
                                startDate = fiscalYear.StartDate,
                                endDate = fiscalYear.EndDate,
                                startDateNepali = fiscalYear.StartDateNepali,
                                endDateNepali = fiscalYear.EndDateNepali,
                                dateFormat = fiscalYear.DateFormat?.ToString()?.ToLower() ?? "english",
                                isActive = fiscalYear.IsActive
                            }
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
                        isInitialFiscalYear = isInitialFiscalYear,
                        companyId = companyIdGuid.ToString(),
                        currentCompanyName = companyName ?? companyDetails.Name,
                        companyDateFormat = companyDetails.DateFormat?.ToString()?.ToLower() ?? "english",
                        nepaliDate = "",
                        fiscalYear = fiscalYear.Name,
                        user = userInfo,
                        theme = "light",
                        isAdminOrSupervisor = isAdminOrSupervisor
                    }
                };

                _logger.LogInformation($"Successfully fetched {categories.Count} categories for company {companyDetails.Name}");
                _logger.LogInformation($"JWT Claims used - CompanyId: {companyId}, TradeType: {tradeTypeClaim}, UserId: {userId}");

                return Ok(responseData);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCategoriesData");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        [HttpPost("categories")]
        public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryDTO request)
        {
            try
            {
                _logger.LogInformation("=== CreateCategory Started ===");

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
                        error = "Category name is required"
                    });
                }

                // 6. Create new category object
                var newCategory = new Category
                {
                    Id = Guid.NewGuid(),
                    Name = request.Name.Trim(),
                    CompanyId = companyIdGuid,
                    CreatedAt = DateTime.UtcNow,
                    UniqueNumber = await _categoryService.GenerateUniqueCategoryNumberAsync()
                };

                // 7. Save the category using the service
                try
                {
                    var createdCategory = await _categoryService.CreateCategoryAsync(newCategory);

                    // 8. Prepare response (match Express route response format)
                    var response = new
                    {
                        success = true,
                        message = "Category created successfully",
                        data = new
                        {
                            _id = createdCategory.Id,
                            name = createdCategory.Name,
                            company = createdCategory.CompanyId
                        }
                    };

                    _logger.LogInformation($"Successfully created category '{createdCategory.Name}' for company {companyIdGuid}");

                    return StatusCode(201, response);
                }
                catch (InvalidOperationException ex) // Catch duplicate category exception from service
                {
                    return Conflict(new
                    {
                        success = false,
                        error = "A category with this name already exists within the selected company"
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
                _logger.LogError(ex, "Error creating category");
                
                // Return 500 error with message (matching Express route)
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    message = ex.Message
                });
            }
        }

        // [HttpPost("categories")]
        // public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryDTO request)
        // {
        //     try
        //     {
        //         _logger.LogInformation("=== CreateCategory Started ===");

        //         // 1. Extract user and company info from JWT claims
        //         var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        //         var companyId = User.FindFirst("currentCompany")?.Value;
        //         var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

        //         // 2. Validate required claims exist
        //         if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
        //         {
        //             return Unauthorized(new
        //             {
        //                 success = false,
        //                 error = "Invalid user token. Please login again."
        //             });
        //         }

        //         // 3. Check if company is selected
        //         if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
        //         {
        //             return BadRequest(new
        //             {
        //                 success = false,
        //                 error = "No company selected. Please select a company first."
        //             });
        //         }

        //         // 4. Check if trade type is Retailer
        //         if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
        //         {
        //             return StatusCode(403, new
        //             {
        //                 success = false,
        //                 error = "Access denied for this trade type"
        //             });
        //         }

        //         // 5. Validate required fields
        //         if (string.IsNullOrEmpty(request.Name))
        //         {
        //             return BadRequest(new
        //             {
        //                 success = false,
        //                 error = "Category name is required"
        //             });
        //         }

        //         // 6. Get the company
        //         var company = await _context.Companies
        //             .FirstOrDefaultAsync(c => c.Id == companyIdGuid);

        //         if (company == null)
        //         {
        //             return NotFound(new
        //             {
        //                 success = false,
        //                 error = "Company not found"
        //             });
        //         }

        //         // 7. Check if category with same name already exists in this company
        //         var existingCategory = await _context.Categories
        //             .FirstOrDefaultAsync(c => c.CompanyId == companyIdGuid &&
        //                                       c.Name.ToLower() == request.Name.ToLower());

        //         if (existingCategory != null)
        //         {
        //             return Conflict(new
        //             {
        //                 success = false,
        //                 error = "A category with this name already exists within the selected company"
        //             });
        //         }

        //         // 8. Create new category using service
        //         var newCategory = new Category
        //         {
        //             Id = Guid.NewGuid(),
        //             Name = request.Name.Trim(),
        //             CompanyId = companyIdGuid,
        //             CreatedAt = DateTime.UtcNow,
        //             UniqueNumber = await _categoryService.GenerateUniqueCategoryNumberAsync()
        //         };

        //         // 9. Save the category using the service
        //         var createdCategory = await _categoryService.CreateCategoryAsync(newCategory);

        //         // 10. Prepare response
        //         var response = new
        //         {
        //             success = true,
        //             message = "Successfully created a new category",
        //             data = new
        //             {
        //                 category = new
        //                 {
        //                     _id = createdCategory.Id,
        //                     name = createdCategory.Name,
        //                     uniqueNumber = createdCategory.UniqueNumber,
        //                     companyId = createdCategory.CompanyId,
        //                     createdAt = createdCategory.CreatedAt,
        //                     status = "active"
        //                 }
        //             }
        //         };

        //         _logger.LogInformation($"Successfully created category '{createdCategory.Name}' for company {company.Name}");

        //         return Ok(response);
        //     }
        //     catch (DbUpdateException dbEx)
        //     {
        //         _logger.LogError(dbEx, "Database error while creating category");
        //         return StatusCode(500, new
        //         {
        //             success = false,
        //             error = "Database error while creating category"
        //         });
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error in CreateCategory");
        //         return StatusCode(500, new
        //         {
        //             success = false,
        //             error = "Internal server error while creating category",
        //             details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
        //         });
        //     }
        // }

        [HttpPut("categories/{id}")]
        public async Task<IActionResult> UpdateCategory(Guid id, [FromBody] UpdateCategoryDTO request)
        {
            try
            {
                _logger.LogInformation("=== UpdateCategory Started ===");

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

                // 5. Validate required fields
                if (string.IsNullOrEmpty(request.Name))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Category name is required"
                    });
                }

                // 6. Get the company
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

                // 7. Find the existing category
                var existingCategory = await _context.Categories
                    .FirstOrDefaultAsync(c => c.Id == id && c.CompanyId == companyIdGuid);

                if (existingCategory == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Category not found"
                    });
                }

                // 8. Check if category with same name already exists in this company (excluding current category)
                var duplicateCategory = await _context.Categories
                    .FirstOrDefaultAsync(c => c.CompanyId == companyIdGuid &&
                                              c.Id != id &&
                                              c.Name.ToLower() == request.Name.ToLower());

                if (duplicateCategory != null)
                {
                    return Conflict(new
                    {
                        success = false,
                        error = "A category with this name already exists within the selected company"
                    });
                }

                // 9. Prepare category for update using service
                var updatedCategory = new Category
                {
                    Name = request.Name.Trim()
                };

                // 10. Update the category using service
                var result = await _categoryService.UpdateCategoryAsync(id, updatedCategory);

                // 11. Prepare response
                var response = new
                {
                    success = true,
                    message = "Category updated successfully",
                    data = new
                    {
                        category = new
                        {
                            _id = result.Id,
                            name = result.Name,
                            uniqueNumber = result.UniqueNumber,
                            companyId = result.CompanyId,
                            createdAt = result.CreatedAt,
                            updatedAt = result.UpdatedAt,
                            status = "active"
                        }
                    }
                };

                _logger.LogInformation($"Successfully updated category '{result.Name}' for company {company.Name}");

                return Ok(response);
            }
            catch (DbUpdateException dbEx)
            {
                _logger.LogError(dbEx, "Database error while updating category");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Database error while updating category"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in UpdateCategory");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while updating category",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/categories/{id}
        [HttpGet("categories/{id}")]
        public async Task<IActionResult> GetCategory(Guid id)
        {
            try
            {
                _logger.LogInformation("=== GetCategory Started ===");

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
                    .Include(c => c.FiscalYears)
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

                // 7. Get category with company relation
                var category = await _context.Categories
                    .Include(c => c.Company)
                    .FirstOrDefaultAsync(c => c.Id == id && c.CompanyId == companyIdGuid);

                if (category == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Category not found"
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

                // 10. Prepare the main response
                var response = new
                {
                    success = true,
                    data = new
                    {
                        company = companyInfo,
                        category = new
                        {
                            _id = category.Id,
                            name = category.Name,
                            uniqueNumber = category.UniqueNumber,
                            companyId = category.CompanyId,
                            createdAt = category.CreatedAt,
                            updatedAt = category.UpdatedAt,
                            status = "active"
                        },
                        currentFiscalYear = fiscalYearInfo,
                        currentCompanyName = company.Name,
                        user = new
                        {
                            id = userIdGuid,
                            role = User.FindFirst(ClaimTypes.Role)?.Value ?? "User",
                            isAdmin = User.IsInRole("Admin"),
                            preferences = new object()
                        },
                        isAdminOrSupervisor = User.IsInRole("Admin") || User.IsInRole("Supervisor")
                    }
                };

                _logger.LogInformation($"Successfully retrieved category '{category.Name}'");

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCategory");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching category",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // DELETE: api/retailer/categories/{id}
        [HttpDelete("categories/{id}")]
        public async Task<IActionResult> DeleteCategory(Guid id)
        {
            try
            {
                _logger.LogInformation("=== DeleteCategory Started ===");

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

                // 5. Find the category
                var category = await _context.Categories
                    .FirstOrDefaultAsync(c => c.Id == id && c.CompanyId == companyIdGuid);

                if (category == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Category not found or does not belong to your company"
                    });
                }

                // 6. Check if category has associated products/items
                // Assuming you have a Products or Items model with CategoryId foreign key
                var hasItems = await _context.Items
                    .AnyAsync(p => p.CategoryId == id);

                if (hasItems)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Cannot delete category with associated items"
                    });
                }

                // 7. Delete the category using service
                var result = await _categoryService.DeleteCategoryAsync(id);

                if (!result)
                {
                    return StatusCode(500, new
                    {
                        success = false,
                        error = "Failed to delete category"
                    });
                }

                _logger.LogInformation($"Successfully deleted category '{category.Name}' with ID: {id}");

                return Ok(new
                {
                    success = true,
                    message = "Category deleted successfully",
                    data = new
                    {
                        id = category.Id,
                        name = category.Name
                    }
                });
            }
            catch (DbUpdateException dbEx)
            {
                _logger.LogError(dbEx, "Database error while deleting category");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Database error while deleting category"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in DeleteCategory");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while deleting category",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/categories/search
        [HttpGet("categories/search")]
        public async Task<IActionResult> SearchCategories([FromQuery] string term)
        {
            try
            {
                _logger.LogInformation("=== SearchCategories Started ===");

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

                // 5. Search categories using service
                var categories = await _categoryService.SearchCategoriesAsync(companyIdGuid, term);

                // 6. Prepare response
                var response = new
                {
                    success = true,
                    data = new
                    {
                        categories = categories.Select(c => new
                        {
                            _id = c.Id,
                            name = c.Name,
                            uniqueNumber = c.UniqueNumber,
                            companyId = c.CompanyId,
                            createdAt = c.CreatedAt,
                            updatedAt = c.UpdatedAt,
                            status = "active"
                        })
                    }
                };

                _logger.LogInformation($"Found {categories.Count} categories matching term '{term}'");

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in SearchCategories");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while searching categories",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // POST: api/retailer/categories/default
        [HttpPost("categories/default")]
        public async Task<IActionResult> AddDefaultCategory()
        {
            try
            {
                _logger.LogInformation("=== AddDefaultCategory Started ===");

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

                // 5. Add default category using service
                var result = await _categoryService.AddDefaultCategoryAsync(companyIdGuid);

                if (!result)
                {
                    return Conflict(new
                    {
                        success = false,
                        error = "Default category already exists"
                    });
                }

                _logger.LogInformation($"Successfully added default category for company ID: {companyIdGuid}");

                return Ok(new
                {
                    success = true,
                    message = "Default category added successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in AddDefaultCategory");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while adding default category",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }
    }
}