using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkyForge.Data;
using SkyForge.Services.Retailer.SalesBillServices;
using SkyForge.Models.CompanyModel;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using SkyForge.Models.Shared;
using SkyForge.Dto.RetailerDto.SalesBillDto;
using SkyForge.Services.Retailer.SalesReturnServices;
using SkyForge.Dto.RetailerDto.SalesReturnDto;


namespace SkyForge.Controllers.Retailer
{
    [ApiController]
    [Route("api/retailer")]
    [Authorize]
    public class SalesReturnController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<SalesReturnController> _logger;
        private readonly ISalesReturnService _salesReturnService;

        public SalesReturnController(
            ApplicationDbContext context,
            ILogger<SalesReturnController> logger,
            ISalesReturnService salesReturnService)
        {
            _context = context;
            _logger = logger;
            _salesReturnService = salesReturnService;
        }

        // GET: api/retailer/sales-return
        [HttpGet("sales-return")]
        public async Task<IActionResult> GetSalesReturnData()
        {
            try
            {
                _logger.LogInformation("=== GetSalesReturnData Started ===");

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

                var salesReturnData = await _salesReturnService.GetSalesReturnDataAsync(
                    companyIdGuid,
                    fiscalYearIdGuid,
                    userIdGuid);

                return Ok(new
                {
                    success = true,
                    data = salesReturnData
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetSalesReturnData");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching sales return data",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        [HttpGet("sales-return/next-number")]
        public async Task<IActionResult> GetNextSalesReturnBillNumber()
        {
            try
            {
                _logger.LogInformation("=== GetNextSalesReturnBillNumber Started ===");

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

                var nextBillNumber = await _salesReturnService.GetNextSalesReturnBillNumberAsync(companyIdGuid, fiscalYearIdGuid);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        nextSalesReturnBillNumber = nextBillNumber
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetNextSalesReturnBillNumber");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/sales-return/current-number
        [HttpGet("sales-return/current-number")]
        public async Task<IActionResult> GetCurrentSalesReturnBillNumber()
        {
            try
            {
                _logger.LogInformation("=== GetCurrentSalesReturnBillNumber Started ===");

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

                var currentBillNumber = await _salesReturnService.GetCurrentSalesReturnBillNumberAsync(companyIdGuid, fiscalYear.Id);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        currentSalesReturnBillNumber = currentBillNumber
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCurrentSalesReturnBillNumber");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error"
                });
            }
        }

        // GET: api/retailer/sales-bill-by-number/{billNumber}
        [HttpGet("sales-bill-by-number/{billNumber}")]
        public async Task<IActionResult> GetSalesBillByNumber(string billNumber)
        {
            try
            {
                _logger.LogInformation("=== GetSalesBillByNumber Started for BillNumber: {BillNumber} ===", billNumber);

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

                // Validate bill number
                if (string.IsNullOrEmpty(billNumber))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Bill number is required"
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

                // Get sales bill by number
                var salesBill = await _salesReturnService.GetSalesBillByNumberAsync(billNumber, companyIdGuid, fiscalYearIdGuid);

                if (salesBill == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Sales bill not found"
                    });
                }

                // Get existing returns for this bill
                var existingReturns = await _context.SalesReturns
                    .Where(sr => sr.OriginalSalesBillId == salesBill.Id && sr.CompanyId == companyIdGuid)
                    .OrderByDescending(sr => sr.Date)
                    .Select(sr => new
                    {
                        sr.BillNumber,
                        sr.Date,
                        sr.TotalAmount
                    })
                    .ToListAsync();

                // Get return items for quantity calculation
                var returnItems = await _context.SalesReturnItems
                    .Include(sri => sri.SalesReturn)
                    .Where(sri => sri.SalesReturn.CompanyId == companyIdGuid &&
                                 sri.SalesReturn.OriginalSalesBillId == salesBill.Id)
                    .ToListAsync();

                // Calculate returned quantities
                var returnedQuantities = new Dictionary<string, decimal>();
                foreach (var returnItem in returnItems)
                {
                    var key = $"{returnItem.ItemId}_{returnItem.BatchNumber}";
                    if (!returnedQuantities.ContainsKey(key))
                        returnedQuantities[key] = 0;
                    returnedQuantities[key] += returnItem.Quantity;
                }

                // Process items to add return tracking information
                var processedItems = new List<object>();
                decimal totalItems = 0;
                decimal totalAvailableItems = 0;
                bool isFullyReturned = true;

                foreach (var item in salesBill.Items)
                {
                    var key = $"{item.ItemId}_{item.BatchNumber}";
                    var returnedQty = returnedQuantities.GetValueOrDefault(key, 0);
                    var availableQty = Math.Max(0, item.Quantity - returnedQty);

                    totalItems += item.Quantity;
                    totalAvailableItems += availableQty;

                    if (availableQty > 0)
                        isFullyReturned = false;

                    // Get current item details from the Item property (ItemDetailsDTO)
                    var currentItem = item.Item;

                    // Create the item object with the nested structure that frontend expects
                    // USING CURRENT ITEM DATA FROM ITEMSDETAILSDTO FOR UNIT INFORMATION
                    processedItems.Add(new
                    {
                        item.Id,
                        item.ItemId,
                        // Create the nested item object using CURRENT item data
                        item = new
                        {
                            _id = currentItem?.Id ?? item.ItemId,
                            uniqueNumber = currentItem?.UniqueNumber ?? item.UniqueNumber,
                            name = currentItem?.Name ?? item.ItemName,
                            hscode = currentItem?.Hscode ?? item.Hscode,
                            vatStatus = currentItem?.VatStatus ?? item.VatStatus,
                            // Use CURRENT unit information from ItemDetailsDTO
                            unit = !string.IsNullOrEmpty(currentItem?.UnitName) ? new
                            {
                                _id = currentItem.UnitId,
                                name = currentItem.UnitName  // CURRENT unit name from items model
                            } : (!string.IsNullOrEmpty(item.UnitName) ? new
                            {
                                _id = item.UnitId,
                                name = item.UnitName
                            } : null)
                        },
                        item.ItemName, // Keep historical name for backward compatibility
                        item.UnitId,
                        // Use CURRENT unit name for display
                        UnitName = currentItem?.UnitName ?? item.UnitName,
                        item.Quantity,
                        item.Price,
                        item.PuPrice,
                        item.NetPuPrice,
                        item.Mrp,
                        item.DiscountPercentagePerItem,
                        item.DiscountAmountPerItem,
                        item.NetPrice,
                        item.BatchNumber,
                        item.ExpiryDate,
                        item.VatStatus,
                        item.UniqueUuid,
                        item.PurchaseBillId,
                        ReturnedQuantity = returnedQty,
                        AvailableQuantity = availableQty,
                        OriginalQuantity = item.Quantity,
                        OriginalPrice = item.Price,
                        OriginalAmount = item.Quantity * item.Price
                    });
                }

                // Prepare return details
                var returnDetails = existingReturns.Select(r => new
                {
                    r.BillNumber,
                    r.Date,
                    r.TotalAmount
                }).ToList();

                // Prepare the response
                var response = new
                {
                    success = true,
                    data = new
                    {
                        bill = new
                        {
                            salesBill.Id,
                            salesBill.BillNumber,
                            Account = salesBill.Account != null ? new
                            {
                                id = salesBill.Account.Id,
                                name = salesBill.Account.Name,
                                address = salesBill.Account.Address,
                                pan = salesBill.Account.Pan,
                                email = salesBill.Account.Email,
                                phone = salesBill.Account.Phone
                            } : null,
                            User = salesBill.User != null ? new
                            {
                                name = salesBill.User.Name
                            } : null,
                            Items = processedItems,
                            BillType = "credit",
                            HasExistingReturns = existingReturns.Any(),
                            ExistingReturns = returnDetails,
                            ReturnCount = existingReturns.Count,
                            TotalItems = totalItems,
                            TotalAvailableItems = totalAvailableItems,
                            IsFullyReturned = isFullyReturned,
                            BillSummary = new
                            {
                                salesBill.SubTotal,
                                salesBill.DiscountPercentage,
                                salesBill.DiscountAmount,
                                salesBill.VatPercentage,
                                salesBill.VatAmount,
                                salesBill.TotalAmount,
                                salesBill.TaxableAmount,
                                NonVatSales = salesBill.NonVatSales,
                                salesBill.RoundOffAmount,
                                salesBill.IsVatExempt,
                                IsVatAll = salesBill.IsVatAll,
                                salesBill.PaymentMode
                            }
                        }
                    }
                };

                return Ok(response);
            }
            catch (InvalidOperationException ex) when (ex.Data.Contains("IsCashSales"))
            {
                _logger.LogWarning(ex, "Cash sales bill accessed in credit sales return: {BillNumber}", billNumber);

                return BadRequest(new
                {
                    success = false,
                    error = ex.Message,
                    isCashSales = ex.Data["IsCashSales"],
                    billType = ex.Data["BillType"],
                    cashAccount = ex.Data["CashAccount"],
                    cashAccountAddress = ex.Data["CashAccountAddress"],
                    cashAccountPan = ex.Data["CashAccountPan"],
                    cashAccountEmail = ex.Data["CashAccountEmail"],
                    cashAccountPhone = ex.Data["CashAccountPhone"]
                });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Error in GetSalesBillByNumber for BillNumber: {BillNumber}", billNumber);
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetSalesBillByNumber for BillNumber: {BillNumber}", billNumber);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Error fetching sales bill",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // POST: api/retailer/sales-return
        [HttpPost("sales-return")]
        public async Task<IActionResult> CreateSalesReturn([FromBody] CreateSalesReturnDTO dto)
        {
            try
            {
                _logger.LogInformation("=== CreateSalesReturn Started ===");

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

                // Validate calculated amounts are provided from frontend
                if (!dto.SubTotal.HasValue || !dto.TaxableAmount.HasValue ||
                    !dto.NonVatSalesReturn.HasValue || !dto.TotalAmount.HasValue)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "SubTotal, TaxableAmount, NonVatSalesReturn, and TotalAmount are required from frontend."
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

                // Validate account exists for this company
                var account = await _context.Accounts
                    .FirstOrDefaultAsync(a => a.Id == dto.AccountId && a.CompanyId == companyIdGuid);

                if (account == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Invalid account for this company"
                    });
                }

                // Create sales return
                var result = await _salesReturnService.CreateSalesReturnAsync(
                    dto, userIdGuid, companyIdGuid, fiscalYearIdGuid);

                // Prepare response (matching Express.js structure)
                var response = new
                {
                    success = true,
                    message = "Sales Return saved successfully!",
                    data = new
                    {
                        bill = new
                        {
                            _id = result.Id,
                            billNumber = result.BillNumber,
                            account = new
                            {
                                _id = result.AccountId,
                                name = result.Account,
                                address = result.CashAccountAddress,
                                pan = result.CashAccountPan,
                                phone = result.CashAccountPhone,
                                email = result.CashAccountEmail
                            },
                            totalAmount = result.TotalAmount,
                            items = result.Items.Select(i => new
                            {
                                item = i.ItemId,
                                quantity = i.Quantity,
                                price = i.Price,
                                puPrice = i.PuPrice,
                                netPrice = i.NetPrice,
                                batchNumber = i.BatchNumber,
                                expiryDate = i.ExpiryDate,
                                unit = i.UnitId,
                                vatStatus = i.VatStatus
                            }),
                            vatAmount = result.VatAmount,
                            discountAmount = result.DiscountAmount,
                            roundOffAmount = result.RoundOffAmount,
                            subTotal = result.SubTotal,
                            taxableAmount = result.TaxableAmount,
                            nonVatSalesReturn = result.NonVatSalesReturn,
                            isVatExempt = result.IsVatExempt,
                            isVatAll = result.IsVatAll,
                            vatPercentage = result.VatPercentage,
                            paymentMode = result.PaymentMode,
                            date = result.Date,
                            transactionDate = result.TransactionDate,
                            user = new
                            {
                                name = result.User?.Name
                            }
                        }
                    }
                };

                return StatusCode(201, response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in CreateSalesReturn");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Business logic error in CreateSalesReturn");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in CreateSalesReturn");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Error creating sales return",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/sales-return/finds
        [HttpGet("sales-return/finds")]
        public async Task<IActionResult> GetSalesReturnFinds()
        {
            try
            {
                _logger.LogInformation("=== GetSalesReturnFinds Started ===");

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
                var result = await _salesReturnService.GetSalesReturnFindsAsync(
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
                _logger.LogError(ex, "Error in GetSalesReturnFinds");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error"
                });
            }
        }
        // GET: api/retailer/sales-return/check-editable
        [HttpGet("sales-return/check-editable")]
        public async Task<IActionResult> CheckSalesReturnEditable([FromQuery] string billNumber)
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
                var bill = await _context.SalesReturns
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

        [HttpGet("sales-return/find-party")]
        public async Task<IActionResult> GetSalesReturnPartyInfo([FromQuery] string billNumber)
        {
            try
            {
                _logger.LogInformation("=== GetSalesReturnPartyInfo Started ===");

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
                var result = await _salesReturnService.GetSalesReturnPartyInfoAsync(
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
                _logger.LogError(ex, "Error in GetSalesReturnPartyInfo");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching voucher party info"
                });
            }
        }
        [HttpPut("sales-return/change-party/{billNumber}")]
        public async Task<IActionResult> ChangeSalesReturnParty([FromRoute] string billNumber, [FromBody] ChangeCreditSalesPartyRequestDTO request)
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
                var result = await _salesReturnService.ChangeSalesReturnPartyAsync(
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

        [HttpGet("sales-return/get-id-by-number")]
        public async Task<IActionResult> GetSalesReturnBillIdByNumber([FromQuery] string billNumber)
        {
            try
            {
                _logger.LogInformation("=== GetSalesReturnBillIdByNumber Started for Bill Number: {BillNumber} ===", billNumber);

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
                var result = await _salesReturnService.GetSalesReturnBillIdByNumberAsync(
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
                _logger.LogWarning(ex, "Validation error in GetSalesReturnBillIdByNumber");
                return NotFound(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetSalesReturnBillIdByNumber for bill {BillNumber}", billNumber);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching bill ID"
                });
            }
        }

        // GET: api/retailer/sales-return/edit/{id}
        [HttpGet("sales-return/edit/{id}")]
        public async Task<IActionResult> GetSalesReturnEditData(Guid id)
        {
            try
            {
                _logger.LogInformation("=== GetSalesReturnEditData Started for Bill ID: {BillId} ===", id);

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

                // Get sales return edit data from service
                var editData = await _salesReturnService.GetSalesReturnEditDataAsync(
                    id,
                    companyIdGuid,
                    fiscalYearIdGuid,
                    userIdGuid);

                if (editData == null || editData.SalesReturnInvoice == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Sales return invoice not found or does not belong to the selected company"
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
                        salesReturnInvoice = editData.SalesReturnInvoice,
                        items = editData.Items,
                        accounts = editData.Accounts,
                        user = editData.User
                    }
                };

                _logger.LogInformation($"Successfully fetched sales return edit data for Bill ID: {id}");

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in GetSalesReturnEditData");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetSalesReturnEditData for bill {BillId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching sales return edit data",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // PUT: api/retailer/sales-return/edit/{id}
        [HttpPut("sales-return/edit/{id}")]
        public async Task<IActionResult> UpdateSalesReturn(Guid id, [FromBody] UpdateSalesReturnDTO request)
        {
            try
            {
                _logger.LogInformation("=== UpdateSalesReturn Started for ID: {BillId} ===", id);

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
                if (request.AccountId == null || request.AccountId == Guid.Empty)
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

                // Validate calculated amounts
                if (!request.SubTotal.HasValue || !request.TaxableAmount.HasValue ||
                    !request.NonVatSalesReturn.HasValue || !request.TotalAmount.HasValue)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "SubTotal, TaxableAmount, NonVatSalesReturn, and TotalAmount are required"
                    });
                }

                // Validate dates based on company format
                var company = await _context.Companies.FindAsync(companyIdGuid);
                if (company != null)
                {
                    bool isNepaliFormat = company.DateFormat?.ToString().ToLower() == "nepali";

                    if (isNepaliFormat)
                    {
                        if (request.TransactionDateNepali == null || request.TransactionDateNepali == default)
                        {
                            return BadRequest(new
                            {
                                success = false,
                                error = "Invalid transaction date (Nepali)"
                            });
                        }
                        if (request.NepaliDate == null || request.NepaliDate == default)
                        {
                            return BadRequest(new
                            {
                                success = false,
                                error = "Invalid invoice date (Nepali)"
                            });
                        }
                    }
                    else
                    {
                        if (request.TransactionDate == null || request.TransactionDate == default)
                        {
                            return BadRequest(new
                            {
                                success = false,
                                error = "Invalid transaction date (English)"
                            });
                        }
                        if (request.Date == null || request.Date == default)
                        {
                            return BadRequest(new
                            {
                                success = false,
                                error = "Invalid invoice date (English)"
                            });
                        }
                    }
                }

                // Update sales return using service
                var updatedBill = await _salesReturnService.UpdateSalesReturnAsync(
                    id,
                    request,
                    companyIdGuid,
                    fiscalYearIdGuid,
                    userIdGuid
                );

                _logger.LogInformation($"Successfully updated sales return bill: {id}");

                return Ok(new
                {
                    success = true,
                    message = "Sales return updated successfully",
                    data = new
                    {
                        billId = updatedBill.Id,
                        billNumber = updatedBill.BillNumber
                    }
                });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in UpdateSalesReturn");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Business logic error in UpdateSalesReturn");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in UpdateSalesReturn for bill {BillId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while updating sales return",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/cash/sales-return
        [HttpGet("cash/sales-return")]
        public async Task<IActionResult> GetCashSalesReturnData()
        {
            try
            {
                _logger.LogInformation("=== GetCashSalesReturnData Started ===");

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

                var cashSalesReturnData = await _salesReturnService.GetCashSalesReturnDataAsync(
                    companyIdGuid,
                    fiscalYearIdGuid,
                    userIdGuid);

                return Ok(new
                {
                    success = true,
                    data = cashSalesReturnData
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCashSalesReturnData");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching cash sales return data",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        [HttpGet("cash/sales-return/next-number")]
        public async Task<IActionResult> GetNextCashSalesReturnBillNumber()
        {
            try
            {
                _logger.LogInformation("=== GetNextCashSalesReturnBillNumber Started ===");

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

                var nextBillNumber = await _salesReturnService.GetNextCashSalesReturnBillNumberAsync(companyIdGuid, fiscalYearIdGuid);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        nextCashSalesReturnBillNumber = nextBillNumber
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetNextCashSalesReturnBillNumber");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/sales-return/current-number
        [HttpGet("cash/sales-return/current-number")]
        public async Task<IActionResult> GetCurrentCashSalesReturnBillNumber()
        {
            try
            {
                _logger.LogInformation("=== GetCurrentCashSalesReturnBillNumber Started ===");

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

                var currentBillNumber = await _salesReturnService.GetCurrentCashSalesReturnBillNumberAsync(companyIdGuid, fiscalYear.Id);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        currentCashSalesReturnBillNumber = currentBillNumber
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCurrentCashSalesReturnBillNumber");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error"
                });
            }
        }

        // GET: api/retailer/cash/sales-bill-by-number/{billNumber}
        [HttpGet("cash/sales-bill-by-number/{billNumber}")]
        public async Task<IActionResult> GetCashSalesBillByNumber(string billNumber)
        {
            try
            {
                _logger.LogInformation("=== GetCashSalesBillByNumber Started for BillNumber: {BillNumber} ===", billNumber);

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

                // Validate bill number
                if (string.IsNullOrEmpty(billNumber))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Bill number is required"
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

                // Get cash sales bill by number
                var salesBill = await _salesReturnService.GetCashSalesBillByNumberAsync(billNumber, companyIdGuid, fiscalYearIdGuid);

                if (salesBill == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Cash sales bill not found"
                    });
                }

                // Get existing returns for this bill
                var existingReturns = await _context.SalesReturns
                    .Where(sr => sr.OriginalSalesBillId == salesBill.Id && sr.CompanyId == companyIdGuid)
                    .OrderByDescending(sr => sr.Date)
                    .Select(sr => new
                    {
                        sr.BillNumber,
                        sr.Date,
                        sr.TotalAmount
                    })
                    .ToListAsync();

                // Get return items for quantity calculation
                var returnItems = await _context.SalesReturnItems
                    .Include(sri => sri.SalesReturn)
                    .Where(sri => sri.SalesReturn.CompanyId == companyIdGuid &&
                                 sri.SalesReturn.OriginalSalesBillId == salesBill.Id)
                    .ToListAsync();

                // Calculate returned quantities
                var returnedQuantities = new Dictionary<string, decimal>();
                foreach (var returnItem in returnItems)
                {
                    var key = $"{returnItem.ItemId}_{returnItem.BatchNumber}";
                    if (!returnedQuantities.ContainsKey(key))
                        returnedQuantities[key] = 0;
                    returnedQuantities[key] += returnItem.Quantity;
                }

                // Process items to add return tracking information
                var processedItems = new List<object>();
                decimal totalItems = 0;
                decimal totalAvailableItems = 0;
                bool isFullyReturned = true;

                foreach (var item in salesBill.Items)
                {
                    var key = $"{item.ItemId}_{item.BatchNumber}";
                    var returnedQty = returnedQuantities.GetValueOrDefault(key, 0);
                    var availableQty = Math.Max(0, item.Quantity - returnedQty);

                    totalItems += item.Quantity;
                    totalAvailableItems += availableQty;

                    if (availableQty > 0)
                        isFullyReturned = false;

                    // Get current item details from the Item property
                    var currentItem = item.Item;

                    processedItems.Add(new
                    {
                        item.Id,
                        item.ItemId,
                        // Create the nested item object using CURRENT item data
                        item = new
                        {
                            _id = currentItem?.Id ?? item.ItemId,
                            uniqueNumber = currentItem?.UniqueNumber ?? item.UniqueNumber,
                            name = currentItem?.Name ?? item.ItemName,
                            hscode = currentItem?.Hscode ?? item.Hscode,
                            vatStatus = currentItem?.VatStatus ?? item.VatStatus,
                            // Use CURRENT unit information
                            unit = !string.IsNullOrEmpty(currentItem?.UnitName) ? new
                            {
                                _id = currentItem.UnitId,
                                name = currentItem.UnitName
                            } : (!string.IsNullOrEmpty(item.UnitName) ? new
                            {
                                _id = item.UnitId,
                                name = item.UnitName
                            } : null)
                        },
                        item.ItemName,
                        item.UnitId,
                        UnitName = currentItem?.UnitName ?? item.UnitName,
                        item.Quantity,
                        item.Price,
                        item.PuPrice,
                        item.NetPuPrice,
                        item.Mrp,
                        item.DiscountPercentagePerItem,
                        item.DiscountAmountPerItem,
                        item.NetPrice,
                        item.BatchNumber,
                        item.ExpiryDate,
                        item.VatStatus,
                        item.UniqueUuid,
                        item.PurchaseBillId,
                        ReturnedQuantity = returnedQty,
                        AvailableQuantity = availableQty,
                        OriginalQuantity = item.Quantity,
                        OriginalPrice = item.Price,
                        OriginalAmount = item.Quantity * item.Price
                    });
                }

                // Prepare return details
                var returnDetails = existingReturns.Select(r => new
                {
                    r.BillNumber,
                    r.Date,
                    r.TotalAmount
                }).ToList();

                // Prepare the response
                var response = new
                {
                    success = true,
                    data = new
                    {
                        bill = new
                        {
                            salesBill.Id,
                            salesBill.BillNumber,
                            CashAccount = salesBill.CashAccount,
                            CashAccountAddress = salesBill.CashAccountAddress,
                            CashAccountPan = salesBill.CashAccountPan,
                            CashAccountEmail = salesBill.CashAccountEmail,
                            CashAccountPhone = salesBill.CashAccountPhone,
                            User = salesBill.User != null ? new
                            {
                                name = salesBill.User.Name
                            } : null,
                            Items = processedItems,
                            BillType = "cash",
                            HasExistingReturns = existingReturns.Any(),
                            ExistingReturns = returnDetails,
                            ReturnCount = existingReturns.Count,
                            TotalItems = totalItems,
                            TotalAvailableItems = totalAvailableItems,
                            IsFullyReturned = isFullyReturned,
                            BillSummary = new
                            {
                                salesBill.SubTotal,
                                salesBill.DiscountPercentage,
                                salesBill.DiscountAmount,
                                salesBill.VatPercentage,
                                salesBill.VatAmount,
                                salesBill.TotalAmount,
                                salesBill.TaxableAmount,
                                NonVatSales = salesBill.NonVatSales,
                                salesBill.RoundOffAmount,
                                salesBill.IsVatExempt,
                                IsVatAll = salesBill.IsVatAll,
                                salesBill.PaymentMode
                            }
                        }
                    }
                };

                return Ok(response);
            }
            catch (InvalidOperationException ex) when (ex.Data.Contains("IsCreditSales"))
            {
                _logger.LogWarning(ex, "Credit sales bill accessed in cash sales return: {BillNumber}", billNumber);

                return BadRequest(new
                {
                    success = false,
                    error = ex.Message,
                    isCreditSales = ex.Data["IsCreditSales"],
                    billType = ex.Data["BillType"],
                    account = ex.Data["Account"],
                    accountAddress = ex.Data["AccountAddress"],
                    accountPan = ex.Data["AccountPan"],
                    accountEmail = ex.Data["AccountEmail"],
                    accountPhone = ex.Data["AccountPhone"]
                });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Error in GetCashSalesBillByNumber for BillNumber: {BillNumber}", billNumber);
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCashSalesBillByNumber for BillNumber: {BillNumber}", billNumber);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Error fetching cash sales bill",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // POST: api/retailer/cash/sales-return
        [HttpPost("cash/sales-return")]
        public async Task<IActionResult> CreateCashSalesReturn([FromBody] CreateSalesReturnDTO dto)
        {
            try
            {
                _logger.LogInformation("=== CreateCashSalesReturn Started ===");

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

                // Cash sales return specific validations
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
                    !dto.NonVatSalesReturn.HasValue || !dto.TotalAmount.HasValue)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "SubTotal, TaxableAmount, NonVatSalesReturn, and TotalAmount are required from frontend."
                    });
                }

                // Create cash sales return
                var result = await _salesReturnService.CreateCashSalesReturnAsync(
                    dto, userIdGuid, companyIdGuid, fiscalYearIdGuid);

                // Prepare response (matching Express.js structure)
                var response = new
                {
                    success = true,
                    message = "Sales Return saved successfully!",
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
                            items = result.Items.Select(i => new
                            {
                                item = i.ItemId,
                                quantity = i.Quantity,
                                price = i.Price,
                                puPrice = i.PuPrice,
                                netPrice = i.NetPrice,
                                batchNumber = i.BatchNumber,
                                expiryDate = i.ExpiryDate,
                                unit = i.UnitId,
                                vatStatus = i.VatStatus
                            }),
                            vatAmount = result.VatAmount,
                            discountAmount = result.DiscountAmount,
                            roundOffAmount = result.RoundOffAmount,
                            subTotal = result.SubTotal,
                            taxableAmount = result.TaxableAmount,
                            nonVatSalesReturn = result.NonVatSalesReturn,
                            isVatExempt = result.IsVatExempt,
                            isVatAll = result.IsVatAll,
                            vatPercentage = result.VatPercentage,
                            paymentMode = result.PaymentMode,
                            date = result.Date,
                            transactionDate = result.TransactionDate,
                            user = new
                            {
                                name = result.User?.Name
                            }
                        }
                    }
                };

                return StatusCode(201, response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in CreateCashSalesReturn");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Stock validation error in CreateCashSalesReturn");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in CreateCashSalesReturn");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Error creating cash sales return",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/cash-sales/finds
        [HttpGet("cash/sales-return/finds")]
        public async Task<IActionResult> GetCashSalesReturnFinds()
        {
            try
            {
                _logger.LogInformation("=== GetCashSalesReturnFinds Started ===");

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
                var result = await _salesReturnService.GetCashSalesReturnFindsAsync(
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
                _logger.LogError(ex, "Error in GetCashSalesReturnFinds");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error"
                });
            }
        }

        // GET: api/retailer/cash/sales-return/check-editable
        [HttpGet("cash/sales-return/check-editable")]
        public async Task<IActionResult> CheckCashSalesReturnBillEditable([FromQuery] string billNumber)
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
                var bill = await _context.SalesReturns
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
                        "This is a credit sales return voucher and cannot be edited as cash sales return",
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

        [HttpGet("cash/sales-return/get-id-by-number")]
        public async Task<IActionResult> GetCashSalesReturnBillIdByNumber([FromQuery] string billNumber)
        {
            try
            {
                _logger.LogInformation("=== GetCashSalesReturnBillIdByNumber Started for Bill Number: {BillNumber} ===", billNumber);

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
                var result = await _salesReturnService.GetCashSalesReturnBillIdByNumberAsync(
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
                _logger.LogWarning(ex, "Validation error in GetCashSalesReturnBillIdByNumber");
                return NotFound(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCashSalesReturnBillIdByNumber for bill {BillNumber}", billNumber);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching bill ID"
                });
            }
        }

        // GET: api/retailer/cash/sales-return/edit/{id}
        [HttpGet("cash/sales-return/edit/{id}")]
        public async Task<IActionResult> GetCashSalesReturnEditData(Guid id)
        {
            try
            {
                _logger.LogInformation("=== GetCashSalesReturnEditData Started for Bill ID: {BillId} ===", id);

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

                // Get cash sales return edit data from service
                var editData = await _salesReturnService.GetCashSalesReturnEditDataAsync(
                    id,
                    companyIdGuid,
                    fiscalYearIdGuid,
                    userIdGuid);

                if (editData == null || editData.SalesReturnInvoice == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Cash sales return invoice not found or does not belong to the selected company"
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
                        salesReturnInvoice = editData.SalesReturnInvoice,
                        items = editData.Items,
                        accounts = editData.Accounts,
                        user = editData.User
                    }
                };

                _logger.LogInformation($"Successfully fetched cash sales return edit data for Bill ID: {id}");

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in GetCashSalesReturnEditData");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCashSalesReturnEditData for bill {BillId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching cash sales return edit data",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // PUT: api/retailer/cash/sales-return/edit/{id}
        [HttpPut("cash/sales-return/edit/{id}")]
        public async Task<IActionResult> UpdateCashSalesReturn(Guid id, [FromBody] UpdateSalesReturnDTO request)
        {
            try
            {
                _logger.LogInformation("=== UpdateCashSalesReturn Started for ID: {BillId} ===", id);

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

                // Cash sales return specific validations
                if (string.IsNullOrEmpty(request.CashAccount))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Cash account is required."
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

                // Validate required fields
                if (request.Items == null || !request.Items.Any())
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "At least one item is required"
                    });
                }

                // Validate calculated amounts
                if (!request.SubTotal.HasValue || !request.TaxableAmount.HasValue ||
                    !request.NonVatSalesReturn.HasValue || !request.TotalAmount.HasValue)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "SubTotal, TaxableAmount, NonVatSalesReturn, and TotalAmount are required"
                    });
                }

                // Validate dates based on company format
                var company = await _context.Companies.FindAsync(companyIdGuid);
                if (company != null)
                {
                    bool isNepaliFormat = company.DateFormat?.ToString().ToLower() == "nepali";

                    if (isNepaliFormat)
                    {
                        if (request.TransactionDateNepali == null || request.TransactionDateNepali == default)
                        {
                            return BadRequest(new
                            {
                                success = false,
                                error = "Invalid transaction date (Nepali)"
                            });
                        }
                        if (request.NepaliDate == null || request.NepaliDate == default)
                        {
                            return BadRequest(new
                            {
                                success = false,
                                error = "Invalid invoice date (Nepali)"
                            });
                        }
                    }
                    else
                    {
                        if (request.TransactionDate == null || request.TransactionDate == default)
                        {
                            return BadRequest(new
                            {
                                success = false,
                                error = "Invalid transaction date (English)"
                            });
                        }
                        if (request.Date == null || request.Date == default)
                        {
                            return BadRequest(new
                            {
                                success = false,
                                error = "Invalid invoice date (English)"
                            });
                        }
                    }
                }

                // Update cash sales return using service
                var updatedBill = await _salesReturnService.UpdateCashSalesReturnAsync(
                    id,
                    request,
                    companyIdGuid,
                    fiscalYearIdGuid,
                    userIdGuid
                );

                // Prepare response (matching the create response structure)
                var response = new
                {
                    success = true,
                    message = "Cash sales return updated successfully!",
                    data = new
                    {
                        bill = new
                        {
                            _id = updatedBill.Id,
                            billNumber = updatedBill.BillNumber,
                            cashAccount = updatedBill.CashAccount,
                            cashAccountAddress = updatedBill.CashAccountAddress,
                            cashAccountPan = updatedBill.CashAccountPan,
                            cashAccountEmail = updatedBill.CashAccountEmail,
                            cashAccountPhone = updatedBill.CashAccountPhone,
                            totalAmount = updatedBill.TotalAmount,
                            items = updatedBill.Items.Select(i => new
                            {
                                item = i.ItemId,
                                quantity = i.Quantity,
                                price = i.Price,
                                puPrice = i.PuPrice,
                                netPrice = i.NetPrice,
                                batchNumber = i.BatchNumber,
                                expiryDate = i.ExpiryDate,
                                unit = i.UnitId,
                                vatStatus = i.VatStatus
                            }),
                            vatAmount = updatedBill.VatAmount,
                            discountAmount = updatedBill.DiscountAmount,
                            roundOffAmount = updatedBill.RoundOffAmount,
                            subTotal = updatedBill.SubTotal,
                            taxableAmount = updatedBill.TaxableAmount,
                            nonVatSalesReturn = updatedBill.NonVatSalesReturn,
                            isVatExempt = updatedBill.IsVatExempt,
                            isVatAll = updatedBill.IsVatAll,
                            vatPercentage = updatedBill.VatPercentage,
                            paymentMode = updatedBill.PaymentMode,
                            date = updatedBill.Date,
                            transactionDate = updatedBill.TransactionDate,
                            user = new
                            {
                                name = updatedBill.User?.Name
                            }
                        }
                    }
                };

                _logger.LogInformation($"Successfully updated cash sales return bill: {id}");

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in UpdateCashSalesReturn");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Stock validation error in UpdateCashSalesReturn");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in UpdateCashSalesReturn for bill {BillId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while updating cash sales return",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/sales-return/register
        [HttpGet("sales-return/register")]
        public async Task<IActionResult> GetSalesReturnRegister([FromQuery] string? fromDate = null, [FromQuery] string? toDate = null)
        {
            try
            {
                _logger.LogInformation("=== GetSalesReturnRegister Started ===");

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

                // Get sales return register data from service
                var registerData = await _salesReturnService.GetSalesReturnRegisterAsync(
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

                _logger.LogInformation($"Successfully fetched sales return register with {registerData.Bills.Count} bills");

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in GetSalesReturnRegister");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetSalesReturnRegister");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching sales return register",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/sales-return/register/entry-data
        [HttpGet("sales-return/register/entry-data")]
        public async Task<IActionResult> GetSalesReturnRegisterEntryData()
        {
            try
            {
                _logger.LogInformation("=== GetSalesReturnRegisterEntryData Started ===");

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

                // Get sales return entry data from service
                var salesData = await _salesReturnService.GetSalesReturnRegisterEntryDataAsync(companyIdGuid, fiscalYear.Id, userIdGuid);

                var response = new
                {
                    success = true,
                    data = new
                    {
                        company = salesData.Company,
                        accounts = salesData.Accounts,
                        categories = salesData.Categories,
                        units = salesData.Units,
                        dates = salesData.Dates,
                        currentFiscalYear = salesData.CurrentFiscalYear,
                        userPreferences = salesData.UserPreferences,
                        permissions = salesData.Permissions,
                        currentCompanyName = salesData.CurrentCompanyName
                    }
                };

                _logger.LogInformation($"Successfully fetched sales return entry data for company {salesData.Company.Name}");

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetSalesReturnRegisterEntryData");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/sales-return/{id}/print
        [HttpGet("sales-return/{id}/print")]
        public async Task<IActionResult> GetSalesReturnForPrint(Guid id)
        {
            try
            {
                _logger.LogInformation("=== GetSalesReturnForPrint Started for ID: {BillId} ===", id);

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

                // Get sales return print data from service
                var printData = await _salesReturnService.GetSalesReturnForPrintAsync(
                    id,
                    companyIdGuid,
                    userIdGuid,
                    fiscalYearIdGuid);

                if (printData == null || printData.Bill == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Sales return bill not found"
                    });
                }

                var response = new
                {
                    success = true,
                    data = printData
                };

                _logger.LogInformation($"Successfully fetched sales return print data for ID: {id}");

                return Ok(response);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error in GetSalesReturnForPrint");
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetSalesReturnForPrint for bill {BillId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching sales return bill for printing",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

    }
}

