using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto.DeviceDto;
using SkyForge.Models.UserModel;
using SkyForge.Services.DeviceServices;
using SkyForge.Services.UserServices;
using System.Security.Claims;

namespace SkyForge.Controllers
{
    /// <summary>
    /// Client Admin device management — SCOPED TO THEIR OWN COMPANY'S USERS.
    /// Cannot see system admin devices. Cannot approve/reject.
    /// </summary>
    [ApiController]
    [Route("api/client-device")]
    [Authorize]
    public class ClientDeviceController : ControllerBase
    {
        private readonly IDeviceVerificationService _deviceService;
        private readonly IUserService _userService;
        private readonly ApplicationDbContext _context;
        private readonly ILogger<ClientDeviceController> _logger;

        public ClientDeviceController(
            IDeviceVerificationService deviceService,
            IUserService userService,
            ApplicationDbContext context,
            ILogger<ClientDeviceController> logger)
        {
            _deviceService = deviceService;
            _userService = userService;
            _context = context;
            _logger = logger;
        }

        // ============================================================
        // HELPERS
        // ============================================================

        private Guid? GetCurrentUserId()
        {
            var claim = User.FindFirst("userId")?.Value
                     ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(claim, out var id) ? id : null;
        }

        /// <summary>
        /// Current caller must be a CLIENT admin (role = "Admin" or IsAdmin = true),
        /// but NOT a system admin (role = "Administrator").
        /// </summary>
        private async Task<bool> IsClientAdminAsync()
        {
            var userId = GetCurrentUserId();
            if (userId == null) return false;

            var user = await _userService.GetUserByIdAsync(userId.Value);
            if (user == null) return false;

            var primaryRole = user.UserRoles?.FirstOrDefault(ur => ur.IsPrimary)?.Role;
            var roleName = primaryRole?.Name ?? "";

            // System admin is not a client admin
            if (roleName.Equals("Administrator", StringComparison.OrdinalIgnoreCase))
                return false;

            return user.IsAdmin
                || roleName.Equals("Admin", StringComparison.OrdinalIgnoreCase);
        }

        /// <summary>
        /// Gets the company ID the current client admin belongs to.
        /// </summary>
        private async Task<Guid?> GetMyCompanyIdAsync()
        {
            var userId = GetCurrentUserId();
            if (userId == null) return null;
            return await _userService.GetUserPrimaryCompanyIdAsync(userId.Value);
        }

        /// <summary>
        /// Verifies a device's owner belongs to the client admin's company.
        /// </summary>
        private async Task<bool> DeviceOwnerBelongsToMyCompanyAsync(Guid deviceId, Guid myCompanyId)
        {
            var device = await _context.UserDevices
                .Include(d => d.User)
                    .ThenInclude(u => u.OwnedCompanies)
                .Include(d => d.User)
                    .ThenInclude(u => u.AccessibleCompanies)
                .FirstOrDefaultAsync(d => d.Id == deviceId);

            if (device?.User == null) return false;

            return device.User.OwnedCompanies.Any(c => c.Id == myCompanyId)
                || device.User.AccessibleCompanies.Any(c => c.Id == myCompanyId);
        }

        // ============================================================
        // GET: api/client-device/all?status=Approved
        // ============================================================
        [HttpGet("all")]
        public async Task<IActionResult> GetAllDevices([FromQuery] string? status = null)
        {
            try
            {
                if (!await IsClientAdminAsync()) return Forbid();

                var myCompanyId = await GetMyCompanyIdAsync();
                if (myCompanyId == null)
                {
                    return Ok(new
                    {
                        success = true,
                        devices = new List<DeviceListItemDTO>(),
                        message = "No company associated with your account."
                    });
                }

                DeviceStatus? deviceStatus = null;
                if (!string.IsNullOrEmpty(status) &&
                    Enum.TryParse<DeviceStatus>(status, true, out var parsed))
                {
                    deviceStatus = parsed;
                }

                // 🎯 USER-SCOPED query: only devices of users who belong to my company,
                //    excluding system admins.
                var devices = await _deviceService.GetDevicesForCompanyUsersAsync(
                    myCompanyId.Value,
                    deviceStatus,
                    excludeSystemAdmins: true);

                return Ok(new { success = true, devices });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in ClientDeviceController.GetAllDevices");
                return StatusCode(500, new { success = false, error = "Internal server error" });
            }
        }

        // ============================================================
        // GET: api/client-device/pending
        // ============================================================
        [HttpGet("pending")]
        public async Task<IActionResult> GetPendingDevices()
        {
            try
            {
                if (!await IsClientAdminAsync()) return Forbid();

                var myCompanyId = await GetMyCompanyIdAsync();
                if (myCompanyId == null)
                {
                    return Ok(new
                    {
                        success = true,
                        devices = new List<DeviceListItemDTO>(),
                        count = 0
                    });
                }

                var devices = await _deviceService.GetDevicesForCompanyUsersAsync(
                    myCompanyId.Value,
                    DeviceStatus.Pending,
                    excludeSystemAdmins: true);

                return Ok(new { success = true, devices, count = devices.Count });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in ClientDeviceController.GetPendingDevices");
                return StatusCode(500, new { success = false, error = "Internal server error" });
            }
        }

        // ============================================================
        // POST: api/client-device/{id}/block
        // ============================================================
        [HttpPost("{id}/block")]
        public async Task<IActionResult> BlockDevice(Guid id, [FromBody] RejectDeviceRequestDTO request)
        {
            try
            {
                if (!await IsClientAdminAsync()) return Forbid();

                if (string.IsNullOrWhiteSpace(request?.Reason))
                    return BadRequest(new { success = false, error = "Reason is required." });

                var myCompanyId = await GetMyCompanyIdAsync();
                if (myCompanyId == null) return Forbid();

                // Verify device's owner belongs to my company
                if (!await DeviceOwnerBelongsToMyCompanyAsync(id, myCompanyId.Value))
                    return Forbid();

                var adminId = GetCurrentUserId();
                if (adminId == null) return Unauthorized();

                var ok = await _deviceService.BlockDeviceAsync(id, adminId.Value, request.Reason);
                return ok
                    ? Ok(new { success = true, message = "Device blocked" })
                    : NotFound(new { success = false, error = "Device not found" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in ClientDeviceController.BlockDevice");
                return StatusCode(500, new { success = false, error = "Internal server error" });
            }
        }

        // ============================================================
        // POST: api/client-device/{id}/revoke
        // ============================================================
        [HttpPost("{id}/revoke")]
        public async Task<IActionResult> RevokeDevice(Guid id, [FromBody] RejectDeviceRequestDTO request)
        {
            try
            {
                if (!await IsClientAdminAsync()) return Forbid();

                if (string.IsNullOrWhiteSpace(request?.Reason))
                    return BadRequest(new { success = false, error = "Reason is required." });

                var myCompanyId = await GetMyCompanyIdAsync();
                if (myCompanyId == null) return Forbid();

                if (!await DeviceOwnerBelongsToMyCompanyAsync(id, myCompanyId.Value))
                    return Forbid();

                var adminId = GetCurrentUserId();
                if (adminId == null) return Unauthorized();

                var ok = await _deviceService.RevokeDeviceAsync(id, adminId.Value, request.Reason);
                return ok
                    ? Ok(new { success = true, message = "Device revoked" })
                    : NotFound(new { success = false, error = "Device not found" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in ClientDeviceController.RevokeDevice");
                return StatusCode(500, new { success = false, error = "Internal server error" });
            }
        }
    }
}