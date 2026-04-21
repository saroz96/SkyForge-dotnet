// // Controllers/Retailer/ProfitAnalysisController.cs
// using Microsoft.AspNetCore.Authorization;
// using Microsoft.AspNetCore.Mvc;
// using Microsoft.EntityFrameworkCore;
// using SkyForge.Data;
// using SkyForge.Dto.RetailerDto;
// using SkyForge.Models.CompanyModel;
// using SkyForge.Models.FiscalYearModel;
// using System.Security.Claims;

// namespace SkyForge.Controllers.Retailer
// {
//     [Route("api/retailer")]
//     [ApiController]
//     [Authorize]
//     public class ProfitAnalysisController : ControllerBase
//     {
//         private readonly ApplicationDbContext _context;
//         private readonly ILogger<ProfitAnalysisController> _logger;

//         public ProfitAnalysisController(
//             ApplicationDbContext context,
//             ILogger<ProfitAnalysisController> logger)
//         {
//             _context = context;
//             _logger = logger;
//         }

//         [HttpGet("daily-profit/sales-analysis")]
//         public async Task<IActionResult> GetSalesAnalysis()
//         {
//             try
//             {
//                 _logger.LogInformation("=== GetSalesAnalysis Started ===");

//                 // Extract required info from JWT claims
//                 var companyId = User.FindFirst("currentCompany")?.Value;
//                 var companyName = User.FindFirst("currentCompanyName")?.Value;
//                 var fiscalYearId = User.FindFirst("currentFiscalYear")?.Value;
//                 var userId = User.FindFirst("userId")?.Value;
//                 var userName = User.FindFirst(ClaimTypes.Name)?.Value;
//                 var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
//                 var isAdminClaim = User.FindFirst("isAdmin")?.Value;
//                 var roleName = User.FindFirst(ClaimTypes.Role)?.Value;

//                 bool isAdmin = bool.TryParse(isAdminClaim, out bool admin) && admin;

//                 if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
//                 {
//                     return BadRequest(new
//                     {
//                         success = false,
//                         error = "No company selected"
//                     });
//                 }

//                 // Get company details
//                 var company = await _context.Companies
//                     .Where(c => c.Id == companyIdGuid)
//                     .Select(c => new
//                     {
//                         c.Id,
//                         c.Name,
//                         c.RenewalDate,
//                         DateFormat = c.DateFormat,
//                         VatEnabled = c.VatEnabled
//                     })
//                     .FirstOrDefaultAsync();

//                 if (company == null)
//                 {
//                     return NotFound(new
//                     {
//                         success = false,
//                         error = "Company not found"
//                     });
//                 }

//                 // Get current fiscal year
//                 Models.FiscalYearModel.FiscalYear currentFiscalYear = null;

//                 if (!string.IsNullOrEmpty(fiscalYearId) && Guid.TryParse(fiscalYearId, out Guid fiscalYearIdGuid))
//                 {
//                     currentFiscalYear = await _context.FiscalYears
//                         .FirstOrDefaultAsync(f => f.Id == fiscalYearIdGuid && f.CompanyId == companyIdGuid);
//                 }

//                 if (currentFiscalYear == null)
//                 {
//                     currentFiscalYear = await _context.FiscalYears
//                         .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
//                 }

//                 if (currentFiscalYear == null)
//                 {
//                     currentFiscalYear = await _context.FiscalYears
//                         .Where(f => f.CompanyId == companyIdGuid)
//                         .OrderByDescending(f => f.StartDate)
//                         .FirstOrDefaultAsync();
//                 }

//                 if (currentFiscalYear == null)
//                 {
//                     return BadRequest(new
//                     {
//                         success = false,
//                         error = "No fiscal year found"
//                     });
//                 }

//                 var today = DateTime.UtcNow;
//                 var nepaliDate = today.ToString("yyyy-MM-dd");

//                 var response = new
//                 {
//                     success = true,
//                     data = new
//                     {
//                         startDate = currentFiscalYear.StartDate?.ToString("yyyy-MM-dd") ?? "",
//                         endDate = currentFiscalYear.EndDate?.ToString("yyyy-MM-dd") ?? "",
//                         company = new
//                         {
//                             id = company.Id,
//                             renewalDate = company.RenewalDate,
//                             dateFormat = company.DateFormat?.ToString()?.ToLower() ?? "english",
//                         },
//                         currentFiscalYear = new
//                         {
//                             id = currentFiscalYear.Id,
//                             startDate = currentFiscalYear.StartDate,
//                             endDate = currentFiscalYear.EndDate,
//                             name = currentFiscalYear.Name,
//                             dateFormat = currentFiscalYear.DateFormat?.ToString()?.ToLower() ?? "english",
//                             isActive = currentFiscalYear.IsActive
//                         },
//                         companyDateFormat = company.DateFormat?.ToString()?.ToLower() ?? "english",
//                         nepaliDate = nepaliDate,
//                         currentCompany = new
//                         {
//                             id = company.Id,
//                             name = company.Name
//                         },
//                         fromDate = "",
//                         toDate = "",
//                         currentCompanyName = companyName ?? company.Name,
//                         showResults = false,
//                         user = new
//                         {
//                             id = userId,
//                             name = userName ?? "User",
//                             isAdmin = isAdmin,
//                             role = roleName ?? "User",
//                             preferences = new { theme = "light" }
//                         },
//                         theme = "light",
//                         isAdminOrSupervisor = isAdmin || roleName == "Supervisor" || roleName == "Admin"
//                     }
//                 };

//                 return Ok(response);
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error fetching profit analysis data");
//                 return StatusCode(500, new
//                 {
//                     success = false,
//                     message = "Failed to load profit analysis data",
//                     error = ex.Message
//                 });
//             }
//         }

//         [HttpPost("daily-profit/sales-analysis")]
//         public async Task<IActionResult> ProcessSalesAnalysis([FromBody] SalesAnalysisRequestDto request)
//         {
//             try
//             {
//                 _logger.LogInformation("=== ProcessSalesAnalysis Started ===");

//                 // Extract required info from JWT claims
//                 var companyId = User.FindFirst("currentCompany")?.Value;
//                 var companyName = User.FindFirst("currentCompanyName")?.Value;
//                 var fiscalYearId = User.FindFirst("currentFiscalYear")?.Value;
//                 var userId = User.FindFirst("userId")?.Value;
//                 var userName = User.FindFirst(ClaimTypes.Name)?.Value;
//                 var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
//                 var isAdminClaim = User.FindFirst("isAdmin")?.Value;
//                 var roleName = User.FindFirst(ClaimTypes.Role)?.Value;

//                 bool isAdmin = bool.TryParse(isAdminClaim, out bool admin) && admin;

//                 if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
//                 {
//                     return BadRequest(new
//                     {
//                         success = false,
//                         error = "No company selected"
//                     });
//                 }

//                 // Validate dates
//                 if (request.FromDate == default || request.ToDate == default)
//                 {
//                     return BadRequest(new
//                     {
//                         success = false,
//                         error = "Both from date and to date are required"
//                     });
//                 }

