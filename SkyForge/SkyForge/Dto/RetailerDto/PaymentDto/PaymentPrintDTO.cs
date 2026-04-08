// using SkyForge.Dto.RetailerDto.PurchaseBillDto;


// namespace SkyForge.Dto.RetailerDto.PaymentDto
// {
//     public class PaymentPrintDTO
//     {
//         public CompanyPrintDTO Company { get; set; } = new();
//         public FiscalYearDTO? CurrentFiscalYear { get; set; }
//         public PaymentPrintPaymentDTO Payment { get; set; } = new();
//         public string CurrentCompanyName { get; set; } = string.Empty;
//         public CompanyPrintInfoDTO CurrentCompany { get; set; } = new();
//         public bool FirstBill { get; set; }
//         public decimal? LastBalance { get; set; }
//         public string BalanceLabel { get; set; } = string.Empty;
//         public string NepaliDate { get; set; } = string.Empty;
//         public DateTime EnglishDate { get; set; }
//         public string CompanyDateFormat { get; set; } = string.Empty;
//         public UserPrintDTO User { get; set; } = new();
//         public bool IsAdminOrSupervisor { get; set; }
//         public List<TransactionPrintDTO> Transactions { get; set; } = new();
//     }

//     public class PaymentPrintPaymentDTO
//     {
//         public Guid Id { get; set; }
//         public string BillNumber { get; set; } = string.Empty;
//         public bool FirstPrinted { get; set; }
//         public int PrintCount { get; set; }
//         public DateTime Date { get; set; }
//         public DateTime NepaliDate { get; set; }
//         public decimal Debit { get; set; }
//         public string? Description { get; set; }
//         public string InstType { get; set; } = string.Empty;
//         public string? InstNo { get; set; }
//         public string Status { get; set; } = string.Empty;
//         public DateTime CreatedAt { get; set; }
//         public DateTime? UpdatedAt { get; set; }

//         public AccountPrintDTO? Account { get; set; }
//         public AccountPrintDTO? PaymentAccount { get; set; }
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
//         public OpeningBalanceDTO? OpeningBalance { get; set; }
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

//----------------------------------------------------------------end

using System;
using System.Collections.Generic;

namespace SkyForge.Dto.RetailerDto.PaymentDto
{
    public class PaymentPrintDTO
    {
        public CompanyPrintDTO Company { get; set; } = new();
        public FiscalYearDTO? CurrentFiscalYear { get; set; }
        public PaymentPrintPaymentDTO Payment { get; set; } = new();
        public List<PaymentEntryPrintDTO> DebitEntries { get; set; } = new();
        public List<PaymentEntryPrintDTO> CreditEntries { get; set; } = new();
        public string CurrentCompanyName { get; set; } = string.Empty;
        public CompanyPrintInfoDTO CurrentCompany { get; set; } = new();
        public string NepaliDate { get; set; } = string.Empty;
        public DateTime EnglishDate { get; set; }
        public string CompanyDateFormat { get; set; } = string.Empty;
        public UserPrintDTO User { get; set; } = new();
        public bool IsAdminOrSupervisor { get; set; }
    }

    public class PaymentPrintPaymentDTO
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

    public class PaymentEntryPrintDTO
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