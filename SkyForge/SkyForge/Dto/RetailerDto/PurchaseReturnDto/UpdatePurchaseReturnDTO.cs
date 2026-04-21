using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.RetailerDto.PurchaseReturnDto
{
    public class UpdatePurchaseReturnDTO
    {
        [Required]
        public Guid AccountId { get; set; }

        [Required]
        public List<UpdatePurchaseReturnItemDTO> Items { get; set; } = new();

        public string? PartyBillNumber { get; set; }

        public bool IsVatExempt { get; set; }

        public string? IsVatAll { get; set; }

        public decimal VatPercentage { get; set; } = 13;

        public decimal SubTotal { get; set; }

        public decimal? DiscountPercentage { get; set; }

        public decimal? DiscountAmount { get; set; }
        public decimal TotalCcAmount { get; set; }

        public decimal NonVatPurchaseReturn { get; set; }

        public decimal TaxableAmount { get; set; }

        public decimal? VatAmount { get; set; }

        public decimal? TotalAmount { get; set; }

        public decimal? RoundOffAmount { get; set; }

        [Required]
        public string PaymentMode { get; set; } = string.Empty;

        // Date fields based on company format
        public DateTime Date { get; set; }  // English date
        public DateTime NepaliDate { get; set; }  // Nepali date
        public DateTime TransactionDate { get; set; }  // English transaction date
        public DateTime TransactionDateNepali { get; set; }  // Nepali transaction date

        public bool Print { get; set; }
    }

    public class UpdatePurchaseReturnItemDTO
    {
        [Required]
        public Guid ItemId { get; set; }

        [Required]
        public Guid UnitId { get; set; }

        public decimal? WsUnit { get; set; }

        [Required]
        public decimal Quantity { get; set; }

        public decimal? Bonus { get; set; }

        public decimal? Price { get; set; }

        [Required]
        public decimal PuPrice { get; set; }

        public decimal? CcPercentage { get; set; }

        public decimal? ItemCcAmount { get; set; }

        public decimal? Mrp { get; set; }

        public decimal? MarginPercentage { get; set; }

        public string? Currency { get; set; }

        public string? BatchNumber { get; set; }

        public DateOnly? ExpiryDate { get; set; }

        public string? VatStatus { get; set; }

        public string? UniqueUuid { get; set; }
    }
}