using SkyForge.Models.Retailer.PaymentModel;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using SkyForge.Dto.AccountDto;

namespace SkyForge.Dto.RetailerDto.PaymentDto
{
    public class UpdatePaymentDTO
    {
        [Required]
        public DateTime NepaliDate { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [Required]
        public Guid AccountId { get; set; }

        [Required]
        public Guid PaymentAccountId { get; set; }

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
}