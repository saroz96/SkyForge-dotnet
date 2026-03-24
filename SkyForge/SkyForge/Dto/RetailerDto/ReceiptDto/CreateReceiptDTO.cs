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

        [Required]
        public Guid ReceiptAccountId { get; set; }

        [Required]
        public Guid AccountId { get; set; }

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Credit amount must be greater than 0")]
        public decimal Credit { get; set; }

        public ReceiptInstrumentType InstType { get; set; } = ReceiptInstrumentType.NA;

        [StringLength(100)]
        public string? InstNo { get; set; }

        [StringLength(100)]
        public string? BankAcc { get; set; }

        [StringLength(500)]
        public string? Description { get; set; }

        [StringLength(50)]
        public string? PaymentMode { get; set; }

        public bool? Print { get; set; }
    }

    public class ReceiptResponseDTO
    {
        public ReceiptInfoDTO Receipt { get; set; } = new();
        public ReceiptTransactionResponseDTO Transactions { get; set; } = new();
        public string? PrintUrl { get; set; }
        public string? RedirectUrl { get; set; }
    }

    public class ReceiptInfoDTO
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public Guid AccountId { get; set; }
        public decimal Credit { get; set; }
        public Guid ReceiptAccountId { get; set; }
        public string? Description { get; set; }
        // public InstrumentType InstType { get; set; }
        public string? InstNo { get; set; }
        public string? BankAcc { get; set; }
    }

    public class ReceiptTransactionResponseDTO
    {
        public TransactionDetailDTO Credit { get; set; } = new();
        public TransactionDetailDTO Debit { get; set; } = new();
    }

    public class TransactionDetailDTO
    {
        public Guid Id { get; set; }
        public Guid AccountId { get; set; }
        public decimal Amount { get; set; }
        public decimal Balance { get; set; }
    }
}