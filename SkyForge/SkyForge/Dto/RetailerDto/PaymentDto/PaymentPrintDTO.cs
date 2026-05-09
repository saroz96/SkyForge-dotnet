
using System;
using System.Collections.Generic;

namespace SkyForge.Dto.RetailerDto.PaymentDto
{
    public class PaymentPrintDTO
    {
        public CompanyPrintDTO Company { get; set; } = new();
        public FiscalYearDTO? CurrentFiscalYear { get; set; }
        public PaymentPrintPaymentDTO Payment { get; set; } = new();
        public List<PaymentEntryPrintDTO> DebitEntries { get; set; } = new();
        public List<PaymentEntryPrintDTO> CreditEntries { get; set; } = new();
        public string CurrentCompanyName { get; set; } = string.Empty;
        public CompanyPrintInfoDTO CurrentCompany { get; set; } = new();
        public string? NepaliDate { get; set; }
        public DateTime EnglishDate { get; set; }
        public string CompanyDateFormat { get; set; } = string.Empty;
        public UserPrintDTO User { get; set; } = new();
        public bool IsAdminOrSupervisor { get; set; }
    }

    public class PaymentPrintPaymentDTO
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string? NepaliDate { get; set; }
        public decimal TotalAmount { get; set; }
        public string? Description { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public UserPrintDTO? User { get; set; }
    }

    public class PaymentEntryPrintDTO
    {
        public Guid Id { get; set; }
        public Guid AccountId { get; set; }
        public string AccountName { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string? Description { get; set; }
        public string? InstType { get; set; }
        public string? BankAcc { get; set; }
        public string? InstNo { get; set; }
        public string? ReferenceNumber { get; set; }
    }
}