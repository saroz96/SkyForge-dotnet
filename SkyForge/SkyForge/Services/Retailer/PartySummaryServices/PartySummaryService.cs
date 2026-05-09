// using Microsoft.EntityFrameworkCore;
// using SkyForge.Data;
// using SkyForge.Dto.RetailerDto;
// using SkyForge.Models.Retailer.TransactionModel;
// using SkyForge.Models.Shared;

// namespace SkyForge.Services.Retailer.PartySummaryServices
// {
//     public class PartySummaryService : IPartySummaryService
//     {
//         private readonly ApplicationDbContext _context;
//         private readonly ILogger<PartySummaryService> _logger;

//         public PartySummaryService(
//             ApplicationDbContext context,
//             ILogger<PartySummaryService> logger)
//         {
//             _context = context;
//             _logger = logger;
//         }

//         public async Task<PartySummaryResponseDto> GetPartySummaryAsync(Guid companyId, Guid fiscalYearId, Guid accountId, string? startDate, string? endDate)
//         {
//             try
//             {
//                 _logger.LogInformation("GetPartySummaryAsync called for Company: {CompanyId}, Account: {AccountId}", companyId, accountId);

//                 // Get company details
//                 var company = await _context.Companies
//                     .FirstOrDefaultAsync(c => c.Id == companyId);

//                 if (company == null)
//                     throw new ArgumentException("Company not found");

//                 // Get party details
//                 var party = await _context.Accounts
//                     .FirstOrDefaultAsync(a => a.Id == accountId && a.CompanyId == companyId);

//                 if (party == null)
//                     throw new ArgumentException("Party not found");

//                 // Get fiscal year with details
//                 var fiscalYear = await _context.FiscalYears
//                     .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);

//                 // Initialize summary
//                 var summary = new PartySummaryDataDto();

//                 // Calculate opening balance from account
//                 var openingBalanceData = party.OpeningBalanceByFiscalYear?
//                     .FirstOrDefault(ob => ob.FiscalYearId == fiscalYearId);

//                 if (openingBalanceData != null)
//                 {
//                     summary.OpeningBalance = openingBalanceData.Type == "Dr"
//                         ? openingBalanceData.Amount
//                         : -openingBalanceData.Amount;
//                 }

//                 decimal runningBalance = summary.OpeningBalance;

//                 // Use string comparison for dates
//                 string fromDateStr = startDate ?? "0001-01-01";
//                 string toDateStr = endDate ?? "9999-12-31";

//                 _logger.LogInformation($"Date range: {fromDateStr} to {toDateStr}");

//                 // Get all transactions for this account within the date range
//                 var transactions = await _context.Transactions
//                     .Where(t => t.CompanyId == companyId &&
//                                t.FiscalYearId == fiscalYearId &&
//                                t.AccountId == accountId &&
//                                t.IsActive &&
//                                t.Status == TransactionStatus.Active &&
//                                t.NepaliDate.ToString().CompareTo(fromDateStr) >= 0 &&
//                                t.NepaliDate.ToString().CompareTo(toDateStr) <= 0)
//                     .OrderBy(t => t.NepaliDate)
//                     .ToListAsync();

//                 _logger.LogInformation($"Found {transactions.Count} transactions");

//                 foreach (var transaction in transactions)
//                 {
//                     decimal balanceChange = 0;

//                     // SKIP CASH PAYMENT MODE TRANSACTIONS FOR BALANCE CALCULATION
//                     // But still include them in summary (TaxableSales, etc.)
//                     bool isCashMode = transaction.PaymentMode == PaymentMode.Cash;

//                     // For non-cash transactions, calculate balance change
//                     if (!isCashMode)
//                     {
//                         switch (transaction.Type)
//                         {
//                             case TransactionType.Sale:
//                                 balanceChange = -transaction.TotalDebit;
//                                 break;
//                             case TransactionType.SlRt:
//                                 balanceChange = transaction.TotalCredit;
//                                 break;
//                             case TransactionType.Purc:
//                                 balanceChange = transaction.TotalCredit;
//                                 break;
//                             case TransactionType.PrRt:
//                                 balanceChange = -transaction.TotalDebit;
//                                 break;
//                             case TransactionType.Pymt:
//                                 balanceChange = -transaction.TotalDebit;
//                                 break;
//                             case TransactionType.Rcpt:
//                                 balanceChange = transaction.TotalCredit;
//                                 break;
//                             case TransactionType.Jrnl:
//                                 if (transaction.TotalDebit > 0)
//                                     balanceChange = -transaction.TotalDebit;
//                                 else if (transaction.TotalCredit > 0)
//                                     balanceChange = transaction.TotalCredit;
//                                 break;
//                             case TransactionType.DrNt:
//                                 balanceChange = -transaction.TotalDebit;
//                                 break;
//                             case TransactionType.CrNt:
//                                 if (transaction.TotalCredit > 0)
//                                     balanceChange = transaction.TotalCredit;
//                                 else if (transaction.TotalDebit > 0)
//                                     balanceChange = -transaction.TotalDebit;
//                                 break;
//                             default:
//                                 continue;
//                         }

//                         runningBalance += balanceChange;
//                     }

