using SkyForge.Dto.RetailerDto.TransactionDto;

namespace SkyForge.Services.Retailer.TransactionServices
{
    public interface ITransactionService
    {
        Task<List<TransactionResponseDto>> GetTransactionsAsync(
            Guid itemId,
            Guid accountId,
            string purchaseSalesType,
            Guid companyId,
            Guid fiscalYearId);

        Task<SalesTransactionsResponseDto> GetSalesTransactionsByItemAndAccountAsync(
        Guid itemId,
        Guid accountId,
        Guid companyId,
        Guid fiscalYearId);
    }
}