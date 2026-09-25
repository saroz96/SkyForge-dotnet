// using Microsoft.AspNetCore.Authorization;
// using Microsoft.AspNetCore.Mvc;
// using Microsoft.AspNetCore.RateLimiting;
// using Microsoft.EntityFrameworkCore;
// using SkyForge.Data;
// using SkyForge.Dto.RetailerDto.TransactionDto;
// using SkyForge.Models.AccountModel;
// using SkyForge.Models.CompanyModel;
// using SkyForge.Services.Retailer.StatementServices;

// namespace SkyForge.Controllers.Public
// {
//     [ApiController]
//     [Route("s")]                         // short, opaque, NOT under /api or /retailer
//     [AllowAnonymous]
//     public class PublicShareController : ControllerBase
//     {
//         private readonly ApplicationDbContext _context;
//         private readonly ILogger<PublicShareController> _logger;
//         private readonly IStatementService _statementService;

//         public PublicShareController(
//             ApplicationDbContext context,
//             ILogger<PublicShareController> logger,
//             IStatementService statementService)
//         {
//             _context = context;
//             _logger = logger;
//             _statementService = statementService;
//         }

//         // GET: /s/{token}
//         // Optional query: ?fromDate=yyyy-MM-dd&toDate=yyyy-MM-dd  (AD dates)
//         // If both dates are missing, show the date-selection form (initial view).
//         // If both dates are present, fetch and render the statement.
//         [HttpGet("{token}")]
//         [AllowAnonymous]
//         [EnableRateLimiting("public-share")]
//         public async Task<IActionResult> GetPublicStatement(
//             string token,
//             [FromQuery] DateTime? fromDate = null,
//             [FromQuery] DateTime? toDate = null)
//         {
//             try
//             {
//                 // Basic token shape validation — reject obviously bad input early
//                 if (string.IsNullOrWhiteSpace(token) || token.Length < 20 || token.Length > 80)
//                 {
//                     return NotFound();
//                 }

//                 _logger.LogInformation("Public statement accessed");

//                 var accountToken = await _context.AccountShareTokens
//                     .FirstOrDefaultAsync(t => t.Token == token && t.IsActive);

//                 if (accountToken == null) return NotFound();

//                 var account = await _context.Accounts
//                     .Include(a => a.AccountGroup)
//                     .FirstOrDefaultAsync(a => a.Id == accountToken.AccountId);

//                 if (account == null) return NotFound();

//                 var company = await _context.Companies
//                     .FirstOrDefaultAsync(c => c.Id == account.CompanyId);

//                 if (company == null) return NotFound();

//                 // -----------------------------------------------------------------
//                 // Pick the fiscal year that CONTAINS today — same behaviour
//                 // as the authenticated initial-data flow.
//                 // -----------------------------------------------------------------
//                 var today = DateTime.UtcNow.Date;

//                 var fiscalYears = await _context.FiscalYears
//                     .Where(f => f.CompanyId == company.Id)
//                     .OrderByDescending(f => f.StartDate)
//                     .ToListAsync();

//                 var fiscalYear = fiscalYears
//                         .FirstOrDefault(f =>
//                             f.StartDate.HasValue && f.EndDate.HasValue
//                             && f.StartDate.Value.Date <= today
//                             && f.EndDate.Value.Date >= today)
//                     ?? fiscalYears.FirstOrDefault(f => f.IsActive)
//                     ?? fiscalYears.FirstOrDefault();

//                 // Default date range from fiscal year (used as the form default)
//                 DateTime defaultFrom = fiscalYear?.StartDate ?? today.AddMonths(-1);
//                 DateTime defaultTo = today;

//                 if (defaultFrom > defaultTo)
//                 {
//                     defaultFrom = today.AddMonths(-12);
//                 }

//                 // -----------------------------------------------------------------
//                 // INITIAL VIEW: no dates provided → render the form only
//                 // -----------------------------------------------------------------
//                 if (!fromDate.HasValue || !toDate.HasValue)
//                 {
//                     var formHtml = GenerateDateSelectionFormHTML(
//                         token, account, company, fiscalYear, defaultFrom, defaultTo);
//                     return Content(formHtml, "text/html");
//                 }