//                     // ALWAYS update summary amounts (TaxableSales, etc.) regardless of payment mode
//                     switch (transaction.Type)
//                     {
//                         case TransactionType.Sale:
//                             summary.TaxableSales += transaction.TaxableAmount ?? 0;
//                             summary.TaxableSalesVAT += transaction.VatAmount ?? 0;
//                             if (transaction.IsType != TransactionIsType.VAT && transaction.IsType != TransactionIsType.RoundOff)
//                             {
//                                 summary.NonTaxableSales += transaction.TotalDebit;
//                             }
//                             summary.SalesBillCount++;
//                             break;

//                         case TransactionType.SlRt:
//                             summary.SalesReturn += transaction.TaxableAmount ?? 0;
//                             summary.SalesReturnVAT += transaction.VatAmount ?? 0;
//                             summary.SalesReturnCount++;
//                             break;

//                         case TransactionType.Purc:
//                             summary.TaxablePurchase += transaction.TaxableAmount ?? 0;
//                             summary.TaxablePurchaseVAT += transaction.VatAmount ?? 0;
//                             if (transaction.IsType != TransactionIsType.VAT && transaction.IsType != TransactionIsType.RoundOff)
//                             {
//                                 summary.NonTaxablePurchase += transaction.TotalCredit;
//                             }
//                             summary.PurchaseBillCount++;
//                             break;

//                         case TransactionType.PrRt:
//                             summary.PurchaseReturn += transaction.TaxableAmount ?? 0;
//                             summary.PurchaseReturnVAT += transaction.VatAmount ?? 0;
//                             summary.PurchaseReturnCount++;
//                             break;

//                         case TransactionType.Pymt:
//                             summary.Payments += transaction.TotalDebit;
//                             summary.PaymentCount++;
//                             break;

//                         case TransactionType.Rcpt:
//                             summary.Receipts += transaction.TotalCredit;
//                             summary.ReceiptCount++;
//                             break;

//                         case TransactionType.Jrnl:
//                             if (transaction.TotalDebit > 0)
//                             {
//                                 summary.JournalDebit += transaction.TotalDebit;
//                             }
//                             else if (transaction.TotalCredit > 0)
//                             {
//                                 summary.JournalCredit += transaction.TotalCredit;
//                             }
//                             break;

//                         case TransactionType.DrNt:
//                             summary.DebitNotes += transaction.TotalDebit;
//                             break;

//                         case TransactionType.CrNt:
//                             if (transaction.TotalCredit > 0)
//                             {
//                                 summary.CreditNotes += transaction.TotalCredit;
//                             }
//                             else if (transaction.TotalDebit > 0)
//                             {
//                                 summary.CreditNotes += transaction.TotalDebit;
//                             }
//                             break;
//                     }
//                 }

//                 summary.ClosingBalance = runningBalance;

//                 // Calculate net values
//                 summary.NetSales = summary.TaxableSales + summary.NonTaxableSales - summary.SalesReturn;
//                 summary.NetSalesVAT = summary.TaxableSalesVAT - summary.SalesReturnVAT;
//                 summary.NetPurchase = summary.TaxablePurchase + summary.NonTaxablePurchase - summary.PurchaseReturn;
//                 summary.NetPurchaseVAT = summary.TaxablePurchaseVAT - summary.PurchaseReturnVAT;
//                 summary.NetPaymentReceipt = summary.Receipts - summary.Payments;

//                 // Get fiscal year name
//                 string fiscalYearName = fiscalYear?.Name ?? string.Empty;

//                 // Get fiscal year start and end dates based on date format
//                 DateTime fiscalStartDate = DateTime.MinValue;
//                 DateTime fiscalEndDate = DateTime.MaxValue;
//                 string fiscalStartDateNepali = "";
//                 string fiscalEndDateNepali = "";

//                 if (fiscalYear != null)
//                 {
//                     // Get date format from fiscal year or company
//                     var dateFormat = fiscalYear.DateFormat ?? DateFormatEnum.English;

//                     if (dateFormat == DateFormatEnum.Nepali)
//                     {
//                         // Use Nepali dates if available
//                         if (!string.IsNullOrEmpty(fiscalYear.StartDateNepali))
//                         {
//                             fiscalStartDateNepali = fiscalYear.StartDateNepali;
//                             // Try to parse for display
//                             if (DateTime.TryParseExact(fiscalYear.StartDateNepali, "yyyy-MM-dd", null, System.Globalization.DateTimeStyles.None, out DateTime parsedStart))
//                                 fiscalStartDate = parsedStart;
//                             else
//                                 fiscalStartDate = fiscalYear.StartDate ?? DateTime.MinValue;
//                         }
//                         else
//                         {
//                             fiscalStartDate = fiscalYear.StartDate ?? DateTime.MinValue;
//                         }

