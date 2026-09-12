// Controllers/AuditReportController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkyForge.Services.AuditReportServices;
using SkyForge.Dto.AuditReportDto;
using System.Security.Claims;
using SkyForge.Data;

namespace SkyForge.Controllers
{
    [ApiController]
    [Route("api/audit")]
    [Authorize]
    public class AuditReportController : ControllerBase
    {
        private readonly IAuditReportService _auditReportService;
        private readonly ILogger<AuditReportController> _logger;

        public AuditReportController(
            IAuditReportService auditReportService,
            ILogger<AuditReportController> logger)
        {
            _auditReportService = auditReportService;
            _logger = logger;
        }

        /// <summary>
        /// GET: api/audit/opening-trial-balance
        /// Generates Opening Trial Balance report
        /// </summary>
        [HttpGet("opening-trial-balance")]
        public async Task<IActionResult> GetOpeningTrialBalance([FromQuery] DateTime? asOnDate = null)
        {
            try
            {
                var (companyId, fiscalYearId) = await GetCompanyAndFiscalYearAsync();
                if (companyId == Guid.Empty || fiscalYearId == Guid.Empty)
                    return Unauthorized(new { success = false, error = "Invalid company or fiscal year" });

                var result = await _auditReportService.GetOpeningTrialBalanceAsync(companyId, fiscalYearId, asOnDate);

                if (!result.Success)
                    return BadRequest(result);

                return Ok(new { success = true, data = result.Data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating Opening Trial Balance");
                return StatusCode(500, new { success = false, error = "Internal server error" });
            }
        }

        // /// <summary>
        // /// GET: api/audit/closing-trial-balance
        // /// Generates Closing Trial Balance report
        // /// </summary>
        // [HttpGet("closing-trial-balance")]
        // public async Task<IActionResult> GetClosingTrialBalance([FromQuery] DateTime? asOnDate = null)
        // {
        //     try
        //     {
        //         var (companyId, fiscalYearId) = await GetCompanyAndFiscalYearAsync();
        //         if (companyId == Guid.Empty || fiscalYearId == Guid.Empty)
        //             return Unauthorized(new { success = false, error = "Invalid company or fiscal year" });

        //         var result = await _auditReportService.GetClosingTrialBalanceAsync(companyId, fiscalYearId, asOnDate);

        //         if (!result.Success)
        //             return BadRequest(result);

        //         return Ok(new { success = true, data = result.Data });
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error generating Closing Trial Balance");
        //         return StatusCode(500, new { success = false, error = "Internal server error" });
        //     }
        // }


        /// <summary>
        /// GET: api/audit/post-closing-trial-balance
        /// Generates Post-Closing Trial Balance report
        /// (Sale, Purchase, Expenses, Income closed to zero;
        ///  only Balance Sheet accounts + Reserves & Surplus remain)
        /// </summary>
        [HttpGet("post-closing-trial-balance")]
        public async Task<IActionResult> GetPostClosingTrialBalance([FromQuery] DateTime? asOnDate = null)
        {
            try
            {
                var (companyId, fiscalYearId) = await GetCompanyAndFiscalYearAsync();
                if (companyId == Guid.Empty || fiscalYearId == Guid.Empty)
                    return Unauthorized(new { success = false, error = "Invalid company or fiscal year" });

                var result = await _auditReportService.GetPostClosingTrialBalanceAsync(companyId, fiscalYearId, asOnDate);

                if (!result.Success)
                    return BadRequest(result);

                return Ok(new { success = true, data = result.Data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating Post-Closing Trial Balance");
                return StatusCode(500, new { success = false, error = "Internal server error" });
            }
        }

        /// <summary>
        /// GET: api/audit/pre-closing-trial-balance
        /// Generates Pre-Closing Trial Balance report
        /// </summary>
        [HttpGet("pre-closing-trial-balance")]
        public async Task<IActionResult> GetPreClosingTrialBalance([FromQuery] DateTime? asOnDate = null)
        {
            try
            {
                var (companyId, fiscalYearId) = await GetCompanyAndFiscalYearAsync();
                if (companyId == Guid.Empty || fiscalYearId == Guid.Empty)
                    return Unauthorized(new { success = false, error = "Invalid company or fiscal year" });

                var result = await _auditReportService.GetPreClosingTrialBalanceAsync(companyId, fiscalYearId, asOnDate);

                if (!result.Success)
                    return BadRequest(result);

                return Ok(new { success = true, data = result.Data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating Closing Trial Balance");
                return StatusCode(500, new { success = false, error = "Internal server error" });
            }
        }

        /// <summary>
        /// GET: api/audit/profit-and-loss
        /// Generates Profit & Loss Account report
        /// </summary>
        [HttpGet("profit-and-loss")]
        public async Task<IActionResult> GetProfitAndLossAccount([FromQuery] DateTime? asOnDate = null)
        {
            try
            {
                var (companyId, fiscalYearId) = await GetCompanyAndFiscalYearAsync();
                if (companyId == Guid.Empty || fiscalYearId == Guid.Empty)
                    return Unauthorized(new { success = false, error = "Invalid company or fiscal year" });

                var result = await _auditReportService.GetProfitAndLossAccountAsync(companyId, fiscalYearId, asOnDate);

                if (!result.Success)
                    return BadRequest(result);

                return Ok(new { success = true, data = result.Data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating Profit & Loss Account");
                return StatusCode(500, new { success = false, error = "Internal server error" });
            }
        }

        /// <summary>
        /// GET: api/audit/balance-sheet
        /// Generates Balance Sheet report
        /// </summary>
        [HttpGet("balance-sheet")]
        public async Task<IActionResult> GetBalanceSheet([FromQuery] DateTime? asOnDate = null)
        {
            try
            {
                var (companyId, fiscalYearId) = await GetCompanyAndFiscalYearAsync();
                if (companyId == Guid.Empty || fiscalYearId == Guid.Empty)
                    return Unauthorized(new { success = false, error = "Invalid company or fiscal year" });

                var result = await _auditReportService.GetBalanceSheetAsync(companyId, fiscalYearId, asOnDate);

                if (!result.Success)
                    return BadRequest(result);

                return Ok(new { success = true, data = result.Data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating Balance Sheet");
                return StatusCode(500, new { success = false, error = "Internal server error" });
            }
        }

        /// <summary>
        /// GET: api/audit/cogs-periodic
        /// Generates Cost of Goods Sold (Periodic) report
        /// Formula: Opening Stock + Purchases + Direct Expenses − Closing Stock
        /// </summary>
        [HttpGet("cogs-periodic")]
        public async Task<IActionResult> GetCogsPeriodic([FromQuery] DateTime? asOnDate = null)
        {
            try
            {
                var (companyId, fiscalYearId) = await GetCompanyAndFiscalYearAsync();
                if (companyId == Guid.Empty || fiscalYearId == Guid.Empty)
                    return Unauthorized(new { success = false, error = "Invalid company or fiscal year" });

                var result = await _auditReportService.GetCogsPeriodicAsync(companyId, fiscalYearId, asOnDate);

                if (!result.Success)
                    return BadRequest(result);

                return Ok(new { success = true, data = result.Data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating Periodic COGS");
                return StatusCode(500, new { success = false, error = "Internal server error" });
            }
        }

        /// <summary>
        /// GET: api/audit/comprehensive
        /// Generates comprehensive audit report with all sections
        /// </summary>
        [HttpGet("comprehensive")]
        public async Task<IActionResult> GetComprehensiveAuditReport([FromQuery] DateTime? asOnDate = null)
        {
            try
            {
                var (companyId, fiscalYearId) = await GetCompanyAndFiscalYearAsync();
                if (companyId == Guid.Empty || fiscalYearId == Guid.Empty)
                    return Unauthorized(new { success = false, error = "Invalid company or fiscal year" });

                var result = await _auditReportService.GetComprehensiveAuditReportAsync(companyId, fiscalYearId, asOnDate);

                if (!result.Success)
                    return BadRequest(result);

                return Ok(new { success = true, data = result.Data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating comprehensive audit report");
                return StatusCode(500, new { success = false, error = "Internal server error" });
            }
        }

        // Helper method to get company and fiscal year from claims
        private async Task<(Guid CompanyId, Guid FiscalYearId)> GetCompanyAndFiscalYearAsync()
        {
            var companyIdClaim = User.FindFirst("currentCompany")?.Value;
            var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;

            if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out var companyId))
                return (Guid.Empty, Guid.Empty);

            if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out var fiscalYearId))
            {
                // Try to get active fiscal year
                var context = HttpContext.RequestServices.GetService<ApplicationDbContext>();
                if (context != null)
                {
                    var activeFiscalYear = await context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyId && f.IsActive);
                    if (activeFiscalYear != null)
                        return (companyId, activeFiscalYear.Id);
                }
                return (companyId, Guid.Empty);
            }

            return (companyId, fiscalYearId);
        }
    }
}