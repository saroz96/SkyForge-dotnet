// Create new file: SkyForge/Services/AccountServices/IAccountBalanceService.cs
using SkyForge.Dto.AccountDto;
using System;
using System.Threading.Tasks;

namespace SkyForge.Services.AccountServices
{
    public interface IAccountBalanceService
    {
        Task<AccountBalanceDataDTO> CalculateAccountBalanceAsync(Guid accountId, Guid companyId, Guid fiscalYearId);
        Task<AccountBalanceResponseDTO> GetAccountBalanceAsync(Guid accountId, Guid companyId, Guid fiscalYearId);
    }
}