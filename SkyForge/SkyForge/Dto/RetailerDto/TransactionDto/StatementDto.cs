namespace SkyForge.Dto.RetailerDto.TransactionDto
{
    public class StatementRequestDTO
    {
        public Guid? AccountId { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public string? PaymentMode { get; set; } = "all";
        public bool IncludeItems { get; set; } = false;
        public string? DateFormat { get; set; } = "english";
    }
    public class StatementResponseDTO
    {
        public bool Success { get; set; }
        public StatementDataDTO Data { get; set; } = null!;
        public string? Error { get; set; }
    }

    public class StatementDataDTO
    {
        public CompanyStatementDTO Company { get; set; } = null!;
        public FiscalYearStatementDTO? CurrentFiscalYear { get; set; }
        public List<StatementEntryDTO> Statement { get; set; } = new();
        public List<ItemwiseStatementDTO> ItemwiseStatement { get; set; } = new();
        public List<AccountStatementDTO> Accounts { get; set; } = new();
        public string? PartyName { get; set; }
        public Guid? SelectedCompany { get; set; }
        public AccountStatementDTO? Account { get; set; }
        public string? FromDate { get; set; }
        public string? ToDate { get; set; }
        public string PaymentMode { get; set; } = "all";
        public decimal TotalDebit { get; set; }
        public decimal TotalCredit { get; set; }
        public decimal OpeningBalance { get; set; }
        public string CurrentCompanyName { get; set; } = string.Empty;
        public string CompanyDateFormat { get; set; } = "english";
        public string NepaliDate { get; set; } = string.Empty;
        public UserStatementDTO User { get; set; } = null!;
    }

    public class CompanyStatementDTO
    {
        public Guid Id { get; set; }
        public DateTime? RenewalDate { get; set; }
        public string DateFormat { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public int? Ward { get; set; }
        public string Pan { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string Country { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
    }

    public class FiscalYearStatementDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string DateFormat { get; set; } = string.Empty;
        public bool IsActive { get; set; }
    }

    public class AccountStatementDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string UniqueNumber { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? Phone { get; set; }
        public string? Pan { get; set; }
        public InitialOpeningBalanceDTO InitialOpeningBalance { get; set; } = null!;
        public List<CompanyGroupDTO> CompanyGroups { get; set; } = new();
    }

    public class InitialOpeningBalanceDTO
    {
        public string Type { get; set; } = "Dr";
        public decimal Amount { get; set; }
    }

    public class CompanyGroupDTO
    {
        public string Name { get; set; } = string.Empty;
    }

    public class StatementEntryDTO
    {
        public DateTime? Date { get; set; }
        public DateTime? NepaliDate { get; set; }
        public string? Type { get; set; }
        public string? BillNumber { get; set; }
        public string? PaymentMode { get; set; }
        public string? PartyBillNumber { get; set; }
        public PaymentAccountDTO? PaymentAccount { get; set; }
        public ReceiptAccountDTO? ReceiptAccount { get; set; }
        public DebitAccountDTO? DebitAccount { get; set; }
        public CreditAccountDTO? CreditAccount { get; set; }
        public string? AccountType { get; set; }
        public string? PurchaseSalesType { get; set; }
        public string? PurchaseSalesReturnType { get; set; }
        public string? PaymentReceiptType { get; set; }
        public string? JournalAccountType { get; set; }
        public string? DrCrNoteAccountType { get; set; }
        public string? InstType { get; set; }
        public string? InstNo { get; set; }
        public AccountReferenceDTO? Account { get; set; }
        public decimal Debit { get; set; }
        public decimal Credit { get; set; }
        public decimal Balance { get; set; }
        public Guid? BillId { get; set; }
        public Guid? PurchaseBillId { get; set; }
        public Guid? PurchaseReturnBillId { get; set; }
        public Guid? PaymentAccountId { get; set; }
        public Guid? ReceiptAccountId { get; set; }
        public Guid? JournalBillId { get; set; }
        public Guid? DebitNoteId { get; set; }
        public Guid? SalesBillId { get; set; }
    }

    public class PaymentAccountDTO
    {
        public string Name { get; set; } = string.Empty;
    }

    public class ReceiptAccountDTO
    {
        public string Name { get; set; } = string.Empty;
    }

    public class DebitAccountDTO
    {
        public string Name { get; set; } = string.Empty;
    }

    public class CreditAccountDTO
    {
        public string Name { get; set; } = string.Empty;
    }

    public class AccountReferenceDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
    }

    public class ItemwiseStatementDTO
    {
        public DateTime Date { get; set; }
        public DateTime NepaliDate { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string PaymentMode { get; set; } = string.Empty;
        public string? PartyBillNumber { get; set; }
        public string? PartyName { get; set; }
        public List<ItemDetailDTO> Items { get; set; } = new();
        public decimal VatAmount { get; set; }
        public decimal TotalAmount { get; set; }
    }

    public class ItemDetailDTO
    {
        public ItemInfoDTO? Item { get; set; }
        public decimal? Quantity { get; set; }
        public UnitInfoDTO? Unit { get; set; }
        public decimal Price { get; set; }
        public decimal? PuPrice { get; set; }
        public decimal NetPrice { get; set; }
        public decimal DiscountPercentagePerItem { get; set; }
        public decimal DiscountAmountPerItem { get; set; }
        public decimal NetPuPrice { get; set; }
        public decimal VatPercentage { get; set; }
        public decimal VatAmount { get; set; }
        public decimal TaxableAmount { get; set; }
        public decimal TotalAmount { get; set; }
    }

    public class ItemInfoDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int? Code { get; set; }
        public string? Hscode { get; set; }
    }

    public class UnitInfoDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
    }

    public class UserStatementDTO
    {
        public UserPreferencesDTO Preferences { get; set; } = null!;
        public bool IsAdmin { get; set; }
        public string Role { get; set; } = string.Empty;
    }

    public class UserPreferencesDTO
    {
        public string Theme { get; set; } = "light";
    }
}