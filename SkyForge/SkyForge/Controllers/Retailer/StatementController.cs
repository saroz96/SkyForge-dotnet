
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkyForge.Data;
using SkyForge.Dto.RetailerDto.TransactionDto;
using SkyForge.Models.AccountModel;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.Retailer.TransactionModel;
using SkyForge.Models.Shared;
using SkyForge.Services.Retailer.StatementServices;
using System.Security.Claims;

namespace SkyForge.Controllers.Retailer
{
    [ApiController]
    [Route("api/retailer")]
    [Authorize]
    public class StatementController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<StatementController> _logger;
        private readonly IStatementService _statementService;

        public StatementController(
            ApplicationDbContext context,
            ILogger<StatementController> logger,
            IStatementService statementService)
        {
            _context = context;
            _logger = logger;
            _statementService = statementService;
        }

        // GET: api/retailer/statement
        [HttpGet("statement")]
        public async Task<IActionResult> GetStatement(
            [FromQuery] Guid? account,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate,
            [FromQuery] string? paymentMode = "all",
            [FromQuery] bool includeItems = false,
            [FromQuery] string? dateFormat = "english")
        {
            try
            {
                _logger.LogInformation("=== GetStatement Started ===");
                _logger.LogInformation("DateFormat: {DateFormat}, FromDate: {FromDate}, ToDate: {ToDate}",
                    dateFormat, fromDate, toDate);

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
                }

                // Build request DTO with dateFormat
                var request = new StatementRequestDTO
                {
                    AccountId = account,
                    FromDate = fromDate,
                    ToDate = toDate,
                    PaymentMode = paymentMode,
                    IncludeItems = includeItems,
                    DateFormat = dateFormat
                };

                // Get statement data from service
                var response = await _statementService.GetStatementAsync(
                    companyIdGuid,
                    fiscalYearIdGuid,
                    userIdGuid,
                    request);

                if (!response.Success)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = response.Error
                    });
                }

                return Ok(new
                {
                    success = true,
                    data = response.Data
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetStatement");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching statement",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        [HttpPut("transaction/{id}/cash-settlement")]
        public async Task<IActionResult> UpdateCashSettlement(Guid id, [FromBody] CashSettlementRequest request)
        {
            try
            {
                // Extract company ID from JWT claims
                var companyIdClaim = User.FindFirst("currentCompany")?.Value;
                if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected. Please select a company first."
                    });
                }

                // Try to find the transaction by direct ID first
                var transaction = await _context.Transactions
                    .Include(t => t.Account)
                    .Include(t => t.CashSettlementUser)
                    .FirstOrDefaultAsync(t => t.Id == id && t.CompanyId == companyIdGuid);

                // If not found by direct ID, try to find by related bill IDs
                if (transaction == null)
                {
                    transaction = await _context.Transactions
                        .Include(t => t.Account)
                        .Include(t => t.CashSettlementUser)
                        .FirstOrDefaultAsync(t =>
                            t.CompanyId == companyIdGuid &&
                            (t.SalesBillId == id ||
                             t.PurchaseBillId == id ||
                             t.SalesReturnBillId == id ||
                             t.PurchaseReturnBillId == id ||
                             t.PaymentAccountId == id ||
                             t.ReceiptAccountId == id ||
                             t.JournalBillId == id ||
                             t.DebitNoteId == id ||
                             t.CreditNoteId == id));
                }

                if (transaction == null)
                {
                    _logger.LogWarning($"Transaction not found for ID: {id} in company: {companyIdGuid}");
                    return NotFound(new
                    {
                        success = false,
                        error = "Transaction not found. Please refresh the page and try again."
                    });
                }

                // Only allow cash transactions
                if (transaction.PaymentMode != PaymentMode.Cash)
                {
                    return BadRequest(new { success = false, error = "Cash settlement only available for cash transactions" });
                }

                // Only allow specific transaction types
                var allowedTypes = new[] { TransactionType.Sale, TransactionType.Purc, TransactionType.SlRt, TransactionType.PrRt };
                if (!allowedTypes.Contains(transaction.Type))
                {
                    return BadRequest(new { success = false, error = "Cash settlement only available for Sales, Purchases, Sales Return, and Purchase Return" });
                }

                // Validate the status based on transaction type
                bool isValidStatus = false;
                switch (transaction.Type)
                {
                    case TransactionType.Sale:
                        isValidStatus = request.Status == "Received" || request.Status == "Pending";
                        break;
                    case TransactionType.Purc:
                        isValidStatus = request.Status == "Paid" || request.Status == "Pending";
                        break;
                    case TransactionType.SlRt:
                        isValidStatus = request.Status == "Refunded" || request.Status == "Pending";
                        break;
                    case TransactionType.PrRt:
                        isValidStatus = request.Status == "Returned" || request.Status == "Pending";
                        break;
                    default:
                        isValidStatus = false;
                        break;
                }

                if (!isValidStatus)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = $"Invalid status '{request.Status}' for transaction type '{transaction.Type}'. Valid statuses: " +
                               (transaction.Type == TransactionType.Sale ? "Received, Pending" :
                                transaction.Type == TransactionType.Purc ? "Paid, Pending" :
                                transaction.Type == TransactionType.SlRt ? "Refunded, Pending" :
                                transaction.Type == TransactionType.PrRt ? "Returned, Pending" : "")
                    });
                }

                // Get user ID from claims
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token" });
                }

                // Get user for the settlement record
                var user = await _context.Users
                    .Where(u => u.Id == userIdGuid)
                    .Select(u => new { u.Id, u.Name })
                    .FirstOrDefaultAsync();

                // Update the main transaction with settlement information
                transaction.CashSettlementStatus = request.Status;
                transaction.CashSettlementDate = DateTime.UtcNow;
                transaction.CashSettlementUserId = userIdGuid;
                transaction.CashSettlementRemarks = request.Remarks;
                transaction.UpdatedAt = DateTime.UtcNow;

                // ============================================================
                // CRITICAL FIX: Also update the linked transaction (Purchase/Sale)
                // The status is already being copied, now we copy the remarks too
                // ============================================================
                Transaction? linkedTransaction = null;

                // For Payment transactions linked to a Purchase
                if (transaction.Type == TransactionType.Pymt && transaction.PaymentAccountId.HasValue)
                {
                    linkedTransaction = await _context.Transactions
                        .FirstOrDefaultAsync(t => t.PurchaseBillId == transaction.PaymentAccountId
                            && t.CompanyId == companyIdGuid
                            && t.Type == TransactionType.Purc);

                    if (linkedTransaction != null)
                    {
                        _logger.LogInformation($"Found linked purchase transaction: {linkedTransaction.Id}");
                    }
                }
                // For Receipt transactions linked to a Sale
                else if (transaction.Type == TransactionType.Rcpt && transaction.ReceiptAccountId.HasValue)
                {
                    linkedTransaction = await _context.Transactions
                        .FirstOrDefaultAsync(t => t.SalesBillId == transaction.ReceiptAccountId
                            && t.CompanyId == companyIdGuid
                            && t.Type == TransactionType.Sale);

                    if (linkedTransaction != null)
                    {
                        _logger.LogInformation($"Found linked sale transaction: {linkedTransaction.Id}");
                    }
                }
                // For Purchase transactions with a PurchaseBillId
                else if (transaction.Type == TransactionType.Purc && transaction.PurchaseBillId.HasValue)
                {
                    linkedTransaction = await _context.Transactions
                        .FirstOrDefaultAsync(t => t.PurchaseBillId == transaction.PurchaseBillId
                            && t.CompanyId == companyIdGuid
                            && t.Type == TransactionType.Purc
                            && t.Id != transaction.Id);

                    if (linkedTransaction != null)
                    {
                        _logger.LogInformation($"Found linked purchase transaction: {linkedTransaction.Id}");
                    }
                }
                // For Sale transactions with a SalesBillId
                else if (transaction.Type == TransactionType.Sale && transaction.SalesBillId.HasValue)
                {
                    linkedTransaction = await _context.Transactions
                        .FirstOrDefaultAsync(t => t.SalesBillId == transaction.SalesBillId
                            && t.CompanyId == companyIdGuid
                            && t.Type == TransactionType.Sale
                            && t.Id != transaction.Id);

                    if (linkedTransaction != null)
                    {
                        _logger.LogInformation($"Found linked sale transaction: {linkedTransaction.Id}");
                    }
                }

                // If a linked transaction exists, update it with BOTH status AND remarks
                if (linkedTransaction != null)
                {
                    linkedTransaction.CashSettlementStatus = request.Status;
                    linkedTransaction.CashSettlementDate = DateTime.UtcNow;
                    linkedTransaction.CashSettlementUserId = userIdGuid;
                    linkedTransaction.CashSettlementRemarks = request.Remarks; // <-- THIS IS THE KEY FIX
                    linkedTransaction.UpdatedAt = DateTime.UtcNow;

                    _logger.LogInformation($"Updated linked transaction {linkedTransaction.Id} with status: {request.Status}, remarks: {request.Remarks}");
                }
                else
                {
                    _logger.LogWarning($"No linked transaction found for transaction {transaction.Id}");
                }

                // Save all changes
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = $"Cash settlement status updated to {request.Status}",
                    data = new
                    {
                        status = transaction.CashSettlementStatus,
                        date = transaction.CashSettlementDate,
                        user = user?.Name ?? "Unknown User",
                        remarks = transaction.CashSettlementRemarks
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating cash settlement for transaction {TransactionId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while updating cash settlement"
                });
            }
        }


        // Public endpoint - No authentication required!
        [HttpGet("public-statement/{token}")]
        [AllowAnonymous] // This allows access without login
        public async Task<IActionResult> GetPublicStatement(string token)
        {
            try
            {
                _logger.LogInformation("Public statement accessed with token: {Token}", token);

                // Validate token - check if it exists in your database
                var accountToken = await _context.AccountShareTokens
                    .FirstOrDefaultAsync(t => t.Token == token && t.IsActive);

                if (accountToken == null)
                {
                    return NotFound("Invalid or expired share link");
                }

                // Check if the account exists
                var account = await _context.Accounts
                    .Include(a => a.AccountGroup)
                    .FirstOrDefaultAsync(a => a.Id == accountToken.AccountId);

                if (account == null)
                {
                    return NotFound("Account not found");
                }

                // Get company and fiscal year
                var company = await _context.Companies
                    .FirstOrDefaultAsync(c => c.Id == account.CompanyId);

                if (company == null)
                {
                    return NotFound("Company not found");
                }

                var fiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.CompanyId == company.Id && f.IsActive);

                if (fiscalYear == null)
                {
                    fiscalYear = await _context.FiscalYears
                        .Where(f => f.CompanyId == company.Id)
                        .OrderByDescending(f => f.StartDate)
                        .FirstOrDefaultAsync();
                }

                // Get statement data
                // Use current date range or fiscal year date range
                DateTime fromDate = fiscalYear?.StartDate ?? DateTime.UtcNow.AddMonths(-1);
                DateTime toDate = DateTime.UtcNow;

                var request = new StatementRequestDTO
                {
                    AccountId = account.Id,
                    FromDate = fromDate,
                    ToDate = toDate,
                    PaymentMode = "all",
                    IncludeItems = false,
                    DateFormat = company.DateFormat?.ToString() ?? "english"
                };

                // Get the statement using your existing service
                var response = await _statementService.GetStatementAsync(
                    company.Id,
                    fiscalYear?.Id ?? Guid.Empty,
                    Guid.Empty, // No user needed for public view
                    request);

                if (!response.Success)
                {
                    return StatusCode(500, "Error generating statement");
                }

                // Generate HTML response
                var html = GeneratePublicStatementHTML(account, company, response.Data, fromDate, toDate);

                return Content(html, "text/html");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating public statement for token: {Token}", token);
                return StatusCode(500, "An error occurred while generating the statement");
            }
        }

        // Generate HTML for public view
        //         private string GeneratePublicStatementHTML(Account account, Company company, StatementDataDTO data, DateTime fromDate, DateTime toDate)
        //         {
        //             // Get Nepali dates from the data - use the first item's NepaliDate or generate from AD
        //             string fromDateNepali = data.Statement.FirstOrDefault()?.NepaliDate ?? fromDate.ToString("yyyy-MM-dd");
        //             string toDateNepali = data.Statement.LastOrDefault()?.NepaliDate ?? toDate.ToString("yyyy-MM-dd");

        //             var html = $@"
        // <!DOCTYPE html>
        // <html>
        // <head>
        //     <meta charset=""UTF-8"">
        //     <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
        //     <title>Statement - {account.Name}</title>
        //     <style>
        //         body {{ 
        //             font-family: Arial, Helvetica, sans-serif; 
        //             padding: 20px; 
        //             max-width: 1200px;
        //             margin: 0 auto;
        //             background: #fff;
        //             color: #333;
        //         }}
        //         .print-header {{ 
        //             text-align: center; 
        //             margin-bottom: 20px; 
        //             border-bottom: 2px solid #333;
        //             padding-bottom: 15px;
        //         }}
        //         .company-name {{ 
        //             font-size: 22px; 
        //             font-weight: bold; 
        //             margin: 10px 0;
        //             color: #1a1a1a;
        //         }}
        //         .company-details {{
        //             font-size: 12px;
        //             color: #555;
        //             margin: 5px 0;
        //         }}
        //         .report-title {{ 
        //             font-size: 18px; 
        //             font-weight: bold; 
        //             margin: 15px 0 10px 0;
        //             text-decoration: underline;
        //             color: #1a1a1a;
        //         }}
        //         .statement-info {{
        //             font-size: 13px;
        //             margin: 8px 0;
        //             text-align: left;
        //             background: #f8f9fa;
        //             padding: 10px;
        //             border-radius: 4px;
        //         }}
        //         .statement-info strong {{
        //             color: #1a1a1a;
        //         }}
        //         table {{ 
        //             width: 100%; 
        //             border-collapse: collapse; 
        //             margin: 15px 0;
        //             font-size: 12px;
        //         }}
        //         th, td {{ 
        //             border: 1px solid #ddd; 
        //             padding: 6px 8px; 
        //             text-align: left; 
        //         }}
        //         th {{ 
        //             background-color: #f5f5f5; 
        //             font-weight: bold;
        //             color: #1a1a1a;
        //             white-space: nowrap;
        //         }}
        //         .text-end {{ 
        //             text-align: right; 
        //         }}
        //         .text-center {{
        //             text-align: center;
        //         }}
        //         .grand-total-row td {{
        //             font-weight: bold;
        //             border-top: 3px double #333;
        //             background-color: #f9f9f9;
        //         }}
        //         .footer {{ 
        //             margin-top: 25px; 
        //             text-align: center; 
        //             font-size: 11px; 
        //             color: #888; 
        //             border-top: 1px solid #ddd;
        //             padding-top: 15px;
        //         }}
        //         .last-updated {{
        //             font-size: 12px;
        //             color: #666;
        //             margin-top: 10px;
        //             text-align: center;
        //         }}
        //         .remarks-column {{
        //             font-size: 11px;
        //             color: #555;
        //             max-width: 150px;
        //             word-wrap: break-word;
        //         }}
        //         .voucher-type {{
        //             font-weight: 500;
        //             color: #1a1a1a;
        //         }}
        //         @media print {{
        //             body {{ padding: 10px; }}
        //             .no-print {{ display: none; }}
        //         }}
        //         @media (max-width: 768px) {{
        //             table {{ font-size: 10px; }}
        //             th, td {{ padding: 4px 6px; }}
        //         }}
        //     </style>
        // </head>
        // <body>
        //     <div class=""print-header"">
        //         <div class=""company-name"">{company.Name}</div>
        //         <div class=""company-details"">
        //             {(!string.IsNullOrEmpty(company.Address) ? company.Address : "")}{(!string.IsNullOrEmpty(company.City) ? ", " + company.City : "")}<br>
        //             PAN: {(!string.IsNullOrEmpty(company.Pan) ? company.Pan : "")} | Phone: {(!string.IsNullOrEmpty(company.Phone) ? company.Phone : "")}
        //         </div>
        //         <hr>
        //         <div class=""report-title"">STATEMENT OF ACCOUNT</div>
        //         <div class=""statement-info"">
        //             <strong>Party:</strong> {account.UniqueNumber} - {account.Name}&nbsp;|&nbsp;
        //             <strong>From (BS):</strong> {fromDateNepali} &nbsp;|&nbsp; <strong>To (BS):</strong> {toDateNepali}
        //             <strong>From (AD):</strong> {FormatADDate(fromDate)} &nbsp;|&nbsp; <strong>To (AD):</strong> {FormatADDate(toDate)}
        //     </div>

        //     <table>
        //         <thead>
        //             <tr>
        //                 <th>Miti</th>
        //                 <th>Date</th>
        //                 <th>Vch No.</th>
        //                 <th>Type</th>
        //                 <th>Pay Mode</th>
        //                 <th>Account</th>
        //                 <th class=""text-end"">Debit (Rs.)</th>
        //                 <th class=""text-end"">Credit (Rs.)</th>
        //                 <th class=""text-end"">Balance (Rs.)</th>
        //                 <th>Remarks</th>
        //             </tr>
        //         </thead>
        //         <tbody>";

        //             decimal balance = data.OpeningBalance;
        //             foreach (var item in data.Statement)
        //             {
        //                 balance += item.Debit - item.Credit;
        //                 var balanceText = balance >= 0 ? "Dr" : "Cr";
        //                 var formattedBalance = Math.Abs(balance).ToString("N2");

        //                 // Use NepaliDate from database, fallback to "-" if null
        //                 string nepaliDate = !string.IsNullOrEmpty(item.NepaliDate) ? item.NepaliDate : "-";

        //                 // Get AD date
        //                 string adDate = item.Date.HasValue ? FormatADDate(item.Date.Value) : "-";
        //                 // Get account name/type
        //                 string accountName = GetAccountDisplayName(item);

        //                 // Get remarks (combine instType, instNo, cash settlement remarks, etc.)
        //                 string remarks = GetRemarksDisplay(item);

        //                 html += $@"
        //             <tr>
        //                 <td>{nepaliDate}</td>
        //                 <td>{adDate}</td>
        //                 <td>{(string.IsNullOrEmpty(item.BillNumber) ? "-" : item.BillNumber)}</td>
        //                 <td class=""voucher-type"">{(string.IsNullOrEmpty(item.Type) ? "-" : item.Type)}</td>
        //                 <td>{(string.IsNullOrEmpty(item.PaymentMode) ? "-" : item.PaymentMode)}</td>
        //                 <td>{accountName}</td>
        //                 <td class=""text-end"">{(item.Debit > 0 ? item.Debit.ToString("N2") : "-")}</td>
        //                 <td class=""text-end"">{(item.Credit > 0 ? item.Credit.ToString("N2") : "-")}</td>
        //                 <td class=""text-end"">{formattedBalance} {balanceText}</td>
        //                 <td class=""remarks-column"">{remarks}</td>
        //             </tr>";
        //             }

        //             var finalBalanceText = balance >= 0 ? "Dr" : "Cr";
        //             var finalBalance = Math.Abs(balance).ToString("N2");

        //             html += $@"
        //         </tbody>
        //         <tfoot>
        //             <tr class=""grand-total-row"">
        //                 <td colspan=""6"" class=""text-end"">TOTALS</td>
        //                 <td class=""text-end"">{data.TotalDebit.ToString("N2")}</td>
        //                 <td class=""text-end"">{data.TotalCredit.ToString("N2")}</td>
        //                 <td class=""text-end"">{finalBalance} {finalBalanceText}</td>
        //                 <td></td>
        //             </tr>
        //         </tfoot>
        //     </table>

        //     <div class=""last-updated"">
        //         <strong>Last Updated:</strong> {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC | Powered by Ams Software
        //     </div>
        // </body>
        // </html>";

        //             return html;
        //         }

        private string GeneratePublicStatementHTML(Account account, Company company, StatementDataDTO data, DateTime fromDate, DateTime toDate)
        {
            // Get Nepali dates from the data - use the first item's NepaliDate or generate from AD
            string fromDateNepali = data.Statement.FirstOrDefault()?.NepaliDate ?? fromDate.ToString("yyyy-MM-dd");
            string toDateNepali = data.Statement.LastOrDefault()?.NepaliDate ?? toDate.ToString("yyyy-MM-dd");

            var html = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>Statement - {account.Name}</title>
    <style>
        body {{ 
            font-family: Arial, Helvetica, sans-serif; 
            padding: 20px; 
            max-width: 1200px;
            margin: 0 auto;
            background: #fff;
            color: #333;
        }}
        .print-header {{ 
            text-align: center; 
            margin-bottom: 20px; 
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
        }}
        .company-name {{ 
            font-size: 22px; 
            font-weight: bold; 
            margin: 10px 0;
            color: #1a1a1a;
        }}
        .company-details {{
            font-size: 12px;
            color: #555;
            margin: 5px 0;
        }}
        .report-title {{ 
            font-size: 18px; 
            font-weight: bold; 
            margin: 15px 0 10px 0;
            text-decoration: underline;
            color: #1a1a1a;
        }}
        .statement-info {{
            font-size: 13px;
            margin: 8px 0;
            text-align: left;
            background: #f8f9fa;
            padding: 10px 15px;
            border-radius: 4px;
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            align-items: center;
            gap: 5px 15px;
        }}
        .statement-info .info-item {{
            display: inline-flex;
            align-items: center;
            gap: 3px;
            white-space: nowrap;
        }}
        .statement-info .info-item strong {{
            color: #1a1a1a;
            margin-right: 2px;
        }}
        .statement-info .info-separator {{
            color: #999;
        }}
        @media (max-width: 768px) {{
            .statement-info {{
                flex-direction: column;
                align-items: flex-start;
                gap: 3px;
            }}
            .statement-info .info-item {{
                white-space: normal;
            }}
        }}
        table {{ 
            width: 100%; 
            border-collapse: collapse; 
            margin: 15px 0;
            font-size: 12px;
        }}
        th, td {{ 
            border: 1px solid #ddd; 
            padding: 6px 8px; 
            text-align: left; 
        }}
        th {{ 
            background-color: #f5f5f5; 
            font-weight: bold;
            color: #1a1a1a;
            white-space: nowrap;
        }}
        .text-end {{ 
            text-align: right; 
        }}
        .text-center {{
            text-align: center;
        }}
        .grand-total-row td {{
            font-weight: bold;
            border-top: 3px double #333;
            background-color: #f9f9f9;
        }}
        .footer {{ 
            margin-top: 25px; 
            text-align: center; 
            font-size: 11px; 
            color: #888; 
            border-top: 1px solid #ddd;
            padding-top: 15px;
        }}
        .last-updated {{
            font-size: 12px;
            color: #666;
            margin-top: 10px;
            text-align: center;
        }}
        .remarks-column {{
            font-size: 11px;
            color: #555;
            max-width: 150px;
            word-wrap: break-word;
        }}
        .voucher-type {{
            font-weight: 500;
            color: #1a1a1a;
        }}
        @media print {{
            body {{ padding: 10px; }}
            .no-print {{ display: none; }}
        }}
        @media (max-width: 768px) {{
            table {{ font-size: 10px; }}
            th, td {{ padding: 4px 6px; }}
        }}
    </style>
</head>
<body>
    <div class=""print-header"">
        <div class=""company-name"">{company.Name}</div>
        <div class=""company-details"">
            {(!string.IsNullOrEmpty(company.Address) ? company.Address : "")}{(!string.IsNullOrEmpty(company.City) ? ", " + company.City : "")}<br>
            PAN: {(!string.IsNullOrEmpty(company.Pan) ? company.Pan : "")} | Phone: {(!string.IsNullOrEmpty(company.Phone) ? company.Phone : "")}
        </div>
        <hr>
        <div class=""report-title"">STATEMENT OF ACCOUNT</div>
        <div class=""statement-info"">
            <span class=""info-item""><strong>Party:</strong> {account.UniqueNumber} - {account.Name}</span>
            <span class=""info-separator""></span>
            <span class=""info-item""><strong>From (BS):</strong> {fromDateNepali}</span>
            <span class=""info-separator""></span>
            <span class=""info-item""><strong>To (BS):</strong> {toDateNepali}</span>
            <span class=""info-separator""></span>
            <span class=""info-item""><strong>From (AD):</strong> {FormatADDate(fromDate)}</span>
            <span class=""info-separator""></span>
            <span class=""info-item""><strong>To (AD):</strong> {FormatADDate(toDate)}</span>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Miti</th>
                <th>Date</th>
                <th>Vch No.</th>
                <th>Type</th>
                <th>Pay Mode</th>
                <th>Account</th>
                <th class=""text-end"">Debit (Rs.)</th>
                <th class=""text-end"">Credit (Rs.)</th>
                <th class=""text-end"">Balance (Rs.)</th>
                <th>Remarks</th>
            </tr>
        </thead>
        <tbody>";

            decimal balance = data.OpeningBalance;
            foreach (var item in data.Statement)
            {
                balance += item.Debit - item.Credit;
                var balanceText = balance >= 0 ? "Dr" : "Cr";
                var formattedBalance = Math.Abs(balance).ToString("N2");

                // Use NepaliDate from database, fallback to "-" if null
                string nepaliDate = !string.IsNullOrEmpty(item.NepaliDate) ? item.NepaliDate : "-";

                // Get AD date
                string adDate = item.Date.HasValue ? FormatADDate(item.Date.Value) : "-";
                // Get account name/type
                string accountName = GetAccountDisplayName(item);

                // Get remarks (combine instType, instNo, cash settlement remarks, etc.)
                string remarks = GetRemarksDisplay(item);

                html += $@"
            <tr>
                <td>{nepaliDate}</td>
                <td>{adDate}</td>
                <td>{(string.IsNullOrEmpty(item.BillNumber) ? "-" : item.BillNumber)}</td>
                <td class=""voucher-type"">{(string.IsNullOrEmpty(item.Type) ? "-" : item.Type)}</td>
                <td>{(string.IsNullOrEmpty(item.PaymentMode) ? "-" : item.PaymentMode)}</td>
                <td>{accountName}</td>
                <td class=""text-end"">{(item.Debit > 0 ? item.Debit.ToString("N2") : "-")}</td>
                <td class=""text-end"">{(item.Credit > 0 ? item.Credit.ToString("N2") : "-")}</td>
                <td class=""text-end"">{formattedBalance} {balanceText}</td>
                <td class=""remarks-column"">{remarks}</td>
            </tr>";
            }

            var finalBalanceText = balance >= 0 ? "Dr" : "Cr";
            var finalBalance = Math.Abs(balance).ToString("N2");

            html += $@"
        </tbody>
        <tfoot>
            <tr class=""grand-total-row"">
                <td colspan=""6"" class=""text-end"">TOTALS</td>
                <td class=""text-end"">{data.TotalDebit.ToString("N2")}</td>
                <td class=""text-end"">{data.TotalCredit.ToString("N2")}</td>
                <td class=""text-end"">{finalBalance} {finalBalanceText}</td>
                <td></td>
            </tr>
        </tfoot>
    </table>

    <div class=""last-updated"">
        <strong>Last Updated:</strong> {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC | Powered by Ams Software
    </div>
</body>
</html>";

            return html;
        }
        private string FormatADDate(DateTime date)
        {
            return date.ToString("M/d/yyyy");
        }

        // Helper method to get account display name
        private string GetAccountDisplayName(StatementEntryDTO item)
        {
            // Check if this is an opening balance entry
            if (item.AccountType == "Opening" || item.Type == "Opening" ||
                (!string.IsNullOrEmpty(item.Type) && item.Type == "Opening"))
            {
                return "Opening";
            }

            // For Payment transactions
            if (item.Type == "Pymt" || item.Type == "Payment")
            {
                if (!string.IsNullOrEmpty(item.PaymentReceiptType))
                    return item.PaymentReceiptType;
                if (!string.IsNullOrEmpty(item.AccountType))
                    return item.AccountType;
                return "Payment";
            }

            // For Receipt transactions
            if (item.Type == "Rcpt" || item.Type == "Receipt")
            {
                if (!string.IsNullOrEmpty(item.PaymentReceiptType))
                    return item.PaymentReceiptType;
                if (!string.IsNullOrEmpty(item.AccountType))
                    return item.AccountType;
                return "Receipt";
            }

            // For Purchase
            if (item.Type == "Purc" || item.Type == "Purchase")
            {
                if (!string.IsNullOrEmpty(item.PurchaseSalesType))
                    return item.PurchaseSalesType;
                if (!string.IsNullOrEmpty(item.AccountType))
                    return item.AccountType;
                return "Purchase";
            }

            // For Sales Return
            if (item.Type == "SlRt" || item.Type == "SalesReturn")
            {
                if (!string.IsNullOrEmpty(item.PurchaseSalesReturnType))
                    return item.PurchaseSalesReturnType;
                if (!string.IsNullOrEmpty(item.AccountType))
                    return item.AccountType;
                return "Sales Return";
            }

            // For Purchase Return
            if (item.Type == "PrRt" || item.Type == "PurchaseReturn")
            {
                if (!string.IsNullOrEmpty(item.PurchaseSalesReturnType))
                    return item.PurchaseSalesReturnType;
                if (!string.IsNullOrEmpty(item.AccountType))
                    return item.AccountType;
                return "Purchase Return";
            }

            // For Journal
            if (item.Type == "Jrnl" || item.Type == "Journal")
            {
                if (!string.IsNullOrEmpty(item.JournalAccountType))
                    return item.JournalAccountType;
                if (!string.IsNullOrEmpty(item.AccountType))
                    return item.AccountType;
                return "Journal";
            }

            // For Debit Note
            if (item.Type == "DrNt" || item.Type == "DebitNote")
            {
                if (!string.IsNullOrEmpty(item.DrCrNoteAccountType))
                    return item.DrCrNoteAccountType;
                if (!string.IsNullOrEmpty(item.AccountType))
                    return item.AccountType;
                return "Debit Note";
            }

            // For Credit Note
            if (item.Type == "CrNt" || item.Type == "CreditNote")
            {
                if (!string.IsNullOrEmpty(item.DrCrNoteAccountType))
                    return item.DrCrNoteAccountType;
                if (!string.IsNullOrEmpty(item.AccountType))
                    return item.AccountType;
                return "Credit Note";
            }

            // For Sale
            if (item.Type == "Sale" || item.Type == "Sales")
            {
                if (!string.IsNullOrEmpty(item.PurchaseSalesType))
                    return item.PurchaseSalesType;
                if (!string.IsNullOrEmpty(item.AccountType))
                    return item.AccountType;
                return "Sale";
            }

            // Default: return AccountType or empty
            return !string.IsNullOrEmpty(item.AccountType) ? item.AccountType : "";
        }

        // Helper method to get remarks display
        private string GetRemarksDisplay(StatementEntryDTO item)
        {
            var remarks = new List<string>();

            // Add instrument type and number
            if (!string.IsNullOrEmpty(item.InstType) && item.InstType != "NA" && item.InstType != "na")
            {
                remarks.Add(item.InstType);
                if (!string.IsNullOrEmpty(item.InstNo))
                    remarks.Add(item.InstNo);
            }
            else if (!string.IsNullOrEmpty(item.InstNo))
            {
                remarks.Add(item.InstNo);
            }

            // Add cash settlement remarks
            if (!string.IsNullOrEmpty(item.CashSettlementRemarks))
            {
                remarks.Add(item.CashSettlementRemarks);
            }

            return remarks.Count > 0 ? string.Join(" ", remarks) : "";
        }

        [HttpPost("generate-share-token")]
        public async Task<IActionResult> GenerateShareToken([FromBody] GenerateShareTokenRequest request)
        {
            try
            {
                // Get company ID from claims
                var companyIdClaim = User.FindFirst("currentCompany")?.Value;
                if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out Guid companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                // Verify account belongs to the company
                var account = await _context.Accounts
                    .FirstOrDefaultAsync(a => a.Id == request.AccountId && a.CompanyId == companyIdGuid);

                if (account == null)
                {
                    return NotFound(new { success = false, error = "Account not found" });
                }

                // Check if token already exists
                var existingToken = await _context.AccountShareTokens
                    .FirstOrDefaultAsync(t => t.AccountId == request.AccountId);

                if (existingToken != null)
                {
                    // Return existing token
                    var baseUrl = $"{Request.Scheme}://{Request.Host}";
                    var shareableUrl = $"{baseUrl}/api/retailer/public-statement/{existingToken.Token}";

                    return Ok(new
                    {
                        success = true,
                        shareableUrl = shareableUrl,
                        token = existingToken.Token,
                        isNew = false,
                        message = "Existing share link retrieved"
                    });
                }

                // Generate new token
                var token = GenerateUniqueToken();
                var userId = User.FindFirst("userId")?.Value ?? "system";

                var shareToken = new AccountShareToken
                {
                    Id = Guid.NewGuid(),
                    AccountId = request.AccountId,
                    Token = token,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = userId
                };

                await _context.AccountShareTokens.AddAsync(shareToken);
                await _context.SaveChangesAsync();

                var baseUrlNew = $"{Request.Scheme}://{Request.Host}";
                var shareableUrlNew = $"{baseUrlNew}/api/retailer/public-statement/{token}";

                return Ok(new
                {
                    success = true,
                    shareableUrl = shareableUrlNew,
                    token = token,
                    isNew = true,
                    message = "Share link generated successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating share token");
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        private string GenerateUniqueToken()
        {
            // Generate a unique, URL-friendly token
            var guid = Guid.NewGuid().ToString("N");
            var timestamp = DateTime.UtcNow.Ticks.ToString("x");
            var combined = $"{guid}-{timestamp}";

            // Encode to base64 and make URL-friendly
            var bytes = System.Text.Encoding.UTF8.GetBytes(combined);
            var base64 = Convert.ToBase64String(bytes);

            // Remove special characters for URL safety
            var token = base64
                .Replace("+", "-")
                .Replace("/", "_")
                .Replace("=", "");

            return token.Substring(0, Math.Min(token.Length, 50));
        }

        public class GenerateShareTokenRequest
        {
            public Guid AccountId { get; set; }
        }

        public class CashSettlementRequest
        {
            public string Status { get; set; } = string.Empty; // "Received", "Paid", "Refunded","Returned","Pending"
            public string? Remarks { get; set; }
        }

    }
}