//                         if (!string.IsNullOrEmpty(fiscalYear.EndDateNepali))
//                         {
//                             fiscalEndDateNepali = fiscalYear.EndDateNepali;
//                             if (DateTime.TryParseExact(fiscalYear.EndDateNepali, "yyyy-MM-dd", null, System.Globalization.DateTimeStyles.None, out DateTime parsedEnd))
//                                 fiscalEndDate = parsedEnd;
//                             else
//                                 fiscalEndDate = fiscalYear.EndDate ?? DateTime.MaxValue;
//                         }
//                         else
//                         {
//                             fiscalEndDate = fiscalYear.EndDate ?? DateTime.MaxValue;
//                         }
//                     }
//                     else
//                     {
//                         // Use English dates
//                         fiscalStartDate = fiscalYear.StartDate ?? DateTime.MinValue;
//                         fiscalEndDate = fiscalYear.EndDate ?? DateTime.MaxValue;
//                     }
//                 }

//                 // Parse requested dates
//                 DateTime parsedStartDate = DateTime.MinValue;
//                 DateTime parsedEndDate = DateTime.MaxValue;

//                 if (!string.IsNullOrEmpty(startDate) && DateTime.TryParse(startDate, out DateTime reqStartDate))
//                     parsedStartDate = reqStartDate;
//                 if (!string.IsNullOrEmpty(endDate) && DateTime.TryParse(endDate, out DateTime reqEndDate))
//                     parsedEndDate = reqEndDate;

//                 // Prepare response with fiscal year details
//                 var response = new PartySummaryResponseDto
//                 {
//                     Company = new CompanyInfoDto
//                     {
//                         Name = company.Name,
//                         Address = company.Address,
//                         Phone = company.Phone,
//                         Pan = company.Pan,
//                         CompanyGroups = new List<object>()
//                     },
//                     Party = new PartyInfoDto
//                     {
//                         Name = party.Name,
//                         Address = party.Address ?? string.Empty,
//                         Pan = party.Pan ?? string.Empty,
//                         Phone = party.Phone ?? string.Empty,
//                         UniqueNumber = party.UniqueNumber?.ToString() ?? string.Empty,
//                         CompanyGroups = new List<object>()
//                     },
//                     FiscalYear = fiscalYearName,
//                     Period = new PeriodInfoDto
//                     {
//                         Start = parsedStartDate,
//                         End = parsedEndDate
//                     },
//                     Summary = summary,
//                     GeneratedDate = DateTime.UtcNow
//                 };

//                 return response;
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error in GetPartySummaryAsync for Account: {AccountId}", accountId);
//                 throw;
//             }
//         }


//         public async Task<PartySummaryResponseDto> GetPartySummaryByMonthRangeAsync(Guid companyId, Guid fiscalYearId, Guid accountId, int startYear, int startMonth, int endYear, int endMonth)
//         {
//             try
//             {
//                 _logger.LogInformation("GetPartySummaryByMonthRangeAsync called for Company: {CompanyId}, Account: {AccountId}", companyId, accountId);

//                 // Get company details
//                 var company = await _context.Companies
//                     .FirstOrDefaultAsync(c => c.Id == companyId);

//                 if (company == null)
//                     throw new ArgumentException("Company not found");

//                 // Get party details
//                 var party = await _context.Accounts
//                     .FirstOrDefaultAsync(a => a.Id == accountId && a.CompanyId == companyId);

//                 if (party == null)
//                     throw new ArgumentException("Party not found");

//                 // Get fiscal year
//                 var fiscalYear = await _context.FiscalYears
//                     .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);

//                 // Initialize summary
//                 var summary = new PartySummaryDataDto();

//                 // Calculate opening balance from account
//                 var openingBalanceData = party.OpeningBalanceByFiscalYear?
//                     .FirstOrDefault(ob => ob.FiscalYearId == fiscalYearId);

//                 if (openingBalanceData != null)
//                 {
//                     summary.OpeningBalance = openingBalanceData.Type == "Dr"
//                         ? openingBalanceData.Amount
//                         : -openingBalanceData.Amount;
//                 }

//                 decimal runningBalance = summary.OpeningBalance;

//                 // Get all transactions for this account
//                 // Filter by year and month using Nepali date components
//                 var transactions = await _context.Transactions
//                     .Where(t => t.CompanyId == companyId &&
//                                t.FiscalYearId == fiscalYearId &&
//                                t.AccountId == accountId &&
//                                t.IsActive &&
//                                t.Status == TransactionStatus.Active)
//                     .ToListAsync();

//                 // Filter by year and month in memory (since Nepali date is stored as DateTime)
//                 var filteredTransactions = transactions.Where(t =>
//                 {
//                     var nepaliYear = t.Date.Year;
//                     var nepaliMonth = t.Date.Month;

//                     // Check if transaction falls within the selected month range
//                     if (startYear == endYear)
//                     {
//                         // Same year
//                         return nepaliYear == startYear &&
//                                nepaliMonth >= startMonth &&
//                                nepaliMonth <= endMonth;
//                     }
//                     else
//                     {
//                         // Different years (e.g., 2082 to 2083)
//                         if (nepaliYear == startYear && nepaliMonth >= startMonth)
//                             return true;
//                         if (nepaliYear == endYear && nepaliMonth <= endMonth)
//                             return true;
//                         return false;
//                     }
//                 }).OrderBy(t => t.NepaliDate).ToList();

//                 _logger.LogInformation($"Found {filteredTransactions.Count} transactions");

//                 foreach (var transaction in filteredTransactions)
//                 {
//                     decimal balanceChange = 0;

