// using Microsoft.EntityFrameworkCore;
// using SkyForge.Data;
// using SkyForge.Dto.DeviceDto;
// using SkyForge.Models.UserModel;

// namespace SkyForge.Services.DeviceServices
// {
//     public class DeviceVerificationService : IDeviceVerificationService
//     {
//         private readonly ApplicationDbContext _context;
//         private readonly ILogger<DeviceVerificationService> _logger;
//         private readonly IConfiguration _configuration;

//         // Max devices per user (configurable)
//         private readonly int _maxDevicesPerUser;

//         public DeviceVerificationService(
//             ApplicationDbContext context,
//             ILogger<DeviceVerificationService> logger,
//             IConfiguration configuration)
//         {
//             _context = context;
//             _logger = logger;
//             _configuration = configuration;
//             _maxDevicesPerUser = int.TryParse(configuration["DeviceVerification:MaxDevicesPerUser"], out var max) ? max : 7;
//         }

//         // ==================== CLIENT SIDE ====================

//         public async Task<RegisterDeviceResponseDTO> RegisterDeviceAsync(
//             Guid userId,
//             RegisterDeviceRequestDTO request,
//             string? ipAddress,
//             string? userAgent)
//         {
//             try
//             {
//                 _logger.LogInformation("=== RegisterDevice Started for User {UserId} ===", userId);

//                 // Check if device already registered for this user
//                 var existing = await _context.UserDevices
//                     .FirstOrDefaultAsync(d => d.UserId == userId && d.DeviceFingerprint == request.DeviceFingerprint);

//                 if (existing != null)
//                 {
//                     // Update last seen info
//                     existing.LastKnownIpAddress = ipAddress;
//                     existing.UpdatedAt = DateTime.UtcNow;
//                     await _context.SaveChangesAsync();

//                     await RecordAuditAsync(existing.Id, userId, "RegisterAttempt_AlreadyExists", ipAddress, userAgent);

//                     return new RegisterDeviceResponseDTO
//                     {
//                         Success = true,
//                         Message = existing.Status == DeviceStatus.Approved
//                             ? "Device already approved."
//                             : "Device already registered. Waiting for admin approval.",
//                         DeviceId = existing.Id,
//                         Status = existing.Status.ToString(),
//                         RequiresAdminApproval = existing.Status == DeviceStatus.Pending,
//                         AutoApproved = existing.Status == DeviceStatus.Approved
//                     };
//                 }

//                 // Check device limit
//                 var userDeviceCount = await _context.UserDevices
//                     .CountAsync(d => d.UserId == userId && d.Status != DeviceStatus.Rejected && d.Status != DeviceStatus.Revoked);

//                 if (userDeviceCount >= _maxDevicesPerUser)
//                 {
//                     await RecordAuditAsync(null, userId, "RegisterAttempt_LimitReached", ipAddress, userAgent);

//                     return new RegisterDeviceResponseDTO
//                     {
//                         Success = false,
//                         Message = $"Device limit reached ({_maxDevicesPerUser}). Please remove an existing device or contact admin.",
//                         RequiresAdminApproval = false,
//                         AutoApproved = false
//                     };
//                 }

//                 // Check if same fingerprint exists for another user (suspicious)
//                 var fingerprintUsedByOther = await _context.UserDevices
//                     .AnyAsync(d => d.DeviceFingerprint == request.DeviceFingerprint && d.UserId != userId);

//                 var device = new UserDevice
//                 {
//                     Id = Guid.NewGuid(),
//                     UserId = userId,
//                     DeviceFingerprint = request.DeviceFingerprint,
//                     DeviceName = request.DeviceName ?? "Unknown Device",
//                     OperatingSystem = request.OperatingSystem,
//                     BrowserName = request.BrowserName,
//                     BrowserVersion = request.BrowserVersion,
//                     ScreenResolution = request.ScreenResolution,
//                     TimeZone = request.TimeZone,
//                     Language = request.Language,
//                     DeviceType = DetectDeviceType(request.OperatingSystem),
//                     RegistrationIpAddress = ipAddress,
//                     LastKnownIpAddress = ipAddress,
//                     Status = DeviceStatus.Pending,
//                     TrustScore = fingerprintUsedByOther ? 10 : 50, // Low trust if reused fingerprint
//                     CreatedAt = DateTime.UtcNow
//                 };

//                 _context.UserDevices.Add(device);
//                 await _context.SaveChangesAsync();

//                 await RecordAuditAsync(device.Id, userId, "Registered", ipAddress, userAgent,
//                     $"Device: {device.DeviceName}, OS: {device.OperatingSystem}");

//                 _logger.LogInformation("Device {DeviceId} registered for user {UserId}, status: Pending", device.Id, userId);

//                 return new RegisterDeviceResponseDTO
//                 {
//                     Success = true,
//                     Message = "Device registered. Waiting for admin approval.",
//                     DeviceId = device.Id,
//                     Status = "Pending",
//                     RequiresAdminApproval = true,
//                     AutoApproved = false
//                 };
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error registering device for user {UserId}", userId);
//                 throw;
//             }
//         }

