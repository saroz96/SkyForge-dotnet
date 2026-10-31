using SkyForge.Dto.DeviceDto;
using SkyForge.Models.UserModel;

namespace SkyForge.Services.DeviceServices
{
    public interface IDeviceVerificationService
    {
        // Client-side
        Task<RegisterDeviceResponseDTO> RegisterDeviceAsync(Guid userId, RegisterDeviceRequestDTO request, string? ipAddress, string? userAgent);
        Task<VerifyDeviceResponseDTO> VerifyDeviceAsync(Guid userId, string deviceFingerprint, string? ipAddress, string? userAgent);
        Task<List<DeviceListItemDTO>> GetUserDevicesAsync(Guid userId);
        Task<bool> RevokeOwnDeviceAsync(Guid userId, Guid deviceId);

        // Admin-side
        Task<List<DeviceListItemDTO>> GetPendingDevicesAsync(Guid? companyId = null);
        Task<List<DeviceListItemDTO>> GetAllDevicesAsync(Guid? companyId = null, DeviceStatus? status = null);
        Task<bool> ApproveDeviceAsync(Guid deviceId, Guid adminId, ApproveDeviceRequestDTO request);
        Task<bool> RejectDeviceAsync(Guid deviceId, Guid adminId, RejectDeviceRequestDTO request);
        Task<bool> RevokeDeviceAsync(Guid deviceId, Guid adminId, string reason);
        Task<bool> DeleteDeviceAsync(Guid deviceId, Guid adminId);
        Task<bool> BlockDeviceAsync(Guid deviceId, Guid adminId, string reason);

        // Helpers
        Task RecordAuditAsync(Guid? deviceId, Guid? userId, string action, string? ipAddress, string? userAgent, string? details = null);
        Task<bool> IsDeviceTrustedAsync(Guid userId, string deviceFingerprint);

        /// <summary>
        /// Returns devices whose OWNER (user) belongs to the given company.
        /// Excludes system-admin users (role = "Administrator").
        /// This is the correct "user-scoped" query — filters by user membership,
        /// not by device-to-company scope.
        /// </summary>
        Task<List<DeviceListItemDTO>> GetDevicesForCompanyUsersAsync(
            Guid companyId,
            DeviceStatus? status = null,
            bool excludeSystemAdmins = true);
    }
}