//                 // -----------------------------------------------------------------
//                 // DATA VIEW: both dates provided → fetch and render statement
//                 // -----------------------------------------------------------------
//                 var fromOnly = fromDate.Value.Date;
//                 var toOnly = toDate.Value.Date;

//                 if (fromOnly > toOnly)
//                 {
//                     // Swap silently
//                     (fromOnly, toOnly) = (toOnly, fromOnly);
//                 }

//                 var request = new StatementRequestDTO
//                 {
//                     AccountId = account.Id,
//                     FromDate = fromOnly,
//                     ToDate = toOnly,
//                     PaymentMode = "all",
//                     IncludeItems = false,
//                     DateFormat = company.DateFormat?.ToString() ?? "english"
//                 };

//                 var response = await _statementService.GetStatementAsync(
//                     company.Id,
//                     fiscalYear?.Id ?? Guid.Empty,
//                     Guid.Empty,
//                     request);

//                 if (!response.Success) return StatusCode(500);

//                 var html = GeneratePublicStatementHTML(
//                     token, account, company, response.Data, fromOnly, toOnly);
//                 return Content(html, "text/html");
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error generating public statement");
//                 return StatusCode(500);
//             }
//         }

//         // =====================================================================
//         // INITIAL VIEW — date selection form
//         // =====================================================================
//         private string GenerateDateSelectionFormHTML(
//             string token,
//             Account account,
//             Company company,
//             SkyForge.Models.FiscalYearModel.FiscalYear? fiscalYear,
//             DateTime defaultFrom,
//             DateTime defaultTo)
//         {
//             string defaultFromAd = defaultFrom.ToString("yyyy-MM-dd");
//             string defaultToAd = defaultTo.ToString("yyyy-MM-dd");

//             // Try to compute BS equivalents for the default range
//             string defaultFromBs = TryConvertAdToBs(defaultFromAd) ?? defaultFromAd;
//             string defaultToBs = TryConvertAdToBs(defaultToAd) ?? defaultToAd;

//             bool isNepali = company.DateFormat?.ToString().ToLower() == "nepali";
//             string fiscalYearLabel = fiscalYear != null ? fiscalYear.Name ?? "" : "";

