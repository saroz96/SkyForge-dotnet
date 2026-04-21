using SkyForge.Dto.RetailerDto;

namespace SkyForge.Services.Retailer.ProfitLossServices
{
    public interface IProfitLossService
    {
        Task<InvoiceWiseProfitLossDataDto> GetInvoiceWiseProfitLossAsync(
            Guid companyId,
            Guid fiscalYearId,
            DateTime? fromDate,
            DateTime? toDate,
            string? billNumber);
    }
}