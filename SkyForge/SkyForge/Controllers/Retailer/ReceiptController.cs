using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkyForge.Data;
using SkyForge.Services.Retailer.ReceiptServices;
using SkyForge.Models.CompanyModel;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using SkyForge.Models.Shared;
using SkyForge.Dto.RetailerDto.ReceiptDto;
using SkyForge.Models.Retailer.ReceiptModel;
using SkyForge.Models.Retailer.TransactionModel;

namespace SkyForge.Controllers.Retailer
{
    [ApiController]
    [Route("api/retailer")]
    [Authorize]
    public class ReceiptController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<ReceiptController> _logger;
        private readonly IReceiptService _receiptService;

        public ReceiptController(
            ApplicationDbContext context,
            ILogger<ReceiptController> logger,
            IReceiptService receiptService)
        {
            _context = context;
            _logger = logger;
            _receiptService = receiptService;
        }

        // GET: api/retailer/receipts
        [HttpGet("receipts")]
        public async Task<IActionResult> GetReceiptFormData()
        {
            try
            {
                _logger.LogInformation("=== GetReceiptFormData Started ===");

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

                var receiptFormData = await _receiptService.GetReceiptFormDataAsync(
                    companyIdGuid,
                    fiscalYearIdGuid,
                    userIdGuid);

                if (receiptFormData == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Failed to load receipt form data"
                    });
                }

                return Ok(new
                {
                    success = true,
                    data = receiptFormData
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetReceiptFormData");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching receipt form data",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        [HttpGet("receipts/next-number")]
        public async Task<IActionResult> GetNextReceiptsBillNumber()
        {
            try
            {
                _logger.LogInformation("=== GetNextReceiptsBillNumber Started ===");

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

                var nextBillNumber = await _receiptService.GetNextBillNumberAsync(companyIdGuid, fiscalYearIdGuid);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        nextReceiptsBillNumber = nextBillNumber
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetNextReceiptssBillNumber");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/receipts/current-number
        [HttpGet("receipts/current-number")]
        public async Task<IActionResult> GetCurrentReceiptsBillNumber()
        {
            try
            {
                _logger.LogInformation("=== GetCurrentReceiptsBillNumber Started ===");

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

                var currentBillNumber = await _receiptService.GetCurrentBillNumberAsync(companyIdGuid, fiscalYear.Id);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        currentReceiptsBillNumber = currentBillNumber
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCurrentReceiptsBillNumber");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error"
                });
            }
        }

        [HttpPost("receipts")]
        public async Task<IActionResult> CreateReceipt([FromBody] CreateReceiptDTO dto)
        {
            try
            {
                _logger.LogInformation("=== CreateReceipt Started ===");

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

                // Handle fiscal year
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
                if (dto.AccountId == Guid.Empty)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Account ID is required."
                    });
                }

                if (dto.ReceiptAccountId == Guid.Empty)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Receipt account ID is required."
                    });
                }

                if (dto.Credit <= 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Credit amount must be greater than 0."
                    });
                }

                var receipt = await _receiptService.CreateReceiptAsync(
                    dto,
                    userIdGuid,
                    companyIdGuid,
                    fiscalYearIdGuid);

                // Prepare response data
                var responseData = new
                {
                    success = true,
                    message = "Receipt saved successfully!",
                    data = new
                    {
                        receipt = new
                        {
                            id = receipt.Id,
                            billNumber = receipt.BillNumber,
                            date = receipt.Date,
                            accountId = receipt.AccountId,
                            credit = receipt.Credit,
                            receiptAccountId = receipt.ReceiptAccountId,
                            description = receipt.Description,
                            instType = receipt.InstType,
                            instNo = receipt.InstNo,
                            bankAcc = receipt.BankAcc
                        },
                        printUrl = $"/api/retailer/receipts/{receipt.Id}/direct-print"
                    }
                };

                return Ok(responseData);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in CreateReceipt");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in CreateReceipt");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while creating receipt",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

             // GET: api/retailer/receipts/finds
        [HttpGet("receipts/finds")]
        public async Task<IActionResult> GetReceiptFinds()
        {
            try
            {
                _logger.LogInformation("=== GetReceiptFinds Started ===");

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

                var result = await _receiptService.GetReceiptFindsAsync(
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
                _logger.LogError(ex, "Error in GetReceiptFinds");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error"
                });
            }
        }

       [HttpGet("receipts/get-id-by-number")]
        public async Task<IActionResult> GetReceiptBillIdByNumber([FromQuery] string billNumber)
        {
            try
            {
                _logger.LogInformation("=== GetReceiptBillIdByNumber Started for Bill Number: {BillNumber} ===", billNumber);

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
                var result = await _receiptService.GetReceiptBillIdByNumberAsync(
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
                _logger.LogWarning(ex, "Validation error in GetReceiptBillIdByNumber");
                return NotFound(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetReceiptBillIdByNumber for bill {BillNumber}", billNumber);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching bill ID"
                });
            }
        }

        // GET: api/retailer/receipts/edit/{id}
