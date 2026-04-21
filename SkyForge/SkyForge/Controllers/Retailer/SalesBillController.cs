using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkyForge.Data;
using SkyForge.Services.Retailer.SalesBillServices;
using SkyForge.Models.CompanyModel;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using SkyForge.Models.Shared;
using SkyForge.Dto.RetailerDto.SalesBillDto;
using SkyForge.Dto.RetailerDto;


namespace SkyForge.Controllers.Retailer
{
    [ApiController]
    [Route("api/retailer")]
    [Authorize]
    public class SalesBillController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<SalesBillController> _logger;
        private readonly ISalesBillService _salesBillService;

        public SalesBillController(
            ApplicationDbContext context,
            ILogger<SalesBillController> logger,
            ISalesBillService salesBillService)
        {
            _context = context;
            _logger = logger;
            _salesBillService = salesBillService;
        }

        // GET: api/retailer/credit-sales
        [HttpGet("credit-sales")]
        public async Task<IActionResult> GetCreditSalesData()
        {
            try
            {
                _logger.LogInformation("=== GetCreditSalesData Started ===");

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

                var creditSalesData = await _salesBillService.GetCreditSalesDataAsync(
                    companyIdGuid,
                    fiscalYearIdGuid,
                    userIdGuid);

                return Ok(new
                {
                    success = true,
                    data = creditSalesData
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCreditSalesData");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching credit sales data",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }


        [HttpGet("credit-sales/next-number")]
        public async Task<IActionResult> GetNextCreditSalesBillNumber()
        {
            try
            {
                _logger.LogInformation("=== GetNextCreditSalesBillNumber Started ===");

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

                var nextBillNumber = await _salesBillService.GetNextCreditSalesBillNumberAsync(companyIdGuid, fiscalYearIdGuid);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        nextCreditSalesBillNumber = nextBillNumber
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetNextCreditSalesBillNumber");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/credit-sales/current-number
        [HttpGet("credit-sales/current-number")]
        public async Task<IActionResult> GetCurrentCreditSalesBillNumber()
        {
            try
            {
                _logger.LogInformation("=== GetCurrentCreditSalesBillNumber Started ===");

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

                var currentBillNumber = await _salesBillService.GetCurrentCreditSalesBillNumberAsync(companyIdGuid, fiscalYear.Id);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        currentCreditSalesBillNumber = currentBillNumber
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCurrentCreditSalesBillNumber");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error"
                });
            }
        }

        // POST: api/retailer/credit-sales
        [HttpPost("credit-sales")]
        public async Task<IActionResult> CreateCreditSales([FromBody] CreateSalesBillDTO dto)
        {
            try
            {
                _logger.LogInformation("=== CreateCreditSales Started ===");

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
                if (dto.AccountId == null || dto.AccountId == Guid.Empty)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Account ID is required."
                    });
                }

                if (dto.Items == null || dto.Items.Count == 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "At least one item is required."
                    });
                }