//             var html = $@"
// <!DOCTYPE html>
// <html>
// <head>
//     <meta charset=""UTF-8"">
//     <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
//     <meta name=""robots"" content=""noindex, nofollow"">
//     <title>Statement</title>
//     <style>
//         * {{ box-sizing: border-box; }}
//         body {{
//             font-family: Arial, Helvetica, sans-serif;
//             padding: 20px;
//             max-width: 700px;
//             margin: 0 auto;
//             background: #f5f7fa;
//             color: #333;
//             min-height: 100vh;
//         }}
//         .card {{
//             background: #fff;
//             border-radius: 8px;
//             box-shadow: 0 2px 8px rgba(0,0,0,0.08);
//             padding: 24px;
//             margin-top: 40px;
//         }}
//         .header {{
//             text-align: center;
//             margin-bottom: 24px;
//             padding-bottom: 18px;
//             border-bottom: 1px solid #e2e8f0;
//         }}
//         .company-name {{
//             font-size: 20px;
//             font-weight: 700;
//             color: #1a1a1a;
//             margin: 0 0 6px 0;
//         }}
//         .company-details {{
//             font-size: 12px;
//             color: #64748b;
//             line-height: 1.5;
//         }}
//         .party-info {{
//             background: #f0f7ff;
//             border-left: 4px solid #2563eb;
//             padding: 12px 16px;
//             border-radius: 4px;
//             margin-bottom: 24px;
//             font-size: 13px;
//             color: #1e3a5f;
//         }}
//         .party-info strong {{ color: #1a1a1a; }}
//         .form-row {{
//             display: flex;
//             gap: 12px;
//             margin-bottom: 20px;
//             flex-wrap: wrap;
//         }}
//         .form-group {{
//             flex: 1;
//             min-width: 200px;
//         }}
//         label {{
//             display: block;
//             font-size: 12px;
//             font-weight: 600;
//             color: #475569;
//             margin-bottom: 6px;
//             text-transform: uppercase;
//             letter-spacing: 0.03em;
//         }}
//         input[type=""date""] {{
//             width: 100%;
//             height: 40px;
//             padding: 8px 12px;
//             border: 1px solid #cbd5e1;
//             border-radius: 6px;
//             font-size: 14px;
//             color: #0f172a;
//             background: #fff;
//             transition: border-color 0.15s, box-shadow 0.15s;
//         }}
//         input[type=""date""]:focus {{
//             outline: none;
//             border-color: #2563eb;
//             box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
//         }}
//         .bs-hint {{
//             font-size: 11px;
//             color: #64748b;
//             margin-top: 4px;
//         }}
//         .actions {{
//             display: flex;
//             gap: 12px;
//             margin-top: 8px;
//         }}
//         .btn-primary {{
//             flex: 1;
//             height: 42px;
//             background: #2563eb;
//             color: #fff;
//             border: none;
//             border-radius: 6px;
//             font-size: 14px;
//             font-weight: 600;
//             cursor: pointer;
//             transition: background 0.15s;
//         }}
//         .btn-primary:hover {{ background: #1d4ed8; }}
//         .btn-secondary {{
//             height: 42px;
//             padding: 0 20px;
//             background: #fff;
//             color: #475569;
//             border: 1px solid #cbd5e1;
//             border-radius: 6px;
//             font-size: 14px;
//             font-weight: 500;
//             cursor: pointer;
//             transition: background 0.15s;
//         }}
//         .btn-secondary:hover {{ background: #f8fafc; }}
//         .preset-row {{
//             display: flex;
//             gap: 8px;
//             margin-bottom: 20px;
//             flex-wrap: wrap;
//         }}
//         .preset-btn {{
//             padding: 6px 12px;
//             border: 1px solid #cbd5e1;
//             background: #fff;
//             color: #475569;
//             border-radius: 20px;
//             font-size: 12px;
//             cursor: pointer;
//             transition: all 0.15s;
//         }}
//         .preset-btn:hover {{
//             background: #eff6ff;
//             border-color: #2563eb;
//             color: #2563eb;
//         }}
//         .footer {{
//             text-align: center;
//             margin-top: 20px;
//             font-size: 11px;
//             color: #94a3b8;
//         }}
//         .error-msg {{
//             display: none;
//             background: #fef2f2;
//             border: 1px solid #fecaca;
//             color: #b91c1c;
//             padding: 10px 14px;
//             border-radius: 6px;
//             font-size: 13px;
//             margin-bottom: 16px;
//         }}
//         .error-msg.show {{ display: block; }}
//         @media (max-width: 600px) {{
//             .form-row {{ flex-direction: column; }}
//             .form-group {{ min-width: 100%; }}
//         }}
//     </style>
// </head>
// <body>
//     <div class=""card"">
//         <div class=""header"">
//             <div class=""company-name"">{company.Name}</div>
//             <div class=""company-details"">
//                 {(!string.IsNullOrEmpty(company.Address) ? company.Address : "")}{(!string.IsNullOrEmpty(company.City) ? ", " + company.City : "")}<br>
//                 PAN: {(!string.IsNullOrEmpty(company.Pan) ? company.Pan : "")} | Phone: {(!string.IsNullOrEmpty(company.Phone) ? company.Phone : "")}
//             </div>
//         </div>

//         <div class=""party-info"">
//             <div><strong>Party:</strong> {account.UniqueNumber} - {account.Name}</div>
//             {(!string.IsNullOrEmpty(fiscalYearLabel) ? $@"<div style=""margin-top:4px;font-size:12px;color:#64748b;""><strong>Fiscal Year:</strong> {fiscalYearLabel}</div>" : "")}
//         </div>

//         <div class=""error-msg"" id=""errorMsg"">
//             Please select both From and To dates.
//         </div>