//                 // Get company details
//                 var company = await _context.Companies
//                     .Where(c => c.Id == companyIdGuid)
//                     .Select(c => new
//                     {
//                         c.Id,
//                         c.Name,
//                         c.RenewalDate,
//                         DateFormat = c.DateFormat,
//                         VatEnabled = c.VatEnabled
//                     })
//                     .FirstOrDefaultAsync();

//                 if (company == null)
//                 {
//                     return NotFound(new
//                     {
//                         success = false,
//                         error = "Company not found"
//                     });
//                 }

//                 // Get current fiscal year
//                 Models.FiscalYearModel.FiscalYear currentFiscalYear = null;

//                 if (!string.IsNullOrEmpty(fiscalYearId) && Guid.TryParse(fiscalYearId, out Guid fiscalYearIdGuid))
//                 {
//                     currentFiscalYear = await _context.FiscalYears
//                         .FirstOrDefaultAsync(f => f.Id == fiscalYearIdGuid && f.CompanyId == companyIdGuid);
//                 }

//                 if (currentFiscalYear == null)
//                 {
//                     currentFiscalYear = await _context.FiscalYears
//                         .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
//                 }

//                 if (currentFiscalYear == null)
//                 {
//                     currentFiscalYear = await _context.FiscalYears
//                         .Where(f => f.CompanyId == companyIdGuid)
//                         .OrderByDescending(f => f.StartDate)
//                         .FirstOrDefaultAsync();
//                 }

//                 if (currentFiscalYear == null)
//                 {
//                     return BadRequest(new
//                     {
//                         success = false,
//                         error = "No fiscal year found"
//                     });
//                 }

//                 var startDate = request.FromDate.Date;
//                 var endDate = request.ToDate.Date.AddDays(1).AddSeconds(-1);

//                 // Get net sales
//                 var netSales = await GetNetSales(companyIdGuid, currentFiscalYear.Id, startDate, endDate);

//                 // Get net purchases
//                 var netPurchases = await GetNetPurchases(companyIdGuid, currentFiscalYear.Id, startDate, endDate);

//                 // Calculate daily profit
//                 var dailyProfit = await CalculateDailyProfit(companyIdGuid, currentFiscalYear.Id, startDate, endDate);

//                 // Calculate summary statistics
//                 var summary = new SummaryDto
//                 {
//                     TotalGrossSales = dailyProfit.Sum(d => d.GrossSales),
//                     TotalSalesReturns = dailyProfit.Sum(d => d.Returns),
//                     TotalNetSales = dailyProfit.Sum(d => d.NetSales),
//                     TotalGrossPurchases = dailyProfit.Sum(d => d.GrossPurchases),
//                     TotalPurchaseReturns = dailyProfit.Sum(d => d.PurchaseReturns),
//                     TotalNetPurchases = dailyProfit.Sum(d => d.NetPurchases),
//                     DaysWithProfit = dailyProfit.Count(d => d.NetProfit > 0),
//                     DaysWithLoss = dailyProfit.Count(d => d.NetProfit < 0),
//                     TotalGrossProfit = dailyProfit.Sum(d => d.GrossProfit),
//                     TotalNetProfit = dailyProfit.Sum(d => d.NetProfit)
//                 };

//                 var response = new
//                 {
//                     success = true,
//                     data = new
//                     {
//                         netSales,
//                         netPurchases,
//                         dailyProfit,
//                         summary,
//                         companyDateFormat = company.DateFormat?.ToString()?.ToLower() ?? "english",
//                         fromDate = request.FromDate,
//                         toDate = request.ToDate,
//                         company = new
//                         {
//                             id = company.Id,
//                             name = company.Name,
//                             renewalDate = company.RenewalDate,
//                             dateFormat = company.DateFormat?.ToString()?.ToLower() ?? "english"
//                         },
//                         currentCompanyName = companyName ?? company.Name,
//                         currentFiscalYear = new
//                         {
//                             id = currentFiscalYear.Id,
//                             name = currentFiscalYear.Name,
//                             startDate = currentFiscalYear.StartDate,
//                             endDate = currentFiscalYear.EndDate,
//                             dateFormat = currentFiscalYear.DateFormat?.ToString()?.ToLower() ?? "english",
//                             isActive = currentFiscalYear.IsActive
//                         },
//                         user = new
//                         {
//                             id = userId,
//                             name = userName ?? "User",
//                             isAdmin = isAdmin,
//                             role = roleName ?? "User",
//                             preferences = new { theme = "light" }
//                         },
//                         theme = "light",
//                         isAdminOrSupervisor = isAdmin || roleName == "Supervisor" || roleName == "Admin"
//                     }
//                 };

//                 return Ok(response);
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error in profit analysis");
//                 return StatusCode(500, new
//                 {
//                     success = false,
//                     error = "Failed to generate profit analysis",
//                     message = ex.Message
//                 });
//             }
//         }

//         #region Helper Methods

//         private async Task<List<NetSalesDto>> GetNetSales(Guid companyId, Guid fiscalYearId, DateTime startDate, DateTime endDate)
//         {
//             // Get regular sales
//             var sales = await _context.SalesBillItems
//                 .Include(sbi => sbi.SalesBill)
//                 .Where(sbi => sbi.SalesBill.CompanyId == companyId &&
//                               sbi.SalesBill.FiscalYearId == fiscalYearId &&
//                               sbi.SalesBill.Date >= startDate &&
//                               sbi.SalesBill.Date <= endDate)
//                 .GroupBy(sbi => sbi.SalesBill.Date.Date)
//                 .Select(g => new
//                 {
//                     Date = g.Key,
//                     TotalSales = g.Sum(sbi => sbi.Quantity * (sbi.NetPrice > 0 ? sbi.NetPrice : sbi.Price)),
//                     Count = g.Count()
//                 })
//                 .ToListAsync();

//             // Get sales returns
//             var salesReturns = await _context.SalesReturnItems
//                 .Include(sri => sri.SalesReturn)
//                 .Where(sri => sri.SalesReturn.CompanyId == companyId &&
//                               sri.SalesReturn.FiscalYearId == fiscalYearId &&
//                               sri.SalesReturn.Date >= startDate &&
//                               sri.SalesReturn.Date <= endDate)
//                 .GroupBy(sri => sri.SalesReturn.Date.Date)
//                 .Select(g => new
//                 {
//                     Date = g.Key,
//                     TotalReturns = g.Sum(sri => sri.Quantity * (sri.NetPrice ?? sri.Price)),
//                     Count = g.Count()
//                 })
//                 .ToListAsync();

//             // Combine sales and returns
//             var salesMap = new Dictionary<DateTime, NetSalesDto>();

//             foreach (var sale in sales)
//             {
//                 salesMap[sale.Date] = new NetSalesDto
//                 {
//                     Date = sale.Date,
//                     GrossSales = sale.TotalSales,
//                     Returns = 0,
//                     NetSales = sale.TotalSales,
//                     SalesCount = sale.Count,
//                     ReturnCount = 0
//                 };
//             }

