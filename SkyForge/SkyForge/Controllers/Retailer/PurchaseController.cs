using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto.RetailerDto.PurchaseBillDto;
using SkyForge.Models.CompanyModel;
using SkyForge.Services.Retailer.PurchaseServices;
using System.Security.Claims;
using SkyForge.Models.Shared;
using SkyForge.Dto.RetailerDto;
using SkyForge.Models.Retailer.Purchase;

namespace SkyForge.Controllers.Retailer
{
    [ApiController]
    [Route("api/retailer")]
    [Authorize]
    public class PurchaseController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<PurchaseController> _logger;
        private readonly IPurchaseService _purchaseService;

        public PurchaseController(
            ApplicationDbContext context,
            ILogger<PurchaseController> logger,
            IPurchaseService purchaseService)
        {
            _context = context;
            _logger = logger;
            _purchaseService = purchaseService;
        }

        // GET: api/retailer/purchase/last-purchase-date
        [HttpGet("last-purchase-date")]
        public async Task<IActionResult> GetLastPurchaseDate()
        {
            try
            {
                _logger.LogInformation("=== GetLastPurchaseDate Started ===");

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
                IQueryable<PurchaseBill> query = _context.PurchaseBills
                    .Where(p => p.CompanyId == companyIdGuid && p.FiscalYearId == fiscalYearIdGuid);

                IOrderedQueryable<PurchaseBill> orderedQuery;

                if (isNepaliFormat)
                {
                    // For Nepali format, order by nepaliDate descending (this is the Nepali date field)
                    orderedQuery = query.OrderByDescending(p => p.nepaliDate)
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

                var lastPurchase = await orderedQuery
                    .Select(p => new { p.Date, p.nepaliDate, p.TransactionDate, p.transactionDateNepali, p.BillNumber })
                    .FirstOrDefaultAsync();

                if (lastPurchase == null)
                {
                    _logger.LogInformation("No purchase bills found");
                    return Ok(new
                    {
                        success = true,
                        data = new
                        {
                            date = (string)null,
                            nepaliDate = (string)null,
                            transactionDate = (string)null,
                            transactionDateNepali = (string)null,
                            billNumber = (string)null
                        }
                    });
                }

                // Format dates as strings in YYYY-MM-DD format
                string dateString = null;
                string nepaliDateString = null;
                string transactionDateString = null;
                string transactionDateNepaliString = null;

                if (lastPurchase.Date != null)
                    dateString = lastPurchase.Date.ToString("yyyy-MM-dd");

                if (lastPurchase.nepaliDate != null)
                    nepaliDateString = lastPurchase.nepaliDate.ToString("yyyy-MM-dd");

                if (lastPurchase.TransactionDate != null)
                    transactionDateString = lastPurchase.TransactionDate.ToString("yyyy-MM-dd");

                if (lastPurchase.transactionDateNepali != null)
                    transactionDateNepaliString = lastPurchase.transactionDateNepali.ToString("yyyy-MM-dd");

                _logger.LogInformation($"Last purchase date found: Date={dateString}, NepaliDate={nepaliDateString}, Bill={lastPurchase.BillNumber}, IsNepaliFormat={isNepaliFormat}");

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        date = dateString,
                        nepaliDate = nepaliDateString,
                        transactionDate = transactionDateString,
                        transactionDateNepali = transactionDateNepaliString,
                        billNumber = lastPurchase.BillNumber,
                        dateFormat = isNepaliFormat ? "nepali" : "english"
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting last purchase date");
                return StatusCode(500, new { success = false, error = "Internal Server Error" });
            }
        }
       
        // GET: api/retailer/purchase-register
        [HttpGet("purchase-register")]
        public async Task<IActionResult> GetPurchaseRegister([FromQuery] string? fromDate = null, [FromQuery] string? toDate = null)
        {
            try
            {
                _logger.LogInformation("=== GetPurchaseRegister Started ===");

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

                // Get purchase register data from service
                var registerData = await _purchaseService.GetPurchaseRegisterAsync(
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
                        bills = registerData.Bills,
                        fromDate = registerData.FromDate,
                        toDate = registerData.ToDate,
                        currentCompanyName = registerData.CurrentCompanyName,
                        companyDateFormat = registerData.CompanyDateFormat,
                        vatEnabled = registerData.VatEnabled,
                        isVatExempt = registerData.IsVatExempt,
                        isAdminOrSupervisor = isAdminOrSupervisor
                    }
                };

                _logger.LogInformation($"Successfully fetched purchase register with {registerData.Bills.Count} bills");

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in GetPurchaseRegister");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetPurchaseRegister");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching purchase register",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/purchase/entry-data
        [HttpGet("purchase/entry-data")]
        public async Task<IActionResult> GetPurchaseEntryData()
        {
            try
            {
                _logger.LogInformation("=== GetPurchaseEntryData Started ===");

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

                // Get purchase entry data from service
                var purchaseData = await _purchaseService.GetPurchaseEntryDataAsync(companyIdGuid, fiscalYear.Id, userIdGuid);

                var response = new
                {
                    success = true,
                    data = new
                    {
                        company = purchaseData.Company,
                        accounts = purchaseData.Accounts,
                        dates = purchaseData.Dates,
                        currentFiscalYear = purchaseData.CurrentFiscalYear,
                        nextPurchaseBillNumber = purchaseData.NextPurchaseBillNumber,
                        userPreferences = purchaseData.UserPreferences,
                        permissions = purchaseData.Permissions,
                        currentCompanyName = purchaseData.CurrentCompanyName
                    }
                };

                _logger.LogInformation($"Successfully fetched purchase entry data for company {purchaseData.Company.Name}");

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetPurchaseEntryData");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/purchase/next-number
        [HttpGet("purchase/next-number")]
        public async Task<IActionResult> GetNextPurchaseBillNumber()
        {
            try
            {
                _logger.LogInformation("=== GetNextPurchaseBillNumber Started ===");

                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
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

                var nextBillNumber = await _purchaseService.GetNextBillNumberAsync(companyIdGuid, fiscalYear.Id);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        nextPurchaseBillNumber = nextBillNumber
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetNextPurchaseBillNumber");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/purchase/current-number
        [HttpGet("purchase/current-number")]
        public async Task<IActionResult> GetCurrentPurchaseBillNumber()
        {
            try
            {
                _logger.LogInformation("=== GetCurrentPurchaseBillNumber Started ===");

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

                var currentBillNumber = await _purchaseService.GetCurrentBillNumberAsync(companyIdGuid, fiscalYear.Id);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        currentPurchaseBillNumber = currentBillNumber
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCurrentPurchaseBillNumber");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error"
                });
            }
        }

        [HttpGet("purchase/check-invoice")]
        public async Task<IActionResult> CheckDuplicateInvoice([FromQuery] string partyBillNumber)
        {
            try
            {
                _logger.LogInformation("=== CheckDuplicateInvoice Started ===");

                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;

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

                if (string.IsNullOrWhiteSpace(partyBillNumber))
                {
                    return Ok(new
                    {
                        exists = false,
                        partyName = "",
                        date = (DateTime?)null,
                        dateString = ""
                    });
                }

                var exists = await _purchaseService.CheckDuplicateInvoiceAsync(partyBillNumber, companyIdGuid);

                if (exists)
                {
                    // Get details of the existing bill
                    var existingBill = await _context.PurchaseBills
                        .Include(pb => pb.Account)
                        .FirstOrDefaultAsync(pb => pb.CompanyId == companyIdGuid &&
                                                  pb.PartyBillNumber == partyBillNumber.Trim());

                    // Get company to determine date format
                    var company = await _context.Companies
                        .Where(c => c.Id == companyIdGuid)
                        .Select(c => new { c.DateFormat })
                        .FirstOrDefaultAsync();

                    bool isNepaliFormat = company?.DateFormat.ToString()?.ToLower() == "nepali";

                    // Format date based on company preference
                    string formattedDate = "";
                    if (existingBill?.Date != null)
                    {
                        if (isNepaliFormat && existingBill.nepaliDate != null)
                        {
                            // Use Nepali date if available and format is Nepali
                            formattedDate = existingBill.nepaliDate.ToString("yyyy-MM-dd");
                        }
                        else
                        {
                            // Use English date
                            formattedDate = existingBill.Date.ToString("yyyy-MM-dd");
                        }
                    }

                    return Ok(new
                    {
                        exists = true,
                        partyName = existingBill?.Account?.Name ?? "another party",
                        date = existingBill?.Date, // Keep the original date object for compatibility
                        dateString = formattedDate, // Add formatted date string for display
                        isNepaliFormat = isNepaliFormat // Let frontend know which format to use
                    });
                }

                return Ok(new
                {
                    exists = false,
                    partyName = "",
                    date = (DateTime?)null,
                    dateString = ""
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in CheckDuplicateInvoice");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Error checking invoice number"
                });
            }
        }

        // GET: api/retailer/purchase
        [HttpGet("purchase")]
        public async Task<IActionResult> GetPurchaseBills([FromQuery] DateTime? fromDate = null, [FromQuery] DateTime? toDate = null)
        {
            try
            {
                _logger.LogInformation("=== GetPurchaseBills Started ===");

                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
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
                        error = "Access restricted to retailer accounts"
                    });
                }

                var purchaseBills = await _purchaseService.GetPurchaseBillsAsync(companyIdGuid, fromDate, toDate);

                return Ok(new
                {
                    success = true,
                    data = purchaseBills
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetPurchaseBills");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching purchase bills",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        [HttpPost("purchase")]
        public async Task<IActionResult> CreatePurchaseBill([FromBody] CreatePurchaseBillDTO request)
        {
            try
            {
                _logger.LogInformation("=== CreatePurchaseBill Started ===");

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

                // Handle fiscal year - get from claims first, then fallback to active fiscal year
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

                    _logger.LogInformation($"Using active fiscal year: {fiscalYearIdGuid}");
                }

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "Access forbidden for this trade type"
                    });
                }

                // Validate request
                if (!ModelState.IsValid)
                {
                    var errors = ModelState.Values
                        .SelectMany(v => v.Errors)
                        .Select(e => e.ErrorMessage)
                        .ToList();

                    return BadRequest(new
                    {
                        success = false,
                        error = "Validation failed",
                        details = errors
                    });
                }

                // Create purchase bill using service - pass fiscalYearIdGuid
                var purchaseBill = await _purchaseService.CreatePurchaseBillAsync(
                    request,
                    userIdGuid,
                    companyIdGuid,
                    fiscalYearIdGuid
                );

                // Get response DTO
                var responseDto = await _purchaseService.GetPurchaseBillAsync(purchaseBill.Id, companyIdGuid);

                return Ok(new
                {
                    success = true,
                    message = "Purchase bill created successfully",
                    data = responseDto
                });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in CreatePurchaseBill");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in CreatePurchaseBill");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while creating purchase bill",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/purchase/last-purchase-data/{itemId}
        [HttpGet("purchase/last-purchase-data/{itemId}")]
        public async Task<IActionResult> GetLastPurchaseData(Guid itemId)
        {
            try
            {
                _logger.LogInformation("=== GetLastPurchaseData Started for Item: {ItemId} ===", itemId);

                var companyId = User.FindFirst("currentCompany")?.Value;

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected. Please select a company first."
                    });
                }

