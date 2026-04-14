
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto.RetailerDto;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.Shared;
using SkyForge.Services.Retailer.AgeingReportServices;
using System.Security.Claims;

namespace SkyForge.Controllers.Retailer
{
    [ApiController]
    [Route("api/retailer")]
    [Authorize]
    public class AgeingReportController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<AgeingReportController> _logger;
        private readonly IAgeingReportService _ageingReportService;

        public AgeingReportController(
            ApplicationDbContext context,
            ILogger<AgeingReportController> logger,
            IAgeingReportService ageingReportService)
        {
            _context = context;
            _logger = logger;
            _ageingReportService = ageingReportService;
        }

        // GET: api/retailer/ageing-report/all-accounts
        [HttpGet("ageing-report/all-accounts")]
        public async Task<IActionResult> GetAgeingReport([FromQuery] string? asOnDate = null)
        {
            try
            {
                _logger.LogInformation("=== GetAgeingReport Started ===");

                // Extract claims from JWT
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyIdClaim = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;
                var companyName = User.FindFirst("currentCompanyName")?.Value;

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
                if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out Guid companyIdGuid))
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

                // Get company details to determine date format
                var company = await _context.Companies
                    .FirstOrDefaultAsync(c => c.Id == companyIdGuid);

                if (company == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Company not found"
                    });
                }

                var isNepaliFormat = company.DateFormat?.ToString().ToLower() == "nepali";

                // Parse the asOnDate parameter
                DateTime asOnDateTime;
                if (!string.IsNullOrEmpty(asOnDate))
                {
                    if (isNepaliFormat)
                    {
                        // For Nepali format, parse the Nepali date string
                        if (DateTime.TryParse(asOnDate, out asOnDateTime))
                        {
                            _logger.LogInformation("Using provided Nepali asOnDate: {AsOnDate}", asOnDate);
                        }
                        else
                        {
                            asOnDateTime = DateTime.UtcNow.Date;
                            _logger.LogWarning("Invalid Nepali asOnDate format: {AsOnDate}, using current date", asOnDate);
                        }
                    }
                    else
                    {
                        // For English format, parse as standard date
                        if (DateTime.TryParse(asOnDate, out asOnDateTime))
                        {
                            _logger.LogInformation("Using provided English asOnDate: {AsOnDate}", asOnDate);
                        }
                        else
                        {
                            asOnDateTime = DateTime.UtcNow.Date;
                            _logger.LogWarning("Invalid English asOnDate format: {AsOnDate}, using current date", asOnDate);
                        }
                    }
                }
                else
                {
                    asOnDateTime = DateTime.UtcNow.Date;
                    _logger.LogInformation("No asOnDate provided, using current date: {CurrentDate}", asOnDateTime);
                }

                // Get ageing report data from service with the asOnDate
                var reportData = await _ageingReportService.GetAgeingReportAsync(companyIdGuid, fiscalYearIdGuid, asOnDateTime);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        report = reportData.Report,
                        receivableTotals = reportData.ReceivableTotals,
                        payableTotals = reportData.PayableTotals,
                        netTotals = reportData.NetTotals,
                        company = reportData.Company,
                        currentCompany = reportData.CurrentCompany,
                        companyDateFormat = reportData.CompanyDateFormat,
                        currentFiscalYear = reportData.CurrentFiscalYear,
                        initialFiscalYear = reportData.InitialFiscalYear,
                        currentCompanyName = reportData.CurrentCompanyName,
                        asOnDateUsed = asOnDateTime
                    }
                });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in GetAgeingReport");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetAgeingReport");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching ageing report",
                    message = ex.Message
                });
            }
        }

        // GET: api/retailer/day-count-aging
        [HttpGet("day-count-aging")]
        public async Task<IActionResult> GetDayCountAging([FromQuery] Guid? accountId = null, [FromQuery] string? asOnDate = null)
        {
            try
            {
                _logger.LogInformation("=== GetDayCountAging Started ===");

                // Extract claims from JWT
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyIdClaim = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;
                var companyName = User.FindFirst("currentCompanyName")?.Value;

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
                if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out Guid companyIdGuid))
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

                // Get company details to determine date format
                var company = await _context.Companies
                    .FirstOrDefaultAsync(c => c.Id == companyIdGuid);

                if (company == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Company not found"
                    });
                }

                var isNepaliFormat = company.DateFormat?.ToString().ToLower() == "nepali";
                var companyDateFormat = company.DateFormat?.ToString() ?? "nepali";

                // Parse the asOnDate parameter (only needed when accountId is provided)
                DateTime asOnDateTime = DateTime.UtcNow.Date;
                if (!string.IsNullOrEmpty(asOnDate) && accountId.HasValue)
                {
                    if (isNepaliFormat)
                    {
                        if (DateTime.TryParse(asOnDate, out asOnDateTime))
                        {
                            _logger.LogInformation("Using provided Nepali asOnDate: {AsOnDate}", asOnDate);
                        }
                        else
                        {
                            asOnDateTime = DateTime.UtcNow.Date;
                            _logger.LogWarning("Invalid Nepali asOnDate format: {AsOnDate}, using current date", asOnDate);
                        }
                    }
                    else
                    {
                        if (DateTime.TryParse(asOnDate, out asOnDateTime))
                        {
                            _logger.LogInformation("Using provided English asOnDate: {AsOnDate}", asOnDate);
                        }
                        else
                        {
                            asOnDateTime = DateTime.UtcNow.Date;
                            _logger.LogWarning("Invalid English asOnDate format: {AsOnDate}, using current date", asOnDate);
                        }
                    }
                }

                // Get Sundry Debtors and Creditors groups
                var debtorGroup = await _context.AccountGroups
                    .FirstOrDefaultAsync(g => g.Name == "Sundry Debtors" && g.CompanyId == companyIdGuid);

                var creditorGroup = await _context.AccountGroups
                    .FirstOrDefaultAsync(g => g.Name == "Sundry Creditors" && g.CompanyId == companyIdGuid);

                // Get all relevant accounts
                var relevantGroupIds = new List<Guid>();
                if (debtorGroup != null) relevantGroupIds.Add(debtorGroup.Id);
                if (creditorGroup != null) relevantGroupIds.Add(creditorGroup.Id);

                var accounts = await _context.Accounts
                    .Where(a => a.CompanyId == companyIdGuid &&
                           relevantGroupIds.Contains(a.AccountGroupsId) &&
                           a.IsActive)
                    .OrderBy(a => a.Name)
                    .Include(a => a.InitialOpeningBalance)
                    .ToListAsync();

                // If no accountId provided, return accounts list (WITHOUT asOnDate)
                if (!accountId.HasValue)
                {
                    return Ok(new
                    {
                        success = true,
                        data = new
                        {
                            accounts = accounts.Select(acc => new
                            {
                                _id = acc.Id,
                                name = acc.Name,
                                address = acc.Address,
                                phone = acc.Phone,
                                email = acc.Email,
                                companyGroups = acc.AccountGroupsId,
                            }),
                            company = new
                            {
                                _id = company.Id,
                                name = company.Name,
                                dateFormat = companyDateFormat  // Return the date format string
                            },
                            currentFiscalYear = new
                            {
                                _id = fiscalYearIdGuid,
                                name = await _context.FiscalYears.Where(f => f.Id == fiscalYearIdGuid).Select(f => f.Name).FirstOrDefaultAsync(),
                                startDate = await _context.FiscalYears.Where(f => f.Id == fiscalYearIdGuid).Select(f => f.StartDate).FirstOrDefaultAsync(),
                                endDate = await _context.FiscalYears.Where(f => f.Id == fiscalYearIdGuid).Select(f => f.EndDate).FirstOrDefaultAsync()
                            },
                            currentCompanyName = companyName,
                            // DO NOT RETURN asOnDate - let frontend set it based on dateFormat
                            hasDateFilter = false
                        }
                    });
                }

                // Validate account exists
                var account = accounts.FirstOrDefault(a => a.Id == accountId.Value);
                if (account == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Account not found"
                    });
                }

                // Get ageing report data from service
                var ageingData = await _ageingReportService.GetDayCountAgingForAccountAsync(
                    companyIdGuid,
                    fiscalYearIdGuid,
                    accountId.Value,
                    asOnDateTime);

                return Ok(new
                {
                    success = true,
                    data = ageingData
                });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in GetDayCountAging");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetDayCountAging");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching ageing report",
                    message = ex.Message
                });
            }
        }
    
    }
}