//         public async Task<VerifyDeviceResponseDTO> VerifyDeviceAsync(
//             Guid userId,
//             string deviceFingerprint,
//             string? ipAddress,
//             string? userAgent)
//         {
//             try
//             {
//                 var device = await _context.UserDevices
//                     .FirstOrDefaultAsync(d => d.UserId == userId && d.DeviceFingerprint == deviceFingerprint);

//                 if (device == null)
//                 {
//                     await RecordAuditAsync(null, userId, "VerifyAttempt_NotRegistered", ipAddress, userAgent,
//                         $"Fingerprint: {deviceFingerprint[..Math.Min(16, deviceFingerprint.Length)]}...");

//                     return new VerifyDeviceResponseDTO
//                     {
//                         Success = false,
//                         IsTrusted = false,
//                         Status = "NotRegistered",
//                         Message = "This device is not registered. Please register it first.",
//                         RequiresApproval = true
//                     };
//                 }

//                 // Update last used
//                 device.LastKnownIpAddress = ipAddress;
//                 device.LastUsedAt = DateTime.UtcNow;
//                 device.LoginCount++;

//                 switch (device.Status)
//                 {
//                     case DeviceStatus.Approved:
//                         device.UpdatedAt = DateTime.UtcNow;
//                         await _context.SaveChangesAsync();

//                         await RecordAuditAsync(device.Id, userId, "VerifySuccess", ipAddress, userAgent);

//                         return new VerifyDeviceResponseDTO
//                         {
//                             Success = true,
//                             IsTrusted = true,
//                             Status = "Approved",
//                             Message = "Device verified successfully.",
//                             RequiresApproval = false,
//                             DeviceId = device.Id
//                         };

//                     case DeviceStatus.Pending:
//                         await _context.SaveChangesAsync();
//                         await RecordAuditAsync(device.Id, userId, "VerifyAttempt_PendingApproval", ipAddress, userAgent);

//                         return new VerifyDeviceResponseDTO
//                         {
//                             Success = false,
//                             IsTrusted = false,
//                             Status = "Pending",
//                             Message = "Device is pending admin approval. Please wait.",
//                             RequiresApproval = true,
//                             DeviceId = device.Id
//                         };

//                     case DeviceStatus.Rejected:
//                         await _context.SaveChangesAsync();
//                         await RecordAuditAsync(device.Id, userId, "VerifyAttempt_Rejected", ipAddress, userAgent);

//                         return new VerifyDeviceResponseDTO
//                         {
//                             Success = false,
//                             IsTrusted = false,
//                             Status = "Rejected",
//                             Message = $"Device was rejected by admin. Reason: {device.RejectionReason ?? "N/A"}",
//                             RequiresApproval = false,
//                             DeviceId = device.Id
//                         };

//                     case DeviceStatus.Revoked:
//                     case DeviceStatus.Blocked:
//                         await _context.SaveChangesAsync();
//                         await RecordAuditAsync(device.Id, userId, $"VerifyAttempt_{device.Status}", ipAddress, userAgent);

//                         return new VerifyDeviceResponseDTO
//                         {
//                             Success = false,
//                             IsTrusted = false,
//                             Status = device.Status.ToString(),
//                             Message = $"Device access has been {device.Status.ToString().ToLower()}. Contact admin.",
//                             RequiresApproval = false,
//                             DeviceId = device.Id
//                         };

//                     default:
//                         return new VerifyDeviceResponseDTO
//                         {
//                             Success = false,
//                             IsTrusted = false,
//                             Status = "Unknown",
//                             Message = "Unknown device status.",
//                             RequiresApproval = true
//                         };
//                 }
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error verifying device for user {UserId}", userId);
//                 throw;
//             }
//         }

//         public async Task<List<DeviceListItemDTO>> GetUserDevicesAsync(Guid userId)
//         {
//             var devices = await _context.UserDevices
//                 .Where(d => d.UserId == userId)
//                 .OrderByDescending(d => d.CreatedAt)
//                 .Select(d => new DeviceListItemDTO
//                 {
//                     Id = d.Id,
//                     DeviceName = d.DeviceName,
//                     OperatingSystem = d.OperatingSystem,
//                     BrowserName = d.BrowserName,
//                     Status = d.Status.ToString(),
//                     RegistrationIpAddress = d.RegistrationIpAddress,
//                     RegistrationLocation = d.RegistrationLocation,
//                     LastUsedAt = d.LastUsedAt,
//                     LoginCount = d.LoginCount,
//                     CreatedAt = d.CreatedAt,
//                     ApprovedAt = d.ApprovedAt,
//                     RejectionReason = d.RejectionReason
//                 })
//                 .ToListAsync();

//             return devices;
//         }

//         public async Task<bool> RevokeOwnDeviceAsync(Guid userId, Guid deviceId)
//         {
//             var device = await _context.UserDevices
//                 .FirstOrDefaultAsync(d => d.Id == deviceId && d.UserId == userId);

//             if (device == null) return false;

//             device.Status = DeviceStatus.Revoked;
//             device.UpdatedAt = DateTime.UtcNow;
//             await _context.SaveChangesAsync();

//             await RecordAuditAsync(device.Id, userId, "ClientRevoked", null, null);

//             return true;
//         }

