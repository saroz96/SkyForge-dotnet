using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkyForge.Data;
using SkyForge.Services.Retailer.DebitNoteServices;
using SkyForge.Models.CompanyModel;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using SkyForge.Models.Shared;
using SkyForge.Dto.RetailerDto.DebitNoteDto;
using SkyForge.Models.Retailer.DebitNoteModel;
using SkyForge.Models.Retailer.TransactionModel;

namespace SkyForge.Controllers.Retailer
{
    [ApiController]
    [Route("api/retailer")]
    [Authorize]
    public class DebitNoteController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<DebitNoteController> _logger;
        private readonly IDebitNoteService _debitNoteService;

        public DebitNoteController(
            ApplicationDbContext context,
            ILogger<DebitNoteController> logger,
            IDebitNoteService debitNoteService)
        {
            _context = context;
            _logger = logger;
            _debitNoteService = debitNoteService;
        }

        // GET: api/retailer/last-debit-note-date
        [HttpGet("last-debit-note-date")]
        public async Task<IActionResult> GetLastDebitNoteDate()
        {
            try
            {
                _logger.LogInformation("=== GetLastDebitNoteDate Started ===");

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
                IQueryable<DebitNote> query = _context.DebitNotes
                    .Where(p => p.CompanyId == companyIdGuid && p.FiscalYearId == fiscalYearIdGuid);

                IOrderedQueryable<DebitNote> orderedQuery;

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

                var lastDebitNote = await orderedQuery
                    .Select(p => new { p.Date, p.NepaliDate, p.BillNumber })
                    .FirstOrDefaultAsync();

                if (lastDebitNote == null)
                {
                    _logger.LogInformation("No receipt bills found");
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

                if (lastDebitNote.Date != null)
                    dateString = lastDebitNote.Date.ToString("yyyy-MM-dd");

                if (lastDebitNote.NepaliDate != null)
                    nepaliDateString = lastDebitNote.NepaliDate.ToString("yyyy-MM-dd");

                _logger.LogInformation($"Last debit note date found: Date={dateString}, NepaliDate={nepaliDateString}, Bill={lastDebitNote.BillNumber}, IsNepaliFormat={isNepaliFormat}");

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        date = dateString,
                        nepaliDate = nepaliDateString,
                        billNumber = lastDebitNote.BillNumber,
                        dateFormat = isNepaliFormat ? "nepali" : "english"
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting last journal date");
                return StatusCode(500, new { success = false, error = "Internal Server Error" });
            }
        }

        // GET: api/retailer/debit-note
        [HttpGet("debit-note")]
        public async Task<IActionResult> GetDebitNoteFormData()
        {
            try
            {
                _logger.LogInformation("=== GetDebitNoteFormData Started ===");

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

                // Get debit note form data from service
                var formData = await _debitNoteService.GetDebitNoteFormDataAsync(
                    companyIdGuid,
                    fiscalYearIdGuid,
                    userIdGuid);

                if (formData == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Failed to load debit note form data"
                    });
                }

                return Ok(new
                {
                    success = true,
                    data = formData
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetDebitNoteFormData");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching debit note form data",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        [HttpGet("debit-note/next-number")]
        public async Task<IActionResult> GetNextDebitNoteBillNumber()
        {
            try
            {
                _logger.LogInformation("=== GetNextDebitNoteBillNumber Started ===");

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

                var nextBillNumber = await _debitNoteService.GetNextBillNumberAsync(companyIdGuid, fiscalYearIdGuid);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        nextDebitNoteBillNumber = nextBillNumber
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetNextDebitNoteBillNumber");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        [HttpGet("debit-note/current-number")]
        public async Task<IActionResult> GetCurrentDebitNoteBillNumber()
        {
            try
            {
                _logger.LogInformation("=== GetCurrentDebitNoteBillNumber Started ===");

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

                var currentBillNumber = await _debitNoteService.GetCurrentBillNumberAsync(companyIdGuid, fiscalYear.Id);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        currentDebitNoteBillNumber = currentBillNumber
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCurrentDebitNoteBillNumber");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error"
                });
            }
        }

        [HttpPost("debit-note")]
        public async Task<IActionResult> CreateDebitNote([FromBody] CreateDebitNoteDTO dto)
        {
            try
            {
                _logger.LogInformation("=== CreateDebitNote Started ===");

                // Extract claims
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                // Validations
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                    return Unauthorized(new { success = false, error = "Invalid user token" });

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                    return BadRequest(new { success = false, error = "No company selected" });

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                    return StatusCode(403, new { success = false, error = "Access forbidden" });

                // Handle fiscal year
                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                    if (activeFiscalYear == null)
                        return BadRequest(new { success = false, error = "No active fiscal year found" });

                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                // Validate entries
                if (dto.Entries == null || dto.Entries.Count < 2)
                {
                    return BadRequest(new { success = false, error = "At least 2 entries required (one debit and one credit)" });
                }

                // Validate total debit equals total credit
                decimal totalDebit = dto.Entries.Where(e => e.EntryType == "Debit").Sum(e => e.Amount);
                decimal totalCredit = dto.Entries.Where(e => e.EntryType == "Credit").Sum(e => e.Amount);

                if (totalDebit != totalCredit)
                {
                    return BadRequest(new { success = false, error = $"Total Debit ({totalDebit}) must equal Total Credit ({totalCredit})" });
                }

                // Create debit note
                var debitNote = await _debitNoteService.CreateDebitNoteAsync(
                    dto,
                    userIdGuid,
                    companyIdGuid,
                    fiscalYearIdGuid);

                // Prepare response
                var responseData = new
                {
                    success = true,
                    message = "Debit note saved successfully!",
                    data = new DebitNoteResponseDTO
                    {
                        DebitNote = new DebitNoteInfoDTO
                        {
                            Id = debitNote.Id,
                            BillNumber = debitNote.BillNumber,
                            Date = debitNote.Date,
                            NepaliDate = debitNote.NepaliDate,
                            TotalAmount = debitNote.TotalAmount,
                            Description = debitNote.Description,
                            Status = debitNote.Status.ToString()
                        },
                        PrintUrl = $"/api/retailer/debit-note/{debitNote.Id}/print"
                    }
                };

                if (dto.Print == true)
                {
                    responseData.data.RedirectUrl = $"/retailer/debit-note/{debitNote.Id}/print";
                }

                return Ok(responseData);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in CreateDebitNote");
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in CreateDebitNote");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while creating debit note",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/debit-note/finds
        [HttpGet("debit-note/finds")]
        public async Task<IActionResult> GetDebitNoteFinds()
        {
            try
            {
                _logger.LogInformation("=== GetDebitNoteFinds Started ===");

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

                var result = await _debitNoteService.GetDebitNoteFindsAsync(
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
                _logger.LogError(ex, "Error in GetDebitNoteFinds");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error"
                });
            }
        }

        [HttpGet("debit-note/get-id-by-number")]
        public async Task<IActionResult> GetDebitNoteBillIdByNumber([FromQuery] string billNumber)
        {
            try
            {
                _logger.LogInformation("=== GetDebitNoteBillIdByNumber Started for Bill Number: {BillNumber} ===", billNumber);

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
                var result = await _debitNoteService.GetDebitNoteBillIdByNumberAsync(
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
                _logger.LogWarning(ex, "Validation error in GetDebitNoteBillIdByNumber");
                return NotFound(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetDebitNoteBillIdByNumber for bill {BillNumber}", billNumber);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching bill ID"
                });
            }
        }

        // GET: api/retailer/debit-note/edit/{id}
        [HttpGet("debit-note/edit/{id}")]
        public async Task<IActionResult> GetDebitNoteEditData(Guid id)
        {
            try
            {
                _logger.LogInformation("=== GetDebitNoteEditData Started for Debit Note ID: {DebitNoteId} ===", id);

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

                // Get debit note edit data from service
                var editData = await _debitNoteService.GetDebitNoteEditDataAsync(
                    id,
                    companyIdGuid,
                    fiscalYearIdGuid,
                    userIdGuid);

                if (editData == null || editData.DebitNote == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Debit note not found or does not belong to the selected company"
                    });
                }

                var response = new
                {
                    success = true,
                    data = new
                    {
                        company = new
                        {
                            id = editData.Company.Id,
                            name = editData.Company.Name,
                            address = editData.Company.Address,
                            city = editData.Company.City,
                            phone = editData.Company.Phone,
                            pan = editData.Company.Pan,
                            renewalDate = editData.Company.RenewalDate,
                            dateFormat = editData.Company.DateFormat,
                            vatEnabled = editData.Company.VatEnabled
                        },
                        debitNote = editData.DebitNote,
                        entries = editData.Entries,
                        accounts = editData.Accounts,
                        currentFiscalYear = editData.CurrentFiscalYear,
                        nepaliDate = editData.NepaliDate,
                        companyDateFormat = editData.CompanyDateFormat,
                        currentCompanyName = editData.CurrentCompanyName,
                        date = editData.CurrentDate,
                        user = editData.User,
                        isAdminOrSupervisor = editData.IsAdminOrSupervisor
                    }
                };

                _logger.LogInformation($"Successfully fetched debit note edit data for Debit Note ID: {id}");

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in GetDebitNoteEditData");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetDebitNoteEditData for debit note {DebitNoteId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching debit note edit data",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // PUT: api/retailer/debit-note/edit/{id}
        [HttpPut("debit-note/edit/{id}")]
        public async Task<IActionResult> UpdateDebitNote(Guid id, [FromBody] UpdateDebitNoteDTO request)
        {
            try
            {
                _logger.LogInformation("=== UpdateDebitNote Started for ID: {DebitNoteId} ===", id);

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

                // Handle fiscal year
                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                    if (activeFiscalYear == null)
                    {
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

                // Validate entries
                if (request.Entries == null || request.Entries.Count < 2)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "At least 2 entries required (one debit and one credit)"
                    });
                }

                // Validate total debit equals total credit
                decimal totalDebit = request.Entries.Where(e => e.EntryType == "Debit").Sum(e => e.Amount);
                decimal totalCredit = request.Entries.Where(e => e.EntryType == "Credit").Sum(e => e.Amount);

                if (totalDebit != totalCredit)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = $"Total Debit ({totalDebit}) must equal Total Credit ({totalCredit})"
                    });
                }

                // Validate dates based on company format
                var company = await _context.Companies.FindAsync(companyIdGuid);
                if (company != null)
                {
                    bool isNepaliFormat = company.DateFormat == DateFormatEnum.Nepali;

                    if (isNepaliFormat)
                    {
                        if (request.NepaliDate == default)
                        {
                            return BadRequest(new
                            {
                                success = false,
                                error = "Invalid Nepali date"
                            });
                        }
                    }
                    else
                    {
                        if (request.Date == default)
                        {
                            return BadRequest(new
                            {
                                success = false,
                                error = "Invalid date"
                            });
                        }
                    }
                }

                // Update debit note using service
                var updatedDebitNote = await _debitNoteService.UpdateDebitNoteAsync(
                    id,
                    request,
                    companyIdGuid,
                    fiscalYearIdGuid,
                    userIdGuid
                );

                _logger.LogInformation($"Successfully updated debit note: {id}");

                // Prepare response
                var response = new
                {
                    success = true,
                    message = "Debit note updated successfully",
                    data = new
                    {
                        debitNote = new
                        {
                            id = updatedDebitNote.Id,
                            billNumber = updatedDebitNote.BillNumber,
                            date = updatedDebitNote.Date,
                            totalAmount = updatedDebitNote.TotalAmount,
                            description = updatedDebitNote.Description,
                            entryCount = updatedDebitNote.DebitNoteEntries?.Count ?? 0
                        },
                        printUrl = $"/api/retailer/debit-note/{updatedDebitNote.Id}/print"
                    }
                };

                // If print was requested, add redirect URL
                if (request.Print == true)
                {
                    return Ok(new
                    {
                        success = true,
                        message = "Debit note updated successfully",
                        data = response.data,
                        redirectUrl = $"/api/retailer/debit-note/{updatedDebitNote.Id}/print"
                    });
                }

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in UpdateDebitNote");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in UpdateDebitNote for debit note {DebitNoteId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while updating debit note",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // POST: api/retailer/debit-notes/cancel/{billNumber}
        [HttpPost("debit-notes/cancel/{billNumber}")]
        public async Task<IActionResult> CancelDebitNote(string billNumber)
        {
            try
            {
                _logger.LogInformation("=== CancelDebitNote Started for Bill Number: {BillNumber} ===", billNumber);

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

                // Validate bill number
                if (string.IsNullOrWhiteSpace(billNumber))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Bill number is required"
                    });
                }

