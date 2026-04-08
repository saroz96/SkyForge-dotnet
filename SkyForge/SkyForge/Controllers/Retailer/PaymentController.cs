using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkyForge.Data;
using SkyForge.Services.Retailer.PaymentServices;
using SkyForge.Models.CompanyModel;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using SkyForge.Models.Shared;
using SkyForge.Dto.RetailerDto.PaymentDto;
using SkyForge.Models.Retailer.PaymentModel;
using SkyForge.Models.Retailer.TransactionModel;

namespace SkyForge.Controllers.Retailer
{
    [ApiController]
    [Route("api/retailer")]
    [Authorize]
    public class PaymentController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<PaymentController> _logger;
        private readonly IPaymentService _paymentService;

        public PaymentController(
            ApplicationDbContext context,
            ILogger<PaymentController> logger,
            IPaymentService paymentService)
        {
            _context = context;
            _logger = logger;
            _paymentService = paymentService;
        }

        // GET: api/retailer/payments
        [HttpGet("payments")]
        public async Task<IActionResult> GetPaymentFormData()
        {
            try
            {
                _logger.LogInformation("=== GetPaymentFormData Started ===");

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

                var paymentFormData = await _paymentService.GetPaymentFormDataAsync(
                    companyIdGuid,
                    fiscalYearIdGuid,
                    userIdGuid);

                if (paymentFormData == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Failed to load payment form data"
                    });
                }

