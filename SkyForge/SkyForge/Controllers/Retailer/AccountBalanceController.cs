// Add to your existing AccountController.cs or create a new one
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkyForge.Data;
using SkyForge.Dto.AccountDto;
using SkyForge.Services.AccountServices;
using SkyForge.Models.Shared;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using SkyForge.Models.CompanyModel;

namespace SkyForge.Controllers.Retailer
{
    [ApiController]
    [Route("api/retailer")]
    [Authorize]
    public class AccountBalanceController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<AccountBalanceController> _logger;
        private readonly IAccountBalanceService _accountBalanceService;

        public AccountBalanceController(
            ApplicationDbContext context,
            ILogger<AccountBalanceController> logger,
            IAccountBalanceService accountBalanceService)
        {
            _context = context;
            _logger = logger;
            _accountBalanceService = accountBalanceService;
        }

        // GET: api/retailer/accounts/{accountId}/balance
        [HttpGet("accounts/{accountId}/balance")]
        public async Task<IActionResult> GetAccountBalance(Guid accountId)
        {
            try
            {
                _logger.LogInformation("=== GetAccountBalance Started for Account: {AccountId} ===", accountId);

                // Extract claims from JWT
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

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
                        error = "Access denied for this trade type"
                    });
                }

                // Handle fiscal year - get from claims first, then fallback
                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    // If not in claims, get active fiscal year for the company
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                    if (activeFiscalYear == null)
                    {
                        // Try to get any fiscal year as fallback
                        activeFiscalYear = await _context.FiscalYears
                            .Where(f => f.CompanyId == companyIdGuid)
                            .OrderByDescending(f => f.StartDate)
                            .FirstOrDefaultAsync();

                        if (activeFiscalYear == null)
                        {
                            return BadRequest(new
                            {
                                success = false,
                                error = "No fiscal year found for this company. Please select a fiscal year first."
                            });
                        }
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;

                    _logger.LogInformation($"Using active fiscal year: {fiscalYearIdGuid}");
                }

                // Get account balance
                var result = await _accountBalanceService.GetAccountBalanceAsync(
                    accountId,
                    companyIdGuid,
                    fiscalYearIdGuid);

                if (!result.Success)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = result.Error
                    });
                }

                return Ok(new
                {
                    success = true,
                    data = result.Data
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetAccountBalance");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching account balance",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }
    }
}