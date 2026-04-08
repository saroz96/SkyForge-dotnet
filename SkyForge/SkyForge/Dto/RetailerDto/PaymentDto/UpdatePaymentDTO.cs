using SkyForge.Models.Retailer.PaymentModel;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.RetailerDto.PaymentDto
{
    // DTO for updating payment with multiple entries
    public class UpdatePaymentDTO
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

        // List of payment entries
        [Required]
        [MinLength(2, ErrorMessage = "At least 2 entries required (one debit and one credit)")]
        public List<UpdatePaymentEntryDTO> Entries { get; set; } = new List<UpdatePaymentEntryDTO>();
    }

    // DTO for individual payment entry in update
    public class UpdatePaymentEntryDTO
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

        // Optional: For credit entries only (payment method)
        public PaymentInstrumentType? InstType { get; set; }

        [StringLength(100)]
        public string? BankAcc { get; set; }

        [StringLength(100)]
        public string? InstNo { get; set; }

        [StringLength(50)]
        public string? ReferenceNumber { get; set; }
    }

    // DTO for displaying payment edit info
    public class PaymentEditInfoDTO
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

    // DTO for displaying payment entry edit info
    public class PaymentEntryEditDTO
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

    // Response DTO for update
    public class UpdatePaymentResponseDTO
    {
        public PaymentInfoDTO Payment { get; set; } = new();
        public List<PaymentEntryInfoDTO> Entries { get; set; } = new();
        public string? PrintUrl { get; set; }
        public string? RedirectUrl { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}