                return Ok(new
                {
                    success = true,
                    data = paymentFormData
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetPaymentFormData");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching payment form data",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        [HttpGet("payments/next-number")]
        public async Task<IActionResult> GetNextPaymentsBillNumber()
        {
            try
            {
                _logger.LogInformation("=== GetNextPaymentsBillNumber Started ===");

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

                var nextBillNumber = await _paymentService.GetNextBillNumberAsync(companyIdGuid, fiscalYearIdGuid);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        nextPaymentsBillNumber = nextBillNumber
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetNextPaymentsBillNumber");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/payments/current-number
        [HttpGet("payments/current-number")]
        public async Task<IActionResult> GetCurrentPaymentsBillNumber()
        {
            try
            {
                _logger.LogInformation("=== GetCurrentPaymentsBillNumber Started ===");

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

                var currentBillNumber = await _paymentService.GetCurrentBillNumberAsync(companyIdGuid, fiscalYear.Id);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        currentPaymentsBillNumber = currentBillNumber
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCurrentPaymentsBillNumber");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error"
                });
            }
        }

        // [HttpPost("payments")]
        // public async Task<IActionResult> CreatePayment([FromBody] CreatePaymentDTO dto)
        // {
        //     try
        //     {
        //         _logger.LogInformation("=== CreatePayment Started ===");

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

        //         if (dto.PaymentAccountId == Guid.Empty)
        //         {
        //             return BadRequest(new
        //             {
        //                 success = false,
        //                 error = "Payment account ID is required."
        //             });
        //         }

        //         if (dto.Debit <= 0)
        //         {
        //             return BadRequest(new
        //             {
        //                 success = false,
        //                 error = "Debit amount must be greater than 0."
        //             });
        //         }

        //         var payment = await _paymentService.CreatePaymentAsync(
        //             dto,
        //             userIdGuid,
        //             companyIdGuid,
        //             fiscalYearIdGuid);

        //         // Prepare response
        //         var response = new
        //         {
        //             success = true,
        //             message = "Payment created successfully",
        //             data = new
        //             {
        //                 payment = new
        //                 {
        //                     id = payment.Id,
        //                     billNumber = payment.BillNumber,
        //                     date = payment.Date,
        //                     accountId = payment.AccountId,
        //                     debit = payment.Debit,
        //                     paymentAccountId = payment.PaymentAccountId,
        //                     description = payment.Description,
        //                     instType = payment.InstType,
        //                     instNo = payment.InstNo
        //                 }
        //             }
        //         };

        //         return Ok(response);
        //     }
        //     catch (ArgumentException ex)
        //     {
        //         _logger.LogWarning(ex, "Validation error in CreatePayment");
        //         return BadRequest(new
        //         {
        //             success = false,
        //             error = ex.Message
        //         });
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error in CreatePayment");
        //         return StatusCode(500, new
        //         {
        //             success = false,
        //             error = "Internal server error while creating payment",
        //             details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
        //         });
        //     }
        // }

        [HttpPost("payments")]
        public async Task<IActionResult> CreatePayment([FromBody] CreatePaymentDTO dto)
        {
            try
            {
                _logger.LogInformation("=== CreatePayment Started ===");

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

                // Create payment
                var payment = await _paymentService.CreatePaymentAsync(
                    dto,
                    userIdGuid,
                    companyIdGuid,
                    fiscalYearIdGuid);

                // Prepare response
                var responseData = new
                {
                    success = true,
                    message = "Payment saved successfully!",
                    data = new PaymentResponseDTO
                    {
                        Payment = new PaymentInfoDTO
                        {
                            Id = payment.Id,
                            BillNumber = payment.BillNumber,
                            Date = payment.Date,
                            TotalAmount = payment.TotalAmount,
                            Description = payment.Description,
                            Status = payment.Status.ToString()
                        },
                        PrintUrl = $"/api/retailer/payments/{payment.Id}/print",
                        RedirectUrl = $"/retailer/payments/{payment.Id}/print"
                    }
                };

                return Ok(responseData);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in CreatePayment");
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in CreatePayment");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while creating payment",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/payment/finds
        [HttpGet("payment/finds")]
        public async Task<IActionResult> GetPaymentFinds()
        {
            try
            {
                _logger.LogInformation("=== GetPaymentFinds Started ===");

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

                var result = await _paymentService.GetPaymentFindsAsync(
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
                _logger.LogError(ex, "Error in GetPaymentFinds");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error"
                });
            }
        }

        [HttpGet("payment/get-id-by-number")]
        public async Task<IActionResult> GetPaymentBillIdByNumber([FromQuery] string billNumber)
        {
            try
            {
                _logger.LogInformation("=== GetPaymentBillIdByNumber Started for Bill Number: {BillNumber} ===", billNumber);

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
                var result = await _paymentService.GetPaymentBillIdByNumberAsync(
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
                _logger.LogWarning(ex, "Validation error in GetPaymentBillIdByNumber");
                return NotFound(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetPaymentBillIdByNumber for bill {BillNumber}", billNumber);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching bill ID"
                });
            }
        }

        // GET: api/retailer/payment/edit/{id}
        // [HttpGet("payment/edit/{id}")]
        // public async Task<IActionResult> GetPaymentEditData(Guid id)
        // {
        //     try
        //     {
        //         _logger.LogInformation("=== GetPaymentEditData Started for Payment ID: {PaymentId} ===", id);

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

        //         // Get payment edit data from service
        //         var editData = await _paymentService.GetPaymentEditDataAsync(
        //             id,
        //             companyIdGuid,
        //             fiscalYearIdGuid,
        //             userIdGuid);

        //         if (editData == null || editData.Payment == null)
        //         {
        //             return NotFound(new
        //             {
        //                 success = false,
        //                 error = "Payment voucher not found or does not belong to the selected company"
        //             });
        //         }

        //         var response = new
        //         {
        //             success = true,
        //             data = new
        //             {
        //                 company = new
        //                 {
        //                     id = editData.Company.Id,
        //                     name = editData.Company.Name,
        //                     address = editData.Company.Address,
        //                     city = editData.Company.City,
        //                     phone = editData.Company.Phone,
        //                     pan = editData.Company.Pan,
        //                     renewalDate = editData.Company.RenewalDate,
        //                     dateFormat = editData.Company.DateFormat,
        //                     vatEnabled = editData.Company.VatEnabled
        //                 },
        //                 payment = editData.Payment,
        //                 accounts = editData.Accounts,
        //                 cashAccounts = editData.CashAccounts,
        //                 bankAccounts = editData.BankAccounts,
        //                 paymentAccounts = editData.PaymentAccounts,
        //                 currentFiscalYear = editData.CurrentFiscalYear,
        //                 nepaliDate = editData.NepaliDate,
        //                 companyDateFormat = editData.CompanyDateFormat,
        //                 currentCompanyName = editData.CurrentCompanyName,
        //                 date = editData.CurrentDate,
        //                 user = editData.User,
        //                 isAdminOrSupervisor = editData.IsAdminOrSupervisor
        //             }
        //         };

        //         _logger.LogInformation($"Successfully fetched payment edit data for Payment ID: {id}");

        //         return Ok(response);
        //     }
        //     catch (ArgumentException ex)
        //     {
        //         _logger.LogWarning(ex, "Validation error in GetPaymentEditData");
        //         return BadRequest(new
        //         {
        //             success = false,
        //             error = ex.Message
        //         });
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error in GetPaymentEditData for payment {PaymentId}", id);
        //         return StatusCode(500, new
        //         {
        //             success = false,
        //             error = "Internal server error while fetching payment edit data",
        //             details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
        //         });
        //     }
        // }

        // GET: api/retailer/payment/edit/{id}
        [HttpGet("payment/edit/{id}")]
        public async Task<IActionResult> GetPaymentEditData(Guid id)
        {
            try
            {
                _logger.LogInformation("=== GetPaymentEditData Started for Payment ID: {PaymentId} ===", id);

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

                // Get payment edit data from service
                var editData = await _paymentService.GetPaymentEditDataAsync(
                    id,
                    companyIdGuid,
                    fiscalYearIdGuid,
                    userIdGuid);

                if (editData == null || editData.Payment == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Payment voucher not found or does not belong to the selected company"
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
                        payment = editData.Payment,
                        entries = editData.Entries,  // <-- ADD THIS LINE - include entries
                        accounts = editData.Accounts,
                        cashAccounts = editData.CashAccounts,
                        bankAccounts = editData.BankAccounts,
                        paymentAccounts = editData.PaymentAccounts,
                        currentFiscalYear = editData.CurrentFiscalYear,
                        nepaliDate = editData.NepaliDate,
                        companyDateFormat = editData.CompanyDateFormat,
                        currentCompanyName = editData.CurrentCompanyName,
                        date = editData.CurrentDate,
                        user = editData.User,
                        isAdminOrSupervisor = editData.IsAdminOrSupervisor
                    }
                };

                _logger.LogInformation($"Successfully fetched payment edit data for Payment ID: {id}");

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in GetPaymentEditData");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetPaymentEditData for payment {PaymentId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching payment edit data",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // // PUT: api/retailer/payment/edit/{id}
        // [HttpPut("payment/edit/{id}")]
        // public async Task<IActionResult> UpdatePayment(Guid id, [FromBody] UpdatePaymentDTO request)
        // {
        //     try
        //     {
        //         _logger.LogInformation("=== UpdatePayment Started for ID: {PaymentId} ===", id);

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

        //         if (request.PaymentAccountId == Guid.Empty)
        //         {
        //             return BadRequest(new
        //             {
        //                 success = false,
        //                 error = "Payment account ID is required"
        //             });
        //         }

        //         if (request.Debit <= 0)
        //         {
        //             return BadRequest(new
        //             {
        //                 success = false,
        //                 error = "Debit amount must be greater than 0"
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

        //         // Update payment using service
        //         var updatedPayment = await _paymentService.UpdatePaymentAsync(
        //             id,
        //             request,
        //             companyIdGuid,
        //             fiscalYearIdGuid,
        //             userIdGuid
        //         );

        //         _logger.LogInformation($"Successfully updated payment: {id}");

        //         // Prepare response
        //         var response = new
        //         {
        //             success = true,
        //             message = "Payment updated successfully",
        //             data = new
        //             {
        //                 payment = new
        //                 {
        //                     id = updatedPayment.Id,
        //                     billNumber = updatedPayment.BillNumber,
        //                     date = updatedPayment.Date,
        //                     accountId = updatedPayment.AccountId,
        //                     debit = updatedPayment.Debit,
        //                     paymentAccountId = updatedPayment.PaymentAccountId,
        //                     description = updatedPayment.Description
        //                 },
        //                 printUrl = $"/api/retailer/payments/{updatedPayment.Id}/direct-print"
        //             }
        //         };

        //         return Ok(response);
        //     }
        //     catch (ArgumentException ex)
        //     {
        //         _logger.LogWarning(ex, "Validation error in UpdatePayment");
        //         return BadRequest(new
        //         {
        //             success = false,
        //             error = ex.Message
        //         });
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error in UpdatePayment for payment {PaymentId}", id);
        //         return StatusCode(500, new
        //         {
        //             success = false,
        //             error = "Internal server error while updating payment",
        //             details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
        //         });
        //     }
        // }

        // PUT: api/retailer/payments/edit/{id}
        [HttpPut("payments/edit/{id}")]
        public async Task<IActionResult> UpdatePayment(Guid id, [FromBody] UpdatePaymentDTO request)
        {
            try
            {
                _logger.LogInformation("=== UpdatePayment Started for ID: {PaymentId} ===", id);

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

                // Update payment using service
                var updatedPayment = await _paymentService.UpdatePaymentAsync(
                    id,
                    request,
                    companyIdGuid,
                    fiscalYearIdGuid,
                    userIdGuid
                );

                _logger.LogInformation($"Successfully updated payment: {id}");

                // Prepare response
                var response = new
                {
                    success = true,
                    message = "Payment updated successfully",
                    data = new
                    {
                        payment = new
                        {
                            id = updatedPayment.Id,
                            billNumber = updatedPayment.BillNumber,
                            date = updatedPayment.Date,
                            totalAmount = updatedPayment.TotalAmount,
                            description = updatedPayment.Description,
                            entryCount = updatedPayment.PaymentEntries?.Count ?? 0
                        },
                        printUrl = $"/api/retailer/payments/{updatedPayment.Id}/print"
                    }
                };

                // If print was requested, add redirect URL
                if (request.Print == true)
                {
                    return Ok(new
                    {
                        success = true,
                        message = "Payment updated successfully",
                        data = response.data,
                        redirectUrl = $"/api/retailer/payments/{updatedPayment.Id}/print"
                    });
                }

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in UpdatePayment");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in UpdatePayment for payment {PaymentId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while updating payment",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/payments/register
        [HttpGet("payments/register")]
        public async Task<IActionResult> GetPaymentsRegister([FromQuery] string? fromDate = null, [FromQuery] string? toDate = null)
        {
            try
            {
                _logger.LogInformation("=== GetPaymentsRegister Started ===");

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

                // Get payments register data from service
                var registerData = await _paymentService.GetPaymentsRegisterAsync(
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
                        payments = registerData.Payments,
                        fromDate = registerData.FromDate,
                        toDate = registerData.ToDate,
                        currentCompanyName = registerData.CurrentCompanyName,
                        companyDateFormat = registerData.CompanyDateFormat,
                        nepaliDate = registerData.NepaliDate,
                        isAdminOrSupervisor = isAdminOrSupervisor
                    },
                    meta = new
                    {
                        title = "Payments Register",
                        theme = registerData.UserPreferences?.Theme ?? "light"
                    }
                };

                _logger.LogInformation($"Successfully fetched payments register with {registerData.Payments.Count} payments");

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in GetPaymentsRegister");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetPaymentsRegister");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching payments register",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/payment/entry-data
        [HttpGet("payment/entry-data")]
        public async Task<IActionResult> GetPaymentEntryData()
        {
            try
            {
                _logger.LogInformation("=== GetPaymentEntryData Started ===");

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
                var purchaseReturnData = await _paymentService.GetPaymentEntryDataAsync(companyIdGuid, fiscalYear.Id, userIdGuid);

                var response = new
                {
                    success = true,
                    data = new
                    {
                        company = purchaseReturnData.Company,
                        accounts = purchaseReturnData.Accounts,
                        dates = purchaseReturnData.Dates,
                        currentFiscalYear = purchaseReturnData.CurrentFiscalYear,
                        userPreferences = purchaseReturnData.UserPreferences,
                        permissions = purchaseReturnData.Permissions,
                        currentCompanyName = purchaseReturnData.CurrentCompanyName
                    }
                };

                _logger.LogInformation($"Successfully fetched payment entry data for company {purchaseReturnData.Company.Name}");

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetPaymentEntryData");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/payments/{id}/print
        [HttpGet("payments/{id}/print")]
        public async Task<IActionResult> GetPaymentForPrint(Guid id)
        {
            try
            {
                _logger.LogInformation("=== GetPaymentForPrint Started for ID: {PaymentId} ===", id);

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

                // Get payment print data from service
                var printData = await _paymentService.GetPaymentForPrintAsync(
                    id,
                    companyIdGuid,
                    userIdGuid,
                    fiscalYearIdGuid);

                if (printData == null || printData.Payment == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Payment voucher not found"
                    });
                }

                var response = new
                {
                    success = true,
                    data = printData
                };

                _logger.LogInformation($"Successfully fetched payment print data for ID: {id}");

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in GetPaymentForPrint");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetPaymentForPrint for payment {PaymentId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching payment for printing",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // POST: api/retailer/payments/cancel/{billNumber}
        [HttpPost("payments/cancel/{billNumber}")]
        public async Task<IActionResult> CancelPayment(string billNumber)
        {
            try
            {
                _logger.LogInformation("=== CancelPayment Started for Bill Number: {BillNumber} ===", billNumber);

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
                        _logger.LogInformation("Starting transaction to cancel payment: {BillNumber}", billNumber);

                        // Find the payment by bill number and company
                        var payment = await _context.Payments
                            .FirstOrDefaultAsync(p => p.BillNumber == billNumber &&
                                                     p.CompanyId == companyIdGuid &&
                                                     p.FiscalYearId == fiscalYearIdGuid);

                        if (payment == null)
                        {
                            throw new ArgumentException($"Payment with bill number {billNumber} not found");
                        }

                        // Check if already canceled
                        if (payment.Status == PaymentStatus.Canceled)
                        {
                            throw new ArgumentException($"Payment {billNumber} is already canceled");
                        }

                        // Update payment status to Canceled
                        payment.Status = PaymentStatus.Canceled;
                        payment.IsActive = false;
                        payment.UpdatedAt = DateTime.UtcNow;

                        _context.Payments.Update(payment);
                        _logger.LogInformation("Updated payment status to Canceled for {BillNumber}", billNumber);

                        // Update related transactions
                        var transactionsUpdated = await _context.Transactions
                            .Where(t => t.BillNumber == billNumber &&
                                       t.Type == TransactionType.Pymt &&
                                       t.CompanyId == companyIdGuid)
                            .ExecuteUpdateAsync(setters => setters
                                .SetProperty(t => t.Status, TransactionStatus.Canceled)
                                .SetProperty(t => t.IsActive, false));

                        _logger.LogInformation("Updated {Count} related transactions for {BillNumber}", transactionsUpdated, billNumber);

                        // Save all changes
                        await _context.SaveChangesAsync();

                        // Commit transaction
                        await transaction.CommitAsync();
                        _logger.LogInformation("Transaction committed successfully for canceling payment {BillNumber}", billNumber);

                        return new
                        {
                            success = true,
                            message = "Payment and related transactions have been canceled.",
                            billNumber = billNumber
                        };
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error during transaction for canceling payment {BillNumber}", billNumber);
                        await transaction.RollbackAsync();
                        throw;
                    }
                });

                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in CancelPayment for bill {BillNumber}", billNumber);
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in CancelPayment for bill {BillNumber}", billNumber);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while canceling payment",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // POST: api/retailer/payments/reactivate/{billNumber}
        [HttpPost("payments/reactivate/{billNumber}")]
        public async Task<IActionResult> ReactivatePayment(string billNumber)
        {
            try
            {
                _logger.LogInformation("=== ReactivatePayment Started for Bill Number: {BillNumber} ===", billNumber);

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
                        _logger.LogInformation("Starting transaction to reactivate payment: {BillNumber}", billNumber);

                        // Find the payment by bill number and company
                        var payment = await _context.Payments
                            .FirstOrDefaultAsync(p => p.BillNumber == billNumber &&
                                                     p.CompanyId == companyIdGuid &&
                                                     p.FiscalYearId == fiscalYearIdGuid);

                        if (payment == null)
                        {
                            throw new ArgumentException($"Payment with bill number {billNumber} not found");
                        }

                        // Check if already active
                        if (payment.Status == PaymentStatus.Active)
                        {
                            throw new ArgumentException($"Payment {billNumber} is already active");
                        }

                        // Update payment status to Active
                        payment.Status = PaymentStatus.Active;
                        payment.IsActive = true;
                        payment.UpdatedAt = DateTime.UtcNow;

                        _context.Payments.Update(payment);
                        _logger.LogInformation("Updated payment status to Active for {BillNumber}", billNumber);

                        // Reactivate related transactions
                        var transactionsUpdated = await _context.Transactions
                            .Where(t => t.BillNumber == billNumber &&
                                       t.Type == TransactionType.Pymt &&
                                       t.CompanyId == companyIdGuid)
                            .ExecuteUpdateAsync(setters => setters
                                .SetProperty(t => t.Status, TransactionStatus.Active)
                                .SetProperty(t => t.IsActive, true));

                        _logger.LogInformation("Reactivated {Count} related transactions for {BillNumber}", transactionsUpdated, billNumber);

                        // Save all changes
                        await _context.SaveChangesAsync();

                        // Commit transaction
                        await transaction.CommitAsync();
                        _logger.LogInformation("Transaction committed successfully for reactivating payment {BillNumber}", billNumber);

                        return new
                        {
                            success = true,
                            message = "Payment and related transactions have been reactivated.",
                            billNumber = billNumber
                        };
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error during transaction for reactivating payment {BillNumber}", billNumber);
                        await transaction.RollbackAsync();
                        throw;
                    }
                });

                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in ReactivatePayment for bill {BillNumber}", billNumber);
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in ReactivatePayment for bill {BillNumber}", billNumber);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while reactivating payment",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

    }
}

