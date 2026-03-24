using SkyForge.Models.Retailer.ReceiptModel;
using System;
using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.RetailerDto.ReceiptDto
{
    public class UpdateReceiptDTO
    {
        [Required]
        public DateTime NepaliDate { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [Required]
        public Guid AccountId { get; set; }

        [Required]
        public Guid ReceiptAccountId { get; set; }

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

        // Optional print parameter
        public bool? Print { get; set; }
    }
}