                var lastPurchaseData = await _purchaseService.GetLastPurchaseDataAsync(itemId, companyIdGuid);

                return Ok(new
                {
                    success = true,
                    data = lastPurchaseData
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetLastPurchaseData for item {ItemId}", itemId);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }


        // GET: api/retailer/purchase/finds
        [HttpGet("purchase/finds")]
        public async Task<IActionResult> GetPurchaseFinds()
        {
            try
            {
                _logger.LogInformation("=== GetPurchaseFinds Started ===");

                // Extract claims from JWT token
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value; // CHANGED: Use "fiscalYearId" not "currentFiscalYear"
                var tradeType = User.FindFirst("tradeType")?.Value;
                var companyName = User.FindFirst("currentCompanyName")?.Value;
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
                var isAdmin = User.FindFirst("isAdmin")?.Value;

                // Validate trade type
                if (string.IsNullOrEmpty(tradeType) || tradeType.ToLower() != "retailer")
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Invalid trade type"
                    });
                }

                // Validate user ID
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new
                    {
                        success = false,
                        error = "Invalid user token. Please login again."
                    });
                }

                // Validate company ID
                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected. Please select a company first."
                    });
                }

                // Handle fiscal year - get from claims first, then fallback to active fiscal year
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

                // Get purchase finds data from service
                var result = await _purchaseService.GetPurchaseFindsAsync(
                    companyIdGuid,
                    fiscalYearIdGuid,
                    userIdGuid);

                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetPurchaseFinds");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error"
                });
            }
        }

        // Controllers/Retailer/PurchaseController.cs
        [HttpGet("purchase/find-party")]
        public async Task<IActionResult> GetPurchasePartyInfo([FromQuery] string billNumber)
        {
            try
            {
                _logger.LogInformation("=== GetPurchasePartyInfo Started ===");

                // Validate bill number
                if (string.IsNullOrWhiteSpace(billNumber))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Voucher number is required"
                    });
                }

                // Extract claims from JWT token
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeType = User.FindFirst("tradeType")?.Value;

                // Validate trade type
                if (string.IsNullOrEmpty(tradeType) || tradeType.ToLower() != "retailer")
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Invalid trade type"
                    });
                }

                // Validate user ID
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new
                    {
                        success = false,
                        error = "Invalid user token. Please login again."
                    });
                }

                // Validate company ID
                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected. Please select a company first."
                    });
                }

                // Handle fiscal year
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

                // Get purchase party info from service
                var result = await _purchaseService.GetPurchasePartyInfoAsync(
                    billNumber,
                    companyIdGuid,
                    fiscalYearIdGuid);

                if (result == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Voucher not found"
                    });
                }

                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetPurchasePartyInfo");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching voucher party info"
                });
            }
        }

        // Controllers/Retailer/PurchaseController.cs
        [HttpPut("purchase/change-party/{billNumber}")]
        public async Task<IActionResult> ChangeParty([FromRoute] string billNumber, [FromBody] ChangePartyRequestDto request)
        {
            try
            {
                _logger.LogInformation($"=== ChangeParty Started for bill: {billNumber} ===");

                // Validate request
                if (string.IsNullOrWhiteSpace(billNumber))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Bill number is required"
                    });
                }

                if (request == null || request.AccountId == Guid.Empty)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Account ID is required"
                    });
                }

                // Extract claims from JWT token
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeType = User.FindFirst("tradeType")?.Value;

                // Validate trade type
                if (string.IsNullOrEmpty(tradeType) || tradeType.ToLower() != "retailer")
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Invalid trade type"
                    });
                }

                // Validate user ID
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new
                    {
                        success = false,
                        error = "Invalid user token. Please login again."
                    });
                }

                // Validate company ID
                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected. Please select a company first."
                    });
                }

                // Handle fiscal year
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

                // Call service to change party
                var result = await _purchaseService.ChangePartyAsync(
                    billNumber,
                    request.AccountId,
                    companyIdGuid,
                    fiscalYearIdGuid,
                    userIdGuid);

                return Ok(new
                {
                    success = true,
                    message = result.Message,
                    data = new
                    {
                        billNumber = result.BillNumber,
                        accountId = result.AccountId,
                        accountName = result.AccountName
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in ChangeParty for bill: {billNumber}");

                // Handle specific exceptions
                if (ex.Message.Contains("not found"))
                {
                    return NotFound(new
                    {
                        success = false,
                        error = ex.Message
                    });
                }

                if (ex.Message.Contains("same as current"))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = ex.Message
                    });
                }

                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while changing party"
                });
            }
        }

        [HttpGet("purchase/get-id-by-number")]
        public async Task<IActionResult> GetPurchaseBillIdByNumber([FromQuery] string billNumber)
        {
            try
            {
                _logger.LogInformation("=== GetPurchaseBillIdByNumber Started for Bill Number: {BillNumber} ===", billNumber);

                // Validate bill number
                if (string.IsNullOrWhiteSpace(billNumber))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Bill number is required"
                    });
                }

                // Extract claims from JWT
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

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
                    // If not in claims, get active fiscal year for the company
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                    if (activeFiscalYear == null)
                    {
                        return BadRequest(new
                        {
                            success = false,
                            error = "No fiscal year found for this company."
                        });
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                // Get bill ID from service
                var result = await _purchaseService.GetPurchaseBillIdByNumberAsync(
                    billNumber,
                    companyIdGuid,
                    fiscalYearIdGuid);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        id = result.Id,
                        billNumber = result.BillNumber
                    }
                });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in GetPurchaseBillIdByNumber");
                return NotFound(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetPurchaseBillIdByNumber for bill {BillNumber}", billNumber);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching bill ID"
                });
            }
        }

        // GET: api/retailer/purchase/edit/{id}
        [HttpGet("purchase/edit/{id}")]
        public async Task<IActionResult> GetPurchaseEditData(Guid id)
        {
            try
            {
                _logger.LogInformation("=== GetPurchaseEditData Started for Bill ID: {BillId} ===", id);

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

                // Get purchase edit data from service
                var editData = await _purchaseService.GetPurchaseEditDataAsync(
                    id,
                    companyIdGuid,
                    fiscalYearIdGuid,
                    userIdGuid);

                if (editData == null || editData.PurchaseInvoice == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Purchase invoice not found or does not belong to the selected company"
                    });
                }

                var response = new
                {
                    success = true,
                    data = new
                    {
                        company = new
                        {
                            _id = editData.Company.Id,
                            vatEnabled = editData.Company.VatEnabled,
                            dateFormat = editData.Company.DateFormat,
                            name = editData.Company.Name,
                            fiscalYear = editData.Company.FiscalYear
                        },
                        purchaseInvoice = editData.PurchaseInvoice,
                        items = editData.Items,
                        accounts = editData.Accounts,
                        user = editData.User
                    }
                };

                _logger.LogInformation($"Successfully fetched purchase edit data for Bill ID: {id}");

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in GetPurchaseEditData");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetPurchaseEditData for bill {BillId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching purchase edit data",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // PUT: api/retailer/purchase/edit/{id}
        [HttpPut("purchase/edit/{id}")]
        public async Task<IActionResult> UpdatePurchaseBill(Guid id, [FromBody] UpdatePurchaseBillDTO request)
        {
            try
            {
                _logger.LogInformation("=== UpdatePurchaseBill Started for ID: {BillId} ===", id);

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

                // Validate request
                if (!ModelState.IsValid)
                {
                    var errors = ModelState.Values
                        .SelectMany(v => v.Errors)
                        .Select(e => e.ErrorMessage)
                        .ToList();

                    return BadRequest(new
                    {
                        success = false,
                        error = "Validation failed",
                        details = errors
                    });
                }

                // Validate required fields
                if (request.AccountId == Guid.Empty)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Account ID is required"
                    });
                }

                if (request.Items == null || !request.Items.Any())
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "At least one item is required"
                    });
                }

                if (string.IsNullOrEmpty(request.PaymentMode))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Payment mode is required"
                    });
                }

                // Validate dates based on company format
                var company = await _context.Companies.FindAsync(companyIdGuid);
                if (company != null)
                {
                    bool isNepaliFormat = company.DateFormat == DateFormatEnum.Nepali;

                    if (isNepaliFormat)
                    {
                        if (request.TransactionDateNepali == default)
                        {
                            return BadRequest(new
                            {
                                success = false,
                                error = "Invalid transaction date"
                            });
                        }
                        if (request.NepaliDate == default)
                        {
                            return BadRequest(new
                            {
                                success = false,
                                error = "Invalid invoice date"
                            });
                        }
                    }
                    else
                    {
                        if (request.TransactionDate == default)
                        {
                            return BadRequest(new
                            {
                                success = false,
                                error = "Invalid transaction date"
                            });
                        }
                        if (request.Date == default)
                        {
                            return BadRequest(new
                            {
                                success = false,
                                error = "Invalid invoice date"
                            });
                        }
                    }
                }

                // Update purchase bill using service - PASS ALL REQUIRED PARAMETERS
                var updatedBill = await _purchaseService.UpdatePurchaseBillAsync(
                    id,
                    request,
                    companyIdGuid,
                    fiscalYearIdGuid,  // Add fiscalYearId
                    userIdGuid         // Add userId
                );

                // Get response DTO
                var responseDto = await _purchaseService.GetPurchaseBillAsync(updatedBill.Id, companyIdGuid);

                _logger.LogInformation($"Successfully updated purchase bill: {id}");

                return Ok(new
                {
                    success = true,
                    message = "Purchase updated successfully",
                    data = new
                    {
                        billId = updatedBill.Id,
                        billNumber = updatedBill.BillNumber,
                        // print = request.Print
                    }
                });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in UpdatePurchaseBill");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in UpdatePurchaseBill for bill {BillId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while updating purchase bill",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/purchase/{id}/print
        [HttpGet("purchase/{id}/print")]
        public async Task<IActionResult> GetPurchaseBillForPrint(Guid id)
        {
            try
            {
                _logger.LogInformation("=== GetPurchaseBillForPrint Started for ID: {BillId} ===", id);

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

                // Get purchase bill print data from service
                var printData = await _purchaseService.GetPurchaseBillForPrintAsync(
                    id,
                    companyIdGuid,
                    userIdGuid,
                    fiscalYearIdGuid);

                if (printData == null || printData.Bill == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Purchase bill not found"
                    });
                }

                var response = new
                {
                    success = true,
                    data = printData
                };

                _logger.LogInformation($"Successfully fetched purchase bill print data for ID: {id}");

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in GetPurchaseBillForPrint");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetPurchaseBillForPrint for bill {BillId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching purchase bill for printing",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // DELETE: api/retailer/purchase/{id}
        [HttpDelete("purchase/{id}")]
        public async Task<IActionResult> DeletePurchaseBill(Guid id)
        {
            try
            {
                _logger.LogInformation("=== DeletePurchaseBill Started ===");

                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
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

                var result = await _purchaseService.DeletePurchaseBillAsync(id, companyIdGuid);

                if (!result)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Purchase bill not found"
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = "Purchase bill deleted successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in DeletePurchaseBill");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while deleting purchase bill",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }


        // GET: api/retailer/purchase-vat-report
        [HttpGet("purchase-vat-report")]
        public async Task<IActionResult> GetPurchaseVatReport([FromQuery] string? fromDate = null, [FromQuery] string? toDate = null)
        {
            try
            {
                _logger.LogInformation("=== GetPurchaseVatReport Started ===");

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

                // Get company details
                var company = await _context.Companies
                    .Where(c => c.Id == companyIdGuid)
                    .Select(c => new CompanyInfoDTO
                    {
                        Id = c.Id,
                        Name = c.Name,
                        Address = c.Address,
                        City = c.City,
                        Phone = c.Phone,
                        Pan = c.Pan,
                        RenewalDate = c.RenewalDate,
                        DateFormat = c.DateFormat.ToString(),
                        VatEnabled = c.VatEnabled,
                    })
                    .FirstOrDefaultAsync();

                if (company == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Company not found"
                    });
                }

                // Get fiscal year
                var currentFiscalYear = await _context.FiscalYears
                    .Where(f => f.Id == fiscalYearIdGuid && f.CompanyId == companyIdGuid)
                    .Select(f => new FiscalYearDTO
                    {
                        Id = f.Id,
                        Name = f.Name,
                        StartDate = f.StartDate,
                        EndDate = f.EndDate,
                        StartDateNepali = f.StartDateNepali,
                        EndDateNepali = f.EndDateNepali,
                        IsActive = f.IsActive,
                    })
                    .FirstOrDefaultAsync();

                string companyDateFormat = company.DateFormat?.ToLower() ?? "english";
                string nepaliDate = DateTime.UtcNow.ToString("yyyy-MM-dd");

                // Get user info
                var user = await _context.Users
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Id == userIdGuid);

                bool isAdmin = user?.IsAdmin ?? false;
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

                // If no date range provided, return empty report
                if (string.IsNullOrEmpty(fromDate) || string.IsNullOrEmpty(toDate))
                {
                    var emptyResponse = new PurchaseVatReportDTO
                    {
                        Company = company,
                        CurrentFiscalYear = currentFiscalYear,
                        PurchaseVatReport = new List<PurchaseVatEntryDTO>(),
                        CompanyDateFormat = companyDateFormat,
                        NepaliDate = nepaliDate,
                        CurrentCompany = company,
                        FromDate = fromDate ?? "",
                        ToDate = toDate ?? "",
                        CurrentCompanyName = company.Name,
                        User = new UserInfoDTO
                        {
                            Id = user?.Id ?? userIdGuid,
                            Name = user?.Name ?? "",
                            Email = user?.Email ?? "",
                            IsAdmin = isAdmin,
                            Role = userRoleName,
                            Preferences = new UserPreferencesDTO
                            {
                                Theme = user?.Preferences?.Theme.ToString() ?? "light"
                            }
                        },
                        Theme = user?.Preferences?.Theme.ToString() ?? "light",
                        IsAdminOrSupervisor = isAdminOrSupervisor
                    };

                    return Ok(new { success = true, data = emptyResponse });
                }

                // Get purchase VAT report from service
                var reportData = await _purchaseService.GetPurchaseVatReportAsync(
                    companyIdGuid,
                    fiscalYearIdGuid,
                    fromDate,
                    toDate);

                // Add user info to response
                reportData.User = new UserInfoDTO
                {
                    Id = user?.Id ?? userIdGuid,
                    Name = user?.Name ?? "",
                    Email = user?.Email ?? "",
                    IsAdmin = isAdmin,
                    Role = userRoleName,
                    Preferences = new UserPreferencesDTO
                    {
                        Theme = user?.Preferences?.Theme.ToString() ?? "light"
                    }
                };
                reportData.Theme = user?.Preferences?.Theme.ToString() ?? "light";
                reportData.IsAdminOrSupervisor = isAdminOrSupervisor;

                _logger.LogInformation($"Successfully fetched purchase VAT report with {reportData.PurchaseVatReport.Count} entries");

                return Ok(new { success = true, data = reportData });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetPurchaseVatReport");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching purchase VAT report",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }
    }
}