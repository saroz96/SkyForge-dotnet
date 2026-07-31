using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SkyForge.Data;
using SkyForge.Models;
using SkyForge.Models.CompanyModel;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SkyForge.Controllers
{
    [ApiController]
    [Route("api/duty-schedule")]
    [Authorize]
    public class DutyScheduleController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<DutyScheduleController> _logger;

        public DutyScheduleController(
            ApplicationDbContext context,
            ILogger<DutyScheduleController> logger)
        {
            _context = context;
            _logger = logger;
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

        /// <summary>
        /// Check if user has duty schedule for today
        /// </summary>
        [HttpGet("check-today")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        public async Task<IActionResult> CheckTodaySchedule([FromQuery] Guid userId, [FromQuery] Guid companyId)
        {
            try
            {
                _logger.LogInformation("Checking today's duty schedule for user {UserId}, company {CompanyId}", userId, companyId);

                var today = DateTime.UtcNow.Date;

                // Get all active schedules for this user and company
                var schedules = await _context.DutySchedules
                    .Where(s => s.UserId == userId && s.CompanyId == companyId && s.IsActive)
                    .ToListAsync();

                // Find schedule that applies today
                var applicableSchedule = schedules.FirstOrDefault(s =>
                    (s.ValidFrom == null || s.ValidFrom <= today) &&
                    (s.ValidTo == null || s.ValidTo >= today) &&
                    (s.DaysOfWeek == null || s.DaysOfWeek.Contains((int)today.DayOfWeek))
                );

                if (applicableSchedule == null)
                {
                    return Ok(new
                    {
                        success = true,
                        hasDuty = false,
                        message = "No duty schedule for today"
                    });
                }

                // Get office location details if exists
                object officeLocation = null;
                if (applicableSchedule.OfficeLocationId.HasValue)
                {
                    var company = await _context.Companies
                        .FirstOrDefaultAsync(c => c.Id == companyId);

                    if (company?.AttendanceSettings?.OfficeLocations != null)
                    {
                        var location = company.AttendanceSettings.OfficeLocations
                            .FirstOrDefault(o => o.Id == applicableSchedule.OfficeLocationId.Value);
                        if (location != null)
                        {
                            officeLocation = new
                            {
                                location.Id,
                                location.Name,
                                location.Address,
                                location.Radius,
                                location.IsActive,
                                Coordinates = new
                                {
                                    location.Coordinates.Lat,
                                    location.Coordinates.Lng
                                }
                            };
                        }
                    }
                }

                var scheduleData = new
                {
                    applicableSchedule.Id,
                    applicableSchedule.ScheduleType,
                    applicableSchedule.DutyHours,
                    applicableSchedule.OfficeLocationId,
                    applicableSchedule.ValidFrom,
                    applicableSchedule.ValidTo,
                    applicableSchedule.DaysOfWeek,
                    OfficeLocation = officeLocation
                };

                return Ok(new
                {
                    success = true,
                    hasDuty = true,
                    schedule = scheduleData
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking today's duty schedule");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Error checking duty schedule",
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// Get user's duty schedules
        /// </summary>
        [HttpGet("user/{userId}")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetUserSchedules(Guid userId, [FromQuery] Guid companyId, [FromQuery] bool activeOnly = true)
        {
            try
            {
                _logger.LogInformation("Getting schedules for user {UserId}, company {CompanyId}, activeOnly: {ActiveOnly}", 
                    userId, companyId, activeOnly);

                var query = _context.DutySchedules
                    .Where(s => s.UserId == userId && s.CompanyId == companyId);

                if (activeOnly)
                {
                    var today = DateTime.UtcNow.Date;
                    query = query.Where(s => s.IsActive &&
                        (s.ValidFrom == null || s.ValidFrom <= today) &&
                        (s.ValidTo == null || s.ValidTo >= today));
                }

                var schedules = await query
                    .OrderByDescending(s => s.ValidFrom)
                    .ToListAsync();

                // Enrich with office location details
                var result = new List<object>();
                var company = await _context.Companies
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                foreach (var schedule in schedules)
                {
                    object officeLocation = null;
                    if (schedule.OfficeLocationId.HasValue && company?.AttendanceSettings?.OfficeLocations != null)
                    {
                        var location = company.AttendanceSettings.OfficeLocations
                            .FirstOrDefault(o => o.Id == schedule.OfficeLocationId.Value);
                        if (location != null)
                        {
                            officeLocation = new
                            {
                                location.Id,
                                location.Name,
                                location.Address,
                                location.Radius,
                                location.IsActive,
                                Coordinates = new
                                {
                                    location.Coordinates.Lat,
                                    location.Coordinates.Lng
                                }
                            };
                        }
                    }

                    result.Add(new
                    {
                        schedule.Id,
                        schedule.UserId,
                        schedule.CompanyId,
                        schedule.ScheduleType,
                        schedule.DutyHours,
                        schedule.OfficeLocationId,
                        schedule.IsActive,
                        schedule.ValidFrom,
                        schedule.ValidTo,
                        schedule.DaysOfWeek,
                        schedule.CreatedAt,
                        schedule.UpdatedAt,
                        OfficeLocation = officeLocation
                    });
                }

                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user schedules");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Error getting schedules",
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// Get upcoming week schedules for user
        /// </summary>
        [HttpGet("upcoming-week")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetUpcomingWeek([FromQuery] Guid userId, [FromQuery] Guid companyId)
        {
            try
            {
                _logger.LogInformation("Getting upcoming week schedules for user {UserId}, company {CompanyId}", userId, companyId);

                var today = DateTime.UtcNow.Date;
                var endDate = today.AddDays(7);

                // Get all active schedules for this user
                var schedules = await _context.DutySchedules
                    .Where(s => s.UserId == userId && s.CompanyId == companyId && s.IsActive)
                    .ToListAsync();

                var result = new List<object>();

                // Get company for office location details
                var company = await _context.Companies
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                // Check each day in the upcoming week
                for (int i = 0; i < 7; i++)
                {
                    var date = today.AddDays(i);
                    var dayOfWeek = (int)date.DayOfWeek;

                    var applicableSchedule = schedules.FirstOrDefault(s =>
                        (s.ValidFrom == null || s.ValidFrom <= date) &&
                        (s.ValidTo == null || s.ValidTo >= date) &&
                        (s.DaysOfWeek == null || s.DaysOfWeek.Contains(dayOfWeek))
                    );

                    object scheduleData = null;
                    if (applicableSchedule != null)
                    {
                        object officeLocation = null;
                        if (applicableSchedule.OfficeLocationId.HasValue && company?.AttendanceSettings?.OfficeLocations != null)
                        {
                            var location = company.AttendanceSettings.OfficeLocations
                                .FirstOrDefault(o => o.Id == applicableSchedule.OfficeLocationId.Value);
                            if (location != null)
                            {
                                officeLocation = new
                                {
                                    location.Id,
                                    location.Name,
                                    location.Address,
                                    location.Radius,
                                    location.IsActive,
                                    Coordinates = new
                                    {
                                        location.Coordinates.Lat,
                                        location.Coordinates.Lng
                                    }
                                };
                            }
                        }

                        scheduleData = new
                        {
                            applicableSchedule.Id,
                            applicableSchedule.ScheduleType,
                            applicableSchedule.DutyHours,
                            applicableSchedule.OfficeLocationId,
                            OfficeLocation = officeLocation
                        };
                    }

                    result.Add(new
                    {
                        Date = date.ToString("yyyy-MM-dd"),
                        DayName = date.ToString("dddd"),
                        HasSchedule = applicableSchedule != null,
                        Schedule = scheduleData
                    });
                }

                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting upcoming week schedules");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Error getting upcoming week schedules",
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// Get all schedules for a company (Admin only)
        /// </summary>
        [HttpGet("company/{companyId}")]
        [Authorize(Roles = "Admin,ADMINISTRATOR")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetCompanySchedules(Guid companyId)
        {
            try
            {
                if (!IsAdmin())
                {
                    return Forbid();
                }

                _logger.LogInformation("Getting all schedules for company {CompanyId}", companyId);

                var schedules = await _context.DutySchedules
                    .Where(s => s.CompanyId == companyId)
                    .Include(s => s.User)
                    .OrderByDescending(s => s.CreatedAt)
                    .ToListAsync();

                // Get company for office location details
                var company = await _context.Companies
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                var result = new List<object>();
                foreach (var schedule in schedules)
                {
                    object officeLocation = null;
                    if (schedule.OfficeLocationId.HasValue && company?.AttendanceSettings?.OfficeLocations != null)
                    {
                        var location = company.AttendanceSettings.OfficeLocations
                            .FirstOrDefault(o => o.Id == schedule.OfficeLocationId.Value);
                        if (location != null)
                        {
                            officeLocation = new
                            {
                                location.Id,
                                location.Name,
                                location.Address,
                                location.Radius,
                                location.IsActive,
                                Coordinates = new
                                {
                                    location.Coordinates.Lat,
                                    location.Coordinates.Lng
                                }
                            };
                        }
                    }

                    result.Add(new
                    {
                        schedule.Id,
                        schedule.UserId,
                        User = schedule.User != null ? new
                        {
                            schedule.User.Id,
                            schedule.User.Name,
                            schedule.User.Email
                        } : null,
                        schedule.CompanyId,
                        schedule.ScheduleType,
                        schedule.DutyHours,
                        schedule.OfficeLocationId,
                        schedule.IsActive,
                        schedule.ValidFrom,
                        schedule.ValidTo,
                        schedule.DaysOfWeek,
                        schedule.CreatedAt,
                        schedule.UpdatedAt,
                        OfficeLocation = officeLocation
                    });
                }

                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting company schedules");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Error getting company schedules",
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// Create a new duty schedule (Admin only)
        /// </summary>
        [HttpPost("create")]
        [Authorize(Roles = "Admin,ADMINISTRATOR")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        public async Task<IActionResult> CreateSchedule([FromBody] CreateDutyScheduleDto request)
        {
            try
            {
                if (!IsAdmin())
                {
                    return Forbid();
                }

                _logger.LogInformation("Creating duty schedule for user {UserId}, company {CompanyId}", 
                    request.UserId, request.CompanyId);

                // Validate user exists
                var user = await _context.Users.FindAsync(request.UserId);
                if (user == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "User not found"
                    });
                }

                // Validate company exists
                var company = await _context.Companies.FindAsync(request.CompanyId);
                if (company == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Company not found"
                    });
                }

                var schedule = new DutySchedule
                {
                    Id = Guid.NewGuid(),
                    UserId = request.UserId,
                    CompanyId = request.CompanyId,
                    ScheduleType = request.ScheduleType ?? "recurring",
                    DutyHours = new DutyHours
                    {
                        StartTime = request.DutyHours?.StartTime ?? "09:00",
                        EndTime = request.DutyHours?.EndTime ?? "17:00",
                        GracePeriod = request.DutyHours?.GracePeriod ?? 15
                    },
                    OfficeLocationId = request.OfficeLocationId,
                    IsActive = true,
                    ValidFrom = request.StartDate != null ? DateTime.Parse(request.StartDate) : DateTime.UtcNow,
                    ValidTo = request.EndDate != null ? DateTime.Parse(request.EndDate) : (DateTime?)null,
                    DaysOfWeek = request.DaysOfWeek ?? new int[] { 1, 2, 3, 4, 5 }, // Default Mon-Fri
                    CreatedAt = DateTime.UtcNow
                };

                _context.DutySchedules.Add(schedule);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = "Duty schedule created successfully",
                    data = schedule
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating duty schedule");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Error creating duty schedule",
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// Delete a duty schedule (Admin only)
        /// </summary>
        [HttpDelete("{scheduleId}")]
        [Authorize(Roles = "Admin,ADMINISTRATOR")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        public async Task<IActionResult> DeleteSchedule(Guid scheduleId)
        {
            try
            {
                if (!IsAdmin())
                {
                    return Forbid();
                }

                _logger.LogInformation("Deleting duty schedule {ScheduleId}", scheduleId);

                var schedule = await _context.DutySchedules.FindAsync(scheduleId);
                if (schedule == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Schedule not found"
                    });
                }

                _context.DutySchedules.Remove(schedule);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = "Duty schedule deleted successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting duty schedule");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Error deleting duty schedule",
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// Get users list for admin (Admin only)
        /// </summary>
        [HttpGet("admin/users/list")]
        [Authorize(Roles = "Admin,ADMINISTRATOR")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetUsersList()
        {
            try
            {
                if (!IsAdmin())
                {
                    return Forbid();
                }

                var userId = GetUserId();

                // Get all companies the admin has access to
                var adminCompanies = await _context.Companies
                    .Where(c => c.OwnerId == userId || c.Users.Any(u => u.Id == userId))
                    .Select(c => c.Id)
                    .ToListAsync();

                // Get all users from those companies
                var users = await _context.Users
                    .Where(u => u.AccessibleCompanies.Any(c => adminCompanies.Contains(c.Id)) ||
                                adminCompanies.Contains(u.Id)) // User might be owner
                    .Select(u => new
                    {
                        u.Id,
                        u.Name,
                        u.Email,
                        u.IsAdmin,
                        u.IsActive
                    })
                    .Distinct()
                    .OrderBy(u => u.Name)
                    .ToListAsync();

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        users = users
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting users list");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Error getting users list",
                    error = ex.Message
                });
            }
        }
    }

    // DTO for creating duty schedule
    public class CreateDutyScheduleDto
    {
        public Guid UserId { get; set; }
        public Guid CompanyId { get; set; }
        public string? ScheduleType { get; set; }
        public DutyHoursDto? DutyHours { get; set; }
        public Guid? OfficeLocationId { get; set; }
        public string? StartDate { get; set; }
        public string? EndDate { get; set; }
        public int[]? DaysOfWeek { get; set; }
        public string? Notes { get; set; }
    }

    public class DutyHoursDto
    {
        public string StartTime { get; set; } = "09:00";
        public string EndTime { get; set; } = "17:00";
        public int GracePeriod { get; set; } = 15;
        public int BreakDuration { get; set; } = 60;
    }
}