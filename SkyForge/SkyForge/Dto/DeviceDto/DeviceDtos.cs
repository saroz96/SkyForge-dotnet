namespace SkyForge.Dto.DeviceDto
{
    // Client → Server: register this device
    public class RegisterDeviceRequestDTO
    {
        public required string DeviceFingerprint { get; set; }
        public string? DeviceName { get; set; }
        public string? OperatingSystem { get; set; }
        public string? BrowserName { get; set; }
        public string? BrowserVersion { get; set; }
        public string? ScreenResolution { get; set; }
        public string? TimeZone { get; set; }
        public string? Language { get; set; }
    }

    // Client → Server: verify device on login
    public class VerifyDeviceRequestDTO
    {
        public required string DeviceFingerprint { get; set; }
    }

    // Admin → Server: approve/reject
    public class ApproveDeviceRequestDTO
    {
        public string? Notes { get; set; }
        public int? TrustScore { get; set; }  // Optional override
    }

    public class RejectDeviceRequestDTO
    {
        public required string Reason { get; set; }
    }

    // Server → Client: device list item
    public class DeviceListItemDTO
    {
        public Guid Id { get; set; }
        public string? DeviceName { get; set; }
        public string? OperatingSystem { get; set; }
        public string? BrowserName { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? RegistrationIpAddress { get; set; }
        public string? RegistrationLocation { get; set; }
        public DateTime? LastUsedAt { get; set; }
        public int LoginCount { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? UserName { get; set; }
        public string? UserEmail { get; set; }
        public string? UserRole { get; set; } 
        public string? ApprovedByName { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public string? RejectionReason { get; set; }
    }

    public class RegisterDevicePreLoginDTO
    {
        // Identity proof
        public required string Email { get; set; }
        public required string Password { get; set; }

        // Device info
        public required string DeviceFingerprint { get; set; }
        public string? DeviceName { get; set; }
        public string? OperatingSystem { get; set; }
        public string? BrowserName { get; set; }
        public string? BrowserVersion { get; set; }
        public string? ScreenResolution { get; set; }
        public string? TimeZone { get; set; }
        public string? Language { get; set; }
    }

    // Server → Client: response after register
    public class RegisterDeviceResponseDTO
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public Guid? DeviceId { get; set; }
        public string Status { get; set; } = string.Empty;
        public bool RequiresAdminApproval { get; set; }
        public bool AutoApproved { get; set; }
    }

    // Server → Client: response after verify
    public class VerifyDeviceResponseDTO
    {
        public bool Success { get; set; }
        public bool IsTrusted { get; set; }
        public string Status { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public bool RequiresApproval { get; set; }
        public Guid? DeviceId { get; set; }
    }
}