                // Validate calculated amounts are provided (as per requirement: accept from frontend, don't calculate)
                if (!dto.SubTotal.HasValue || !dto.TaxableAmount.HasValue ||
                    !dto.NonVatSales.HasValue || !dto.TotalAmount.HasValue)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "SubTotal, TaxableAmount, NonVatSales, and TotalAmount are required from frontend."
                    });
                }

                if (string.IsNullOrEmpty(dto.PaymentMode))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Invalid payment mode."
                    });
                }

                // Create sales bill
                var result = await _salesBillService.CreateCreditSalesBillAsync(
                    dto, userIdGuid, companyIdGuid, fiscalYearIdGuid);

                // Prepare response (matching Express.js structure)
                var response = new
                {
                    success = true,
                    message = "Sales bill saved successfully!",
                    data = new
                    {
                        bill = new
                        {
                            _id = result.Id,
                            billNumber = result.BillNumber,
                            account = new
                            {
                                id = result.AccountId,
                                name = result.Account?.Name,
                                address = result.Account?.Address,
                                pan = result.Account?.Pan,
                            },
                            totalAmount = result.TotalAmount,
                            date = result.Date,
                            transactionDate = result.TransactionDate,
                            items = result.Items.Select(i => new
                            {
                                item = i.ItemId,
                                quantity = i.Quantity,
                                price = i.Price,
                                puPrice = i.PuPrice,
                                batchNumber = i.BatchNumber,
                                expiryDate = i.ExpiryDate,
                                vatStatus = i.VatStatus
                            }),
                            vatAmount = result.VatAmount,
                            discountAmount = result.DiscountAmount,
                            roundOffAmount = result.RoundOffAmount,
                            subTotal = result.SubTotal,
                            taxableAmount = result.TaxableAmount,
                            nonVatSales = result.NonVatSales,
                            isVatExempt = result.IsVatExempt,
                            // isVatAll = result.IsVatAll,
                            vatPercentage = result.VatPercentage,
                            paymentMode = result.PaymentMode,
                            cashAccount = result.CashAccount,
                            cashAccountAddress = result.CashAccountAddress,
                            cashAccountPan = result.CashAccountPan,
                            cashAccountEmail = result.CashAccountEmail,
                            cashAccountPhone = result.CashAccountPhone
                        }
                    },
                    redirectUrl = "/bills"  // Default redirect
                };

                return StatusCode(201, response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in CreateCreditSales");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Stock validation error in CreateCreditSales");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in CreateCreditSales");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Error creating sales bill",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/credit-sales/open
        [HttpGet("credit-sales/open")]
        public async Task<IActionResult> GetCreditSalesOpenData()
        {
            try
            {
                _logger.LogInformation("=== GetCreditSalesOpenData Started ===");

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

                var creditSalesOpenData = await _salesBillService.GetCreditSalesOpenDataAsync(
                    companyIdGuid,
                    fiscalYearIdGuid,
                    userIdGuid);

                return Ok(new
                {
                    success = true,
                    data = creditSalesOpenData
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCreditSalesOpenData");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching credit sales open data",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        [HttpGet("credit-sales/open/next-number")]
        public async Task<IActionResult> GetNextCreditSalesOpenBillNumber()
        {
            try
            {
                _logger.LogInformation("=== GetNextCreditSalesOpenBillNumber Started ===");

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

                var nextBillNumber = await _salesBillService.GetNextCreditSalesOpenBillNumberAsync(companyIdGuid, fiscalYearIdGuid);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        nextCreditSalesOpenBillNumber = nextBillNumber
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetNextCreditSalesOpenBillNumber");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/credit-sales/current-number
        [HttpGet("credit-sales/open/current-number")]
        public async Task<IActionResult> GetCurrentCreditSalesOpenBillNumber()
        {
            try
            {
                _logger.LogInformation("=== GetCurrentCreditSalesBillNumber Started ===");

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

                var currentBillNumber = await _salesBillService.GetCurrentCreditSalesOpenBillNumberAsync(companyIdGuid, fiscalYear.Id);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        currentCreditSalesOpenBillNumber = currentBillNumber
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetNextCreditSalesOpenBillNumber");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error"
                });
            }
        }

        // POST: api/retailer/credit-sales/open
        [HttpPost("credit-sales/open")]
        public async Task<IActionResult> CreateCreditSalesOpen([FromBody] CreateSalesOpenDTO dto)
        {
            try
            {
                _logger.LogInformation("=== CreateCreditSalesOpen Started ===");

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
                if (dto.AccountId == null || dto.AccountId == Guid.Empty)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Account ID is required."
                    });
                }

                if (dto.Items == null || dto.Items.Count == 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "At least one item is required."
                    });
                }

                // Validate VAT selection
                if (string.IsNullOrEmpty(dto.IsVatExempt))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Invalid VAT selection."
                    });
                }

                // Validate payment mode
                if (string.IsNullOrEmpty(dto.PaymentMode))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Invalid payment mode."
                    });
                }

                // Validate calculated amounts are provided
                if (!dto.SubTotal.HasValue || !dto.TaxableAmount.HasValue ||
                    !dto.NonTaxableAmount.HasValue || !dto.TotalAmount.HasValue)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "SubTotal, TaxableAmount, NonTaxableAmount, and TotalAmount are required from frontend."
                    });
                }

                // Create credit sales open bill
                var result = await _salesBillService.CreateCreditSalesOpenBillAsync(
                    dto, userIdGuid, companyIdGuid, fiscalYearIdGuid);

                // Prepare response
                var response = new
                {
                    success = true,
                    message = "Bill created successfully",
                    bill = new
                    {
                        _id = result.Id,
                        billNumber = result.BillNumber,
                        account = result.AccountId,
                        totalAmount = result.TotalAmount,
                        date = result.Date,
                        transactionDate = result.TransactionDate
                    },
                    printUrl = Request.Query["print"] == "true" ? $"/bills/{result.Id}/direct-print/credit-open" : null
                };

                return StatusCode(201, response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in CreateCreditSalesOpen");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Stock validation error in CreateCreditSalesOpen");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message,
                    details = ex.Data.Count > 0 ? ex.Data : null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in CreateCreditSalesOpen");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Error creating credit sales open bill",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }


        // GET: api/retailer/credit-sales/finds
        [HttpGet("credit-sales/finds")]
        public async Task<IActionResult> GetCreditSalesFinds()
        {
            try
            {
                _logger.LogInformation("=== GetCreditSalesFinds Started ===");

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

                // Get credit sales finds data from service
                var result = await _salesBillService.GetCreditSalesFindsAsync(
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
                _logger.LogError(ex, "Error in GetCreditSalesFinds");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error"
                });
            }
        }

        // GET: api/retailer/credit-sales/check-editable
        [HttpGet("credit-sales/check-editable")]
        public async Task<IActionResult> CheckCreditSalesBillEditable([FromQuery] string billNumber)
        {
            try
            {
                _logger.LogInformation("Checking if bill {BillNumber} is editable", billNumber);

                // Extract claims from JWT token
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
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

                // Check if bill exists and is editable
                var bill = await _context.SalesBills
                    .Where(b => b.CompanyId == companyIdGuid &&
                               b.BillNumber == billNumber)
                    .Select(b => new
                    {
                        b.Id,
                        b.BillNumber,
                        b.CashAccount,
                        b.PaymentMode
                    })
                    .FirstOrDefaultAsync();

                if (bill == null)
                {
                    return Ok(new
                    {
                        success = false,
                        error = "Voucher not found",
                        isEditable = false
                    });
                }

                // Bill is not editable if CashAccount is not null
                bool isEditable = bill.CashAccount == null;

                return Ok(new
                {
                    success = true,
                    isEditable = isEditable,
                    billNumber = bill.BillNumber,
                    message = isEditable ?
                        "Voucher is editable" :
                        "This is a cash sales voucher and cannot be edited as credit sales",
                    hasCashAccount = bill.CashAccount != null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking if bill is editable for number: {BillNumber}", billNumber);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error"
                });
            }
        }

        [HttpGet("credit-sales/find-party")]
        public async Task<IActionResult> GetCreditSalesPartyInfo([FromQuery] string billNumber)
        {
            try
            {
                _logger.LogInformation("=== GetCreditSalesPartyInfo Started ===");

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

                // Get credit sales party info from service
                var result = await _salesBillService.GetCreditSalesPartyInfoAsync(
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
                _logger.LogError(ex, "Error in GetCreditSalesPartyInfo");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching voucher party info"
                });
            }
        }

        [HttpPut("credit-sales/change-party/{billNumber}")]
        public async Task<IActionResult> ChangeCreditSalesParty([FromRoute] string billNumber, [FromBody] ChangeCreditSalesPartyRequestDTO request)
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
                var result = await _salesBillService.ChangeCreditSalesPartyAsync(
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

        [HttpGet("credit-sales/get-id-by-number")]
        public async Task<IActionResult> GetCreditSalesBillIdByNumber([FromQuery] string billNumber)
        {
            try
            {
                _logger.LogInformation("=== GetCreditSalesBillIdByNumber Started for Bill Number: {BillNumber} ===", billNumber);

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
                var result = await _salesBillService.GetCreditSalesBillIdByNumberAsync(
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
                _logger.LogWarning(ex, "Validation error in GetCreditSalesBillIdByNumber");
                return NotFound(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCreditSalesBillIdByNumber for bill {BillNumber}", billNumber);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching bill ID"
                });
            }
        }

        // GET: api/retailer/credit-sales/edit/{id}
        [HttpGet("credit-sales/edit/{id}")]
        public async Task<IActionResult> GetCreditSalesEditData(Guid id)
        {
            try
            {
                _logger.LogInformation("=== GetCreditSalesEditData Started for Bill ID: {BillId} ===", id);

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

                // Get credit sales edit data from service
                var editData = await _salesBillService.GetCreditSalesEditDataAsync(
                    id,
                    companyIdGuid,
                    fiscalYearIdGuid,
                    userIdGuid);

                if (editData == null || editData.SalesBill == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Credit sales bill not found or does not belong to the selected company"
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
                        salesBill = editData.SalesBill,
                        items = editData.Items,
                        accounts = editData.Accounts,
                        user = editData.User
                    }
                };

                _logger.LogInformation($"Successfully fetched credit sales edit data for Bill ID: {id}");

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in GetCreditSalesEditData");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCreditSalesEditData for bill {BillId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching credit sales edit data",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // PUT: api/retailer/credit-sales/edit/{id}
        [HttpPut("credit-sales/edit/{id}")]
        public async Task<IActionResult> UpdateCreditSalesBill(Guid id, [FromBody] UpdateSalesBillDTO dto)
        {
            try
            {
                _logger.LogInformation("=== UpdateCreditSalesBill Started for Bill ID: {BillId} ===", id);

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
                if (dto.AccountId == null || dto.AccountId == Guid.Empty)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Account ID is required."
                    });
                }

                if (dto.Items == null || dto.Items.Count == 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "At least one item is required."
                    });
                }

                // Validate VAT selection
                if (string.IsNullOrEmpty(dto.IsVatExempt))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Invalid VAT selection."
                    });
                }

                // Validate payment mode
                if (string.IsNullOrEmpty(dto.PaymentMode))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Invalid payment mode."
                    });
                }

                // Validate calculated amounts are provided
                if (!dto.SubTotal.HasValue || !dto.TaxableAmount.HasValue ||
                    !dto.NonTaxableAmount.HasValue || !dto.TotalAmount.HasValue)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "SubTotal, TaxableAmount, NonTaxableAmount, and TotalAmount are required from frontend."
                    });
                }

                // Update credit sales bill
                var result = await _salesBillService.UpdateCreditSalesBillAsync(
                    id, dto, userIdGuid, companyIdGuid, fiscalYearIdGuid);

                // Prepare response
                var response = new
                {
                    success = true,
                    message = "Bill updated successfully",
                    data = new
                    {
                        bill = new
                        {
                            _id = result.Id,
                            billNumber = result.BillNumber,
                            account = new
                            {
                                _id = result.AccountId,
                                name = result.Account?.Name
                            },
                            totalAmount = result.TotalAmount,
                            items = result.Items.Select(i => new
                            {
                                itemId = i.ItemId,
                                quantity = i.Quantity,
                                price = i.Price,
                                batchNumber = i.BatchNumber
                            }),
                            vatAmount = result.VatAmount,
                            discountAmount = result.DiscountAmount,
                            roundOffAmount = result.RoundOffAmount
                        }
                    }
                };

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in UpdateCreditSalesBill");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Stock validation error in UpdateCreditSalesBill");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message,
                    details = ex.Data.Count > 0 ? ex.Data : null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in UpdateCreditSalesBill for bill {BillId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Error updating credit sales bill",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/cash-sales
        [HttpGet("cash-sales")]
        public async Task<IActionResult> GetCashSalesData()
        {
            try
            {
                _logger.LogInformation("=== GetCashSalesData Started ===");

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

                var cashSalesData = await _salesBillService.GetCashSalesDataAsync(
                    companyIdGuid,
                    fiscalYearIdGuid,
                    userIdGuid);

                return Ok(new
                {
                    success = true,
                    data = cashSalesData
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCashSalesData");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching cash sales data",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }


        [HttpGet("cash-sales/next-number")]
        public async Task<IActionResult> GetNextCashSalesBillNumber()
        {
            try
            {
                _logger.LogInformation("=== GetNextCashSalesBillNumber Started ===");

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

                var nextBillNumber = await _salesBillService.GetNextCashSalesBillNumberAsync(companyIdGuid, fiscalYearIdGuid);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        nextCashSalesBillNumber = nextBillNumber
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetNextCreditSalesBillNumber");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/cash-sales/current-number
        [HttpGet("cash-sales/current-number")]
        public async Task<IActionResult> GetCurrentCashSalesBillNumber()
        {
            try
            {
                _logger.LogInformation("=== GetCurrentCashSalesBillNumber Started ===");

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

                var currentBillNumber = await _salesBillService.GetCurrentCashSalesBillNumberAsync(companyIdGuid, fiscalYear.Id);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        currentCashSalesBillNumber = currentBillNumber
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCurrentCashSalesBillNumber");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error"
                });
            }
        }

        // POST: api/retailer/cash-sales
        [HttpPost("cash-sales")]
        public async Task<IActionResult> CreateCashSales([FromBody] CreateSalesBillDTO dto)
        {
            try
            {
                _logger.LogInformation("=== CreateCashSales Started ===");

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

                // Cash sales specific validations
                if (string.IsNullOrEmpty(dto.CashAccount))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Cash account is required."
                    });
                }

                if (string.IsNullOrEmpty(dto.PaymentMode))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Invalid payment mode."
                    });
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

                // Validate calculated amounts are provided
                if (!dto.SubTotal.HasValue || !dto.TaxableAmount.HasValue ||
                    !dto.NonVatSales.HasValue || !dto.TotalAmount.HasValue)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "SubTotal, TaxableAmount, NonVatSales, and TotalAmount are required from frontend."
                    });
                }

                // Create cash sales bill
                var result = await _salesBillService.CreateCashSalesBillAsync(
                    dto, userIdGuid, companyIdGuid, fiscalYearIdGuid);

                // Prepare response
                var response = new
                {
                    success = true,
                    message = "Cash bill created successfully",
                    data = new
                    {
                        bill = new
                        {
                            _id = result.Id,
                            billNumber = result.BillNumber,
                            cashAccount = result.CashAccount,
                            cashAccountAddress = result.CashAccountAddress,
                            cashAccountPan = result.CashAccountPan,
                            cashAccountEmail = result.CashAccountEmail,
                            cashAccountPhone = result.CashAccountPhone,
                            totalAmount = result.TotalAmount,
                            date = result.Date,
                            transactionDate = result.TransactionDate,
                            items = result.Items.Select(i => new
                            {
                                item = i.ItemId,
                                quantity = i.Quantity,
                                price = i.Price,
                                puPrice = i.PuPrice,
                                batchNumber = i.BatchNumber,
                                expiryDate = i.ExpiryDate
                            }),
                            vatAmount = result.VatAmount,
                            discountAmount = result.DiscountAmount,
                            roundOffAmount = result.RoundOffAmount,
                            subTotal = result.SubTotal,
                            taxableAmount = result.TaxableAmount,
                            nonVatSales = result.NonVatSales,
                            isVatExempt = result.IsVatExempt,
                            isVatAll = result.IsVatAll,
                            vatPercentage = result.VatPercentage,
                            paymentMode = result.PaymentMode
                        }
                    },
                };

                return StatusCode(201, response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in CreateCashSales");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Stock validation error in CreateCashSales");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in CreateCashSales");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Error creating cash sales bill",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/cash-sales/open
        [HttpGet("cash-sales/open")]
        public async Task<IActionResult> GetCashSalesOpenData()
        {
            try
            {
                _logger.LogInformation("=== GetCashSalesOpenData Started ===");

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

                var cashSalesOpenData = await _salesBillService.GetCashSalesOpenDataAsync(
                    companyIdGuid,
                    fiscalYearIdGuid,
                    userIdGuid);

                return Ok(new
                {
                    success = true,
                    data = cashSalesOpenData
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCashSalesOpenData");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching cash sales open data",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        [HttpGet("cash-sales/open/next-number")]
        public async Task<IActionResult> GetNextCashSalesOpenBillNumber()
        {
            try
            {
                _logger.LogInformation("=== GetNextCashSalesOpenBillNumber Started ===");

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

                var nextBillNumber = await _salesBillService.GetNextCashSalesOpenBillNumberAsync(companyIdGuid, fiscalYearIdGuid);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        nextCashSalesOpenBillNumber = nextBillNumber
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetNextCashSalesOpenBillNumber");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/cash-sales/current-number
        [HttpGet("cash-sales/open/current-number")]
        public async Task<IActionResult> GetCurrentCashSalesOpenBillNumber()
        {
            try
            {
                _logger.LogInformation("=== GetCurrentCashSalesOpenBillNumber Started ===");

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

                var currentBillNumber = await _salesBillService.GetCurrentCashSalesOpenBillNumberAsync(companyIdGuid, fiscalYear.Id);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        currentCashSalesOpenBillNumber = currentBillNumber
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetNextCashSalesOpenBillNumber");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error"
                });
            }
        }

        // POST: api/retailer/cash-sales/open
        [HttpPost("cash-sales/open")]
        public async Task<IActionResult> CreateCashSalesOpen([FromBody] CreateSalesOpenDTO dto)
        {
            try
            {
                _logger.LogInformation("=== CreateCashSalesOpen Started ===");

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

                // Validate VAT selection
                if (string.IsNullOrEmpty(dto.IsVatExempt))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Invalid VAT selection."
                    });
                }

                // Validate payment mode
                if (string.IsNullOrEmpty(dto.PaymentMode))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Invalid payment mode."
                    });
                }

                // Validate cash account details for cash sales
                if (string.IsNullOrEmpty(dto.CashAccount))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Cash account name is required."
                    });
                }

                // Validate calculated amounts are provided
                if (!dto.SubTotal.HasValue || !dto.TaxableAmount.HasValue ||
                    !dto.NonTaxableAmount.HasValue || !dto.TotalAmount.HasValue)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "SubTotal, TaxableAmount, NonTaxableAmount, and TotalAmount are required from frontend."
                    });
                }

                // Create cash sales open bill
                var result = await _salesBillService.CreateCashSalesOpenBillAsync(
                    dto, userIdGuid, companyIdGuid, fiscalYearIdGuid);

                // Prepare response
                var response = new
                {
                    success = true,
                    message = "Cash sales bill created successfully",
                    data = new
                    {
                        bill = new
                        {
                            _id = result.Id,
                            billNumber = result.BillNumber,
                            cashAccount = result.CashAccount,
                            totalAmount = result.TotalAmount,
                            date = result.Date,
                            transactionDate = result.TransactionDate,
                            items = result.Items.Select(i => new
                            {
                                item = i.ItemId,
                                quantity = i.Quantity,
                                price = i.Price,
                                batchNumber = i.BatchNumber
                            }),
                            vatAmount = result.VatAmount,
                            discountAmount = result.DiscountAmount,
                            roundOffAmount = result.RoundOffAmount,
                            paymentMode = result.PaymentMode
                        }
                    },
                    printUrl = Request.Query["print"] == "true" ? $"/bills/{result.Id}/direct-print/cash-open" : null
                };

                return StatusCode(201, response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in CreateCashSalesOpen");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Stock validation error in CreateCashSalesOpen");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message,
                    details = ex.Data.Count > 0 ? ex.Data : null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in CreateCashSalesOpen");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Error creating cash sales open bill",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/cash-sales/finds
        [HttpGet("cash-sales/finds")]
        public async Task<IActionResult> GetCashSalesFinds()
        {
            try
            {
                _logger.LogInformation("=== GetCashSalesFinds Started ===");

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
                var result = await _salesBillService.GetCashSalesFindsAsync(
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
                _logger.LogError(ex, "Error in GetCashSalesFinds");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error"
                });
            }
        }

        // GET: api/retailer/credit-sales/check-editable
        [HttpGet("cash-sales/check-editable")]
        public async Task<IActionResult> CheckCashSalesBillEditable([FromQuery] string billNumber)
        {
            try
            {
                _logger.LogInformation("Checking if bill {BillNumber} is editable", billNumber);

                // Extract claims from JWT token
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
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

                // Check if bill exists and is editable
                var bill = await _context.SalesBills
                    .Where(b => b.CompanyId == companyIdGuid &&
                               b.BillNumber == billNumber)
                    .Select(b => new
                    {
                        b.Id,
                        b.BillNumber,
                        b.Account,
                        b.PaymentMode
                    })
                    .FirstOrDefaultAsync();

                if (bill == null)
                {
                    return Ok(new
                    {
                        success = false,
                        error = "Voucher not found",
                        isEditable = false
                    });
                }

                // Bill is not editable if Account is not null
                bool isEditable = bill.Account == null;

                return Ok(new
                {
                    success = true,
                    isEditable = isEditable,
                    billNumber = bill.BillNumber,
                    message = isEditable ?
                        "Voucher is editable" :
                        "This is a credit sales voucher and cannot be edited as cash sales",
                    hasCreditAccount = bill.Account != null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking if bill is editable for number: {BillNumber}", billNumber);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error"
                });
            }
        }

        [HttpGet("cash-sales/get-id-by-number")]
        public async Task<IActionResult> GetCashSalesBillIdByNumber([FromQuery] string billNumber)
        {
            try
            {
                _logger.LogInformation("=== GetCashSalesBillIdByNumber Started for Bill Number: {BillNumber} ===", billNumber);

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
                var result = await _salesBillService.GetCashSalesBillIdByNumberAsync(
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
                _logger.LogWarning(ex, "Validation error in GetCashSalesBillIdByNumber");
                return NotFound(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCashSalesBillIdByNumber for bill {BillNumber}", billNumber);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching bill ID"
                });
            }
        }

        // GET: api/retailer/cash-sales/edit/{id}
        [HttpGet("cash-sales/edit/{id}")]
        public async Task<IActionResult> GetCashSalesEditData(Guid id)
        {
            try
            {
                _logger.LogInformation("=== GetCashSalesEditData Started for Bill ID: {BillId} ===", id);

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

                // Get cash sales edit data from service
                var editData = await _salesBillService.GetCashSalesEditDataAsync(
                    id,
                    companyIdGuid,
                    fiscalYearIdGuid,
                    userIdGuid);

                if (editData == null || editData.SalesBill == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Cash sales bill not found or does not belong to the selected company"
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
                        salesBill = editData.SalesBill,
                        items = editData.Items,
                        accounts = editData.Accounts,
                        user = editData.User
                    }
                };

                _logger.LogInformation($"Successfully fetched cash sales edit data for Bill ID: {id}");

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in GetCashSalesEditData");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCashSalesEditData for bill {BillId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching cash sales edit data",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // PUT: api/retailer/cash-sales/edit/{id}
        [HttpPut("cash-sales/edit/{id}")]
        public async Task<IActionResult> UpdateCashSalesBill(Guid id, [FromBody] UpdateSalesBillDTO dto)
        {
            try
            {
                _logger.LogInformation("=== UpdateCashSalesBill Started for Bill ID: {BillId} ===", id);

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
                if (string.IsNullOrEmpty(dto.CashAccount))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Cash account name is required."
                    });
                }

                if (dto.Items == null || dto.Items.Count == 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "At least one item is required."
                    });
                }

                // Validate VAT selection
                if (string.IsNullOrEmpty(dto.IsVatExempt))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Invalid VAT selection."
                    });
                }

                // Validate payment mode
                if (string.IsNullOrEmpty(dto.PaymentMode))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Invalid payment mode."
                    });
                }

                // Validate calculated amounts are provided
                if (!dto.SubTotal.HasValue || !dto.TaxableAmount.HasValue ||
                    !dto.NonTaxableAmount.HasValue || !dto.TotalAmount.HasValue)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "SubTotal, TaxableAmount, NonTaxableAmount, and TotalAmount are required from frontend."
                    });
                }

                // Update cash sales bill
                var result = await _salesBillService.UpdateCashSalesBillAsync(
                    id, dto, userIdGuid, companyIdGuid, fiscalYearIdGuid);

                // Prepare response
                var response = new
                {
                    success = true,
                    message = "Cash sales bill updated successfully",
                    data = new
                    {
                        bill = new
                        {
                            _id = result.Id,
                            billNumber = result.BillNumber,
                            cashAccount = result.CashAccount,
                            totalAmount = result.TotalAmount,
                            items = result.Items.Select(i => new
                            {
                                itemId = i.ItemId,
                                quantity = i.Quantity,
                                price = i.Price,
                                batchNumber = i.BatchNumber
                            }),
                            vatAmount = result.VatAmount,
                            discountAmount = result.DiscountAmount,
                            roundOffAmount = result.RoundOffAmount
                        }
                    }
                };

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in UpdateCashSalesBill");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Stock validation error in UpdateCashSalesBill");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message,
                    details = ex.Data.Count > 0 ? ex.Data : null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in UpdateCashSalesBill for bill {BillId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Error updating cash sales bill",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/sales-register
        [HttpGet("sales-register")]
        public async Task<IActionResult> GetSalesRegister([FromQuery] string? fromDate = null, [FromQuery] string? toDate = null)
        {
            try
            {
                _logger.LogInformation("=== GetSalesRegister Started ===");

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
                var registerData = await _salesBillService.GetSalesRegisterAsync(
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

                _logger.LogInformation($"Successfully fetched sales register with {registerData.Bills.Count} bills");

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in GetSalesRegister");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetSalesRegister");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching sales register",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }
       
       
        // GET: api/retailer/sales-register/entry-data
        [HttpGet("sales-register/entry-data")]
        public async Task<IActionResult> GetSalesRegisterEntryData()
        {
            try
            {
                _logger.LogInformation("=== GetSalesRegisterEntryData Started ===");

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

                // Get sales entry data from service
                var salesData = await _salesBillService.GetSalesRegisterEntryDataAsync(companyIdGuid, fiscalYear.Id, userIdGuid);

                var response = new
                {
                    success = true,
                    data = new
                    {
                        company = salesData.Company,
                        accounts = salesData.Accounts,
                        dates = salesData.Dates,
                        currentFiscalYear = salesData.CurrentFiscalYear,
                        userPreferences = salesData.UserPreferences,
                        permissions = salesData.Permissions,
                        currentCompanyName = salesData.CurrentCompanyName
                    }
                };

                _logger.LogInformation($"Successfully fetched sales entry data for company {salesData.Company.Name}");

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetSalesRegisterEntryData");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/sales/{id}/print
        [HttpGet("sales/{id}/print")]
        public async Task<IActionResult> GetSalesForPrint(Guid id)
        {
            try
            {
                _logger.LogInformation("=== GetSalesForPrint Started for ID: {BillId} ===", id);

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
                var printData = await _salesBillService.GetSalesForPrintAsync(
                    id,
                    companyIdGuid,
                    userIdGuid,
                    fiscalYearIdGuid);

                if (printData == null || printData.Bill == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Sales bill not found"
                    });
                }

                var response = new
                {
                    success = true,
                    data = printData
                };

                _logger.LogInformation($"Successfully fetched sales print data for ID: {id}");

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in GetSalesForPrint");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetSalesForPrint for bill {BillId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching sales bill for printing",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/sales-vat-report
        [HttpGet("sales-vat-report")]
        public async Task<IActionResult> GetSalesVatReport([FromQuery] string? fromDate = null, [FromQuery] string? toDate = null)
        {
            try
            {
                _logger.LogInformation("=== GetSalesVatReport Started ===");

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
                    var emptyResponse = new SalesVatReportDTO
                    {
                        Company = company,
                        CurrentFiscalYear = currentFiscalYear,
                        SalesVatReport = new List<SalesVatEntryDTO>(),
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

                // Determine if company uses Nepali date format
                bool isNepaliFormat = companyDateFormat == "nepali";

                // Parse dates
                DateTime startDateTime;
                DateTime endDateTime;

                if (isNepaliFormat)
                {
                    if (!DateTime.TryParse(fromDate, out startDateTime))
                    {
                        startDateTime = DateTime.MinValue;
                    }
                    if (!DateTime.TryParse(toDate, out endDateTime))
                    {
                        endDateTime = DateTime.MaxValue;
                    }
                }
                else
                {
                    if (!DateTime.TryParse(fromDate, out startDateTime))
                    {
                        startDateTime = DateTime.MinValue;
                    }
                    if (!DateTime.TryParse(toDate, out endDateTime))
                    {
                        endDateTime = DateTime.MaxValue;
                    }
                }

                // Set end date to end of day
                endDateTime = endDateTime.Date.AddDays(1).AddTicks(-1);

                // Build query for sales bills
                var query = _context.SalesBills
                    .Where(sb => sb.CompanyId == companyIdGuid &&
                                sb.FiscalYearId == fiscalYearIdGuid);

                // Apply date filter based on company's date format
                if (isNepaliFormat)
                {
                    query = query.Where(sb => sb.nepaliDate >= startDateTime && sb.nepaliDate <= endDateTime);
                }
                else
                {
                    query = query.Where(sb => sb.Date >= startDateTime && sb.Date <= endDateTime);
                }

                // Include related data
                var bills = await query
                    .Include(sb => sb.Account)
                    .OrderBy(sb => sb.Date)
                    .ToListAsync();

                // Build the sales VAT report
                var salesVatReport = new List<SalesVatEntryDTO>();

                foreach (var bill in bills)
                {
                    SalesVatEntryDTO entry;

                    if (bill.Account != null)
                    {
                        // Credit sale with account
                        entry = new SalesVatEntryDTO
                        {
                            BillNumber = bill.BillNumber,
                            Date = bill.Date,
                            NepaliDate = bill.nepaliDate,
                            AccountName = bill.Account.Name ?? "",
                            PanNumber = bill.Account.Pan ?? "",
                            TotalAmount = bill.TotalAmount,
                            DiscountAmount = bill.DiscountAmount,
                            NonVatSales = bill.NonVatSales,
                            TaxableAmount = bill.TaxableAmount,
                            VatAmount = bill.VatAmount,
                            IsCash = false
                        };
                    }
                    else
                    {
                        // Cash sale
                        entry = new SalesVatEntryDTO
                        {
                            BillNumber = bill.BillNumber,
                            Date = bill.Date,
                            NepaliDate = bill.nepaliDate, 
                            AccountName = bill.CashAccount ?? "Cash Sale",
                            PanNumber = bill.CashAccountPan ?? "",
                            TotalAmount = bill.TotalAmount,
                            DiscountAmount = bill.DiscountAmount,
                            NonVatSales = bill.NonVatSales,
                            TaxableAmount = bill.TaxableAmount,
                            VatAmount = bill.VatAmount,
                            IsCash = true
                        };
                    }

                    salesVatReport.Add(entry);
                }

                var response = new SalesVatReportDTO
                {
                    Company = company,
                    CurrentFiscalYear = currentFiscalYear,
                    SalesVatReport = salesVatReport,
                    CompanyDateFormat = companyDateFormat,
                    NepaliDate = nepaliDate,
                    CurrentCompany = company,
                    FromDate = fromDate,
                    ToDate = toDate,
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

                _logger.LogInformation($"Successfully fetched sales VAT report with {salesVatReport.Count} entries");

                return Ok(new { success = true, data = response });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetSalesVatReport");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching sales VAT report",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

    }
}