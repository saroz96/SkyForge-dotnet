using SkyForge.Models.Retailer.CreditNoteModel;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.RetailerDto.CreditNoteDto
{
    // Request DTOs
    public class CreateCreditNoteDto
    {
        [StringLength(50)]
        public string BillNumber { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [Required]
        public Guid FiscalYearId { get; set; }

        [Required]
        [MinLength(1, ErrorMessage = "At least one debit account is required")]
        public List<CreditNoteDebitEntryDto> DebitAccounts { get; set; }

        [Required]
        [MinLength(1, ErrorMessage = "At least one credit account is required")]
        public List<CreditNoteCreditEntryDto> CreditAccounts { get; set; }

        [StringLength(500)]
        public string Description { get; set; }

        [Required]
        public Guid UserId { get; set; }

        [Required]
        public Guid CompanyId { get; set; }

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

    public class UpdateCreditNoteDto
    {
        [StringLength(50)]
        public string BillNumber { get; set; }

        public DateTime? Date { get; set; }

        public List<CreditNoteDebitEntryDto> DebitAccounts { get; set; }
        public List<CreditNoteCreditEntryDto> CreditAccounts { get; set; }

        [StringLength(500)]
        public string Description { get; set; }

        public CreditNoteStatus? Status { get; set; }
        public bool? IsActive { get; set; }
    }

    public class CreditNoteDebitEntryDto
    {
        [Required]
        public Guid AccountId { get; set; }

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Debit amount must be greater than 0")]
        public decimal Debit { get; set; }
    }

    public class CreditNoteCreditEntryDto
    {
        [Required]
        public Guid AccountId { get; set; }

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Credit amount must be greater than 0")]
        public decimal Credit { get; set; }
    }

    // Response DTOs
    public class CreditNoteResponseDto
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; }
        public DateTime Date { get; set; }
        public Guid FiscalYearId { get; set; }
        public string FiscalYearName { get; set; }
        public List<CreditNoteDebitEntryResponseDto> DebitAccounts { get; set; }
        public List<CreditNoteCreditEntryResponseDto> CreditAccounts { get; set; }
        public string Description { get; set; }
        public Guid UserId { get; set; }
        public string UserName { get; set; }
        public Guid CompanyId { get; set; }
        public string CompanyName { get; set; }
        public CreditNoteStatus Status { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public decimal TotalDebit { get; set; }
        public decimal TotalCredit { get; set; }
    }

    public class CreditNoteDebitEntryResponseDto
    {
        public Guid Id { get; set; }
        public Guid AccountId { get; set; }
        public string AccountCode { get; set; }
        public string AccountName { get; set; }
        public decimal Debit { get; set; }
    }

    public class CreditNoteCreditEntryResponseDto
    {
        public Guid Id { get; set; }
        public Guid AccountId { get; set; }
        public string AccountCode { get; set; }
        public string AccountName { get; set; }
        public decimal Credit { get; set; }
    }

    // For listing
    public class CreditNoteSummaryDto
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; }
        public DateTime Date { get; set; }
        public string Description { get; set; }
        public decimal TotalAmount { get; set; }
        public CreditNoteStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public string UserName { get; set; }
    }

    // Filter DTO
    public class CreditNoteFilterDto
    {
        public Guid? CompanyId { get; set; }
        public Guid? FiscalYearId { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public string BillNumber { get; set; }
        public CreditNoteStatus? Status { get; set; }
        public Guid? AccountId { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }
}
