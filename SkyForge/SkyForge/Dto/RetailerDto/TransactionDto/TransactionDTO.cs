using SkyForge.Models.Retailer.TransactionModel;
using System;

namespace SkyForge.Dto.RetailerDto.TransactionDto
{
    public class TransactionDTO
    {
        public Guid Id { get; set; }

        // Company
        public Guid CompanyId { get; set; }
        public string CompanyName { get; set; } = string.Empty;

        // Item references
        public Guid? ItemId { get; set; }
        public string? ItemName { get; set; }

        public Guid? UnitId { get; set; }
        public string? UnitName { get; set; }

        public Guid? MainUnitId { get; set; }
        public string? MainUnitName { get; set; }

        // Account references
        public Guid? AccountId { get; set; }
        public string? AccountName { get; set; }

        // Bill references
        public Guid? BillId { get; set; }
        public Guid? PurchaseBillId { get; set; }
        public Guid? PurchaseReturnBillId { get; set; }
        public Guid? JournalBillId { get; set; }
        public Guid? DebitNoteId { get; set; }
        public Guid? CreditNoteId { get; set; }
        public Guid? SalesReturnBillId { get; set; }
        public Guid? PaymentAccountId { get; set; }
        public Guid? ReceiptAccountId { get; set; }

        // Transaction details
        public int? WSUnit { get; set; }
        public decimal? Quantity { get; set; }
        public decimal? Bonus { get; set; }
        public decimal Price { get; set; } = 0;
        public decimal NetPrice { get; set; } = 0;
        public decimal? PuPrice { get; set; }
        public decimal DiscountPercentagePerItem { get; set; } = 0;
        public decimal DiscountAmountPerItem { get; set; } = 0;
        public decimal NetPuPrice { get; set; } = 0;

        public TransactionType Type { get; set; }
        public TransactionIsType? IsType { get; set; }

        public string? BillNumber { get; set; }
        public string? PartyBillNumber { get; set; }
        public string? SalesBillNumber { get; set; }

        public Guid? AccountTypeId { get; set; }
        public string? AccountTypeName { get; set; }

        public string? PurchaseSalesType { get; set; }
        public string? PurchaseSalesReturnType { get; set; }
        public string? JournalAccountType { get; set; }
        public string? JournalAccountDrCrType { get; set; }
        public string? DrCrNoteAccountType { get; set; }
        public string? DrCrNoteAccountTypes { get; set; }

        public decimal Debit { get; set; }
        public decimal Credit { get; set; }
        public decimal? Balance { get; set; }

        public PaymentMode PaymentMode { get; set; } = PaymentMode.Cash;

        public Guid? PaymentAccountId2 { get; set; }
        public string? PaymentAccountName { get; set; }

        public Guid? ReceiptAccountId2 { get; set; }
        public string? ReceiptAccountName { get; set; }

        public Guid? DebitAccountId { get; set; }
        public string? DebitAccountName { get; set; }

        public Guid? CreditAccountId { get; set; }
        public string? CreditAccountName { get; set; }

        public InstrumentType InstType { get; set; } = InstrumentType.NA;
        public string? BankAcc { get; set; }
        public string? InstNo { get; set; }

        public Guid FiscalYearId { get; set; }
        public string FiscalYearName { get; set; } = string.Empty;

        public DateTime Date { get; set; }
        public DateTime BillDate { get; set; }
        public DateTime nepaliDate { get; set; }
        public DateTime transactionDateNepali { get; set; }

        public TransactionStatus Status { get; set; } = TransactionStatus.Active;
        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class CreateTransactionDto
    {
        public Guid CompanyId { get; set; }

        // Item references
        public Guid? ItemId { get; set; }
        public Guid? UnitId { get; set; }
        public Guid? MainUnitId { get; set; }

        // Account references
        public Guid? AccountId { get; set; }

        // Bill references
        public Guid? BillId { get; set; }
        public Guid? PurchaseBillId { get; set; }
        public Guid? PurchaseReturnBillId { get; set; }
        public Guid? JournalBillId { get; set; }
        public Guid? DebitNoteId { get; set; }
        public Guid? CreditNoteId { get; set; }
        public Guid? SalesReturnBillId { get; set; }
        public Guid? PaymentAccountId { get; set; }
        public Guid? ReceiptAccountId { get; set; }

        // Transaction details
        public int? WSUnit { get; set; }
        public decimal? Quantity { get; set; }
        public decimal? Bonus { get; set; }
        public decimal Price { get; set; } = 0;
        public decimal NetPrice { get; set; } = 0;
        public decimal? PuPrice { get; set; }
        public decimal DiscountPercentagePerItem { get; set; } = 0;
        public decimal DiscountAmountPerItem { get; set; } = 0;
        public decimal NetPuPrice { get; set; } = 0;

        public TransactionType Type { get; set; }
        public TransactionIsType? IsType { get; set; }

        public string? BillNumber { get; set; }
        public string? PartyBillNumber { get; set; }
        public string? SalesBillNumber { get; set; }

        public Guid? AccountTypeId { get; set; }

        public string? PurchaseSalesType { get; set; }
        public string? PurchaseSalesReturnType { get; set; }
        public string? JournalAccountType { get; set; }
        public string? JournalAccountDrCrType { get; set; }
        public string? DrCrNoteAccountType { get; set; }
        public string? DrCrNoteAccountTypes { get; set; }

        public decimal Debit { get; set; }
        public decimal Credit { get; set; }
        public decimal? Balance { get; set; }

        public PaymentMode PaymentMode { get; set; } = PaymentMode.Cash;

        public Guid? PaymentAccountId2 { get; set; }
        public Guid? ReceiptAccountId2 { get; set; }
        public Guid? DebitAccountId { get; set; }
        public Guid? CreditAccountId { get; set; }

        public InstrumentType InstType { get; set; } = InstrumentType.NA;
        public string? BankAcc { get; set; }
        public string? InstNo { get; set; }

        public Guid FiscalYearId { get; set; }

        public DateTime Date { get; set; } = DateTime.UtcNow;
        public DateTime BillDate { get; set; } = DateTime.UtcNow;

        public TransactionStatus Status { get; set; } = TransactionStatus.Active;
    }

