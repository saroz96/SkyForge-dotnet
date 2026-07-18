using SkyForge.Models.Retailer.TransactionModel;
using System;
using System.ComponentModel.DataAnnotations;

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

    public class PartyTurnoverRequestDto
    {
        [Required(ErrorMessage = "Amount threshold is required")]
        [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than 0")]
        public decimal Amount { get; set; }

        [Required(ErrorMessage = "Transaction type is required")]
        public string TransactionType { get; set; } = "Sales";

        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public string? PaymentMode { get; set; } = "all";
    }

    public class PartyTurnoverResponseDto
    {
        public bool Success { get; set; }
        public string? Error { get; set; }
        public PartyTurnoverAllDataDto? Data { get; set; }
    }

    public class PartyTurnoverAllDataDto
    {
        public decimal ThresholdAmount { get; set; }
        public string TransactionType { get; set; } = string.Empty;
        public List<PartyTurnoverPartyDto> Parties { get; set; } = new List<PartyTurnoverPartyDto>();
        public PartyTurnoverSummaryDto Summary { get; set; } = new PartyTurnoverSummaryDto();
        public DateTime GeneratedDate { get; set; }
        public string? GeneratedDateNepali { get; set; }
    }

    public class PartyTurnoverPartyDto
    {
        public Guid PartyId { get; set; }
        public string PartyName { get; set; } = string.Empty;
        public string? Pan { get; set; }
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string? AccountGroup { get; set; }
        public int TransactionCount { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal AverageAmount { get; set; }
        public decimal MinAmount { get; set; }
        public decimal MaxAmount { get; set; }
        public List<PartyTurnoverTransactionDto> Transactions { get; set; } = new List<PartyTurnoverTransactionDto>();
    }

    public class PartyTurnoverTransactionDto
    {
        public Guid Id { get; set; }
        public DateTime Date { get; set; }
        public string? NepaliDate { get; set; }
        public string? BillNumber { get; set; }
        public string? PartyBillNumber { get; set; }
        public string TransactionType { get; set; } = string.Empty;
        public string PaymentMode { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public decimal TotalDebit { get; set; }
        public decimal TotalCredit { get; set; }
        public decimal VatAmount { get; set; }
        public string? InstrumentType { get; set; }
        public string? InstrumentNumber { get; set; }
        public List<PartyTurnoverItemDto> Items { get; set; } = new List<PartyTurnoverItemDto>();
    }

    public class PartyTurnoverItemDto
    {
        public Guid? ItemId { get; set; }
        public string? ItemName { get; set; }
        public string? ItemCode { get; set; }
        public decimal? Quantity { get; set; }
        public string? UnitName { get; set; }
        public decimal Price { get; set; }
        public decimal? PuPrice { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal? DiscountAmount { get; set; }
        public decimal? VatAmount { get; set; }
    }

    public class PartyTurnoverSummaryDto
    {
        public int TotalParties { get; set; }
        public int TotalTransactions { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal TotalVatAmount { get; set; }
        public decimal AverageTransactionAmount { get; set; }
        public decimal MinTransactionAmount { get; set; }
        public decimal MaxTransactionAmount { get; set; }
        public DateTime? FirstTransactionDate { get; set; }
        public DateTime? LastTransactionDate { get; set; }
    }
}
