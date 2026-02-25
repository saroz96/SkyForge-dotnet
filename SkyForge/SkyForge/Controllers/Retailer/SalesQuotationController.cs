using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkyForge.Models.CompanyModel; // Add this for TradeType enum
using System.Security.Claims;
using SkyForge.Services.Retailer.SalesQuotationServices;
using SkyForge.Data;
using SkyForge.Dto.RetailerDto.SalesQuotationDto;

namespace SkyForge.Controllers.RetailerControllers
{
    [Route("api/retailer")]
    [ApiController]
    [Authorize]
    public class SalesQuotationController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<SalesQuotationController> _logger;
        private readonly ISalesQuotationService _salesQuotationService;

        public SalesQuotationController(
            ApplicationDbContext context,
            ILogger<SalesQuotationController> logger,
            ISalesQuotationService salesQuotationService)
        {
            _context = context;
            _logger = logger;
            _salesQuotationService = salesQuotationService;
        }

        // GET: api/retailer/sales-quotation
        [HttpGet("sales-quotation")]
        public async Task<IActionResult> GetSalesQuotationData()
        {
            try
            {
                _logger.LogInformation("=== GetSalesQuotationData Started ===");

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

                var salesQuotationData = await _salesQuotationService.GetSalesQuotationAsync(
                    companyIdGuid,
                    fiscalYearIdGuid,
                    userIdGuid);

                if (salesQuotationData == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Company not found"
                    });
                }

