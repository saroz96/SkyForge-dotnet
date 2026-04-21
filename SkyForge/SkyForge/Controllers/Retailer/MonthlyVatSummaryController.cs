using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkyForge.Data;
using SkyForge.Models.Shared;
using SkyForge.Services.Retailer.MonthlyVatSummaryServices;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using SkyForge.Models.CompanyModel;

namespace SkyForge.Controllers.Retailer
{
    [ApiController]
    [Route("api/retailer")]
    [Authorize]
    public class MonthlyVatSummaryController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IMonthlyVatSummaryService _monthlyVatSummaryService;
        private readonly ILogger<MonthlyVatSummaryController> _logger;

        public MonthlyVatSummaryController(
            ApplicationDbContext context,
            IMonthlyVatSummaryService monthlyVatSummaryService,
            ILogger<MonthlyVatSummaryController> logger)
        {
            _context = context;
            _monthlyVatSummaryService = monthlyVatSummaryService;
            _logger = logger;
        }

        [HttpGet("monthly-vat-summary")]
        public async Task<IActionResult> GetMonthlyVatSummary(
            [FromQuery] string? month = null,
            [FromQuery] string? year = null,
            [FromQuery] string? nepaliMonth = null,
            [FromQuery] string? nepaliYear = null,
            [FromQuery] string? periodType = null)
        {
            try
            {
                _logger.LogInformation("=== GetMonthlyVatSummary Started ===");

                // Extract claims from JWT
                var userIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyIdClaim = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                // Validate user
                if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId))
                {
                    return Unauthorized(new
                    {
                        success = false,
                        error = "Invalid user token. Please login again."
                    });
                }

                // Validate company
                if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out Guid companyId))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected. Please select a company first."
                    });
                }

                // Validate trade type using Enum.TryParse (same as PaymentController)
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "Access restricted to retailer accounts"
                    });
                }

                // Get user info
                var user = await _context.Users
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                {
                    return Unauthorized(new
                    {
                        success = false,
                        error = "User not found"
                    });
                }

                // Handle fiscal year - get from claims first, then fallback (same as PaymentController)
                Guid fiscalYearId;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearId))
                {
                    // If not in claims, get active fiscal year for the company
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyId && f.IsActive);

                    if (activeFiscalYear == null)
                    {
                        // Try to get any fiscal year as fallback
                        activeFiscalYear = await _context.FiscalYears
                            .Where(f => f.CompanyId == companyId)
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
                    fiscalYearId = activeFiscalYear.Id;

                    _logger.LogInformation($"Using active fiscal year: {fiscalYearId}");
                }

                // Get company date format
                var company = await _context.Companies
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                if (company == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Company not found"
                    });
                }

                string dateFormat = company.DateFormat?.ToString().ToLower() ?? "english";

                // Get the summary data
                var result = await _monthlyVatSummaryService.GetMonthlyVatSummaryAsync(
                    companyId,
                    fiscalYearId,
                    month,
                    year,
                    nepaliMonth,
                    nepaliYear,
                    periodType,
                    dateFormat);

                return Ok(new { success = true, data = result });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid parameters for monthly VAT summary");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetMonthlyVatSummary");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching monthly VAT summary",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }
    }
}