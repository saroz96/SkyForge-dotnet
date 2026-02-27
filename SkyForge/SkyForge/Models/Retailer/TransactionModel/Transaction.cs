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

        // Item references
        [ForeignKey("Item")]
        public Guid? ItemId { get; set; }
        public virtual Item? Item { get; set; }

        [ForeignKey("Unit")]
        public Guid? UnitId { get; set; }
        public virtual Unit? Unit { get; set; }

        [ForeignKey("MainUnit")]
        public Guid? MainUnitId { get; set; }
        public virtual MainUnit? MainUnit { get; set; }

        // Account references
        [ForeignKey("Account")]
        public Guid? AccountId { get; set; }
        public virtual Account? Account { get; set; }

        // Bill references
        [ForeignKey("SalesBill")]
        public Guid? SalesBillId { get; set; }
        public virtual SalesBill? SalesBill { get; set; }

        [ForeignKey("PurchaseBill")]
        public Guid? PurchaseBillId { get; set; }
        public virtual PurchaseBill? PurchaseBill { get; set; }

        [ForeignKey("PurchaseReturn")]
        public Guid? PurchaseReturnBillId { get; set; }
        public virtual PurchaseReturn? PurchaseReturn { get; set; }

        [ForeignKey("JournalVoucher")]
        public Guid? JournalBillId { get; set; }
        public virtual JournalVoucher? JournalVoucher { get; set; }

        [ForeignKey("DebitNote")]
        public Guid? DebitNoteId { get; set; }
        public virtual DebitNote? DebitNote { get; set; }

        [ForeignKey("CreditNote")]
        public Guid? CreditNoteId { get; set; }
        public virtual CreditNote? CreditNote { get; set; }

        [ForeignKey("SalesReturn")]
        public Guid? SalesReturnBillId { get; set; }
        public virtual SalesReturn? SalesReturn { get; set; }

        [ForeignKey("Payment")]
        public Guid? PaymentAccountId { get; set; }
        public virtual Payment? Payment { get; set; }

        [ForeignKey("Receipt")]
        public Guid? ReceiptAccountId { get; set; }
        public virtual Receipt? Receipt { get; set; }

        // Transaction details
        public int? WSUnit { get; set; }

        private decimal? _quantity;
        public decimal? Quantity
        {
            get => _quantity;
            set
            {
                if (value.HasValue)
                {
                    var wsUnit = WSUnit ?? 1;
                    _quantity = wsUnit * value.Value;
                }
                else
                {
                    _quantity = null;
                }
            }
        }

        private decimal? _bonus;
        public decimal? Bonus
        {
            get => _bonus;
            set
            {
                if (value.HasValue)
                {
                    var wsUnit = WSUnit ?? 1;
                    _bonus = wsUnit * value.Value;
                }
                else
                {
                    _bonus = null;
                }
            }
        }

        public decimal Price { get; set; } = 0;
        public decimal NetPrice { get; set; } = 0;

        private decimal? _puPrice;
        public decimal? PuPrice
        {
            get => _puPrice;
            set
            {
                if (value.HasValue)
                {
                    var wsUnit = WSUnit ?? 1;
                    _puPrice = value.Value / wsUnit;
                }
                else
                {
                    _puPrice = null;
                }
            }
        }

        public decimal DiscountPercentagePerItem { get; set; } = 0;
        public decimal DiscountAmountPerItem { get; set; } = 0;
        public decimal NetPuPrice { get; set; } = 0;

        [Required]
        [Column(TypeName = "varchar(50)")]
        public TransactionType Type { get; set; }

        [Column(TypeName = "varchar(50)")]
        public TransactionIsType? IsType { get; set; }

        [MaxLength(100)]
        public string? BillNumber { get; set; }

        [MaxLength(100)]
        public string? PartyBillNumber { get; set; }

        [MaxLength(100)]
        public string? SalesBillNumber { get; set; }

        [ForeignKey("AccountType")]
        public Guid? AccountTypeId { get; set; }
        public virtual AccountModel.Account? AccountType { get; set; }

        [MaxLength(50)]
        public string? PurchaseSalesType { get; set; }

        [MaxLength(50)]
        public string? PurchaseSalesReturnType { get; set; }

        [MaxLength(50)]
        public string? JournalAccountType { get; set; }

        [MaxLength(10)]
        public string? JournalAccountDrCrType { get; set; }

        [MaxLength(50)]
        public string? DrCrNoteAccountType { get; set; }

        [MaxLength(50)]
        public string? DrCrNoteAccountTypes { get; set; }

        public decimal Debit { get; set; } = 0;

        public decimal Credit { get; set; } = 0;

        public decimal? Balance { get; set; }

        [Column(TypeName = "varchar(50)")]
        public PaymentMode PaymentMode { get; set; } = PaymentMode.Cash;

        [ForeignKey("PaymentAccount")]
        public Guid? PaymentAccountId2 { get; set; }
        public virtual AccountModel.Account? PaymentAccount { get; set; }

        [ForeignKey("ReceiptAccount2")]
        public Guid? ReceiptAccountId2 { get; set; }
        public virtual AccountModel.Account? ReceiptAccount { get; set; }

        [ForeignKey("DebitAccount")]
        public Guid? DebitAccountId { get; set; }
        public virtual AccountModel.Account? DebitAccount { get; set; }

        [ForeignKey("CreditAccount")]
        public Guid? CreditAccountId { get; set; }
        public virtual AccountModel.Account? CreditAccount { get; set; }

        [Column(TypeName = "varchar(50)")]
        public InstrumentType InstType { get; set; } = InstrumentType.NA;

        [MaxLength(100)]
        public string? BankAcc { get; set; }

        [MaxLength(100)]
        public string? InstNo { get; set; }

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
    }
}
