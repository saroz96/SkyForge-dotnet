using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SkyForge.Data;
using SkyForge.Dto;
using SkyForge.Models;
using SkyForge.Models.CompanyModel;
using SkyForge.Services.AttendanceServices;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SkyForge.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AttendanceController : ControllerBase
    {
        private readonly IAttendanceService _attendanceService;
        private readonly ILogger<AttendanceController> _logger;
        private readonly ApplicationDbContext _context;

        public AttendanceController(
            IAttendanceService attendanceService,
            ILogger<AttendanceController> logger,
            ApplicationDbContext context)
        {
            _attendanceService = attendanceService;
            _logger = logger;
            _context = context;
        }

        private Guid GetUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId))
            {
                throw new UnauthorizedAccessException("Invalid user token");
            }
            return userId;
        }

        private bool IsAdmin()
        {
            var isAdminClaim = User.FindFirst("isAdmin")?.Value;
            return bool.TryParse(isAdminClaim, out bool isAdmin) && isAdmin;
        }

        #region User Routes

        /// <summary>
        /// Get company data with attendance settings
        /// </summary>
        [HttpGet("company-data")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetCompanyData()
        {
            try
            {
                var userId = GetUserId();

                // Get the current company from the user's claims
                var companyIdClaim = User.FindFirst("currentCompany")?.Value;
                if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out Guid companyId))
                {
                    // Try to get from the user's associated companies
                    var user = await _context.Users
                        .AsNoTracking()
                        .Include(u => u.AccessibleCompanies)
                        .FirstOrDefaultAsync(u => u.Id == userId);

                    if (user?.AccessibleCompanies?.Any() == true)
                    {
                        companyId = user.AccessibleCompanies.First().Id;
                    }
                    else
                    {
                        return BadRequest(new ApiResponse<object>
                        {
                            Success = false,
                            Message = "No company selected. Please select a company first.",
                            Data = null
                        });
                    }
                }

                // Get company with attendance settings - Use AsNoTracking and explicit projection
                var company = await _context.Companies
                    .AsNoTracking()
                    .Where(c => c.Id == companyId)
                    .Select(c => new
                    {
                        c.Id,
                        c.Name,
                        // Explicitly flatten the attendance settings to avoid EF Core tracking issues
                        GeoFencingEnabled = c.AttendanceSettings != null ? c.AttendanceSettings.GeoFencingEnabled : false,
                        OfficeLocations = c.AttendanceSettings != null && c.AttendanceSettings.OfficeLocations != null
            ? c.AttendanceSettings.OfficeLocations.Select(o => new
            {
                o.Id,
                o.Name,
                Lat = o.Coordinates.Lat,
                Lng = o.Coordinates.Lng,
                o.Radius,
                o.Address,
                o.IsActive
            }).ToList<object>()  // Cast to List<object>
            : new List<object>(),
                        WorkingHoursStartTime = c.AttendanceSettings != null ? c.AttendanceSettings.WorkingHours.StartTime : "09:00",
                        WorkingHoursEndTime = c.AttendanceSettings != null ? c.AttendanceSettings.WorkingHours.EndTime : "17:00",
                        WorkingHoursGracePeriod = c.AttendanceSettings != null ? c.AttendanceSettings.WorkingHours.GracePeriod : 15,
                        AutoClockOutEnabled = c.AttendanceSettings != null ? c.AttendanceSettings.AutoClockOut.Enabled : false,
                        AutoClockOutTime = c.AttendanceSettings != null ? c.AttendanceSettings.AutoClockOut.Time : "18:00"
                    })
                    .FirstOrDefaultAsync();

                if (company == null)
                {
                    return NotFound(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Company not found",
                        Data = null
                    });
                }

                // Build the response
                var response = new
                {
                    _id = company.Id,
                    id = company.Id,
                    name = company.Name,
                    attendanceSettings = new
                    {
                        GeoFencingEnabled = company.GeoFencingEnabled,
                        OfficeLocations = company.OfficeLocations,
                        WorkingHours = new
                        {
                            StartTime = company.WorkingHoursStartTime,
                            EndTime = company.WorkingHoursEndTime,
                            GracePeriod = company.WorkingHoursGracePeriod
                        },
                        AutoClockOut = new
                        {
                            Enabled = company.AutoClockOutEnabled,
                            Time = company.AutoClockOutTime
                        }
                    }
                };

                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Message = "Company data retrieved successfully",
                    Data = response
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting company data");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Server error",
                    Data = ex.Message
                });
            }
        }
        
        
        /// <summary>
        /// Clock in with location
        /// </summary>
        [HttpPost("clock-in")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ClockIn([FromBody] ClockInRequestDto request)
        {
            try
            {
                var userId = GetUserId();

                _logger.LogInformation("Clock-in request: UserId={UserId}, CompanyId={CompanyId}",
                    userId, request.CompanyId);

                var attendance = await _attendanceService.ClockInAsync(userId, request.CompanyId, request.Location);

                var response = new
                {
                    time = attendance.ClockIn?.Time,
                    location = attendance.ClockIn?.OfficeLocationId,
                    dutyHours = attendance.ScheduledDutyHours,
                    lateMinutes = attendance.LateMinutes,
                    status = attendance.Status,
                    hasDutySchedule = attendance.DutyScheduleId.HasValue,
                    dutyScheduleId = attendance.DutyScheduleId
                };

                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Message = "Clocked in successfully",
                    Data = response
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = ex.Message,
                    Data = null
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = ex.Message,
                    Data = null
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = ex.Message,
                    Data = null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Clock-in error for user {UserId}", GetUserId());
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Server error during clock-in",
                    Data = ex.Message
                });
            }
        }

        /// <summary>
        /// Clock out with location
        /// </summary>
        [HttpPost("clock-out")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ClockOut([FromBody] ClockOutRequestDto request)
        {
            try
            {
                var userId = GetUserId();

                _logger.LogInformation("Clock-out request: UserId={UserId}, CompanyId={CompanyId}",
                    userId, request.CompanyId);

                var attendance = await _attendanceService.ClockOutAsync(userId, request.CompanyId, request.Location);

                var response = new
                {
                    time = attendance.ClockOut?.Time,
                    totalHours = attendance.TotalHours,
                    overtime = attendance.Overtime,
                    status = attendance.Status,
                    earlyDepartureMinutes = attendance.EarlyDepartureMinutes,
                    hasClockedIn = attendance.ClockIn != null,
                    hasClockedOut = attendance.ClockOut != null,
                    clockIn = attendance.ClockIn?.Time,
                    clockOut = attendance.ClockOut?.Time
                };

                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Message = "Clocked out successfully",
                    Data = response
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = ex.Message,
                    Data = null
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = ex.Message,
                    Data = null
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = ex.Message,
                    Data = null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Clock-out error for user {UserId}", GetUserId());
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Server error during clock-out",
                    Data = ex.Message
                });
            }
        }

        /// <summary>
        /// Get today's attendance status
        /// </summary>
        [HttpGet("today-status")]
        [ProducesResponseType(typeof(ApiResponse<List<TodayStatusResponseDto>>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetTodayStatus()
        {
            try
            {
                var userId = GetUserId();
                var status = await _attendanceService.GetTodayStatusAsync(userId);

                return Ok(new ApiResponse<List<TodayStatusResponseDto>>
                {
                    Success = true,
                    Message = "Today's status retrieved successfully",
                    Data = status
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = ex.Message,
                    Data = null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting today status for user {UserId}", GetUserId());
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Server error",
                    Data = ex.Message
                });
            }
        }

        /// <summary>
        /// Get my attendance history
        /// </summary>
        [HttpGet("my-attendance")]
        [ProducesResponseType(typeof(ApiResponse<AttendanceResponseDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetMyAttendance(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] int page = 1,
            [FromQuery] int limit = 30,
            [FromQuery] Guid? companyId = null)
        {
            try
            {
                var userId = GetUserId();
                var result = await _attendanceService.GetMyAttendanceAsync(userId, startDate, endDate, page, limit, companyId);

                return Ok(new ApiResponse<AttendanceResponseDto>
                {
                    Success = true,
                    Message = "Attendance retrieved successfully",
                    Data = result
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting my attendance for user {UserId}", GetUserId());
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Server error",
                    Data = ex.Message
                });
            }
        }

        #endregion

        #region Admin Routes

        /// <summary>
        /// Get company attendance (Admin only)
        /// </summary>
        [HttpGet("company/{companyId}")]
        [Authorize(Roles = "Admin,ADMINISTRATOR")]
        [ProducesResponseType(typeof(ApiResponse<CompanyAttendanceResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> GetCompanyAttendance(
            Guid companyId,
            [FromQuery] Guid? userId,
            [FromQuery] string? status,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] int page = 1,
            [FromQuery] int limit = 50)
        {
            try
            {
                var currentUserId = GetUserId();

                // Verify user has access to this company
                if (!IsAdmin())
                {
                    return Forbid();
                }

                var result = await _attendanceService.GetCompanyAttendanceAsync(
                    companyId, userId, status, startDate, endDate, page, limit);

                return Ok(new ApiResponse<CompanyAttendanceResponseDto>
                {
                    Success = true,
                    Message = "Company attendance retrieved successfully",
                    Data = result
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = ex.Message,
                    Data = null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting company attendance for company {CompanyId}", companyId);
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Server error",
                    Data = ex.Message
                });
            }
        }

        /// <summary>
        /// Adjust attendance (Admin only)
        /// </summary>
        [HttpPut("adjust/{attendanceId}")]
        [Authorize(Roles = "Admin,ADMINISTRATOR")]
        [ProducesResponseType(typeof(ApiResponse<AttendanceResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> AdjustAttendance(Guid attendanceId, [FromBody] AdjustAttendanceDto adjustments)
        {
            try
            {
                var adminId = GetUserId();

                if (!IsAdmin())
                {
                    return Forbid();
                }

                var attendance = await _attendanceService.AdjustAttendanceAsync(attendanceId, adminId, adjustments);
                var response = MapToResponseDto(attendance);

                return Ok(new ApiResponse<AttendanceResponseDto>
                {
                    Success = true,
                    Message = "Attendance adjusted successfully",
                    Data = response
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = ex.Message,
                    Data = null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adjusting attendance {AttendanceId}", attendanceId);
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Server error",
                    Data = ex.Message
                });
            }
        }

        /// <summary>
        /// Bulk update attendance (Admin only)
        /// </summary>
        [HttpPost("bulk-update")]
        [Authorize(Roles = "Admin,ADMINISTRATOR")]
        [ProducesResponseType(typeof(ApiResponse<BulkUpdateResultDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> BulkUpdateAttendance([FromBody] BulkUpdateAttendanceDto request)
        {
            try
            {
                var adminId = GetUserId();

                if (!IsAdmin())
                {
                    return Forbid();
                }

                var result = await _attendanceService.BulkUpdateAttendanceAsync(
                    request.CompanyId, adminId, request.Updates);

                return Ok(new ApiResponse<BulkUpdateResultDto>
                {
                    Success = true,
                    Message = $"Bulk update completed: {result.Success} success, {result.Failed} failed",
                    Data = result
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in bulk update");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Server error",
                    Data = ex.Message
                });
            }
        }

        /// <summary>
        /// Get attendance reports (Admin only)
        /// </summary>
        [HttpGet("reports")]
        [Authorize(Roles = "Admin,ADMINISTRATOR")]
        [ProducesResponseType(typeof(ApiResponse<ReportResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> GetReports(
            [FromQuery] Guid companyId,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] string reportType = "daily")
        {
            try
            {
                if (!IsAdmin())
                {
                    return Forbid();
                }

                var result = await _attendanceService.GetReportsAsync(companyId, startDate, endDate, reportType);

                return Ok(new ApiResponse<ReportResponseDto>
                {
                    Success = true,
                    Message = "Reports generated successfully",
                    Data = result
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = ex.Message,
                    Data = null
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = ex.Message,
                    Data = null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating reports");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Server error",
                    Data = ex.Message
                });
            }
        }

        #endregion

        #region Office Location Management

        /// <summary>
        /// Get office locations for a company
        /// </summary>
        [HttpGet("office-locations")]
        [ProducesResponseType(typeof(ApiResponse<OfficeLocationResponseDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetOfficeLocations([FromQuery] Guid companyId)
        {
            try
            {
                var userId = GetUserId();
                var settings = await _attendanceService.GetCompanyDataAsync(companyId);

                var company = await _context.Companies
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                if (company == null)
                {
                    return NotFound(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Company not found",
                        Data = null
                    });
                }

                var response = new OfficeLocationResponseDto
                {
                    Company = new CompanyInfoDto
                    {
                        Id = company.Id,
                        Name = company.Name,
                        AttendanceSettings = settings
                    },
                    OfficeLocations = settings.OfficeLocations ?? new List<OfficeLocation>(),
                    GeoFencingEnabled = settings.GeoFencingEnabled
                };

                return Ok(new ApiResponse<OfficeLocationResponseDto>
                {
                    Success = true,
                    Message = "Office locations retrieved successfully",
                    Data = response
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = ex.Message,
                    Data = null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting office locations for company {CompanyId}", companyId);
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Server error",
                    Data = ex.Message
                });
            }
        }

        /// <summary>
        /// Get specific office location
        /// </summary>
        [HttpGet("office-location/{id}")]
        [ProducesResponseType(typeof(ApiResponse<OfficeLocation>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetOfficeLocation(Guid id, [FromQuery] Guid companyId)
        {
            try
            {
                var userId = GetUserId();
                var location = await _attendanceService.GetOfficeLocationAsync(id, companyId);

                return Ok(new ApiResponse<OfficeLocation>
                {
                    Success = true,
                    Message = "Office location retrieved successfully",
                    Data = location
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = ex.Message,
                    Data = null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting office location {LocationId}", id);
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Server error",
                    Data = ex.Message
                });
            }
        }

        /// <summary>
        /// Add office location (Admin only)
        /// </summary>
        [HttpPost("office-location")]
        [Authorize(Roles = "Admin,ADMINISTRATOR")]
        [ProducesResponseType(typeof(ApiResponse<OfficeLocation>), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> AddOfficeLocation([FromBody] OfficeLocationRequestDto request)
        {
            try
            {
                var adminId = GetUserId();

                if (!IsAdmin())
                {
                    return Forbid();
                }

                var location = await _attendanceService.AddOfficeLocationAsync(
                    request.CompanyId, adminId, request);

                return CreatedAtAction(nameof(GetOfficeLocation), new { id = location.Id, companyId = request.CompanyId },
                    new ApiResponse<OfficeLocation>
                    {
                        Success = true,
                        Message = "Office location added successfully",
                        Data = location
                    });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = ex.Message,
                    Data = null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding office location");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Server error",
                    Data = ex.Message
                });
            }
        }

        /// <summary>
        /// Update office location (Admin only)
        /// </summary>
        [HttpPut("office-location/{id}")]
        [Authorize(Roles = "Admin,ADMINISTRATOR")]
        [ProducesResponseType(typeof(ApiResponse<OfficeLocation>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> UpdateOfficeLocation(Guid id, [FromBody] UpdateOfficeLocationDto request)
        {
            try
            {
                var adminId = GetUserId();

                if (!IsAdmin())
                {
                    return Forbid();
                }

                var location = await _attendanceService.UpdateOfficeLocationAsync(
                    id, request.CompanyId, adminId, request);

                return Ok(new ApiResponse<OfficeLocation>
                {
                    Success = true,
                    Message = "Office location updated successfully",
                    Data = location
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = ex.Message,
                    Data = null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating office location {LocationId}", id);
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Server error",
                    Data = ex.Message
                });
            }
        }

        /// <summary>
        /// Delete office location (Admin only)
        /// </summary>
        [HttpDelete("office-location/{id}")]
        [Authorize(Roles = "Admin,ADMINISTRATOR")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> DeleteOfficeLocation(Guid id, [FromQuery] Guid companyId)
        {
            try
            {
                var adminId = GetUserId();

                if (!IsAdmin())
                {
                    return Forbid();
                }

                var result = await _attendanceService.DeleteOfficeLocationAsync(id, companyId, adminId);

                // Get remaining count and status
                var settings = await _attendanceService.GetCompanyDataAsync(companyId);
                var remainingCount = settings.OfficeLocations?.Count ?? 0;

                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Message = "Office location deleted successfully",
                    Data = new
                    {
                        deletedLocationId = id,
                        remainingLocations = remainingCount,
                        geoFencingEnabled = settings.GeoFencingEnabled
                    }
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = ex.Message,
                    Data = null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting office location {LocationId}", id);
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Server error",
                    Data = ex.Message
                });
            }
        }

        /// <summary>
        /// Toggle geo-fencing (Admin only)
        /// </summary>
        [HttpPut("geo-fencing")]
        [Authorize(Roles = "Admin,ADMINISTRATOR")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> ToggleGeoFencing([FromBody] ToggleGeoFencingDto request)
        {
            try
            {
                var adminId = GetUserId();

                if (!IsAdmin())
                {
                    return Forbid();
                }

                var result = await _attendanceService.ToggleGeoFencingAsync(
                    request.CompanyId, adminId, request.Enabled);

                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Message = $"Geo-fencing {(request.Enabled ? "enabled" : "disabled")} successfully",
                    Data = new
                    {
                        geoFencingEnabled = request.Enabled
                    }
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = ex.Message,
                    Data = null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error toggling geo-fencing");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Server error",
                    Data = ex.Message
                });
            }
        }

        #endregion

        #region Helper Methods

        private AttendanceResponseDto MapToResponseDto(Attendance attendance)
        {
            return new AttendanceResponseDto
            {
                Id = attendance.Id,
                UserId = attendance.UserId,
                UserName = attendance.User?.Name ?? string.Empty,
                CompanyId = attendance.CompanyId,
                CompanyName = attendance.Company?.Name ?? string.Empty,
                Date = attendance.Date,
                ClockIn = attendance.ClockIn != null ? new ClockInDataDto
                {
                    Time = attendance.ClockIn.Time,
                    Location = attendance.ClockIn.Location != null ? new LocationDto
                    {
                        Lat = attendance.ClockIn.Location.Lat ?? 0,
                        Lng = attendance.ClockIn.Location.Lng ?? 0,
                        Accuracy = attendance.ClockIn.Location.Accuracy,
                        Address = attendance.ClockIn.Location.Address
                    } : null
                } : null,
                ClockOut = attendance.ClockOut != null ? new ClockOutDataDto
                {
                    Time = attendance.ClockOut.Time,
                    Location = attendance.ClockOut.Location != null ? new LocationDto
                    {
                        Lat = attendance.ClockOut.Location.Lat ?? 0,
                        Lng = attendance.ClockOut.Location.Lng ?? 0,
                        Accuracy = attendance.ClockOut.Location.Accuracy,
                        Address = attendance.ClockOut.Location.Address
                    } : null
                } : null,
                Status = attendance.Status,
                TotalHours = attendance.TotalHours,
                Overtime = attendance.Overtime,
                LateMinutes = attendance.LateMinutes,
                EarlyDepartureMinutes = attendance.EarlyDepartureMinutes,
                Source = attendance.Source,
                Notes = attendance.Notes,
                CreatedAt = attendance.CreatedAt
            };
        }

        #endregion
    }
}