                // Use execution strategy for transaction handling
                var executionStrategy = _context.Database.CreateExecutionStrategy();

                var result = await executionStrategy.ExecuteAsync(async () =>
                {
                    using var transaction = await _context.Database.BeginTransactionAsync();

                    try
                    {
                        _logger.LogInformation("Starting transaction to cancel debit note: {BillNumber}", billNumber);

                        // Find the debit note by bill number and company
                        var debitNote = await _context.DebitNotes
                            .FirstOrDefaultAsync(d => d.BillNumber == billNumber &&
                                                      d.CompanyId == companyIdGuid &&
                                                      d.FiscalYearId == fiscalYearIdGuid);

                        if (debitNote == null)
                        {
                            throw new ArgumentException($"Debit note with bill number {billNumber} not found");
                        }

                        // Check if already canceled
                        if (debitNote.Status == DebitNoteStatus.Canceled)
                        {
                            throw new ArgumentException($"Debit note {billNumber} is already canceled");
                        }

                        // Update debit note status to Canceled
                        debitNote.Status = DebitNoteStatus.Canceled;
                        debitNote.IsActive = false;
                        debitNote.UpdatedAt = DateTime.UtcNow;

                        _context.DebitNotes.Update(debitNote);
                        _logger.LogInformation("Updated debit note status to Canceled for {BillNumber}", billNumber);

                        // Update related transactions (type 'DrNt' for debit note)
                        var transactionsUpdated = await _context.Transactions
                            .Where(t => t.BillNumber == billNumber &&
                                       t.Type == TransactionType.DrNt &&
                                       t.CompanyId == companyIdGuid)
                            .ExecuteUpdateAsync(setters => setters
                                .SetProperty(t => t.Status, TransactionStatus.Canceled)
                                .SetProperty(t => t.IsActive, false));

                        _logger.LogInformation("Updated {Count} related transactions for {BillNumber}", transactionsUpdated, billNumber);

                        // Also update debit note entries to mark them as inactive (optional - based on your business logic)
                        var debitNoteEntriesUpdated = await _context.DebitNoteEntries
                            .Where(dne => dne.DebitNoteId == debitNote.Id)
                            .ExecuteUpdateAsync(setters => setters
                                .SetProperty(dne => dne.UpdatedAt, DateTime.UtcNow));

                        _logger.LogInformation("Updated {Count} debit note entries for {BillNumber}", debitNoteEntriesUpdated, billNumber);

                        // Save all changes
                        await _context.SaveChangesAsync();

                        // Commit transaction
                        await transaction.CommitAsync();
                        _logger.LogInformation("Transaction committed successfully for canceling debit note {BillNumber}", billNumber);

                        return new
                        {
                            success = true,
                            message = "Debit note and related transactions have been canceled.",
                            data = new
                            {
                                debitNoteId = debitNote.Id,
                                billNumber = billNumber,
                                transactionsUpdated = transactionsUpdated,
                                debitNoteEntriesUpdated = debitNoteEntriesUpdated
                            }
                        };
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error during transaction for canceling debit note {BillNumber}", billNumber);
                        await transaction.RollbackAsync();
                        throw;
                    }
                });

                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in CancelDebitNote for bill {BillNumber}", billNumber);
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in CancelDebitNote for bill {BillNumber}", billNumber);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while canceling debit note",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // POST: api/retailer/debit-notes/reactivate/{billNumber}
        [HttpPost("debit-notes/reactivate/{billNumber}")]
        public async Task<IActionResult> ReactivateDebitNote(string billNumber)
        {
            try
            {
                _logger.LogInformation("=== ReactivateDebitNote Started for Bill Number: {BillNumber} ===", billNumber);

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

                // Validate bill number
                if (string.IsNullOrWhiteSpace(billNumber))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Bill number is required"
                    });
                }

                // Use execution strategy for transaction handling
                var executionStrategy = _context.Database.CreateExecutionStrategy();

                var result = await executionStrategy.ExecuteAsync(async () =>
                {
                    using var transaction = await _context.Database.BeginTransactionAsync();

                    try
                    {
                        _logger.LogInformation("Starting transaction to reactivate debit note: {BillNumber}", billNumber);

                        // Find the debit note by bill number and company
                        var debitNote = await _context.DebitNotes
                            .FirstOrDefaultAsync(d => d.BillNumber == billNumber &&
                                                      d.CompanyId == companyIdGuid &&
                                                      d.FiscalYearId == fiscalYearIdGuid);

                        if (debitNote == null)
                        {
                            throw new ArgumentException($"Debit note with bill number {billNumber} not found");
                        }

                        // Check if already active
                        if (debitNote.Status == DebitNoteStatus.Active)
                        {
                            throw new ArgumentException($"Debit note {billNumber} is already active");
                        }

                        // Update debit note status to Active
                        debitNote.Status = DebitNoteStatus.Active;
                        debitNote.IsActive = true;
                        debitNote.UpdatedAt = DateTime.UtcNow;

                        _context.DebitNotes.Update(debitNote);
                        _logger.LogInformation("Updated debit note status to Active for {BillNumber}", billNumber);

                        // Reactivate related transactions (type 'DrNt' for debit note)
                        var transactionsUpdated = await _context.Transactions
                            .Where(t => t.BillNumber == billNumber &&
                                       t.Type == TransactionType.DrNt &&
                                       t.CompanyId == companyIdGuid)
                            .ExecuteUpdateAsync(setters => setters
                                .SetProperty(t => t.Status, TransactionStatus.Active)
                                .SetProperty(t => t.IsActive, true));

                        _logger.LogInformation("Reactivated {Count} related transactions for {BillNumber}", transactionsUpdated, billNumber);

                        // Update debit note entries timestamp (optional)
                        var debitNoteEntriesUpdated = await _context.DebitNoteEntries
                            .Where(dne => dne.DebitNoteId == debitNote.Id)
                            .ExecuteUpdateAsync(setters => setters
                                .SetProperty(dne => dne.UpdatedAt, DateTime.UtcNow));

                        _logger.LogInformation("Updated {Count} debit note entries for {BillNumber}", debitNoteEntriesUpdated, billNumber);

                        // Save all changes
                        await _context.SaveChangesAsync();

                        // Commit transaction
                        await transaction.CommitAsync();
                        _logger.LogInformation("Transaction committed successfully for reactivating debit note {BillNumber}", billNumber);

                        return new
                        {
                            success = true,
                            message = "Debit note and related transactions have been reactivated.",
                            data = new
                            {
                                debitNoteId = debitNote.Id,
                                billNumber = billNumber,
                                transactionsUpdated = transactionsUpdated,
                                debitNoteEntriesUpdated = debitNoteEntriesUpdated
                            }
                        };
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error during transaction for reactivating debit note {BillNumber}", billNumber);
                        await transaction.RollbackAsync();
                        throw;
                    }
                });

                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in ReactivateDebitNote for bill {BillNumber}", billNumber);
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in ReactivateDebitNote for bill {BillNumber}", billNumber);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while reactivating debit note",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/debit-note/register
        [HttpGet("debit-note/register")]
        public async Task<IActionResult> GetDebitNotesRegister([FromQuery] string? fromDate = null, [FromQuery] string? toDate = null)
        {
            try
            {
                _logger.LogInformation("=== GetDebitNotesRegister Started ===");

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

                // Get debit notes register data from service
                var registerData = await _debitNoteService.GetDebitNotesRegisterAsync(
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
                        debitNotes = registerData.DebitNotes,
                        fromDate = registerData.FromDate,
                        toDate = registerData.ToDate,
                        currentCompanyName = registerData.CurrentCompanyName,
                        companyDateFormat = registerData.CompanyDateFormat,
                        nepaliDate = registerData.NepaliDate,
                        isAdminOrSupervisor = isAdminOrSupervisor
                    },
                    meta = new
                    {
                        title = "Debit Notes Register",
                        body = "retailer >> debit-note >> view debit notes",
                        theme = registerData.UserPreferences?.Theme ?? "light"
                    }
                };

                _logger.LogInformation($"Successfully fetched debit notes register with {registerData.DebitNotes.Count} debit notes");

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in GetDebitNotesRegister");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetDebitNotesRegister");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching debit notes register",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/debit-note/entry-data
        [HttpGet("debit-note/entry-data")]
        public async Task<IActionResult> GetDebitNoteEntryData()
        {
            try
            {
                _logger.LogInformation("=== GetDebitNoteEntryData Started ===");

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

                // Get debit note entry data from service
                var debitNoteEntryData = await _debitNoteService.GetDebitNoteEntryDataAsync(companyIdGuid, fiscalYear.Id, userIdGuid);

                var response = new
                {
                    success = true,
                    data = new
                    {
                        company = debitNoteEntryData.Company,
                        accounts = debitNoteEntryData.Accounts,
                        dates = debitNoteEntryData.Dates,
                        currentFiscalYear = debitNoteEntryData.CurrentFiscalYear,
                        userPreferences = debitNoteEntryData.UserPreferences,
                        permissions = debitNoteEntryData.Permissions,
                        currentCompanyName = debitNoteEntryData.CurrentCompanyName
                    }
                };

                _logger.LogInformation($"Successfully fetched debit note entry data for company {debitNoteEntryData.Company.Name}");

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetDebitNoteEntryData");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/debit-note/{id}/print
        [HttpGet("debit-note/{id}/print")]
        public async Task<IActionResult> GetDebitNoteForPrint(Guid id)
        {
            try
            {
                _logger.LogInformation("=== GetDebitNoteForPrint Started for ID: {DebitNoteId} ===", id);

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

                // Get debit note print data from service
                var printData = await _debitNoteService.GetDebitNoteForPrintAsync(
                    id,
                    companyIdGuid,
                    userIdGuid,
                    fiscalYearIdGuid);

                if (printData == null || printData.DebitNote == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Debit note not found"
                    });
                }

                var response = new
                {
                    success = true,
                    data = printData
                };

                _logger.LogInformation($"Successfully fetched debit note print data for ID: {id}");

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in GetDebitNoteForPrint");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetDebitNoteForPrint for debit note {DebitNoteId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching debit note for printing",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }
    }
}
