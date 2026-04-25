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

        // GET: api/retailer/last-receipt-date
        [HttpGet("last-receipt-date")]
        public async Task<IActionResult> GetLastReceiptDate()
        {
            try
            {
                _logger.LogInformation("=== GetLastReceiptDate Started ===");

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
                IQueryable<Receipt> query = _context.Receipts
                    .Where(p => p.CompanyId == companyIdGuid && p.FiscalYearId == fiscalYearIdGuid);

                IOrderedQueryable<Receipt> orderedQuery;

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

                var lastReceipt = await orderedQuery
                    .Select(p => new { p.Date, p.NepaliDate, p.BillNumber })
                    .FirstOrDefaultAsync();

                if (lastReceipt == null)
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

                if (lastReceipt.Date != null)
                    dateString = lastReceipt.Date.ToString("yyyy-MM-dd");

                if (lastReceipt.NepaliDate != null)
                    nepaliDateString = lastReceipt.NepaliDate.ToString("yyyy-MM-dd");

                _logger.LogInformation($"Last receipt date found: Date={dateString}, NepaliDate={nepaliDateString}, Bill={lastReceipt.BillNumber}, IsNepaliFormat={isNepaliFormat}");

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        date = dateString,
                        nepaliDate = nepaliDateString,
                        billNumber = lastReceipt.BillNumber,
                        dateFormat = isNepaliFormat ? "nepali" : "english"
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting last receipt date");
                return StatusCode(500, new { success = false, error = "Internal Server Error" });
            }
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

        // [HttpPost("receipts")]
        // public async Task<IActionResult> CreateReceipt([FromBody] CreateReceiptDTO dto)
        // {
        //     try
        //     {
        //         _logger.LogInformation("=== CreateReceipt Started ===");

        //         var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        //         var companyId = User.FindFirst("currentCompany")?.Value;
        //         var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
        //         var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

        //         if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
        //         {
        //             return Unauthorized(new
        //             {
        //                 success = false,
        //                 error = "Invalid user token. Please login again."
        //             });
        //         }

        //         if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
        //         {
        //             return BadRequest(new
        //             {
        //                 success = false,
        //                 error = "No company selected. Please select a company first."
        //             });
        //         }

        //         if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
        //         {
        //             return StatusCode(403, new
        //             {
        //                 success = false,
        //                 error = "Access forbidden for this trade type"
        //             });
        //         }

        //         // Handle fiscal year
        //         Guid fiscalYearIdGuid;
        //         if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
        //         {
        //             var activeFiscalYear = await _context.FiscalYears
        //                 .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

        //             if (activeFiscalYear == null)
        //             {
        //                 return BadRequest(new
        //                 {
        //                     success = false,
        //                     error = "No active fiscal year found for this company."
        //                 });
        //             }
        //             fiscalYearIdGuid = activeFiscalYear.Id;
        //         }

        //         // Validate required fields
        //         if (dto.AccountId == Guid.Empty)
        //         {
        //             return BadRequest(new
        //             {
        //                 success = false,
        //                 error = "Account ID is required."
        //             });
        //         }

        //         if (dto.ReceiptAccountId == Guid.Empty)
        //         {
        //             return BadRequest(new
        //             {
        //                 success = false,
        //                 error = "Receipt account ID is required."
        //             });
        //         }

        //         if (dto.Credit <= 0)
        //         {
        //             return BadRequest(new
        //             {
        //                 success = false,
        //                 error = "Credit amount must be greater than 0."
        //             });
        //         }

        //         var receipt = await _receiptService.CreateReceiptAsync(
        //             dto,
        //             userIdGuid,
        //             companyIdGuid,
        //             fiscalYearIdGuid);

        //         // Prepare response data
        //         var responseData = new
        //         {
        //             success = true,
        //             message = "Receipt saved successfully!",
        //             data = new
        //             {
        //                 receipt = new
        //                 {
        //                     id = receipt.Id,
        //                     billNumber = receipt.BillNumber,
        //                     date = receipt.Date,
        //                     accountId = receipt.AccountId,
        //                     credit = receipt.Credit,
        //                     receiptAccountId = receipt.ReceiptAccountId,
        //                     description = receipt.Description,
        //                     instType = receipt.InstType,
        //                     instNo = receipt.InstNo,
        //                     bankAcc = receipt.BankAcc
        //                 },
        //                 printUrl = $"/api/retailer/receipts/{receipt.Id}/direct-print"
        //             }
        //         };

        //         return Ok(responseData);
        //     }
        //     catch (ArgumentException ex)
        //     {
        //         _logger.LogWarning(ex, "Validation error in CreateReceipt");
        //         return BadRequest(new
        //         {
        //             success = false,
        //             error = ex.Message
        //         });
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error in CreateReceipt");
        //         return StatusCode(500, new
        //         {
        //             success = false,
        //             error = "Internal server error while creating receipt",
        //             details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
        //         });
        //     }
        // }

        [HttpPost("receipts")]
        public async Task<IActionResult> CreateReceipt([FromBody] CreateReceiptDTO dto)
        {
            try
            {
                _logger.LogInformation("=== CreateReceipt Started ===");

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

                // Create receipt
                var receipt = await _receiptService.CreateReceiptAsync(
                    dto,
                    userIdGuid,
                    companyIdGuid,
                    fiscalYearIdGuid);

                // Prepare response
                var responseData = new
                {
                    success = true,
                    message = "Receipt saved successfully!",
                    data = new ReceiptResponseDTO
                    {
                        Receipt = new ReceiptInfoDTO
                        {
                            Id = receipt.Id,
                            BillNumber = receipt.BillNumber,
                            Date = receipt.Date,
                            TotalAmount = receipt.TotalAmount,
                            Description = receipt.Description,
                            Status = receipt.Status.ToString()
                        },
                        PrintUrl = $"/api/retailer/receipts/{receipt.Id}/print",
                        RedirectUrl = $"/retailer/receipts/{receipt.Id}/print"
                    }
                };

                return Ok(responseData);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in CreateReceipt");
                return BadRequest(new { success = false, error = ex.Message });
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
                        entries = editData.Entries,
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
        // [HttpPut("receipts/edit/{id}")]
        // public async Task<IActionResult> UpdateReceipt(Guid id, [FromBody] UpdateReceiptDTO request)
        // {
        //     try
        //     {
        //         _logger.LogInformation("=== UpdateReceipt Started for ID: {ReceiptId} ===", id);

        //         // Extract claims from JWT
        //         var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        //         var companyId = User.FindFirst("currentCompany")?.Value;
        //         var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
        //         var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

        //         // Validate user
        //         if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
        //         {
        //             return Unauthorized(new
        //             {
        //                 success = false,
        //                 error = "Invalid user token. Please login again."
        //             });
        //         }

        //         // Validate company
        //         if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
        //         {
        //             return BadRequest(new
        //             {
        //                 success = false,
        //                 error = "No company selected. Please select a company first."
        //             });
        //         }

        //         // Validate trade type
        //         if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
        //         {
        //             return StatusCode(403, new
        //             {
        //                 success = false,
        //                 error = "Access restricted to retailer accounts"
        //             });
        //         }

        //         // Handle fiscal year - get from claims first, then fallback
        //         Guid fiscalYearIdGuid;
        //         if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
        //         {
        //             // If not in claims, get active fiscal year for the company
        //             var activeFiscalYear = await _context.FiscalYears
        //                 .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

        //             if (activeFiscalYear == null)
        //             {
        //                 // Try to get any fiscal year as fallback
        //                 activeFiscalYear = await _context.FiscalYears
        //                     .Where(f => f.CompanyId == companyIdGuid)
        //                     .OrderByDescending(f => f.StartDate)
        //                     .FirstOrDefaultAsync();

        //                 if (activeFiscalYear == null)
        //                 {
        //                     return BadRequest(new
        //                     {
        //                         success = false,
        //                         error = "No fiscal year found for this company."
        //                     });
        //                 }
        //             }
        //             fiscalYearIdGuid = activeFiscalYear.Id;

        //             _logger.LogInformation($"Using fiscal year: {fiscalYearIdGuid}");
        //         }

        //         // Validate request
        //         if (!ModelState.IsValid)
        //         {
        //             var errors = ModelState.Values
        //                 .SelectMany(v => v.Errors)
        //                 .Select(e => e.ErrorMessage)
        //                 .ToList();

        //             return BadRequest(new
        //             {
        //                 success = false,
        //                 error = "Validation failed",
        //                 details = errors
        //             });
        //         }

        //         // Validate required fields
        //         if (request.AccountId == Guid.Empty)
        //         {
        //             return BadRequest(new
        //             {
        //                 success = false,
        //                 error = "Account ID is required"
        //             });
        //         }

        //         if (request.ReceiptAccountId == Guid.Empty)
        //         {
        //             return BadRequest(new
        //             {
        //                 success = false,
        //                 error = "Receipt account ID is required"
        //             });
        //         }

        //         if (request.Credit <= 0)
        //         {
        //             return BadRequest(new
        //             {
        //                 success = false,
        //                 error = "Credit amount must be greater than 0"
        //             });
        //         }

        //         // Validate dates based on company format
        //         var company = await _context.Companies.FindAsync(companyIdGuid);
        //         if (company != null)
        //         {
        //             bool isNepaliFormat = company.DateFormat == DateFormatEnum.Nepali;

        //             if (isNepaliFormat)
        //             {
        //                 if (request.NepaliDate == default)
        //                 {
        //                     return BadRequest(new
        //                     {
        //                         success = false,
        //                         error = "Invalid Nepali date"
        //                     });
        //                 }
        //             }
        //             else
        //             {
        //                 if (request.Date == default)
        //                 {
        //                     return BadRequest(new
        //                     {
        //                         success = false,
        //                         error = "Invalid date"
        //                     });
        //                 }
        //             }
        //         }

        //         // Update receipt using service
        //         var updatedReceipt = await _receiptService.UpdateReceiptAsync(
        //             id,
        //             request,
        //             companyIdGuid,
        //             fiscalYearIdGuid,
        //             userIdGuid
        //         );

        //         _logger.LogInformation($"Successfully updated receipt: {id}");

        //         // Prepare response
        //         var response = new
        //         {
        //             success = true,
        //             message = "Receipt updated successfully",
        //             data = new
        //             {
        //                 receipt = new
        //                 {
        //                     id = updatedReceipt.Id,
        //                     billNumber = updatedReceipt.BillNumber,
        //                     date = updatedReceipt.Date,
        //                     accountId = updatedReceipt.AccountId,
        //                     credit = updatedReceipt.Credit,
        //                     receiptAccountId = updatedReceipt.ReceiptAccountId,
        //                     description = updatedReceipt.Description
        //                 },
        //                 printUrl = $"/api/retailer/receipts/{updatedReceipt.Id}/direct-print"
        //             }
        //         };

        //         // If print was requested, add redirect URL
        //         if (request.Print == true)
        //         {
        //             return Ok(new
        //             {
        //                 success = true,
        //                 message = "Receipt updated successfully",
        //                 data = response.data,
        //                 redirectUrl = $"/api/retailer/receipts/{updatedReceipt.Id}/direct-print"
        //             });
        //         }

        //         return Ok(response);
        //     }
        //     catch (ArgumentException ex)
        //     {
        //         _logger.LogWarning(ex, "Validation error in UpdateReceipt");
        //         return BadRequest(new
        //         {
        //             success = false,
        //             error = ex.Message
        //         });
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error in UpdateReceipt for receipt {ReceiptId}", id);
        //         return StatusCode(500, new
        //         {
        //             success = false,
        //             error = "Internal server error while updating receipt",
        //             details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
        //         });
        //     }
        // }
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
                            totalAmount = updatedReceipt.TotalAmount,
                            description = updatedReceipt.Description,
                            entryCount = updatedReceipt.ReceiptEntries?.Count ?? 0
                        },
                        printUrl = $"/api/retailer/receipts/{updatedReceipt.Id}/print"
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
                        redirectUrl = $"/api/retailer/receipts/{updatedReceipt.Id}/print"
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

        // POST: api/retailer/receipts/cancel/{billNumber}
        [HttpPost("receipts/cancel/{billNumber}")]
        public async Task<IActionResult> CancelReceipt(string billNumber)
        {
            try
            {
                _logger.LogInformation("=== CancelReceipt Started for Bill Number: {BillNumber} ===", billNumber);

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
                        _logger.LogInformation("Starting transaction to cancel receipt: {BillNumber}", billNumber);

                        // Find the receipt by bill number and company
                        var receipt = await _context.Receipts
                            .FirstOrDefaultAsync(r => r.BillNumber == billNumber &&
                                                     r.CompanyId == companyIdGuid &&
                                                     r.FiscalYearId == fiscalYearIdGuid);

                        if (receipt == null)
                        {
                            throw new ArgumentException($"Receipt with bill number {billNumber} not found");
                        }

                        // Check if already canceled
                        if (receipt.Status == ReceiptStatus.Canceled)
                        {
                            throw new ArgumentException($"Receipt {billNumber} is already canceled");
                        }

                        // Update receipt status to Canceled
                        receipt.Status = ReceiptStatus.Canceled;
                        receipt.IsActive = false;
                        receipt.UpdatedAt = DateTime.UtcNow;

                        _context.Receipts.Update(receipt);
                        _logger.LogInformation("Updated receipt status to Canceled for {BillNumber}", billNumber);

                        // Update related transactions
                        var transactionsUpdated = await _context.Transactions
                            .Where(t => t.BillNumber == billNumber &&
                                       t.Type == TransactionType.Rcpt &&
                                       t.CompanyId == companyIdGuid)
                            .ExecuteUpdateAsync(setters => setters
                                .SetProperty(t => t.Status, TransactionStatus.Canceled)
                                .SetProperty(t => t.IsActive, false));

                        _logger.LogInformation("Updated {Count} related transactions for {BillNumber}", transactionsUpdated, billNumber);

                        // Save all changes
                        await _context.SaveChangesAsync();

                        // Commit transaction
                        await transaction.CommitAsync();
                        _logger.LogInformation("Transaction committed successfully for canceling receipt {BillNumber}", billNumber);

                        return new
                        {
                            success = true,
                            message = "Receipt and related transactions have been canceled.",
                            billNumber = billNumber
                        };
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error during transaction for canceling receipt {BillNumber}", billNumber);
                        await transaction.RollbackAsync();
                        throw;
                    }
                });

                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in CancelReceipt for bill {BillNumber}", billNumber);
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in CancelReceipt for bill {BillNumber}", billNumber);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while canceling receipt",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // POST: api/retailer/receipts/reactivate/{billNumber}
        [HttpPost("receipts/reactivate/{billNumber}")]
        public async Task<IActionResult> ReactivateReceipt(string billNumber)
        {
            try
            {
                _logger.LogInformation("=== ReactivateReceipt Started for Bill Number: {BillNumber} ===", billNumber);

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
                        _logger.LogInformation("Starting transaction to reactivate receipt: {BillNumber}", billNumber);

                        // Find the receipt by bill number and company
                        var receipt = await _context.Receipts
                            .FirstOrDefaultAsync(r => r.BillNumber == billNumber &&
                                                     r.CompanyId == companyIdGuid &&
                                                     r.FiscalYearId == fiscalYearIdGuid);

                        if (receipt == null)
                        {
                            throw new ArgumentException($"Receipt with bill number {billNumber} not found");
                        }

                        // Check if already active
                        if (receipt.Status == ReceiptStatus.Active)
                        {
                            throw new ArgumentException($"Receipt {billNumber} is already active");
                        }

                        // Update receipt status to Active
                        receipt.Status = ReceiptStatus.Active;
                        receipt.IsActive = true;
                        receipt.UpdatedAt = DateTime.UtcNow;

                        _context.Receipts.Update(receipt);
                        _logger.LogInformation("Updated receipt status to Active for {BillNumber}", billNumber);

                        // Reactivate related transactions
                        var transactionsUpdated = await _context.Transactions
                            .Where(t => t.BillNumber == billNumber &&
                                       t.Type == TransactionType.Rcpt &&
                                       t.CompanyId == companyIdGuid)
                            .ExecuteUpdateAsync(setters => setters
                                .SetProperty(t => t.Status, TransactionStatus.Active)
                                .SetProperty(t => t.IsActive, true));

                        _logger.LogInformation("Reactivated {Count} related transactions for {BillNumber}", transactionsUpdated, billNumber);

                        // Save all changes
                        await _context.SaveChangesAsync();

                        // Commit transaction
                        await transaction.CommitAsync();
                        _logger.LogInformation("Transaction committed successfully for reactivating receipt {BillNumber}", billNumber);

                        return new
                        {
                            success = true,
                            message = "Receipt and related transactions have been reactivated.",
                            billNumber = billNumber
                        };
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error during transaction for reactivating receipt {BillNumber}", billNumber);
                        await transaction.RollbackAsync();
                        throw;
                    }
                });

                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in ReactivateReceipt for bill {BillNumber}", billNumber);
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in ReactivateReceipt for bill {BillNumber}", billNumber);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while reactivating receipt",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/receipts/{id}/print
        [HttpGet("receipts/{id}/print")]
        public async Task<IActionResult> GetReceiptForPrint(Guid id)
        {
            try
            {
                _logger.LogInformation("=== GetReceiptForPrint Started for ID: {ReceiptId} ===", id);

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

                // Get receipt print data from service
                var printData = await _receiptService.GetReceiptForPrintAsync(
                    id,
                    companyIdGuid,
                    userIdGuid,
                    fiscalYearIdGuid);

                if (printData == null || printData.Receipt == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Receipt voucher not found"
                    });
                }

                var response = new
                {
                    success = true,
                    data = printData
                };

                _logger.LogInformation($"Successfully fetched receipt print data for ID: {id}");

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in GetReceiptForPrint");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetReceiptForPrint for receipt {ReceiptId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching receipt for printing",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

    }
}