//                     // SKIP CASH PAYMENT MODE TRANSACTIONS FOR BALANCE CALCULATION
//                     // But still include them in summary (TaxableSales, etc.)
//                     bool isCashMode = transaction.PaymentMode == PaymentMode.Cash;

//                     // For non-cash transactions, calculate balance change
//                     if (!isCashMode)
//                     {
//                         switch (transaction.Type)
//                         {
//                             case TransactionType.Sale:
//                                 balanceChange = -transaction.TotalDebit;
//                                 break;
//                             case TransactionType.SlRt:
//                                 balanceChange = transaction.TotalCredit;
//                                 break;
//                             case TransactionType.Purc:
//                                 balanceChange = transaction.TotalCredit;
//                                 break;
//                             case TransactionType.PrRt:
//                                 balanceChange = -transaction.TotalDebit;
//                                 break;
//                             case TransactionType.Pymt:
//                                 balanceChange = -transaction.TotalDebit;
//                                 break;
//                             case TransactionType.Rcpt:
//                                 balanceChange = transaction.TotalCredit;
//                                 break;
//                             case TransactionType.Jrnl:
//                                 if (transaction.TotalDebit > 0)
//                                     balanceChange = -transaction.TotalDebit;
//                                 else if (transaction.TotalCredit > 0)
//                                     balanceChange = transaction.TotalCredit;
//                                 break;
//                             case TransactionType.DrNt:
//                                 balanceChange = -transaction.TotalDebit;
//                                 break;
//                             case TransactionType.CrNt:
//                                 if (transaction.TotalCredit > 0)
//                                     balanceChange = transaction.TotalCredit;
//                                 else if (transaction.TotalDebit > 0)
//                                     balanceChange = -transaction.TotalDebit;
//                                 break;
//                             default:
//                                 continue;
//                         }

//                         runningBalance += balanceChange;
//                     }

//                     // ALWAYS update summary amounts (TaxableSales, etc.) regardless of payment mode
//                     switch (transaction.Type)
//                     {
//                         case TransactionType.Sale:
//                             summary.TaxableSales += transaction.TaxableAmount ?? 0;
//                             summary.TaxableSalesVAT += transaction.VatAmount ?? 0;
//                             if (transaction.IsType != TransactionIsType.VAT && transaction.IsType != TransactionIsType.RoundOff)
//                             {
//                                 summary.NonTaxableSales += transaction.TotalDebit;
//                             }
//                             summary.SalesBillCount++;
//                             break;

//                         case TransactionType.SlRt:
//                             summary.SalesReturn += transaction.TaxableAmount ?? 0;
//                             summary.SalesReturnVAT += transaction.VatAmount ?? 0;
//                             summary.SalesReturnCount++;
//                             break;

//                         case TransactionType.Purc:
//                             summary.TaxablePurchase += transaction.TaxableAmount ?? 0;
//                             summary.TaxablePurchaseVAT += transaction.VatAmount ?? 0;
//                             if (transaction.IsType != TransactionIsType.VAT && transaction.IsType != TransactionIsType.RoundOff)
//                             {
//                                 summary.NonTaxablePurchase += transaction.TotalCredit;
//                             }
//                             summary.PurchaseBillCount++;
//                             break;

//                         case TransactionType.PrRt:
//                             summary.PurchaseReturn += transaction.TaxableAmount ?? 0;
//                             summary.PurchaseReturnVAT += transaction.VatAmount ?? 0;
//                             summary.PurchaseReturnCount++;
//                             break;

//                         case TransactionType.Pymt:
//                             summary.Payments += transaction.TotalDebit;
//                             summary.PaymentCount++;
//                             break;

//                         case TransactionType.Rcpt:
//                             summary.Receipts += transaction.TotalCredit;
//                             summary.ReceiptCount++;
//                             break;

//                         case TransactionType.Jrnl:
//                             if (transaction.TotalDebit > 0)
//                             {
//                                 summary.JournalDebit += transaction.TotalDebit;
//                             }
//                             else if (transaction.TotalCredit > 0)
//                             {
//                                 summary.JournalCredit += transaction.TotalCredit;
//                             }
//                             break;

//                         case TransactionType.DrNt:
//                             summary.DebitNotes += transaction.TotalDebit;
//                             break;

//                         case TransactionType.CrNt:
//                             if (transaction.TotalCredit > 0)
//                             {
//                                 summary.CreditNotes += transaction.TotalCredit;
//                             }
//                             else if (transaction.TotalDebit > 0)
//                             {
//                                 summary.CreditNotes += transaction.TotalDebit;
//                             }
//                             break;
//                     }
//                 }
//                 summary.ClosingBalance = runningBalance;

//                 // Calculate net values
//                 summary.NetSales = summary.TaxableSales + summary.NonTaxableSales - summary.SalesReturn;
//                 summary.NetSalesVAT = summary.TaxableSalesVAT - summary.SalesReturnVAT;
//                 summary.NetPurchase = summary.TaxablePurchase + summary.NonTaxablePurchase - summary.PurchaseReturn;
//                 summary.NetPurchaseVAT = summary.TaxablePurchaseVAT - summary.PurchaseReturnVAT;
//                 summary.NetPaymentReceipt = summary.Receipts - summary.Payments;

