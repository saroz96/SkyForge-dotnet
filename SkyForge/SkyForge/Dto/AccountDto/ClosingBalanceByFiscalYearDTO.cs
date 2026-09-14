using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.AccountDto
{
    public class ClosingBalanceByFiscalYearDTO
    {
        public DateTime Date { get; set; } = DateTime.UtcNow;
        public DateTime NepaliDate { get; set; }

        public decimal Amount { get; set; }
        public string Type { get; set; } = "Dr";
        public Guid FiscalYearId { get; set; }
    }

    public class UpdateCLosingBalanceDTO
    {
        [Required]
        [Range(0, double.MaxValue, ErrorMessage = "Amount cannot be negative")]
        public decimal Amount { get; set; }

        [Required]
        [RegularExpression("^(Dr|Cr)$", ErrorMessage = "Type must be 'Dr' or 'Cr'")]
        public string Type { get; set; } = "Dr";
    }
}
