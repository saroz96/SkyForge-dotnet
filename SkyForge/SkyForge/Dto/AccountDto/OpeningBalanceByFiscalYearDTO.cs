using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.AccountDto
{
    public class OpeningBalanceByFiscalYearDTO
    {
        public DateTime Date { get; set; } = DateTime.UtcNow;
        public DateTime NepaliDate { get; set; }
        public decimal Amount { get; set; }
        public string Type { get; set; } = "Dr";
        public Guid FiscalYearId { get; set; }
    }

    public class UpdateOpeningBalanceDTO
    {
        [Required]
        [Range(0, double.MaxValue, ErrorMessage = "Amount cannot be negative")]
        public decimal Amount { get; set; }

        [Required]
        [RegularExpression("^(Dr|Cr)$", ErrorMessage = "Type must be 'Dr' or 'Cr'")]
        public string Type { get; set; } = "Dr";
    }

}
