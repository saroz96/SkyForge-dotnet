using SkyForge.Dto.AccountDto;
using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.RetailerDto.SalesBillDto
{
    // DTO for UpdateSalesBill endpoint
    public class UpdateSalesBillDTO
    {

        public Guid AccountId { get; set; }
        [StringLength(255)]
        public string? CashAccount { get; set; }

        [StringLength(500)]
        public string? CashAccountAddress { get; set; }

        [StringLength(50)]
        public string? CashAccountPan { get; set; }

        [EmailAddress]
        [StringLength(255)]
        public string? CashAccountEmail { get; set; }

        [Phone]
        [StringLength(20)]
        public string? CashAccountPhone { get; set; }
        public List<UpdateSalesBillItemDTO> Items { get; set; }
        public decimal? VatPercentage { get; set; }

        public DateTime NepaliDate { get; set; }
        public DateTime Date { get; set; }

        public DateTime TransactionDateNepali { get; set; }
        public DateTime TransactionDate { get; set; }
        public string IsVatExempt { get; set; } // "true", "false", or "all"
        public decimal? DiscountPercentage { get; set; }
        public decimal? DiscountAmount { get; set; }
        public string PaymentMode { get; set; }
        public decimal? RoundOffAmount { get; set; }
        public decimal? SubTotal { get; set; }
        public decimal? TaxableAmount { get; set; }
        public decimal? NonTaxableAmount { get; set; }
        public decimal? VatAmount { get; set; }
        public decimal? TotalAmount { get; set; }
    }

    public class UpdateSalesBillItemDTO
    {
        public Guid? Id { get; set; } // For identifying existing items

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

        [Range(0, double.MaxValue)]
        public decimal? PuPrice { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? NetPuPrice { get; set; }

        [Range(0, 100)]
        public decimal DiscountPercentagePerItem { get; set; } = 0;

        [Range(0, double.MaxValue)]
        public decimal DiscountAmountPerItem { get; set; } = 0;

        [Range(0, double.MaxValue)]
        public decimal NetPrice { get; set; } = 0;

        [Range(0, double.MaxValue)]
        public decimal? Mrp { get; set; }

        [StringLength(100)]
        public string? BatchNumber { get; set; }

        public DateOnly? ExpiryDate { get; set; }

        [StringLength(100)]
        public string? UniqueUuid { get; set; }

        public Guid? PurchaseBillId { get; set; }
    }
}