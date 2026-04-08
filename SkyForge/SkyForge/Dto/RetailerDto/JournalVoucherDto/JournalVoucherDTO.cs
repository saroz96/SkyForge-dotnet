using SkyForge.Dto.RetailerDto;
using SkyForge.Dto.AccountDto;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.RetailerDto.JournalVoucherDto
{
    public class JournalVoucherFormDataResponseDTO
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

    // Request DTO for creating journal voucher (like Payment)
    public class CreateJournalVoucherDTO
    {
        [Required]
        public DateTime NepaliDate { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [StringLength(1000)]
        public string? Description { get; set; }

        public bool? Print { get; set; }

        // Unified entries list (like Payment's Entries)
        [Required]
        [MinLength(2, ErrorMessage = "At least 2 entries required (one debit and one credit)")]
        public List<JournalEntryDTO> Entries { get; set; } = new List<JournalEntryDTO>();
    }

    // DTO for individual journal entry (like PaymentEntry)
    public class JournalEntryDTO
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
    public class JournalVoucherResponseDTO
    {
        public JournalVoucherInfoDTO JournalVoucher { get; set; } = new();
        public string? PrintUrl { get; set; }
        public string? RedirectUrl { get; set; }
    }

    public class JournalVoucherInfoDTO
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public DateTime NepaliDate { get; set; }
        public decimal TotalAmount { get; set; }
        public string? Description { get; set; }
        public string Status { get; set; } = string.Empty;
        public List<JournalEntryResponseDTO> Entries { get; set; } = new();
    }

    public class JournalEntryResponseDTO
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
    public class JournalVoucherRegisterDataDTO
    {
        public CompanyInfoDTO Company { get; set; } = new();
        public FiscalYearDTO? CurrentFiscalYear { get; set; }
        public List<JournalVoucherResponseItemDTO> JournalVouchers { get; set; } = new();
        public string? FromDate { get; set; }
        public string? ToDate { get; set; }
        public string CurrentCompanyName { get; set; } = string.Empty;
        public string CompanyDateFormat { get; set; } = "english";
        public string NepaliDate { get; set; } = string.Empty;
        public UserPreferencesDTO? UserPreferences { get; set; }
        public bool IsAdminOrSupervisor { get; set; }
    }

    public class JournalVoucherResponseItemDTO
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

    public class JournalVoucherEntryDataDTO
    {
        public CompanyInfoDTO Company { get; set; } = new();
        public List<AccountInfoDTO> Accounts { get; set; } = new();
        public DateInfoDTO Dates { get; set; } = new();
        public FiscalYearDTO CurrentFiscalYear { get; set; } = new();
        public string NextJournalBillNumber { get; set; } = string.Empty;
        public UserPreferencesDTO UserPreferences { get; set; } = new();
        public PermissionsDTO Permissions { get; set; } = new();
        public string CurrentCompanyName { get; set; } = string.Empty;
    }

    // Print DTOs
    public class JournalVoucherPrintDTO
    {
        public CompanyPrintDTO Company { get; set; } = new();
        public FiscalYearDTO CurrentFiscalYear { get; set; } = new();
        public JournalVoucherPrintDataDTO JournalVoucher { get; set; } = new();
        public List<JournalEntryPrintDTO> DebitEntries { get; set; } = new();
        public List<JournalEntryPrintDTO> CreditEntries { get; set; } = new();
        public string CurrentCompanyName { get; set; } = string.Empty;
        public object CurrentCompany { get; set; } = new();
        public string NepaliDate { get; set; } = string.Empty;
        public DateTime EnglishDate { get; set; }
        public string CompanyDateFormat { get; set; } = string.Empty;
        public UserPrintDTO User { get; set; } = new();
        public bool IsAdminOrSupervisor { get; set; }
    }

    public class JournalVoucherPrintDataDTO
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

    public class JournalEntryPrintDTO
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
    public class JournalVoucherEditDataDTO
    {
        public CompanyInfoDTO Company { get; set; } = new();
        public JournalVoucherEditDTO JournalVoucher { get; set; } = new();
        public List<JournalEntryEditDTO> Entries { get; set; } = new();
        public List<AccountInfoDTO> Accounts { get; set; } = new();
        public FiscalYearDTO CurrentFiscalYear { get; set; } = new();
        public string NepaliDate { get; set; } = string.Empty;
        public string CompanyDateFormat { get; set; } = string.Empty;
        public string CurrentCompanyName { get; set; } = string.Empty;
        public UserEditInfoDTO User { get; set; } = new();
        public DateTime CurrentDate { get; set; }
        public bool IsAdminOrSupervisor { get; set; }
    }

    public class JournalVoucherEditDTO
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

    public class JournalEntryEditDTO
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
    public class UpdateJournalVoucherDTO
    {
        [Required]
        public DateTime NepaliDate { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [StringLength(1000)]
        public string? Description { get; set; }

        public bool? Print { get; set; }

        // Unified entries list (like Payment's Entries)
        [Required]
        [MinLength(2, ErrorMessage = "At least 2 entries required (one debit and one credit)")]
        public List<UpdateJournalEntryDTO> Entries { get; set; } = new List<UpdateJournalEntryDTO>();
    }

    public class UpdateJournalEntryDTO
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

    public class UpdateJournalVoucherResponseDTO
    {
        public JournalVoucherInfoDTO JournalVoucher { get; set; } = new();
        public List<JournalEntryResponseDTO> Entries { get; set; } = new();
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

    public class JournalVoucherFindsDTO
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