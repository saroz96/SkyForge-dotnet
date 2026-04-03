// using System;
// using System.Collections.Generic;

// namespace SkyForge.Dto.RetailerDto.ReceiptDto
// {
//     public class ReceiptPrintDTO
//     {
//         public CompanyPrintDTO Company { get; set; } = new();
//         public FiscalYearDTO? CurrentFiscalYear { get; set; }
//         public ReceiptPrintReceiptDTO Receipt { get; set; } = new();
//         public string CurrentCompanyName { get; set; } = string.Empty;
//         public CompanyPrintInfoDTO CurrentCompany { get; set; } = new();
//         public string NepaliDate { get; set; } = string.Empty;
//         public DateTime EnglishDate { get; set; }
//         public string CompanyDateFormat { get; set; } = string.Empty;
//         public UserPrintDTO User { get; set; } = new();
//         public bool IsAdminOrSupervisor { get; set; }
//         public List<TransactionPrintDTO> Transactions { get; set; } = new();
//         // public ReceiptTransactionDetailDTO TransactionsDetail { get; set; } = new();
//     }

//     public class ReceiptPrintReceiptDTO
//     {
//         public Guid Id { get; set; }
//         public string BillNumber { get; set; } = string.Empty;
//         public DateTime Date { get; set; }
//         public DateTime NepaliDate { get; set; }
//         public decimal Debit { get; set; }
//         public decimal Credit { get; set; }
//         public string? Description { get; set; }
//         public string InstType { get; set; } = string.Empty;
//         public string? BankAcc { get; set; }
//         public string? InstNo { get; set; }
//         public string Status { get; set; } = string.Empty;
//         public DateTime CreatedAt { get; set; }
//         public DateTime? UpdatedAt { get; set; }

//         public AccountPrintDTO? Account { get; set; }
//         public AccountPrintDTO? ReceiptAccount { get; set; }
//         public UserPrintDTO? User { get; set; }
//     }

//     public class AccountPrintDTO
//     {
//         public Guid Id { get; set; }
//         public string Name { get; set; } = string.Empty;
//         public string? Pan { get; set; }
//         public string? Address { get; set; }
//         public string? Email { get; set; }
//         public string? Phone { get; set; }
//     }

//     public class TransactionPrintDTO
//     {
//         public Guid Id { get; set; }
//         public Guid AccountId { get; set; }
//         public string AccountName { get; set; } = string.Empty;
//         public string DrCrNoteAccountTypes { get; set; } = string.Empty;
//         public decimal Debit { get; set; }
//         public decimal Credit { get; set; }
//         public decimal? Balance { get; set; }
//         public DateTime Date { get; set; }
//     }
// }

//-------------------------------------------------------------------end

using System;
using System.Collections.Generic;

namespace SkyForge.Dto.RetailerDto.ReceiptDto
{
    public class ReceiptPrintDTO
    {
        public CompanyPrintDTO Company { get; set; } = new();
        public FiscalYearDTO? CurrentFiscalYear { get; set; }
        public ReceiptPrintReceiptDTO Receipt { get; set; } = new();
        public List<ReceiptEntryPrintDTO> DebitEntries { get; set; } = new();
        public List<ReceiptEntryPrintDTO> CreditEntries { get; set; } = new();
        public string CurrentCompanyName { get; set; } = string.Empty;
        public CompanyPrintInfoDTO CurrentCompany { get; set; } = new();
        public string NepaliDate { get; set; } = string.Empty;
        public DateTime EnglishDate { get; set; }
        public string CompanyDateFormat { get; set; } = string.Empty;
        public UserPrintDTO User { get; set; } = new();
        public bool IsAdminOrSupervisor { get; set; }
    }

    public class ReceiptPrintReceiptDTO
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public DateTime NepaliDate { get; set; }
        public decimal TotalAmount { get; set; }
        public string? Description { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public UserPrintDTO? User { get; set; }
    }

    public class ReceiptEntryPrintDTO
    {
        public Guid Id { get; set; }
        public Guid AccountId { get; set; }
        public string AccountName { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string? Description { get; set; }
        public string? InstType { get; set; }
        public string? BankAcc { get; set; }
        public string? InstNo { get; set; }
        public string? ReferenceNumber { get; set; }
    }
}