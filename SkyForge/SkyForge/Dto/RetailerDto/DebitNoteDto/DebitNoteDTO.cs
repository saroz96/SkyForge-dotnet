using SkyForge.Dto.RetailerDto;
using SkyForge.Dto.AccountDto;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.RetailerDto.DebitNoteDto
{
    // Form Data Response DTO
    public class DebitNoteFormDataResponseDTO
    {
        public CompanyInfoDTO Company { get; set; } = new();
        public FiscalYearDTO CurrentFiscalYear { get; set; } = new();
        public List<AccountInfoDTO> Accounts { get; set; } = new();
        public string NextBillNumber { get; set; } = string.Empty;
        public string NepaliDate { get; set; } = string.Empty;
        public string CompanyDateFormat { get; set; } = string.Empty;
        public string CurrentCompanyName { get; set; } = string.Empty;
        public string CurrentDate { get; set; } = string.Empty;
        public UserInfoDTO User { get; set; } = new();
        public UserPreferencesDTO? UserPreferences { get; set; }
        public PermissionsDTO? Permissions { get; set; }
        public bool IsAdminOrSupervisor { get; set; }
    }

    // Request DTO for creating debit note
    public class CreateDebitNoteDTO
    {
        [Required]
        public DateTime NepaliDate { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [StringLength(1000)]
        public string? Description { get; set; }

        public bool? Print { get; set; }

        // Unified entries list
        [Required]
        [MinLength(2, ErrorMessage = "At least 2 entries required (one debit and one credit)")]
        public List<DebitNoteEntryDTO> Entries { get; set; } = new List<DebitNoteEntryDTO>();
    }

    // DTO for individual debit note entry
    public class DebitNoteEntryDTO
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

        // Line number for ordering
        public int LineNumber { get; set; }

        [StringLength(100)]
        public string? ReferenceNumber { get; set; }
    }

    // Response DTOs
    public class DebitNoteResponseDTO
    {
        public DebitNoteInfoDTO DebitNote { get; set; } = new();
        public string? PrintUrl { get; set; }
        public string? RedirectUrl { get; set; }
    }

    public class DebitNoteInfoDTO
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public DateTime NepaliDate { get; set; }
        public decimal TotalAmount { get; set; }
        public string? Description { get; set; }
        public string Status { get; set; } = string.Empty;
        public List<DebitNoteEntryResponseDTO> Entries { get; set; } = new();
    }

    public class DebitNoteEntryResponseDTO
    {
        public Guid Id { get; set; }
        public Guid AccountId { get; set; }
        public string AccountName { get; set; } = string.Empty;
        public string EntryType { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string? Description { get; set; }
        public int LineNumber { get; set; }
        public string? ReferenceNumber { get; set; }
    }

    // Register Response DTO
    public class DebitNoteRegisterDataDTO
    {
        public CompanyInfoDTO Company { get; set; } = new();
        public FiscalYearDTO? CurrentFiscalYear { get; set; }
        public List<DebitNoteResponseItemDTO> DebitNotes { get; set; } = new();
        public string? FromDate { get; set; }
        public string? ToDate { get; set; }
        public string CurrentCompanyName { get; set; } = string.Empty;
        public string CompanyDateFormat { get; set; } = "english";
        public string NepaliDate { get; set; } = string.Empty;
        public UserPreferencesDTO? UserPreferences { get; set; }
        public bool IsAdminOrSupervisor { get; set; }
    }

    public class DebitNoteResponseItemDTO
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public DateTime NepaliDate { get; set; }
        public string Description { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public List<string> DebitAccountNames { get; set; } = new();
        public List<string> CreditAccountNames { get; set; } = new();
        public List<decimal> DebitAmounts { get; set; } = new();
        public List<decimal> CreditAmounts { get; set; } = new();
    }

    public class DebitNoteEntryDataDTO
    {
        public CompanyInfoDTO Company { get; set; } = new();
        public List<AccountInfoDTO> Accounts { get; set; } = new();
        public DateInfoDTO Dates { get; set; } = new();
        public FiscalYearDTO CurrentFiscalYear { get; set; } = new();
        public string NextDebitNoteBillNumber { get; set; } = string.Empty;
        public UserPreferencesDTO UserPreferences { get; set; } = new();
        public PermissionsDTO Permissions { get; set; } = new();
        public string CurrentCompanyName { get; set; } = string.Empty;
    }

    // Print DTOs
    public class DebitNotePrintDTO
    {
        public CompanyPrintDTO Company { get; set; } = new();
        public FiscalYearDTO CurrentFiscalYear { get; set; } = new();
        public DebitNotePrintDataDTO DebitNote { get; set; } = new();
        public List<DebitNoteEntryPrintDTO> DebitEntries { get; set; } = new();
        public List<DebitNoteEntryPrintDTO> CreditEntries { get; set; } = new();
        public string CurrentCompanyName { get; set; } = string.Empty;
        public object CurrentCompany { get; set; } = new();
        public string NepaliDate { get; set; } = string.Empty;
        public DateTime EnglishDate { get; set; }
        public string CompanyDateFormat { get; set; } = string.Empty;
        public UserPrintDTO User { get; set; } = new();
        public bool IsAdminOrSupervisor { get; set; }
    }

    public class DebitNotePrintDataDTO
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public DateTime NepaliDate { get; set; }
        public decimal TotalAmount { get; set; }
        public string? Description { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public UserPrintDTO? User { get; set; } = new();
    }

    public class DebitNoteEntryPrintDTO
    {
        public Guid Id { get; set; }
        public Guid AccountId { get; set; }
        public string AccountName { get; set; } = string.Empty;
        public string EntryType { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Description { get; set; } = string.Empty;
        public string ReferenceNumber { get; set; } = string.Empty;
        public int LineNumber { get; set; }
    }

    // Edit DTOs
    public class DebitNoteEditDataDTO
    {
        public CompanyInfoDTO Company { get; set; } = new();
        public DebitNoteEditDTO DebitNote { get; set; } = new();
        public List<DebitNoteEntryEditDTO> Entries { get; set; } = new();
        public List<AccountInfoDTO> Accounts { get; set; } = new();
        public FiscalYearDTO CurrentFiscalYear { get; set; } = new();
        public string NepaliDate { get; set; } = string.Empty;
        public string CompanyDateFormat { get; set; } = string.Empty;
        public string CurrentCompanyName { get; set; } = string.Empty;
        public UserEditInfoDTO User { get; set; } = new();
        public DateTime CurrentDate { get; set; }
        public bool IsAdminOrSupervisor { get; set; }
    }

    public class DebitNoteEditDTO
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public DateTime NepaliDate { get; set; }
        public decimal TotalAmount { get; set; }
        public string Description { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string UserEmail { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class DebitNoteEntryEditDTO
    {
        public Guid Id { get; set; }
        public Guid AccountId { get; set; }
        public string AccountName { get; set; } = string.Empty;
        public string EntryType { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string? Description { get; set; }
        public int LineNumber { get; set; }
        public string? ReferenceNumber { get; set; }
    }

    // Update DTO
    public class UpdateDebitNoteDTO
    {
        [Required]
        public DateTime NepaliDate { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [StringLength(1000)]
        public string? Description { get; set; }

        public bool? Print { get; set; }

        // Unified entries list
        [Required]
        [MinLength(2, ErrorMessage = "At least 2 entries required (one debit and one credit)")]
        public List<UpdateDebitNoteEntryDTO> Entries { get; set; } = new List<UpdateDebitNoteEntryDTO>();
    }

    public class UpdateDebitNoteEntryDTO
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

        // Line number for ordering
        public int LineNumber { get; set; }

        [StringLength(100)]
        public string? ReferenceNumber { get; set; }
    }

    public class UpdateDebitNoteResponseDTO
    {
        public DebitNoteInfoDTO DebitNote { get; set; } = new();
        public List<DebitNoteEntryResponseDTO> Entries { get; set; } = new();
        public string? PrintUrl { get; set; }
        public string? RedirectUrl { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    // Helper DTOs
    public class BillIdResponseDTO
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; } = string.Empty;
    }

    public class DebitNoteFindsDTO
    {
        public CompanyInfoDTO Company { get; set; } = new();
        public string BillNumber { get; set; } = string.Empty;
        public FiscalYearDTO CurrentFiscalYear { get; set; } = new();
        public string CompanyDateFormat { get; set; } = string.Empty;
        public string CurrentCompanyName { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;
        public UserInfoDTO User { get; set; } = new();
        public string Theme { get; set; } = string.Empty;
        public bool IsAdminOrSupervisor { get; set; }
    }

    // Helper DTOs (reused from above)
    public class UserEditInfoDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public bool IsAdmin { get; set; }
        public string Role { get; set; } = string.Empty;
        public UserPreferencesDTO Preferences { get; set; } = new();
    }
}