using SkyForge.Dto.RetailerDto.SalesBillDto;
using System.ComponentModel.DataAnnotations;

namespace SkyForge.Models.Dto.RetailerDto.SalesBillDto
{
    public class CreateSalesBillDTO
    {
        [Required]
        public Guid CompanyId { get; set; }

        [Required]
        [StringLength(50)]
        public string PurchaseSalesType { get; set; } = string.Empty;

        public int OriginalCopies { get; set; } = 1;

        [Required]
        public Guid UserId { get; set; }

        [Required]
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

        [Required]
        public Guid FiscalYearId { get; set; }

        [Required]
        public List<SalesBillItemDTO> Items { get; set; } = new();

        [Range(0, 100)]
        public decimal DiscountPercentage { get; set; } = 0;

        [Range(0, double.MaxValue)]
        public decimal DiscountAmount { get; set; } = 0;

        [Range(0, 100)]
        public decimal VatPercentage { get; set; } = 13;

        [StringLength(50)]
        public string? PaymentMode { get; set; }

        public DateTime? Date { get; set; }

        public DateTime? TransactionDate { get; set; }

        public bool IsVatExempt { get; set; } = false;

        [StringLength(50)]
        public string? IsVatAll { get; set; }
    }
}