                return Ok(new
                {
                    success = true,
                    data = salesQuotationData
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetSalesQuotationData");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching sales quotation data",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/sales-quotation/next-number
        [HttpGet("sales-quotation/next-number")]
        public async Task<IActionResult> GetNextSalesQuotationBillNumber()
        {
            try
            {
                _logger.LogInformation("=== GetNextSalesQuotationBillNumber Started ===");

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

                var nextBillNumber = await _salesQuotationService.GetNextBillNumberAsync(companyIdGuid, fiscalYear.Id);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        nextQuotationNumber = nextBillNumber
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetNextSalesQuotationBillNumber");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/purchase/current-number
        [HttpGet("sales-quotation/current-number")]
        public async Task<IActionResult> GetCurrentSalesQuotationBillNumber()
        {
            try
            {
                _logger.LogInformation("=== GetCurrentSalesQuotationBillNumber Started ===");

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

                var currentBillNumber = await _salesQuotationService.GetCurrentBillNumberAsync(companyIdGuid, fiscalYear.Id);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        currentQuotationNumber = currentBillNumber
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCurrentQuotationNumber");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error"
                });
            }
        }

        [HttpPost("sales-quotation")]
        public async Task<IActionResult> CreateSalesQuotation([FromBody] CreateSalesQuotationDTO dto)
        {
            try
            {
                _logger.LogInformation("=== CreateSalesQuotation Started ===");

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
                if (string.IsNullOrEmpty(tradeTypeClaim) ||
                    !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) ||
                    tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "Access forbidden for this trade type"
                    });
                }

                // Validate fiscal year
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out Guid fiscalYearIdGuid))
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

                // Validate required fields (matching Express.js validation)
                if (dto.AccountId == null || dto.AccountId == Guid.Empty)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Account ID is required."
                    });
                }

                if (dto.IsVatExempt == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Invalid VAT selection."
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

                if (dto.Items == null || dto.Items.Count == 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "At least one item is required."
                    });
                }

                // Create sales quotation
                var result = await _salesQuotationService.CreateSalesQuotationAsync(
                    dto, userIdGuid, companyIdGuid, fiscalYearIdGuid);

                // Get account details for response
                var account = await _context.Accounts
                    .Where(a => a.Id == dto.AccountId)
                    .Select(a => new { a.Name, a.Address, a.Pan })
                    .FirstOrDefaultAsync();

                // Get items with names for response
                var itemIds = dto.Items.Select(i => i.ItemId).ToList();
                var items = await _context.Items
                    .Where(i => itemIds.Contains(i.Id))
                    .ToDictionaryAsync(i => i.Id, i => i.Name);

                var unitIds = dto.Items.Select(i => i.UnitId).ToList();
                var units = await _context.Units
                    .Where(u => unitIds.Contains(u.Id))
                    .ToDictionaryAsync(u => u.Id, u => u.Name);

                // Prepare response matching Express.js structure
                var response = new
                {
                    success = true,
                    data = new
                    {
                        quotation = new
                        {
                            _id = result.Id,
                            billNumber = result.BillNumber,
                            account = new
                            {
                                name = account?.Name,
                                address = account?.Address,
                                pan = account?.Pan
                            },
                            items = result.Items.Select(i => new
                            {
                                item = i.ItemId,
                                itemName = items.GetValueOrDefault(i.ItemId),
                                quantity = i.Quantity,
                                price = i.Price,
                                unit = i.UnitId,
                                unitName = units.GetValueOrDefault(i.UnitId),
                                vatStatus = i.VatStatus,
                                description = i.Description
                            }),
                            subTotal = result.SubTotal,
                            discountPercentage = result.DiscountPercentage,
                            discountAmount = result.DiscountAmount,
                            taxableAmount = result.TaxableAmount,
                            vatAmount = result.VatAmount,
                            totalAmount = result.TotalAmount,
                            roundOffAmount = result.RoundOffAmount,
                            paymentMode = result.PaymentMode,
                            description = result.Description,
                            transactionDate = result.TransactionDate,
                            date = result.Date,
                            isVatExempt = result.IsVatExempt,
                            vatPercentage = result.VatPercentage
                        },
                        printUrl = $"/retailer/sales-quotation/{result.Id}/direct-print"
                    }
                };

                // Check if print query parameter is present (matching Express.js)
                if (Request.Query.ContainsKey("print") && Request.Query["print"] == "true")
                {
                    // You might want to add a print flag or generate a print view
                    // For now, just include it in response
                }

                return StatusCode(201, response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in CreateSalesQuotation");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in CreateSalesQuotation");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Error creating sales quotation",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/sales-quotation/register
        [HttpGet("sales-quotation/register")]
        public async Task<IActionResult> GetSalesQuotationRegister([FromQuery] string? fromDate = null, [FromQuery] string? toDate = null)
        {
            try
            {
                _logger.LogInformation("=== GetSalesQuotationRegister Started ===");

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
                var registerData = await _salesQuotationService.GetSalesQuotationRegisterAsync(
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

                _logger.LogInformation($"Successfully fetched sales quotation register with {registerData.Bills.Count} bills");

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in GetSalesQuotationRegister");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetSalesQuotationRegister");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching sales quotation register",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/sales-quotation/entry-data
        [HttpGet("sales-quotation/entry-data")]
        public async Task<IActionResult> GetSalesQuotationEntryData()
        {
            try
            {
                _logger.LogInformation("=== GetSalesQuotationEntryData Started ===");

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
                var salesQuotationData = await _salesQuotationService.GetSalesQuotationEntryDataAsync(companyIdGuid, fiscalYear.Id, userIdGuid);

                var response = new
                {
                    success = true,
                    data = new
                    {
                        company = salesQuotationData.Company,
                        accounts = salesQuotationData.Account,
                        dates = salesQuotationData.Dates,
                        currentFiscalYear = salesQuotationData.CurrentFiscalYear,
                        userPreferences = salesQuotationData.UserPreferences,
                        permissions = salesQuotationData.Permissions,
                        currentCompanyName = salesQuotationData.CurrentCompanyName
                    }
                };

                _logger.LogInformation($"Successfully fetched sales quotation entry data for company {salesQuotationData.Company.Name}");

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetSalesQuotationEntryData");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/sales-quotation/finds
        [HttpGet("sales-quotation/finds")]
        public async Task<IActionResult> GetSalesQuotationFinds()
        {
            try
            {
                _logger.LogInformation("=== GetSalesQuotationFinds Started ===");

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
                var result = await _salesQuotationService.GetSalesQuotationFindsAsync(
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
                _logger.LogError(ex, "Error in GetSalesQuotationFinds");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error"
                });
            }
        }

        [HttpGet("sales-quotation/find-party")]
        public async Task<IActionResult> GetSalesQuotationPartyInfo([FromQuery] string billNumber)
        {
            try
            {
                _logger.LogInformation("=== GetSalesQuotationPartyInfo Started ===");

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
                var result = await _salesQuotationService.GetSalesQuotationPartyInfoAsync(
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
                _logger.LogError(ex, "Error in GetSalesQuotationPartyInfo");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching voucher party info"
                });
            }
        }

        [HttpPut("sales-quotation/change-party/{billNumber}")]
        public async Task<IActionResult> ChangeSalesQuotationParty([FromRoute] string billNumber, [FromBody] ChangeSalesQuotationPartyRequestDTO request)
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
                var result = await _salesQuotationService.ChangeSalesQuotationPartyAsync(
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


        [HttpGet("sales-quotation/get-id-by-number")]
        public async Task<IActionResult> GetSalesQuotationVoucherIdByNumber([FromQuery] string billNumber)
        {
            try
            {
                _logger.LogInformation("=== GetSalesQuotationVoucherIdByNumber Started for Bill Number: {BillNumber} ===", billNumber);

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
                var result = await _salesQuotationService.GetSalesQuotationVoucherIdByNumberAsync(
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
                _logger.LogWarning(ex, "Validation error in GetSalesQuotationVoucherIdByNumber");
                return NotFound(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetSalesQuotationVoucherIdByNumber for bill {BillNumber}", billNumber);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching bill ID"
                });
            }
        }

        // GET: api/retailer/sales-quotation/edit/{id}
        [HttpGet("sales-quotation/edit/{id}")]
        public async Task<IActionResult> GetSalesQuotationEditData(Guid id)
        {
            try
            {
                _logger.LogInformation("=== GetSalesQuotationEditData Started for Bill ID: {BillId} ===", id);

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

                // Get purchase return edit data from service
                var editData = await _salesQuotationService.GetSalesQuotationEditDataAsync(
                    id,
                    companyIdGuid,
                    fiscalYearIdGuid,
                    userIdGuid);

                if (editData == null || editData.SalesQuotation == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Sales Quotation not found or does not belong to the selected company"
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
                        salesQuotation = editData.SalesQuotation,
                        items = editData.Items,
                        accounts = editData.Accounts,
                        user = editData.User
                    }
                };

                _logger.LogInformation($"Successfully fetched sales quotation edit data for Bill ID: {id}");

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in GetSalesQuotationEditData");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetSalesQuotationEditData for bill {BillId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching sales quotation edit data",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // Controllers/RetailerController.cs

        [HttpPut("sales-quotation/edit/{id}")]
        public async Task<IActionResult> UpdateSalesQuotation(Guid id, [FromBody] UpdateSalesQuotationDTO dto)
        {
            try
            {
                _logger.LogInformation("=== UpdateSalesQuotation Started for ID: {QuotationId} ===", id);

                // Get user claims from JWT
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
                if (string.IsNullOrEmpty(tradeTypeClaim) ||
                    !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) ||
                    tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "Access forbidden for this trade type"
                    });
                }

                // Validate fiscal year
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out Guid fiscalYearIdGuid))
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

                // Validate quotation ID
                if (id == Guid.Empty)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Invalid quotation ID."
                    });
                }

                // Validate required fields (matching Express.js validation)
                if (dto.AccountId == null || dto.AccountId == Guid.Empty)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Account ID is required."
                    });
                }

                if (dto.IsVatExempt == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Invalid VAT selection."
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

                if (dto.Items == null || dto.Items.Count == 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "At least one item is required."
                    });
                }

                // Update sales quotation
                var result = await _salesQuotationService.UpdateSalesQuotationAsync(
                    id, dto, userIdGuid, companyIdGuid, fiscalYearIdGuid);

                // Get account details for response
                var account = await _context.Accounts
                    .Where(a => a.Id == dto.AccountId)
                    .Select(a => new { a.Name, a.Address, a.Pan })
                    .FirstOrDefaultAsync();

                // Get items with names for response
                var itemIds = dto.Items.Select(i => i.ItemId).ToList();
                var items = await _context.Items
                    .Where(i => itemIds.Contains(i.Id))
                    .ToDictionaryAsync(i => i.Id, i => i.Name);

                var unitIds = dto.Items.Select(i => i.UnitId).ToList();
                var units = await _context.Units
                    .Where(u => unitIds.Contains(u.Id))
                    .ToDictionaryAsync(u => u.Id, u => u.Name);

                // Prepare response matching Express.js structure
                var response = new
                {
                    success = true,
                    data = new
                    {
                        quotation = new
                        {
                            _id = result.Id,
                            billNumber = result.BillNumber,
                            account = new
                            {
                                name = account?.Name,
                                address = account?.Address,
                                pan = account?.Pan
                            },
                            items = result.Items.Select(i => new
                            {
                                item = i.ItemId,
                                itemName = items.GetValueOrDefault(i.ItemId),
                                quantity = i.Quantity,
                                price = i.Price,
                                unit = i.UnitId,
                                unitName = units.GetValueOrDefault(i.UnitId),
                                vatStatus = i.VatStatus,
                                description = i.Description
                            }),
                            subTotal = result.SubTotal,
                            discountPercentage = result.DiscountPercentage,
                            discountAmount = result.DiscountAmount,
                            nonVatSales = result.NonVatSales,
                            taxableAmount = result.TaxableAmount,
                            vatAmount = result.VatAmount,
                            totalAmount = result.TotalAmount,
                            roundOffAmount = result.RoundOffAmount,
                            paymentMode = result.PaymentMode,
                            description = result.Description,
                            transactionDate = result.TransactionDate,
                            date = result.Date,
                            isVatExempt = result.IsVatExempt,
                            vatPercentage = result.VatPercentage
                        },
                        message = "Quotation updated successfully!"
                    }
                };

                _logger.LogInformation("Successfully updated sales quotation ID: {QuotationId}", id);

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in UpdateSalesQuotation for ID: {QuotationId}", id);
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in UpdateSalesQuotation for ID: {QuotationId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Error updating sales quotation",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/sales-quotation/{id}/print
        [HttpGet("sales-quotation/{id}/print")]
        public async Task<IActionResult> GetSalesQuotationForPrint(Guid id)
        {
            try
            {
                _logger.LogInformation("=== GetSalesQuotationForPrint Started for ID: {BillId} ===", id);

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
                var printData = await _salesQuotationService.GetSalesQuotationForPrintAsync(
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

                _logger.LogInformation($"Successfully fetched sales quotation print data for ID: {id}");

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in GetSalesQuotationForPrint");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetSalesQuotationForPrint for bill {BillId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching sales quotation for printing",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }


    }
}

