using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkyForge.Dto.DeviceDto;
using SkyForge.Models.UserModel;
using SkyForge.Services.DeviceServices;
using SkyForge.Services.UserServices;
using System.Security.Claims;

namespace SkyForge.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DeviceController : ControllerBase
    {
        private readonly IDeviceVerificationService _deviceService;
        private readonly IUserService _userService;
        private readonly ILogger<DeviceController> _logger;

        public DeviceController(
            IDeviceVerificationService deviceService,
            IUserService userService,
            ILogger<DeviceController> logger)
        {
            _deviceService = deviceService;
            _userService = userService;
            _logger = logger;
        }

        private Guid? GetCurrentUserId()
        {
            var claim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(claim, out var id) ? id : null;
        }

        private string? GetClientIp() =>
            HttpContext.Connection.RemoteIpAddress?.ToString();

        // ==================== CLIENT ENDPOINTS ====================
        
        // POST: api/device/register  (PRE-LOGIN — no JWT yet)
        [HttpPost("register")]
        [AllowAnonymous]   // 🔓 REQUIRED — user isn't logged in yet
        public async Task<IActionResult> RegisterDevice([FromBody] RegisterDevicePreLoginDTO request)
        {
            try
            {
                _logger.LogInformation("=== Device Registration Attempt for {Email} ===", request.Email);

                // --- Validate input ---
                if (string.IsNullOrWhiteSpace(request.Email) ||
                    string.IsNullOrWhiteSpace(request.Password))
                {
                    return BadRequest(new { success = false, error = "Email and password are required." });
                }

                if (string.IsNullOrWhiteSpace(request.DeviceFingerprint))
                {
                    return BadRequest(new { success = false, error = "Device fingerprint is required." });
                }

                // --- Re-authenticate to prove identity ---
                var user = await _userService.AuthenticateAsync(request.Email, request.Password);
                if (user == null)
                {
                    _logger.LogWarning("Device registration failed — invalid credentials for {Email}", request.Email);
                    return Unauthorized(new { success = false, error = "Invalid email or password." });
                }

                if (!user.IsEmailVerified)
                    return Unauthorized(new { success = false, error = "Please verify your email first." });

                if (!user.IsActive)
                    return Unauthorized(new { success = false, error = "Account is deactivated." });

                // --- Build internal DTO and register ---
                var registerRequest = new RegisterDeviceRequestDTO
                {
                    DeviceFingerprint = request.DeviceFingerprint,
                    DeviceName = request.DeviceName,
                    OperatingSystem = request.OperatingSystem,
                    BrowserName = request.BrowserName,
                    BrowserVersion = request.BrowserVersion,
                    ScreenResolution = request.ScreenResolution,
                    TimeZone = request.TimeZone,
                    Language = request.Language,
                };

                var result = await _deviceService.RegisterDeviceAsync(
                    user.Id,
                    registerRequest,
                    GetClientIp(),
                    Request.Headers["User-Agent"].ToString());

                if (!result.Success)
                    return BadRequest(result);

                _logger.LogInformation("Device registered for {Email}, status: {Status}", user.Email, result.Status);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in RegisterDevice");
                return StatusCode(500, new { success = false, error = "Internal server error" });
            }
        }

        // POST: api/device/verify
        [HttpPost("verify")]
        [Authorize]
        public async Task<IActionResult> VerifyDevice([FromBody] VerifyDeviceRequestDTO request)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == null) return Unauthorized(new { success = false, error = "Invalid token" });

                var result = await _deviceService.VerifyDeviceAsync(
                    userId.Value, request.DeviceFingerprint, GetClientIp(), Request.Headers["User-Agent"].ToString());

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in VerifyDevice");
                return StatusCode(500, new { success = false, error = "Internal server error" });
            }
        }

        // GET: api/device/my-devices
        [HttpGet("my-devices")]
        [Authorize]
        public async Task<IActionResult> GetMyDevices()
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var devices = await _deviceService.GetUserDevicesAsync(userId.Value);
            return Ok(new { success = true, devices });
        }

        // DELETE: api/device/my-devices/{id}
        [HttpDelete("my-devices/{id}")]
        [Authorize]
        public async Task<IActionResult> RevokeMyDevice(Guid id)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var ok = await _deviceService.RevokeOwnDeviceAsync(userId.Value, id);
            return ok
                ? Ok(new { success = true, message = "Device revoked" })
                : NotFound(new { success = false, error = "Device not found" });
        }

        // ==================== ADMIN ENDPOINTS ====================

        // GET: api/device/admin/pending
        [HttpGet("admin/pending")]
        [Authorize]
        public async Task<IActionResult> GetPendingDevices([FromQuery] Guid? companyId = null)
        {
            if (!await IsAdminOrSupervisorAsync()) return Forbid();

            var devices = await _deviceService.GetPendingDevicesAsync(companyId);
            return Ok(new { success = true, devices, count = devices.Count });
        }

        // GET: api/device/admin/all
        [HttpGet("admin/all")]
        [Authorize]
        public async Task<IActionResult> GetAllDevices([FromQuery] Guid? companyId = null, [FromQuery] string? status = null)
        {
            if (!await IsAdminOrSupervisorAsync()) return Forbid();

            DeviceStatus? deviceStatus = null;
            if (!string.IsNullOrEmpty(status) && Enum.TryParse<DeviceStatus>(status, true, out var parsed))
                deviceStatus = parsed;

            var devices = await _deviceService.GetAllDevicesAsync(companyId, deviceStatus);
            return Ok(new { success = true, devices });
        }

        // POST: api/device/admin/{id}/approve
        [HttpPost("admin/{id}/approve")]
        [Authorize]
        public async Task<IActionResult> ApproveDevice(Guid id, [FromBody] ApproveDeviceRequestDTO request)
        {
            var adminId = GetCurrentUserId();
            if (adminId == null || !await IsAdminOrSupervisorAsync()) return Forbid();

            var ok = await _deviceService.ApproveDeviceAsync(id, adminId.Value, request);
            return ok
                ? Ok(new { success = true, message = "Device approved" })
                : NotFound(new { success = false, error = "Device not found" });
        }

        // POST: api/device/admin/{id}/reject
        [HttpPost("admin/{id}/reject")]
        [Authorize]
        public async Task<IActionResult> RejectDevice(Guid id, [FromBody] RejectDeviceRequestDTO request)
        {
            var adminId = GetCurrentUserId();
            if (adminId == null || !await IsAdminOrSupervisorAsync()) return Forbid();

            if (string.IsNullOrWhiteSpace(request.Reason))
                return BadRequest(new { success = false, error = "Rejection reason required" });

            var ok = await _deviceService.RejectDeviceAsync(id, adminId.Value, request);
            return ok
                ? Ok(new { success = true, message = "Device rejected" })
                : NotFound(new { success = false, error = "Device not found" });
        }

        // POST: api/device/admin/{id}/revoke
        [HttpPost("admin/{id}/revoke")]
        [Authorize]
        public async Task<IActionResult> RevokeDevice(Guid id, [FromBody] RejectDeviceRequestDTO request)
        {
            var adminId = GetCurrentUserId();
            if (adminId == null || !await IsAdminOrSupervisorAsync()) return Forbid();

            var ok = await _deviceService.RevokeDeviceAsync(id, adminId.Value, request.Reason);
            return ok ? Ok(new { success = true }) : NotFound();
        }

        // POST: api/device/admin/{id}/block
        [HttpPost("admin/{id}/block")]
        [Authorize]
        public async Task<IActionResult> BlockDevice(Guid id, [FromBody] RejectDeviceRequestDTO request)
        {
            var adminId = GetCurrentUserId();
            if (adminId == null || !await IsAdminOrSupervisorAsync()) return Forbid();

            var ok = await _deviceService.BlockDeviceAsync(id, adminId.Value, request.Reason);
            return ok ? Ok(new { success = true }) : NotFound();
        }

        private async Task<bool> IsAdminOrSupervisorAsync()
        {
            var userId = GetCurrentUserId();
            if (userId == null) return false;

            var user = await _userService.GetUserByIdAsync(userId.Value);
            if (user == null) return false;

            if (user.IsAdmin) return true;
            return await _userService.UserHasRoleAsync(userId.Value, "Supervisor");
        }
    }
}