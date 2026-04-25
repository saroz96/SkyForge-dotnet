using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkyForge.Data;
using SkyForge.Services.Retailer.StockAdjustmentServices;
using SkyForge.Models.CompanyModel;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using SkyForge.Dto.RetailerDto.StockAdjustmentDto;
using SkyForge.Models.Shared;
using SkyForge.Models.Retailer.StockAdjustmentModel;

namespace SkyForge.Controllers.Retailer
{
    [ApiController]
    [Route("api/retailer")]
    [Authorize]
    public class StockAdjustmentController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<StockAdjustmentController> _logger;
        private readonly IStockAdjustmentService _stockAdjustmentService;

        public StockAdjustmentController(
            ApplicationDbContext context,
            ILogger<StockAdjustmentController> logger,
            IStockAdjustmentService stockAdjustmentService)
        {
            _context = context;
            _logger = logger;
            _stockAdjustmentService = stockAdjustmentService;
        }

        // GET: api/retailer/last-sales-quotation-date
        [HttpGet("last-stock-adjustment-date")]
        public async Task<IActionResult> GetLastStockAdjustmentDate()
        {
            try
            {
                _logger.LogInformation("=== GetLastStockAdjustmentDate Started ===");

                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                    return Unauthorized(new { success = false, error = "Invalid user token" });

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                    return BadRequest(new { success = false, error = "No company selected" });

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
                    if (activeFiscalYear == null)
                        return BadRequest(new { success = false, error = "No fiscal year found" });
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                // Get company to determine date format FIRST
                var company = await _context.Companies.FindAsync(companyIdGuid);
                bool isNepaliFormat = company?.DateFormat == DateFormatEnum.Nepali;

                // Get the most recent purchase bill based on the company's date format
                IQueryable<StockAdjustment> query = _context.StockAdjustments
                    .Where(p => p.CompanyId == companyIdGuid && p.FiscalYearId == fiscalYearIdGuid);

                IOrderedQueryable<StockAdjustment> orderedQuery;

                if (isNepaliFormat)
                {
                    // For Nepali format, order by nepaliDate descending (this is the Nepali date field)
                    orderedQuery = query.OrderByDescending(p => p.NepaliDate)
                                       .ThenByDescending(p => p.CreatedAt);
                    _logger.LogInformation("Ordering by Nepali date (nepaliDate field)");
                }
                else
                {
                    // For English format, order by Date descending
                    orderedQuery = query.OrderByDescending(p => p.Date)
                                       .ThenByDescending(p => p.CreatedAt);
                    _logger.LogInformation("Ordering by English date (Date field)");
                }

                var lastStockAdjustment = await orderedQuery
                    .Select(p => new { p.Date, p.NepaliDate, p.BillNumber })
                    .FirstOrDefaultAsync();

                if (lastStockAdjustment == null)
                {
                    _logger.LogInformation("No stock adjustment found");
                    return Ok(new
                    {
                        success = true,
                        data = new
                        {
                            date = (string)null,
                            nepaliDate = (string)null,
                            billNumber = (string)null
                        }
                    });
                }

                // Format dates as strings in YYYY-MM-DD format
                string dateString = null;
                string nepaliDateString = null;

                if (lastStockAdjustment.Date != null)
                    dateString = lastStockAdjustment.Date.ToString("yyyy-MM-dd");

                if (lastStockAdjustment.NepaliDate != null)
                    nepaliDateString = lastStockAdjustment.NepaliDate.ToString("yyyy-MM-dd");

                _logger.LogInformation($"Last purchase date found: Date={dateString}, NepaliDate={nepaliDateString}, Bill={lastStockAdjustment.BillNumber}, IsNepaliFormat={isNepaliFormat}");

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        date = dateString,
                        nepaliDate = nepaliDateString,
                        billNumber = lastStockAdjustment.BillNumber,
                        dateFormat = isNepaliFormat ? "nepali" : "english"
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting last sales quotation date");
                return StatusCode(500, new { success = false, error = "Internal Server Error" });
            }
        }


