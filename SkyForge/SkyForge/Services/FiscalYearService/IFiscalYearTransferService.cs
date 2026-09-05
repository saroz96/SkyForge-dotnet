using SkyForge.Dto;
using System;
using System.Threading.Tasks;

namespace SkyForge.Services
{
    public interface IFiscalYearTransferService
    {
        Task<FiscalYearTransferResponseDto> TransferFiscalYearBalancesAsync(FiscalYearTransferRequestDto request, Guid companyId);
        Task<FiscalYearTransferResponseDto> ValidateTransferAsync(Guid sourceFiscalYearId, Guid targetFiscalYearId, Guid companyId);
        Task<object> GetTransferPreviewAsync(Guid sourceFiscalYearId, Guid targetFiscalYearId, Guid companyId);

        Task<CarryForwardCheckResponseDto> CheckCarryForwardNeededAsync(Guid sourceFiscalYearId, Guid targetFiscalYearId, Guid companyId);
        Task<CarryForwardResponseDto> CarryForwardBalancesAsync(CarryForwardRequestDto request, Guid companyId);

        Task<UpdateBalancesResponseDto> GetUpdateableBalancesAsync(Guid sourceFiscalYearId, Guid targetFiscalYearId, Guid companyId, string carryType);
        Task<UpdateBalancesResponseDto> UpdateAndFinalizeBalancesAsync(UpdateBalancesRequestDto request, Guid companyId);
    }
}