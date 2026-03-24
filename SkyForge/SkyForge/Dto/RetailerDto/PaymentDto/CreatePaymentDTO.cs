using SkyForge.Models.Retailer.PaymentModel;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using SkyForge.Dto.AccountDto;


namespace SkyForge.Dto.RetailerDto.PaymentDto
{
    public class CreatePaymentDTO
    {
        public DateTime NepaliDate { get; set; }
        public DateTime Date { get; set; }
        [Required]
        public Guid PaymentAccountId { get; set; }

        [Required]
        public Guid AccountId { get; set; }

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Debit amount must be greater than 0")]
        public decimal Debit { get; set; }

        public PaymentInstrumentType InstType { get; set; } = PaymentInstrumentType.NA;

        [StringLength(100)]
        public string? InstNo { get; set; }

        [StringLength(500)]
        public string? Description { get; set; }

        [StringLength(50)]
        public string? PaymentMode { get; set; }

        // Optional print parameter
        public bool? Print { get; set; }
    }

    public class PaymentEntryDataDTO
    {
        public CompanyInfoDTO Company { get; set; } = new();
        public List<AccountInfoDTO> Accounts { get; set; } = new();
        public DateInfoDTO Dates { get; set; } = new();
        public FiscalYearDTO CurrentFiscalYear { get; set; } = new();
        public string NextPaymentBillNumber { get; set; } = string.Empty;
        public UserPreferencesDTO UserPreferences { get; set; } = new();
        public PermissionsDTO Permissions { get; set; } = new();
        public string CurrentCompanyName { get; set; } = string.Empty;
    }

    public class PaymentResponseDTO
    {
        public PaymentInfoDTO Payment { get; set; } = new();
        public PaymentTransactionResponseDTO Transactions { get; set; } = new();
        public string? PrintUrl { get; set; }
        public string? RedirectUrl { get; set; }
    }

    public class PaymentInfoDTO
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public Guid AccountId { get; set; }
        public decimal Debit { get; set; }
        public Guid PaymentAccountId { get; set; }
        public string? Description { get; set; }
    }

    public class PaymentTransactionResponseDTO
    {
        public TransactionDetailDTO Debit { get; set; } = new();
        public TransactionDetailDTO Credit { get; set; } = new();
    }

    public class TransactionDetailDTO
    {
        public Guid Id { get; set; }
        public Guid AccountId { get; set; }
        public decimal Amount { get; set; }
        public decimal Balance { get; set; }
    }
}