//                 // Create date strings for display
//                 string startDateStr = $"{startYear}-{startMonth:D2}-01";
//                 string endDateStr = $"{endYear}-{endMonth:D2}-01";

//                 DateTime parsedStartDate = DateTime.MinValue;
//                 DateTime parsedEndDate = DateTime.MaxValue;

//                 if (DateTime.TryParse(startDateStr, out DateTime start))
//                     parsedStartDate = start;
//                 if (DateTime.TryParse(endDateStr, out DateTime end))
//                     parsedEndDate = end;

//                 // Prepare response
//                 var response = new PartySummaryResponseDto
//                 {
//                     Company = new CompanyInfoDto
//                     {
//                         Name = company.Name,
//                         Address = company.Address,
//                         Phone = company.Phone,
//                         Pan = company.Pan,
//                         CompanyGroups = new List<object>()
//                     },
//                     Party = new PartyInfoDto
//                     {
//                         Name = party.Name,
//                         Address = party.Address ?? string.Empty,
//                         Pan = party.Pan ?? string.Empty,
//                         Phone = party.Phone ?? string.Empty,
//                         UniqueNumber = party.UniqueNumber?.ToString() ?? string.Empty,
//                         CompanyGroups = new List<object>()
//                     },
//                     FiscalYear = fiscalYear?.Name ?? string.Empty,
//                     Period = new PeriodInfoDto
//                     {
//                         Start = parsedStartDate,
//                         End = parsedEndDate
//                     },
//                     Summary = summary,
//                     GeneratedDate = DateTime.UtcNow
//                 };

//                 return response;
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error in GetPartySummaryByMonthRangeAsync for Account: {AccountId}", accountId);
//                 throw;
//             }
//         }
//     }
// }


//------------------------------------------------------------------end

using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto.RetailerDto;
using SkyForge.Models.Retailer.TransactionModel;
using SkyForge.Models.Shared;
using NepDate;

namespace SkyForge.Services.Retailer.PartySummaryServices
{
    public class PartySummaryService : IPartySummaryService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<PartySummaryService> _logger;

        // Nepali month days
        private readonly int[] NepaliMonthDays = { 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30, 30 };
        private readonly int[] LeapYears = { 2072, 2076, 2080, 2084, 2088, 2092, 2096, 2100, 2104, 2108 };

        public PartySummaryService(
            ApplicationDbContext context,
            ILogger<PartySummaryService> logger)
        {
            _context = context;
            _logger = logger;
        }

        private int GetLastDayOfNepaliMonth(int year, int month)
        {
            if (month == 11 && LeapYears.Contains(year))
                return 31;
            return NepaliMonthDays[month - 1];
        }

        private DateTime? ConvertNepaliToEnglish(int year, int month, int day)
        {
            try
            {
                var nepaliDate = new NepaliDate(year, month, day);
                return nepaliDate.EnglishDate;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to convert Nepali date: {year}-{month}-{day}");
                return null;
            }
        }

