using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using SkyForge.Dto.AccountDto;
using SkyForge.Models.Retailer.ReceiptModel;

namespace SkyForge.Dto.RetailerDto.ReceiptDto
{
    public class CreateReceiptDTO
    {
        [Required]
        public DateTime NepaliDate { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [StringLength(500)]
        public string? Description { get; set; }

        public bool? Print { get; set; }

        // List of receipt entries
        [Required]
        [MinLength(2, ErrorMessage = "At least 2 entries required (one debit and one credit)")]
        public List<ReceiptEntryDTO> Entries { get; set; } = new List<ReceiptEntryDTO>();
    }

    // DTO for individual receipt entry
    public class ReceiptEntryDTO
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

        // Optional: For debit entries only
        public ReceiptInstrumentType? InstType { get; set; }

        [StringLength(100)]
        public string? BankAcc { get; set; }

        [StringLength(100)]
        public string? InstNo { get; set; }

        [StringLength(50)]
        public string? ReferenceNumber { get; set; }
    }

    // Response DTO
    public class ReceiptResponseDTO
    {
        public ReceiptInfoDTO Receipt { get; set; } = new();
        public List<ReceiptEntryInfoDTO> Entries { get; set; } = new();
        public string? PrintUrl { get; set; }
        public string? RedirectUrl { get; set; }
    }

    public class ReceiptInfoDTO
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public decimal TotalAmount { get; set; }
        public string? Description { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class ReceiptEntryInfoDTO
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
}