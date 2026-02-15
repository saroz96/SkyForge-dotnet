using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto.AccountGroupDto;
using SkyForge.Models.AccountGroupModel;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Services.AccountGroupServices;
using System.Security.Claims;

namespace SkyForge.Controllers.Retailer
{
    [Route("api/retailer")]
    [ApiController]
    [Authorize]
    public class AccountGroupController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<AccountGroupController> _logger;
        private readonly IAccountGroupService _accountGroupService;

        public AccountGroupController(
            ApplicationDbContext context,
            ILogger<AccountGroupController> logger,
            IAccountGroupService accountGroupService)
        {
            _context = context;
            _logger = logger;
            _accountGroupService = accountGroupService;
        }

        // GET: api/retailer/account-group
        [HttpGet("account-group")]
        public async Task<IActionResult> GetAccountGroups()
        {
            try
            {
                _logger.LogInformation("=== GetAccountGroups Started ===");

                // 1. Extract user and company info from JWT claims
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var companyName = User.FindFirst("currentCompanyName")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                // 2. Validate required claims exist
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new
                    {
                        error = "Invalid user token. Please login again."
                    });
                }

                // 3. Check if company is selected
                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        error = "No company selected. Please select a company first."
                    });
                }

                // 4. Check if trade type is Retailer
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new
                    {
                        error = "Access forbidden for this trade type"
                    });
                }

                // 5. Get company details
                var company = await _context.Companies
                    .Include(c => c.FiscalYears)
                    .FirstOrDefaultAsync(c => c.Id == companyIdGuid);

                if (company == null)
                {
                    return NotFound(new
                    {
                        error = "Company not found"
                    });
                }

                // 6. Get active fiscal year for the company
                var currentFiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                if (currentFiscalYear == null)
                {
                    // Try to get any fiscal year as fallback
                    currentFiscalYear = await _context.FiscalYears
                        .Where(f => f.CompanyId == companyIdGuid)
                        .OrderByDescending(f => f.StartDate)
                        .FirstOrDefaultAsync();

                    if (currentFiscalYear == null)
                    {
                        return BadRequest(new
                        {
                            error = "No fiscal year found for this company"
                        });
                    }
                }

                // 7. Get company groups (account groups)
                var accountGroups = await _context.AccountGroups
                    .Where(ag => ag.CompanyId == companyIdGuid)
                    .Select(ag => new
                    {
                        _id = ag.Id,
                        name = ag.Name,
                        primaryGroup = ag.PrimaryGroup,
                        type = ag.Type,
                        // Add other properties if needed
                        uniqueNumber = ag.UniqueNumber,
                        companyId = ag.CompanyId,
                        createdAt = ag.CreatedAt,
                        updatedAt = ag.UpdatedAt
                    })
                    .ToListAsync();

                // 8. Determine if user is admin or supervisor
                var roleName = User.FindFirst(ClaimTypes.Role)?.Value;
                var isAdminClaim = User.FindFirst("isAdmin")?.Value;
                bool isAdmin = bool.TryParse(isAdminClaim, out bool admin) && admin;
                bool isAdminOrSupervisor = isAdmin || (roleName == "Supervisor" || roleName == "Admin");

                // 9. Prepare user info
                var userName = User.FindFirst(ClaimTypes.Name)?.Value;
                var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
                var roleId = User.FindFirst("roleId")?.Value;
                var isEmailVerifiedClaim = User.FindFirst("isEmailVerified")?.Value;
                bool isEmailVerified = bool.TryParse(isEmailVerifiedClaim, out bool emailVerified) && emailVerified;

                // 10. Prepare response data
                var responseData = new
                {
                    company = new
                    {
                        _id = company.Id,
                        renewalDate = company.RenewalDate,
                        dateFormat = company.DateFormat?.ToString()?.ToLower() ?? "english",
                        fiscalYear = company.FiscalYears != null && company.FiscalYears.Any()
                            ? new
                            {
                                _id = currentFiscalYear.Id,
                                startDate = currentFiscalYear.StartDate,
                                endDate = currentFiscalYear.EndDate,
                                name = currentFiscalYear.Name,
                                dateFormat = currentFiscalYear.DateFormat?.ToString()?.ToLower() ?? "english",
                                isActive = currentFiscalYear.IsActive
                            }
                            : null
                    },
                    currentFiscalYear = new
                    {
                        _id = currentFiscalYear.Id,
                        startDate = currentFiscalYear.StartDate,
                        endDate = currentFiscalYear.EndDate,
                        name = currentFiscalYear.Name,
                        dateFormat = currentFiscalYear.DateFormat?.ToString()?.ToLower() ?? "english",
                        isActive = currentFiscalYear.IsActive
                    },
                    companiesGroups = accountGroups,
                    companyId = companyIdGuid.ToString(),
                    currentCompanyName = companyName ?? company.Name,
                    user = new
                    {
                        _id = userIdGuid,
                        name = userName ?? "User",
                        email = userEmail ?? "",
                        isAdmin = isAdmin,
                        role = roleName ?? "User",
                        roleId = roleId,
                        preferences = new
                        {
                            theme = "light"
                        }
                    },
                    isAdminOrSupervisor = isAdminOrSupervisor
                };

                _logger.LogInformation($"Successfully fetched {accountGroups.Count} account groups for company {company.Name}");

                return Ok(responseData);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetAccountGroups");
                return StatusCode(500, new
                {
                    error = "Internal server error",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // POST: api/retailer/account-group
        [HttpPost("account-group")]
        public async Task<IActionResult> CreateAccountGroup([FromBody] CreateAccountGroupDTO request)
        {
            try
            {
                _logger.LogInformation("=== CreateAccountGroup Started ===");

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
                if (string.IsNullOrEmpty(request.Name) || string.IsNullOrEmpty(request.Type))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Both name and type are required fields"
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

                // 7. Get current active fiscal year
                var currentFiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                if (currentFiscalYear == null)
                {
                    // Get any fiscal year as fallback
                    currentFiscalYear = await _context.FiscalYears
                        .Where(f => f.CompanyId == companyIdGuid)
                        .OrderByDescending(f => f.StartDate)
                        .FirstOrDefaultAsync();

                    if (currentFiscalYear == null)
                    {
                        return BadRequest(new
                        {
                            success = false,
                            error = "No fiscal year found"
                        });
                    }
                }

                // 8. Validate Type field
                if (!AccountGroup.IsValidType(request.Type))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = $"Invalid type. Valid types are: {string.Join(", ", AccountGroup.GetValidTypes())}"
                    });
                }

                // 9. Validate PrimaryGroup field
                if (request.PrimaryGroup != "Yes" && request.PrimaryGroup != "No")
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "PrimaryGroup must be 'Yes' or 'No'"
                    });
                }

                // 10. Check if account group with same name already exists in this company
                var existingGroup = await _context.AccountGroups
                    .FirstOrDefaultAsync(ag => ag.CompanyId == companyIdGuid &&
                                               ag.Name.ToLower() == request.Name.ToLower());

                if (existingGroup != null)
                {
                    return Conflict(new
                    {
                        success = false,
                        error = "An account group with this name already exists within the selected company"
                    });
                }

                // 11. Create account group object
                var newAccountGroup = new AccountGroup
                {
                    Id = Guid.NewGuid(),
                    Name = request.Name.Trim(),
                    PrimaryGroup = request.PrimaryGroup,
                    Type = request.Type,
                    CompanyId = companyIdGuid,
                    CreatedAt = DateTime.UtcNow
                    // UniqueNumber will be generated by the service
                };

                // 12. Save the account group using the service
                AccountGroup createdAccountGroup;
                try
                {
                    createdAccountGroup = await _accountGroupService.CreateAccountGroupAsync(newAccountGroup);
                }
                catch (InvalidOperationException ex) when (ex.Message.Contains("already exists"))
                {
                    return Conflict(new
                    {
                        success = false,
                        error = "An account group with this name already exists within the selected company."
                    });
                }
                catch (ArgumentException ex) when (ex.Message.Contains("Invalid account group type"))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = ex.Message
                    });
                }

                // 13. Load related data for response
                await _context.Entry(createdAccountGroup)
                    .Reference(ag => ag.Company)
                    .LoadAsync();

                // 14. Prepare response
                var response = new
                {
                    success = true,
                    message = "Successfully created a new account group",
                    data = new
                    {
                        group = new
                        {
                            _id = createdAccountGroup.Id,
                            name = createdAccountGroup.Name,
                            type = createdAccountGroup.Type,
                            primaryGroup = createdAccountGroup.PrimaryGroup,
                            uniqueNumber = createdAccountGroup.UniqueNumber,
                            company = createdAccountGroup.Company == null ? null : new
                            {
                                _id = createdAccountGroup.Company.Id,
                                name = createdAccountGroup.Company.Name
                            },
                            createdAt = createdAccountGroup.CreatedAt,
                            updatedAt = createdAccountGroup.UpdatedAt
                        }
                    }
                };

                _logger.LogInformation($"Successfully created account group '{createdAccountGroup.Name}' for company {company.Name}");

                return Ok(response);
            }
            catch (DbUpdateException dbEx)
            {
                _logger.LogError(dbEx, "Database error while creating account group");

                // Check for unique constraint violation
                if (dbEx.InnerException?.Message?.Contains("IX_AccountGroups") == true ||
                    dbEx.InnerException?.Message?.Contains("unique constraint") == true ||
                    dbEx.InnerException?.Message?.Contains("23505") == true) // PostgreSQL unique violation error code
                {
                    return Conflict(new
                    {
                        success = false,
                        error = "An account group with this name already exists within the selected company."
                    });
                }

                return StatusCode(500, new
                {
                    success = false,
                    error = "Database error while creating account group"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in CreateAccountGroup");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while creating account group",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // PUT: api/retailer/account-group/{id}
        [HttpPut("account-group/{id}")]
        public async Task<IActionResult> UpdateAccountGroup(Guid id, [FromBody] UpdateAccountGroupDTO request)
        {
            try
            {
                _logger.LogInformation("=== UpdateAccountGroup Started ===");

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
                        error = "Access forbidden for this trade type"
                    });
                }

                // 5. Validate required fields
                if (string.IsNullOrEmpty(request.Name) || string.IsNullOrEmpty(request.Type))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Both name and type are required fields"
                    });
                }

                // 6. Validate Type field
                if (!AccountGroup.IsValidType(request.Type))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = $"Invalid type. Valid types are: {string.Join(", ", AccountGroup.GetValidTypes())}"
                    });
                }

                // 7. Validate PrimaryGroup field
                if (request.PrimaryGroup != "Yes" && request.PrimaryGroup != "No")
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "PrimaryGroup must be 'Yes' or 'No'"
                    });
                }

                // 8. Get the company
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

                // 9. Get current active fiscal year (for middleware compliance)
                var currentFiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                if (currentFiscalYear == null)
                {
                    // Get any fiscal year as fallback
                    currentFiscalYear = await _context.FiscalYears
                        .Where(f => f.CompanyId == companyIdGuid)
                        .OrderByDescending(f => f.StartDate)
                        .FirstOrDefaultAsync();

                    if (currentFiscalYear == null)
                    {
                        return BadRequest(new
                        {
                            success = false,
                            error = "No fiscal year found"
                        });
                    }
                }

                // 10. Check if the group exists and belongs to the current company
                var existingGroup = await _context.AccountGroups
                    .FirstOrDefaultAsync(ag => ag.Id == id && ag.CompanyId == companyIdGuid);

                if (existingGroup == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Account group not found or does not belong to your company"
                    });
                }

                // 11. Check for duplicate name (excluding current document)
                var duplicateGroup = await _context.AccountGroups
                    .FirstOrDefaultAsync(ag => ag.Name.ToLower() == request.Name.ToLower().Trim() &&
                                              ag.CompanyId == companyIdGuid &&
                                              ag.Id != id);

                if (duplicateGroup != null)
                {
                    return Conflict(new
                    {
                        success = false,
                        error = "An account group with this name already exists within your company"
                    });
                }

                // 12. Update the account group
                existingGroup.Name = request.Name.Trim();
                existingGroup.PrimaryGroup = request.PrimaryGroup;
                existingGroup.Type = request.Type;
                existingGroup.UpdatedAt = DateTime.UtcNow;

                // 13. Save changes
                await _context.SaveChangesAsync();

                // 14. Load related data for response
                await _context.Entry(existingGroup)
                    .Reference(ag => ag.Company)
                    .LoadAsync();

                // 15. Prepare response
                var response = new
                {
                    success = true,
                    message = "Account group updated successfully",
                    data = new
                    {
                        group = new
                        {
                            _id = existingGroup.Id,
                            name = existingGroup.Name,
                            primaryGroup = existingGroup.PrimaryGroup,
                            type = existingGroup.Type,
                            company = existingGroup.Company == null ? null : new
                            {
                                _id = existingGroup.Company.Id,
                                name = existingGroup.Company.Name
                            },
                            updatedAt = existingGroup.UpdatedAt
                        }
                    }
                };

                _logger.LogInformation($"Successfully updated account group '{existingGroup.Name}' for company {company.Name}");

                return Ok(response);
            }
            catch (DbUpdateException dbEx)
            {
                _logger.LogError(dbEx, "Database error while updating account group");

                // Check for unique constraint violation
                if (dbEx.InnerException?.Message?.Contains("IX_AccountGroups") == true ||
                    dbEx.InnerException?.Message?.Contains("unique constraint") == true ||
                    dbEx.InnerException?.Message?.Contains("23505") == true) // PostgreSQL unique violation error code
                {
                    return Conflict(new
                    {
                        success = false,
                        error = "An account group with this name already exists within your company"
                    });
                }

                return StatusCode(500, new
                {
                    success = false,
                    error = "Database error while updating account group"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in UpdateAccountGroup");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while updating account group",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // DELETE: api/retailer/account-group/{id}
        [HttpDelete("account-group/{id}")]
        public async Task<IActionResult> DeleteAccountGroup(Guid id)
        {
            try
            {
                _logger.LogInformation("=== DeleteAccountGroup Started ===");

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
                        error = "Access forbidden for this trade type"
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

                // 6. Get current active fiscal year (for middleware compliance)
                var currentFiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                if (currentFiscalYear == null)
                {
                    // Get any fiscal year as fallback
                    currentFiscalYear = await _context.FiscalYears
                        .Where(f => f.CompanyId == companyIdGuid)
                        .OrderByDescending(f => f.StartDate)
                        .FirstOrDefaultAsync();

                    if (currentFiscalYear == null)
                    {
                        return BadRequest(new
                        {
                            success = false,
                            error = "No fiscal year found"
                        });
                    }
                }

                // 7. Verify the group exists and belongs to the current company
                var groupToDelete = await _context.AccountGroups
                    .FirstOrDefaultAsync(ag => ag.Id == id && ag.CompanyId == companyIdGuid);

                if (groupToDelete == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Account group not found or does not belong to your company"
                    });
                }

                // 8. Check if the group is associated with any accounts
                var isGroupAssociated = await _context.Accounts
                    .AnyAsync(a => a.AccountGroupsId == id && a.CompanyId == companyIdGuid);

                if (isGroupAssociated)
                {
                    return Conflict(new
                    {
                        success = false,
                        error = "This group is associated with accounts and cannot be deleted"
                    });
                }

                // 9. Delete the group
                _context.AccountGroups.Remove(groupToDelete);
                await _context.SaveChangesAsync();

                // 10. Prepare response
                var response = new
                {
                    success = true,
                    message = "Account group deleted successfully",
                    data = new
                    {
                        deletedGroupId = id
                    }
                };

                _logger.LogInformation($"Successfully deleted account group '{groupToDelete.Name}' for company {company.Name}");

                return Ok(response);
            }
            catch (DbUpdateException dbEx)
            {
                _logger.LogError(dbEx, "Database error while deleting account group");

                // Check if this is a foreign key constraint violation (accounts still referencing the group)
                if (dbEx.InnerException?.Message?.Contains("FK_") == true ||
                    dbEx.InnerException?.Message?.Contains("foreign key") == true ||
                    dbEx.InnerException?.Message?.Contains("23503") == true) // PostgreSQL foreign key violation
                {
                    return Conflict(new
                    {
                        success = false,
                        error = "Cannot delete account group because it is still referenced by accounts"
                    });
                }

                return StatusCode(500, new
                {
                    success = false,
                    error = "Database error while deleting account group"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in DeleteAccountGroup");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while deleting account group",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }
    }
}