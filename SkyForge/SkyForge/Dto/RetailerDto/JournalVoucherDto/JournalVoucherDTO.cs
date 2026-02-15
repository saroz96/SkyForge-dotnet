using SkyForge.Models.Retailer.JournalVoucherModel;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.RetailerDto.JournalVoucherDto
{
    // Request DTOs
    public class CreateJournalVoucherDto
    {
        [StringLength(50)]
        public string BillNumber { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [Required]
        [MinLength(1, ErrorMessage = "At least one debit account is required")]
        public List<DebitEntryDto> DebitAccounts { get; set; }

        [Required]
        [MinLength(1, ErrorMessage = "At least one credit account is required")]
        public List<CreditEntryDto> CreditAccounts { get; set; }

        [StringLength(500)]
        public string Description { get; set; }

        [Required]
        public Guid UserId { get; set; }

        [Required]
        public Guid CompanyId { get; set; }

        [Required]
        public Guid FiscalYearId { get; set; }

        // Validation method to ensure total debits equal total credits
        public bool ValidateTotals(out string errorMessage)
        {
            decimal totalDebits = 0;
            decimal totalCredits = 0;

            foreach (var debit in DebitAccounts)
            {
                totalDebits += debit.Debit;
            }

            foreach (var credit in CreditAccounts)
            {
                totalCredits += credit.Credit;
            }

            if (totalDebits != totalCredits)
            {
                errorMessage = $"Total debits ({totalDebits}) must equal total credits ({totalCredits})";
                return false;
            }

            errorMessage = null;
            return true;
        }
    }

    public class UpdateJournalVoucherDto
    {
        [StringLength(50)]
        public string BillNumber { get; set; }

        public DateTime? Date { get; set; }

        public List<DebitEntryDto> DebitAccounts { get; set; }
        public List<CreditEntryDto> CreditAccounts { get; set; }

        [StringLength(500)]
        public string Description { get; set; }

        public VoucherStatus? Status { get; set; }
        public bool? IsActive { get; set; }
    }

    public class DebitEntryDto
    {
        [Required]
        public Guid AccountId { get; set; }

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Debit amount must be greater than 0")]
        public decimal Debit { get; set; }
    }

    public class CreditEntryDto
    {
        [Required]
        public Guid AccountId { get; set; }

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Credit amount must be greater than 0")]
        public decimal Credit { get; set; }
    }

    // Response DTOs
    public class JournalVoucherResponseDto
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; }
        public DateTime Date { get; set; }
        public List<DebitEntryResponseDto> DebitAccounts { get; set; }
        public List<CreditEntryResponseDto> CreditAccounts { get; set; }
        public string Description { get; set; }
        public Guid UserId { get; set; }
        public string UserName { get; set; } // Assuming User has a Name property
        public Guid CompanyId { get; set; }
        public string CompanyName { get; set; } // Assuming Company has a Name property
        public Guid FiscalYearId { get; set; }
        public string FiscalYearName { get; set; } // Assuming FiscalYear has a Name property
        public VoucherStatus Status { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public decimal TotalDebit { get; set; }
        public decimal TotalCredit { get; set; }
    }

    public class DebitEntryResponseDto
    {
        public Guid Id { get; set; }
        public Guid AccountId { get; set; }
        public string AccountCode { get; set; }
        public string AccountName { get; set; }
        public decimal Debit { get; set; }
    }

    public class CreditEntryResponseDto
    {
        public Guid Id { get; set; }
        public Guid AccountId { get; set; }
        public string AccountCode { get; set; }
        public string AccountName { get; set; }
        public decimal Credit { get; set; }
    }

    // For listing/journal entries
    public class JournalVoucherSummaryDto
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; }
        public DateTime Date { get; set; }
        public string Description { get; set; }
        public decimal TotalAmount { get; set; }
        public VoucherStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
