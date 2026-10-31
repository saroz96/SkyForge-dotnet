
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkyForge.Data;
using SkyForge.Dto.RetailerDto.TransactionDto;
using SkyForge.Models.AccountModel;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.Retailer.TransactionModel;
using SkyForge.Models.Shared;
using SkyForge.Services;
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
        private readonly IEmailService _emailService;
        private readonly IPdfService _pdfService;
        private readonly IConfiguration _config;


        public StatementController(
            ApplicationDbContext context,
            ILogger<StatementController> logger,
            IStatementService statementService,
            IEmailService emailService,
            IPdfService pdfService,
             IConfiguration config)
        {
            _context = context;
            _logger = logger;
            _statementService = statementService;
            _emailService = emailService;
            _pdfService = pdfService;
            _config = config;
        }

        [HttpPost("statement/{accountId}/email")]
        public async Task<IActionResult> EmailStatement(
    Guid accountId,
    [FromQuery] DateTime? fromDate,
    [FromQuery] DateTime? toDate,
    [FromQuery] string? paymentMode = "all",
    [FromQuery] string? fromDateBs = null,  // 👈 Added for Nepali Date
    [FromQuery] string? toDateBs = null)    // 👈 Added for Nepali Date
        {
            try
            {
                // 1. Validate Company
                var companyIdClaim = User.FindFirst("currentCompany")?.Value;
                if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out Guid companyId))
                    return BadRequest(new { success = false, error = "No company selected." });

                // 2. Find Account & Company details
                var account = await _context.Accounts
                    .Include(a => a.Company)
                    .FirstOrDefaultAsync(a => a.Id == accountId && a.CompanyId == companyId);

                if (account == null || string.IsNullOrWhiteSpace(account.Email))
                    return BadRequest(new { success = false, error = "Email not found. Please update the client's profile." });

                // 3. Get or Generate the Share Token
                var tokenRecord = await _context.AccountShareTokens.FirstOrDefaultAsync(t => t.AccountId == accountId && t.IsActive);
                string shareLink;
                var frontendBase = _config["AppSettings:FrontendBaseUrl"]?.TrimEnd('/') ?? "https://amsacc.com";

                if (tokenRecord == null)
                {
                    var newToken = GenerateUniqueToken();
                    _context.AccountShareTokens.Add(new AccountShareToken
                    {
                        Id = Guid.NewGuid(),
                        AccountId = accountId,
                        Token = newToken,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    });
                    await _context.SaveChangesAsync();
                    shareLink = $"{frontendBase}/s/{newToken}";
                }
                else
                {
                    shareLink = $"{frontendBase}/s/{tokenRecord.Token}";
                }

                // ============================================================
                // 4. FETCH STATEMENT DATA & GENERATE PDF
                // ============================================================
                byte[] pdfBytes = null;
                try
                {
                    Guid fiscalYearId = Guid.Empty;
                    var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                    if (!Guid.TryParse(fiscalYearIdClaim, out fiscalYearId))
                    {
                        var activeFy = await _context.FiscalYears.FirstOrDefaultAsync(f => f.CompanyId == companyId && f.IsActive);
                        if (activeFy != null) fiscalYearId = activeFy.Id;
                    }

                    // Use the dates from the frontend, or fallback to the current month
                    DateTime finalToDate = toDate ?? DateTime.UtcNow;
                    DateTime finalFromDate = fromDate ?? new DateTime(finalToDate.Year, finalToDate.Month, 1);

                    var statementRequest = new StatementRequestDTO
                    {
                        AccountId = accountId,
                        FromDate = finalFromDate,
                        ToDate = finalToDate,
                        PaymentMode = paymentMode ?? "all",
                        IncludeItems = false,
                        DateFormat = account.Company?.DateFormat?.ToString() ?? "english"
                    };

                    var userId = Guid.Parse(User.FindFirst("userId")?.Value ?? Guid.Empty.ToString());

                    var statementResponse = await _statementService.GetStatementAsync(
                        companyId, fiscalYearId, userId, statementRequest
                    );

                    if (statementResponse.Success)
                    {
                        // ✅ Fallback to AD string if BS string is somehow missing
                        string displayFromDate = !string.IsNullOrEmpty(fromDateBs) ? fromDateBs : finalFromDate.ToString("yyyy-MM-dd");
                        string displayToDate = !string.IsNullOrEmpty(toDateBs) ? toDateBs : finalToDate.ToString("yyyy-MM-dd");

                        // ✅ Pass the BS date strings to the HTML generator
                        string htmlContent = GeneratePrintHtmlForEmail(
                            account,
                            account.Company,
                            statementResponse.Data,
                            displayFromDate,
                            displayToDate
                        );

                        // Generate the PDF
                        pdfBytes = await _pdfService.GeneratePdfFromHtmlAsync(htmlContent);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to generate PDF attachment, email will send without it.");
                }

                // ============================================================
                // 5. Send the Email
                // ============================================================
                string companyName = account.Company?.Name ?? "Ams Software";

                await _emailService.SendStatementEmailAsync(
                    account.Email.Trim(),
                    account.Name,
                    shareLink,
                    companyName,
                    pdfBytes
                );

                return Ok(new { success = true, message = $"Statement and PDF emailed successfully to {account.Email}" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending statement email for AccountId: {AccountId}", accountId);
                return StatusCode(500, new { success = false, error = "Failed to send email. Please try again." });
            }
        }

        //     private string GeneratePrintHtmlForEmail(Account account, Company company, StatementDataDTO data, string displayFromDate, string displayToDate)
        //     {
        //         var sb = new System.Text.StringBuilder();

        //         sb.Append(@"
        // <html>
        // <head>
        //     <meta charset='UTF-8'>
        //     <style>
        //         @page { margin: 5mm; size: A4 portrait; } 
        //         body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; margin: 0; padding: 5mm; background: #fff; color: #000; }
        //         table { width: 100%; border-collapse: collapse; page-break-inside: auto; font-size: 10px; } 
        //         tr { page-break-inside: avoid; page-break-after: auto; }
        //         th, td { border: 1px solid #333; padding: 4px 6px; text-align: left; white-space: nowrap; }
        //         th { background-color: #e8e8e8 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 11px; font-weight: 700; color: #1a1a1a; }
        //         td { font-size: 10px; padding: 4px 6px; } 
        //         .print-header { text-align: center; margin-bottom: 10px; }
        //         .text-end { text-align: right; } 
        //         .report-title { text-align: center; text-decoration: underline; font-size: 14px; font-weight: 700; margin: 6px 0; color: #1a1a1a; letter-spacing: 0.5px; }
        //         .grand-total-row td { font-weight: 700; border-top: 3px double #000; background-color: #f5f5f5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        //         .company-name { font-size: 18px; font-weight: 700; margin: 0; padding: 0; color: #1a1a1a; letter-spacing: 1px; }
        //         .company-details { font-size: 10px; margin: 4px 0; color: #333; line-height: 1.4; }
        //         .statement-info { font-size: 10px; margin: 4px 0; color: #444; line-height: 1.6; }
        //         .statement-info strong { font-weight: 600; color: #1a1a1a; }
        //         .footer { margin-top: 15px; font-size: 9px; text-align: center; border-top: 1px solid #ccc; padding-top: 8px; color: #666; }
        //         .total-label { font-size: 11px; font-weight: 600; }
        //     </style>
        // </head>
        // <body>");

        //         // Header Info
        //         string partyDisplayName = $"{account.UniqueNumber} - {account.Name}";
        //         string address = $"{company.Address}{(string.IsNullOrEmpty(company.City) ? "" : ", " + company.City)}";

        //         // Convert AD to BS for display (Assuming you handle date formatting on frontend, we'll use raw string for now or map it)
        //         // Note: For exact BS dates, your StatementData should already contain the NepaliDate strings from the DB.

        //         sb.Append($@"
        //     <div class='print-header'>
        //         <div class='company-name'>{company.Name}</div>
        //         <div class='company-details'>
        //             {address}<br>
        //             PAN: {company.Pan} | Phone: {company.Phone}
        //         </div>
        //         <hr style='margin:6px 0; border: 1px solid #ccc;'>
        //         <div class='report-title'>STATEMENT OF ACCOUNT</div>
        //         <div class='statement-info'>
        //             <strong>Party:</strong> {partyDisplayName} &nbsp;|&nbsp; 
        //             <strong>From (BS):</strong> {displayFromDate:yyyy-MM-dd} &nbsp;|&nbsp; 
        //             <strong>To (BS):</strong> {displayToDate:yyyy-MM-dd} &nbsp;|&nbsp; 
        //             <strong>Payment Mode:</strong> {data.PaymentMode}
        //         </div>
        //     </div>
        //     <table>
        //         <thead>
        //             <tr>
        //                 <th>Miti</th><th>Date</th><th>Vch No.</th><th>Type</th><th>Pay Mode</th><th>Account</th>
        //                 <th class='text-end'>Debit</th><th class='text-end'>Credit</th><th class='text-end'>Balance</th>
        //             </tr>
        //         </thead>
        //         <tbody>");

        //         decimal runningBalance = data.OpeningBalance;
        //         decimal totalDebit = 0, totalCredit = 0;

        //         foreach (var item in data.Statement)
        //         {
        //             decimal debit = item.Debit;
        //             decimal credit = item.Credit;
        //             runningBalance += debit - credit;
        //             totalDebit += debit;
        //             totalCredit += credit;

        //             string balanceText = runningBalance > 0 ? $"{Math.Abs(runningBalance):N2} Dr" : $"{Math.Abs(runningBalance):N2} Cr";

        //             // Use the exact same Account Name logic as your React code
        //             string accountName = item.AccountType == "Opening" ? "Opening" :
        //                 (item.PaymentReceiptType ?? item.AccountType ?? item.PurchaseSalesType ?? item.PurchaseSalesReturnType ?? item.JournalAccountType ?? "");

        //             // Dates (Use NepaliDate from DB if available, else fallback to AD)
        //             string bsDate = !string.IsNullOrEmpty(item.NepaliDate) ? item.NepaliDate : "-";
        //             string adDate = item.Date.HasValue ? item.Date.Value.ToString("M/d/yyyy") : "-";

        //             sb.Append($@"
        //         <tr>
        //             <td>{bsDate}</td>
        //             <td>{adDate}</td>
        //             <td>{item.BillNumber}</td>
        //             <td>{item.Type}</td>
        //             <td>{item.PaymentMode}</td>
        //             <td style='white-space:normal; word-wrap:break-word; max-width:150px;'>{accountName}</td>
        //             <td class='text-end'>{(debit > 0 ? debit.ToString("N2") : "-")}</td>
        //             <td class='text-end'>{(credit > 0 ? credit.ToString("N2") : "-")}</td>
        //             <td class='text-end'>{balanceText}</td>
        //         </tr>");
        //         }

        //         string finalBalanceText = runningBalance > 0 ? $"{Math.Abs(runningBalance):N2} Dr" : $"{Math.Abs(runningBalance):N2} Cr";

        //         sb.Append($@"
        //         </tbody>
        //         <tfoot>
        //             <tr class='grand-total-row'>
        //                 <td colspan='6' class='text-end total-label'>TOTALS</td>
        //                 <td class='text-end total-label'>{totalDebit:N2}</td>
        //                 <td class='text-end total-label'>{totalCredit:N2}</td>
        //                 <td class='text-end total-label'>{finalBalanceText}</td>
        //             </tr>
        //         </tfoot>
        //     </table>
        //     <div class='footer'>Generated on: {DateTime.Now:yyyy-MM-dd HH:mm:ss} | Powered by Ams Software</div>
        // </body>
        // </html>");

        //         return sb.ToString();
        //     }

        // GET: api/retailer/statement

        private string GeneratePrintHtmlForEmail(Account account, Company company, StatementDataDTO data, string displayFromDate, string displayToDate)
        {
            var sb = new System.Text.StringBuilder();

            sb.Append(@"
    <html>
    <head>
        <meta charset='UTF-8'>
        <style>
            @page { margin: 5mm; size: A4 portrait; }
            body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; margin: 0; padding: 5mm; background: #fff; color: #000; }
            table { width: 100%; border-collapse: collapse; page-break-inside: auto; font-size: 10px; } 
            tr { page-break-inside: avoid; page-break-after: auto; }
            th, td { border: 1px solid #333; padding: 4px 6px; text-align: left; white-space: nowrap; }
            th { background-color: #e8e8e8 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 11px; font-weight: 700; color: #1a1a1a; }
            td { font-size: 10px; padding: 4px 6px; } 
            .print-header { text-align: center; margin-bottom: 10px; }
            .text-end { text-align: right; } 
            .report-title { text-align: center; text-decoration: underline; font-size: 14px; font-weight: 700; margin: 6px 0; color: #1a1a1a; letter-spacing: 0.5px; }
            
            /* ✅ Ensure the grand total only appears once at the end */
            .grand-total-row td { font-weight: 700; border-top: 3px double #000; background-color: #f5f5f5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; page-break-inside: avoid; }
            
            .company-name { font-size: 18px; font-weight: 700; margin: 0; padding: 0; color: #1a1a1a; letter-spacing: 1px; }
            .company-details { font-size: 10px; margin: 4px 0; color: #333; line-height: 1.4; }
            .statement-info { font-size: 10px; margin: 4px 0; color: #444; line-height: 1.6; }
            .statement-info strong { font-weight: 600; color: #1a1a1a; }
            .footer { margin-top: 15px; font-size: 9px; text-align: center; border-top: 1px solid #ccc; padding-top: 8px; color: #666; }
            .total-label { font-size: 11px; font-weight: 600; }
        </style>
    </head>
    <body>");

            string partyDisplayName = $"{account.UniqueNumber} - {account.Name}";
            string address = $"{company.Address}{(string.IsNullOrEmpty(company.City) ? "" : ", " + company.City)}";

            sb.Append($@"
        <div class='print-header'>
            <div class='company-name'>{company.Name}</div>
            <div class='company-details'>
                {address}<br>
                PAN: {company.Pan} | Phone: {company.Phone}
            </div>
            <hr style='margin:6px 0; border: 1px solid #ccc;'>
            <div class='report-title'>STATEMENT OF ACCOUNT</div>
            <div class='statement-info'>
                <strong>Party:</strong> {partyDisplayName} &nbsp;|&nbsp; 
                <strong>From (BS):</strong> {displayFromDate} &nbsp;|&nbsp; 
                <strong>To (BS):</strong> {displayToDate} &nbsp;|&nbsp; 
                <strong>Payment Mode:</strong> {data.PaymentMode}
            </div>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Miti</th><th>Date</th><th>Vch No.</th><th>Type</th><th>Pay Mode</th><th>Account</th>
                    <th class='text-end'>Debit</th><th class='text-end'>Credit</th><th class='text-end'>Balance</th>
                </tr>
            </thead>
            <tbody>");

            decimal runningBalance = data.OpeningBalance;
            decimal totalDebit = 0, totalCredit = 0;

            foreach (var item in data.Statement)
            {
                decimal debit = item.Debit;
                decimal credit = item.Credit;
                runningBalance += debit - credit;
                totalDebit += debit;
                totalCredit += credit;

                string balanceText = runningBalance > 0 ? $"{Math.Abs(runningBalance):N2} Dr" : $"{Math.Abs(runningBalance):N2} Cr";

                string accountName = item.AccountType == "Opening" ? "Opening" :
                    (item.PaymentReceiptType ?? item.AccountType ?? item.PurchaseSalesType ?? item.PurchaseSalesReturnType ?? item.JournalAccountType ?? "");

                string bsDate = !string.IsNullOrEmpty(item.NepaliDate) ? item.NepaliDate : "-";
                string adDate = item.Date.HasValue ? item.Date.Value.ToString("M/d/yyyy") : "-";

                sb.Append($@"
            <tr>
                <td>{bsDate}</td>
                <td>{adDate}</td>
                <td>{item.BillNumber}</td>
                <td>{item.Type}</td>
                <td>{item.PaymentMode}</td>
                <td style='white-space:normal; word-wrap:break-word; max-width:150px;'>{accountName}</td>
                <td class='text-end'>{(debit > 0 ? debit.ToString("N2") : "-")}</td>
                <td class='text-end'>{(credit > 0 ? credit.ToString("N2") : "-")}</td>
                <td class='text-end'>{balanceText}</td>
            </tr>");
            }

            string finalBalanceText = runningBalance > 0 ? $"{Math.Abs(runningBalance):N2} Dr" : $"{Math.Abs(runningBalance):N2} Cr";

            // ✅ CHANGED: Appended the totals as a regular row inside the tbody instead of a tfoot
            sb.Append($@"
                <tr class='grand-total-row'>
                    <td colspan='6' class='text-end total-label'>TOTALS</td>
                    <td class='text-end total-label'>{totalDebit:N2}</td>
                    <td class='text-end total-label'>{totalCredit:N2}</td>
                    <td class='text-end total-label'>{finalBalanceText}</td>
                </tr>
            </tbody>
        </table>
        <div class='footer'>Generated on: {DateTime.Now:yyyy-MM-dd HH:mm:ss} | Powered by Ams Software</div>
    </body>
    </html>");

            return sb.ToString();
        }

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

        // [HttpPut("transaction/{id}/cash-settlement")]
        // public async Task<IActionResult> UpdateCashSettlement(Guid id, [FromBody] CashSettlementRequest request)
        // {
        //     try
        //     {
        //         var companyIdClaim = User.FindFirst("currentCompany")?.Value;
        //         if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out Guid companyIdGuid))
        //             return BadRequest(new { success = false, error = "No company selected." });

        //         // 1. Find the initial transaction
        //         var transaction = await _context.Transactions
        //             .FirstOrDefaultAsync(t => t.Id == id && t.CompanyId == companyIdGuid);

        //         if (transaction == null)
        //         {
        //             transaction = await _context.Transactions
        //                 .FirstOrDefaultAsync(t =>
        //                     t.CompanyId == companyIdGuid &&
        //                     (t.SalesBillId == id || t.PurchaseBillId == id || t.SalesReturnBillId == id || t.PurchaseReturnBillId == id));
        //         }

        //         if (transaction == null)
        //             return NotFound(new { success = false, error = "Transaction not found." });

        //         var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        //         Guid.TryParse(userId, out Guid userIdGuid);
        //         var user = await _context.Users.Where(u => u.Id == userIdGuid).Select(u => new { u.Id, u.Name }).FirstOrDefaultAsync();

        //         // 2. Find ALL transactions linked to this bill
        //         IQueryable<Transaction> linkedTransactionsQuery = _context.Transactions
        //             .Include(t => t.Account) // ✅ CRITICAL: Include Account to check the AccountGroup
        //             .Where(t => t.CompanyId == companyIdGuid);

        //         if (transaction.SalesBillId.HasValue)
        //             linkedTransactionsQuery = linkedTransactionsQuery.Where(t => t.SalesBillId == transaction.SalesBillId);
        //         else if (transaction.PurchaseBillId.HasValue)
        //             linkedTransactionsQuery = linkedTransactionsQuery.Where(t => t.PurchaseBillId == transaction.PurchaseBillId);
        //         else if (transaction.SalesReturnBillId.HasValue)
        //             linkedTransactionsQuery = linkedTransactionsQuery.Where(t => t.SalesReturnBillId == transaction.SalesReturnBillId);
        //         else if (transaction.PurchaseReturnBillId.HasValue)
        //             linkedTransactionsQuery = linkedTransactionsQuery.Where(t => t.PurchaseReturnBillId == transaction.PurchaseReturnBillId);
        //         else
        //             linkedTransactionsQuery = linkedTransactionsQuery.Where(t => t.Id == transaction.Id); 

        //         var linkedTransactions = await linkedTransactionsQuery.ToListAsync();

        //         decimal newSettledAmount = request.Amount ?? 0;
        //         bool isSale = transaction.SalesBillId.HasValue;
        //         bool isPurchase = transaction.PurchaseBillId.HasValue;
        //         bool isSalesReturn = transaction.SalesReturnBillId.HasValue;
        //         bool isPurchaseReturn = transaction.PurchaseReturnBillId.HasValue;

        //         // 3. Update settlement fields and ledger amounts
        //         foreach (var tx in linkedTransactions)
        //         {
        //             // A. Update settlement metadata on ALL rows
        //             tx.CashSettlementStatus = request.Status;
        //             tx.CashSettlementDate = DateTime.UtcNow;
        //             tx.CashSettlementUserId = userIdGuid;
        //             tx.CashSettlementRemarks = request.Remarks;
        //             tx.UpdatedAt = DateTime.UtcNow;

        //             if (tx.Id == transaction.Id || tx.PaymentMode == PaymentMode.Cash)
        //             {
        //                 tx.CashSettlementAmount = newSettledAmount;
        //             }

        //             // B. ✅ ONLY update the TOTAL DEBIT/CREDIT if this row is the actual CASH IN HAND account
        //             // We check the AccountGroup name to be absolutely sure.
        //             bool isCashInHandRow = tx.PaymentMode == PaymentMode.Cash && 
        //                                    (tx.Account?.AccountGroup?.Name == "Cash in Hand" || 
        //                                     tx.Account?.Name == "Cash in Hand");

        //             if (isCashInHandRow)
        //             {
        //                 if (isSale || isPurchaseReturn)
        //                 {
        //                     // Cash In: Debit Cash in Hand
        //                     if (tx.TotalDebit > 0) tx.TotalDebit = newSettledAmount; 
        //                 }
        //                 else if (isPurchase || isSalesReturn)
        //                 {
        //                     // Cash Out: Credit Cash in Hand
        //                     if (tx.TotalCredit > 0) tx.TotalCredit = newSettledAmount;
        //                 }
        //             }
        //             // ❌ We do NOT touch the Party row's TotalDebit. It stays at 135.60.
        //         }

        //         // 4. Update the Sales Bill Header
        //         if (transaction.SalesBillId.HasValue)
        //         {
        //             var salesBill = await _context.SalesBills.FindAsync(transaction.SalesBillId.Value);
        //             if (salesBill != null)
        //             {
        //                 salesBill.CashSettlementStatus = request.Status;
        //                 salesBill.CashSettlementDate = DateTime.UtcNow;
        //                 salesBill.CashSettlementRemarks = request.Remarks;

        //                 salesBill.CashReceivedAmount = newSettledAmount;
        //                 salesBill.CashRemainingAmount = Math.Max(0, salesBill.TotalAmount - newSettledAmount);
        //                 salesBill.CashSettlementType = salesBill.CashRemainingAmount == 0 ? "full" : "partial";
        //             }
        //         }

        //         await _context.SaveChangesAsync();

        //         return Ok(new
        //         {
        //             success = true,
        //             message = $"Cash settlement updated to {request.Status}",
        //             data = new
        //             {
        //                 status = request.Status,
        //                 date = DateTime.UtcNow,
        //                 user = user?.Name ?? "Unknown User",
        //                 remarks = request.Remarks,
        //                 amount = newSettledAmount
        //             }
        //         });
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error updating cash settlement for transaction {TransactionId}", id);
        //         return StatusCode(500, new { success = false, error = "Internal server error." });
        //     }
        // }

        // [HttpPut("transaction/{id}/cash-settlement")]
        // public async Task<IActionResult> UpdateCashSettlement(Guid id, [FromBody] CashSettlementRequest request)
        // {
        //     try
        //     {
        //         var companyIdClaim = User.FindFirst("currentCompany")?.Value;
        //         if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out Guid companyIdGuid))
        //             return BadRequest(new { success = false, error = "No company selected." });

        //         var transaction = await _context.Transactions
        //             .FirstOrDefaultAsync(t => t.Id == id && t.CompanyId == companyIdGuid);

        //         if (transaction == null)
        //         {
        //             transaction = await _context.Transactions
        //                 .FirstOrDefaultAsync(t =>
        //                     t.CompanyId == companyIdGuid &&
        //                     (t.SalesBillId == id || t.PurchaseBillId == id || t.SalesReturnBillId == id || t.PurchaseReturnBillId == id));
        //         }

        //         if (transaction == null)
        //             return NotFound(new { success = false, error = "Transaction not found." });

        //         var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        //         Guid.TryParse(userId, out Guid userIdGuid);
        //         var user = await _context.Users.Where(u => u.Id == userIdGuid).Select(u => new { u.Id, u.Name }).FirstOrDefaultAsync();

        //         IQueryable<Transaction> linkedTransactionsQuery = _context.Transactions
        //             .Include(t => t.Account)
        //             .Where(t => t.CompanyId == companyIdGuid);

        //         if (transaction.SalesBillId.HasValue)
        //             linkedTransactionsQuery = linkedTransactionsQuery.Where(t => t.SalesBillId == transaction.SalesBillId);
        //         else if (transaction.PurchaseBillId.HasValue)
        //             linkedTransactionsQuery = linkedTransactionsQuery.Where(t => t.PurchaseBillId == transaction.PurchaseBillId);
        //         else if (transaction.SalesReturnBillId.HasValue)
        //             linkedTransactionsQuery = linkedTransactionsQuery.Where(t => t.SalesReturnBillId == transaction.SalesReturnBillId);
        //         else if (transaction.PurchaseReturnBillId.HasValue)
        //             linkedTransactionsQuery = linkedTransactionsQuery.Where(t => t.PurchaseReturnBillId == transaction.PurchaseReturnBillId);
        //         else
        //             linkedTransactionsQuery = linkedTransactionsQuery.Where(t => t.Id == transaction.Id);

        //         var linkedTransactions = await linkedTransactionsQuery.ToListAsync();

        //         decimal newSettledAmount = request.Amount ?? 0;
        //         bool isSale = transaction.SalesBillId.HasValue;
        //         bool isPurchase = transaction.PurchaseBillId.HasValue;
        //         bool isSalesReturn = transaction.SalesReturnBillId.HasValue;
        //         bool isPurchaseReturn = transaction.PurchaseReturnBillId.HasValue;

        //         // Trust the status from the frontend (Received, Paid, Partial, Pending)
        //         string finalStatus = request.Status;

        //         foreach (var tx in linkedTransactions)
        //         {
        //             tx.CashSettlementStatus = finalStatus;
        //             tx.CashSettlementDate = DateTime.UtcNow;
        //             tx.CashSettlementUserId = userIdGuid;
        //             tx.CashSettlementRemarks = request.Remarks;
        //             tx.UpdatedAt = DateTime.UtcNow;

        //             if (tx.Id == transaction.Id || tx.PaymentMode == PaymentMode.Cash)
        //             {
        //                 tx.CashSettlementAmount = newSettledAmount;
        //             }

        //             // Update the Cash in Hand ledger account
        //             bool isCashInHandRow = tx.PaymentMode == PaymentMode.Cash &&
        //                                    (tx.Account?.AccountGroup?.Name == "Cash in Hand" ||
        //                                     tx.Account?.Name == "Cash in Hand");

        //             if (isCashInHandRow)
        //             {
        //                 if (isSale || isPurchaseReturn)
        //                 {
        //                     if (tx.TotalDebit > 0) tx.TotalDebit = newSettledAmount;
        //                 }
        //                 else if (isPurchase || isSalesReturn)
        //                 {
        //                     if (tx.TotalCredit > 0) tx.TotalCredit = newSettledAmount;
        //                 }
        //             }
        //         }

        //         // Update Sales Bill Header
        //         if (isSale)
        //         {
        //             var salesBill = await _context.SalesBills.FindAsync(transaction.SalesBillId.Value);
        //             if (salesBill != null)
        //             {
        //                 salesBill.CashSettlementStatus = finalStatus;
        //                 salesBill.CashSettlementDate = DateTime.UtcNow;
        //                 salesBill.CashSettlementRemarks = request.Remarks;

        //                 salesBill.CashReceivedAmount = newSettledAmount;
        //                 salesBill.CashRemainingAmount = Math.Max(0, salesBill.TotalAmount - newSettledAmount);

        //                 // Explicitly set the Type based on the frontend selection
        //                 salesBill.CashSettlementType = finalStatus == "Partial" ? "partial" : "full";
        //             }
        //         }

        //         await _context.SaveChangesAsync();

        //         return Ok(new
        //         {
        //             success = true,
        //             message = $"Cash settlement updated to {finalStatus}",
        //             data = new
        //             {
        //                 status = finalStatus,
        //                 date = DateTime.UtcNow,
        //                 user = user?.Name ?? "Unknown User",
        //                 remarks = request.Remarks,
        //                 amount = newSettledAmount
        //             }
        //         });
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error updating cash settlement for transaction {TransactionId}", id);
        //         return StatusCode(500, new { success = false, error = "Internal server error." });
        //     }
        // }

        // [HttpPut("transaction/{id}/cash-settlement")]
        // public async Task<IActionResult> UpdateCashSettlement(Guid id, [FromBody] CashSettlementRequest request)
        // {
        //     try
        //     {
        //         var companyIdClaim = User.FindFirst("currentCompany")?.Value;
        //         if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out Guid companyIdGuid))
        //             return BadRequest(new { success = false, error = "No company selected." });

        //         // 1. Find the initial transaction
        //         var transaction = await _context.Transactions
        //             .FirstOrDefaultAsync(t => t.Id == id && t.CompanyId == companyIdGuid);

        //         if (transaction == null)
        //         {
        //             transaction = await _context.Transactions
        //                 .FirstOrDefaultAsync(t =>
        //                     t.CompanyId == companyIdGuid &&
        //                     (t.SalesBillId == id || t.PurchaseBillId == id || t.SalesReturnBillId == id || t.PurchaseReturnBillId == id));
        //         }

        //         if (transaction == null)
        //             return NotFound(new { success = false, error = "Transaction not found." });

        //         var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        //         Guid.TryParse(userId, out Guid userIdGuid);
        //         var user = await _context.Users.Where(u => u.Id == userIdGuid).Select(u => new { u.Id, u.Name }).FirstOrDefaultAsync();

        //         // 2. Find ALL transactions linked to this bill
        //         IQueryable<Transaction> linkedTransactionsQuery = _context.Transactions
        //             .Include(t => t.Account)
        //             .Where(t => t.CompanyId == companyIdGuid);

        //         if (transaction.SalesBillId.HasValue)
        //             linkedTransactionsQuery = linkedTransactionsQuery.Where(t => t.SalesBillId == transaction.SalesBillId);
        //         else if (transaction.PurchaseBillId.HasValue)
        //             linkedTransactionsQuery = linkedTransactionsQuery.Where(t => t.PurchaseBillId == transaction.PurchaseBillId);
        //         else if (transaction.SalesReturnBillId.HasValue)
        //             linkedTransactionsQuery = linkedTransactionsQuery.Where(t => t.SalesReturnBillId == transaction.SalesReturnBillId);
        //         else if (transaction.PurchaseReturnBillId.HasValue)
        //             linkedTransactionsQuery = linkedTransactionsQuery.Where(t => t.PurchaseReturnBillId == transaction.PurchaseReturnBillId);
        //         else
        //             linkedTransactionsQuery = linkedTransactionsQuery.Where(t => t.Id == transaction.Id);

        //         var linkedTransactions = await linkedTransactionsQuery.ToListAsync();

        //         decimal newSettledAmount = request.Amount ?? 0;
        //         bool isSale = transaction.SalesBillId.HasValue;
        //         bool isPurchase = transaction.PurchaseBillId.HasValue;
        //         bool isSalesReturn = transaction.SalesReturnBillId.HasValue;
        //         bool isPurchaseReturn = transaction.PurchaseReturnBillId.HasValue;

        //         string finalStatus = request.Status;

        //         // 3. Update settlement metadata on existing rows and Cash-in-Hand account
        //         bool cashInHandRowFound = false;

        //         foreach (var tx in linkedTransactions)
        //         {
        //             tx.CashSettlementStatus = finalStatus;
        //             tx.CashSettlementDate = DateTime.UtcNow;
        //             tx.CashSettlementUserId = userIdGuid;
        //             tx.CashSettlementRemarks = request.Remarks;
        //             tx.UpdatedAt = DateTime.UtcNow;

        //             if (tx.Id == transaction.Id || tx.PaymentMode == PaymentMode.Cash)
        //             {
        //                 tx.CashSettlementAmount = newSettledAmount;
        //             }

        //             // Identify if this row is the Cash-in-Hand ledger row
        //             bool isCashInHandRow = tx.PaymentMode == PaymentMode.Cash &&
        //                                    (tx.Account?.AccountGroup?.Name == "Cash in Hand" ||
        //                                     tx.Account?.Name == "Cash in Hand");

        //             if (isCashInHandRow)
        //             {
        //                 cashInHandRowFound = true;
        //                 if (isSale || isPurchaseReturn)
        //                 {
        //                     if (tx.TotalDebit > 0) tx.TotalDebit = newSettledAmount;
        //                 }
        //                 else if (isPurchase || isSalesReturn)
        //                 {
        //                     if (tx.TotalCredit > 0) tx.TotalCredit = newSettledAmount;
        //                 }
        //             }
        //         }

        //         // 4. If Cash-in-Hand row is missing (e.g., saved as Pending originally), CREATE it
        //         if (!cashInHandRowFound && newSettledAmount > 0)
        //         {
        //             // ✅ Fetch the Cash in Hand account directly from the DB
        //             var cashInHandAccount = await _context.Accounts
        //                 .Include(a => a.AccountGroup)
        //                 .FirstOrDefaultAsync(a => a.CompanyId == companyIdGuid &&
        //                                           (a.AccountGroup.Name == "Cash in Hand" || a.Name == "Cash in Hand"));

        //             if (cashInHandAccount != null)
        //             {
        //                 var newCashTx = new Transaction
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     CompanyId = companyIdGuid,
        //                     AccountId = cashInHandAccount.Id, // ✅ Use the fetched ID
        //                     SalesBillId = transaction.SalesBillId,
        //                     PurchaseBillId = transaction.PurchaseBillId,
        //                     SalesReturnBillId = transaction.SalesReturnBillId,
        //                     PurchaseReturnBillId = transaction.PurchaseReturnBillId,
        //                     BillNumber = transaction.BillNumber,
        //                     IsType = TransactionIsType.Sale,
        //                     Type = TransactionType.Sale,
        //                     PurchaseSalesType = transaction.PurchaseSalesType,
        //                     TotalDebit = (isSale || isPurchaseReturn) ? newSettledAmount : 0,
        //                     TotalCredit = (isPurchase || isSalesReturn) ? newSettledAmount : 0,
        //                     PaymentMode = PaymentMode.Cash,
        //                     Date = transaction.Date,
        //                     TransactionDate = transaction.TransactionDate,
        //                     NepaliDate = transaction.NepaliDate,
        //                     TransactionDateNepali = transaction.TransactionDateNepali,
        //                     FiscalYearId = transaction.FiscalYearId,
        //                     CreatedAt = DateTime.UtcNow,
        //                     Status = TransactionStatus.Active,
        //                     IsActive = true,

        //                     // Settlement Metadata
        //                     CashSettlementStatus = finalStatus,
        //                     CashSettlementAmount = newSettledAmount,
        //                     CashSettlementDate = DateTime.UtcNow,
        //                     CashSettlementUserId = userIdGuid,
        //                     CashSettlementRemarks = request.Remarks
        //                 };

        //                 await _context.Transactions.AddAsync(newCashTx);
        //             }
        //         }

        //         // 5. Update Sales Bill Header
        //         if (isSale)
        //         {
        //             var salesBill = await _context.SalesBills.FindAsync(transaction.SalesBillId.Value);
        //             if (salesBill != null)
        //             {
        //                 salesBill.CashSettlementStatus = finalStatus;
        //                 salesBill.CashSettlementDate = DateTime.UtcNow;
        //                 salesBill.CashSettlementRemarks = request.Remarks;
        //                 salesBill.CashReceivedAmount = newSettledAmount;
        //                 salesBill.CashRemainingAmount = Math.Max(0, salesBill.TotalAmount - newSettledAmount);
        //                 salesBill.CashSettlementType = finalStatus == "Partial" ? "partial" : "full";
        //             }
        //         }

        //         await _context.SaveChangesAsync();

        //         return Ok(new
        //         {
        //             success = true,
        //             message = $"Cash settlement updated to {finalStatus}",
        //             data = new
        //             {
        //                 status = finalStatus,
        //                 date = DateTime.UtcNow,
        //                 user = user?.Name ?? "Unknown User",
        //                 remarks = request.Remarks,
        //                 amount = newSettledAmount
        //             }
        //         });
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error updating cash settlement for transaction {TransactionId}", id);
        //         return StatusCode(500, new { success = false, error = "Internal server error." });
        //     }
        // }

        [HttpPut("transaction/{id}/cash-settlement")]
        public async Task<IActionResult> UpdateCashSettlement(Guid id, [FromBody] CashSettlementRequest request)
        {
            try
            {
                var companyIdClaim = User.FindFirst("currentCompany")?.Value;
                if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out Guid companyIdGuid))
                    return BadRequest(new { success = false, error = "No company selected." });

                // 1. Find the initial transaction
                var transaction = await _context.Transactions
                    .FirstOrDefaultAsync(t => t.Id == id && t.CompanyId == companyIdGuid);

                if (transaction == null)
                {
                    transaction = await _context.Transactions
                        .FirstOrDefaultAsync(t =>
                            t.CompanyId == companyIdGuid &&
                            (t.SalesBillId == id || t.PurchaseBillId == id ||
                             t.SalesReturnBillId == id || t.PurchaseReturnBillId == id));
                }

                if (transaction == null)
                    return NotFound(new { success = false, error = "Transaction not found." });

                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                Guid.TryParse(userId, out Guid userIdGuid);
                var user = await _context.Users
                    .Where(u => u.Id == userIdGuid)
                    .Select(u => new { u.Id, u.Name })
                    .FirstOrDefaultAsync();

                // 2. Find ALL transactions linked to this bill — Include Account.AccountGroup
                IQueryable<Transaction> linkedTransactionsQuery = _context.Transactions
                    .Include(t => t.Account)
                        .ThenInclude(a => a.AccountGroup)          // ✅ critical
                    .Where(t => t.CompanyId == companyIdGuid);

                if (transaction.SalesBillId.HasValue)
                    linkedTransactionsQuery = linkedTransactionsQuery.Where(t => t.SalesBillId == transaction.SalesBillId);
                else if (transaction.PurchaseBillId.HasValue)
                    linkedTransactionsQuery = linkedTransactionsQuery.Where(t => t.PurchaseBillId == transaction.PurchaseBillId);
                else if (transaction.SalesReturnBillId.HasValue)
                    linkedTransactionsQuery = linkedTransactionsQuery.Where(t => t.SalesReturnBillId == transaction.SalesReturnBillId);
                else if (transaction.PurchaseReturnBillId.HasValue)
                    linkedTransactionsQuery = linkedTransactionsQuery.Where(t => t.PurchaseReturnBillId == transaction.PurchaseReturnBillId);
                else
                    linkedTransactionsQuery = linkedTransactionsQuery.Where(t => t.Id == transaction.Id);

                var linkedTransactions = await linkedTransactionsQuery.ToListAsync();

                decimal newSettledAmount = request.Amount ?? 0m;
                bool isSale = transaction.SalesBillId.HasValue;
                bool isPurchase = transaction.PurchaseBillId.HasValue;
                bool isSalesReturn = transaction.SalesReturnBillId.HasValue;
                bool isPurchaseReturn = transaction.PurchaseReturnBillId.HasValue;

                string finalStatus = request.Status;
                bool isPending = string.Equals(finalStatus, "Pending", StringComparison.OrdinalIgnoreCase);

                // 3a. Locate existing Cash-in-Hand rows and party-receipt rows
                var cashInHandRows = linkedTransactions
                    .Where(tx => tx.PaymentMode == PaymentMode.Cash &&
                                 (tx.Account?.AccountGroup?.Name == "Cash in Hand" ||
                                  tx.Account?.Name == "Cash in Hand"))
                    .ToList();

                var partyReceiptRows = linkedTransactions
                    .Where(tx => tx.Id != transaction.Id
                                 && tx.PaymentMode == PaymentMode.Cash
                                 && tx.TotalCredit > 0
                                 && tx.AccountId == transaction.AccountId)
                    .ToList();

                // 3b. Update metadata on all rows first
                foreach (var tx in linkedTransactions)
                {
                    tx.CashSettlementStatus = finalStatus;
                    tx.CashSettlementDate = DateTime.UtcNow;
                    tx.CashSettlementUserId = userIdGuid;
                    tx.CashSettlementRemarks = request.Remarks;
                    tx.UpdatedAt = DateTime.UtcNow;

                    if (tx.Id == transaction.Id || tx.PaymentMode == PaymentMode.Cash)
                        tx.CashSettlementAmount = isPending ? 0m : newSettledAmount;
                }

                // 3c. Pending → strip all cash flow
                if (isPending)
                {
                    if (cashInHandRows.Count > 0)
                        _context.Transactions.RemoveRange(cashInHandRows);

                    if (partyReceiptRows.Count > 0)
                        _context.Transactions.RemoveRange(partyReceiptRows);

                    transaction.CashSettlementAmount = 0m;
                }
                else
                {
                    // Full/Partial → update existing cash row, or create if missing
                    if (cashInHandRows.Count > 0)
                    {
                        foreach (var row in cashInHandRows)
                        {
                            if (isSale || isPurchaseReturn)
                                row.TotalDebit = newSettledAmount;
                            else if (isPurchase || isSalesReturn)
                                row.TotalCredit = newSettledAmount;

                            row.CashSettlementAmount = newSettledAmount;
                        }
                    }
                    else if (newSettledAmount > 0m)
                    {
                        var cashInHandAccount = await _context.Accounts
                            .Include(a => a.AccountGroup)
                            .FirstOrDefaultAsync(a => a.CompanyId == companyIdGuid &&
                                                      (a.AccountGroup.Name == "Cash in Hand" ||
                                                       a.Name == "Cash in Hand"));

                        if (cashInHandAccount != null)
                        {
                            var newCashTx = new Transaction
                            {
                                Id = Guid.NewGuid(),
                                CompanyId = companyIdGuid,
                                AccountId = cashInHandAccount.Id,
                                SalesBillId = transaction.SalesBillId,
                                PurchaseBillId = transaction.PurchaseBillId,
                                SalesReturnBillId = transaction.SalesReturnBillId,
                                PurchaseReturnBillId = transaction.PurchaseReturnBillId,
                                BillNumber = transaction.BillNumber,
                                IsType = TransactionIsType.Sale,
                                Type = TransactionType.Sale,
                                PurchaseSalesType = transaction.PurchaseSalesType,
                                TotalDebit = (isSale || isPurchaseReturn) ? newSettledAmount : 0,
                                TotalCredit = (isPurchase || isSalesReturn) ? newSettledAmount : 0,
                                PaymentMode = PaymentMode.Cash,
                                Date = transaction.Date,
                                TransactionDate = transaction.TransactionDate,
                                NepaliDate = transaction.NepaliDate,
                                TransactionDateNepali = transaction.TransactionDateNepali,
                                FiscalYearId = transaction.FiscalYearId,
                                CreatedAt = DateTime.UtcNow,
                                Status = TransactionStatus.Active,
                                IsActive = true,
                                CashSettlementStatus = finalStatus,
                                CashSettlementAmount = newSettledAmount,
                                CashSettlementDate = DateTime.UtcNow,
                                CashSettlementUserId = userIdGuid,
                                CashSettlementRemarks = request.Remarks
                            };

                            await _context.Transactions.AddAsync(newCashTx);
                        }
                    }
                }

                // 4. Update Sales Bill header
                if (isSale)
                {
                    var salesBill = await _context.SalesBills.FindAsync(transaction.SalesBillId.Value);
                    if (salesBill != null)
                    {
                        salesBill.CashSettlementStatus = finalStatus;
                        salesBill.CashSettlementDate = DateTime.UtcNow;
                        salesBill.CashSettlementRemarks = request.Remarks;

                        if (isPending)
                        {
                            salesBill.CashReceivedAmount = 0m;
                            salesBill.CashRemainingAmount = salesBill.TotalAmount;
                            salesBill.CashSettlementType = "pending";
                        }
                        else
                        {
                            salesBill.CashReceivedAmount = newSettledAmount;
                            salesBill.CashRemainingAmount = Math.Max(0m, salesBill.TotalAmount - newSettledAmount);
                            salesBill.CashSettlementType = newSettledAmount >= salesBill.TotalAmount ? "full" : "partial";
                        }
                    }
                }

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = $"Cash settlement updated to {finalStatus}",
                    data = new
                    {
                        status = finalStatus,
                        date = DateTime.UtcNow,
                        user = user?.Name ?? "Unknown User",
                        remarks = request.Remarks,
                        amount = isPending ? 0m : newSettledAmount
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating cash settlement for transaction {TransactionId}", id);
                return StatusCode(500, new { success = false, error = "Internal server error." });
            }
        }
        // Public endpoint - No authentication required!
        // [HttpGet("public-statement/{token}")]
        // [AllowAnonymous] // This allows access without login
        // public async Task<IActionResult> GetPublicStatement(string token)
        // {
        //     try
        //     {
        //         _logger.LogInformation("Public statement accessed with token: {Token}", token);

        //         // Validate token - check if it exists in your database
        //         var accountToken = await _context.AccountShareTokens
        //             .FirstOrDefaultAsync(t => t.Token == token && t.IsActive);

        //         if (accountToken == null)
        //         {
        //             return NotFound("Invalid or expired share link");
        //         }

        //         // Check if the account exists
        //         var account = await _context.Accounts
        //             .Include(a => a.AccountGroup)
        //             .FirstOrDefaultAsync(a => a.Id == accountToken.AccountId);

        //         if (account == null)
        //         {
        //             return NotFound("Account not found");
        //         }

        //         // Get company and fiscal year
        //         var company = await _context.Companies
        //             .FirstOrDefaultAsync(c => c.Id == account.CompanyId);

        //         if (company == null)
        //         {
        //             return NotFound("Company not found");
        //         }

        //         var fiscalYear = await _context.FiscalYears
        //             .FirstOrDefaultAsync(f => f.CompanyId == company.Id && f.IsActive);

        //         if (fiscalYear == null)
        //         {
        //             fiscalYear = await _context.FiscalYears
        //                 .Where(f => f.CompanyId == company.Id)
        //                 .OrderByDescending(f => f.StartDate)
        //                 .FirstOrDefaultAsync();
        //         }

        //         // Get statement data
        //         // Use current date range or fiscal year date range
        //         DateTime fromDate = fiscalYear?.StartDate ?? DateTime.UtcNow.AddMonths(-1);
        //         DateTime toDate = DateTime.UtcNow;

        //         var request = new StatementRequestDTO
        //         {
        //             AccountId = account.Id,
        //             FromDate = fromDate,
        //             ToDate = toDate,
        //             PaymentMode = "all",
        //             IncludeItems = false,
        //             DateFormat = company.DateFormat?.ToString() ?? "english"
        //         };

        //         // Get the statement using your existing service
        //         var response = await _statementService.GetStatementAsync(
        //             company.Id,
        //             fiscalYear?.Id ?? Guid.Empty,
        //             Guid.Empty, // No user needed for public view
        //             request);

        //         if (!response.Success)
        //         {
        //             return StatusCode(500, "Error generating statement");
        //         }

        //         // Generate HTML response
        //         var html = GeneratePublicStatementHTML(account, company, response.Data, fromDate, toDate);

        //         return Content(html, "text/html");
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error generating public statement for token: {Token}", token);
        //         return StatusCode(500, "An error occurred while generating the statement");
        //     }
        // }

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

        private static string GenerateUniqueToken()
        {
            // 32 random bytes → 43-char URL-safe base64 (no padding)
            // ~256 bits of entropy — unguessable and reveals no structure
            Span<byte> bytes = stackalloc byte[32];
            System.Security.Cryptography.RandomNumberGenerator.Fill(bytes);
            return Convert.ToBase64String(bytes)
                .Replace("+", "-")
                .Replace("/", "_")
                .TrimEnd('=');
        }

        // [HttpPost("generate-share-token")]
        // public async Task<IActionResult> GenerateShareToken([FromBody] GenerateShareTokenRequest request)
        // {
        //     try
        //     {
        //         // Get company ID from claims
        //         var companyIdClaim = User.FindFirst("currentCompany")?.Value;
        //         if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out Guid companyIdGuid))
        //         {
        //             return BadRequest(new { success = false, error = "No company selected" });
        //         }

        //         // Verify account belongs to the company
        //         var account = await _context.Accounts
        //             .FirstOrDefaultAsync(a => a.Id == request.AccountId && a.CompanyId == companyIdGuid);

        //         if (account == null)
        //         {
        //             return NotFound(new { success = false, error = "Account not found" });
        //         }

        //         // Check if token already exists
        //         var existingToken = await _context.AccountShareTokens
        //             .FirstOrDefaultAsync(t => t.AccountId == request.AccountId);

        //         if (existingToken != null)
        //         {
        //             // Return existing token with NEW /s/ URL
        //             var baseUrl = $"{Request.Scheme}://{Request.Host}";
        //             var shareableUrl = $"{baseUrl}/s/{existingToken.Token}";

        //             return Ok(new
        //             {
        //                 success = true,
        //                 shareableUrl = shareableUrl,
        //                 token = existingToken.Token,
        //                 isNew = false,
        //                 message = "Existing share link retrieved"
        //             });
        //         }

        //         // Generate new token using cryptographic RNG
        //         var token = GenerateUniqueToken();
        //         var userId = User.FindFirst("userId")?.Value ?? "system";

        //         var shareToken = new AccountShareToken
        //         {
        //             Id = Guid.NewGuid(),
        //             AccountId = request.AccountId,
        //             Token = token,
        //             IsActive = true,
        //             CreatedAt = DateTime.UtcNow,
        //             CreatedBy = userId
        //         };

        //         await _context.AccountShareTokens.AddAsync(shareToken);
        //         await _context.SaveChangesAsync();

        //         var baseUrlNew = $"{Request.Scheme}://{Request.Host}";
        //         var shareableUrlNew = $"{baseUrlNew}/s/{token}";    // ← /s/ instead of /api/retailer/public-statement/

        //         return Ok(new
        //         {
        //             success = true,
        //             shareableUrl = shareableUrlNew,
        //             token = token,
        //             isNew = true,
        //             message = "Share link generated successfully"
        //         });
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error generating share token");
        //         return StatusCode(500, new { success = false, error = "Failed to generate share link" });
        //     }
        // }

        [HttpPost("generate-share-token")]
        public async Task<IActionResult> GenerateShareToken([FromBody] GenerateShareTokenRequest request)
        {
            try
            {
                var companyIdClaim = User.FindFirst("currentCompany")?.Value;
                if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out Guid companyIdGuid))
                    return BadRequest(new { success = false, error = "No company selected" });

                var account = await _context.Accounts
                    .FirstOrDefaultAsync(a => a.Id == request.AccountId && a.CompanyId == companyIdGuid);

                if (account == null)
                    return NotFound(new { success = false, error = "Account not found" });

                // ============================================================
                // THE KEY FIX — use FRONTEND base URL from configuration
                // ============================================================
                var frontendBase = _config["AppSettings:FrontendBaseUrl"]?.TrimEnd('/')
                                   ?? "https://amsacc.com";

                var existingToken = await _context.AccountShareTokens
                    .FirstOrDefaultAsync(t => t.AccountId == request.AccountId);

                if (existingToken != null)
                {
                    var shareableUrl = $"{frontendBase}/s/{existingToken.Token}";
                    return Ok(new
                    {
                        success = true,
                        shareableUrl,
                        token = existingToken.Token,
                        isNew = false,
                        message = "Existing share link retrieved"
                    });
                }

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

                var newShareableUrl = $"{frontendBase}/s/{token}";
                return Ok(new
                {
                    success = true,
                    shareableUrl = newShareableUrl,
                    token = token,
                    isNew = true,
                    message = "Share link generated successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating share token");
                return StatusCode(500, new { success = false, error = "Failed to generate share link" });
            }
        }

        public class GenerateShareTokenRequest
        {
            public Guid AccountId { get; set; }
        }

        public class CashSettlementRequest
        {
            public string Status { get; set; } = string.Empty; // "Received", "Paid", "Refunded","Returned","Pending"
            public string? Remarks { get; set; }
            public decimal? Amount { get; set; }
        }

    }
}