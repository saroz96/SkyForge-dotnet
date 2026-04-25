using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkyForge.Data;
using SkyForge.Models.CompanyModel;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using SkyForge.Models.Shared;
using SkyForge.Models.Retailer.TransactionModel;
using SkyForge.Services.Retailer.CreditNoteServices;
using SkyForge.Dto.RetailerDto.CreditNoteDto;
using SkyForge.Models.Retailer.CreditNoteModel;

namespace SkyForge.Controllers.Retailer
{
    [ApiController]
    [Route("api/retailer")]
    [Authorize]
    public class CreditNoteController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<CreditNoteController> _logger;
        private readonly ICreditNoteService _creditNoteService;

        public CreditNoteController(
            ApplicationDbContext context,
            ILogger<CreditNoteController> logger,
            ICreditNoteService creditNoteService)
        {
            _context = context;
            _logger = logger;
            _creditNoteService = creditNoteService;
        }

        // GET: api/retailer/last-credit-note-date
        [HttpGet("last-credit-note-date")]
        public async Task<IActionResult> GetLastCreditNoteDate()
        {
            try
            {
                _logger.LogInformation("=== GetLastCreditNoteDate Started ===");

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
                IQueryable<CreditNote> query = _context.CreditNotes
                    .Where(p => p.CompanyId == companyIdGuid && p.FiscalYearId == fiscalYearIdGuid);

                IOrderedQueryable<CreditNote> orderedQuery;

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

                var lastCreditNote = await orderedQuery
                    .Select(p => new { p.Date, p.NepaliDate, p.BillNumber })
                    .FirstOrDefaultAsync();

                if (lastCreditNote == null)
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

                if (lastCreditNote.Date != null)
                    dateString = lastCreditNote.Date.ToString("yyyy-MM-dd");

                if (lastCreditNote.NepaliDate != null)
                    nepaliDateString = lastCreditNote.NepaliDate.ToString("yyyy-MM-dd");

                _logger.LogInformation($"Last credit note date found: Date={dateString}, NepaliDate={nepaliDateString}, Bill={lastCreditNote.BillNumber}, IsNepaliFormat={isNepaliFormat}");

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        date = dateString,
                        nepaliDate = nepaliDateString,
                        billNumber = lastCreditNote.BillNumber,
                        dateFormat = isNepaliFormat ? "nepali" : "english"
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting last credit note date");
                return StatusCode(500, new { success = false, error = "Internal Server Error" });
            }
        }


