using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Models.Retailer.CashCounterModel;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SkyForge.Models.Retailer.TransactionModel;
using SkyForge.Models.Retailer.PaymentModel;
using SkyForge.Models.Retailer.ReceiptModel;

namespace SkyForge.Services.Retailer.CashCounterServices
{
    public class CashCounterService : ICashCounterService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<CashCounterService> _logger;

        public CashCounterService(ApplicationDbContext context, ILogger<CashCounterService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<CashCounterSession> OpenCounterAsync(Guid userId, Guid companyId, Guid fiscalYearId, decimal openingBalance, string? notes = null)
        {
            // Check if user already has an open session
            var existingSession = await _context.CashCounterSessions
                .FirstOrDefaultAsync(s => s.UserId == userId &&
                                         s.CompanyId == companyId &&
                                         s.Status == CashCounterStatus.Open.ToString());

            if (existingSession != null)
                throw new InvalidOperationException("User already has an open cash counter session");

            var session = new CashCounterSession
            {
                Id = Guid.NewGuid(),
                CompanyId = companyId,
                UserId = userId,
                FiscalYearId = fiscalYearId,
                OpeningBalance = openingBalance,
                ExpectedClosingBalance = openingBalance,
                Status = CashCounterStatus.Open.ToString(),
                OpenedAt = DateTime.UtcNow,
                OpeningNepaliDate = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                Notes = notes,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            // Add opening balance transaction
            var openingTransaction = new CashCounterTransaction
            {
                Id = Guid.NewGuid(),
                SessionId = session.Id,
                TransactionType = CashTransactionType.OpeningBalance.ToString(),
                Amount = openingBalance,
                Description = "Opening balance",
                CreatedAt = DateTime.UtcNow,
                NepaliDate = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                UserId = userId
            };

            await _context.CashCounterSessions.AddAsync(session);
            await _context.CashCounterTransactions.AddAsync(openingTransaction);
            await _context.SaveChangesAsync();

            return session;
        }

        public async Task<CashCounterSession> CloseCounterAsync(Guid sessionId, decimal closingBalance, string? notes = null)
        {
            var session = await _context.CashCounterSessions
                .Include(s => s.Transactions)
                .FirstOrDefaultAsync(s => s.Id == sessionId);

            if (session == null)
                throw new ArgumentException("Session not found");

            if (session.Status != CashCounterStatus.Open.ToString())
                throw new InvalidOperationException("Session is already closed");

            var expectedClosing = session.OpeningBalance + session.TotalSales + session.TotalReceipts
                                  - session.TotalReturns - session.TotalPayments;

            session.ClosingBalance = closingBalance;
            session.ExpectedClosingBalance = expectedClosing;
            session.CashDifference = closingBalance - expectedClosing;
            session.Status = CashCounterStatus.Closed.ToString();
            session.ClosedAt = DateTime.UtcNow;
            session.ClosingNepaliDate = DateTime.UtcNow.ToString("yyyy-MM-dd");
            session.Notes = notes ?? session.Notes;
            session.UpdatedAt = DateTime.UtcNow;

            // Add closing balance transaction
            var closingTransaction = new CashCounterTransaction
            {
                Id = Guid.NewGuid(),
                SessionId = session.Id,
                TransactionType = CashTransactionType.ClosingBalance.ToString(),
                Amount = closingBalance,
                Description = "Closing balance",
                CreatedAt = DateTime.UtcNow,
                NepaliDate = DateTime.UtcNow.ToString("yyyy-MM-dd")
            };

            await _context.CashCounterTransactions.AddAsync(closingTransaction);
            await _context.SaveChangesAsync();

            return session;
        }

        public async Task<CashCounterSession> GetCurrentSessionAsync(Guid userId, Guid companyId)
        {
            return await _context.CashCounterSessions
                .Include(s => s.Transactions)
                .FirstOrDefaultAsync(s => s.UserId == userId &&
                                         s.CompanyId == companyId &&
                                         s.Status == CashCounterStatus.Open.ToString());
        }

        public async Task<CashCounterSession> GetSessionByIdAsync(Guid sessionId)
        {
            return await _context.CashCounterSessions
                .Include(s => s.Transactions)
                .FirstOrDefaultAsync(s => s.Id == sessionId);
        }

        public async Task<List<CashCounterSession>> GetUserSessionsAsync(Guid userId, Guid companyId, DateTime? fromDate = null, DateTime? toDate = null)
        {
            var query = _context.CashCounterSessions
                .Include(s => s.Transactions)
                .Where(s => s.UserId == userId && s.CompanyId == companyId);

            if (fromDate.HasValue)
                query = query.Where(s => s.OpenedAt >= fromDate.Value);

            if (toDate.HasValue)
                query = query.Where(s => s.OpenedAt <= toDate.Value);

            return await query
                .OrderByDescending(s => s.OpenedAt)
                .ToListAsync();
        }

        public async Task<CashCounterTransaction> AddTransactionAsync(Guid sessionId, CashTransactionType type, decimal amount, string? description = null, string? referenceNumber = null)
        {
            var session = await _context.CashCounterSessions.FindAsync(sessionId);
            if (session == null)
                throw new ArgumentException("Session not found");

            if (session.Status != CashCounterStatus.Open.ToString())
                throw new InvalidOperationException("Session is closed");

            var transaction = new CashCounterTransaction
            {
                Id = Guid.NewGuid(),
                SessionId = sessionId,
                TransactionType = type.ToString(),
                Amount = amount,
                Description = description,
                ReferenceNumber = referenceNumber,
                CreatedAt = DateTime.UtcNow,
                NepaliDate = DateTime.UtcNow.ToString("yyyy-MM-dd")
            };

            // Update session totals
            switch (type)
            {
                case CashTransactionType.Sales:
                    session.TotalSales += amount;
                    break;
                case CashTransactionType.SalesReturn:
                    session.TotalReturns += amount;
                    break;
                case CashTransactionType.Payment:
                    session.TotalPayments += amount;
                    break;
                case CashTransactionType.Receipt:
                    session.TotalReceipts += amount;
                    break;
                case CashTransactionType.Adjustment:
                    // Adjust opening balance or expected closing
                    session.ExpectedClosingBalance += amount;
                    break;
            }

            session.UpdatedAt = DateTime.UtcNow;

            await _context.CashCounterTransactions.AddAsync(transaction);
            await _context.SaveChangesAsync();

            return transaction;
        }

        public async Task<decimal> GetUserCashSummaryAsync(Guid userId, Guid companyId, DateTime? fromDate = null, DateTime? toDate = null)
        {
            var query = _context.CashCounterSessions
                .Where(s => s.UserId == userId && s.CompanyId == companyId);

            if (fromDate.HasValue)
                query = query.Where(s => s.OpenedAt >= fromDate.Value);

            if (toDate.HasValue)
                query = query.Where(s => s.OpenedAt <= toDate.Value);

            var sessions = await query.ToListAsync();

            return sessions.Sum(s => s.ClosingBalance - s.OpeningBalance);
        }

        public async Task<List<CashCounterSession>> GetAllSessionsAsync(Guid companyId, DateTime? fromDate = null, DateTime? toDate = null)
        {
            var query = _context.CashCounterSessions
                .Include(s => s.User)
                .Include(s => s.Transactions)
                .Where(s => s.CompanyId == companyId);

            if (fromDate.HasValue)
                query = query.Where(s => s.OpenedAt >= fromDate.Value);

            if (toDate.HasValue)
                query = query.Where(s => s.OpenedAt <= toDate.Value);

            return await query
                .OrderByDescending(s => s.OpenedAt)
                .ToListAsync();
        }

        public async Task<CashCounterSession> OpenCounterWithDenominationsAsync(
    Guid userId,
    Guid companyId,
    Guid fiscalYearId,
    Dictionary<int, int> denominations,
    string? notes = null)
        {
            // Check if user already has an open session
            var existingSession = await _context.CashCounterSessions
                .FirstOrDefaultAsync(s => s.UserId == userId &&
                                         s.CompanyId == companyId &&
                                         s.Status == CashCounterStatus.Open.ToString());

            if (existingSession != null)
                throw new InvalidOperationException("User already has an open cash counter session");

            // Calculate total opening balance from denominations
            decimal openingBalance = 0;
            foreach (var denom in denominations)
            {
                openingBalance += denom.Key * denom.Value;
            }

            var session = new CashCounterSession
            {
                Id = Guid.NewGuid(),
                CompanyId = companyId,
                UserId = userId,
                FiscalYearId = fiscalYearId,
                OpeningBalance = openingBalance,
                ExpectedClosingBalance = openingBalance,
                Status = CashCounterStatus.Open.ToString(),
                OpenedAt = DateTime.UtcNow,
                OpeningNepaliDate = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                Notes = notes,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                OpeningDenominationsSet = true
            };

            // Add opening balance transaction
            var openingTransaction = new CashCounterTransaction
            {
                Id = Guid.NewGuid(),
                SessionId = session.Id,
                TransactionType = CashTransactionType.OpeningBalance.ToString(),
                Amount = openingBalance,
                Description = "Opening balance with denominations",
                CreatedAt = DateTime.UtcNow,
                NepaliDate = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                UserId = userId
            };

            await _context.CashCounterSessions.AddAsync(session);
            await _context.CashCounterTransactions.AddAsync(openingTransaction);

            // Add denominations
            foreach (var denom in denominations)
            {
                var denomination = new CashCounterDenomination
                {
                    Id = Guid.NewGuid(),
                    SessionId = session.Id,
                    DenominationType = ((DenominationType)denom.Key).ToString(),
                    Quantity = denom.Value,
                    TotalValue = denom.Key * denom.Value,
                    CreatedAt = DateTime.UtcNow
                };
                await _context.CashCounterDenominations.AddAsync(denomination);
            }

            await _context.SaveChangesAsync();

            return session;
        }

        public async Task<CashCounterDenomination> AddDenominationAsync(
            Guid sessionId,
            DenominationType denominationType,
            int quantity)
        {
            var session = await _context.CashCounterSessions.FindAsync(sessionId);
            if (session == null)
                throw new ArgumentException("Session not found");

            if (session.Status != CashCounterStatus.Open.ToString())
                throw new InvalidOperationException("Session is closed");

            var denomination = new CashCounterDenomination
            {
                Id = Guid.NewGuid(),
                SessionId = sessionId,
                DenominationType = denominationType.ToString(),
                Quantity = quantity,
                TotalValue = (int)denominationType * quantity,
                CreatedAt = DateTime.UtcNow
            };

            // Update session opening balance
            session.OpeningBalance += denomination.TotalValue;
            session.ExpectedClosingBalance += denomination.TotalValue;
            session.UpdatedAt = DateTime.UtcNow;

            await _context.CashCounterDenominations.AddAsync(denomination);
            await _context.SaveChangesAsync();

            return denomination;
        }

        public async Task<List<CashCounterDenomination>> GetSessionDenominationsAsync(Guid sessionId)
        {
            return await _context.CashCounterDenominations
                .Where(d => d.SessionId == sessionId)
                .OrderByDescending(d => d.DenominationType)
                .ToListAsync();
        }

        public async Task<Dictionary<int, int>> GetDenominationSummaryAsync(Guid sessionId)
        {
            var denominations = await _context.CashCounterDenominations
                .Where(d => d.SessionId == sessionId)
                .ToListAsync();

            return denominations.ToDictionary(
                d => (int)Enum.Parse<DenominationType>(d.DenominationType),
                d => d.Quantity
            );
        }

        public async Task<CashCounterSession> CloseCounterWithDenominationsAsync(
            Guid sessionId,
            Dictionary<int, int> closingDenominations,
            string? notes = null)
        {
            var session = await _context.CashCounterSessions
                .Include(s => s.Transactions)
                .FirstOrDefaultAsync(s => s.Id == sessionId);

            if (session == null)
                throw new ArgumentException("Session not found");

            if (session.Status != CashCounterStatus.Open.ToString())
                throw new InvalidOperationException("Session is already closed");

            // Calculate closing balance from denominations
            decimal closingBalance = 0;
            foreach (var denom in closingDenominations)
            {
                closingBalance += denom.Key * denom.Value;
            }

            var expectedClosing = session.OpeningBalance + session.TotalSales + session.TotalReceipts
                                  - session.TotalReturns - session.TotalPayments;

            session.ClosingBalance = closingBalance;
            session.ExpectedClosingBalance = expectedClosing;
            session.CashDifference = closingBalance - expectedClosing;
            session.Status = CashCounterStatus.Closed.ToString();
            session.ClosedAt = DateTime.UtcNow;
            session.ClosingNepaliDate = DateTime.UtcNow.ToString("yyyy-MM-dd");
            session.Notes = notes ?? session.Notes;
            session.UpdatedAt = DateTime.UtcNow;
            session.ClosingDenominationsSet = true;

            // Add closing balance transaction
            var closingTransaction = new CashCounterTransaction
            {
                Id = Guid.NewGuid(),
                SessionId = session.Id,
                TransactionType = CashTransactionType.ClosingBalance.ToString(),
                Amount = closingBalance,
                Description = "Closing balance with denominations",
                CreatedAt = DateTime.UtcNow,
                NepaliDate = DateTime.UtcNow.ToString("yyyy-MM-dd")
            };

            await _context.CashCounterTransactions.AddAsync(closingTransaction);

            // Add closing denominations
            foreach (var denom in closingDenominations)
            {
                var denomination = new CashCounterDenomination
                {
                    Id = Guid.NewGuid(),
                    SessionId = session.Id,
                    DenominationType = ((DenominationType)denom.Key).ToString(),
                    Quantity = denom.Value,
                    TotalValue = denom.Key * denom.Value,
                    CreatedAt = DateTime.UtcNow
                };
                await _context.CashCounterDenominations.AddAsync(denomination);
            }

            await _context.SaveChangesAsync();

            return session;
        }

        public async Task<CashCounterSession> GetSessionByUserIdAsync(Guid userId, Guid companyId)
        {
            return await _context.CashCounterSessions
                .FirstOrDefaultAsync(s => s.UserId == userId &&
                                         s.CompanyId == companyId &&
                                         s.Status == CashCounterStatus.Open.ToString());
        }

        public async Task UpdateSessionFromSalesBillAsync(Guid salesBillId)
        {
            try
            {
                _logger.LogInformation($"=== UpdateSessionFromSalesBillAsync STARTED for Bill: {salesBillId} ===");

                // Get the sales bill with all needed data
                var salesBill = await _context.SalesBills
                    .Include(sb => sb.User)
                    .FirstOrDefaultAsync(sb => sb.Id == salesBillId);

                if (salesBill == null)
                {
                    _logger.LogWarning($"Sales bill {salesBillId} not found");
                    return;
                }

                _logger.LogInformation($"Sales Bill: Id={salesBill.Id}, UserId={salesBill.UserId}, PaymentMode={salesBill.PaymentMode}, TotalAmount={salesBill.TotalAmount}");

                // Only process cash transactions
                if (salesBill.PaymentMode?.ToLower() != "cash")
                {
                    _logger.LogInformation($"Bill {salesBillId} is not cash, skipping");
                    return;
                }

                var userId = salesBill.UserId;
                var companyId = salesBill.CompanyId;

                // Get the current open session for this user
                var session = await _context.CashCounterSessions
                    .FirstOrDefaultAsync(s => s.UserId == userId &&
                                             s.CompanyId == companyId &&
                                             s.Status == CashCounterStatus.Open.ToString());

                if (session == null)
                {
                    _logger.LogWarning($"No open cash counter session found for user {userId}");
                    return;
                }

                // Check if this bill is already added to the session
                var existingBill = await _context.CashCounterSalesBills
                    .FirstOrDefaultAsync(csb => csb.SessionId == session.Id && csb.SalesBillId == salesBillId);

                if (existingBill != null)
                {
                    _logger.LogInformation($"Bill {salesBillId} already added to session {session.Id}");
                    return;
                }

                // Add the bill to session
                var cashCounterBill = new CashCounterSalesBill
                {
                    Id = Guid.NewGuid(),
                    SessionId = session.Id,
                    SalesBillId = salesBillId,
                    Amount = salesBill.TotalAmount,
                    PaymentMode = salesBill.PaymentMode,
                    CreatedAt = DateTime.UtcNow
                };

                await _context.CashCounterSalesBills.AddAsync(cashCounterBill);

                // Update session totals
                session.TotalSales += salesBill.TotalAmount;
                session.ExpectedClosingBalance = session.OpeningBalance + session.TotalSales + session.TotalReceipts
                                               - session.TotalReturns - session.TotalPayments;
                session.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation($"Added sales bill {salesBillId} to session {session.Id}. New TotalSales: {session.TotalSales}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in UpdateSessionFromSalesBillAsync for bill: {salesBillId}");
                throw;
            }
        }

        public async Task RemoveSessionFromSalesBillAsync(Guid salesBillId)
        {
            try
            {
                _logger.LogInformation($"=== RemoveSessionFromSalesBillAsync STARTED for Bill: {salesBillId} ===");

                var salesBill = await _context.SalesBills
                    .FirstOrDefaultAsync(sb => sb.Id == salesBillId);

                if (salesBill == null)
                {
                    _logger.LogWarning($"Sales bill {salesBillId} not found");
                    return;
                }

                // Only process cash transactions
                if (salesBill.PaymentMode?.ToLower() != "cash")
                {
                    _logger.LogInformation($"Bill {salesBillId} is not cash, skipping");
                    return;
                }

                var userId = salesBill.UserId;
                var companyId = salesBill.CompanyId;

                // Get the current open session for this user
                var session = await _context.CashCounterSessions
                    .FirstOrDefaultAsync(s => s.UserId == userId &&
                                             s.CompanyId == companyId &&
                                             s.Status == CashCounterStatus.Open.ToString());

                if (session == null)
                {
                    _logger.LogWarning($"No open cash counter session found for user {userId}");
                    return;
                }

                // Find the bill in session
                var existingBill = await _context.CashCounterSalesBills
                    .FirstOrDefaultAsync(csb => csb.SessionId == session.Id && csb.SalesBillId == salesBillId);

                if (existingBill == null)
                {
                    _logger.LogInformation($"Bill {salesBillId} not found in session {session.Id}");
                    return;
                }

                // Remove the bill from session
                _context.CashCounterSalesBills.Remove(existingBill);

                // Update session totals
                session.TotalSales -= existingBill.Amount;
                session.ExpectedClosingBalance = session.OpeningBalance + session.TotalSales + session.TotalReceipts
                                               - session.TotalReturns - session.TotalPayments;
                session.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation($"Removed sales bill {salesBillId} from session {session.Id}. New TotalSales: {session.TotalSales}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in RemoveSessionFromSalesBillAsync for bill: {salesBillId}");
                throw;
            }
        }


        public async Task UpdateSessionFromSalesReturnAsync(Guid salesReturnId)
        {
            try
            {
                _logger.LogInformation($"=== UpdateSessionFromSalesReturnAsync STARTED for Return: {salesReturnId} ===");

                // Get the sales return with all needed data
                var salesReturn = await _context.SalesReturns
                    .Include(sr => sr.User)
                    .FirstOrDefaultAsync(sr => sr.Id == salesReturnId);

                if (salesReturn == null)
                {
                    _logger.LogWarning($"Sales return {salesReturnId} not found");
                    return;
                }

                _logger.LogInformation($"Sales Return: Id={salesReturn.Id}, UserId={salesReturn.UserId}, PaymentMode={salesReturn.PaymentMode}, TotalAmount={salesReturn.TotalAmount}");

                // Only process cash transactions
                if (salesReturn.PaymentMode?.ToLower() != "cash")
                {
                    _logger.LogInformation($"Return {salesReturnId} is not cash, skipping");
                    return;
                }

                var userId = salesReturn.UserId;
                var companyId = salesReturn.CompanyId;

                // Get the current open session for this user
                var session = await _context.CashCounterSessions
                    .FirstOrDefaultAsync(s => s.UserId == userId &&
                                             s.CompanyId == companyId &&
                                             s.Status == CashCounterStatus.Open.ToString());

                if (session == null)
                {
                    _logger.LogWarning($"No open cash counter session found for user {userId}");
                    return;
                }

                // Check if this return is already added to the session
                var existingReturn = await _context.CashCounterSalesReturns
                    .FirstOrDefaultAsync(csr => csr.SessionId == session.Id && csr.SalesReturnId == salesReturnId);

                if (existingReturn != null)
                {
                    _logger.LogInformation($"Return {salesReturnId} already added to session {session.Id}");
                    return;
                }

                // Add the return to session
                var cashCounterReturn = new CashCounterSalesReturn
                {
                    Id = Guid.NewGuid(),
                    SessionId = session.Id,
                    SalesReturnId = salesReturnId,
                    Amount = salesReturn.TotalAmount ?? 0,
                    PaymentMode = salesReturn.PaymentMode,
                    CreatedAt = DateTime.UtcNow
                };

                await _context.CashCounterSalesReturns.AddAsync(cashCounterReturn);

                // Update session totals - Sales Returns REDUCE the total
                session.TotalReturns += salesReturn.TotalAmount ?? 0;
                session.ExpectedClosingBalance = session.OpeningBalance + session.TotalSales + session.TotalReceipts
                                               - session.TotalReturns - session.TotalPayments;
                session.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation($"Added sales return {salesReturnId} to session {session.Id}. New TotalReturns: {session.TotalReturns}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in UpdateSessionFromSalesReturnAsync for return: {salesReturnId}");
                throw;
            }
        }

        public async Task RemoveSessionFromSalesReturnAsync(Guid salesReturnId)
        {
            try
            {
                _logger.LogInformation($"=== RemoveSessionFromSalesReturnAsync STARTED for Return: {salesReturnId} ===");

                var salesReturn = await _context.SalesReturns
                    .FirstOrDefaultAsync(sr => sr.Id == salesReturnId);

                if (salesReturn == null)
                {
                    _logger.LogWarning($"Sales return {salesReturnId} not found");
                    return;
                }

                // Only process cash transactions
                if (salesReturn.PaymentMode?.ToLower() != "cash")
                {
                    _logger.LogInformation($"Return {salesReturnId} is not cash, skipping");
                    return;
                }

                var userId = salesReturn.UserId;
                var companyId = salesReturn.CompanyId;

                // Get the current open session for this user
                var session = await _context.CashCounterSessions
                    .FirstOrDefaultAsync(s => s.UserId == userId &&
                                             s.CompanyId == companyId &&
                                             s.Status == CashCounterStatus.Open.ToString());

                if (session == null)
                {
                    _logger.LogWarning($"No open cash counter session found for user {userId}");
                    return;
                }

                // Find the return in session
                var existingReturn = await _context.CashCounterSalesReturns
                    .FirstOrDefaultAsync(csr => csr.SessionId == session.Id && csr.SalesReturnId == salesReturnId);

                if (existingReturn == null)
                {
                    _logger.LogInformation($"Return {salesReturnId} not found in session {session.Id}");
                    return;
                }

                // Remove the return from session
                _context.CashCounterSalesReturns.Remove(existingReturn);

                // Update session totals
                session.TotalReturns -= existingReturn.Amount;
                session.ExpectedClosingBalance = session.OpeningBalance + session.TotalSales + session.TotalReceipts
                                               - session.TotalReturns - session.TotalPayments;
                session.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation($"Removed sales return {salesReturnId} from session {session.Id}. New TotalReturns: {session.TotalReturns}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in RemoveSessionFromSalesReturnAsync for return: {salesReturnId}");
                throw;
            }
        }


        public async Task UpdateSessionFromPaymentAsync(Guid paymentId)
        {
            try
            {
                _logger.LogInformation($"=== UpdateSessionFromPaymentAsync STARTED for Payment: {paymentId} ===");

                // Get the payment with all needed data
                var payment = await _context.Payments
                    .Include(p => p.PaymentEntries)
                        .ThenInclude(pe => pe.Account)
                    .FirstOrDefaultAsync(p => p.Id == paymentId);

                if (payment == null)
                {
                    _logger.LogWarning($"Payment {paymentId} not found");
                    return;
                }

                _logger.LogInformation($"Payment: Id={payment.Id}, UserId={payment.UserId}, TotalAmount={payment.TotalAmount}");

                // Check if this is a cash payment
                var creditEntry = payment.PaymentEntries.FirstOrDefault(e => e.EntryType == "Credit");
                if (creditEntry == null)
                {
                    _logger.LogWarning($"No credit entry found for payment {paymentId}");
                    return;
                }

                // Check if the credit account is "Cash in Hand" 
                // or if InstType is null/NA (indicating cash payment)
                var isCashPayment = creditEntry.Account?.Name?.ToLower() == "cash in hand" ||
                                   creditEntry.InstType == null ||
                                   creditEntry.InstType == PaymentInstrumentType.NA;

                if (!isCashPayment)
                {
                    _logger.LogInformation($"Payment {paymentId} is not cash, skipping");
                    return;
                }

                var userId = payment.UserId;
                var companyId = payment.CompanyId;

                // Get the current open session for this user
                var session = await _context.CashCounterSessions
                    .FirstOrDefaultAsync(s => s.UserId == userId &&
                                             s.CompanyId == companyId &&
                                             s.Status == CashCounterStatus.Open.ToString());

                if (session == null)
                {
                    _logger.LogWarning($"No open cash counter session found for user {userId}");
                    return;
                }

                // Check if this payment is already added to the session
                var existingPayment = await _context.CashCounterPayments
                    .FirstOrDefaultAsync(cp => cp.SessionId == session.Id && cp.PaymentId == paymentId);

                if (existingPayment != null)
                {
                    _logger.LogInformation($"Payment {paymentId} already added to session {session.Id}");
                    return;
                }

                // Add the payment to session
                var cashCounterPayment = new CashCounterPayment
                {
                    Id = Guid.NewGuid(),
                    SessionId = session.Id,
                    PaymentId = paymentId,
                    Amount = payment.TotalAmount,
                    PaymentMode = "Cash",
                    CreatedAt = DateTime.UtcNow
                };

                await _context.CashCounterPayments.AddAsync(cashCounterPayment);

                // Update session totals - Payments REDUCE cash (money going OUT)
                session.TotalPayments += payment.TotalAmount;
                session.ExpectedClosingBalance = session.OpeningBalance + session.TotalSales + session.TotalReceipts
                                               - session.TotalReturns - session.TotalPayments;
                session.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation($"Added payment {paymentId} to session {session.Id}. New TotalPayments: {session.TotalPayments}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in UpdateSessionFromPaymentAsync for payment: {paymentId}");
                throw;
            }
        }

        public async Task RemoveSessionFromPaymentAsync(Guid paymentId)
        {
            try
            {
                _logger.LogInformation($"=== RemoveSessionFromPaymentAsync STARTED for Payment: {paymentId} ===");

                var payment = await _context.Payments
                    .Include(p => p.PaymentEntries)
                        .ThenInclude(pe => pe.Account)
                    .FirstOrDefaultAsync(p => p.Id == paymentId);

                if (payment == null)
                {
                    _logger.LogWarning($"Payment {paymentId} not found");
                    return;
                }

                // Check if this is a cash payment
                var creditEntry = payment.PaymentEntries.FirstOrDefault(e => e.EntryType == "Credit");
                if (creditEntry == null)
                {
                    _logger.LogWarning($"No credit entry found for payment {paymentId}");
                    return;
                }

                var isCashPayment = creditEntry.Account?.Name?.ToLower() == "cash in hand" ||
                                   creditEntry.InstType == null ||
                                   creditEntry.InstType == PaymentInstrumentType.NA;

                if (!isCashPayment)
                {
                    _logger.LogInformation($"Payment {paymentId} is not cash, skipping");
                    return;
                }

                var userId = payment.UserId;
                var companyId = payment.CompanyId;

                // Get the current open session for this user
                var session = await _context.CashCounterSessions
                    .FirstOrDefaultAsync(s => s.UserId == userId &&
                                             s.CompanyId == companyId &&
                                             s.Status == CashCounterStatus.Open.ToString());

                if (session == null)
                {
                    _logger.LogWarning($"No open cash counter session found for user {userId}");
                    return;
                }

                // Find the payment in session
                var existingPayment = await _context.CashCounterPayments
                    .FirstOrDefaultAsync(cp => cp.SessionId == session.Id && cp.PaymentId == paymentId);

                if (existingPayment == null)
                {
                    _logger.LogInformation($"Payment {paymentId} not found in session {session.Id}");
                    return;
                }

                // Remove the payment from session
                _context.CashCounterPayments.Remove(existingPayment);

                // Update session totals
                session.TotalPayments -= existingPayment.Amount;
                session.ExpectedClosingBalance = session.OpeningBalance + session.TotalSales + session.TotalReceipts
                                               - session.TotalReturns - session.TotalPayments;
                session.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation($"Removed payment {paymentId} from session {session.Id}. New TotalPayments: {session.TotalPayments}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in RemoveSessionFromPaymentAsync for payment: {paymentId}");
                throw;
            }
        }

        public async Task UpdateSessionFromReceiptAsync(Guid receiptId)
        {
            try
            {
                _logger.LogInformation($"=== UpdateSessionFromReceiptAsync STARTED for Receipt: {receiptId} ===");

                // Get the receipt with all needed data
                var receipt = await _context.Receipts
                    .Include(r => r.ReceiptEntries)
                        .ThenInclude(re => re.Account)
                    .FirstOrDefaultAsync(r => r.Id == receiptId);

                if (receipt == null)
                {
                    _logger.LogWarning($"Receipt {receiptId} not found");
                    return;
                }

                _logger.LogInformation($"Receipt: Id={receipt.Id}, UserId={receipt.UserId}, TotalAmount={receipt.TotalAmount}");

                // Check if this is a cash receipt
                var debitEntry = receipt.ReceiptEntries.FirstOrDefault(e => e.EntryType == "Debit");
                if (debitEntry == null)
                {
                    _logger.LogWarning($"No debit entry found for receipt {receiptId}");
                    return;
                }

                // Check if the debit account is "Cash in Hand" or receipt instrument is NA
                var isCashReceipt = debitEntry.Account?.Name?.ToLower() == "cash in hand" ||
                                   debitEntry.InstType == null ||
                                   debitEntry.InstType == ReceiptInstrumentType.NA;

                if (!isCashReceipt)
                {
                    _logger.LogInformation($"Receipt {receiptId} is not cash, skipping");
                    return;
                }

                var userId = receipt.UserId;
                var companyId = receipt.CompanyId;

                // Get the current open session for this user
                var session = await _context.CashCounterSessions
                    .FirstOrDefaultAsync(s => s.UserId == userId &&
                                             s.CompanyId == companyId &&
                                             s.Status == CashCounterStatus.Open.ToString());

                if (session == null)
                {
                    _logger.LogWarning($"No open cash counter session found for user {userId}");
                    return;
                }

                // Check if this receipt is already added to the session
                var existingReceipt = await _context.CashCounterReceipts
                    .FirstOrDefaultAsync(cr => cr.SessionId == session.Id && cr.ReceiptId == receiptId);

                if (existingReceipt != null)
                {
                    _logger.LogInformation($"Receipt {receiptId} already added to session {session.Id}");
                    return;
                }

                // Add the receipt to session
                var cashCounterReceipt = new CashCounterReceipt
                {
                    Id = Guid.NewGuid(),
                    SessionId = session.Id,
                    ReceiptId = receiptId,
                    Amount = receipt.TotalAmount,
                    ReceiptMode = "Cash",
                    CreatedAt = DateTime.UtcNow
                };

                await _context.CashCounterReceipts.AddAsync(cashCounterReceipt);

                // Update session totals - Receipts INCREASE cash (money coming IN)
                session.TotalReceipts += receipt.TotalAmount;
                session.ExpectedClosingBalance = session.OpeningBalance + session.TotalSales + session.TotalReceipts
                                               - session.TotalReturns - session.TotalPayments;
                session.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation($"Added receipt {receiptId} to session {session.Id}. New TotalReceipts: {session.TotalReceipts}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in UpdateSessionFromReceiptAsync for receipt: {receiptId}");
                throw;
            }
        }

        public async Task RemoveSessionFromReceiptAsync(Guid receiptId)
        {
            try
            {
                _logger.LogInformation($"=== RemoveSessionFromReceiptAsync STARTED for Receipt: {receiptId} ===");

                var receipt = await _context.Receipts
                    .Include(r => r.ReceiptEntries)
                        .ThenInclude(re => re.Account)
                    .FirstOrDefaultAsync(r => r.Id == receiptId);

                if (receipt == null)
                {
                    _logger.LogWarning($"Receipt {receiptId} not found");
                    return;
                }

                // Check if this is a cash receipt
                var debitEntry = receipt.ReceiptEntries.FirstOrDefault(e => e.EntryType == "Debit");
                if (debitEntry == null)
                {
                    _logger.LogWarning($"No debit entry found for receipt {receiptId}");
                    return;
                }

                var isCashReceipt = debitEntry.Account?.Name?.ToLower() == "cash in hand" ||
                                   debitEntry.InstType == null ||
                                   debitEntry.InstType == ReceiptInstrumentType.NA;

                if (!isCashReceipt)
                {
                    _logger.LogInformation($"Receipt {receiptId} is not cash, skipping");
                    return;
                }

                var userId = receipt.UserId;
                var companyId = receipt.CompanyId;

                // Get the current open session for this user
                var session = await _context.CashCounterSessions
                    .FirstOrDefaultAsync(s => s.UserId == userId &&
                                             s.CompanyId == companyId &&
                                             s.Status == CashCounterStatus.Open.ToString());

                if (session == null)
                {
                    _logger.LogWarning($"No open cash counter session found for user {userId}");
                    return;
                }

                // Find the receipt in session
                var existingReceipt = await _context.CashCounterReceipts
                    .FirstOrDefaultAsync(cr => cr.SessionId == session.Id && cr.ReceiptId == receiptId);

                if (existingReceipt == null)
                {
                    _logger.LogInformation($"Receipt {receiptId} not found in session {session.Id}");
                    return;
                }

                // Remove the receipt from session
                _context.CashCounterReceipts.Remove(existingReceipt);

                // Update session totals
                session.TotalReceipts -= existingReceipt.Amount;
                session.ExpectedClosingBalance = session.OpeningBalance + session.TotalSales + session.TotalReceipts
                                               - session.TotalReturns - session.TotalPayments;
                session.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation($"Removed receipt {receiptId} from session {session.Id}. New TotalReceipts: {session.TotalReceipts}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in RemoveSessionFromReceiptAsync for receipt: {receiptId}");
                throw;
            }
        }

        public async Task UpdateSessionFromJournalVoucherAsync(Guid journalVoucherId)
        {
            try
            {
                _logger.LogInformation($"=== UpdateSessionFromJournalVoucherAsync STARTED for Journal Voucher: {journalVoucherId} ===");

                // Get the journal voucher with all entries and accounts
                var journalVoucher = await _context.JournalVouchers
                    .Include(jv => jv.JournalEntries)
                        .ThenInclude(je => je.Account)
                    .FirstOrDefaultAsync(jv => jv.Id == journalVoucherId);

                if (journalVoucher == null)
                {
                    _logger.LogWarning($"Journal Voucher {journalVoucherId} not found");
                    return;
                }

                _logger.LogInformation($"Journal Voucher: Id={journalVoucher.Id}, UserId={journalVoucher.UserId}, TotalAmount={journalVoucher.TotalAmount}");

                var userId = journalVoucher.UserId;
                var companyId = journalVoucher.CompanyId;

                // Get the current open session for this user
                var session = await _context.CashCounterSessions
                    .FirstOrDefaultAsync(s => s.UserId == userId &&
                                             s.CompanyId == companyId &&
                                             s.Status == CashCounterStatus.Open.ToString());

                if (session == null)
                {
                    _logger.LogWarning($"No open cash counter session found for user {userId}");
                    return;
                }

                // Check if this journal voucher is already added to the session
                var existingJV = await _context.CashCounterJournalVouchers
                    .FirstOrDefaultAsync(cjv => cjv.SessionId == session.Id && cjv.JournalVoucherId == journalVoucherId);

                if (existingJV != null)
                {
                    _logger.LogInformation($"Journal Voucher {journalVoucherId} already added to session {session.Id}");
                    return;
                }

                // Find cash-related entries
                var cashEntries = journalVoucher.JournalEntries
                    .Where(je => je.Account.Name?.ToLower() == "cash in hand")
                    .ToList();

                if (!cashEntries.Any())
                {
                    _logger.LogInformation($"No cash entries found in journal voucher {journalVoucherId}, skipping");
                    return;
                }

                // Process each cash entry
                decimal totalDebitAmount = 0;
                decimal totalCreditAmount = 0;

                foreach (var entry in cashEntries)
                {
                    // Add the journal voucher to session
                    var cashCounterJV = new CashCounterJournalVoucher
                    {
                        Id = Guid.NewGuid(),
                        SessionId = session.Id,
                        JournalVoucherId = journalVoucherId,
                        Amount = entry.Amount,
                        EntryType = entry.EntryType,
                        AccountName = entry.Account.Name,
                        CreatedAt = DateTime.UtcNow
                    };

                    await _context.CashCounterJournalVouchers.AddAsync(cashCounterJV);

                    if (entry.EntryType == "Debit")
                    {
                        totalDebitAmount += entry.Amount;
                    }
                    else if (entry.EntryType == "Credit")
                    {
                        totalCreditAmount += entry.Amount;
                    }
                }

                // Update session totals
                // Debit to Cash = Money IN (like Receipt)
                // Credit to Cash = Money OUT (like Payment)
                session.TotalReceipts += totalDebitAmount; // Debit to Cash = Money IN
                session.TotalPayments += totalCreditAmount; // Credit to Cash = Money OUT

                session.ExpectedClosingBalance = session.OpeningBalance + session.TotalSales + session.TotalReceipts
                                               - session.TotalReturns - session.TotalPayments;
                session.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation($"Added journal voucher {journalVoucherId} to session {session.Id}. " +
                                      $"Debit(Cash IN): {totalDebitAmount}, Credit(Cash OUT): {totalCreditAmount}, " +
                                      $"New TotalReceipts: {session.TotalReceipts}, New TotalPayments: {session.TotalPayments}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in UpdateSessionFromJournalVoucherAsync for journal voucher: {journalVoucherId}");
                throw;
            }
        }

        public async Task RemoveSessionFromJournalVoucherAsync(Guid journalVoucherId)
        {
            try
            {
                _logger.LogInformation($"=== RemoveSessionFromJournalVoucherAsync STARTED for Journal Voucher: {journalVoucherId} ===");

                var journalVoucher = await _context.JournalVouchers
                    .Include(jv => jv.JournalEntries)
                        .ThenInclude(je => je.Account)
                    .FirstOrDefaultAsync(jv => jv.Id == journalVoucherId);

                if (journalVoucher == null)
                {
                    _logger.LogWarning($"Journal Voucher {journalVoucherId} not found");
                    return;
                }

                var userId = journalVoucher.UserId;
                var companyId = journalVoucher.CompanyId;

                // Get the current open session for this user
                var session = await _context.CashCounterSessions
                    .FirstOrDefaultAsync(s => s.UserId == userId &&
                                             s.CompanyId == companyId &&
                                             s.Status == CashCounterStatus.Open.ToString());

                if (session == null)
                {
                    _logger.LogWarning($"No open cash counter session found for user {userId}");
                    return;
                }

                // Find all cash entries for this journal voucher in the session
                var existingEntries = await _context.CashCounterJournalVouchers
                    .Where(cjv => cjv.SessionId == session.Id && cjv.JournalVoucherId == journalVoucherId)
                    .ToListAsync();

                if (!existingEntries.Any())
                {
                    _logger.LogInformation($"Journal Voucher {journalVoucherId} not found in session {session.Id}");
                    return;
                }

                // Calculate totals to reverse
                decimal totalDebitAmount = 0;
                decimal totalCreditAmount = 0;

                foreach (var entry in existingEntries)
                {
                    if (entry.EntryType == "Debit")
                    {
                        totalDebitAmount += entry.Amount;
                    }
                    else if (entry.EntryType == "Credit")
                    {
                        totalCreditAmount += entry.Amount;
                    }
                }

                // Remove the entries from session
                _context.CashCounterJournalVouchers.RemoveRange(existingEntries);

                // Reverse session totals
                session.TotalReceipts -= totalDebitAmount; // Reverse Money IN
                session.TotalPayments -= totalCreditAmount; // Reverse Money OUT

                session.ExpectedClosingBalance = session.OpeningBalance + session.TotalSales + session.TotalReceipts
                                               - session.TotalReturns - session.TotalPayments;
                session.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation($"Removed journal voucher {journalVoucherId} from session {session.Id}. " +
                                      $"Reversed Debit(Cash IN): {totalDebitAmount}, Reversed Credit(Cash OUT): {totalCreditAmount}, " +
                                      $"New TotalReceipts: {session.TotalReceipts}, New TotalPayments: {session.TotalPayments}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in RemoveSessionFromJournalVoucherAsync for journal voucher: {journalVoucherId}");
                throw;
            }
        }

        public async Task UpdateSessionFromDebitNoteAsync(Guid debitNoteId)
        {
            try
            {
                _logger.LogInformation($"=== UpdateSessionFromDebitNoteAsync STARTED for Debit Note: {debitNoteId} ===");

                // Get the debit note with all entries and accounts
                var debitNote = await _context.DebitNotes
                    .Include(dn => dn.DebitNoteEntries)
                        .ThenInclude(dne => dne.Account)
                    .FirstOrDefaultAsync(dn => dn.Id == debitNoteId);

                if (debitNote == null)
                {
                    _logger.LogWarning($"Debit Note {debitNoteId} not found");
                    return;
                }

                _logger.LogInformation($"Debit Note: Id={debitNote.Id}, UserId={debitNote.UserId}, TotalAmount={debitNote.TotalAmount}");

                var userId = debitNote.UserId;
                var companyId = debitNote.CompanyId;

                // Get the current open session for this user
                var session = await _context.CashCounterSessions
                    .FirstOrDefaultAsync(s => s.UserId == userId &&
                                             s.CompanyId == companyId &&
                                             s.Status == CashCounterStatus.Open.ToString());

                if (session == null)
                {
                    _logger.LogWarning($"No open cash counter session found for user {userId}");
                    return;
                }

                // Check if this debit note is already added to the session
                var existingDN = await _context.CashCounterDebitNotes
                    .FirstOrDefaultAsync(cdn => cdn.SessionId == session.Id && cdn.DebitNoteId == debitNoteId);

                if (existingDN != null)
                {
                    _logger.LogInformation($"Debit Note {debitNoteId} already added to session {session.Id}");
                    return;
                }

                // Find cash-related entries
                var cashEntries = debitNote.DebitNoteEntries
                    .Where(dne => dne.Account.Name?.ToLower() == "cash in hand")
                    .ToList();

                if (!cashEntries.Any())
                {
                    _logger.LogInformation($"No cash entries found in debit note {debitNoteId}, skipping");
                    return;
                }

                // Process each cash entry
                decimal totalDebitAmount = 0;
                decimal totalCreditAmount = 0;

                foreach (var entry in cashEntries)
                {
                    // Add the debit note to session
                    var cashCounterDN = new CashCounterDebitNote
                    {
                        Id = Guid.NewGuid(),
                        SessionId = session.Id,
                        DebitNoteId = debitNoteId,
                        Amount = entry.Amount,
                        EntryType = entry.EntryType,
                        AccountName = entry.Account.Name,
                        CreatedAt = DateTime.UtcNow
                    };

                    await _context.CashCounterDebitNotes.AddAsync(cashCounterDN);

                    if (entry.EntryType == "Debit")
                    {
                        totalDebitAmount += entry.Amount;
                    }
                    else if (entry.EntryType == "Credit")
                    {
                        totalCreditAmount += entry.Amount;
                    }
                }

                // Update session totals
                // Debit to Cash = Money IN (like Receipt)
                // Credit to Cash = Money OUT (like Payment)
                session.TotalReceipts += totalDebitAmount; // Debit to Cash = Money IN
                session.TotalPayments += totalCreditAmount; // Credit to Cash = Money OUT

                session.ExpectedClosingBalance = session.OpeningBalance + session.TotalSales + session.TotalReceipts
                                               - session.TotalReturns - session.TotalPayments;
                session.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation($"Added debit note {debitNoteId} to session {session.Id}. " +
                                      $"Debit(Cash IN): {totalDebitAmount}, Credit(Cash OUT): {totalCreditAmount}, " +
                                      $"New TotalReceipts: {session.TotalReceipts}, New TotalPayments: {session.TotalPayments}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in UpdateSessionFromDebitNoteAsync for debit note: {debitNoteId}");
                throw;
            }
        }

        public async Task RemoveSessionFromDebitNoteAsync(Guid debitNoteId)
        {
            try
            {
                _logger.LogInformation($"=== RemoveSessionFromDebitNoteAsync STARTED for Debit Note: {debitNoteId} ===");

                var debitNote = await _context.DebitNotes
                    .Include(dn => dn.DebitNoteEntries)
                        .ThenInclude(dne => dne.Account)
                    .FirstOrDefaultAsync(dn => dn.Id == debitNoteId);

                if (debitNote == null)
                {
                    _logger.LogWarning($"Debit Note {debitNoteId} not found");
                    return;
                }

                var userId = debitNote.UserId;
                var companyId = debitNote.CompanyId;

                // Get the current open session for this user
                var session = await _context.CashCounterSessions
                    .FirstOrDefaultAsync(s => s.UserId == userId &&
                                             s.CompanyId == companyId &&
                                             s.Status == CashCounterStatus.Open.ToString());

                if (session == null)
                {
                    _logger.LogWarning($"No open cash counter session found for user {userId}");
                    return;
                }

                // Find all cash entries for this debit note in the session
                var existingEntries = await _context.CashCounterDebitNotes
                    .Where(cdn => cdn.SessionId == session.Id && cdn.DebitNoteId == debitNoteId)
                    .ToListAsync();

                if (!existingEntries.Any())
                {
                    _logger.LogInformation($"Debit Note {debitNoteId} not found in session {session.Id}");
                    return;
                }

                // Calculate totals to reverse
                decimal totalDebitAmount = 0;
                decimal totalCreditAmount = 0;

                foreach (var entry in existingEntries)
                {
                    if (entry.EntryType == "Debit")
                    {
                        totalDebitAmount += entry.Amount;
                    }
                    else if (entry.EntryType == "Credit")
                    {
                        totalCreditAmount += entry.Amount;
                    }
                }

                // Remove the entries from session
                _context.CashCounterDebitNotes.RemoveRange(existingEntries);

                // Reverse session totals
                session.TotalReceipts -= totalDebitAmount; // Reverse Money IN
                session.TotalPayments -= totalCreditAmount; // Reverse Money OUT

                session.ExpectedClosingBalance = session.OpeningBalance + session.TotalSales + session.TotalReceipts
                                               - session.TotalReturns - session.TotalPayments;
                session.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation($"Removed debit note {debitNoteId} from session {session.Id}. " +
                                      $"Reversed Debit(Cash IN): {totalDebitAmount}, Reversed Credit(Cash OUT): {totalCreditAmount}, " +
                                      $"New TotalReceipts: {session.TotalReceipts}, New TotalPayments: {session.TotalPayments}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in RemoveSessionFromDebitNoteAsync for debit note: {debitNoteId}");
                throw;
            }
        }

        public async Task UpdateSessionFromCreditNoteAsync(Guid creditNoteId)
        {
            try
            {
                _logger.LogInformation($"=== UpdateSessionFromCreditNoteAsync STARTED for Credit Note: {creditNoteId} ===");

                // Get the credit note with all entries and accounts
                var creditNote = await _context.CreditNotes
                    .Include(cn => cn.CreditNoteEntries)
                        .ThenInclude(cne => cne.Account)
                    .FirstOrDefaultAsync(cn => cn.Id == creditNoteId);

                if (creditNote == null)
                {
                    _logger.LogWarning($"Credit Note {creditNoteId} not found");
                    return;
                }

                _logger.LogInformation($"Credit Note: Id={creditNote.Id}, UserId={creditNote.UserId}, TotalAmount={creditNote.TotalAmount}");

                var userId = creditNote.UserId;
                var companyId = creditNote.CompanyId;

                // Get the current open session for this user
                var session = await _context.CashCounterSessions
                    .FirstOrDefaultAsync(s => s.UserId == userId &&
                                             s.CompanyId == companyId &&
                                             s.Status == CashCounterStatus.Open.ToString());

                if (session == null)
                {
                    _logger.LogWarning($"No open cash counter session found for user {userId}");
                    return;
                }

                // Check if this credit note is already added to the session
                var existingCN = await _context.CashCounterCreditNotes
                    .FirstOrDefaultAsync(ccn => ccn.SessionId == session.Id && ccn.CreditNoteId == creditNoteId);

                if (existingCN != null)
                {
                    _logger.LogInformation($"Credit Note {creditNoteId} already added to session {session.Id}");
                    return;
                }

                // Find cash-related entries
                var cashEntries = creditNote.CreditNoteEntries
                    .Where(cne => cne.Account.Name?.ToLower() == "cash in hand")
                    .ToList();

                if (!cashEntries.Any())
                {
                    _logger.LogInformation($"No cash entries found in credit note {creditNoteId}, skipping");
                    return;
                }

                // Process each cash entry
                decimal totalDebitAmount = 0;
                decimal totalCreditAmount = 0;

                foreach (var entry in cashEntries)
                {
                    // Add the credit note to session
                    var cashCounterCN = new CashCounterCreditNote
                    {
                        Id = Guid.NewGuid(),
                        SessionId = session.Id,
                        CreditNoteId = creditNoteId,
                        Amount = entry.Amount,
                        EntryType = entry.EntryType,
                        AccountName = entry.Account.Name,
                        CreatedAt = DateTime.UtcNow
                    };

                    await _context.CashCounterCreditNotes.AddAsync(cashCounterCN);

                    if (entry.EntryType == "Debit")
                    {
                        totalDebitAmount += entry.Amount;
                    }
                    else if (entry.EntryType == "Credit")
                    {
                        totalCreditAmount += entry.Amount;
                    }
                }

                // Update session totals
                // Debit to Cash = Money IN (like Receipt)
                // Credit to Cash = Money OUT (like Payment)
                session.TotalReceipts += totalDebitAmount; // Debit to Cash = Money IN
                session.TotalPayments += totalCreditAmount; // Credit to Cash = Money OUT

                session.ExpectedClosingBalance = session.OpeningBalance + session.TotalSales + session.TotalReceipts
                                               - session.TotalReturns - session.TotalPayments;
                session.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation($"Added credit note {creditNoteId} to session {session.Id}. " +
                                      $"Debit(Cash IN): {totalDebitAmount}, Credit(Cash OUT): {totalCreditAmount}, " +
                                      $"New TotalReceipts: {session.TotalReceipts}, New TotalPayments: {session.TotalPayments}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in UpdateSessionFromCreditNoteAsync for credit note: {creditNoteId}");
                throw;
            }
        }

        public async Task RemoveSessionFromCreditNoteAsync(Guid creditNoteId)
        {
            try
            {
                _logger.LogInformation($"=== RemoveSessionFromCreditNoteAsync STARTED for Credit Note: {creditNoteId} ===");

                var creditNote = await _context.CreditNotes
                    .Include(cn => cn.CreditNoteEntries)
                        .ThenInclude(cne => cne.Account)
                    .FirstOrDefaultAsync(cn => cn.Id == creditNoteId);

                if (creditNote == null)
                {
                    _logger.LogWarning($"Credit Note {creditNoteId} not found");
                    return;
                }

                var userId = creditNote.UserId;
                var companyId = creditNote.CompanyId;

                // Get the current open session for this user
                var session = await _context.CashCounterSessions
                    .FirstOrDefaultAsync(s => s.UserId == userId &&
                                             s.CompanyId == companyId &&
                                             s.Status == CashCounterStatus.Open.ToString());

                if (session == null)
                {
                    _logger.LogWarning($"No open cash counter session found for user {userId}");
                    return;
                }

                // Find all cash entries for this credit note in the session
                var existingEntries = await _context.CashCounterCreditNotes
                    .Where(ccn => ccn.SessionId == session.Id && ccn.CreditNoteId == creditNoteId)
                    .ToListAsync();

                if (!existingEntries.Any())
                {
                    _logger.LogInformation($"Credit Note {creditNoteId} not found in session {session.Id}");
                    return;
                }

                // Calculate totals to reverse
                decimal totalDebitAmount = 0;
                decimal totalCreditAmount = 0;

                foreach (var entry in existingEntries)
                {
                    if (entry.EntryType == "Debit")
                    {
                        totalDebitAmount += entry.Amount;
                    }
                    else if (entry.EntryType == "Credit")
                    {
                        totalCreditAmount += entry.Amount;
                    }
                }

                // Remove the entries from session
                _context.CashCounterCreditNotes.RemoveRange(existingEntries);

                // Reverse session totals
                session.TotalReceipts -= totalDebitAmount; // Reverse Money IN
                session.TotalPayments -= totalCreditAmount; // Reverse Money OUT

                session.ExpectedClosingBalance = session.OpeningBalance + session.TotalSales + session.TotalReceipts
                                               - session.TotalReturns - session.TotalPayments;
                session.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation($"Removed credit note {creditNoteId} from session {session.Id}. " +
                                      $"Reversed Debit(Cash IN): {totalDebitAmount}, Reversed Credit(Cash OUT): {totalCreditAmount}, " +
                                      $"New TotalReceipts: {session.TotalReceipts}, New TotalPayments: {session.TotalPayments}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in RemoveSessionFromCreditNoteAsync for credit note: {creditNoteId}");
                throw;
            }
        }

        public async Task UpdateSessionFromPurchaseBillAsync(Guid purchaseBillId)
        {
            try
            {
                _logger.LogInformation($"=== UpdateSessionFromPurchaseBillAsync STARTED for Purchase Bill: {purchaseBillId} ===");

                // Get the purchase bill with all needed data
                var purchaseBill = await _context.PurchaseBills
                    .Include(pb => pb.User)
                    .FirstOrDefaultAsync(pb => pb.Id == purchaseBillId);

                if (purchaseBill == null)
                {
                    _logger.LogWarning($"Purchase bill {purchaseBillId} not found");
                    return;
                }

                _logger.LogInformation($"Purchase Bill: Id={purchaseBill.Id}, UserId={purchaseBill.UserId}, PaymentMode={purchaseBill.PaymentMode}, TotalAmount={purchaseBill.TotalAmount}");

                // Only process cash transactions
                if (purchaseBill.PaymentMode?.ToLower() != "cash")
                {
                    _logger.LogInformation($"Purchase bill {purchaseBillId} is not cash, skipping");
                    return;
                }

                var userId = purchaseBill.UserId;
                var companyId = purchaseBill.CompanyId;

                // Get the current open session for this user
                var session = await _context.CashCounterSessions
                    .FirstOrDefaultAsync(s => s.UserId == userId &&
                                             s.CompanyId == companyId &&
                                             s.Status == CashCounterStatus.Open.ToString());

                if (session == null)
                {
                    _logger.LogWarning($"No open cash counter session found for user {userId}");
                    return;
                }

                // Check if this purchase bill is already added to the session
                var existingBill = await _context.CashCounterPurchaseBills
                    .FirstOrDefaultAsync(cpb => cpb.SessionId == session.Id && cpb.PurchaseBillId == purchaseBillId);

                if (existingBill != null)
                {
                    _logger.LogInformation($"Purchase bill {purchaseBillId} already added to session {session.Id}");
                    return;
                }

                // Add the purchase bill to session
                var cashCounterBill = new CashCounterPurchaseBill
                {
                    Id = Guid.NewGuid(),
                    SessionId = session.Id,
                    PurchaseBillId = purchaseBillId,
                    Amount = purchaseBill.TotalAmount ?? 0,
                    PaymentMode = purchaseBill.PaymentMode,
                    CreatedAt = DateTime.UtcNow
                };

                await _context.CashCounterPurchaseBills.AddAsync(cashCounterBill);

                // Update session totals - Purchase Bills INCREASE payments (money going OUT)
                session.TotalPayments += purchaseBill.TotalAmount ?? 0;
                session.ExpectedClosingBalance = session.OpeningBalance + session.TotalSales + session.TotalReceipts
                                               - session.TotalReturns - session.TotalPayments;
                session.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation($"Added purchase bill {purchaseBillId} to session {session.Id}. New TotalPayments: {session.TotalPayments}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in UpdateSessionFromPurchaseBillAsync for purchase bill: {purchaseBillId}");
                throw;
            }
        }

        public async Task RemoveSessionFromPurchaseBillAsync(Guid purchaseBillId)
        {
            try
            {
                _logger.LogInformation($"=== RemoveSessionFromPurchaseBillAsync STARTED for Purchase Bill: {purchaseBillId} ===");

                var purchaseBill = await _context.PurchaseBills
                    .FirstOrDefaultAsync(pb => pb.Id == purchaseBillId);

                if (purchaseBill == null)
                {
                    _logger.LogWarning($"Purchase bill {purchaseBillId} not found");
                    return;
                }

                // Only process cash transactions
                if (purchaseBill.PaymentMode?.ToLower() != "cash")
                {
                    _logger.LogInformation($"Purchase bill {purchaseBillId} is not cash, skipping");
                    return;
                }

                var userId = purchaseBill.UserId;
                var companyId = purchaseBill.CompanyId;

                // Get the current open session for this user
                var session = await _context.CashCounterSessions
                    .FirstOrDefaultAsync(s => s.UserId == userId &&
                                             s.CompanyId == companyId &&
                                             s.Status == CashCounterStatus.Open.ToString());

                if (session == null)
                {
                    _logger.LogWarning($"No open cash counter session found for user {userId}");
                    return;
                }

                // Find the purchase bill in session
                var existingBill = await _context.CashCounterPurchaseBills
                    .FirstOrDefaultAsync(cpb => cpb.SessionId == session.Id && cpb.PurchaseBillId == purchaseBillId);

                if (existingBill == null)
                {
                    _logger.LogInformation($"Purchase bill {purchaseBillId} not found in session {session.Id}");
                    return;
                }

                // Remove the purchase bill from session
                _context.CashCounterPurchaseBills.Remove(existingBill);

                // Update session totals
                session.TotalPayments -= existingBill.Amount;
                session.ExpectedClosingBalance = session.OpeningBalance + session.TotalSales + session.TotalReceipts
                                               - session.TotalReturns - session.TotalPayments;
                session.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation($"Removed purchase bill {purchaseBillId} from session {session.Id}. New TotalPayments: {session.TotalPayments}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in RemoveSessionFromPurchaseBillAsync for purchase bill: {purchaseBillId}");
                throw;
            }
        }

        public async Task UpdateSessionFromPurchaseReturnAsync(Guid purchaseReturnId)
        {
            try
            {
                _logger.LogInformation($"=== UpdateSessionFromPurchaseReturnAsync STARTED for Purchase Return: {purchaseReturnId} ===");

                // Get the purchase return with all needed data
                var purchaseReturn = await _context.PurchaseReturns
                    .Include(pr => pr.User)
                    .FirstOrDefaultAsync(pr => pr.Id == purchaseReturnId);

                if (purchaseReturn == null)
                {
                    _logger.LogWarning($"Purchase return {purchaseReturnId} not found");
                    return;
                }

                _logger.LogInformation($"Purchase Return: Id={purchaseReturn.Id}, UserId={purchaseReturn.UserId}, PaymentMode={purchaseReturn.PaymentMode}, TotalAmount={purchaseReturn.TotalAmount}");

                // Only process cash transactions
                if (purchaseReturn.PaymentMode?.ToLower() != "cash")
                {
                    _logger.LogInformation($"Purchase return {purchaseReturnId} is not cash, skipping");
                    return;
                }

                var userId = purchaseReturn.UserId;
                var companyId = purchaseReturn.CompanyId;

                // Get the current open session for this user
                var session = await _context.CashCounterSessions
                    .FirstOrDefaultAsync(s => s.UserId == userId &&
                                             s.CompanyId == companyId &&
                                             s.Status == CashCounterStatus.Open.ToString());

                if (session == null)
                {
                    _logger.LogWarning($"No open cash counter session found for user {userId}");
                    return;
                }

                // Check if this purchase return is already added to the session
                var existingReturn = await _context.CashCounterPurchaseReturns
                    .FirstOrDefaultAsync(cpr => cpr.SessionId == session.Id && cpr.PurchaseReturnId == purchaseReturnId);

                if (existingReturn != null)
                {
                    _logger.LogInformation($"Purchase return {purchaseReturnId} already added to session {session.Id}");
                    return;
                }

                // Add the purchase return to session
                var cashCounterReturn = new CashCounterPurchaseReturn
                {
                    Id = Guid.NewGuid(),
                    SessionId = session.Id,
                    PurchaseReturnId = purchaseReturnId,
                    Amount = purchaseReturn.TotalAmount ?? 0,
                    PaymentMode = purchaseReturn.PaymentMode,
                    CreatedAt = DateTime.UtcNow
                };

                await _context.CashCounterPurchaseReturns.AddAsync(cashCounterReturn);

                // Update session totals - Purchase Returns INCREASE receipts (money coming IN from refund)
                session.TotalReceipts += purchaseReturn.TotalAmount ?? 0;
                session.ExpectedClosingBalance = session.OpeningBalance + session.TotalSales + session.TotalReceipts
                                               - session.TotalReturns - session.TotalPayments;
                session.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation($"Added purchase return {purchaseReturnId} to session {session.Id}. New TotalReceipts: {session.TotalReceipts}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in UpdateSessionFromPurchaseReturnAsync for purchase return: {purchaseReturnId}");
                throw;
            }
        }

        public async Task RemoveSessionFromPurchaseReturnAsync(Guid purchaseReturnId)
        {
            try
            {
                _logger.LogInformation($"=== RemoveSessionFromPurchaseReturnAsync STARTED for Purchase Return: {purchaseReturnId} ===");

                var purchaseReturn = await _context.PurchaseReturns
                    .FirstOrDefaultAsync(pr => pr.Id == purchaseReturnId);

                if (purchaseReturn == null)
                {
                    _logger.LogWarning($"Purchase return {purchaseReturnId} not found");
                    return;
                }

                // Only process cash transactions
                if (purchaseReturn.PaymentMode?.ToLower() != "cash")
                {
                    _logger.LogInformation($"Purchase return {purchaseReturnId} is not cash, skipping");
                    return;
                }

                var userId = purchaseReturn.UserId;
                var companyId = purchaseReturn.CompanyId;

                // Get the current open session for this user
                var session = await _context.CashCounterSessions
                    .FirstOrDefaultAsync(s => s.UserId == userId &&
                                             s.CompanyId == companyId &&
                                             s.Status == CashCounterStatus.Open.ToString());

                if (session == null)
                {
                    _logger.LogWarning($"No open cash counter session found for user {userId}");
                    return;
                }

                // Find the purchase return in session
                var existingReturn = await _context.CashCounterPurchaseReturns
                    .FirstOrDefaultAsync(cpr => cpr.SessionId == session.Id && cpr.PurchaseReturnId == purchaseReturnId);

                if (existingReturn == null)
                {
                    _logger.LogInformation($"Purchase return {purchaseReturnId} not found in session {session.Id}");
                    return;
                }

                // Remove the purchase return from session
                _context.CashCounterPurchaseReturns.Remove(existingReturn);

                // Update session totals
                session.TotalReceipts -= existingReturn.Amount;
                session.ExpectedClosingBalance = session.OpeningBalance + session.TotalSales + session.TotalReceipts
                                               - session.TotalReturns - session.TotalPayments;
                session.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation($"Removed purchase return {purchaseReturnId} from session {session.Id}. New TotalReceipts: {session.TotalReceipts}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in RemoveSessionFromPurchaseReturnAsync for purchase return: {purchaseReturnId}");
                throw;
            }
        }

    }
}