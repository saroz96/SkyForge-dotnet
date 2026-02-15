namespace SkyForge.Dto.AccountDto
{
    public class OpeningBalanceByFiscalYearDTO
    {
        public DateTime Date { get; set; } = DateTime.UtcNow;
        public decimal Amount { get; set; }
        public string Type { get; set; } = "Dr";
        public Guid FiscalYearId { get; set; }
    }

}