        // GET: api/retailer/credit-note
        [HttpGet("credit-note")]
        public async Task<IActionResult> GetCreditNoteFormData()
        {
            try
            {
                _logger.LogInformation("=== GetCreditNoteFormData Started ===");

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

                // Get credit note form data from service
                var formData = await _creditNoteService.GetCreditNoteFormDataAsync(
                    companyIdGuid,
                    fiscalYearIdGuid,
                    userIdGuid);

                if (formData == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Failed to load credit note form data"
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
                _logger.LogError(ex, "Error in GetCreditNoteFormData");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching credit note form data",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        [HttpGet("credit-note/next-number")]
        public async Task<IActionResult> GetNextCreditNoteBillNumber()
        {
            try
            {
                _logger.LogInformation("=== GetNextCreditNoteBillNumber Started ===");

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

                var nextBillNumber = await _creditNoteService.GetNextBillNumberAsync(companyIdGuid, fiscalYearIdGuid);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        nextCreditNoteBillNumber = nextBillNumber
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetNextCreditNoteBillNumber");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        [HttpGet("credit-note/current-number")]
        public async Task<IActionResult> GetCurrentCreditNoteBillNumber()
        {
            try
            {
                _logger.LogInformation("=== GetCurrentCreditNoteBillNumber Started ===");

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

                var currentBillNumber = await _creditNoteService.GetCurrentBillNumberAsync(companyIdGuid, fiscalYear.Id);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        currentCreditNoteBillNumber = currentBillNumber
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCurrentCreditNoteBillNumber");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error"
                });
            }
        }
        // POST: api/retailer/credit-note
        [HttpPost("credit-note")]
        public async Task<IActionResult> CreateCreditNote([FromBody] CreateCreditNoteDTO dto)
        {
            try
            {
                _logger.LogInformation("=== CreateCreditNote Started ===");

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

                // Create credit note
                var creditNote = await _creditNoteService.CreateCreditNoteAsync(
                    dto,
                    userIdGuid,
                    companyIdGuid,
                    fiscalYearIdGuid);

                // Prepare response
                var responseData = new
                {
                    success = true,
                    message = "Credit note saved successfully!",
                    data = new CreditNoteResponseDTO
                    {
                        CreditNote = new CreditNoteInfoDTO
                        {
                            Id = creditNote.Id,
                            BillNumber = creditNote.BillNumber,
                            Date = creditNote.Date,
                            NepaliDate = creditNote.NepaliDate,
                            TotalAmount = creditNote.TotalAmount,
                            Description = creditNote.Description,
                            Status = creditNote.Status.ToString()
                        },
                        PrintUrl = $"/api/retailer/credit-note/{creditNote.Id}/print"
                    }
                };

                if (dto.Print == true)
                {
                    responseData.data.RedirectUrl = $"/retailer/credit-note/{creditNote.Id}/print";
                }

                return Ok(responseData);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in CreateCreditNote");
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in CreateCreditNote");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while creating credit note",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/credit-note/finds
        [HttpGet("credit-note/finds")]
        public async Task<IActionResult> GetCreditNoteFinds()
        {
            try
            {
                _logger.LogInformation("=== GetJournalFinds Started ===");

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

                var result = await _creditNoteService.GetCreditNoteFindsAsync(
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
                _logger.LogError(ex, "Error in GetCreditNoteFinds");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error"
                });
            }
        }

        [HttpGet("credit-note/get-id-by-number")]
        public async Task<IActionResult> GetCreditNoteBillIdByNumber([FromQuery] string billNumber)
        {
            try
            {
                _logger.LogInformation("=== GetCreditNoteBillIdByNumber Started for Bill Number: {BillNumber} ===", billNumber);

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
                var result = await _creditNoteService.GetCreditNoteBillIdByNumberAsync(
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
                _logger.LogWarning(ex, "Validation error in GetCreditNoteBillIdByNumber");
                return NotFound(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCreditNoteBillIdByNumber for bill {BillNumber}", billNumber);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching bill ID"
                });
            }
        }

        // GET: api/retailer/credit-note/edit/{id}
        [HttpGet("credit-note/edit/{id}")]
        public async Task<IActionResult> GetCreditNoteEditData(Guid id)
        {
            try
            {
                _logger.LogInformation("=== GetCreditNoteEditData Started for Credit Note ID: {CreditNoteId} ===", id);

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

                // Get credit note edit data from service
                var editData = await _creditNoteService.GetCreditNoteEditDataAsync(
                    id,
                    companyIdGuid,
                    fiscalYearIdGuid,
                    userIdGuid);

                if (editData == null || editData.CreditNote == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Credit note not found or does not belong to the selected company"
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
                        creditNote = editData.CreditNote,
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

                _logger.LogInformation($"Successfully fetched credit note edit data for Credit Note ID: {id}");

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in GetCreditNoteEditData");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCreditNoteEditData for credit note {CreditNoteId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching credit note edit data",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // PUT: api/retailer/credit-note/edit/{id}
        [HttpPut("credit-note/edit/{id}")]
        public async Task<IActionResult> UpdateCreditNote(Guid id, [FromBody] UpdateCreditNoteDTO request)
        {
            try
            {
                _logger.LogInformation("=== UpdateCreditNote Started for ID: {CreditNoteId} ===", id);

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

                // Update credit note using service
                var updatedCreditNote = await _creditNoteService.UpdateCreditNoteAsync(
                    id,
                    request,
                    companyIdGuid,
                    fiscalYearIdGuid,
                    userIdGuid
                );

                _logger.LogInformation($"Successfully updated credit note: {id}");

                // Prepare response
                var response = new
                {
                    success = true,
                    message = "Credit note updated successfully",
                    data = new
                    {
                        creditNote = new
                        {
                            id = updatedCreditNote.Id,
                            billNumber = updatedCreditNote.BillNumber,
                            date = updatedCreditNote.Date,
                            totalAmount = updatedCreditNote.TotalAmount,
                            description = updatedCreditNote.Description,
                            entryCount = updatedCreditNote.CreditNoteEntries?.Count ?? 0
                        },
                        printUrl = $"/api/retailer/credit-note/{updatedCreditNote.Id}/print"
                    }
                };

                // If print was requested, add redirect URL
                if (request.Print == true)
                {
                    return Ok(new
                    {
                        success = true,
                        message = "Credit note updated successfully",
                        data = response.data,
                        redirectUrl = $"/api/retailer/credit-note/{updatedCreditNote.Id}/print"
                    });
                }

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in UpdateCreditNote");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in UpdateCreditNote for credit note {CreditNoteId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while updating credit note",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // POST: api/retailer/credit-notes/cancel/{billNumber}
        [HttpPost("credit-notes/cancel/{billNumber}")]
        public async Task<IActionResult> CancelCreditNote(string billNumber)
        {
            try
            {
                _logger.LogInformation("=== CancelCreditNote Started for Bill Number: {BillNumber} ===", billNumber);

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
                        _logger.LogInformation("Starting transaction to cancel credit note: {BillNumber}", billNumber);

                        // Find the credit note by bill number and company
                        var creditNote = await _context.CreditNotes
                            .FirstOrDefaultAsync(c => c.BillNumber == billNumber &&
                                                      c.CompanyId == companyIdGuid &&
                                                      c.FiscalYearId == fiscalYearIdGuid);

                        if (creditNote == null)
                        {
                            throw new ArgumentException($"Credit note with bill number {billNumber} not found");
                        }

                        // Check if already canceled
                        if (creditNote.Status == CreditNoteStatus.Canceled)
                        {
                            throw new ArgumentException($"Credit note {billNumber} is already canceled");
                        }

                        // Update credit note status to Canceled
                        creditNote.Status = CreditNoteStatus.Canceled;
                        creditNote.IsActive = false;
                        creditNote.UpdatedAt = DateTime.UtcNow;

                        _context.CreditNotes.Update(creditNote);
                        _logger.LogInformation("Updated credit note status to Canceled for {BillNumber}", billNumber);

                        // Update related transactions (type 'CrNt' for credit note)
                        var transactionsUpdated = await _context.Transactions
                            .Where(t => t.BillNumber == billNumber &&
                                       t.Type == TransactionType.CrNt &&
                                       t.CompanyId == companyIdGuid &&
                                       t.FiscalYearId == fiscalYearIdGuid)
                            .ExecuteUpdateAsync(setters => setters
                                .SetProperty(t => t.Status, TransactionStatus.Canceled)
                                .SetProperty(t => t.IsActive, false));

                        _logger.LogInformation("Updated {Count} related transactions for {BillNumber}", transactionsUpdated, billNumber);

                        // Update credit note entries timestamp (optional)
                        var creditNoteEntriesUpdated = await _context.CreditNoteEntries
                            .Where(cne => cne.CreditNoteId == creditNote.Id)
                            .ExecuteUpdateAsync(setters => setters
                                .SetProperty(cne => cne.UpdatedAt, DateTime.UtcNow));

                        _logger.LogInformation("Updated {Count} credit note entries for {BillNumber}", creditNoteEntriesUpdated, billNumber);

                        // Save all changes
                        await _context.SaveChangesAsync();

                        // Commit transaction
                        await transaction.CommitAsync();
                        _logger.LogInformation("Transaction committed successfully for canceling credit note {BillNumber}", billNumber);

                        return new
                        {
                            success = true,
                            message = "Credit note and related transactions have been canceled successfully.",
                            data = new
                            {
                                creditNoteId = creditNote.Id,
                                billNumber = billNumber,
                                transactionsUpdated = transactionsUpdated,
                                creditNoteEntriesUpdated = creditNoteEntriesUpdated
                            }
                        };
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error during transaction for canceling credit note {BillNumber}", billNumber);
                        await transaction.RollbackAsync();
                        throw;
                    }
                });

                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in CancelCreditNote for bill {BillNumber}", billNumber);
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in CancelCreditNote for bill {BillNumber}", billNumber);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while canceling credit note",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // POST: api/retailer/credit-notes/reactivate/{billNumber}
        [HttpPost("credit-notes/reactivate/{billNumber}")]
        public async Task<IActionResult> ReactivateCreditNote(string billNumber)
        {
            try
            {
                _logger.LogInformation("=== ReactivateCreditNote Started for Bill Number: {BillNumber} ===", billNumber);

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
                        _logger.LogInformation("Starting transaction to reactivate credit note: {BillNumber}", billNumber);

                        // Find the credit note by bill number and company
                        var creditNote = await _context.CreditNotes
                            .FirstOrDefaultAsync(c => c.BillNumber == billNumber &&
                                                      c.CompanyId == companyIdGuid &&
                                                      c.FiscalYearId == fiscalYearIdGuid);

                        if (creditNote == null)
                        {
                            throw new ArgumentException($"Credit note with bill number {billNumber} not found");
                        }

                        // Check if already active
                        if (creditNote.Status == CreditNoteStatus.Active)
                        {
                            throw new ArgumentException($"Credit note {billNumber} is already active");
                        }

                        // Update credit note status to Active
                        creditNote.Status = CreditNoteStatus.Active;
                        creditNote.IsActive = true;
                        creditNote.UpdatedAt = DateTime.UtcNow;

                        _context.CreditNotes.Update(creditNote);
                        _logger.LogInformation("Updated credit note status to Active for {BillNumber}", billNumber);

                        // Reactivate related transactions (type 'CrNt' for credit note)
                        var transactionsUpdated = await _context.Transactions
                            .Where(t => t.BillNumber == billNumber &&
                                       t.Type == TransactionType.CrNt &&
                                       t.CompanyId == companyIdGuid &&
                                       t.FiscalYearId == fiscalYearIdGuid)
                            .ExecuteUpdateAsync(setters => setters
                                .SetProperty(t => t.Status, TransactionStatus.Active)
                                .SetProperty(t => t.IsActive, true));

                        _logger.LogInformation("Reactivated {Count} related transactions for {BillNumber}", transactionsUpdated, billNumber);

                        // Update credit note entries timestamp (optional)
                        var creditNoteEntriesUpdated = await _context.CreditNoteEntries
                            .Where(cne => cne.CreditNoteId == creditNote.Id)
                            .ExecuteUpdateAsync(setters => setters
                                .SetProperty(cne => cne.UpdatedAt, DateTime.UtcNow));

                        _logger.LogInformation("Updated {Count} credit note entries for {BillNumber}", creditNoteEntriesUpdated, billNumber);

                        // Save all changes
                        await _context.SaveChangesAsync();

                        // Commit transaction
                        await transaction.CommitAsync();
                        _logger.LogInformation("Transaction committed successfully for reactivating credit note {BillNumber}", billNumber);

                        return new
                        {
                            success = true,
                            message = "Credit note and related transactions have been reactivated successfully.",
                            data = new
                            {
                                creditNoteId = creditNote.Id,
                                billNumber = billNumber,
                                transactionsUpdated = transactionsUpdated,
                                creditNoteEntriesUpdated = creditNoteEntriesUpdated
                            }
                        };
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error during transaction for reactivating credit note {BillNumber}", billNumber);
                        await transaction.RollbackAsync();
                        throw;
                    }
                });

                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in ReactivateCreditNote for bill {BillNumber}", billNumber);
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in ReactivateCreditNote for bill {BillNumber}", billNumber);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while reactivating credit note",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/credit-notes/register
        [HttpGet("credit-notes/register")]
        public async Task<IActionResult> GetCreditNotesRegister([FromQuery] string? fromDate = null, [FromQuery] string? toDate = null)
        {
            try
            {
                _logger.LogInformation("=== GetCreditNotesRegister Started ===");

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

                // Get credit notes register data from service
                var registerData = await _creditNoteService.GetCreditNotesRegisterAsync(
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
                        creditNotes = registerData.CreditNotes,
                        fromDate = registerData.FromDate,
                        toDate = registerData.ToDate,
                        currentCompanyName = registerData.CurrentCompanyName,
                        companyDateFormat = registerData.CompanyDateFormat,
                        nepaliDate = registerData.NepaliDate,
                        isAdminOrSupervisor = isAdminOrSupervisor
                    },
                    meta = new
                    {
                        title = "Credit Notes Register",
                        theme = registerData.UserPreferences?.Theme ?? "light"
                    }
                };

                _logger.LogInformation($"Successfully fetched credit notes register with {registerData.CreditNotes.Count} credit notes");

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in GetCreditNotesRegister");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCreditNotesRegister");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching credit notes register",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/credit-notes/entry-data
        [HttpGet("credit-notes/entry-data")]
        public async Task<IActionResult> GetCreditNoteEntryData()
        {
            try
            {
                _logger.LogInformation("=== GetCreditNoteEntryData Started ===");

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

                // Get credit note entry data from service
                var creditNoteEntryData = await _creditNoteService.GetCreditNoteEntryDataAsync(companyIdGuid, fiscalYear.Id, userIdGuid);

                var response = new
                {
                    success = true,
                    data = new
                    {
                        company = creditNoteEntryData.Company,
                        accounts = creditNoteEntryData.Accounts,
                        dates = creditNoteEntryData.Dates,
                        currentFiscalYear = creditNoteEntryData.CurrentFiscalYear,
                        userPreferences = creditNoteEntryData.UserPreferences,
                        permissions = creditNoteEntryData.Permissions,
                        currentCompanyName = creditNoteEntryData.CurrentCompanyName
                    }
                };

                _logger.LogInformation($"Successfully fetched credit note entry data for company {creditNoteEntryData.Company.Name}");

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCreditNoteEntryData");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/credit-note/{id}/print
        [HttpGet("credit-note/{id}/print")]
        public async Task<IActionResult> GetCreditNoteForPrint(Guid id)
        {
            try
            {
                _logger.LogInformation("=== GetCreditNoteForPrint Started for ID: {CreditNoteId} ===", id);

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

                // Get credit note print data from service
                var printData = await _creditNoteService.GetCreditNoteForPrintAsync(
                    id,
                    companyIdGuid,
                    userIdGuid,
                    fiscalYearIdGuid);

                if (printData == null || printData.CreditNote == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Credit note not found"
                    });
                }

                var response = new
                {
                    success = true,
                    data = printData
                };

                _logger.LogInformation($"Successfully fetched credit note print data for ID: {id}");

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in GetCreditNoteForPrint");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCreditNoteForPrint for credit note {CreditNoteId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching credit note for printing",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }
    }
}