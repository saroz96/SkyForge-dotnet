using SkyForge.Dto.RetailerDto.PaymentDto;
using SkyForge.Models.Retailer.PaymentModel;

namespace SkyForge.Services.Retailer.PaymentServices
{
    public interface IPaymentService
    {
        Task<PaymentFormDataResponseDTO> GetPaymentFormDataAsync(Guid companyId, Guid fiscalYearId, Guid userId);

        Task<string> GetNextBillNumberAsync(Guid companyId, Guid fiscalYearId);
        Task<string> GetCurrentBillNumberAsync(Guid companyId, Guid fiscalYearId);

        Task<Payment> CreatePaymentAsync(CreatePaymentDTO dto, Guid userId, Guid companyId, Guid fiscalYearId);

        Task<PaymentFindsDTO> GetPaymentFindsAsync(Guid companyId, Guid fiscalYearId, Guid userId);

        Task<BillIdResponseDTO> GetPaymentBillIdByNumberAsync(string billNumber, Guid companyId, Guid fiscalYearId);

        Task<PaymentEditDataDTO> GetPaymentEditDataAsync(Guid paymentId, Guid companyId, Guid fiscalYearId, Guid userId);
        Task<Payment> UpdatePaymentAsync(Guid id, UpdatePaymentDTO dto, Guid companyId, Guid fiscalYearId, Guid userId);

        Task<PaymentsRegisterDataDTO> GetPaymentsRegisterAsync(Guid companyId, Guid fiscalYearId, string? fromDate = null, string? toDate = null);

        Task<PaymentEntryDataDTO> GetPaymentEntryDataAsync(Guid companyId, Guid fiscalYearId, Guid userId);
        Task<PaymentPrintDTO> GetPaymentForPrintAsync(Guid id, Guid companyId, Guid userId, Guid fiscalYearId);
    }
}