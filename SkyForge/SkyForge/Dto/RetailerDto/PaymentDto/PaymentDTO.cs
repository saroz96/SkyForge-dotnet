//namespace SkyForge.Dto.RetailerDto.PaymentDto
//{
//    public class PaymentDTO
//    {
//    }
//}

using SkyForge.Models.Retailer.PaymentModel;
using System;
using System.ComponentModel.DataAnnotations;

namespace SkyForge.DTOs.Payment
{
    // Request DTOs
    public class CreatePaymentDto
    {
        [Required]
        public Guid FiscalYearId { get; set; }

        [Required]
        [StringLength(50)]
        public string BillNumber { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [Required]
        public DateTime BillDate { get; set; }

        [Required]
        public Guid AccountId { get; set; }

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Debit amount must be greater than 0")]
        public decimal Debit { get; set; }

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Credit amount must be greater than 0")]
        public decimal Credit { get; set; }

        [Required]
        public Guid PaymentAccountId { get; set; }

        [Required]
        public InstrumentType InstType { get; set; }

        [StringLength(100)]
        public string InstNo { get; set; }

        [Required]
        public Guid UserId { get; set; }

        [StringLength(500)]
        public string Description { get; set; }

        public Guid? AccountGroupId { get; set; }

        [Required]
        public Guid CompanyId { get; set; }

        // Validation method to ensure debit equals credit
        public bool ValidateAmounts(out string errorMessage)
        {
            if (Debit != Credit)
            {
                errorMessage = $"Debit amount ({Debit}) must equal credit amount ({Credit}) for payments";
                return false;
            }

            errorMessage = null;
            return true;
        }

        // Validation for instrument number based on instrument type
        public bool ValidateInstrumentDetails(out string errorMessage)
        {
            if (InstType != InstrumentType.NA && string.IsNullOrWhiteSpace(InstNo))
            {
                errorMessage = $"Instrument number is required for {InstType} payment";
                return false;
            }

            errorMessage = null;
            return true;
        }
    }

    public class UpdatePaymentDto
    {
        [StringLength(50)]
        public string BillNumber { get; set; }

        public DateTime? Date { get; set; }
        public DateTime? BillDate { get; set; }
        public Guid? AccountId { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Debit amount must be positive")]
        public decimal? Debit { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Credit amount must be positive")]
        public decimal? Credit { get; set; }

        public Guid? PaymentAccountId { get; set; }
        public InstrumentType? InstType { get; set; }

        [StringLength(100)]
        public string InstNo { get; set; }

        [StringLength(500)]
        public string Description { get; set; }

        public Guid? AccountGroupId { get; set; }
        public PaymentStatus? Status { get; set; }
        public bool? IsActive { get; set; }
    }

    // Response DTOs
    public class PaymentResponseDto
    {
        public Guid Id { get; set; }
        public Guid FiscalYearId { get; set; }
        public string FiscalYearName { get; set; }
        public string BillNumber { get; set; }
        public DateTime Date { get; set; }
        public DateTime BillDate { get; set; }
        public Guid AccountId { get; set; }
        public string AccountName { get; set; }
        public string AccountCode { get; set; }
        public decimal Debit { get; set; }
        public decimal Credit { get; set; }
        public Guid PaymentAccountId { get; set; }
        public string PaymentAccountName { get; set; }
        public string PaymentAccountCode { get; set; }
        public InstrumentType InstType { get; set; }
        public string InstNo { get; set; }
        public Guid UserId { get; set; }
        public string UserName { get; set; }
        public string Description { get; set; }
        public Guid? AccountGroupId { get; set; }
        public string AccountGroupName { get; set; }
        public Guid CompanyId { get; set; }
        public string CompanyName { get; set; }
        public PaymentStatus Status { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public decimal TotalAmount { get; set; }
    }

    // For listing
    public class PaymentSummaryDto
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; }
        public DateTime Date { get; set; }
        public DateTime BillDate { get; set; }
        public string AccountName { get; set; }
        public decimal Debit { get; set; }
        public decimal Credit { get; set; }
        public string PaymentAccountName { get; set; }
        public InstrumentType InstType { get; set; }
        public string InstNo { get; set; }
        public PaymentStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public string UserName { get; set; }
    }

    // Filter DTO
    public class PaymentFilterDto
    {
        public Guid? CompanyId { get; set; }
        public Guid? FiscalYearId { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public string BillNumber { get; set; }
        public Guid? AccountId { get; set; }
        public Guid? PaymentAccountId { get; set; }
        public InstrumentType? InstType { get; set; }
        public PaymentStatus? Status { get; set; }
        public Guid? UserId { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }

    // Dashboard summary DTO
    public class PaymentDashboardSummaryDto
    {
        public decimal TotalPaymentsToday { get; set; }
        public decimal TotalPaymentsThisMonth { get; set; }
        public int ActivePaymentsCount { get; set; }
        public int CanceledPaymentsCount { get; set; }
    }
}