//             foreach (var returnItem in salesReturns)
//             {
//                 if (salesMap.ContainsKey(returnItem.Date))
//                 {
//                     var existing = salesMap[returnItem.Date];
//                     existing.Returns += returnItem.TotalReturns;
//                     existing.NetSales -= returnItem.TotalReturns;
//                     existing.ReturnCount += returnItem.Count;
//                 }
//                 else
//                 {
//                     salesMap[returnItem.Date] = new NetSalesDto
//                     {
//                         Date = returnItem.Date,
//                         GrossSales = 0,
//                         Returns = returnItem.TotalReturns,
//                         NetSales = -returnItem.TotalReturns,
//                         SalesCount = 0,
//                         ReturnCount = returnItem.Count
//                     };
//                 }
//             }

//             return salesMap.Values.OrderBy(d => d.Date).ToList();
//         }

//         private async Task<List<NetPurchasesDto>> GetNetPurchases(Guid companyId, Guid fiscalYearId, DateTime startDate, DateTime endDate)
//         {
//             // Get regular purchases
//             var purchases = await _context.PurchaseBillItems
//                 .Include(pbi => pbi.PurchaseBill)
//                 .Where(pbi => pbi.PurchaseBill.CompanyId == companyId &&
//                               pbi.PurchaseBill.FiscalYearId == fiscalYearId &&
//                               pbi.PurchaseBill.Date >= startDate &&
//                               pbi.PurchaseBill.Date <= endDate)
//                 .GroupBy(pbi => pbi.PurchaseBill.Date.Date)
//                 .Select(g => new
//                 {
//                     Date = g.Key,
//                     TotalPurchases = g.Sum(pbi => pbi.Quantity * pbi.NetPuPrice),
//                     TotalCost = g.Sum(pbi => pbi.Quantity * pbi.NetPuPrice),
//                     Count = g.Count()
//                 })
//                 .ToListAsync();

//             // Get purchase returns
//             var purchaseReturns = await _context.PurchaseReturnItems
//                 .Include(pri => pri.PurchaseReturn)
//                 .Where(pri => pri.PurchaseReturn.CompanyId == companyId &&
//                               pri.PurchaseReturn.FiscalYearId == fiscalYearId &&
//                               pri.PurchaseReturn.Date >= startDate &&
//                               pri.PurchaseReturn.Date <= endDate)
//                 .GroupBy(pri => pri.PurchaseReturn.Date.Date)
//                 .Select(g => new
//                 {
//                     Date = g.Key,
//                     TotalReturns = g.Sum(pri => (pri.Quantity ?? 0) * (pri.PuPrice ?? 0)),
//                     TotalCostReturns = g.Sum(pri => (pri.Quantity ?? 0) * (pri.PuPrice ?? 0)),
//                     Count = g.Count()
//                 })
//                 .ToListAsync();

//             // Combine purchases and returns
//             var purchaseMap = new Dictionary<DateTime, NetPurchasesDto>();

//             foreach (var purchase in purchases)
//             {
//                 purchaseMap[purchase.Date] = new NetPurchasesDto
//                 {
//                     Date = purchase.Date,
//                     GrossPurchases = purchase.TotalPurchases,
//                     GrossCost = purchase.TotalCost,
//                     PurchaseReturns = 0,
//                     CostReturns = 0,
//                     NetPurchases = purchase.TotalPurchases,
//                     NetCost = purchase.TotalCost,
//                     PurchaseCount = purchase.Count,
//                     ReturnCount = 0
//                 };
//             }

//             foreach (var returnItem in purchaseReturns)
//             {
//                 if (purchaseMap.ContainsKey(returnItem.Date))
//                 {
//                     var existing = purchaseMap[returnItem.Date];
//                     existing.PurchaseReturns += returnItem.TotalReturns;
//                     existing.CostReturns += returnItem.TotalCostReturns;
//                     existing.ReturnCount += returnItem.Count;
//                     existing.NetPurchases = existing.GrossPurchases - existing.PurchaseReturns;
//                     existing.NetCost = existing.GrossCost - existing.CostReturns;
//                 }
//                 else
//                 {
//                     purchaseMap[returnItem.Date] = new NetPurchasesDto
//                     {
//                         Date = returnItem.Date,
//                         GrossPurchases = 0,
//                         GrossCost = 0,
//                         PurchaseReturns = returnItem.TotalReturns,
//                         CostReturns = returnItem.TotalCostReturns,
//                         NetPurchases = -returnItem.TotalReturns,
//                         NetCost = -returnItem.TotalCostReturns,
//                         PurchaseCount = 0,
//                         ReturnCount = returnItem.Count
//                     };
//                 }
//             }

//             return purchaseMap.Values.OrderBy(d => d.Date).ToList();
//         }

//         private async Task<List<DailyProfitDto>> CalculateDailyProfit(Guid companyId, Guid fiscalYearId, DateTime startDate, DateTime endDate)
//         {
//             // Get sales profit calculation
//             var salesResults = await _context.SalesBillItems
//                 .Include(sbi => sbi.SalesBill)
//                 .Where(sbi => sbi.SalesBill.CompanyId == companyId &&
//                               sbi.SalesBill.FiscalYearId == fiscalYearId &&
//                               sbi.SalesBill.Date >= startDate &&
//                               sbi.SalesBill.Date <= endDate)
//                 .Select(sbi => new
//                 {
//                     Date = sbi.SalesBill.Date.Date,
//                     Quantity = sbi.Quantity,
//                     NetPrice = sbi.NetPrice > 0 ? sbi.NetPrice : sbi.Price,
//                     NetPuPrice = sbi.NetPuPrice ?? 0,
//                     ItemProfit = ((sbi.NetPrice > 0 ? sbi.NetPrice : sbi.Price) - (sbi.NetPuPrice ?? 0)) * sbi.Quantity,
//                     SalesAmount = (sbi.NetPrice > 0 ? sbi.NetPrice : sbi.Price) * sbi.Quantity,
//                     CostAmount = (sbi.NetPuPrice ?? 0) * sbi.Quantity
//                 })
//                 .GroupBy(x => x.Date)
//                 .Select(g => new
//                 {
//                     Date = g.Key,
//                     TotalProfit = g.Sum(x => x.ItemProfit),
//                     TotalSales = g.Sum(x => x.SalesAmount),
//                     TotalCost = g.Sum(x => x.CostAmount),
//                     SalesCount = g.Count()
//                 })
//                 .ToListAsync();

//             // Get sales returns (negative profit)
//             var salesReturnResults = await _context.SalesReturnItems
//                 .Include(sri => sri.SalesReturn)
//                 .Where(sri => sri.SalesReturn.CompanyId == companyId &&
//                               sri.SalesReturn.FiscalYearId == fiscalYearId &&
//                               sri.SalesReturn.Date >= startDate &&
//                               sri.SalesReturn.Date <= endDate)
//                 .Select(sri => new
//                 {
//                     Date = sri.SalesReturn.Date.Date,
//                     Quantity = sri.Quantity,
//                     NetPrice = sri.NetPrice ?? sri.Price,
//                     NetPuPrice = sri.NetPuPrice,
//                     ItemProfit = ((sri.NetPuPrice) - (sri.NetPrice ?? sri.Price)) * -1 * sri.Quantity,
//                     SalesAmount = (sri.NetPrice ?? sri.Price) * sri.Quantity * -1,
//                     CostAmount = sri.NetPuPrice * sri.Quantity * -1
//                 })
//                 .GroupBy(x => x.Date)
//                 .Select(g => new
//                 {
//                     Date = g.Key,
//                     TotalProfit = g.Sum(x => x.ItemProfit),
//                     TotalSales = g.Sum(x => x.SalesAmount),
//                     TotalCost = g.Sum(x => x.CostAmount),
//                     ReturnCount = g.Count()
//                 })
//                 .ToListAsync();

