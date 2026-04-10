// Services/Retailer/StatementServices/IStatementService.cs
using SkyForge.Dto.RetailerDto.TransactionDto;

namespace SkyForge.Services.Retailer.StatementServices
{
    public interface IStatementService
    {
        Task<StatementResponseDTO> GetStatementAsync(
            Guid companyId, 
            Guid fiscalYearId, 
            Guid userId, 
            StatementRequestDTO request);
    }
}