//         <form id=""dateForm"" onsubmit=""return handleSubmit(event)"">
//             <div class=""preset-row"">
//                 <button type=""button"" class=""preset-btn"" onclick=""setPreset('currentFiscalYear')"">Current Fiscal Year</button>
//                 <button type=""button"" class=""preset-btn"" onclick=""setPreset('last30')"">Last 30 Days</button>
//                 <button type=""button"" class=""preset-btn"" onclick=""setPreset('last90')"">Last 90 Days</button>
//                 <button type=""button"" class=""preset-btn"" onclick=""setPreset('thisMonth')"">This Month</button>
//             </div>

//             <div class=""form-row"">
//                 <div class=""form-group"">
//                     <label>From Date</label>
//                     <input type=""date"" id=""fromDate"" value=""{defaultFromAd}"" required>
//                 </div>
//                 <div class=""form-group"">
//                     <label>To Date</label>
//                     <input type=""date"" id=""toDate"" value=""{defaultToAd}"" required>
//                 </div>
//             </div>

//             <div class=""actions"">
//                 <button type=""button"" class=""btn-secondary"" onclick=""resetDates()"">Reset</button>
//                 <button type=""submit"" class=""btn-primary"">Generate Statement</button>
//             </div>
//         </form>

//         <div class=""footer"">
//             Select a date range and click Generate to view the statement.
//         </div>
//     </div>

//     <script>
//         const TOKEN = {System.Text.Json.JsonSerializer.Serialize(token)};
//         const FISCAL_START_AD = {System.Text.Json.JsonSerializer.Serialize(defaultFromAd)};
//         const FISCAL_END_AD = {System.Text.Json.JsonSerializer.Serialize(defaultToAd)};

//         const fromEl = document.getElementById('fromDate');
//         const toEl = document.getElementById('toDate');
//         const errorEl = document.getElementById('errorMsg');

//         // Update BS hint when the user changes dates — we don't have a JS BS
//         // converter here, so we just show the AD value as a placeholder hint.
//         // The backend will produce the real BS values on the statement page.
//         function updateBsHints() {{
//             document.getElementById('fromDateBs').textContent = fromEl.value || '-';
//             document.getElementById('toDateBs').textContent = toEl.value || '-';
//         }}
//         fromEl.addEventListener('change', updateBsHints);
//         toEl.addEventListener('change', updateBsHints);

//         function setPreset(preset) {{
//             const today = new Date();
//             const fmt = (d) => d.toISOString().split('T')[0];

//             if (preset === 'currentFiscalYear') {{
//                 fromEl.value = FISCAL_START_AD;
//                 toEl.value = FISCAL_END_AD;
//             }} else if (preset === 'last30') {{
//                 const d = new Date(today); d.setDate(d.getDate() - 30);
//                 fromEl.value = fmt(d);
//                 toEl.value = fmt(today);
//             }} else if (preset === 'last90') {{
//                 const d = new Date(today); d.setDate(d.getDate() - 90);
//                 fromEl.value = fmt(d);
//                 toEl.value = fmt(today);
//             }} else if (preset === 'thisMonth') {{
//                 const first = new Date(today.getFullYear(), today.getMonth(), 1);
//                 fromEl.value = fmt(first);
//                 toEl.value = fmt(today);
//             }}
//             updateBsHints();
//             errorEl.classList.remove('show');
//         }}

//         function resetDates() {{
//             fromEl.value = FISCAL_START_AD;
//             toEl.value = FISCAL_END_AD;
//             updateBsHints();
//             errorEl.classList.remove('show');
//         }}

//         function handleSubmit(e) {{
//             e.preventDefault();
//             if (!fromEl.value || !toEl.value) {{
//                 errorEl.classList.add('show');
//                 return false;
//             }}
//             if (fromEl.value > toEl.value) {{
//                 errorEl.textContent = 'From date cannot be after To date.';
//                 errorEl.classList.add('show');
//                 return false;
//             }}
//             const url = '/s/' + encodeURIComponent(TOKEN)
//                 + '?fromDate=' + encodeURIComponent(fromEl.value)
//                 + '&toDate=' + encodeURIComponent(toEl.value);
//             window.location.href = url;
//             return false;
//         }}
//     </script>
// </body>
// </html>";