//         // ==================== ADMIN SIDE ====================

//         public async Task<List<DeviceListItemDTO>> GetPendingDevicesAsync(Guid? companyId = null)
//         {
//             var query = _context.UserDevices
//                 .Include(d => d.User)
//                 .Include(d => d.ApprovedBy)
//                 .Where(d => d.Status == DeviceStatus.Pending);

//             if (companyId.HasValue)
//             {
//                 query = query.Where(d =>
//                     d.User.AccessibleCompanies.Any(c => c.Id == companyId.Value) ||
//                     d.User.OwnedCompanies.Any(c => c.Id == companyId.Value));
//             }

//             return await query
//                 .OrderBy(d => d.CreatedAt)
//                 .Select(d => MapToListItem(d))
//                 .ToListAsync();
//         }

//         public async Task<List<DeviceListItemDTO>> GetAllDevicesAsync(Guid? companyId = null, DeviceStatus? status = null)
//         {
//             var query = _context.UserDevices
//                 .Include(d => d.User)
//                 .Include(d => d.ApprovedBy)
//                 .AsQueryable();

//             if (companyId.HasValue)
//             {
//                 query = query.Where(d =>
//                     d.User.AccessibleCompanies.Any(c => c.Id == companyId.Value) ||
//                     d.User.OwnedCompanies.Any(c => c.Id == companyId.Value));
//             }

//             if (status.HasValue)
//             {
//                 query = query.Where(d => d.Status == status.Value);
//             }

//             return await query
//                 .OrderByDescending(d => d.CreatedAt)
//                 .Select(d => MapToListItem(d))
//                 .ToListAsync();
//         }

//         public async Task<bool> ApproveDeviceAsync(Guid deviceId, Guid adminId, ApproveDeviceRequestDTO request)
//         {
//             var device = await _context.UserDevices
//                 .Include(d => d.User)
//                 .FirstOrDefaultAsync(d => d.Id == deviceId);

//             if (device == null) return false;

//             device.Status = DeviceStatus.Approved;
//             device.ApprovedById = adminId;
//             device.ApprovedAt = DateTime.UtcNow;
//             device.UpdatedAt = DateTime.UtcNow;
//             device.RejectionReason = null;
//             if (!string.IsNullOrWhiteSpace(request.Notes))
//                 device.Notes = request.Notes;
//             if (request.TrustScore.HasValue)
//                 device.TrustScore = Math.Clamp(request.TrustScore.Value, 0, 100);

//             await _context.SaveChangesAsync();

//             await RecordAuditAsync(device.Id, adminId, "Approved", null, null,
//                 $"Approved device for user {device.User.Email}");

//             _logger.LogInformation("Device {DeviceId} approved by admin {AdminId}", deviceId, adminId);
//             return true;
//         }

//         public async Task<bool> RejectDeviceAsync(Guid deviceId, Guid adminId, RejectDeviceRequestDTO request)
//         {
//             var device = await _context.UserDevices
//                 .Include(d => d.User)
//                 .FirstOrDefaultAsync(d => d.Id == deviceId);

//             if (device == null) return false;

//             device.Status = DeviceStatus.Rejected;
//             device.ApprovedById = adminId;
//             device.ApprovedAt = DateTime.UtcNow;
//             device.RejectionReason = request.Reason;
//             device.UpdatedAt = DateTime.UtcNow;

//             await _context.SaveChangesAsync();

//             await RecordAuditAsync(device.Id, adminId, "Rejected", null, null, request.Reason);

//             _logger.LogInformation("Device {DeviceId} rejected by admin {AdminId}", deviceId, adminId);
//             return true;
//         }

//         public async Task<bool> RevokeDeviceAsync(Guid deviceId, Guid adminId, string reason)
//         {
//             var device = await _context.UserDevices.FirstOrDefaultAsync(d => d.Id == deviceId);
//             if (device == null) return false;

//             device.Status = DeviceStatus.Revoked;
//             device.RejectionReason = reason;
//             device.UpdatedAt = DateTime.UtcNow;
//             await _context.SaveChangesAsync();

//             await RecordAuditAsync(device.Id, adminId, "AdminRevoked", null, null, reason);
//             return true;
//         }

//         public async Task<bool> BlockDeviceAsync(Guid deviceId, Guid adminId, string reason)
//         {
//             var device = await _context.UserDevices.FirstOrDefaultAsync(d => d.Id == deviceId);
//             if (device == null) return false;

//             device.Status = DeviceStatus.Blocked;
//             device.RejectionReason = reason;
//             device.UpdatedAt = DateTime.UtcNow;
//             await _context.SaveChangesAsync();

//             await RecordAuditAsync(device.Id, adminId, "Blocked", null, null, reason);
//             return true;
//         }

//         // ==================== HELPERS ====================

//         public async Task RecordAuditAsync(Guid? deviceId, Guid? userId, string action, string? ipAddress, string? userAgent, string? details = null)
//         {
//             try
//             {
//                 _context.DeviceAuditLogs.Add(new DeviceAuditLog
//                 {
//                     Id = Guid.NewGuid(),
//                     DeviceId = deviceId,
//                     UserId = userId,
//                     Action = action,
//                     IpAddress = ipAddress,
//                     UserAgent = userAgent,
//                     Details = details,
//                     CreatedAt = DateTime.UtcNow
//                 });
//                 await _context.SaveChangesAsync();
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Failed to record audit log");
//             }
//         }

