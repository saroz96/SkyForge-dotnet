using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkyForge.Data;
using SkyForge.Services.Retailer.JournalVoucherServices;
using SkyForge.Models.CompanyModel;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using SkyForge.Models.Shared;
using SkyForge.Dto.RetailerDto.JournalVoucherDto;
using SkyForge.Models.Retailer.JournalVoucherModel;
using SkyForge.Models.Retailer.TransactionModel;

namespace SkyForge.Controllers.Retailer
{
    [ApiController]
    [Route("api/retailer")]
    [Authorize]
    public class JournalVoucherController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<JournalVoucherController> _logger;
        private readonly IJournalVoucherService _journalVoucherService;

        public JournalVoucherController(
            ApplicationDbContext context,
            ILogger<JournalVoucherController> logger,
            IJournalVoucherService journalVoucherService)
        {
            _context = context;
            _logger = logger;
            _journalVoucherService = journalVoucherService;
        }

        // GET: api/retailer/journal
        [HttpGet("journal")]
        public async Task<IActionResult> GetJournalVoucherFormData()
        {
            try
            {
                _logger.LogInformation("=== GetJournalVoucherFormData Started ===");

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

                // Get journal voucher form data from service
                var formData = await _journalVoucherService.GetJournalVoucherFormDataAsync(
                    companyIdGuid,
                    fiscalYearIdGuid,
                    userIdGuid);

                if (formData == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Failed to load journal voucher form data"
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
                _logger.LogError(ex, "Error in GetJournalVoucherFormData");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching journal voucher form data",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        [HttpGet("journal/next-number")]
        public async Task<IActionResult> GetNextJournalBillNumber()
        {
            try
            {
                _logger.LogInformation("=== GetNextJournalBillNumber Started ===");

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

                var nextBillNumber = await _journalVoucherService.GetNextBillNumberAsync(companyIdGuid, fiscalYearIdGuid);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        nextJournalBillNumber = nextBillNumber
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetNextJournalBillNumber");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/payments/current-number
        [HttpGet("journal/current-number")]
        public async Task<IActionResult> GetCurrentJournalBillNumber()
        {
            try
            {
                _logger.LogInformation("=== GetCurrentJournalBillNumber Started ===");

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

                var currentBillNumber = await _journalVoucherService.GetCurrentBillNumberAsync(companyIdGuid, fiscalYear.Id);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        currentJournalBillNumber = currentBillNumber
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCurrentJournalBillNumber");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error"
                });
            }
        }


        [HttpPost("journal")]
        public async Task<IActionResult> CreateJournalVoucher([FromBody] CreateJournalVoucherDTO dto)
        {
            try
            {
                _logger.LogInformation("=== CreateJournalVoucher Started ===");

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

                // Create journal voucher
                var journalVoucher = await _journalVoucherService.CreateJournalVoucherAsync(
                    dto,
                    userIdGuid,
                    companyIdGuid,
                    fiscalYearIdGuid);

                // Prepare response
                var responseData = new
                {
                    success = true,
                    message = "Journal voucher saved successfully!",
                    data = new JournalVoucherResponseDTO
                    {
                        JournalVoucher = new JournalVoucherInfoDTO
                        {
                            Id = journalVoucher.Id,
                            BillNumber = journalVoucher.BillNumber,
                            Date = journalVoucher.Date,
                            NepaliDate = journalVoucher.NepaliDate,
                            TotalAmount = journalVoucher.TotalAmount,
                            Description = journalVoucher.Description,
                            Status = journalVoucher.Status.ToString()
                        },
                        PrintUrl = $"/api/retailer/journal/{journalVoucher.Id}/print"
                    }
                };

                if (dto.Print == true)
                {
                    responseData.data.RedirectUrl = $"/retailer/journal/{journalVoucher.Id}/print";
                }

                return Ok(responseData);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in CreateJournalVoucher");
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in CreateJournalVoucher");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while creating journal voucher",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/journal/finds
        [HttpGet("journal/finds")]
        public async Task<IActionResult> GetJournalFinds()
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

                var result = await _journalVoucherService.GetJournalVoucherFindsAsync(
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
                _logger.LogError(ex, "Error in GetJournalFinds");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error"
                });
            }
        }

        [HttpGet("journal/get-id-by-number")]
        public async Task<IActionResult> GetJournalBillIdByNumber([FromQuery] string billNumber)
        {
            try
            {
                _logger.LogInformation("=== GetJournalBillIdByNumber Started for Bill Number: {BillNumber} ===", billNumber);

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
                var result = await _journalVoucherService.GetJournalBillIdByNumberAsync(
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
                _logger.LogWarning(ex, "Validation error in GetJournalBillIdByNumber");
                return NotFound(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetJournalBillIdByNumber for bill {BillNumber}", billNumber);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching bill ID"
                });
            }
        }

        // GET: api/retailer/journal/edit/{id}
        [HttpGet("journal/edit/{id}")]
        public async Task<IActionResult> GetJournalVoucherEditData(Guid id)
        {
            try
            {
                _logger.LogInformation("=== GetJournalVoucherEditData Started for Journal ID: {JournalId} ===", id);

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

                // Get journal voucher edit data from service
                var editData = await _journalVoucherService.GetJournalVoucherEditDataAsync(
                    id,
                    companyIdGuid,
                    fiscalYearIdGuid,
                    userIdGuid);

                if (editData == null || editData.JournalVoucher == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Journal voucher not found or does not belong to the selected company"
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
                        journalVoucher = editData.JournalVoucher,
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

                _logger.LogInformation($"Successfully fetched journal voucher edit data for Journal ID: {id}");

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in GetJournalVoucherEditData");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetJournalVoucherEditData for journal {JournalId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching journal voucher edit data",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // PUT: api/retailer/journal/edit/{id}
        [HttpPut("journal/edit/{id}")]
        public async Task<IActionResult> UpdateJournalVoucher(Guid id, [FromBody] UpdateJournalVoucherDTO request)
        {
            try
            {
                _logger.LogInformation("=== UpdateJournalVoucher Started for ID: {JournalId} ===", id);

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

                // Update journal voucher using service
                var updatedJournal = await _journalVoucherService.UpdateJournalVoucherAsync(
                    id,
                    request,
                    companyIdGuid,
                    fiscalYearIdGuid,
                    userIdGuid
                );

                _logger.LogInformation($"Successfully updated journal voucher: {id}");

                // Prepare response
                var response = new
                {
                    success = true,
                    message = "Journal voucher updated successfully",
                    data = new
                    {
                        journalVoucher = new
                        {
                            id = updatedJournal.Id,
                            billNumber = updatedJournal.BillNumber,
                            date = updatedJournal.Date,
                            totalAmount = updatedJournal.TotalAmount,
                            description = updatedJournal.Description,
                            entryCount = updatedJournal.JournalEntries?.Count ?? 0
                        },
                        printUrl = $"/api/retailer/journal/{updatedJournal.Id}/print"
                    }
                };

                // If print was requested, add redirect URL
                if (request.Print == true)
                {
                    return Ok(new
                    {
                        success = true,
                        message = "Journal voucher updated successfully",
                        data = response.data,
                        redirectUrl = $"/api/retailer/journal/{updatedJournal.Id}/print"
                    });
                }

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in UpdateJournalVoucher");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in UpdateJournalVoucher for journal {JournalId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while updating journal voucher",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // POST: api/retailer/journals/cancel/{billNumber}
        [HttpPost("journals/cancel/{billNumber}")]
        public async Task<IActionResult> CancelJournalVoucher(string billNumber)
        {
            try
            {
                _logger.LogInformation("=== CancelJournalVoucher Started for Bill Number: {BillNumber} ===", billNumber);

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
                        _logger.LogInformation("Starting transaction to cancel journal voucher: {BillNumber}", billNumber);

                        // Find the journal voucher by bill number and company
                        var journalVoucher = await _context.JournalVouchers
                            .FirstOrDefaultAsync(j => j.BillNumber == billNumber &&
                                                      j.CompanyId == companyIdGuid &&
                                                      j.FiscalYearId == fiscalYearIdGuid);

                        if (journalVoucher == null)
                        {
                            throw new ArgumentException($"Journal voucher with bill number {billNumber} not found");
                        }

                        // Check if already canceled
                        if (journalVoucher.Status == VoucherStatus.Canceled)
                        {
                            throw new ArgumentException($"Journal voucher {billNumber} is already canceled");
                        }

                        // Update journal voucher status to Canceled
                        journalVoucher.Status = VoucherStatus.Canceled;
                        journalVoucher.IsActive = false;
                        journalVoucher.UpdatedAt = DateTime.UtcNow;

                        _context.JournalVouchers.Update(journalVoucher);
                        _logger.LogInformation("Updated journal voucher status to Canceled for {BillNumber}", billNumber);

                        // Update related transactions (type 'Jrnl' for journal)
                        var transactionsUpdated = await _context.Transactions
                            .Where(t => t.BillNumber == billNumber &&
                                       t.Type == TransactionType.Jrnl &&
                                       t.CompanyId == companyIdGuid)
                            .ExecuteUpdateAsync(setters => setters
                                .SetProperty(t => t.Status, TransactionStatus.Canceled)
                                .SetProperty(t => t.IsActive, false));

                        _logger.LogInformation("Updated {Count} related transactions for {BillNumber}", transactionsUpdated, billNumber);

                        // Also update journal entries to mark them as inactive (optional - based on your business logic)
                        var journalEntriesUpdated = await _context.JournalEntries
                            .Where(je => je.JournalVoucherId == journalVoucher.Id)
                            .ExecuteUpdateAsync(setters => setters
                                .SetProperty(je => je.UpdatedAt, DateTime.UtcNow));

                        _logger.LogInformation("Updated {Count} journal entries for {BillNumber}", journalEntriesUpdated, billNumber);

                        // Save all changes
                        await _context.SaveChangesAsync();

                        // Commit transaction
                        await transaction.CommitAsync();
                        _logger.LogInformation("Transaction committed successfully for canceling journal voucher {BillNumber}", billNumber);

                        return new
                        {
                            success = true,
                            message = "Journal voucher and related transactions have been canceled.",
                            data = new
                            {
                                journalVoucherId = journalVoucher.Id,
                                billNumber = billNumber,
                                transactionsUpdated = transactionsUpdated,
                                journalEntriesUpdated = journalEntriesUpdated
                            }
                        };
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error during transaction for canceling journal voucher {BillNumber}", billNumber);
                        await transaction.RollbackAsync();
                        throw;
                    }
                });

                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in CancelJournalVoucher for bill {BillNumber}", billNumber);
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in CancelJournalVoucher for bill {BillNumber}", billNumber);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while canceling journal voucher",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // POST: api/retailer/journals/reactivate/{billNumber}
        [HttpPost("journals/reactivate/{billNumber}")]
        public async Task<IActionResult> ReactivateJournalVoucher(string billNumber)
        {
            try
            {
                _logger.LogInformation("=== ReactivateJournalVoucher Started for Bill Number: {BillNumber} ===", billNumber);

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
                        _logger.LogInformation("Starting transaction to reactivate journal voucher: {BillNumber}", billNumber);

                        // Find the journal voucher by bill number and company
                        var journalVoucher = await _context.JournalVouchers
                            .FirstOrDefaultAsync(j => j.BillNumber == billNumber &&
                                                      j.CompanyId == companyIdGuid &&
                                                      j.FiscalYearId == fiscalYearIdGuid);

                        if (journalVoucher == null)
                        {
                            throw new ArgumentException($"Journal voucher with bill number {billNumber} not found");
                        }

                        // Check if already active
                        if (journalVoucher.Status == VoucherStatus.Active)
                        {
                            throw new ArgumentException($"Journal voucher {billNumber} is already active");
                        }

                        // Update journal voucher status to Active
                        journalVoucher.Status = VoucherStatus.Active;
                        journalVoucher.IsActive = true;
                        journalVoucher.UpdatedAt = DateTime.UtcNow;

                        _context.JournalVouchers.Update(journalVoucher);
                        _logger.LogInformation("Updated journal voucher status to Active for {BillNumber}", billNumber);

                        // Reactivate related transactions (type 'Jrnl' for journal)
                        var transactionsUpdated = await _context.Transactions
                            .Where(t => t.BillNumber == billNumber &&
                                       t.Type == TransactionType.Jrnl &&
                                       t.CompanyId == companyIdGuid)
                            .ExecuteUpdateAsync(setters => setters
                                .SetProperty(t => t.Status, TransactionStatus.Active)
                                .SetProperty(t => t.IsActive, true));

                        _logger.LogInformation("Reactivated {Count} related transactions for {BillNumber}", transactionsUpdated, billNumber);

                        // Update journal entries timestamp (optional)
                        var journalEntriesUpdated = await _context.JournalEntries
                            .Where(je => je.JournalVoucherId == journalVoucher.Id)
                            .ExecuteUpdateAsync(setters => setters
                                .SetProperty(je => je.UpdatedAt, DateTime.UtcNow));

                        _logger.LogInformation("Updated {Count} journal entries for {BillNumber}", journalEntriesUpdated, billNumber);

                        // Save all changes
                        await _context.SaveChangesAsync();

                        // Commit transaction
                        await transaction.CommitAsync();
                        _logger.LogInformation("Transaction committed successfully for reactivating journal voucher {BillNumber}", billNumber);

                        return new
                        {
                            success = true,
                            message = "Journal voucher and related transactions have been reactivated.",
                            data = new
                            {
                                journalVoucherId = journalVoucher.Id,
                                billNumber = billNumber,
                                transactionsUpdated = transactionsUpdated,
                                journalEntriesUpdated = journalEntriesUpdated
                            }
                        };
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error during transaction for reactivating journal voucher {BillNumber}", billNumber);
                        await transaction.RollbackAsync();
                        throw;
                    }
                });

                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in ReactivateJournalVoucher for bill {BillNumber}", billNumber);
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in ReactivateJournalVoucher for bill {BillNumber}", billNumber);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while reactivating journal voucher",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/journal/register
        [HttpGet("journal/register")]
        public async Task<IActionResult> GetJournalVouchersRegister([FromQuery] string? fromDate = null, [FromQuery] string? toDate = null)
        {
            try
            {
                _logger.LogInformation("=== GetJournalVouchersRegister Started ===");

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

                // Get journal vouchers register data from service
                var registerData = await _journalVoucherService.GetJournalVouchersRegisterAsync(
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
                        journalVouchers = registerData.JournalVouchers,
                        fromDate = registerData.FromDate,
                        toDate = registerData.ToDate,
                        currentCompanyName = registerData.CurrentCompanyName,
                        companyDateFormat = registerData.CompanyDateFormat,
                        nepaliDate = registerData.NepaliDate,
                        isAdminOrSupervisor = isAdminOrSupervisor
                    },
                    meta = new
                    {
                        title = "Journal Vouchers Register",
                        theme = registerData.UserPreferences?.Theme ?? "light"
                    }
                };

                _logger.LogInformation($"Successfully fetched journal vouchers register with {registerData.JournalVouchers.Count} vouchers");

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in GetJournalVouchersRegister");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetJournalVouchersRegister");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching journal vouchers register",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/journal/entry-data
        [HttpGet("journal/entry-data")]
        public async Task<IActionResult> GetJournalVoucherEntryData()
        {
            try
            {
                _logger.LogInformation("=== GetJournalVoucherEntryData Started ===");

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

                // Get journal entry data from service
                var journalEntryData = await _journalVoucherService.GetJournalVoucherEntryDataAsync(companyIdGuid, fiscalYear.Id, userIdGuid);

                var response = new
                {
                    success = true,
                    data = new
                    {
                        company = journalEntryData.Company,
                        accounts = journalEntryData.Accounts,
                        dates = journalEntryData.Dates,
                        currentFiscalYear = journalEntryData.CurrentFiscalYear,
                        userPreferences = journalEntryData.UserPreferences,
                        permissions = journalEntryData.Permissions,
                        currentCompanyName = journalEntryData.CurrentCompanyName
                    }
                };

                _logger.LogInformation($"Successfully fetched journal entry data for company {journalEntryData.Company.Name}");

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetJournalVoucherEntryData");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }
       
        // GET: api/retailer/journal/{id}/print
        [HttpGet("journal/{id}/print")]
        public async Task<IActionResult> GetJournalVoucherForPrint(Guid id)
        {
            try
            {
                _logger.LogInformation("=== GetJournalVoucherForPrint Started for ID: {JournalId} ===", id);

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

                // Get journal voucher print data from service
                var printData = await _journalVoucherService.GetJournalVoucherForPrintAsync(
                    id,
                    companyIdGuid,
                    userIdGuid,
                    fiscalYearIdGuid);

                if (printData == null || printData.JournalVoucher == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Journal voucher not found"
                    });
                }

                var response = new
                {
                    success = true,
                    data = printData
                };

                _logger.LogInformation($"Successfully fetched journal voucher print data for ID: {id}");

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in GetJournalVoucherForPrint");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetJournalVoucherForPrint for journal {JournalId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching journal voucher for printing",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }
    
    }
}