using SkyForge.Dto.AccountDto;
using System.ComponentModel.DataAnnotations;
using SkyForge.Dto.RetailerDto;

namespace SkyForge.Dto.RetailerDto.SalesBillDto
{
    public class CreateSalesBillDTO
    {
        public Guid CompanyId { get; set; }

        [StringLength(50)]
        public string? PurchaseSalesType { get; set; }

        [Range(1, int.MaxValue)]
        public int OriginalCopies { get; set; } = 1;

        public Guid UserId { get; set; }

        [StringLength(100)]
        public string BillNumber { get; set; } = string.Empty;

        public Guid? AccountId { get; set; }

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

        public Guid? SettingsId { get; set; }

        public Guid FiscalYearId { get; set; }

        [MinLength(1)]
        public List<SalesBillItemDTO> Items { get; set; } = new();

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

        public string IsVatExempt { get; set; } // "true", "false", or "all"

        // [StringLength(50)]
        // public string? IsVatAll { get; set; }

        [Range(-double.MaxValue, double.MaxValue)]
        public decimal? RoundOffAmount { get; set; }

        [StringLength(50)]
        public string? PaymentMode { get; set; }
        public DateTime NepaliDate { get; set; }
        public DateTime Date { get; set; }

        public DateTime TransactionDateNepali { get; set; }
        public DateTime TransactionDate { get; set; }
    }
}