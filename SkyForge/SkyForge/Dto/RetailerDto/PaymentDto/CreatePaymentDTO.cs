// using SkyForge.Models.Retailer.PaymentModel;
// using System;
// using System.Collections.Generic;
// using System.ComponentModel.DataAnnotations;
// using SkyForge.Dto.AccountDto;


// namespace SkyForge.Dto.RetailerDto.PaymentDto
// {
//     public class CreatePaymentDTO
//     {
//         public DateTime NepaliDate { get; set; }
//         public DateTime Date { get; set; }
//         [Required]
//         public Guid PaymentAccountId { get; set; }

//         [Required]
//         public Guid AccountId { get; set; }

//         [Required]
//         [Range(0.01, double.MaxValue, ErrorMessage = "Debit amount must be greater than 0")]
//         public decimal Debit { get; set; }

//         public PaymentInstrumentType InstType { get; set; } = PaymentInstrumentType.NA;

//         [StringLength(100)]
//         public string? InstNo { get; set; }

//         [StringLength(500)]
//         public string? Description { get; set; }

//         [StringLength(50)]
//         public string? PaymentMode { get; set; }

//         // Optional print parameter
//         public bool? Print { get; set; }
//     }

//     public class PaymentEntryDataDTO
//     {
//         public CompanyInfoDTO Company { get; set; } = new();
//         public List<AccountInfoDTO> Accounts { get; set; } = new();
//         public DateInfoDTO Dates { get; set; } = new();
//         public FiscalYearDTO CurrentFiscalYear { get; set; } = new();
//         public string NextPaymentBillNumber { get; set; } = string.Empty;
//         public UserPreferencesDTO UserPreferences { get; set; } = new();
//         public PermissionsDTO Permissions { get; set; } = new();
//         public string CurrentCompanyName { get; set; } = string.Empty;
//     }

//     public class PaymentResponseDTO
//     {
//         public PaymentInfoDTO Payment { get; set; } = new();
//         public PaymentTransactionResponseDTO Transactions { get; set; } = new();
//         public string? PrintUrl { get; set; }
//         public string? RedirectUrl { get; set; }
//     }

//     public class PaymentInfoDTO
//     {
//         public Guid Id { get; set; }
//         public string BillNumber { get; set; } = string.Empty;
//         public DateTime Date { get; set; }
//         public Guid AccountId { get; set; }
//         public decimal Debit { get; set; }
//         public Guid PaymentAccountId { get; set; }
//         public string? Description { get; set; }
//     }

//     public class PaymentTransactionResponseDTO
//     {
//         public TransactionDetailDTO Debit { get; set; } = new();
//         public TransactionDetailDTO Credit { get; set; } = new();
//     }

//     public class TransactionDetailDTO
//     {
//         public Guid Id { get; set; }
//         public Guid AccountId { get; set; }
//         public decimal Amount { get; set; }
//         public decimal Balance { get; set; }
//     }
// }

//----------------------------------------------------------end

using SkyForge.Models.Retailer.PaymentModel;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using SkyForge.Dto.AccountDto;

namespace SkyForge.Dto.RetailerDto.PaymentDto
{
    // Main DTO for creating payment with multiple entries
    public class CreatePaymentDTO
    {
        [Required]
        public DateTime NepaliDate { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [StringLength(500)]
        public string? Description { get; set; }

        public bool? Print { get; set; }

        // List of payment entries
        [Required]
        [MinLength(2, ErrorMessage = "At least 2 entries required (one debit and one credit)")]
        public List<PaymentEntryDTO> Entries { get; set; } = new List<PaymentEntryDTO>();

    }

    // DTO for individual payment entry
    public class PaymentEntryDTO
    {
        [Required]
        public Guid AccountId { get; set; }

        [Required]
        [RegularExpression("Debit|Credit", ErrorMessage = "EntryType must be 'Debit' or 'Credit'")]
        public string EntryType { get; set; } = string.Empty;

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than 0")]
        public decimal Amount { get; set; }

        [StringLength(500)]
        public string? Description { get; set; }

        // Optional: For credit entries only (payment method)
        public PaymentInstrumentType? InstType { get; set; }

        [StringLength(100)]
        public string? BankAcc { get; set; }

        [StringLength(100)]
        public string? InstNo { get; set; }

        [StringLength(50)]
        public string? ReferenceNumber { get; set; }
        public int LineNumber { get; set; }
    }

    // Response DTO
    public class PaymentResponseDTO
    {
        public PaymentInfoDTO Payment { get; set; } = new();
        public List<PaymentEntryInfoDTO> Entries { get; set; } = new();
        public string? PrintUrl { get; set; }
        public string? RedirectUrl { get; set; }
    }

    public class PaymentInfoDTO
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public decimal TotalAmount { get; set; }
        public string? Description { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class PaymentEntryInfoDTO
    {
        public Guid Id { get; set; }
        public Guid AccountId { get; set; }
        public string AccountName { get; set; } = string.Empty;
        public string EntryType { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string? Description { get; set; }
        public string? InstType { get; set; }
        public string? BankAcc { get; set; }
        public string? InstNo { get; set; }
        public string? ReferenceNumber { get; set; }
    }

    // Data DTO for payment entry page
    public class PaymentEntryDataDTO
    {
        public CompanyInfoDTO Company { get; set; } = new();
        public List<AccountInfoDTO> Accounts { get; set; } = new();
        public List<AccountInfoDTO> CashAccounts { get; set; } = new();
        public List<AccountInfoDTO> BankAccounts { get; set; } = new();
        public DateInfoDTO Dates { get; set; } = new();
        public FiscalYearDTO CurrentFiscalYear { get; set; } = new();
        public string NextPaymentBillNumber { get; set; } = string.Empty;
        public UserPreferencesDTO UserPreferences { get; set; } = new();
        public PermissionsDTO Permissions { get; set; } = new();
        public string CurrentCompanyName { get; set; } = string.Empty;
    }

    public class CreatePaymentWithAccountsDTO
    {
        [Required]
        public Guid AccountId { get; set; }  // The account being debited (money source)

        [Required]
        public Guid PaymentAccountId { get; set; }  // The payment account being credited (money destination)

        [Required]
        [Range(0.01, double.MaxValue)]
        public decimal Amount { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [Required]
        public DateTime NepaliDate { get; set; }

        [StringLength(500)]
        public string? Description { get; set; }

        public PaymentInstrumentType? InstType { get; set; }

        [StringLength(100)]
        public string? BankAcc { get; set; }

        [StringLength(100)]
        public string? InstNo { get; set; }

        [StringLength(100)]
        public string? ReferenceNumber { get; set; }
    }

}