    public class UpdateTransactionDto
    {
        public Guid? ItemId { get; set; }
        public Guid? UnitId { get; set; }
        public Guid? MainUnitId { get; set; }

        public Guid? AccountId { get; set; }

        public int? WSUnit { get; set; }
        public decimal? Quantity { get; set; }
        public decimal? Bonus { get; set; }
        public decimal Price { get; set; }
        public decimal NetPrice { get; set; }
        public decimal? PuPrice { get; set; }
        public decimal DiscountPercentagePerItem { get; set; }
        public decimal DiscountAmountPerItem { get; set; }
        public decimal NetPuPrice { get; set; }

        public TransactionIsType? IsType { get; set; }

        public string? BillNumber { get; set; }
        public string? PartyBillNumber { get; set; }
        public string? SalesBillNumber { get; set; }

        public Guid? AccountTypeId { get; set; }

        public string? PurchaseSalesType { get; set; }
        public string? PurchaseSalesReturnType { get; set; }
        public string? JournalAccountType { get; set; }
        public string? JournalAccountDrCrType { get; set; }
        public string? DrCrNoteAccountType { get; set; }
        public string? DrCrNoteAccountTypes { get; set; }

        public decimal Debit { get; set; }
        public decimal Credit { get; set; }
        public decimal? Balance { get; set; }

        public PaymentMode PaymentMode { get; set; }

        public Guid? PaymentAccountId2 { get; set; }
        public Guid? ReceiptAccountId2 { get; set; }
        public Guid? DebitAccountId { get; set; }
        public Guid? CreditAccountId { get; set; }

        public InstrumentType InstType { get; set; }
        public string? BankAcc { get; set; }
        public string? InstNo { get; set; }

        public DateTime? Date { get; set; }
        public DateTime? BillDate { get; set; }

        public TransactionStatus? Status { get; set; }
        public bool? IsActive { get; set; }
    }

    public class TransactionSummaryDto
    {
        public Guid Id { get; set; }
        public string Type { get; set; } = string.Empty;
        public string BillNumber { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string AccountName { get; set; } = string.Empty;
        public decimal Debit { get; set; }
        public decimal Credit { get; set; }
        public decimal? Balance { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class TransactionFilterDto
    {
        public Guid? CompanyId { get; set; }
        public Guid? AccountId { get; set; }
        public Guid? ItemId { get; set; }
        public TransactionType? Type { get; set; }
        public TransactionStatus? Status { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public Guid? FiscalYearId { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 50;
    }

    public class TransactionResponseDto
    {
        public Guid Id { get; set; }
        public DateTime Date { get; set; }
        public DateTime NepaliDate { get; set; }
        public string? BillNumber { get; set; }
        public string? Type { get; set; }
        public string? PurchaseSalesType { get; set; }
        public string? PaymentMode { get; set; }
        public decimal Quantity { get; set; }
        public decimal? Bonus { get; set; }
        public decimal Price { get; set; }
        public decimal? PuPrice { get; set; }
        public decimal Amount { get; set; }
        public string? UnitName { get; set; }
        public Guid? BillId { get; set; }
        public string? PurchaseBillNumber { get; set; }

        public Guid? PurchaseBillId { get; set; }  // For purchase transactions
        public Guid? SalesBillId { get; set; }     // For sales transactions
        public string? Unit { get; set; }
    }
    public class SalesTransactionsResponseDto
    {
        public List<TransactionResponseDto> Transactions { get; set; } = new List<TransactionResponseDto>();
        public int Count { get; set; }
    }
}
