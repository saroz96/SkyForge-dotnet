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

}