//             return html;
//         }

//         // =====================================================================
//         // DATA VIEW — actual statement
//         // =====================================================================
//         private string GeneratePublicStatementHTML(
//             string token,
//             Account account,
//             Company company,
//             StatementDataDTO data,
//             DateTime fromDate,
//             DateTime toDate)
//         {
//             string fromDateNepali = data.Statement.FirstOrDefault(i => !string.IsNullOrEmpty(i.NepaliDate))?.NepaliDate
//                 ?? TryConvertAdToBs(fromDate.ToString("yyyy-MM-dd"))
//                 ?? fromDate.ToString("yyyy-MM-dd");

//             string toDateNepali = data.Statement.LastOrDefault(i => !string.IsNullOrEmpty(i.NepaliDate))?.NepaliDate
//                 ?? TryConvertAdToBs(toDate.ToString("yyyy-MM-dd"))
//                 ?? toDate.ToString("yyyy-MM-dd");

//             // Build the BACK URL for "New Search" so the user can go back to the form
//             string backUrl = $"/s/{token}";

//             var html = $@"
// <!DOCTYPE html>
// <html>
// <head>
//     <meta charset=""UTF-8"">
//     <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
//     <meta name=""robots"" content=""noindex, nofollow"">
//     <title>Statement</title>
//     <style>
//         body {{ font-family: Arial, Helvetica, sans-serif; padding: 20px; max-width: 1200px; margin: 0 auto; background: #fff; color: #333; }}
//         .print-header {{ text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }}
//         .company-name {{ font-size: 22px; font-weight: bold; margin: 10px 0; color: #1a1a1a; }}
//         .company-details {{ font-size: 12px; color: #555; margin: 5px 0; }}
//         .report-title {{ font-size: 18px; font-weight: bold; margin: 15px 0 10px 0; text-decoration: underline; color: #1a1a1a; }}
//         .statement-info {{ font-size: 13px; margin: 8px 0; text-align: left; background: #f8f9fa; padding: 10px 15px; border-radius: 4px; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 5px 15px; }}
//         .statement-info .info-item {{ display: inline-flex; align-items: center; gap: 3px; white-space: nowrap; }}
//         .statement-info .info-item strong {{ color: #1a1a1a; margin-right: 2px; }}
//         .toolbar {{ display: flex; gap: 10px; margin: 15px 0; }}
//         .toolbar a, .toolbar button {{
//             padding: 8px 14px; border-radius: 6px; font-size: 13px; text-decoration: none; cursor: pointer;
//             border: 1px solid #cbd5e1; background: #fff; color: #475569; transition: background 0.15s;
//         }}
//         .toolbar a:hover, .toolbar button:hover {{ background: #f1f5f9; }}
//         .toolbar .btn-print {{ background: #2563eb; color: #fff; border-color: #2563eb; }}
//         .toolbar .btn-print:hover {{ background: #1d4ed8; }}
//         @media (max-width: 768px) {{ .statement-info {{ flex-direction: column; align-items: flex-start; gap: 3px; }} .statement-info .info-item {{ white-space: normal; }} }}
//         table {{ width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 12px; }}
//         th, td {{ border: 1px solid #ddd; padding: 6px 8px; text-align: left; }}
//         th {{ background-color: #f5f5f5; font-weight: bold; color: #1a1a1a; white-space: nowrap; }}
//         .text-end {{ text-align: right; }}
//         .grand-total-row td {{ font-weight: bold; border-top: 3px double #333; background-color: #f9f9f9; }}
//         .last-updated {{ font-size: 12px; color: #666; margin-top: 10px; text-align: center; }}
//         .remarks-column {{ font-size: 11px; color: #555; max-width: 150px; word-wrap: break-word; }}
//         .voucher-type {{ font-weight: 500; color: #1a1a1a; }}
//         @media print {{
//             body {{ padding: 10px; }}
//             .toolbar {{ display: none !important; }}
//         }}
//         @media (max-width: 768px) {{ table {{ font-size: 10px; }} th, td {{ padding: 4px 6px; }} }}
//     </style>
// </head>
// <body>
//     <div class=""toolbar"">
//         <a href=""{backUrl}"">← New Search</a>
//         <button type=""button"" class=""btn-print"" onclick=""window.print()"">🖨 Print</button>
//     </div>