//             // Get net purchases data
//             var netPurchases = await GetNetPurchases(companyId, fiscalYearId, startDate, endDate);

//             // Combine sales and returns data by date
//             var profitByDate = new Dictionary<DateTime, DailyProfitDto>();

//             // Process sales
//             foreach (var sale in salesResults)
//             {
//                 profitByDate[sale.Date] = new DailyProfitDto
//                 {
//                     Date = sale.Date,
//                     GrossSales = sale.TotalSales,
//                     Returns = 0,
//                     NetSales = sale.TotalSales,
//                     NetCost = sale.TotalCost,
//                     NetProfit = sale.TotalProfit,
//                     SalesCount = sale.SalesCount,
//                     ReturnCount = 0,
//                     PurchaseCount = 0,
//                     GrossPurchases = 0,
//                     PurchaseReturns = 0,
//                     NetPurchases = 0,
//                     GrossProfit = sale.TotalSales - sale.TotalCost,
//                     CpPercentage = sale.TotalCost != 0 ? (sale.TotalProfit / sale.TotalCost) * 100 : 0,
//                     SpPercentage = sale.TotalSales != 0 ? (sale.TotalProfit / sale.TotalSales) * 100 : 0
//                 };
//             }

//             // Process sales returns
//             foreach (var returnItem in salesReturnResults)
//             {
//                 if (profitByDate.ContainsKey(returnItem.Date))
//                 {
//                     var existing = profitByDate[returnItem.Date];
//                     existing.Returns += Math.Abs(returnItem.TotalSales);
//                     existing.NetSales = existing.GrossSales - existing.Returns;
//                     existing.NetCost -= Math.Abs(returnItem.TotalCost);
//                     existing.NetProfit += returnItem.TotalProfit;
//                     existing.ReturnCount += returnItem.ReturnCount;

//                     // Recalculate percentages
//                     if (existing.NetProfit < 0)
//                     {
//                         existing.CpPercentage = Math.Abs(existing.NetCost) != 0
//                             ? (-Math.Abs(existing.NetProfit) / Math.Abs(existing.NetCost)) * 100
//                             : 0;
//                     }
//                     else
//                     {
//                         existing.CpPercentage = existing.NetCost != 0
//                             ? (existing.NetProfit / existing.NetCost) * 100
//                             : 0;
//                     }

//                     existing.SpPercentage = existing.NetSales != 0
//                         ? (existing.NetProfit / existing.NetSales) * 100
//                         : 0;
//                 }
//                 else
//                 {
//                     profitByDate[returnItem.Date] = new DailyProfitDto
//                     {
//                         Date = returnItem.Date,
//                         GrossSales = 0,
//                         Returns = Math.Abs(returnItem.TotalSales),
//                         NetSales = -Math.Abs(returnItem.TotalSales),
//                         NetCost = -Math.Abs(returnItem.TotalCost),
//                         NetProfit = returnItem.TotalProfit,
//                         SalesCount = 0,
//                         ReturnCount = returnItem.ReturnCount,
//                         PurchaseCount = 0,
//                         GrossPurchases = 0,
//                         PurchaseReturns = 0,
//                         NetPurchases = 0,
//                         GrossProfit = -Math.Abs(returnItem.TotalSales - returnItem.TotalCost),
//                         CpPercentage = Math.Abs(returnItem.TotalCost) != 0
//                             ? (-Math.Abs(returnItem.TotalProfit) / Math.Abs(returnItem.TotalCost)) * 100
//                             : 0,
//                         SpPercentage = Math.Abs(returnItem.TotalSales) != 0
//                             ? (-Math.Abs(returnItem.TotalProfit) / Math.Abs(returnItem.TotalSales)) * 100
//                             : 0
//                     };
//                 }
//             }

//             // Add purchase data
//             foreach (var purchase in netPurchases)
//             {
//                 if (profitByDate.ContainsKey(purchase.Date))
//                 {
//                     var existing = profitByDate[purchase.Date];
//                     existing.GrossPurchases = purchase.GrossPurchases;
//                     existing.PurchaseReturns = purchase.PurchaseReturns;
//                     existing.NetPurchases = purchase.NetPurchases;
//                     existing.PurchaseCount = purchase.PurchaseCount;
//                     existing.TotalTransactions = existing.SalesCount + existing.ReturnCount + existing.PurchaseCount;
//                 }
//                 else
//                 {
//                     profitByDate[purchase.Date] = new DailyProfitDto
//                     {
//                         Date = purchase.Date,
//                         GrossSales = 0,
//                         Returns = 0,
//                         NetSales = 0,
//                         GrossPurchases = purchase.GrossPurchases,
//                         PurchaseReturns = purchase.PurchaseReturns,
//                         NetPurchases = purchase.NetPurchases,
//                         NetCost = 0,
//                         NetProfit = 0,
//                         SalesCount = 0,
//                         ReturnCount = 0,
//                         PurchaseCount = purchase.PurchaseCount,
//                         TotalTransactions = purchase.PurchaseCount,
//                         GrossProfit = 0,
//                         CpPercentage = 0,
//                         SpPercentage = 0
//                     };
//                 }
//             }

//             // Ensure all days have TotalTransactions
//             foreach (var day in profitByDate.Values)
//             {
//                 if (day.TotalTransactions == 0)
//                 {
//                     day.TotalTransactions = day.SalesCount + day.ReturnCount + day.PurchaseCount;
//                 }
//             }

//             return profitByDate.Values.OrderBy(d => d.Date).ToList();
//         }

//         #endregion
//     }
// }

//-------------------------------------------------------------------------end

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto.RetailerDto;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;
using System.Security.Claims;

namespace SkyForge.Controllers.Retailer
{
    [Route("api/retailer")]
    [ApiController]
    [Authorize]
    public class ProfitAnalysisController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<ProfitAnalysisController> _logger;