        public async Task<PartySummaryResponseDto> GetPartySummaryAsync(
            Guid companyId,
            Guid fiscalYearId,
            Guid accountId,
            string? startDate,
            string? endDate)
        {
            try
            {
                _logger.LogInformation("GetPartySummaryAsync called for Company: {CompanyId}, Account: {AccountId}", companyId, accountId);

                // Get company details
                var company = await _context.Companies
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                if (company == null)
                    throw new ArgumentException("Company not found");

                // Get party details
                var party = await _context.Accounts
                    .FirstOrDefaultAsync(a => a.Id == accountId && a.CompanyId == companyId);

                if (party == null)
                    throw new ArgumentException("Party not found");

                // Get fiscal year with details
                var fiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);

                // Initialize summary
                var summary = new PartySummaryDataDto();

                // Calculate opening balance from account
                var openingBalanceData = party.OpeningBalanceByFiscalYear?
                    .FirstOrDefault(ob => ob.FiscalYearId == fiscalYearId);

                if (openingBalanceData != null)
                {
                    summary.OpeningBalance = openingBalanceData.Type == "Dr"
                        ? openingBalanceData.Amount
                        : -openingBalanceData.Amount;
                }

                decimal runningBalance = summary.OpeningBalance;

                // Parse dates
                DateTime parsedStartDate = DateTime.MinValue;
                DateTime parsedEndDate = DateTime.MaxValue;

                if (!string.IsNullOrEmpty(startDate) && DateTime.TryParse(startDate, out DateTime start))
                    parsedStartDate = start;

                if (!string.IsNullOrEmpty(endDate) && DateTime.TryParse(endDate, out DateTime end))
                    parsedEndDate = end.Date.AddDays(1).AddTicks(-1);

                _logger.LogInformation($"Date range: {parsedStartDate} to {parsedEndDate}");

                // Get all transactions for this account within the date range
                var transactions = await _context.Transactions
                    .Where(t => t.CompanyId == companyId &&
                               t.FiscalYearId == fiscalYearId &&
                               t.AccountId == accountId &&
                               t.IsActive &&
                               t.Status == TransactionStatus.Active &&
                               t.Date >= parsedStartDate &&
                               t.Date <= parsedEndDate)
                    .OrderBy(t => t.Date)
                    .ToListAsync();

                _logger.LogInformation($"Found {transactions.Count} transactions");

                foreach (var transaction in transactions)
                {
                    decimal balanceChange = 0;

                    // SKIP CASH PAYMENT MODE TRANSACTIONS FOR BALANCE CALCULATION
                    bool isCashMode = transaction.PaymentMode == PaymentMode.Cash;

                    // For non-cash transactions, calculate balance change
                    if (!isCashMode)
                    {
                        switch (transaction.Type)
                        {
                            case TransactionType.Sale:
                                balanceChange = -transaction.TotalDebit;
                                break;
                            case TransactionType.SlRt:
                                balanceChange = transaction.TotalCredit;
                                break;
                            case TransactionType.Purc:
                                balanceChange = transaction.TotalCredit;
                                break;
                            case TransactionType.PrRt:
                                balanceChange = -transaction.TotalDebit;
                                break;
                            case TransactionType.Pymt:
                                balanceChange = -transaction.TotalDebit;
                                break;
                            case TransactionType.Rcpt:
                                balanceChange = transaction.TotalCredit;
                                break;
                            case TransactionType.Jrnl:
                                if (transaction.TotalDebit > 0)
                                    balanceChange = -transaction.TotalDebit;
                                else if (transaction.TotalCredit > 0)
                                    balanceChange = transaction.TotalCredit;
                                break;
                            case TransactionType.DrNt:
                                balanceChange = -transaction.TotalDebit;
                                break;
                            case TransactionType.CrNt:
                                if (transaction.TotalCredit > 0)
                                    balanceChange = transaction.TotalCredit;
                                else if (transaction.TotalDebit > 0)
                                    balanceChange = -transaction.TotalDebit;
                                break;
                            default:
                                continue;
                        }

                        runningBalance += balanceChange;
                    }

                    // Update summary amounts regardless of payment mode
                    switch (transaction.Type)
                    {
                        case TransactionType.Sale:
                            summary.TaxableSales += transaction.TaxableAmount ?? 0;
                            summary.TaxableSalesVAT += transaction.VatAmount ?? 0;
                            if (transaction.IsType != TransactionIsType.VAT && transaction.IsType != TransactionIsType.RoundOff)
                            {
                                summary.NonTaxableSales += transaction.TotalDebit;
                            }
                            summary.SalesBillCount++;
                            break;

                        case TransactionType.SlRt:
                            summary.SalesReturn += transaction.TaxableAmount ?? 0;
                            summary.SalesReturnVAT += transaction.VatAmount ?? 0;
                            summary.SalesReturnCount++;
                            break;

                        case TransactionType.Purc:
                            summary.TaxablePurchase += transaction.TaxableAmount ?? 0;
                            summary.TaxablePurchaseVAT += transaction.VatAmount ?? 0;
                            if (transaction.IsType != TransactionIsType.VAT && transaction.IsType != TransactionIsType.RoundOff)
                            {
                                summary.NonTaxablePurchase += transaction.TotalCredit;
                            }
                            summary.PurchaseBillCount++;
                            break;

                        case TransactionType.PrRt:
                            summary.PurchaseReturn += transaction.TaxableAmount ?? 0;
                            summary.PurchaseReturnVAT += transaction.VatAmount ?? 0;
                            summary.PurchaseReturnCount++;
                            break;

                        case TransactionType.Pymt:
                            summary.Payments += transaction.TotalDebit;
                            summary.PaymentCount++;
                            break;

                        case TransactionType.Rcpt:
                            summary.Receipts += transaction.TotalCredit;
                            summary.ReceiptCount++;
                            break;

                        case TransactionType.Jrnl:
                            if (transaction.TotalDebit > 0)
                                summary.JournalDebit += transaction.TotalDebit;
                            else if (transaction.TotalCredit > 0)
                                summary.JournalCredit += transaction.TotalCredit;
                            break;

                        case TransactionType.DrNt:
                            summary.DebitNotes += transaction.TotalDebit;
                            break;

                        case TransactionType.CrNt:
                            if (transaction.TotalCredit > 0)
                                summary.CreditNotes += transaction.TotalCredit;
                            else if (transaction.TotalDebit > 0)
                                summary.CreditNotes += transaction.TotalDebit;
                            break;
                    }
                }

                summary.ClosingBalance = runningBalance;

                // Calculate net values
                summary.NetSales = summary.TaxableSales + summary.NonTaxableSales - summary.SalesReturn;
                summary.NetSalesVAT = summary.TaxableSalesVAT - summary.SalesReturnVAT;
                summary.NetPurchase = summary.TaxablePurchase + summary.NonTaxablePurchase - summary.PurchaseReturn;
                summary.NetPurchaseVAT = summary.TaxablePurchaseVAT - summary.PurchaseReturnVAT;
                summary.NetPaymentReceipt = summary.Receipts - summary.Payments;

                // Prepare response
                var response = new PartySummaryResponseDto
                {
                    Company = new CompanyInfoDto
                    {
                        Name = company.Name,
                        Address = company.Address,
                        Phone = company.Phone,
                        Pan = company.Pan,
                        CompanyGroups = new List<object>()
                    },
                    Party = new PartyInfoDto
                    {
                        Name = party.Name,
                        Address = party.Address ?? string.Empty,
                        Pan = party.Pan ?? string.Empty,
                        Phone = party.Phone ?? string.Empty,
                        UniqueNumber = party.UniqueNumber?.ToString() ?? string.Empty,
                        CompanyGroups = new List<object>()
                    },
                    FiscalYear = fiscalYear?.Name ?? string.Empty,
                    Period = new PeriodInfoDto
                    {
                        Start = parsedStartDate,
                        End = parsedEndDate
                    },
                    Summary = summary,
                    GeneratedDate = DateTime.UtcNow
                };

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetPartySummaryAsync for Account: {AccountId}", accountId);
                throw;
            }
        }

        public async Task<PartySummaryResponseDto> GetPartySummaryByMonthRangeAsync(
            Guid companyId,
            Guid fiscalYearId,
            Guid accountId,
            int startYear,
            int startMonth,
            int endYear,
            int endMonth,
            string? fromDate = null,
            string? toDate = null)
        {
            try
            {
                _logger.LogInformation("GetPartySummaryByMonthRangeAsync called for Company: {CompanyId}, Account: {AccountId}", companyId, accountId);

                // Get company details
                var company = await _context.Companies
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                if (company == null)
                    throw new ArgumentException("Company not found");

                // Get party details
                var party = await _context.Accounts
                    .FirstOrDefaultAsync(a => a.Id == accountId && a.CompanyId == companyId);

                if (party == null)
                    throw new ArgumentException("Party not found");

                // Get fiscal year
                var fiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);

                // Initialize summary
                var summary = new PartySummaryDataDto();

                // Calculate opening balance from account
                var openingBalanceData = party.OpeningBalanceByFiscalYear?
                    .FirstOrDefault(ob => ob.FiscalYearId == fiscalYearId);

                if (openingBalanceData != null)
                {
                    summary.OpeningBalance = openingBalanceData.Type == "Dr"
                        ? openingBalanceData.Amount
                        : -openingBalanceData.Amount;
                }

                decimal runningBalance = summary.OpeningBalance;

                // Use AD dates for filtering (preferred) or fallback to Nepali dates
                DateTime startDateTime, endDateTime;

                if (!string.IsNullOrEmpty(fromDate) && !string.IsNullOrEmpty(toDate))
                {
                    // Use AD dates provided from frontend
                    if (!DateTime.TryParse(fromDate, out startDateTime))
                        startDateTime = DateTime.MinValue;
                    if (!DateTime.TryParse(toDate, out endDateTime))
                        endDateTime = DateTime.MaxValue;
                    endDateTime = endDateTime.Date.AddDays(1).AddTicks(-1);
                    
                    _logger.LogInformation($"Using AD date range: {startDateTime} to {endDateTime}");
                }
                else
                {
                    // Fallback: Convert Nepali month/year to AD dates
                    var startAd = ConvertNepaliToEnglish(startYear, startMonth, 1);
                    var endAd = ConvertNepaliToEnglish(endYear, endMonth, GetLastDayOfNepaliMonth(endYear, endMonth));
                    
                    if (startAd == null || endAd == null)
                    {
                        throw new ArgumentException("Invalid Nepali date conversion");
                    }
                    
                    startDateTime = startAd.Value;
                    endDateTime = endAd.Value.Date.AddDays(1).AddTicks(-1);
                    
                    _logger.LogInformation($"Using converted AD date range: {startDateTime} to {endDateTime}");
                }

                // Get all transactions for this account within the AD date range
                var transactions = await _context.Transactions
                    .Where(t => t.CompanyId == companyId &&
                               t.FiscalYearId == fiscalYearId &&
                               t.AccountId == accountId &&
                               t.IsActive &&
                               t.Status == TransactionStatus.Active &&
                               t.Date >= startDateTime &&
                               t.Date <= endDateTime)
                    .OrderBy(t => t.Date)
                    .ToListAsync();

                _logger.LogInformation($"Found {transactions.Count} transactions");

                foreach (var transaction in transactions)
                {
                    decimal balanceChange = 0;

                    // SKIP CASH PAYMENT MODE TRANSACTIONS FOR BALANCE CALCULATION
                    bool isCashMode = transaction.PaymentMode == PaymentMode.Cash;

                    // For non-cash transactions, calculate balance change
                    if (!isCashMode)
                    {
                        switch (transaction.Type)
                        {
                            case TransactionType.Sale:
                                balanceChange = -transaction.TotalDebit;
                                break;
                            case TransactionType.SlRt:
                                balanceChange = transaction.TotalCredit;
                                break;
                            case TransactionType.Purc:
                                balanceChange = transaction.TotalCredit;
                                break;
                            case TransactionType.PrRt:
                                balanceChange = -transaction.TotalDebit;
                                break;
                            case TransactionType.Pymt:
                                balanceChange = -transaction.TotalDebit;
                                break;
                            case TransactionType.Rcpt:
                                balanceChange = transaction.TotalCredit;
                                break;
                            case TransactionType.Jrnl:
                                if (transaction.TotalDebit > 0)
                                    balanceChange = -transaction.TotalDebit;
                                else if (transaction.TotalCredit > 0)
                                    balanceChange = transaction.TotalCredit;
                                break;
                            case TransactionType.DrNt:
                                balanceChange = -transaction.TotalDebit;
                                break;
                            case TransactionType.CrNt:
                                if (transaction.TotalCredit > 0)
                                    balanceChange = transaction.TotalCredit;
                                else if (transaction.TotalDebit > 0)
                                    balanceChange = -transaction.TotalDebit;
                                break;
                            default:
                                continue;
                        }

                        runningBalance += balanceChange;
                    }

                    // Update summary amounts regardless of payment mode
                    switch (transaction.Type)
                    {
                        case TransactionType.Sale:
                            summary.TaxableSales += transaction.TaxableAmount ?? 0;
                            summary.TaxableSalesVAT += transaction.VatAmount ?? 0;
                            if (transaction.IsType != TransactionIsType.VAT && transaction.IsType != TransactionIsType.RoundOff)
                            {
                                summary.NonTaxableSales += transaction.TotalDebit;
                            }
                            summary.SalesBillCount++;
                            break;

                        case TransactionType.SlRt:
                            summary.SalesReturn += transaction.TaxableAmount ?? 0;
                            summary.SalesReturnVAT += transaction.VatAmount ?? 0;
                            summary.SalesReturnCount++;
                            break;

                        case TransactionType.Purc:
                            summary.TaxablePurchase += transaction.TaxableAmount ?? 0;
                            summary.TaxablePurchaseVAT += transaction.VatAmount ?? 0;
                            if (transaction.IsType != TransactionIsType.VAT && transaction.IsType != TransactionIsType.RoundOff)
                            {
                                summary.NonTaxablePurchase += transaction.TotalCredit;
                            }
                            summary.PurchaseBillCount++;
                            break;

                        case TransactionType.PrRt:
                            summary.PurchaseReturn += transaction.TaxableAmount ?? 0;
                            summary.PurchaseReturnVAT += transaction.VatAmount ?? 0;
                            summary.PurchaseReturnCount++;
                            break;

                        case TransactionType.Pymt:
                            summary.Payments += transaction.TotalDebit;
                            summary.PaymentCount++;
                            break;

                        case TransactionType.Rcpt:
                            summary.Receipts += transaction.TotalCredit;
                            summary.ReceiptCount++;
                            break;

                        case TransactionType.Jrnl:
                            if (transaction.TotalDebit > 0)
                                summary.JournalDebit += transaction.TotalDebit;
                            else if (transaction.TotalCredit > 0)
                                summary.JournalCredit += transaction.TotalCredit;
                            break;

                        case TransactionType.DrNt:
                            summary.DebitNotes += transaction.TotalDebit;
                            break;

                        case TransactionType.CrNt:
                            if (transaction.TotalCredit > 0)
                                summary.CreditNotes += transaction.TotalCredit;
                            else if (transaction.TotalDebit > 0)
                                summary.CreditNotes += transaction.TotalDebit;
                            break;
                    }
                }

                summary.ClosingBalance = runningBalance;

                // Calculate net values
                summary.NetSales = summary.TaxableSales + summary.NonTaxableSales - summary.SalesReturn;
                summary.NetSalesVAT = summary.TaxableSalesVAT - summary.SalesReturnVAT;
                summary.NetPurchase = summary.TaxablePurchase + summary.NonTaxablePurchase - summary.PurchaseReturn;
                summary.NetPurchaseVAT = summary.TaxablePurchaseVAT - summary.PurchaseReturnVAT;
                summary.NetPaymentReceipt = summary.Receipts - summary.Payments;

                // Create date strings for display
                string startDateStr = $"{startYear}-{startMonth:D2}-01";
                string endDateStr = $"{endYear}-{endMonth:D2}-01";

                DateTime parsedStartDate = DateTime.MinValue;
                DateTime parsedEndDate = DateTime.MaxValue;

                if (DateTime.TryParse(startDateStr, out DateTime start))
                    parsedStartDate = start;
                if (DateTime.TryParse(endDateStr, out DateTime end))
                    parsedEndDate = end;

                // Prepare response
                var response = new PartySummaryResponseDto
                {
                    Company = new CompanyInfoDto
                    {
                        Name = company.Name,
                        Address = company.Address,
                        Phone = company.Phone,
                        Pan = company.Pan,
                        CompanyGroups = new List<object>()
                    },
                    Party = new PartyInfoDto
                    {
                        Name = party.Name,
                        Address = party.Address ?? string.Empty,
                        Pan = party.Pan ?? string.Empty,
                        Phone = party.Phone ?? string.Empty,
                        UniqueNumber = party.UniqueNumber?.ToString() ?? string.Empty,
                        CompanyGroups = new List<object>()
                    },
                    FiscalYear = fiscalYear?.Name ?? string.Empty,
                    Period = new PeriodInfoDto
                    {
                        Start = parsedStartDate,
                        End = parsedEndDate
                    },
                    Summary = summary,
                    GeneratedDate = DateTime.UtcNow
                };

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetPartySummaryByMonthRangeAsync for Account: {AccountId}", accountId);
                throw;
            }
        }
    }
}