//     <div class=""print-header"">
//         <div class=""company-name"">{company.Name}</div>
//         <div class=""company-details"">
//             {(!string.IsNullOrEmpty(company.Address) ? company.Address : "")}{(!string.IsNullOrEmpty(company.City) ? ", " + company.City : "")}<br>
//             PAN: {(!string.IsNullOrEmpty(company.Pan) ? company.Pan : "")} | Phone: {(!string.IsNullOrEmpty(company.Phone) ? company.Phone : "")}
//         </div>
//         <hr>
//         <div class=""report-title"">STATEMENT OF ACCOUNT</div>
//         <div class=""statement-info"">
//             <span class=""info-item""><strong>Party:</strong> {account.UniqueNumber} - {account.Name}</span>
//             <span class=""info-item""><strong>From (BS):</strong> {fromDateNepali}</span>
//             <span class=""info-item""><strong>To (BS):</strong> {toDateNepali}</span>
//             <span class=""info-item""><strong>From (AD):</strong> {FormatADDate(fromDate)}</span>
//             <span class=""info-item""><strong>To (AD):</strong> {FormatADDate(toDate)}</span>
//         </div>
//     </div>
//     <table>
//         <thead>
//             <tr>
//                 <th>Miti</th><th>Date</th><th>Vch No.</th><th>Type</th><th>Pay Mode</th>
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
//                 string nepaliDate = !string.IsNullOrEmpty(item.NepaliDate) ? item.NepaliDate : "-";
//                 string adDate = item.Date.HasValue ? FormatADDate(item.Date.Value) : "-";
//                 string accountName = GetAccountDisplayName(item);
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
//                 <strong>Last Updated:</strong> {DateTime.UtcNow:yyyy-MM-dd} | Powered by Ams Software
//     </div>
// </body>
// </html>";

//             return html;
//         }

//         // =====================================================================
//         // Helpers
//         // =====================================================================
//         private string FormatADDate(DateTime date) => date.ToString("M/d/yyyy");

//         /// <summary>
//         /// Server-side AD→BS conversion attempt. Returns null when the library
//         /// isn't available — the caller falls back to the AD string.
//         /// </summary>
//         private string? TryConvertAdToBs(string adDate)
//         {
//             try
//             {
//                 var type = Type.GetType("NepaliDateConverter.NepaliDate, NepaliDateConverter");
//                 if (type == null) return null;
//                 // If you already use a helper elsewhere (e.g. NepaliDateHelper), call it here instead.
//                 return null;
//             }
//             catch
//             {
//                 return null;
//             }
//         }

//         private string GetAccountDisplayName(StatementEntryDTO item)
//         {
//             if (item.AccountType == "Opening" || item.Type == "Opening")
//                 return "Opening";
//             if (item.Type == "Pymt" || item.Type == "Payment")
//                 return item.PaymentReceiptType ?? item.AccountType ?? "Payment";
//             if (item.Type == "Rcpt" || item.Type == "Receipt")
//                 return item.PaymentReceiptType ?? item.AccountType ?? "Receipt";
//             if (item.Type == "Purc" || item.Type == "Purchase")
//                 return item.PurchaseSalesType ?? item.AccountType ?? "Purchase";
//             if (item.Type == "SlRt" || item.Type == "SalesReturn")
//                 return item.PurchaseSalesReturnType ?? item.AccountType ?? "Sales Return";
//             if (item.Type == "PrRt" || item.Type == "PurchaseReturn")
//                 return item.PurchaseSalesReturnType ?? item.AccountType ?? "Purchase Return";
//             if (item.Type == "Jrnl" || item.Type == "Journal")
//                 return item.JournalAccountType ?? item.AccountType ?? "Journal";
//             if (item.Type == "DrNt" || item.Type == "DebitNote")
//                 return item.DrCrNoteAccountType ?? item.AccountType ?? "Debit Note";
//             if (item.Type == "CrNt" || item.Type == "CreditNote")
//                 return item.DrCrNoteAccountType ?? item.AccountType ?? "Credit Note";
//             if (item.Type == "Sale" || item.Type == "Sales")
//                 return item.PurchaseSalesType ?? item.AccountType ?? "Sale";
//             return item.AccountType ?? "";
//         }