        // GET: api/retailer/stock-adjustments/new
        [HttpGet("stock-adjustments")]
        public async Task<IActionResult> GetNewStockAdjustmentData()
        {
            try
            {
                _logger.LogInformation("=== GetNewStockAdjustmentData Started ===");

                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new
                    {
                        success = false,
                        error = "Invalid user token. Please login again."
                    });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected. Please select a company first."
                    });
                }

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "Access forbidden for this trade type"
                    });
                }

                // Get current active fiscal year
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
                            error = "No fiscal year found for this company"
                        });
                    }
                }

                var stockAdjustmentData = await _stockAdjustmentService.GetNewStockAdjustmentDataAsync(
                    companyIdGuid,
                    fiscalYear.Id,
                    userIdGuid);

                if (stockAdjustmentData == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No fiscal year found in session or company."
                    });
                }

                return Ok(new
                {
                    success = true,
                    data = stockAdjustmentData
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetNewStockAdjustmentData");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching stock adjustment data",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }



        [HttpGet("stock-adjustments/next-number")]
        public async Task<IActionResult> GetNextStockAdjustmentBillNumber()
        {
            try
            {
                _logger.LogInformation("=== GetNextStockAdjustmentBillNumber Started ===");

                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new
                    {
                        success = false,
                        error = "Invalid user token. Please login again."
                    });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected. Please select a company first."
                    });
                }

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "Access forbidden for this trade type"
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
                        return BadRequest(new
                        {
                            success = false,
                            error = "No active fiscal year found for this company."
                        });
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var nextBillNumber = await _stockAdjustmentService.GetNextStockAdjustmentBillNumberAsync(companyIdGuid, fiscalYearIdGuid);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        nextStockAdjustmentBillNumber = nextBillNumber
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetNextStockAdjustmentBillNumber");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/stock-adjustments/current-number
        [HttpGet("stock-adjustments/current-number")]
        public async Task<IActionResult> GetCurrentStockAdjustmentBillNumber()
        {
            try
            {
                _logger.LogInformation("=== GetCurrentStockAdjustmentBillNumber Started ===");

                var companyId = User.FindFirst("currentCompany")?.Value;

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected. Please select a company first."
                    });
                }

                var fiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                if (fiscalYear == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Fiscal year not found"
                    });
                }

                var currentBillNumber = await _stockAdjustmentService.GetCurrentStockAdjustmentBillNumberAsync(companyIdGuid, fiscalYear.Id);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        currentStockAdjustmentBillNumber = currentBillNumber
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCurrentStockAdjustmentBillNumber");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error"
                });
            }
        }

        // POST: api/retailer/stock-adjustments
        [HttpPost("stock-adjustments")]
        public async Task<IActionResult> CreateStockAdjustment([FromBody] CreateStockAdjustmentDTO dto)
        {
            try
            {
                _logger.LogInformation("=== CreateStockAdjustment Started ===");

                // Get user claims
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
                        error = "Access forbidden for this trade type"
                    });
                }

                // Validate fiscal year
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

                // Validate required fields
                if (dto.Items == null || dto.Items.Count == 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "At least one item is required."
                    });
                }

                if (string.IsNullOrEmpty(dto.AdjustmentType) || (dto.AdjustmentType != "xcess" && dto.AdjustmentType != "short"))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Adjustment type must be either 'xcess' or 'short'."
                    });
                }

                // Check date range and demo period (implement your own validation logic)
                // This would be similar to checkFiscalYearDateRange and checkDemoPeriod middleware

                // Create stock adjustment
                var result = await _stockAdjustmentService.CreateStockAdjustmentAsync(
                    dto, userIdGuid, companyIdGuid, fiscalYearIdGuid);

                // Prepare response (matching Express.js structure)
                var response = new
                {
                    success = true,
                    data = new
                    {
                        adjustmentId = result.Id,
                        billNumber = result.BillNumber,
                        totalAmount = result.TotalAmount,
                        vatAmount = result.VatAmount,
                        discountAmount = result.DiscountAmount,
                        message = "Stock adjustment recorded successfully"
                    }
                };

                return StatusCode(201, response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in CreateStockAdjustment");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Stock validation error in CreateStockAdjustment");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in CreateStockAdjustment");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Error creating stock adjustment",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/stock-adjustments/register
        [HttpGet("stock-adjustments/register")]
        public async Task<IActionResult> GetStockAdjustmentsRegister([FromQuery] string? fromDate = null, [FromQuery] string? toDate = null)
        {
            try
            {
                _logger.LogInformation("=== GetStockAdjustmentsRegister Started ===");

                // Extract claims from JWT
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

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

                // Handle fiscal year - get from claims first, then fallback
                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    // If not in claims, get active fiscal year for the company
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

                // Get stock adjustments register data from service
                var registerData = await _stockAdjustmentService.GetStockAdjustmentsRegisterAsync(
                    companyIdGuid,
                    fiscalYearIdGuid,
                    fromDate,
                    toDate);

                // Check if user is admin or supervisor
                bool isAdminOrSupervisor = userRole == "Admin" || userRole == "Supervisor";

                var response = new
                {
                    success = true,
                    data = new
                    {
                        company = registerData.Company,
                        currentFiscalYear = registerData.CurrentFiscalYear,
                        stockAdjustments = registerData.StockAdjustments,
                        items = registerData.Items,
                        fromDate = registerData.FromDate,
                        toDate = registerData.ToDate,
                        currentCompanyName = registerData.CurrentCompanyName,
                        companyDateFormat = registerData.CompanyDateFormat,
                        nepaliDate = registerData.NepaliDate,
                        isAdminOrSupervisor = isAdminOrSupervisor
                    },
                    meta = new
                    {
                        title = "Stock Adjustments Register",
                        theme = registerData.UserPreferences?.Theme ?? "light"
                    }
                };

                _logger.LogInformation($"Successfully fetched stock adjustments register with {registerData.StockAdjustments.Count} adjustments");

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in GetStockAdjustmentsRegister");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetStockAdjustmentsRegister");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching stock adjustments register",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/stock-adjustments/register/entry-data
        [HttpGet("stock-adjustments/register/entry-data")]
        public async Task<IActionResult> GetStockAdjustmentsRegisterEntryData()
        {
            try
            {
                _logger.LogInformation("=== GetStockAdjustmentsRegisterEntryData Started ===");

                // Extract user and company info from JWT claims
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                // Validate required claims
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new
                    {
                        success = false,
                        error = "Invalid user token. Please login again."
                    });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected. Please select a company first."
                    });
                }

                // Check trade type
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "Access forbidden for this trade type. This is a Retailer-only feature."
                    });
                }

                // Get current active fiscal year
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
                            error = "No fiscal year found for this company"
                        });
                    }
                }

                // Get stock adjustments entry data from service
                var entryData = await _stockAdjustmentService.GetStockAdjustmentsRegisterEntryDataAsync(companyIdGuid, fiscalYear.Id, userIdGuid);

                var response = new
                {
                    success = true,
                    data = new
                    {
                        company = entryData.Company,
                        items = entryData.Items,
                        units = entryData.Units,
                        dates = entryData.Dates,
                        currentFiscalYear = entryData.CurrentFiscalYear,
                        userPreferences = entryData.UserPreferences,
                        permissions = entryData.Permissions,
                        currentCompanyName = entryData.CurrentCompanyName
                    },
                    meta = new
                    {
                        title = "Stock Adjustments Register",
                        theme = entryData.UserPreferences?.Theme ?? "light"
                    }
                };

                _logger.LogInformation($"Successfully fetched stock adjustments entry data for company {entryData.Company.Name}");

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetStockAdjustmentsRegisterEntryData");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/stock-adjustments/{id}/print
        [HttpGet("stock-adjustments/{id}/print")]
        public async Task<IActionResult> GetStockAdjustmentForPrint(Guid id)
        {
            try
            {
                _logger.LogInformation("=== GetStockAdjustmentForPrint Started for ID: {AdjustmentId} ===", id);

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
                        error = "Access restricted to retailer accounts"
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
                                error = "No fiscal year found for this company."
                            });
                        }
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;

                    _logger.LogInformation($"Using fiscal year: {fiscalYearIdGuid}");
                }

                // Get stock adjustment print data from service
                var printData = await _stockAdjustmentService.GetStockAdjustmentForPrintAsync(
                    id,
                    companyIdGuid,
                    userIdGuid,
                    fiscalYearIdGuid);

                if (printData == null || printData.Adjustment == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Stock adjustment not found"
                    });
                }

                var response = new
                {
                    success = true,
                    data = printData
                };

                _logger.LogInformation($"Successfully fetched stock adjustment print data for ID: {id}");

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in GetStockAdjustmentForPrint");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetStockAdjustmentForPrint for adjustment {AdjustmentId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching stock adjustment for printing",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

    }
}