using SkyForge.Models.Retailer.ReceiptModel;
using System;
using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.RetailerDto.ReceiptDto
{
    // Request DTOs
    public class CreateReceiptDto
    {
        [Required]
        [StringLength(50)]
        public string BillNumber { get; set; }

        [Required]
        public Guid AccountId { get; set; }

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Debit amount must be greater than 0")]
        public decimal Debit { get; set; }

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Credit amount must be greater than 0")]
        public decimal Credit { get; set; }

        [Required]
        public Guid ReceiptAccountId { get; set; }

        [Required]
        public InstrumentType InstType { get; set; }

        [StringLength(100)]
        public string BankAcc { get; set; }

        [StringLength(100)]
        public string InstNo { get; set; }

        [Required]
        public Guid UserId { get; set; }

        public Guid? AccountGroupId { get; set; }

        [Required]
        public Guid CompanyId { get; set; }

        [StringLength(500)]
        public string Description { get; set; }

        [Required]
        public Guid FiscalYearId { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [Required]
        public DateTime BillDate { get; set; }

        // Validation method to ensure debit equals credit
        public bool ValidateAmounts(out string errorMessage)
        {
            if (Debit != Credit)
            {
                errorMessage = $"Debit amount ({Debit}) must equal credit amount ({Credit}) for receipts";
                return false;
            }

            errorMessage = null;
            return true;
        }

        // Validation for instrument details
        public bool ValidateInstrumentDetails(out string errorMessage)
        {
            if (InstType != InstrumentType.NA)
            {
                if (string.IsNullOrWhiteSpace(InstNo))
                {
                    errorMessage = $"Instrument number is required for {InstType} receipt";
                    return false;
                }

                if (InstType == InstrumentType.RTGS ||
                    InstType == InstrumentType.Cheque ||
                    InstType == InstrumentType.ConnectIps)
                {
                    if (string.IsNullOrWhiteSpace(BankAcc))
                    {
                        errorMessage = $"Bank account is required for {InstType} receipt";
                        return false;
                    }
                }
            }

            errorMessage = null;
            return true;
        }
    }

    public class UpdateReceiptDto
    {
        [StringLength(50)]
        public string BillNumber { get; set; }

        public Guid? AccountId { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Debit amount must be positive")]
        public decimal? Debit { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Credit amount must be positive")]
        public decimal? Credit { get; set; }

        public Guid? ReceiptAccountId { get; set; }
        public InstrumentType? InstType { get; set; }

        [StringLength(100)]
        public string BankAcc { get; set; }

        [StringLength(100)]
        public string InstNo { get; set; }

        [StringLength(500)]
        public string Description { get; set; }

        public Guid? AccountGroupId { get; set; }
        public ReceiptStatus? Status { get; set; }
        public bool? IsActive { get; set; }

        public DateTime? Date { get; set; }
        public DateTime? BillDate { get; set; }
    }

    // Response DTOs
    public class ReceiptResponseDto
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; }
        public Guid AccountId { get; set; }
        public string AccountName { get; set; }
        public string AccountCode { get; set; }
        public decimal Debit { get; set; }
        public decimal Credit { get; set; }
        public Guid ReceiptAccountId { get; set; }
        public string ReceiptAccountName { get; set; }
        public string ReceiptAccountCode { get; set; }
        public InstrumentType InstType { get; set; }
        public string BankAcc { get; set; }
        public string InstNo { get; set; }
        public Guid UserId { get; set; }
        public string UserName { get; set; }
        public Guid? AccountGroupId { get; set; }
        public string AccountGroupName { get; set; }
        public Guid CompanyId { get; set; }
        public string CompanyName { get; set; }
        public string Description { get; set; }
        public ReceiptStatus Status { get; set; }
        public bool IsActive { get; set; }
        public Guid FiscalYearId { get; set; }
        public string FiscalYearName { get; set; }
        public DateTime Date { get; set; }
        public DateTime BillDate { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public decimal TotalAmount { get; set; }
    }

    // For listing
    public class ReceiptSummaryDto
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; }
        public DateTime Date { get; set; }
        public string AccountName { get; set; }
        public decimal Debit { get; set; }
        public decimal Credit { get; set; }
        public string ReceiptAccountName { get; set; }
        public InstrumentType InstType { get; set; }
        public string InstNo { get; set; }
        public ReceiptStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public string UserName { get; set; }
    }

    // Filter DTO
    public class ReceiptFilterDto
    {
        public Guid? CompanyId { get; set; }
        public Guid? FiscalYearId { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public string BillNumber { get; set; }
        public Guid? AccountId { get; set; }
        public Guid? ReceiptAccountId { get; set; }
        public InstrumentType? InstType { get; set; }
        public ReceiptStatus? Status { get; set; }
        public Guid? UserId { get; set; }
        public Guid? AccountGroupId { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }

    // Dashboard summary DTO
    public class ReceiptDashboardSummaryDto
    {
        public decimal TotalReceiptsToday { get; set; }
        public decimal TotalReceiptsThisMonth { get; set; }
        public int ActiveReceiptsCount { get; set; }
        public int CanceledReceiptsCount { get; set; }
    }

    // Bank/Instrument summary DTO
    public class ReceiptInstrumentSummaryDto
    {
        public InstrumentType InstrumentType { get; set; }
        public string InstrumentTypeName { get; set; }
        public int Count { get; set; }
        public decimal TotalAmount { get; set; }
    }
}