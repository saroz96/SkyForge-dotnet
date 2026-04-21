using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkyForge.Data;
using SkyForge.Models.Shared;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using SkyForge.Services.Retailer.PartySummaryServices;
using SkyForge.Models.CompanyModel;

namespace SkyForge.Controllers.Retailer
{
    [ApiController]
    [Route("api/retailer")]
    [Authorize]
    public class PartySummaryController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IPartySummaryService _partySummaryService;
        private readonly ILogger<PartySummaryController> _logger;

        public PartySummaryController(
            ApplicationDbContext context,
            IPartySummaryService partySummaryService,
            ILogger<PartySummaryController> logger)
        {
            _context = context;
            _partySummaryService = partySummaryService;
            _logger = logger;
        }

        // GET: api/retailer/party-summary-entry-data
        [HttpGet("party-summary-entry-data")]
        public async Task<IActionResult> GetPartySummaryEntryData()
        {
            try
            {
                _logger.LogInformation("=== GetPartySummaryEntryData Started ===");

                // Extract claims from JWT
                var userIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyIdClaim = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var fiscalYearNameClaim = User.FindFirst("fiscalYearName")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;
                var dateFormatClaim = User.FindFirst("dateFormat")?.Value;

                // Validate user
                if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token. Please login again." });
                }

                // Validate company
                if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out Guid companyId))
                {
                    return BadRequest(new { success = false, error = "No company selected. Please select a company first." });
                }

                // Validate trade type
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new { success = false, error = "Access restricted to retailer accounts" });
                }

                // Get fiscal year from claims
                Guid fiscalYearId;
                string fiscalYearName = fiscalYearNameClaim ?? "";
                
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearId))
                {
                    // Fallback to database if not in claims
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
                            return BadRequest(new { success = false, error = "No fiscal year found for this company." });
                        }
                    }
                    fiscalYearId = activeFiscalYear.Id;
                    fiscalYearName = activeFiscalYear.Name;
                }

                // Get date format from claims or database
                DateFormatEnum dateFormat;
                if (!string.IsNullOrEmpty(dateFormatClaim) && Enum.TryParse<DateFormatEnum>(dateFormatClaim, true, out var parsedFormat))
                {
                    dateFormat = parsedFormat;
                }
                else
                {
                    var company = await _context.Companies.FindAsync(companyId);
                    dateFormat = company?.DateFormat ?? DateFormatEnum.English;
                }

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        fiscalYearId = fiscalYearId,
                        fiscalYearName = fiscalYearName,
                        dateFormat = dateFormat.ToString().ToLower(),
                        companyId = companyId
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetPartySummaryEntryData");
                return StatusCode(500, new { success = false, error = "Internal server error" });
            }
        }

        [HttpGet("party-summary-by-month-range/{accountId}")]
        public async Task<IActionResult> GetPartySummaryByMonthRange(
            Guid accountId,
            [FromQuery] int startYear,
            [FromQuery] int startMonth,
            [FromQuery] int endYear,
            [FromQuery] int endMonth)
        {
            try
            {
                _logger.LogInformation("=== GetPartySummaryByMonthRange Started for Account: {AccountId} ===", accountId);

                // Extract claims from JWT
                var userIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyIdClaim = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var fiscalYearNameClaim = User.FindFirst("fiscalYearName")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                // Validate user
                if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token. Please login again." });
                }

                // Validate company
                if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out Guid companyId))
                {
                    return BadRequest(new { success = false, error = "No company selected. Please select a company first." });
                }

                // Validate trade type
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new { success = false, error = "Access restricted to retailer accounts" });
                }

                // Get fiscal year from claims
                Guid fiscalYearId;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearId))
                {
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
                            return BadRequest(new { success = false, error = "No fiscal year found for this company." });
                        }
                    }
                    fiscalYearId = activeFiscalYear.Id;
                }

                var result = await _partySummaryService.GetPartySummaryByMonthRangeAsync(
                    companyId,
                    fiscalYearId,
                    accountId,
                    startYear,
                    startMonth,
                    endYear,
                    endMonth);

                // Add fiscal year name from claim
                result.FiscalYear = fiscalYearNameClaim ?? result.FiscalYear;

                return Ok(new { success = true, data = result });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in GetPartySummaryByMonthRange");
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetPartySummaryByMonthRange");
                return StatusCode(500, new { success = false, error = "Internal server error while fetching party summary" });
            }
        }
    
    }
}