//         private string GetRemarksDisplay(StatementEntryDTO item)
//         {
//             var remarks = new List<string>();
//             if (!string.IsNullOrEmpty(item.InstType) &&
//                 item.InstType != "NA" && item.InstType != "na")
//             {
//                 remarks.Add(item.InstType);
//                 if (!string.IsNullOrEmpty(item.InstNo)) remarks.Add(item.InstNo);
//             }
//             else if (!string.IsNullOrEmpty(item.InstNo))
//             {
//                 remarks.Add(item.InstNo);
//             }
//             if (!string.IsNullOrEmpty(item.CashSettlementRemarks))
//                 remarks.Add(item.CashSettlementRemarks);
//             return remarks.Count > 0 ? string.Join(" ", remarks) : "";
//         }
//     }
// }

//----------------------------------------------------------------end1
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto.RetailerDto.TransactionDto;
using SkyForge.Services.Retailer.StatementServices;

namespace SkyForge.Controllers.Public
{
    [ApiController]
    [Route("api/public/share")]
    [AllowAnonymous]
    [EnableRateLimiting("public-share")]
    public class PublicShareController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<PublicShareController> _logger;
        private readonly IStatementService _statementService;

        public PublicShareController(
            ApplicationDbContext context,
            ILogger<PublicShareController> logger,
            IStatementService statementService)
        {
            _context = context;
            _logger = logger;
            _statementService = statementService;
        }

        // =====================================================================
        // GET: /api/public/share/{token}
        // Returns JSON: company + account + fiscal year + default date range.
        // =====================================================================
        [HttpGet("{token}")]
        public async Task<IActionResult> GetShareInfo(string token)
        {
            try
            {
                Response.Headers["Referrer-Policy"] = "no-referrer";
                Response.Headers["X-Robots-Tag"] = "noindex, nofollow, noarchive";
                Response.Headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private";
                Response.Headers["Pragma"] = "no-cache";
                Response.Headers["X-Content-Type-Options"] = "nosniff";

                if (string.IsNullOrWhiteSpace(token) || token.Length < 20 || token.Length > 80)
                    return NotFound(new { success = false, message = "Invalid or expired link" });

                var accountToken = await _context.AccountShareTokens
                    .AsNoTracking()
                    .FirstOrDefaultAsync(t => t.Token == token && t.IsActive);

                if (accountToken == null)
                    return NotFound(new { success = false, message = "Invalid or expired link" });

                var account = await _context.Accounts
                    .AsNoTracking()
                    .FirstOrDefaultAsync(a => a.Id == accountToken.AccountId);

                if (account == null)
                    return NotFound(new { success = false, message = "Account not found" });

                var company = await _context.Companies
                    .AsNoTracking()
                    .FirstOrDefaultAsync(c => c.Id == account.CompanyId);

                if (company == null)
                    return NotFound(new { success = false, message = "Company not found" });

                var today = DateTime.UtcNow.Date;

                var fiscalYears = await _context.FiscalYears
                    .AsNoTracking()
                    .Where(f => f.CompanyId == company.Id)
                    .OrderByDescending(f => f.StartDate)
                    .ToListAsync();

                var fiscalYear = fiscalYears
                        .FirstOrDefault(f =>
                            f.StartDate.HasValue && f.EndDate.HasValue
                            && f.StartDate.Value.Date <= today
                            && f.EndDate.Value.Date >= today)
                    ?? fiscalYears.FirstOrDefault(f => f.IsActive)
                    ?? fiscalYears.FirstOrDefault();

                DateTime defaultFrom = (fiscalYear?.StartDate ?? today.AddMonths(-1)).Date;
                DateTime defaultTo = today;
                if (defaultFrom > defaultTo) defaultFrom = today.AddMonths(-12);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        company = new
                        {
                            company.Name,
                            company.Address,
                            company.City,
                            company.Pan,
                            company.Phone,
                            dateFormat = company.DateFormat?.ToString() ?? "english"
                        },
                        account = new
                        {
                            account.UniqueNumber,
                            account.Name
                        },
                        fiscalYear = fiscalYear == null ? null : new
                        {
                            fiscalYear.Id,
                            fiscalYear.Name,
                            fiscalYear.StartDate,
                            fiscalYear.EndDate
                        },
                        defaultFromAd = defaultFrom.ToString("yyyy-MM-dd"),
                        defaultToAd = defaultTo.ToString("yyyy-MM-dd")
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetShareInfo");
                return StatusCode(500, new { success = false, message = "Server error" });
            }
        }

