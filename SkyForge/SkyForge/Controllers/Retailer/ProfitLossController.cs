using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto.RetailerDto;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.Shared;
using SkyForge.Services.Retailer.ProfitLossServices;
using System.Security.Claims;

namespace SkyForge.Controllers.Retailer
{
    [ApiController]
    [Route("api/retailer")]
    [Authorize]
    public class ProfitLossController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<ProfitLossController> _logger;
        private readonly IProfitLossService _profitLossService;

        public ProfitLossController(
            ApplicationDbContext context,
            ILogger<ProfitLossController> logger,
            IProfitLossService profitLossService)
        {
            _context = context;
            _logger = logger;
            _profitLossService = profitLossService;
        }

        [HttpGet("invoice-wise-profit-loss")]
        public async Task<IActionResult> GetInvoiceWiseProfitLoss(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] string? billNumber = null)
        {
            try
            {
                _logger.LogInformation("=== GetInvoiceWiseProfitLoss Started ===");

                // Extract claims from JWT
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
                var isAdminClaim = User.FindFirst("isAdmin")?.Value;

                bool isAdmin = bool.TryParse(isAdminClaim, out bool admin) && admin;

                // Validate user
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new
                    {
                        success = false,
                        error = "Invalid user token. Please login again."
                    });
                }

                // Validate company
                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected. Please select a company first."
                    });
                }

                // Validate trade type
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "Access restricted to retailer accounts"
                    });
                }

                // Handle fiscal year
                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                    if (activeFiscalYear == null)
                    {
                        return BadRequest(new
                        {
                            success = false,
                            error = "No active fiscal year found for this company."
                        });
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                // Get user info
                var user = await _context.Users
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Id == userIdGuid);

                string userRoleName = "User";
                if (isAdmin)
                {
                    userRoleName = "Admin";
                }
                else if (user?.UserRoles != null)
                {
                    var primaryRole = user.UserRoles.FirstOrDefault(ur => ur.IsPrimary);
                    if (primaryRole?.Role != null)
                    {
                        userRoleName = primaryRole.Role.Name;
                    }
                }

                bool isAdminOrSupervisor = isAdmin || userRoleName == "Supervisor";

                // Get the profit/loss data
                var result = await _profitLossService.GetInvoiceWiseProfitLossAsync(
                    companyIdGuid,
                    fiscalYearIdGuid,
                    fromDate,
                    toDate,
                    billNumber);

                // Add user info to response
                result.User = new UserInfoDto
                {
                    Id = userIdGuid,
                    Name = user?.Name ?? "",
                    IsAdmin = isAdmin,
                    Role = userRoleName,
                    Preferences = new UserPreferencesDTO
                    {
                        Theme = user?.Preferences?.Theme.ToString() ?? "light"
                    }
                };

                var response = new
                {
                    success = true,
                    data = result
                };

                _logger.LogInformation($"Successfully fetched invoice-wise profit/loss data with {result.Results.Count} invoices");

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetInvoiceWiseProfitLoss");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching profit/loss data",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }
    }
}