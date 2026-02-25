using System.ComponentModel.DataAnnotations;
using SkyForge.Dto.AccountDto;

namespace SkyForge.Dto.RetailerDto.SalesQuotationDto
{
    public class CreateSalesQuotationDTO
    {
        [Required]
        public Guid? AccountId { get; set; }

        [Required]
        [MinLength(1)]
        public List<SalesQuotationItemDTO> Items { get; set; } = new();

        public DateTime TransactionDate { get; set; }
        public DateTime TransactionDateNepali { get; set; }
        public DateTime Date { get; set; }
        public DateTime NepaliDate { get; set; }

        public string? IsVatExempt { get; set; } // Can be "true", "false", or "all"
        [Required]
        [StringLength(50)]
        public string? PaymentMode { get; set; }

        [StringLength(500)]
        public string? Description { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? SubTotal { get; set; }
        [Range(0, double.MaxValue)]
        public decimal? NonVatSales { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? TaxableAmount { get; set; }

        [Range(0, 100)]
        public decimal? DiscountPercentage { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? DiscountAmount { get; set; }

        [Range(0, 100)]
        public decimal VatPercentage { get; set; } = 13;

        [Range(0, double.MaxValue)]
        public decimal? VatAmount { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? TotalAmount { get; set; }



        public decimal? RoundOffAmount { get; set; }
        public Guid? SettingsId { get; set; }
    }

    public class SalesQuotationItemDTO
    {
        [Required]
        public Guid ItemId { get; set; }

        [Required]
        public Guid UnitId { get; set; }

        [Required]
        [Range(0.001, double.MaxValue)]
        public decimal Quantity { get; set; }

        [Required]
        [Range(0, double.MaxValue)]
        public decimal Price { get; set; }

        [StringLength(500)]
        public string? Description { get; set; }
    }

    public class SalesQuotationResponseDataDTO
    {
        public QuotationInfoDTO Quotation { get; set; } = new();
        public string? PrintUrl { get; set; }
        public bool? Print { get; set; }
    }

    public class QuotationInfoDTO
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        public Guid? AccountId { get; set; }
        public string? AccountName { get; set; }
        public List<QuotationItemInfoDTO> Items { get; set; } = new();
        public decimal SubTotal { get; set; }
        public decimal DiscountPercentage { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal TaxableAmount { get; set; }
        public decimal VatAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal RoundOffAmount { get; set; }
        public string? PaymentMode { get; set; }
        public string? Description { get; set; }
        public DateTime TransactionDate { get; set; }
        public DateTime Date { get; set; }
    }

    public class QuotationItemInfoDTO
    {
        public Guid ItemId { get; set; }
        public string? ItemName { get; set; }
        public decimal Quantity { get; set; }
        public decimal Price { get; set; }
        public Guid UnitId { get; set; }
        public string? UnitName { get; set; }
        public string VatStatus { get; set; } = string.Empty;
        public string? Description { get; set; }
    }
}