[HttpGet("receipts/edit/{id}")]
public async Task<IActionResult> GetReceiptEditData(Guid id)
{
    try
    {
        _logger.LogInformation("=== GetReceiptEditData Started for Receipt ID: {ReceiptId} ===", id);

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

        // Get receipt edit data from service
        var editData = await _receiptService.GetReceiptEditDataAsync(
            id,
            companyIdGuid,
            fiscalYearIdGuid,
            userIdGuid);

        if (editData == null || editData.Receipt == null)
        {
            return NotFound(new
            {
                success = false,
                error = "Receipt voucher not found or does not belong to the selected company"
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
                receipt = editData.Receipt,
                accounts = editData.Accounts,
                cashAccounts = editData.CashAccounts,
                bankAccounts = editData.BankAccounts,
                receiptAccounts = editData.ReceiptAccounts,
                currentFiscalYear = editData.CurrentFiscalYear,
                nepaliDate = editData.NepaliDate,
                companyDateFormat = editData.CompanyDateFormat,
                currentCompanyName = editData.CurrentCompanyName,
                date = editData.CurrentDate,
                user = editData.User,
                isAdminOrSupervisor = editData.IsAdminOrSupervisor
            }
        };

        _logger.LogInformation($"Successfully fetched receipt edit data for Receipt ID: {id}");

        return Ok(response);
    }
    catch (ArgumentException ex)
    {
        _logger.LogWarning(ex, "Validation error in GetReceiptEditData");
        return BadRequest(new
        {
            success = false,
            error = ex.Message
        });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error in GetReceiptEditData for receipt {ReceiptId}", id);
        return StatusCode(500, new
        {
            success = false,
            error = "Internal server error while fetching receipt edit data",
            details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
        });
    }
}
// PUT: api/retailer/receipts/edit/{id}
[HttpPut("receipts/edit/{id}")]
public async Task<IActionResult> UpdateReceipt(Guid id, [FromBody] UpdateReceiptDTO request)
{
    try
    {
        _logger.LogInformation("=== UpdateReceipt Started for ID: {ReceiptId} ===", id);

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

        if (request.ReceiptAccountId == Guid.Empty)
        {
            return BadRequest(new
            {
                success = false,
                error = "Receipt account ID is required"
            });
        }

        if (request.Credit <= 0)
        {
            return BadRequest(new
            {
                success = false,
                error = "Credit amount must be greater than 0"
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

        // Update receipt using service
        var updatedReceipt = await _receiptService.UpdateReceiptAsync(
            id,
            request,
            companyIdGuid,
            fiscalYearIdGuid,
            userIdGuid
        );

        _logger.LogInformation($"Successfully updated receipt: {id}");

        // Prepare response
        var response = new
        {
            success = true,
            message = "Receipt updated successfully",
            data = new
            {
                receipt = new
                {
                    id = updatedReceipt.Id,
                    billNumber = updatedReceipt.BillNumber,
                    date = updatedReceipt.Date,
                    accountId = updatedReceipt.AccountId,
                    credit = updatedReceipt.Credit,
                    receiptAccountId = updatedReceipt.ReceiptAccountId,
                    description = updatedReceipt.Description
                },
                printUrl = $"/api/retailer/receipts/{updatedReceipt.Id}/direct-print"
            }
        };

        // If print was requested, add redirect URL
        if (request.Print == true)
        {
            return Ok(new
            {
                success = true,
                message = "Receipt updated successfully",
                data = response.data,
                redirectUrl = $"/api/retailer/receipts/{updatedReceipt.Id}/direct-print"
            });
        }

        return Ok(response);
    }
    catch (ArgumentException ex)
    {
        _logger.LogWarning(ex, "Validation error in UpdateReceipt");
        return BadRequest(new
        {
            success = false,
            error = ex.Message
        });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error in UpdateReceipt for receipt {ReceiptId}", id);
        return StatusCode(500, new
        {
            success = false,
            error = "Internal server error while updating receipt",
            details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
        });
    }
}

// GET: api/retailer/receipts/register
[HttpGet("receipts/register")]
public async Task<IActionResult> GetReceiptsRegister([FromQuery] string? fromDate = null, [FromQuery] string? toDate = null)
{
    try
    {
        _logger.LogInformation("=== GetReceiptsRegister Started ===");

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

        // Get receipts register data from service
        var registerData = await _receiptService.GetReceiptsRegisterAsync(
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
                receipts = registerData.Receipts,
                fromDate = registerData.FromDate,
                toDate = registerData.ToDate,
                currentCompanyName = registerData.CurrentCompanyName,
                companyDateFormat = registerData.CompanyDateFormat,
                nepaliDate = registerData.NepaliDate,
                isAdminOrSupervisor = isAdminOrSupervisor
            },
            meta = new
            {
                title = "Receipts Register",
                theme = registerData.UserPreferences?.Theme ?? "light"
            }
        };

        _logger.LogInformation($"Successfully fetched receipts register with {registerData.Receipts.Count} receipts");

        return Ok(response);
    }
    catch (ArgumentException ex)
    {
        _logger.LogWarning(ex, "Validation error in GetReceiptsRegister");
        return BadRequest(new
        {
            success = false,
            error = ex.Message
        });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error in GetReceiptsRegister");
        return StatusCode(500, new
        {
            success = false,
            error = "Internal server error while fetching receipts register",
            details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
        });
    }
}

// GET: api/retailer/receipts/entry-data
[HttpGet("receipts/entry-data")]
public async Task<IActionResult> GetReceiptEntryData()
{
    try
    {
        _logger.LogInformation("=== GetReceiptEntryData Started ===");

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

        // Get receipt entry data from service
        var receiptEntryData = await _receiptService.GetReceiptEntryDataAsync(companyIdGuid, fiscalYear.Id, userIdGuid);

        var response = new
        {
            success = true,
            data = new
            {
                company = receiptEntryData.Company,
                accounts = receiptEntryData.Accounts,
                cashAccounts = receiptEntryData.CashAccounts,
                bankAccounts = receiptEntryData.BankAccounts,
                dates = receiptEntryData.Dates,
                currentFiscalYear = receiptEntryData.CurrentFiscalYear,
                nextReceiptBillNumber = receiptEntryData.NextReceiptBillNumber,
                userPreferences = receiptEntryData.UserPreferences,
                permissions = receiptEntryData.Permissions,
                currentCompanyName = receiptEntryData.CurrentCompanyName
            }
        };

        _logger.LogInformation($"Successfully fetched receipt entry data for company {receiptEntryData.Company.Name}");

        return Ok(response);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error in GetReceiptEntryData");
        return StatusCode(500, new
        {
            success = false,
            error = "Internal server error",
            details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
        });
    }
}
    }
}