        // =====================================================================
        // GET: /api/public/share/{token}/statement?fromDate=...&toDate=...
        // Returns the statement data as JSON.
        // =====================================================================
        [HttpGet("{token}/statement")]
        public async Task<IActionResult> GetShareStatement(
            string token,
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            try
            {
                Response.Headers["Referrer-Policy"] = "no-referrer";
                Response.Headers["X-Robots-Tag"] = "noindex, nofollow, noarchive";
                Response.Headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private";
                Response.Headers["Pragma"] = "no-cache";
                Response.Headers["X-Content-Type-Options"] = "nosniff";

                if (string.IsNullOrWhiteSpace(token) || token.Length < 20 || token.Length > 80)
                    return NotFound(new { success = false, message = "Invalid or expired link" });

                var accountToken = await _context.AccountShareTokens
                    .AsNoTracking()
                    .FirstOrDefaultAsync(t => t.Token == token && t.IsActive);

                if (accountToken == null)
                    return NotFound(new { success = false, message = "Invalid or expired link" });

                var account = await _context.Accounts
                    .AsNoTracking()
                    .FirstOrDefaultAsync(a => a.Id == accountToken.AccountId);

                if (account == null)
                    return NotFound(new { success = false, message = "Account not found" });

                var company = await _context.Companies
                    .AsNoTracking()
                    .FirstOrDefaultAsync(c => c.Id == account.CompanyId);

                if (company == null)
                    return NotFound(new { success = false, message = "Company not found" });

                var today = DateTime.UtcNow.Date;

                var fiscalYears = await _context.FiscalYears
                    .AsNoTracking()
                    .Where(f => f.CompanyId == company.Id)
                    .OrderByDescending(f => f.StartDate)
                    .ToListAsync();

                var fiscalYear = fiscalYears
                        .FirstOrDefault(f =>
                            f.StartDate.HasValue && f.EndDate.HasValue
                            && f.StartDate.Value.Date <= today
                            && f.EndDate.Value.Date >= today)
                    ?? fiscalYears.FirstOrDefault(f => f.IsActive)
                    ?? fiscalYears.FirstOrDefault();

                var fromOnly = fromDate.Date;
                var toOnly = toDate.Date;
                if (fromOnly > toOnly) (fromOnly, toOnly) = (toOnly, fromOnly);

                var request = new StatementRequestDTO
                {
                    AccountId = account.Id,
                    FromDate = fromOnly,
                    ToDate = toOnly,
                    PaymentMode = "all",
                    IncludeItems = false,
                    DateFormat = company.DateFormat?.ToString() ?? "english"
                };

                var response = await _statementService.GetStatementAsync(
                    company.Id,
                    fiscalYear?.Id ?? Guid.Empty,
                    Guid.Empty,
                    request);

                if (!response.Success)
                {
                    return StatusCode(500, new
                    {
                        success = false,
                        message = response.Error ?? "Failed to generate statement"
                    });
                }

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        fromDate = fromOnly,
                        toDate = toOnly,
                        company = new
                        {
                            company.Name,
                            company.Address,
                            company.City,
                            company.Pan,
                            company.Phone
                        },
                        account = new
                        {
                            account.UniqueNumber,
                            account.Name
                        },
                        statement = response.Data
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetShareStatement");
                return StatusCode(500, new { success = false, message = "Server error" });
            }
        }
    }
}