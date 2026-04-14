using SkyForge.Models.AccountModel;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.Retailer.CreditNoteModel;
using SkyForge.Models.Retailer.DebitNoteModel;
using SkyForge.Models.Retailer.Items;
using SkyForge.Models.Retailer.JournalVoucherModel;
using SkyForge.Models.Retailer.MainUnitModel;
using SkyForge.Models.Retailer.PaymentModel;
using SkyForge.Models.Retailer.Purchase;
using SkyForge.Models.Retailer.PurchaseReturnModel;
using SkyForge.Models.Retailer.ReceiptModel;
using SkyForge.Models.Retailer.Sales;
using SkyForge.Models.Retailer.SalesReturnModel;
using SkyForge.Models.UnitModel;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkyForge.Models.Retailer.TransactionModel
{
    public enum TransactionType
    {
        Purc,
        PrRt,
        Sale,
        SlRt,
        StockAdjustment,
        Pymt,
        Rcpt,
        Jrnl,
        DrNt,
        CrNt,
        OpeningBalance
    }

    public enum TransactionIsType
    {
        VAT,
        RoundOff,
        Purc,
        PrRt,
        Sale,
        SlRt
    }

    public enum PaymentMode
    {
        Cash,
        Credit,
        Payment,
        Receipt,
        Journal,
        DrNote,
        CrNote
    }

    public enum InstrumentType
    {
        NA,
        RTGS,
        Fonepay,
        Cheque,
        ConnectIps,
        Esewa,
        Khalti
    }

    public enum TransactionStatus
    {
        Active,
        Canceled
    }

    [Table("Transactions")]
    public class Transaction
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }

        [Required]
        [ForeignKey("Company")]
        public Guid CompanyId { get; set; }
        public virtual Company Company { get; set; } = null!;

        // Account references (header level)
        [ForeignKey("Account")]
        public Guid? AccountId { get; set; }
        public virtual Account? Account { get; set; }

        // Bill references
        [ForeignKey("PurchaseBill")]
        public Guid? PurchaseBillId { get; set; }
        public virtual PurchaseBill? PurchaseBill { get; set; }

        [ForeignKey("PurchaseReturn")]
        public Guid? PurchaseReturnBillId { get; set; }
        public virtual PurchaseReturn? PurchaseReturn { get; set; }

        [ForeignKey("SalesBill")]
        public Guid? SalesBillId { get; set; }
        public virtual SalesBill? SalesBill { get; set; }

        [ForeignKey("SalesReturn")]
        public Guid? SalesReturnBillId { get; set; }
        public virtual SalesReturn? SalesReturn { get; set; }

        [ForeignKey("JournalVoucher")]
        public Guid? JournalBillId { get; set; }
        public virtual JournalVoucher? JournalVoucher { get; set; }

        [ForeignKey("DebitNote")]
        public Guid? DebitNoteId { get; set; }
        public virtual DebitNote? DebitNote { get; set; }

        [ForeignKey("CreditNote")]
        public Guid? CreditNoteId { get; set; }
        public virtual CreditNote? CreditNote { get; set; }

        [ForeignKey("Payment")]
        public Guid? PaymentAccountId { get; set; }
        public virtual Payment? Payment { get; set; }

        [ForeignKey("Receipt")]
        public Guid? ReceiptAccountId { get; set; }
        public virtual Receipt? Receipt { get; set; }

        // Transaction header details
        [Required]
        [Column(TypeName = "varchar(50)")]
        public TransactionType Type { get; set; }

        [Column(TypeName = "varchar(50)")]
        public TransactionIsType? IsType { get; set; }

        [MaxLength(100)]
        public string? BillNumber { get; set; }

        [MaxLength(100)]
        public string? PartyBillNumber { get; set; }

        // Header-level totals
        [Precision(18, 2)]
        public decimal TotalDebit { get; set; } = 0;

        [Precision(18, 2)]
        public decimal TotalCredit { get; set; } = 0;

        // Header-level VAT summary
        [Column("taxable_amount")]
        [Precision(18, 2)]
        public decimal? TaxableAmount { get; set; }

        public decimal? VatPercentage { get; set; }

        [Precision(18, 2)]
        public decimal? VatAmount { get; set; }

        [Column(TypeName = "varchar(50)")]
        public PaymentMode PaymentMode { get; set; } = PaymentMode.Cash;

        [Column(TypeName = "varchar(50)")]
        public InstrumentType InstType { get; set; } = InstrumentType.NA;

        [MaxLength(100)]
        public string? BankAcc { get; set; }

        [MaxLength(100)]
        public string? InstNo { get; set; }

        // Party/Account details
        [MaxLength(50)]
        public string? PurchaseSalesType { get; set; }

        [MaxLength(50)]
        public string? PurchaseSalesReturnType { get; set; }

        [MaxLength(50)]
        public string? PaymentReceiptType { get; set; }

        [MaxLength(2000)]
        public string? JournalAccountType { get; set; }

        [MaxLength(50)]
        public string? JournalAccountDrCrType { get; set; }

        [MaxLength(500)]
        public string? DrCrNoteAccountType { get; set; }

        [MaxLength(2000)]
        public string? DrCrNoteAccountTypes { get; set; }

        // Payment/Receipt accounts
        [ForeignKey("PaymentAccount")]
        public Guid? PaymentAccountId2 { get; set; }
        public virtual Account? PaymentAccount { get; set; }

        [ForeignKey("ReceiptAccount2")]
        public Guid? ReceiptAccountId2 { get; set; }
        public virtual Account? ReceiptAccount { get; set; }

        [ForeignKey("DebitAccount")]
        public Guid? DebitAccountId { get; set; }
        public virtual Account? DebitAccount { get; set; }

        [ForeignKey("CreditAccount")]
        public Guid? CreditAccountId { get; set; }
        public virtual Account? CreditAccount { get; set; }

        [Required]
        [ForeignKey("FiscalYear")]
        public Guid FiscalYearId { get; set; }
        public virtual FiscalYearModel.FiscalYear FiscalYear { get; set; } = null!;

        public DateTime Date { get; set; } = DateTime.UtcNow;
        public DateTime BillDate { get; set; } = DateTime.UtcNow;

        [Column("nepali_date")]
        public DateTime nepaliDate { get; set; }

        [Column("transaction_date_nepali")]
        public DateTime transactionDateNepali { get; set; }

        [Column(TypeName = "varchar(20)")]
        public TransactionStatus Status { get; set; } = TransactionStatus.Active;

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // Navigation property for transaction items
        public virtual ICollection<TransactionItem> TransactionItems { get; set; } = new List<TransactionItem>();
    }
}