        public ProfitAnalysisController(
            ApplicationDbContext context,
            ILogger<ProfitAnalysisController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet("daily-profit/sales-analysis")]
        public async Task<IActionResult> GetSalesAnalysis()
        {
            try
            {
                _logger.LogInformation("=== GetSalesAnalysis Started ===");

                // Extract required info from JWT claims
                var companyId = User.FindFirst("currentCompany")?.Value;
                var companyName = User.FindFirst("currentCompanyName")?.Value;
                var fiscalYearId = User.FindFirst("currentFiscalYear")?.Value;
                var userId = User.FindFirst("userId")?.Value;
                var userName = User.FindFirst(ClaimTypes.Name)?.Value;
                var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
                var isAdminClaim = User.FindFirst("isAdmin")?.Value;
                var roleName = User.FindFirst(ClaimTypes.Role)?.Value;

                bool isAdmin = bool.TryParse(isAdminClaim, out bool admin) && admin;

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected"
                    });
                }

                // Get company details
                var company = await _context.Companies
                    .Where(c => c.Id == companyIdGuid)
                    .Select(c => new
                    {
                        c.Id,
                        c.Name,
                        c.RenewalDate,
                        DateFormat = c.DateFormat,
                        VatEnabled = c.VatEnabled,
                        Address = c.Address,
                        City = c.City,
                        Phone = c.Phone,
                        Pan = c.Pan
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

                // Get current fiscal year
                Models.FiscalYearModel.FiscalYear currentFiscalYear = null;

                if (!string.IsNullOrEmpty(fiscalYearId) && Guid.TryParse(fiscalYearId, out Guid fiscalYearIdGuid))
                {
                    currentFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.Id == fiscalYearIdGuid && f.CompanyId == companyIdGuid);
                }

                if (currentFiscalYear == null)
                {
                    currentFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
                }

                if (currentFiscalYear == null)
                {
                    currentFiscalYear = await _context.FiscalYears
                        .Where(f => f.CompanyId == companyIdGuid)
                        .OrderByDescending(f => f.StartDate)
                        .FirstOrDefaultAsync();
                }

                if (currentFiscalYear == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No fiscal year found"
                    });
                }

                var today = DateTime.UtcNow;
                var currentNepaliDate = GetCurrentNepaliDate(); // Get current Nepali date as DateTime
                var nepaliDateStr = currentNepaliDate.ToString("yyyy-MM-dd");

                var isNepaliFormat = company.DateFormat?.ToString()?.ToLower() == "nepali";

                var response = new
                {
                    success = true,
                    data = new
                    {
                        startDate = isNepaliFormat 
                            ? (currentFiscalYear.StartDateNepali ?? nepaliDateStr)
                            : (currentFiscalYear.StartDate?.ToString("yyyy-MM-dd") ?? ""),
                        endDate = isNepaliFormat 
                            ? nepaliDateStr
                            : (currentFiscalYear.EndDate?.ToString("yyyy-MM-dd") ?? ""),
                        company = new
                        {
                            id = company.Id,
                            name = company.Name,
                            address = company.Address,
                            city = company.City,
                            phone = company.Phone,
                            pan = company.Pan,
                            renewalDate = company.RenewalDate,
                            dateFormat = company.DateFormat?.ToString()?.ToLower() ?? "english",
                            vatEnabled = company.VatEnabled
                        },
                        currentFiscalYear = new
                        {
                            id = currentFiscalYear.Id,
                            startDate = currentFiscalYear.StartDate?.ToString("yyyy-MM-dd"),
                            endDate = currentFiscalYear.EndDate?.ToString("yyyy-MM-dd"),
                            startDateNepali = currentFiscalYear.StartDateNepali,
                            endDateNepali = currentFiscalYear.EndDateNepali,
                            name = currentFiscalYear.Name,
                            dateFormat = currentFiscalYear.DateFormat?.ToString()?.ToLower() ?? "english",
                            isActive = currentFiscalYear.IsActive
                        },
                        companyDateFormat = company.DateFormat?.ToString()?.ToLower() ?? "english",
                        nepaliDate = nepaliDateStr,
                        currentCompany = new
                        {
                            id = company.Id,
                            name = company.Name
                        },
                        fromDate = "",
                        toDate = "",
                        currentCompanyName = companyName ?? company.Name,
                        showResults = false,
                        user = new
                        {
                            id = userId,
                            name = userName ?? "User",
                            isAdmin = isAdmin,
                            role = roleName ?? "User",
                            preferences = new { theme = "light" }
                        },
                        theme = "light",
                        isAdminOrSupervisor = isAdmin || roleName == "Supervisor" || roleName == "Admin"
                    }
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching profit analysis data");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Failed to load profit analysis data",
                    error = ex.Message
                });
            }
        }

        [HttpPost("daily-profit/sales-analysis")]
        public async Task<IActionResult> ProcessSalesAnalysis([FromBody] SalesAnalysisRequestDto request)
        {
            try
            {
                _logger.LogInformation("=== ProcessSalesAnalysis Started ===");

                // Extract required info from JWT claims
                var companyId = User.FindFirst("currentCompany")?.Value;
                var companyName = User.FindFirst("currentCompanyName")?.Value;
                var fiscalYearId = User.FindFirst("currentFiscalYear")?.Value;
                var userId = User.FindFirst("userId")?.Value;
                var userName = User.FindFirst(ClaimTypes.Name)?.Value;
                var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
                var isAdminClaim = User.FindFirst("isAdmin")?.Value;
                var roleName = User.FindFirst(ClaimTypes.Role)?.Value;

                bool isAdmin = bool.TryParse(isAdminClaim, out bool admin) && admin;

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected"
                    });
                }

                // Validate dates
                if (request.FromDate == default || request.ToDate == default)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Both from date and to date are required"
                    });
                }

                // Get company details
                var company = await _context.Companies
                    .Where(c => c.Id == companyIdGuid)
                    .Select(c => new
                    {
                        c.Id,
                        c.Name,
                        c.RenewalDate,
                        DateFormat = c.DateFormat,
                        VatEnabled = c.VatEnabled,
                        Address = c.Address,
                        City = c.City,
                        Phone = c.Phone,
                        Pan = c.Pan
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

                // Get current fiscal year
                Models.FiscalYearModel.FiscalYear currentFiscalYear = null;

                if (!string.IsNullOrEmpty(fiscalYearId) && Guid.TryParse(fiscalYearId, out Guid fiscalYearIdGuid))
                {
                    currentFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.Id == fiscalYearIdGuid && f.CompanyId == companyIdGuid);
                }

                if (currentFiscalYear == null)
                {
                    currentFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
                }

                if (currentFiscalYear == null)
                {
                    currentFiscalYear = await _context.FiscalYears
                        .Where(f => f.CompanyId == companyIdGuid)
                        .OrderByDescending(f => f.StartDate)
                        .FirstOrDefaultAsync();
                }

                if (currentFiscalYear == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No fiscal year found"
                    });
                }

                bool isNepaliFormat = company.DateFormat?.ToString()?.ToLower() == "nepali";

                DateTime startDateTime;
                DateTime endDateTime;

                // Handle dates based on company format
                if (isNepaliFormat)
                {
                    // For Nepali format, the request.FromDate and request.ToDate are Nepali date strings
                    // Parse them as DateTime (they are already stored as DateTime in the database)
                    // The frontend sends Nepali date strings, we need to convert them to DateTime
                    // Since your database stores nepaliDate as DateTime, we can parse the date string
                    // assuming it's in YYYY-MM-DD format and convert to DateTime at start of day
                    
                    if (DateTime.TryParseExact(request.FromDate.ToString("yyyy-MM-dd"), "yyyy-MM-dd", 
                        System.Globalization.CultureInfo.InvariantCulture, 
                        System.Globalization.DateTimeStyles.AssumeUniversal, out DateTime fromDate))
                    {
                        startDateTime = fromDate.Date;
                    }
                    else
                    {
                        startDateTime = DateTime.MinValue;
                    }
                    
                    if (DateTime.TryParseExact(request.ToDate.ToString("yyyy-MM-dd"), "yyyy-MM-dd", 
                        System.Globalization.CultureInfo.InvariantCulture, 
                        System.Globalization.DateTimeStyles.AssumeUniversal, out DateTime toDate))
                    {
                        endDateTime = toDate.Date.AddDays(1).AddSeconds(-1);
                    }
                    else
                    {
                        endDateTime = DateTime.MaxValue;
                    }
                    
                    _logger.LogInformation($"Using Nepali date filter: From {request.FromDate} ({startDateTime}) to {request.ToDate} ({endDateTime})");
                }
                else
                {
                    startDateTime = request.FromDate.Date;
                    endDateTime = request.ToDate.Date.AddDays(1).AddSeconds(-1);
                    _logger.LogInformation($"Using English date filter: From {startDateTime} to {endDateTime}");
                }

                // Get net sales with proper date filtering
                var netSales = await GetNetSales(companyIdGuid, currentFiscalYear.Id, startDateTime, endDateTime, isNepaliFormat);

                // Get net purchases with proper date filtering
                var netPurchases = await GetNetPurchases(companyIdGuid, currentFiscalYear.Id, startDateTime, endDateTime, isNepaliFormat);

                // Calculate daily profit with proper date filtering
                var dailyProfit = await CalculateDailyProfit(companyIdGuid, currentFiscalYear.Id, startDateTime, endDateTime, isNepaliFormat);

                // Calculate summary statistics
                var summary = new SummaryDto
                {
                    TotalGrossSales = dailyProfit.Sum(d => d.GrossSales),
                    TotalSalesReturns = dailyProfit.Sum(d => d.Returns),
                    TotalNetSales = dailyProfit.Sum(d => d.NetSales),
                    TotalGrossPurchases = dailyProfit.Sum(d => d.GrossPurchases),
                    TotalPurchaseReturns = dailyProfit.Sum(d => d.PurchaseReturns),
                    TotalNetPurchases = dailyProfit.Sum(d => d.NetPurchases),
                    DaysWithProfit = dailyProfit.Count(d => d.NetProfit > 0),
                    DaysWithLoss = dailyProfit.Count(d => d.NetProfit < 0),
                    TotalGrossProfit = dailyProfit.Sum(d => d.GrossProfit),
                    TotalNetProfit = dailyProfit.Sum(d => d.NetProfit)
                };

                var response = new
                {
                    success = true,
                    data = new
                    {
                        netSales,
                        netPurchases,
                        dailyProfit,
                        summary,
                        companyDateFormat = company.DateFormat?.ToString()?.ToLower() ?? "english",
                        fromDate = request.FromDate,
                        toDate = request.ToDate,
                        company = new
                        {
                            id = company.Id,
                            name = company.Name,
                            address = company.Address,
                            city = company.City,
                            phone = company.Phone,
                            pan = company.Pan,
                            renewalDate = company.RenewalDate,
                            dateFormat = company.DateFormat?.ToString()?.ToLower() ?? "english",
                            vatEnabled = company.VatEnabled
                        },
                        currentCompanyName = companyName ?? company.Name,
                        currentFiscalYear = new
                        {
                            id = currentFiscalYear.Id,
                            name = currentFiscalYear.Name,
                            startDate = currentFiscalYear.StartDate?.ToString("yyyy-MM-dd"),
                            endDate = currentFiscalYear.EndDate?.ToString("yyyy-MM-dd"),
                            startDateNepali = currentFiscalYear.StartDateNepali,
                            endDateNepali = currentFiscalYear.EndDateNepali,
                            dateFormat = currentFiscalYear.DateFormat?.ToString()?.ToLower() ?? "english",
                            isActive = currentFiscalYear.IsActive
                        },
                        user = new
                        {
                            id = userId,
                            name = userName ?? "User",
                            isAdmin = isAdmin,
                            role = roleName ?? "User",
                            preferences = new { theme = "light" }
                        },
                        theme = "light",
                        isAdminOrSupervisor = isAdmin || roleName == "Supervisor" || roleName == "Admin"
                    }
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in profit analysis");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Failed to generate profit analysis",
                    message = ex.Message
                });
            }
        }

        #region Helper Methods

        private DateTime GetCurrentNepaliDate()
        {
            // You can implement this based on your Nepali date conversion logic
            // For now, return UTC date
            return DateTime.UtcNow.Date;
        }

        private async Task<List<NetSalesDto>> GetNetSales(Guid companyId, Guid fiscalYearId, DateTime startDate, DateTime endDate, bool isNepaliFormat)
        {
            var salesQuery = _context.SalesBillItems
                .Include(sbi => sbi.SalesBill)
                .Where(sbi => sbi.SalesBill.CompanyId == companyId &&
                              sbi.SalesBill.FiscalYearId == fiscalYearId);

            // Apply date filter based on format
            if (isNepaliFormat)
            {
                salesQuery = salesQuery.Where(sbi => sbi.SalesBill.nepaliDate >= startDate && 
                                                     sbi.SalesBill.nepaliDate <= endDate);
            }
            else
            {
                salesQuery = salesQuery.Where(sbi => sbi.SalesBill.Date >= startDate && 
                                                     sbi.SalesBill.Date <= endDate);
            }

            // Get regular sales
            var sales = await salesQuery
                .GroupBy(sbi => isNepaliFormat ? sbi.SalesBill.nepaliDate.Date : sbi.SalesBill.Date.Date)
                .Select(g => new
                {
                    Date = g.Key,
                    TotalSales = g.Sum(sbi => sbi.Quantity * (sbi.NetPrice > 0 ? sbi.NetPrice : sbi.Price)),
                    Count = g.Count()
                })
                .ToListAsync();

            // Get sales returns
            var returnsQuery = _context.SalesReturnItems
                .Include(sri => sri.SalesReturn)
                .Where(sri => sri.SalesReturn.CompanyId == companyId &&
                              sri.SalesReturn.FiscalYearId == fiscalYearId);

            if (isNepaliFormat)
            {
                returnsQuery = returnsQuery.Where(sri => sri.SalesReturn.nepaliDate >= startDate && 
                                                         sri.SalesReturn.nepaliDate <= endDate);
            }
            else
            {
                returnsQuery = returnsQuery.Where(sri => sri.SalesReturn.Date >= startDate && 
                                                         sri.SalesReturn.Date <= endDate);
            }

            var salesReturns = await returnsQuery
                .GroupBy(sri => isNepaliFormat ? sri.SalesReturn.nepaliDate.Date : sri.SalesReturn.Date.Date)
                .Select(g => new
                {
                    Date = g.Key,
                    TotalReturns = g.Sum(sri => sri.Quantity * (sri.NetPrice ?? sri.Price)),
                    Count = g.Count()
                })
                .ToListAsync();

            // Combine sales and returns
            var salesMap = new Dictionary<DateTime, NetSalesDto>();

            foreach (var sale in sales)
            {
                salesMap[sale.Date] = new NetSalesDto
                {
                    Date = sale.Date,
                    GrossSales = sale.TotalSales,
                    Returns = 0,
                    NetSales = sale.TotalSales,
                    SalesCount = sale.Count,
                    ReturnCount = 0
                };
            }

            foreach (var returnItem in salesReturns)
            {
                if (salesMap.ContainsKey(returnItem.Date))
                {
                    var existing = salesMap[returnItem.Date];
                    existing.Returns += returnItem.TotalReturns;
                    existing.NetSales -= returnItem.TotalReturns;
                    existing.ReturnCount += returnItem.Count;
                }
                else
                {
                    salesMap[returnItem.Date] = new NetSalesDto
                    {
                        Date = returnItem.Date,
                        GrossSales = 0,
                        Returns = returnItem.TotalReturns,
                        NetSales = -returnItem.TotalReturns,
                        SalesCount = 0,
                        ReturnCount = returnItem.Count
                    };
                }
            }

            return salesMap.Values.OrderBy(d => d.Date).ToList();
        }

        private async Task<List<NetPurchasesDto>> GetNetPurchases(Guid companyId, Guid fiscalYearId, DateTime startDate, DateTime endDate, bool isNepaliFormat)
        {
            var purchasesQuery = _context.PurchaseBillItems
                .Include(pbi => pbi.PurchaseBill)
                .Where(pbi => pbi.PurchaseBill.CompanyId == companyId &&
                              pbi.PurchaseBill.FiscalYearId == fiscalYearId);

            if (isNepaliFormat)
            {
                purchasesQuery = purchasesQuery.Where(pbi => pbi.PurchaseBill.nepaliDate >= startDate && 
                                                            pbi.PurchaseBill.nepaliDate <= endDate);
            }
            else
            {
                purchasesQuery = purchasesQuery.Where(pbi => pbi.PurchaseBill.Date >= startDate && 
                                                            pbi.PurchaseBill.Date <= endDate);
            }

            // Get regular purchases
            var purchases = await purchasesQuery
                .GroupBy(pbi => isNepaliFormat ? pbi.PurchaseBill.nepaliDate.Date : pbi.PurchaseBill.Date.Date)
                .Select(g => new
                {
                    Date = g.Key,
                    TotalPurchases = g.Sum(pbi => pbi.Quantity * pbi.NetPuPrice),
                    TotalCost = g.Sum(pbi => pbi.Quantity * pbi.NetPuPrice),
                    Count = g.Count()
                })
                .ToListAsync();

            var returnsQuery = _context.PurchaseReturnItems
                .Include(pri => pri.PurchaseReturn)
                .Where(pri => pri.PurchaseReturn.CompanyId == companyId &&
                              pri.PurchaseReturn.FiscalYearId == fiscalYearId);

            if (isNepaliFormat)
            {
                returnsQuery = returnsQuery.Where(pri => pri.PurchaseReturn.nepaliDate >= startDate && 
                                                        pri.PurchaseReturn.nepaliDate <= endDate);
            }
            else
            {
                returnsQuery = returnsQuery.Where(pri => pri.PurchaseReturn.Date >= startDate && 
                                                        pri.PurchaseReturn.Date <= endDate);
            }

            // Get purchase returns
            var purchaseReturns = await returnsQuery
                .GroupBy(pri => isNepaliFormat ? pri.PurchaseReturn.nepaliDate.Date : pri.PurchaseReturn.Date.Date)
                .Select(g => new
                {
                    Date = g.Key,
                    TotalReturns = g.Sum(pri => (pri.Quantity ?? 0) * (pri.PuPrice ?? 0)),
                    TotalCostReturns = g.Sum(pri => (pri.Quantity ?? 0) * (pri.PuPrice ?? 0)),
                    Count = g.Count()
                })
                .ToListAsync();

            // Combine purchases and returns
            var purchaseMap = new Dictionary<DateTime, NetPurchasesDto>();

            foreach (var purchase in purchases)
            {
                purchaseMap[purchase.Date] = new NetPurchasesDto
                {
                    Date = purchase.Date,
                    GrossPurchases = purchase.TotalPurchases,
                    GrossCost = purchase.TotalCost,
                    PurchaseReturns = 0,
                    CostReturns = 0,
                    NetPurchases = purchase.TotalPurchases,
                    NetCost = purchase.TotalCost,
                    PurchaseCount = purchase.Count,
                    ReturnCount = 0
                };
            }

            foreach (var returnItem in purchaseReturns)
            {
                if (purchaseMap.ContainsKey(returnItem.Date))
                {
                    var existing = purchaseMap[returnItem.Date];
                    existing.PurchaseReturns += returnItem.TotalReturns;
                    existing.CostReturns += returnItem.TotalCostReturns;
                    existing.ReturnCount += returnItem.Count;
                    existing.NetPurchases = existing.GrossPurchases - existing.PurchaseReturns;
                    existing.NetCost = existing.GrossCost - existing.CostReturns;
                }
                else
                {
                    purchaseMap[returnItem.Date] = new NetPurchasesDto
                    {
                        Date = returnItem.Date,
                        GrossPurchases = 0,
                        GrossCost = 0,
                        PurchaseReturns = returnItem.TotalReturns,
                        CostReturns = returnItem.TotalCostReturns,
                        NetPurchases = -returnItem.TotalReturns,
                        NetCost = -returnItem.TotalCostReturns,
                        PurchaseCount = 0,
                        ReturnCount = returnItem.Count
                    };
                }
            }

            return purchaseMap.Values.OrderBy(d => d.Date).ToList();
        }

        private async Task<List<DailyProfitDto>> CalculateDailyProfit(Guid companyId, Guid fiscalYearId, DateTime startDate, DateTime endDate, bool isNepaliFormat)
        {
            var salesQuery = _context.SalesBillItems
                .Include(sbi => sbi.SalesBill)
                .Where(sbi => sbi.SalesBill.CompanyId == companyId &&
                              sbi.SalesBill.FiscalYearId == fiscalYearId);

            if (isNepaliFormat)
            {
                salesQuery = salesQuery.Where(sbi => sbi.SalesBill.nepaliDate >= startDate && 
                                                     sbi.SalesBill.nepaliDate <= endDate);
            }
            else
            {
                salesQuery = salesQuery.Where(sbi => sbi.SalesBill.Date >= startDate && 
                                                     sbi.SalesBill.Date <= endDate);
            }

            // Get sales profit calculation
            var salesResults = await salesQuery
                .Select(sbi => new
                {
                    Date = isNepaliFormat ? sbi.SalesBill.nepaliDate.Date : sbi.SalesBill.Date.Date,
                    Quantity = sbi.Quantity,
                    NetPrice = sbi.NetPrice > 0 ? sbi.NetPrice : sbi.Price,
                    NetPuPrice = sbi.NetPuPrice ?? 0,
                    ItemProfit = ((sbi.NetPrice > 0 ? sbi.NetPrice : sbi.Price) - (sbi.NetPuPrice ?? 0)) * sbi.Quantity,
                    SalesAmount = (sbi.NetPrice > 0 ? sbi.NetPrice : sbi.Price) * sbi.Quantity,
                    CostAmount = (sbi.NetPuPrice ?? 0) * sbi.Quantity
                })
                .GroupBy(x => x.Date)
                .Select(g => new
                {
                    Date = g.Key,
                    TotalProfit = g.Sum(x => x.ItemProfit),
                    TotalSales = g.Sum(x => x.SalesAmount),
                    TotalCost = g.Sum(x => x.CostAmount),
                    SalesCount = g.Count()
                })
                .ToListAsync();

            var returnsQuery = _context.SalesReturnItems
                .Include(sri => sri.SalesReturn)
                .Where(sri => sri.SalesReturn.CompanyId == companyId &&
                              sri.SalesReturn.FiscalYearId == fiscalYearId);

            if (isNepaliFormat)
            {
                returnsQuery = returnsQuery.Where(sri => sri.SalesReturn.nepaliDate >= startDate && 
                                                        sri.SalesReturn.nepaliDate <= endDate);
            }
            else
            {
                returnsQuery = returnsQuery.Where(sri => sri.SalesReturn.Date >= startDate && 
                                                        sri.SalesReturn.Date <= endDate);
            }

            // Get sales returns (negative profit)
            var salesReturnResults = await returnsQuery
                .Select(sri => new
                {
                    Date = isNepaliFormat ? sri.SalesReturn.nepaliDate.Date : sri.SalesReturn.Date.Date,
                    Quantity = sri.Quantity,
                    NetPrice = sri.NetPrice ?? sri.Price,
                    NetPuPrice = sri.NetPuPrice,
                    ItemProfit = ((sri.NetPuPrice) - (sri.NetPrice ?? sri.Price)) * -1 * sri.Quantity,
                    SalesAmount = (sri.NetPrice ?? sri.Price) * sri.Quantity * -1,
                    CostAmount = sri.NetPuPrice * sri.Quantity * -1
                })
                .GroupBy(x => x.Date)
                .Select(g => new
                {
                    Date = g.Key,
                    TotalProfit = g.Sum(x => x.ItemProfit),
                    TotalSales = g.Sum(x => x.SalesAmount),
                    TotalCost = g.Sum(x => x.CostAmount),
                    ReturnCount = g.Count()
                })
                .ToListAsync();

            // Get net purchases data
            var netPurchases = await GetNetPurchases(companyId, fiscalYearId, startDate, endDate, isNepaliFormat);

            // Combine sales and returns data by date
            var profitByDate = new Dictionary<DateTime, DailyProfitDto>();

            // Process sales
            foreach (var sale in salesResults)
            {
                profitByDate[sale.Date] = new DailyProfitDto
                {
                    Date = sale.Date,
                    GrossSales = sale.TotalSales,
                    Returns = 0,
                    NetSales = sale.TotalSales,
                    NetCost = sale.TotalCost,
                    NetProfit = sale.TotalProfit,
                    SalesCount = sale.SalesCount,
                    ReturnCount = 0,
                    PurchaseCount = 0,
                    GrossPurchases = 0,
                    PurchaseReturns = 0,
                    NetPurchases = 0,
                    GrossProfit = sale.TotalSales - sale.TotalCost,
                    CpPercentage = sale.TotalCost != 0 ? (sale.TotalProfit / sale.TotalCost) * 100 : 0,
                    SpPercentage = sale.TotalSales != 0 ? (sale.TotalProfit / sale.TotalSales) * 100 : 0
                };
            }

            // Process sales returns
            foreach (var returnItem in salesReturnResults)
            {
                if (profitByDate.ContainsKey(returnItem.Date))
                {
                    var existing = profitByDate[returnItem.Date];
                    existing.Returns += Math.Abs(returnItem.TotalSales);
                    existing.NetSales = existing.GrossSales - existing.Returns;
                    existing.NetCost -= Math.Abs(returnItem.TotalCost);
                    existing.NetProfit += returnItem.TotalProfit;
                    existing.ReturnCount += returnItem.ReturnCount;

                    // Recalculate percentages
                    if (existing.NetProfit < 0)
                    {
                        existing.CpPercentage = Math.Abs(existing.NetCost) != 0
                            ? (-Math.Abs(existing.NetProfit) / Math.Abs(existing.NetCost)) * 100
                            : 0;
                    }
                    else
                    {
                        existing.CpPercentage = existing.NetCost != 0
                            ? (existing.NetProfit / existing.NetCost) * 100
                            : 0;
                    }

                    existing.SpPercentage = existing.NetSales != 0
                        ? (existing.NetProfit / existing.NetSales) * 100
                        : 0;
                }
                else
                {
                    profitByDate[returnItem.Date] = new DailyProfitDto
                    {
                        Date = returnItem.Date,
                        GrossSales = 0,
                        Returns = Math.Abs(returnItem.TotalSales),
                        NetSales = -Math.Abs(returnItem.TotalSales),
                        NetCost = -Math.Abs(returnItem.TotalCost),
                        NetProfit = returnItem.TotalProfit,
                        SalesCount = 0,
                        ReturnCount = returnItem.ReturnCount,
                        PurchaseCount = 0,
                        GrossPurchases = 0,
                        PurchaseReturns = 0,
                        NetPurchases = 0,
                        GrossProfit = -Math.Abs(returnItem.TotalSales - returnItem.TotalCost),
                        CpPercentage = Math.Abs(returnItem.TotalCost) != 0
                            ? (-Math.Abs(returnItem.TotalProfit) / Math.Abs(returnItem.TotalCost)) * 100
                            : 0,
                        SpPercentage = Math.Abs(returnItem.TotalSales) != 0
                            ? (-Math.Abs(returnItem.TotalProfit) / Math.Abs(returnItem.TotalSales)) * 100
                            : 0
                    };
                }
            }

            // Add purchase data
            foreach (var purchase in netPurchases)
            {
                if (profitByDate.ContainsKey(purchase.Date))
                {
                    var existing = profitByDate[purchase.Date];
                    existing.GrossPurchases = purchase.GrossPurchases;
                    existing.PurchaseReturns = purchase.PurchaseReturns;
                    existing.NetPurchases = purchase.NetPurchases;
                    existing.PurchaseCount = purchase.PurchaseCount;
                    existing.TotalTransactions = existing.SalesCount + existing.ReturnCount + existing.PurchaseCount;
                }
                else
                {
                    profitByDate[purchase.Date] = new DailyProfitDto
                    {
                        Date = purchase.Date,
                        GrossSales = 0,
                        Returns = 0,
                        NetSales = 0,
                        GrossPurchases = purchase.GrossPurchases,
                        PurchaseReturns = purchase.PurchaseReturns,
                        NetPurchases = purchase.NetPurchases,
                        NetCost = 0,
                        NetProfit = 0,
                        SalesCount = 0,
                        ReturnCount = 0,
                        PurchaseCount = purchase.PurchaseCount,
                        TotalTransactions = purchase.PurchaseCount,
                        GrossProfit = 0,
                        CpPercentage = 0,
                        SpPercentage = 0
                    };
                }
            }

            // Ensure all days have TotalTransactions
            foreach (var day in profitByDate.Values)
            {
                if (day.TotalTransactions == 0)
                {
                    day.TotalTransactions = day.SalesCount + day.ReturnCount + day.PurchaseCount;
                }
            }

            return profitByDate.Values.OrderBy(d => d.Date).ToList();
        }

        #endregion
    }
}