//         public async Task<bool> IsDeviceTrustedAsync(Guid userId, string deviceFingerprint)
//         {
//             return await _context.UserDevices
//                 .AnyAsync(d => d.UserId == userId
//                             && d.DeviceFingerprint == deviceFingerprint
//                             && d.Status == DeviceStatus.Approved);
//         }

//         private static DeviceListItemDTO MapToListItem(UserDevice d) => new()
//         {
//             Id = d.Id,
//             DeviceName = d.DeviceName,
//             OperatingSystem = d.OperatingSystem,
//             BrowserName = d.BrowserName,
//             Status = d.Status.ToString(),
//             RegistrationIpAddress = d.RegistrationIpAddress,
//             RegistrationLocation = d.RegistrationLocation,
//             LastUsedAt = d.LastUsedAt,
//             LoginCount = d.LoginCount,
//             CreatedAt = d.CreatedAt,
//             UserName = d.User?.Name,
//             UserEmail = d.User?.Email,
//             ApprovedByName = d.ApprovedBy?.Name,
//             ApprovedAt = d.ApprovedAt,
//             RejectionReason = d.RejectionReason
//         };

//         private static DeviceType DetectDeviceType(string? os)
//         {
//             if (string.IsNullOrEmpty(os)) return DeviceType.Unknown;
//             var lower = os.ToLower();
//             if (lower.Contains("android") || lower.Contains("ios") || lower.Contains("iphone")) return DeviceType.Mobile;
//             if (lower.Contains("ipad") || lower.Contains("tablet")) return DeviceType.Tablet;
//             if (lower.Contains("macbook") || lower.Contains("laptop")) return DeviceType.Laptop;
//             if (lower.Contains("windows") || lower.Contains("mac") || lower.Contains("linux")) return DeviceType.Desktop;
//             return DeviceType.Unknown;
//         }

//         public async Task<List<DeviceListItemDTO>> GetDevicesForCompanyUsersAsync(
//     Guid companyId,
//     DeviceStatus? status = null,
//     bool excludeSystemAdmins = true)
//         {
//             // Get the user IDs that belong to this company (owner OR accessible)
//             var companyUserIds = await _context.Users
//                 .Where(u =>
//                     u.OwnedCompanies.Any(c => c.Id == companyId) ||
//                     u.AccessibleCompanies.Any(c => c.Id == companyId))
//                 .Select(u => u.Id)
//                 .ToListAsync();

//             if (companyUserIds.Count == 0)
//                 return new List<DeviceListItemDTO>();

//             // Now get devices for these users
//             var query = _context.UserDevices
//                 .Include(d => d.User)
//                     .ThenInclude(u => u.UserRoles)
//                         .ThenInclude(ur => ur.Role)
//                 .Include(d => d.ApprovedBy)
//                 .Where(d => companyUserIds.Contains(d.UserId));

//             if (status.HasValue)
//             {
//                 query = query.Where(d => d.Status == status.Value);
//             }

//             // Exclude system admins (role = "Administrator")
//             if (excludeSystemAdmins)
//             {
//                 query = query.Where(d =>
//                     !d.User.UserRoles.Any(ur =>
//                         ur.IsPrimary &&
//                         ur.Role.Name == "Administrator"));
//             }

//             return await query
//                 .OrderByDescending(d => d.CreatedAt)
//                 .Select(d => new DeviceListItemDTO
//                 {
//                     Id = d.Id,
//                     DeviceName = d.DeviceName,
//                     OperatingSystem = d.OperatingSystem,
//                     BrowserName = d.BrowserName,
//                     Status = d.Status.ToString(),
//                     RegistrationIpAddress = d.RegistrationIpAddress,
//                     RegistrationLocation = d.RegistrationLocation,
//                     LastUsedAt = d.LastUsedAt,
//                     LoginCount = d.LoginCount,
//                     CreatedAt = d.CreatedAt,
//                     UserName = d.User != null ? d.User.Name : null,
//                     UserEmail = d.User != null ? d.User.Email : null,
//                     UserRole = d.User != null
//                         ? d.User.UserRoles
//                             .Where(ur => ur.IsPrimary)
//                             .Select(ur => ur.Role.Name)
//                             .FirstOrDefault()
//                         : null,
//                     ApprovedByName = d.ApprovedBy != null ? d.ApprovedBy.Name : null,
//                     ApprovedAt = d.ApprovedAt,
//                     RejectionReason = d.RejectionReason
//                 })
//                 .ToListAsync();
//         }
//     }
// }

//----------------------------------------------------------------end1

using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto.DeviceDto;
using SkyForge.Models.UserModel;

namespace SkyForge.Services.DeviceServices
{
    public class DeviceVerificationService : IDeviceVerificationService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<DeviceVerificationService> _logger;
        private readonly IConfiguration _configuration;

        // Max devices per user (configurable)
        private readonly int _maxDevicesPerUser;

