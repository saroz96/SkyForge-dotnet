using SkyForge.Models.Retailer.CashCounterModel;

namespace SkyForge.Services.Retailer.CashCounterServices
{
    public interface ICashCounterService
    {
        Task<CashCounterSession> OpenCounterAsync(Guid userId, Guid companyId, Guid fiscalYearId, decimal openingBalance, string? notes = null);
        Task<CashCounterSession> CloseCounterAsync(Guid sessionId, decimal closingBalance, string? notes = null);
        Task<CashCounterSession> GetCurrentSessionAsync(Guid userId, Guid companyId);
        Task<CashCounterSession> GetSessionByIdAsync(Guid sessionId);
        Task<List<CashCounterSession>> GetUserSessionsAsync(Guid userId, Guid companyId, DateTime? fromDate = null, DateTime? toDate = null);
        Task<CashCounterTransaction> AddTransactionAsync(Guid sessionId, CashTransactionType type, decimal amount, string? description = null, string? referenceNumber = null);
        Task<decimal> GetUserCashSummaryAsync(Guid userId, Guid companyId, DateTime? fromDate = null, DateTime? toDate = null);
        Task<List<CashCounterSession>> GetAllSessionsAsync(Guid companyId, DateTime? fromDate = null, DateTime? toDate = null);

        Task<CashCounterSession> OpenCounterWithDenominationsAsync(
           Guid userId,
           Guid companyId,
           Guid fiscalYearId,
           Dictionary<int, int> denominations,
           string? notes = null);

        Task<CashCounterDenomination> AddDenominationAsync(
            Guid sessionId,
            DenominationType denominationType,
            int quantity);
        Task<List<CashCounterDenomination>> GetSessionDenominationsAsync(Guid sessionId);
        Task<Dictionary<int, int>> GetDenominationSummaryAsync(Guid sessionId);
        Task<CashCounterSession> CloseCounterWithDenominationsAsync(
            Guid sessionId,
            Dictionary<int, int> closingDenominations,
            string? notes = null);
        Task<CashCounterSession> GetSessionByUserIdAsync(Guid userId, Guid companyId);

        Task UpdateSessionFromSalesBillAsync(Guid salesBillId);
        Task RemoveSessionFromSalesBillAsync(Guid salesBillId);

        Task UpdateSessionFromSalesReturnAsync(Guid salesReturnId);
        Task RemoveSessionFromSalesReturnAsync(Guid salesReturnId);
        Task UpdateSessionFromPaymentAsync(Guid paymentId);
        Task RemoveSessionFromPaymentAsync(Guid paymentId);
        Task UpdateSessionFromReceiptAsync(Guid receiptId);
        Task RemoveSessionFromReceiptAsync(Guid receiptId);
        Task UpdateSessionFromJournalVoucherAsync(Guid journalVoucherId);
        Task RemoveSessionFromJournalVoucherAsync(Guid journalVoucherId);
        Task UpdateSessionFromDebitNoteAsync(Guid debitNoteId);
        Task RemoveSessionFromDebitNoteAsync(Guid debitNoteId);
        Task UpdateSessionFromCreditNoteAsync(Guid creditNoteId);
        Task RemoveSessionFromCreditNoteAsync(Guid creditNoteId);
        Task UpdateSessionFromPurchaseBillAsync(Guid purchaseBillId);
        Task RemoveSessionFromPurchaseBillAsync(Guid purchaseBillId);
        Task UpdateSessionFromPurchaseReturnAsync(Guid purchaseReturnId);
        Task RemoveSessionFromPurchaseReturnAsync(Guid purchaseReturnId);
    }
}