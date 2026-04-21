using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkyForge.Data;
using SkyForge.Models.Shared;
using SkyForge.Services.Retailer.StockStatusServices;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using SkyForge.Models.CompanyModel;

namespace SkyForge.Controllers.Retailer
{
    [ApiController]
    [Route("api/retailer")]
    [Authorize]
    public class StockStatusController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IStockStatusService _stockStatusService;
        private readonly ILogger<StockStatusController> _logger;

        public StockStatusController(
            ApplicationDbContext context,
            IStockStatusService stockStatusService,
            ILogger<StockStatusController> logger)
        {
            _context = context;
            _stockStatusService = stockStatusService;
            _logger = logger;
        }

        [HttpGet("stock-status")]
        public async Task<IActionResult> GetStockStatus(
            [FromQuery] bool? showPurchaseValue = null,
            [FromQuery] bool? showSalesValue = null,
            [FromQuery] int page = 1,
            [FromQuery] int limit = 10,
            [FromQuery] string search = "",
            [FromQuery] string? asOnDate = null)
        {
            try
            {
                _logger.LogInformation("=== GetStockStatus Started ===");

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

                // Validate trade type
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

                // Handle fiscal year - get from claims first
                Guid fiscalYearId;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearId))
                {
                    // If not in claims, get active fiscal year for the company
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyId && f.IsActive);

                    if (activeFiscalYear == null)
                    {
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
                var isNepaliFormat = dateFormat == "nepali";

                // Parse the asOnDate parameter
                DateTime asOnDateTime;
                if (!string.IsNullOrEmpty(asOnDate))
                {
                    if (DateTime.TryParse(asOnDate, out asOnDateTime))
                    {
                        _logger.LogInformation("Using provided asOnDate: {AsOnDate}", asOnDate);
                    }
                    else
                    {
                        asOnDateTime = DateTime.UtcNow.Date;
                        _logger.LogWarning("Invalid asOnDate format: {AsOnDate}, using current date", asOnDate);
                    }
                }
                else
                {
                    asOnDateTime = DateTime.UtcNow.Date;
                    _logger.LogInformation("No asOnDate provided, using current date: {CurrentDate}", asOnDateTime);
                }

                // Parse limit with max value of 1000
                int limitValue = Math.Min(limit, 1000);
                int pageValue = Math.Max(page, 1);

                // Get the stock status data
                var result = await _stockStatusService.GetStockStatusAsync(
                    companyId,
                    fiscalYearId,
                    company,
                    dateFormat,
                    limitValue,
                    pageValue,
                    search,
                    showPurchaseValue ?? false,
                    showSalesValue ?? false,
                    user,
                    asOnDateTime,
                    isNepaliFormat);

                return Ok(new { success = true, data = result });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid parameters for stock status");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetStockStatus");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching stock status",
                    message = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }
    }
}