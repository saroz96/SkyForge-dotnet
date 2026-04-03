// using SkyForge.Models.Retailer.ReceiptModel;
// using System;
// using System.ComponentModel.DataAnnotations;

// namespace SkyForge.Dto.RetailerDto.ReceiptDto
// {
//     public class UpdateReceiptDTO
//     {
//         [Required]
//         public DateTime NepaliDate { get; set; }

//         [Required]
//         public DateTime Date { get; set; }

//         [Required]
//         public Guid AccountId { get; set; }

//         [Required]
//         public Guid ReceiptAccountId { get; set; }

//         [Required]
//         [Range(0.01, double.MaxValue, ErrorMessage = "Credit amount must be greater than 0")]
//         public decimal Credit { get; set; }

//         public ReceiptInstrumentType InstType { get; set; } = ReceiptInstrumentType.NA;

//         [StringLength(100)]
//         public string? InstNo { get; set; }

//         [StringLength(100)]
//         public string? BankAcc { get; set; }

//         [StringLength(500)]
//         public string? Description { get; set; }

//         [StringLength(50)]
//         public string? PaymentMode { get; set; }

//         // Optional print parameter
//         public bool? Print { get; set; }
//     }
// }

//--------------------------------------------------------------end

using SkyForge.Models.Retailer.ReceiptModel;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.RetailerDto.ReceiptDto
{
    // DTO for updating receipt with multiple entries
    public class UpdateReceiptDTO
    {
        [Required]
        public DateTime NepaliDate { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [StringLength(500)]
        public string? Description { get; set; }

        [StringLength(50)]
        public string? PaymentMode { get; set; }

        public bool? Print { get; set; }

        // List of receipt entries
        [Required]
        [MinLength(2, ErrorMessage = "At least 2 entries required (one debit and one credit)")]
        public List<UpdateReceiptEntryDTO> Entries { get; set; } = new List<UpdateReceiptEntryDTO>();
    }

    // DTO for individual receipt entry in update
    public class UpdateReceiptEntryDTO
    {
        public Guid? Id { get; set; } // Optional: If null, it's a new entry; if exists, update existing

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

        // Optional: For debit entries only
        public ReceiptInstrumentType? InstType { get; set; }

        [StringLength(100)]
        public string? BankAcc { get; set; }

        [StringLength(100)]
        public string? InstNo { get; set; }

        [StringLength(50)]
        public string? ReferenceNumber { get; set; }
    }

    public class ReceiptEditInfoDTO
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

    public class ReceiptEntryEditDTO
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

    public class AccountSelectDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Code { get; set; }
        public string? AccountType { get; set; }
    }

    public class CompanyEditInfoDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? Phone { get; set; }
        public string? Pan { get; set; }
        public string? RenewalDate { get; set; }
        public string DateFormat { get; set; } = string.Empty;
        public bool VatEnabled { get; set; }
    }
}