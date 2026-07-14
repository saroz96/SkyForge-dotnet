using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.UserModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkyForge.Models.Retailer.CashCounterModel
{
    public enum CashCounterStatus
    {
        Open,
        Closed,
        Suspended
    }

    public enum DenominationType
    {
        Note2000 = 2000,
        Note1000 = 1000,
        Note500 = 500,
        Note200 = 200,
        Note100 = 100,
        Note50 = 50,
        Note20 = 20,
        Note10 = 10,
        Note5 = 5,
        Note2 = 2,
        Note1 = 1
    }

    [Table("cash_counter_denominations")]
    public class CashCounterDenomination
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("session_id")]
        public Guid SessionId { get; set; }

        [ForeignKey("SessionId")]
        public CashCounterSession Session { get; set; } = null!;

        [Column("denomination_type")]
        [StringLength(20)]
        public string DenominationType { get; set; } = string.Empty;

        [Column("quantity")]
        public int Quantity { get; set; } = 0;

        [Column("total_value")]
        [Precision(18, 2)]
        public decimal TotalValue { get; set; } = 0;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }


    [Table("cash_counter_sessions")]
    public class CashCounterSession
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("company_id")]
        public Guid CompanyId { get; set; }

        [ForeignKey("CompanyId")]
        public Company Company { get; set; } = null!;

        [Required]
        [Column("user_id")]
        public Guid UserId { get; set; }

        [ForeignKey("UserId")]
        public User User { get; set; } = null!;

        [Required]
        [Column("fiscal_year_id")]
        public Guid FiscalYearId { get; set; }

        [ForeignKey("FiscalYearId")]
        public FiscalYear FiscalYear { get; set; } = null!;

        [Column("opening_balance")]
        [Precision(18, 2)]
        public decimal OpeningBalance { get; set; } = 0;

        [Column("closing_balance")]
        [Precision(18, 2)]
        public decimal ClosingBalance { get; set; } = 0;

        [Column("expected_closing_balance")]
        [Precision(18, 2)]
        public decimal ExpectedClosingBalance { get; set; } = 0;

        [Column("total_sales")]
        [Precision(18, 2)]
        public decimal TotalSales { get; set; } = 0;

        [Column("total_returns")]
        [Precision(18, 2)]
        public decimal TotalReturns { get; set; } = 0;

        [Column("total_payments")]
        [Precision(18, 2)]
        public decimal TotalPayments { get; set; } = 0;

        [Column("total_receipts")]
        [Precision(18, 2)]
        public decimal TotalReceipts { get; set; } = 0;

        [Column("cash_difference")]
        [Precision(18, 2)]
        public decimal CashDifference { get; set; } = 0;

        [Column("status")]
        [StringLength(20)]
        public string Status { get; set; } = CashCounterStatus.Open.ToString();

        [Column("opened_at")]
        public DateTime OpenedAt { get; set; } = DateTime.UtcNow;

        [Column("closed_at")]
        public DateTime? ClosedAt { get; set; }

        [Column("opening_nepali_date")]
        [StringLength(20)]
        public string? OpeningNepaliDate { get; set; }

        [Column("closing_nepali_date")]
        [StringLength(20)]
        public string? ClosingNepaliDate { get; set; }

        [Column("notes")]
        [StringLength(500)]
        public string? Notes { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [Column("opening_denominations_set")]
        public bool OpeningDenominationsSet { get; set; } = false;

        [Column("closing_denominations_set")]
        public bool ClosingDenominationsSet { get; set; } = false;

        // Navigation property for denominations
        public virtual ICollection<CashCounterDenomination> Denominations { get; set; } = new List<CashCounterDenomination>();

        // Navigation property for cash transactions
        public virtual ICollection<CashCounterTransaction> Transactions { get; set; } = new List<CashCounterTransaction>();

        // Navigation property for sales bills
        public virtual ICollection<CashCounterSalesBill> SalesBills { get; set; } = new List<CashCounterSalesBill>();

        // Navigation property for sales returns
        public virtual ICollection<CashCounterSalesReturn> SalesReturns { get; set; } = new List<CashCounterSalesReturn>();

        // Navigation property for payments
        public virtual ICollection<CashCounterPayment> Payments { get; set; } = new List<CashCounterPayment>();

        // Navigation property for receipts
        public virtual ICollection<CashCounterReceipt> Receipts { get; set; } = new List<CashCounterReceipt>();

        // Navigation property for journal vouchers
        public virtual ICollection<CashCounterJournalVoucher> JournalVouchers { get; set; } = new List<CashCounterJournalVoucher>();

        // Navigation property for debit notes
        public virtual ICollection<CashCounterDebitNote> DebitNotes { get; set; } = new List<CashCounterDebitNote>();

        // Navigation property for credit notes
        public virtual ICollection<CashCounterCreditNote> CreditNotes { get; set; } = new List<CashCounterCreditNote>();

        // Navigation property for purchase bills
        public virtual ICollection<CashCounterPurchaseBill> PurchaseBills { get; set; } = new List<CashCounterPurchaseBill>();

        // Navigation property for purchase returns
        public virtual ICollection<CashCounterPurchaseReturn> PurchaseReturns { get; set; } = new List<CashCounterPurchaseReturn>();

    }

    public enum CashTransactionType
    {
        OpeningBalance,
        Sales,
        SalesReturn,
        Payment,
        Receipt,
        Adjustment,
        ClosingBalance
    }

    [Table("cash_counter_transactions")]
    public class CashCounterTransaction
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("session_id")]
        public Guid SessionId { get; set; }

        [ForeignKey("SessionId")]
        public CashCounterSession Session { get; set; } = null!;

        [Column("transaction_type")]
        [StringLength(50)]
        public string TransactionType { get; set; } = string.Empty;

        [Column("amount")]
        [Precision(18, 2)]
        public decimal Amount { get; set; } = 0;

        [Column("description")]
        [StringLength(500)]
        public string? Description { get; set; }

        [Column("reference_id")]
        public Guid? ReferenceId { get; set; }

        [Column("reference_type")]
        [StringLength(50)]
        public string? ReferenceType { get; set; }

        [Column("reference_number")]
        [StringLength(100)]
        public string? ReferenceNumber { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("nepali_date")]
        [StringLength(20)]
        public string? NepaliDate { get; set; }

        [Column("user_id")]
        public Guid? UserId { get; set; }

        [ForeignKey("UserId")]
        public User? User { get; set; }
    }

    [Table("cash_counter_sales_bills")]
    public class CashCounterSalesBill
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("session_id")]
        public Guid SessionId { get; set; }

        [ForeignKey("SessionId")]
        public CashCounterSession Session { get; set; } = null!;

        [Required]
        [Column("sales_bill_id")]
        public Guid SalesBillId { get; set; }

        [Column("amount")]
        [Precision(18, 2)]
        public decimal Amount { get; set; }

        [Column("payment_mode")]
        [StringLength(20)]
        public string? PaymentMode { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    [Table("cash_counter_sales_returns")]
    public class CashCounterSalesReturn
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("session_id")]
        public Guid SessionId { get; set; }

        [ForeignKey("SessionId")]
        public CashCounterSession Session { get; set; } = null!;

        [Required]
        [Column("sales_return_id")]
        public Guid SalesReturnId { get; set; }

        [Column("amount")]
        [Precision(18, 2)]
        public decimal Amount { get; set; }

        [Column("payment_mode")]
        [StringLength(20)]
        public string? PaymentMode { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    [Table("cash_counter_payments")]
    public class CashCounterPayment
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("session_id")]
        public Guid SessionId { get; set; }

        [ForeignKey("SessionId")]
        public CashCounterSession Session { get; set; } = null!;

        [Required]
        [Column("payment_id")]
        public Guid PaymentId { get; set; }

        [Column("amount")]
        [Precision(18, 2)]
        public decimal Amount { get; set; }

        [Column("payment_mode")]
        [StringLength(20)]
        public string? PaymentMode { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    [Table("cash_counter_receipts")]
    public class CashCounterReceipt
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("session_id")]
        public Guid SessionId { get; set; }

        [ForeignKey("SessionId")]
        public CashCounterSession Session { get; set; } = null!;

        [Required]
        [Column("receipt_id")]
        public Guid ReceiptId { get; set; }

        [Column("amount")]
        [Precision(18, 2)]
        public decimal Amount { get; set; }

        [Column("receipt_mode")]
        [StringLength(20)]
        public string? ReceiptMode { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    [Table("cash_counter_journal_vouchers")]
    public class CashCounterJournalVoucher
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("session_id")]
        public Guid SessionId { get; set; }

        [ForeignKey("SessionId")]
        public CashCounterSession Session { get; set; } = null!;

        [Required]
        [Column("journal_voucher_id")]
        public Guid JournalVoucherId { get; set; }

        [Column("amount")]
        [Precision(18, 2)]
        public decimal Amount { get; set; }

        [Column("entry_type")]
        [StringLength(10)]
        public string? EntryType { get; set; } // "Debit" or "Credit"

        [Column("account_name")]
        [StringLength(255)]
        public string? AccountName { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    [Table("cash_counter_debit_notes")]
    public class CashCounterDebitNote
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("session_id")]
        public Guid SessionId { get; set; }

        [ForeignKey("SessionId")]
        public CashCounterSession Session { get; set; } = null!;

        [Required]
        [Column("debit_note_id")]
        public Guid DebitNoteId { get; set; }

        [Column("amount")]
        [Precision(18, 2)]
        public decimal Amount { get; set; }

        [Column("entry_type")]
        [StringLength(10)]
        public string? EntryType { get; set; } // "Debit" or "Credit"

        [Column("account_name")]
        [StringLength(255)]
        public string? AccountName { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    [Table("cash_counter_credit_notes")]
    public class CashCounterCreditNote
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("session_id")]
        public Guid SessionId { get; set; }

        [ForeignKey("SessionId")]
        public CashCounterSession Session { get; set; } = null!;

        [Required]
        [Column("credit_note_id")]
        public Guid CreditNoteId { get; set; }

        [Column("amount")]
        [Precision(18, 2)]
        public decimal Amount { get; set; }

        [Column("entry_type")]
        [StringLength(10)]
        public string? EntryType { get; set; } // "Debit" or "Credit"

        [Column("account_name")]
        [StringLength(255)]
        public string? AccountName { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    [Table("cash_counter_purchase_bills")]
    public class CashCounterPurchaseBill
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("session_id")]
        public Guid SessionId { get; set; }

        [ForeignKey("SessionId")]
        public CashCounterSession Session { get; set; } = null!;

        [Required]
        [Column("purchase_bill_id")]
        public Guid PurchaseBillId { get; set; }

        [Column("amount")]
        [Precision(18, 2)]
        public decimal Amount { get; set; }

        [Column("payment_mode")]
        [StringLength(20)]
        public string? PaymentMode { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    [Table("cash_counter_purchase_returns")]
    public class CashCounterPurchaseReturn
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("session_id")]
        public Guid SessionId { get; set; }

        [ForeignKey("SessionId")]
        public CashCounterSession Session { get; set; } = null!;

        [Required]
        [Column("purchase_return_id")]
        public Guid PurchaseReturnId { get; set; }

        [Column("amount")]
        [Precision(18, 2)]
        public decimal Amount { get; set; }

        [Column("payment_mode")]
        [StringLength(20)]
        public string? PaymentMode { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

}