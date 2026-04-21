namespace SkyForge.Dto.RetailerDto.SalesReturnDto
{
    public class SalesReturnVatReportDTO
    {
        public CompanyInfoDTO Company { get; set; }
        public FiscalYearDTO CurrentFiscalYear { get; set; }
        public List<SalesReturnVatEntryDTO> SalesReturnVatReport { get; set; } = new List<SalesReturnVatEntryDTO>();
        public string CompanyDateFormat { get; set; }
        public string NepaliDate { get; set; }
        public CompanyInfoDTO CurrentCompany { get; set; }
        public string FromDate { get; set; }
        public string ToDate { get; set; }
        public string CurrentCompanyName { get; set; }
        public UserInfoDTO User { get; set; }
        public string Theme { get; set; }
        public bool IsAdminOrSupervisor { get; set; }
    }

    public class SalesReturnVatEntryDTO
    {
        public string BillNumber { get; set; }
        public DateTime Date { get; set; }
        public DateTime NepaliDate { get; set; }
        public string AccountName { get; set; }
        public string PanNumber { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal NonVatSalesReturn { get; set; }
        public decimal TaxableAmount { get; set; }
        public decimal VatAmount { get; set; }
        public bool IsCash { get; set; }
    }
}