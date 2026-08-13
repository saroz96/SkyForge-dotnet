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

        private decimal CalculateBalanceChange(Transaction transaction)
        {
            // Skip cash payment mode transactions
            if (transaction.PaymentMode == PaymentMode.Cash)
                return 0;

            switch (transaction.Type)
            {
                case TransactionType.Sale:
                    return -transaction.TotalDebit;
                case TransactionType.SlRt:
                    return transaction.TotalCredit;
                case TransactionType.Purc:
                    return transaction.TotalCredit;
                case TransactionType.PrRt:
                    return -transaction.TotalDebit;
                case TransactionType.Pymt:
                    return -transaction.TotalDebit;
                case TransactionType.Rcpt:
                    return transaction.TotalCredit;
                case TransactionType.Jrnl:
                    if (transaction.TotalDebit > 0)
                        return -transaction.TotalDebit;
                    else if (transaction.TotalCredit > 0)
                        return transaction.TotalCredit;
                    return 0;
                case TransactionType.DrNt:
                    return -transaction.TotalDebit;
                case TransactionType.CrNt:
                    if (transaction.TotalCredit > 0)
                        return transaction.TotalCredit;
                    else if (transaction.TotalDebit > 0)
                        return -transaction.TotalDebit;
                    return 0;
                default:
                    return 0;
            }
        }

        private void UpdateSummaryAmounts(Transaction transaction, PartySummaryDataDto summary)
        {
            switch (transaction.Type)
            {
                case TransactionType.Sale:
                    summary.TaxableSales += transaction.TaxableAmount ?? 0;
                    summary.TaxableSalesVAT += transaction.VatAmount ?? 0;
                    if (transaction.IsType != TransactionIsType.VAT && transaction.IsType != TransactionIsType.RoundOff)
                    {
                        summary.NonTaxableSales += transaction.NonTaxableAmount ?? 0;
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
                        summary.NonTaxablePurchase += transaction.NonTaxableAmount ?? 0;
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

                // Get party details with opening balances
                var party = await _context.Accounts
                    .Include(a => a.OpeningBalanceByFiscalYear)
                    .FirstOrDefaultAsync(a => a.Id == accountId && a.CompanyId == companyId);

                if (party == null)
                    throw new ArgumentException("Party not found");

                // Get fiscal year with start date
                var fiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);

                if (fiscalYear == null)
                    throw new ArgumentException("Fiscal year not found");

                // Initialize summary
                var summary = new PartySummaryDataDto();

                // Use AD dates for filtering
                DateTime startDateTime, endDateTime;

                if (!string.IsNullOrEmpty(fromDate) && !string.IsNullOrEmpty(toDate))
                {
                    if (!DateTime.TryParse(fromDate, out startDateTime))
                        startDateTime = DateTime.MinValue;
                    if (!DateTime.TryParse(toDate, out endDateTime))
                        endDateTime = DateTime.MaxValue;
                    endDateTime = endDateTime.Date.AddDays(1).AddTicks(-1);

                    _logger.LogInformation($"Using AD date range: {startDateTime} to {endDateTime}");
                }
                else
                {
                    var startAd = ConvertNepaliToEnglish(startYear, startMonth, 1);
                    var endAd = ConvertNepaliToEnglish(endYear, endMonth, GetLastDayOfNepaliMonth(endYear, endMonth));

                    if (startAd == null || endAd == null)
                    {
                        throw new ArgumentException("Invalid Nepali date conversion");
                    }

                    startDateTime = startAd.Value.Date;
                    endDateTime = endAd.Value.Date.AddDays(1).AddTicks(-1);

                    _logger.LogInformation($"Using converted AD date range: {startDateTime} to {endDateTime}");
                }

                // --- STEP 1: Calculate Opening Balance as of Start Date ---
                // Get fiscal year opening balance from OpeningBalanceByFiscalYear
                decimal fiscalYearOpeningBalance = 0;
                var openingBalanceData = party.OpeningBalanceByFiscalYear?
                    .FirstOrDefault(ob => ob.FiscalYearId == fiscalYearId);

                if (openingBalanceData != null)
                {
                    // Store the balance with the correct sign:
                    // Dr = Negative, Cr = Positive
                    fiscalYearOpeningBalance = openingBalanceData.Type == "Cr"
                        ? openingBalanceData.Amount
                        : -openingBalanceData.Amount;
                    _logger.LogInformation($"Fiscal Year Opening Balance: {fiscalYearOpeningBalance} ({openingBalanceData.Type})");
                }
                else
                {
                    _logger.LogWarning($"No opening balance found for Account: {accountId}, FiscalYear: {fiscalYearId}");
                }

                // Get all transactions from fiscal year start to start date (exclusive)
                var openingTransactions = await _context.Transactions
                    .Where(t => t.CompanyId == companyId &&
                               t.FiscalYearId == fiscalYearId &&
                               t.AccountId == accountId &&
                               t.IsActive &&
                               t.Status == TransactionStatus.Active &&
                               t.Date >= fiscalYear.StartDate &&
                               t.Date < startDateTime.Date) // Transactions before start date
                    .OrderBy(t => t.Date)
                    .ToListAsync();

                _logger.LogInformation($"Found {openingTransactions.Count} transactions before start date");

                // Calculate opening balance as of start date
                decimal openingBalanceAsOfStart = fiscalYearOpeningBalance;
                foreach (var transaction in openingTransactions)
                {
                    decimal balanceChange = CalculateBalanceChange(transaction);
                    openingBalanceAsOfStart += balanceChange;
                }

                // Set the opening balance (with correct sign convention)
                summary.OpeningBalance = openingBalanceAsOfStart;
                _logger.LogInformation($"Opening Balance as of {startDateTime.Date}: {summary.OpeningBalance}");

                // --- STEP 2: Process transactions within the selected date range ---
                var transactions = await _context.Transactions
                    .Where(t => t.CompanyId == companyId &&
                               t.FiscalYearId == fiscalYearId &&
                               t.AccountId == accountId &&
                               t.IsActive &&
                               t.Status == TransactionStatus.Active &&
                               t.Date >= startDateTime.Date &&
                               t.Date <= endDateTime)
                    .OrderBy(t => t.Date)
                    .ToListAsync();

                _logger.LogInformation($"Found {transactions.Count} transactions in selected range");

                // Start with opening balance
                decimal runningBalance = summary.OpeningBalance;

                foreach (var transaction in transactions)
                {
                    // Calculate balance change (skipping cash transactions)
                    decimal balanceChange = CalculateBalanceChange(transaction);
                    runningBalance += balanceChange;

                    // Update summary amounts
                    UpdateSummaryAmounts(transaction, summary);
                }

                // Set closing balance (with correct sign convention)
                summary.ClosingBalance = runningBalance;
                _logger.LogInformation($"Closing Balance: {summary.ClosingBalance}");

                // --- STEP 3: Calculate net values ---
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
                                summary.NonTaxableSales += transaction.NonTaxableAmount ?? 0;
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
    }
}