        public DeviceVerificationService(
            ApplicationDbContext context,
            ILogger<DeviceVerificationService> logger,
            IConfiguration configuration)
        {
            _context = context;
            _logger = logger;
            _configuration = configuration;
            _maxDevicesPerUser = int.TryParse(configuration["DeviceVerification:MaxDevicesPerUser"], out var max) ? max : 7;
        }

        // ==================== CLIENT SIDE ====================

        public async Task<RegisterDeviceResponseDTO> RegisterDeviceAsync(
            Guid userId,
            RegisterDeviceRequestDTO request,
            string? ipAddress,
            string? userAgent)
        {
            try
            {
                _logger.LogInformation("=== RegisterDevice Started for User {UserId} ===", userId);

                // ------------------------------------------------------------
                // 1) Exact fingerprint match — idempotent
                // ------------------------------------------------------------
                var existing = await _context.UserDevices
                    .FirstOrDefaultAsync(d => d.UserId == userId && d.DeviceFingerprint == request.DeviceFingerprint);

                if (existing != null)
                {
                    existing.LastKnownIpAddress = ipAddress;
                    existing.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();

                    await RecordAuditAsync(existing.Id, userId, "RegisterAttempt_AlreadyExists", ipAddress, userAgent);

                    return new RegisterDeviceResponseDTO
                    {
                        Success = true,
                        Message = existing.Status == DeviceStatus.Approved
                            ? "Device already approved."
                            : "Device already registered. Waiting for admin approval.",
                        DeviceId = existing.Id,
                        Status = existing.Status.ToString(),
                        RequiresAdminApproval = existing.Status == DeviceStatus.Pending,
                        AutoApproved = existing.Status == DeviceStatus.Approved
                    };
                }

                // ------------------------------------------------------------
                // 2) AUTO-LINK: same user already has an APPROVED device
                //    with matching browser / OS / timezone → silently approve.
                //    This is the safety net for the rare case where the
                //    persistent ID was wiped but the physical device is the same.
                // ------------------------------------------------------------
                var sameUserApproved = await _context.UserDevices
                    .Where(d => d.UserId == userId
                             && d.Status == DeviceStatus.Approved
                             && d.BrowserName     == request.BrowserName
                             && d.OperatingSystem == request.OperatingSystem
                             && d.TimeZone        == request.TimeZone)
                    .OrderByDescending(d => d.ApprovedAt)
                    .FirstOrDefaultAsync();

                if (sameUserApproved != null)
                {
                    var autoLinked = new UserDevice
                    {
                        Id                    = Guid.NewGuid(),
                        UserId                = userId,
                        DeviceFingerprint     = request.DeviceFingerprint,
                        DeviceName            = request.DeviceName ?? "Unknown Device",
                        OperatingSystem       = request.OperatingSystem,
                        BrowserName           = request.BrowserName,
                        BrowserVersion        = request.BrowserVersion,
                        ScreenResolution      = request.ScreenResolution,
                        TimeZone              = request.TimeZone,
                        Language              = request.Language,
                        DeviceType            = DetectDeviceType(request.OperatingSystem),
                        RegistrationIpAddress = ipAddress,
                        LastKnownIpAddress    = ipAddress,
                        Status                = DeviceStatus.Approved,
                        ApprovedById          = sameUserApproved.ApprovedById,
                        ApprovedAt            = DateTime.UtcNow,
                        CreatedAt             = DateTime.UtcNow,
                        TrustScore            = sameUserApproved.TrustScore,
                        Notes                 = $"Auto-linked to device {sameUserApproved.Id}"
                    };

                    _context.UserDevices.Add(autoLinked);
                    await _context.SaveChangesAsync();

                    await RecordAuditAsync(autoLinked.Id, userId,
                        "AutoLinkedToExistingApprovedDevice", ipAddress, userAgent,
                        $"Linked to {sameUserApproved.Id}");

                    _logger.LogInformation(
                        "Device {DeviceId} auto-linked to existing approved device {ExistingId} for user {UserId}",
                        autoLinked.Id, sameUserApproved.Id, userId);

                    return new RegisterDeviceResponseDTO
                    {
                        Success               = true,
                        Message               = "Device linked to your existing approved device.",
                        DeviceId              = autoLinked.Id,
                        Status                = "Approved",
                        RequiresAdminApproval = false,
                        AutoApproved          = true
                    };
                }

                // ------------------------------------------------------------
                // 3) Device limit check
                // ------------------------------------------------------------
                var userDeviceCount = await _context.UserDevices
                    .CountAsync(d => d.UserId == userId && d.Status != DeviceStatus.Rejected && d.Status != DeviceStatus.Revoked);

                if (userDeviceCount >= _maxDevicesPerUser)
                {
                    await RecordAuditAsync(null, userId, "RegisterAttempt_LimitReached", ipAddress, userAgent);

                    return new RegisterDeviceResponseDTO
                    {
                        Success = false,
                        Message = $"Device limit reached ({_maxDevicesPerUser}). Please remove an existing device or contact admin.",
                        RequiresAdminApproval = false,
                        AutoApproved = false
                    };
                }

                // ------------------------------------------------------------
                // 4) Fingerprint reused by another user (suspicious)
                // ------------------------------------------------------------
                var fingerprintUsedByOther = await _context.UserDevices
                    .AnyAsync(d => d.DeviceFingerprint == request.DeviceFingerprint && d.UserId != userId);

                // ------------------------------------------------------------
                // 5) Fresh device — pending approval
                // ------------------------------------------------------------
                var device = new UserDevice
                {
                    Id                    = Guid.NewGuid(),
                    UserId                = userId,
                    DeviceFingerprint     = request.DeviceFingerprint,
                    DeviceName            = request.DeviceName ?? "Unknown Device",
                    OperatingSystem       = request.OperatingSystem,
                    BrowserName           = request.BrowserName,
                    BrowserVersion        = request.BrowserVersion,
                    ScreenResolution      = request.ScreenResolution,
                    TimeZone              = request.TimeZone,
                    Language              = request.Language,
                    DeviceType            = DetectDeviceType(request.OperatingSystem),
                    RegistrationIpAddress = ipAddress,
                    LastKnownIpAddress    = ipAddress,
                    Status                = DeviceStatus.Pending,
                    TrustScore            = fingerprintUsedByOther ? 10 : 50,
                    CreatedAt             = DateTime.UtcNow
                };

                _context.UserDevices.Add(device);
                await _context.SaveChangesAsync();

                await RecordAuditAsync(device.Id, userId, "Registered", ipAddress, userAgent,
                    $"Device: {device.DeviceName}, OS: {device.OperatingSystem}");

                _logger.LogInformation("Device {DeviceId} registered for user {UserId}, status: Pending", device.Id, userId);

                return new RegisterDeviceResponseDTO
                {
                    Success = true,
                    Message = "Device registered. Waiting for admin approval.",
                    DeviceId = device.Id,
                    Status = "Pending",
                    RequiresAdminApproval = true,
                    AutoApproved = false
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error registering device for user {UserId}", userId);
                throw;
            }
        }

        public async Task<VerifyDeviceResponseDTO> VerifyDeviceAsync(
            Guid userId,
            string deviceFingerprint,
            string? ipAddress,
            string? userAgent)
        {
            try
            {
                var device = await _context.UserDevices
                    .FirstOrDefaultAsync(d => d.UserId == userId && d.DeviceFingerprint == deviceFingerprint);

                if (device == null)
                {
                    await RecordAuditAsync(null, userId, "VerifyAttempt_NotRegistered", ipAddress, userAgent,
                        $"Fingerprint: {deviceFingerprint[..Math.Min(16, deviceFingerprint.Length)]}...");

                    return new VerifyDeviceResponseDTO
                    {
                        Success = false,
                        IsTrusted = false,
                        Status = "NotRegistered",
                        Message = "This device is not registered. Please register it first.",
                        RequiresApproval = true
                    };
                }

                device.LastKnownIpAddress = ipAddress;
                device.LastUsedAt = DateTime.UtcNow;
                device.LoginCount++;

                switch (device.Status)
                {
                    case DeviceStatus.Approved:
                        device.UpdatedAt = DateTime.UtcNow;
                        await _context.SaveChangesAsync();

                        await RecordAuditAsync(device.Id, userId, "VerifySuccess", ipAddress, userAgent);

                        return new VerifyDeviceResponseDTO
                        {
                            Success = true,
                            IsTrusted = true,
                            Status = "Approved",
                            Message = "Device verified successfully.",
                            RequiresApproval = false,
                            DeviceId = device.Id
                        };

                    case DeviceStatus.Pending:
                        await _context.SaveChangesAsync();
                        await RecordAuditAsync(device.Id, userId, "VerifyAttempt_PendingApproval", ipAddress, userAgent);

                        return new VerifyDeviceResponseDTO
                        {
                            Success = false,
                            IsTrusted = false,
                            Status = "Pending",
                            Message = "Device is pending admin approval. Please wait.",
                            RequiresApproval = true,
                            DeviceId = device.Id
                        };

                    case DeviceStatus.Rejected:
                        await _context.SaveChangesAsync();
                        await RecordAuditAsync(device.Id, userId, "VerifyAttempt_Rejected", ipAddress, userAgent);

                        return new VerifyDeviceResponseDTO
                        {
                            Success = false,
                            IsTrusted = false,
                            Status = "Rejected",
                            Message = $"Device was rejected by admin. Reason: {device.RejectionReason ?? "N/A"}",
                            RequiresApproval = false,
                            DeviceId = device.Id
                        };

                    case DeviceStatus.Revoked:
                    case DeviceStatus.Blocked:
                        await _context.SaveChangesAsync();
                        await RecordAuditAsync(device.Id, userId, $"VerifyAttempt_{device.Status}", ipAddress, userAgent);

                        return new VerifyDeviceResponseDTO
                        {
                            Success = false,
                            IsTrusted = false,
                            Status = device.Status.ToString(),
                            Message = $"Device access has been {device.Status.ToString().ToLower()}. Contact admin.",
                            RequiresApproval = false,
                            DeviceId = device.Id
                        };

                    default:
                        return new VerifyDeviceResponseDTO
                        {
                            Success = false,
                            IsTrusted = false,
                            Status = "Unknown",
                            Message = "Unknown device status.",
                            RequiresApproval = true
                        };
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verifying device for user {UserId}", userId);
                throw;
            }
        }

        public async Task<List<DeviceListItemDTO>> GetUserDevicesAsync(Guid userId)
        {
            return await _context.UserDevices
                .Where(d => d.UserId == userId)
                .OrderByDescending(d => d.CreatedAt)
                .Select(d => new DeviceListItemDTO
                {
                    Id                    = d.Id,
                    DeviceName            = d.DeviceName,
                    OperatingSystem       = d.OperatingSystem,
                    BrowserName           = d.BrowserName,
                    Status                = d.Status.ToString(),
                    RegistrationIpAddress = d.RegistrationIpAddress,
                    RegistrationLocation  = d.RegistrationLocation,
                    LastUsedAt            = d.LastUsedAt,
                    LoginCount            = d.LoginCount,
                    CreatedAt             = d.CreatedAt,
                    ApprovedAt            = d.ApprovedAt,
                    RejectionReason       = d.RejectionReason
                })
                .ToListAsync();
        }

        public async Task<bool> RevokeOwnDeviceAsync(Guid userId, Guid deviceId)
        {
            var device = await _context.UserDevices
                .FirstOrDefaultAsync(d => d.Id == deviceId && d.UserId == userId);

            if (device == null) return false;

            device.Status = DeviceStatus.Revoked;
            device.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await RecordAuditAsync(device.Id, userId, "ClientRevoked", null, null);

            return true;
        }

        // ==================== ADMIN SIDE ====================

        public async Task<List<DeviceListItemDTO>> GetPendingDevicesAsync(Guid? companyId = null)
        {
            var query = _context.UserDevices
                .Include(d => d.User)
                .Include(d => d.ApprovedBy)
                .Where(d => d.Status == DeviceStatus.Pending);

            if (companyId.HasValue)
            {
                query = query.Where(d =>
                    d.User.AccessibleCompanies.Any(c => c.Id == companyId.Value) ||
                    d.User.OwnedCompanies.Any(c => c.Id == companyId.Value));
            }

            return await query
                .OrderBy(d => d.CreatedAt)
                .Select(d => MapToListItem(d))
                .ToListAsync();
        }

        public async Task<List<DeviceListItemDTO>> GetAllDevicesAsync(Guid? companyId = null, DeviceStatus? status = null)
        {
            var query = _context.UserDevices
                .Include(d => d.User)
                .Include(d => d.ApprovedBy)
                .AsQueryable();

            if (companyId.HasValue)
            {
                query = query.Where(d =>
                    d.User.AccessibleCompanies.Any(c => c.Id == companyId.Value) ||
                    d.User.OwnedCompanies.Any(c => c.Id == companyId.Value));
            }

            if (status.HasValue)
            {
                query = query.Where(d => d.Status == status.Value);
            }

            return await query
                .OrderByDescending(d => d.CreatedAt)
                .Select(d => MapToListItem(d))
                .ToListAsync();
        }

        public async Task<bool> ApproveDeviceAsync(Guid deviceId, Guid adminId, ApproveDeviceRequestDTO request)
        {
            var device = await _context.UserDevices
                .Include(d => d.User)
                .FirstOrDefaultAsync(d => d.Id == deviceId);

            if (device == null) return false;

            device.Status = DeviceStatus.Approved;
            device.ApprovedById = adminId;
            device.ApprovedAt = DateTime.UtcNow;
            device.UpdatedAt = DateTime.UtcNow;
            device.RejectionReason = null;
            if (!string.IsNullOrWhiteSpace(request.Notes))
                device.Notes = request.Notes;
            if (request.TrustScore.HasValue)
                device.TrustScore = Math.Clamp(request.TrustScore.Value, 0, 100);

            await _context.SaveChangesAsync();

            await RecordAuditAsync(device.Id, adminId, "Approved", null, null,
                $"Approved device for user {device.User.Email}");

            _logger.LogInformation("Device {DeviceId} approved by admin {AdminId}", deviceId, adminId);
            return true;
        }

        public async Task<bool> RejectDeviceAsync(Guid deviceId, Guid adminId, RejectDeviceRequestDTO request)
        {
            var device = await _context.UserDevices
                .Include(d => d.User)
                .FirstOrDefaultAsync(d => d.Id == deviceId);

            if (device == null) return false;

            device.Status = DeviceStatus.Rejected;
            device.ApprovedById = adminId;
            device.ApprovedAt = DateTime.UtcNow;
            device.RejectionReason = request.Reason;
            device.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await RecordAuditAsync(device.Id, adminId, "Rejected", null, null, request.Reason);

            _logger.LogInformation("Device {DeviceId} rejected by admin {AdminId}", deviceId, adminId);
            return true;
        }

        public async Task<bool> RevokeDeviceAsync(Guid deviceId, Guid adminId, string reason)
        {
            var device = await _context.UserDevices.FirstOrDefaultAsync(d => d.Id == deviceId);
            if (device == null) return false;

            device.Status = DeviceStatus.Revoked;
            device.RejectionReason = reason;
            device.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await RecordAuditAsync(device.Id, adminId, "AdminRevoked", null, null, reason);
            return true;
        }

        public async Task<bool> BlockDeviceAsync(Guid deviceId, Guid adminId, string reason)
        {
            var device = await _context.UserDevices.FirstOrDefaultAsync(d => d.Id == deviceId);
            if (device == null) return false;

            device.Status = DeviceStatus.Blocked;
            device.RejectionReason = reason;
            device.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await RecordAuditAsync(device.Id, adminId, "Blocked", null, null, reason);
            return true;
        }

        // ==================== HELPERS ====================

        public async Task RecordAuditAsync(Guid? deviceId, Guid? userId, string action, string? ipAddress, string? userAgent, string? details = null)
        {
            try
            {
                _context.DeviceAuditLogs.Add(new DeviceAuditLog
                {
                    Id        = Guid.NewGuid(),
                    DeviceId  = deviceId,
                    UserId    = userId,
                    Action    = action,
                    IpAddress = ipAddress,
                    UserAgent = userAgent,
                    Details   = details,
                    CreatedAt = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to record audit log");
            }
        }

        public async Task<bool> IsDeviceTrustedAsync(Guid userId, string deviceFingerprint)
        {
            return await _context.UserDevices
                .AnyAsync(d => d.UserId == userId
                            && d.DeviceFingerprint == deviceFingerprint
                            && d.Status == DeviceStatus.Approved);
        }

        private static DeviceListItemDTO MapToListItem(UserDevice d) => new()
        {
            Id                    = d.Id,
            DeviceName            = d.DeviceName,
            OperatingSystem       = d.OperatingSystem,
            BrowserName           = d.BrowserName,
            Status                = d.Status.ToString(),
            RegistrationIpAddress = d.RegistrationIpAddress,
            RegistrationLocation  = d.RegistrationLocation,
            LastUsedAt            = d.LastUsedAt,
            LoginCount            = d.LoginCount,
            CreatedAt             = d.CreatedAt,
            UserName              = d.User?.Name,
            UserEmail             = d.User?.Email,
            ApprovedByName        = d.ApprovedBy?.Name,
            ApprovedAt            = d.ApprovedAt,
            RejectionReason       = d.RejectionReason
        };

        private static DeviceType DetectDeviceType(string? os)
        {
            if (string.IsNullOrEmpty(os)) return DeviceType.Unknown;
            var lower = os.ToLower();
            if (lower.Contains("android") || lower.Contains("ios") || lower.Contains("iphone")) return DeviceType.Mobile;
            if (lower.Contains("ipad") || lower.Contains("tablet")) return DeviceType.Tablet;
            if (lower.Contains("macbook") || lower.Contains("laptop")) return DeviceType.Laptop;
            if (lower.Contains("windows") || lower.Contains("mac") || lower.Contains("linux")) return DeviceType.Desktop;
            return DeviceType.Unknown;
        }

        public async Task<List<DeviceListItemDTO>> GetDevicesForCompanyUsersAsync(
            Guid companyId,
            DeviceStatus? status = null,
            bool excludeSystemAdmins = true)
        {
            var companyUserIds = await _context.Users
                .Where(u =>
                    u.OwnedCompanies.Any(c => c.Id == companyId) ||
                    u.AccessibleCompanies.Any(c => c.Id == companyId))
                .Select(u => u.Id)
                .ToListAsync();

            if (companyUserIds.Count == 0)
                return new List<DeviceListItemDTO>();

            var query = _context.UserDevices
                .Include(d => d.User)
                    .ThenInclude(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                .Include(d => d.ApprovedBy)
                .Where(d => companyUserIds.Contains(d.UserId));

            if (status.HasValue)
            {
                query = query.Where(d => d.Status == status.Value);
            }

            if (excludeSystemAdmins)
            {
                query = query.Where(d =>
                    !d.User.UserRoles.Any(ur =>
                        ur.IsPrimary &&
                        ur.Role.Name == "Administrator"));
            }

            return await query
                .OrderByDescending(d => d.CreatedAt)
                .Select(d => new DeviceListItemDTO
                {
                    Id                    = d.Id,
                    DeviceName            = d.DeviceName,
                    OperatingSystem       = d.OperatingSystem,
                    BrowserName           = d.BrowserName,
                    Status                = d.Status.ToString(),
                    RegistrationIpAddress = d.RegistrationIpAddress,
                    RegistrationLocation  = d.RegistrationLocation,
                    LastUsedAt            = d.LastUsedAt,
                    LoginCount            = d.LoginCount,
                    CreatedAt             = d.CreatedAt,
                    UserName              = d.User != null ? d.User.Name : null,
                    UserEmail             = d.User != null ? d.User.Email : null,
                    UserRole              = d.User != null
                        ? d.User.UserRoles
                            .Where(ur => ur.IsPrimary)
                            .Select(ur => ur.Role.Name)
                            .FirstOrDefault()
                        : null,
                    ApprovedByName        = d.ApprovedBy != null ? d.ApprovedBy.Name : null,
                    ApprovedAt            = d.ApprovedAt,
                    RejectionReason       = d.RejectionReason
                })
                .ToListAsync();
        }
    }
}