using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SkyForge.Data;
using SkyForge.Dto;
using SkyForge.Models;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.UserModel;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SkyForge.Services.AttendanceServices
{
    public class AttendanceService : IAttendanceService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<AttendanceService> _logger;

        public AttendanceService(ApplicationDbContext context, ILogger<AttendanceService> logger)
        {
            _context = context;
            _logger = logger;
        }

        // Haversine formula to calculate distance between two coordinates
        private double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
        {
            const double R = 6371e3; // Earth's radius in meters
            var φ1 = lat1 * Math.PI / 180;
            var φ2 = lat2 * Math.PI / 180;
            var Δφ = (lat2 - lat1) * Math.PI / 180;
            var Δλ = (lon2 - lon1) * Math.PI / 180;

            var a = Math.Sin(Δφ / 2) * Math.Sin(Δφ / 2) +
                    Math.Cos(φ1) * Math.Cos(φ2) *
                    Math.Sin(Δλ / 2) * Math.Sin(Δλ / 2);
            var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));

            return R * c; // Distance in meters
        }

        public async Task<Attendance> ClockInAsync(Guid userId, Guid companyId, LocationDto location)
        {
            try
            {
                _logger.LogInformation("Clock-in request: UserId={UserId}, CompanyId={CompanyId}", userId, companyId);

                if (location == null || location.Lat == 0 || location.Lng == 0)
                {
                    throw new ArgumentException("Location data is required");
                }

                var today = DateTime.UtcNow.Date;

                // Check if already clocked in today
                var existingAttendance = await _context.Attendances
                    .FirstOrDefaultAsync(a => a.UserId == userId && a.Date == today && a.CompanyId == companyId);

                if (existingAttendance != null && existingAttendance.ClockIn != null)
                {
                    throw new InvalidOperationException("Already clocked in today");
                }

                // Get company
                var company = await _context.Companies
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                if (company == null)
                {
                    throw new KeyNotFoundException("Company not found");
                }

                // Initialize attendance settings if not exists
                if (company.AttendanceSettings == null)
                {
                    company.AttendanceSettings = new CompanyAttendanceSettings
                    {
                        GeoFencingEnabled = true,
                        OfficeLocations = new List<OfficeLocation>(),
                        WorkingHours = new WorkingHours
                        {
                            StartTime = "09:00",
                            EndTime = "17:00",
                            GracePeriod = 15
                        }
                    };
                    await _context.SaveChangesAsync();
                }

                // Check if geo-fencing is enabled
                if (!company.AttendanceSettings.GeoFencingEnabled)
                {
                    throw new InvalidOperationException("Attendance geo-fencing is not enabled for this company");
                }

                // Check if office locations exist
                var officeLocations = company.AttendanceSettings.OfficeLocations ?? new List<OfficeLocation>();
                if (!officeLocations.Any())
                {
                    throw new InvalidOperationException("No office locations configured");
                }

                // Check duty schedule
                var schedules = await _context.DutySchedules
                    .Where(s => s.UserId == userId && s.CompanyId == companyId && s.IsActive)
                    .ToListAsync();

                var applicableSchedule = schedules.FirstOrDefault(s =>
                    s.ValidFrom <= DateTime.UtcNow &&
                    (s.ValidTo == null || s.ValidTo >= DateTime.UtcNow) &&
                    (s.DaysOfWeek == null || s.DaysOfWeek.Contains((int)DateTime.UtcNow.DayOfWeek))
                );

                if (applicableSchedule == null)
                {
                    throw new InvalidOperationException("No duty schedule assigned for today. Please contact your supervisor.");
                }

                // Get duty hours from schedule
                var dutyHours = applicableSchedule.DutyHours;
                var startTimeStr = dutyHours.StartTime;
                var endTimeStr = dutyHours.EndTime;
                var gracePeriod = dutyHours.GracePeriod;

                // Check office location
                OfficeLocation nearestOffice = null;
                double minDistance = double.MaxValue;
                bool isAtCorrectOffice = false;

                // If schedule has specific office location, check that one first
                if (applicableSchedule.OfficeLocationId.HasValue)
                {
                    var scheduledOffice = officeLocations.FirstOrDefault(o =>
                        o.Id == applicableSchedule.OfficeLocationId.Value && o.IsActive);

                    if (scheduledOffice != null)
                    {
                        var distance = CalculateDistance(
                            location.Lat,
                            location.Lng,
                            scheduledOffice.Coordinates.Lat ?? 0,
                            scheduledOffice.Coordinates.Lng ?? 0
                        );

                        if (distance <= scheduledOffice.Radius)
                        {
                            nearestOffice = scheduledOffice;
                            minDistance = distance;
                            isAtCorrectOffice = true;
                        }
                    }
                }

                // If not at scheduled office or no specific office, check all offices
                if (!isAtCorrectOffice)
                {
                    foreach (var office in officeLocations.Where(o => o.IsActive))
                    {
                        var distance = CalculateDistance(
                            location.Lat,
                            location.Lng,
                            office.Coordinates.Lat ?? 0,
                            office.Coordinates.Lng ?? 0
                        );

                        if (distance <= office.Radius && distance < minDistance)
                        {
                            minDistance = distance;
                            nearestOffice = office;
                        }
                    }

                    if (nearestOffice == null)
                    {
                        throw new InvalidOperationException(
                            $"You must be at an office location to clock in. " +
                            $"Your current location is {minDistance:F0}m away from the nearest office."
                        );
                    }
                }

                // Check duty timing
                var currentTime = DateTime.UtcNow;
                var startParts = startTimeStr.Split(':').Select(int.Parse).ToArray();
                var startTime = new DateTime(today.Year, today.Month, today.Day, startParts[0], startParts[1], 0);
                var lateTime = startTime.AddMinutes(gracePeriod);

                int lateMinutes = 0;
                string status = "present";

                if (currentTime > lateTime)
                {
                    lateMinutes = (int)Math.Round((currentTime - startTime).TotalMinutes);
                    if (lateMinutes > 60)
                    {
                        status = "half_day";
                    }
                }

                // Create or update attendance record
                Attendance attendance;
                if (existingAttendance != null)
                {
                    attendance = existingAttendance;
                }
                else
                {
                    attendance = new Attendance
                    {
                        Id = Guid.NewGuid(),
                        UserId = userId,
                        CompanyId = companyId,
                        Date = today,
                        DutyScheduleId = applicableSchedule.Id,
                        ScheduledDutyHours = new ScheduledDutyHours
                        {
                            StartTime = startTimeStr,
                            EndTime = endTimeStr,
                            GracePeriod = gracePeriod,
                            OfficeLocationId = applicableSchedule.OfficeLocationId ?? nearestOffice.Id
                        }
                    };
                }

                attendance.ClockIn = new ClockInData
                {
                    Time = currentTime,
                    Location = new LocationData
                    {
                        Lat = location.Lat,
                        Lng = location.Lng,
                        Accuracy = location.Accuracy ?? 0
                    },
                    OfficeLocationId = nearestOffice.Id
                };
                attendance.Status = status;
                attendance.LateMinutes = lateMinutes;
                attendance.Source = "geo_fence";
                attendance.UpdatedAt = DateTime.UtcNow;

                if (applicableSchedule.OfficeLocationId.HasValue &&
                    applicableSchedule.OfficeLocationId.Value != nearestOffice.Id)
                {
                    attendance.Notes = $"Clocked in at {nearestOffice.Name} instead of scheduled office";
                }

                if (existingAttendance == null)
                {
                    await _context.Attendances.AddAsync(attendance);
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("Clock-in successful: UserId={UserId}, Office={OfficeName}, Status={Status}",
                    userId, nearestOffice.Name, status);

                return attendance;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Clock-in error for user {UserId}", userId);
                throw;
            }
        }

        public async Task<Attendance> ClockOutAsync(Guid userId, Guid companyId, LocationDto location)
        {
            try
            {
                _logger.LogInformation("Clock-out request: UserId={UserId}, CompanyId={CompanyId}", userId, companyId);

                if (location == null || location.Lat == 0 || location.Lng == 0)
                {
                    throw new ArgumentException("Location data is required");
                }

                var today = DateTime.UtcNow.Date;

                // Find today's attendance
                var attendance = await _context.Attendances
                    .FirstOrDefaultAsync(a =>
                        a.UserId == userId &&
                        a.Date == today &&
                        a.CompanyId == companyId &&
                        a.ClockIn != null &&
                        a.ClockOut == null);

                if (attendance == null)
                {
                    throw new InvalidOperationException("No active attendance found. Please clock in first.");
                }

                // Get company
                var company = await _context.Companies
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                if (company == null)
                {
                    throw new KeyNotFoundException("Company not found");
                }

                // Check location if geo-fencing is enabled
                Guid? officeLocationId = attendance.ClockIn.OfficeLocationId;
                bool isAtOffice = true;

                if (company.AttendanceSettings?.GeoFencingEnabled == true)
                {
                    isAtOffice = false;
                    var officeLocations = company.AttendanceSettings.OfficeLocations ?? new List<OfficeLocation>();

                    foreach (var office in officeLocations.Where(o => o.IsActive))
                    {
                        var distance = CalculateDistance(
                            location.Lat,
                            location.Lng,
                            office.Coordinates.Lat ?? 0,
                            office.Coordinates.Lng ?? 0
                        );

                        if (distance <= office.Radius)
                        {
                            isAtOffice = true;
                            officeLocationId = office.Id;
                            break;
                        }
                    }

                    if (!isAtOffice)
                    {
                        throw new InvalidOperationException("You must be at an office location to clock out");
                    }
                }

                var clockOutTime = DateTime.UtcNow;
                var clockInTime = attendance.ClockIn.Time;

                // Calculate total hours
                var totalMs = (clockOutTime - clockInTime).TotalMilliseconds;
                var totalHours = totalMs / (1000 * 60 * 60);

                // Calculate early departure and overtime
                int earlyDepartureMinutes = 0;
                decimal overtime = 0;

                var workingHours = company.AttendanceSettings?.WorkingHours ?? new WorkingHours();
                var endTimeStr = workingHours.EndTime ?? "17:00";

                if (!string.IsNullOrEmpty(endTimeStr) && endTimeStr.Contains(':'))
                {
                    try
                    {
                        var endParts = endTimeStr.Split(':').Select(int.Parse).ToArray();
                        var endTime = new DateTime(today.Year, today.Month, today.Day, endParts[0], endParts[1], 0);

                        if (clockOutTime < endTime)
                        {
                            earlyDepartureMinutes = (int)Math.Round((endTime - clockOutTime).TotalMinutes);
                            if (earlyDepartureMinutes > 60)
                            {
                                attendance.Status = "half_day";
                            }
                        }
                        else if (clockOutTime > endTime)
                        {
                            overtime = Convert.ToDecimal((clockOutTime - endTime).TotalHours);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Error parsing end time: {EndTime}", endTimeStr);
                    }
                }

                // Update attendance
                attendance.ClockOut = new ClockOutData
                {
                    Time = clockOutTime,
                    Location = new LocationData
                    {
                        Lat = location.Lat,
                        Lng = location.Lng,
                        Accuracy = location.Accuracy ?? 0
                    },
                    OfficeLocationId = officeLocationId
                };
                attendance.TotalHours = (decimal)Math.Round(totalHours, 2);
                attendance.EarlyDepartureMinutes = earlyDepartureMinutes;
                attendance.Overtime = overtime;
                attendance.UpdatedAt = DateTime.UtcNow;

                // Update status based on hours worked
                if (string.IsNullOrEmpty(attendance.Status) || attendance.Status == "absent")
                {
                    if (totalHours < 4)
                    {
                        attendance.Status = "half_day";
                    }
                    else
                    {
                        attendance.Status = "present";
                    }
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("Clock-out successful: UserId={UserId}, TotalHours={TotalHours}, Status={Status}",
                    userId, attendance.TotalHours, attendance.Status);

                return attendance;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Clock-out error for user {UserId}", userId);
                throw;
            }
        }

        public async Task<List<TodayStatusResponseDto>> GetTodayStatusAsync(Guid userId)
        {
            try
            {
                var today = DateTime.UtcNow.Date;

                // Use AccessibleCompanies directly since Companies is [NotMapped]
                var user = await _context.Users
                    .Include(u => u.AccessibleCompanies)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                {
                    throw new KeyNotFoundException("User not found");
                }

                // Get companies from AccessibleCompanies
                var companyIds = user.AccessibleCompanies?.Select(c => c.Id).ToList() ?? new List<Guid>();

                if (!companyIds.Any())
                {
                    return new List<TodayStatusResponseDto>();
                }

                var result = new List<TodayStatusResponseDto>();

                foreach (var companyId in companyIds)
                {
                    var company = await _context.Companies
                        .FirstOrDefaultAsync(c => c.Id == companyId);

                    if (company == null) continue;

                    var attendance = await _context.Attendances
                        .FirstOrDefaultAsync(a =>
                            a.UserId == userId &&
                            a.Date == today &&
                            a.CompanyId == companyId);

                    result.Add(new TodayStatusResponseDto
                    {
                        Company = new CompanyInfoDto
                        {
                            Id = company.Id,
                            Name = company.Name,
                            AttendanceSettings = company.AttendanceSettings
                        },
                        HasClockedIn = attendance?.ClockIn != null,
                        HasClockedOut = attendance?.ClockOut != null,
                        ClockIn = attendance?.ClockIn?.Time,
                        ClockOut = attendance?.ClockOut?.Time,
                        TotalHours = attendance?.TotalHours ?? 0,
                        Status = attendance?.Status ?? "absent",
                        LateMinutes = attendance?.LateMinutes ?? 0,
                        Overtime = attendance?.Overtime ?? 0
                    });
                }

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting today status for user {UserId}", userId);
                throw;
            }
        }

        public async Task<AttendanceResponseDto> GetMyAttendanceAsync(Guid userId, DateTime? startDate, DateTime? endDate, int page, int limit, Guid? companyId)
        {
            try
            {
                var query = _context.Attendances
                    .Include(a => a.Company)
                    .Include(a => a.User)
                    .Where(a => a.UserId == userId);

                if (companyId.HasValue)
                {
                    query = query.Where(a => a.CompanyId == companyId.Value);
                }

                if (startDate.HasValue)
                {
                    var start = startDate.Value.Date;
                    query = query.Where(a => a.Date >= start);
                }

                if (endDate.HasValue)
                {
                    var end = endDate.Value.Date.AddDays(1).AddTicks(-1);
                    query = query.Where(a => a.Date <= end);
                }

                var total = await query.CountAsync();
                var items = await query
                    .OrderByDescending(a => a.Date)
                    .Skip((page - 1) * limit)
                    .Take(limit)
                    .ToListAsync();

                // Create response with all properties properly set
                var response = new AttendanceResponseDto
                {
                    Id = Guid.Empty,
                    UserId = userId,
                    UserName = string.Empty,
                    CompanyId = Guid.Empty,
                    CompanyName = string.Empty,
                    Date = DateTime.UtcNow,
                    Status = string.Empty,
                    TotalHours = 0,
                    Overtime = 0,
                    LateMinutes = 0,
                    EarlyDepartureMinutes = 0,
                    Source = string.Empty,
                    CreatedAt = DateTime.UtcNow,
                    Attendance = items.Select(MapToResponseDto).ToList(),
                    Pagination = new PaginationInfo
                    {
                        Page = page,
                        Limit = limit,
                        Total = total,
                        Pages = (int)Math.Ceiling((double)total / limit)
                    },
                    Summary = await GetAttendanceStatsAsync(query)
                };

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting attendance for user {UserId}", userId);
                throw;
            }
        }
        public async Task<CompanyAttendanceSettings> GetCompanyDataAsync(Guid companyId)
        {
            var company = await _context.Companies
                .FirstOrDefaultAsync(c => c.Id == companyId);

            if (company == null)
            {
                throw new KeyNotFoundException("Company not found");
            }

            return company.AttendanceSettings ?? new CompanyAttendanceSettings
            {
                GeoFencingEnabled = false,
                OfficeLocations = new List<OfficeLocation>(),
                WorkingHours = new WorkingHours
                {
                    StartTime = "09:00",
                    EndTime = "17:00",
                    GracePeriod = 15
                }
            };
        }

        public async Task<CompanyAttendanceResponseDto> GetCompanyAttendanceAsync(Guid companyId, Guid? userId, string? status, DateTime? startDate, DateTime? endDate, int page, int limit)
        {
            try
            {
                var query = _context.Attendances
                    .Include(a => a.User)
                    .Include(a => a.Company)
                    .Where(a => a.CompanyId == companyId);

                if (userId.HasValue)
                {
                    query = query.Where(a => a.UserId == userId.Value);
                }

                if (!string.IsNullOrEmpty(status))
                {
                    query = query.Where(a => a.Status == status);
                }

                // Default to current month if no dates provided
                if (!startDate.HasValue)
                {
                    var now = DateTime.UtcNow;
                    startDate = new DateTime(now.Year, now.Month, 1);
                }

                if (!endDate.HasValue)
                {
                    var now = DateTime.UtcNow;
                    endDate = new DateTime(now.Year, now.Month + 1, 1).AddDays(-1);
                }

                var start = startDate.Value.Date;
                var end = endDate.Value.Date.AddDays(1).AddTicks(-1);
                query = query.Where(a => a.Date >= start && a.Date <= end);

                var total = await query.CountAsync();
                var items = await query
                    .OrderByDescending(a => a.Date)
                    .ThenByDescending(a => a.ClockIn != null ? a.ClockIn.Time : a.CreatedAt)
                    .Skip((page - 1) * limit)
                    .Take(limit)
                    .ToListAsync();

                // Get users for this company - use AccessibleCompanies
                var users = await _context.Users
                    .Where(u => u.AccessibleCompanies.Any(c => c.Id == companyId))
                    .Select(u => new UserSummaryDto
                    {
                        Id = u.Id,
                        Name = u.Name,
                        Email = u.Email
                    })
                    .OrderBy(u => u.Name)
                    .ToListAsync();

                return new CompanyAttendanceResponseDto
                {
                    Attendance = items.Select(MapToResponseDto).ToList(),
                    Users = users,
                    Summary = await GetAttendanceStatsAsync(query),
                    Pagination = new PaginationInfo
                    {
                        Page = page,
                        Limit = limit,
                        Total = total,
                        Pages = (int)Math.Ceiling((double)total / limit)
                    }
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting company attendance for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<Attendance> AdjustAttendanceAsync(Guid attendanceId, Guid adminId, AdjustAttendanceDto adjustments)
        {
            try
            {
                var attendance = await _context.Attendances
                    .Include(a => a.User)
                    .FirstOrDefaultAsync(a => a.Id == attendanceId);

                if (attendance == null)
                {
                    throw new KeyNotFoundException("Attendance record not found");
                }

                if (adjustments.ClockInTime.HasValue)
                {
                    if (attendance.ClockIn == null)
                    {
                        attendance.ClockIn = new ClockInData();
                    }
                    attendance.ClockIn.Time = adjustments.ClockInTime.Value;

                    if (adjustments.ClockInLocation != null)
                    {
                        attendance.ClockIn.Location = new LocationData
                        {
                            Lat = adjustments.ClockInLocation.Lat,
                            Lng = adjustments.ClockInLocation.Lng,
                            Accuracy = adjustments.ClockInLocation.Accuracy ?? 0,
                            Address = adjustments.ClockInLocation.Address
                        };
                    }
                }

                if (adjustments.ClockOutTime.HasValue)
                {
                    if (attendance.ClockOut == null)
                    {
                        attendance.ClockOut = new ClockOutData();
                    }
                    attendance.ClockOut.Time = adjustments.ClockOutTime.Value;

                    if (adjustments.ClockOutLocation != null)
                    {
                        attendance.ClockOut.Location = new LocationData
                        {
                            Lat = adjustments.ClockOutLocation.Lat,
                            Lng = adjustments.ClockOutLocation.Lng,
                            Accuracy = adjustments.ClockOutLocation.Accuracy ?? 0,
                            Address = adjustments.ClockOutLocation.Address
                        };
                    }
                }

                if (!string.IsNullOrEmpty(adjustments.Status))
                {
                    attendance.Status = adjustments.Status;
                }

                // Recalculate total hours if both times are present
                if (attendance.ClockIn != null && attendance.ClockOut != null)
                {
                    var totalMs = (attendance.ClockOut.Time - attendance.ClockIn.Time).TotalMilliseconds;
                    attendance.TotalHours = (decimal)Math.Round(totalMs / (1000 * 60 * 60), 2);
                }

                if (!string.IsNullOrEmpty(adjustments.Notes))
                {
                    attendance.Notes = adjustments.Notes;
                }

                attendance.AdjustedBy = adminId;
                attendance.AdjustedAt = DateTime.UtcNow;
                attendance.Source = "admin";
                attendance.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Attendance {AttendanceId} adjusted by admin {AdminId}", attendanceId, adminId);
                return attendance;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adjusting attendance {AttendanceId}", attendanceId);
                throw;
            }
        }

        public async Task<BulkUpdateResultDto> BulkUpdateAttendanceAsync(Guid companyId, Guid adminId, List<BulkAttendanceUpdateItem> updates)
        {
            try
            {
                var result = new BulkUpdateResultDto
                {
                    Total = updates.Count,
                    SuccessItems = new List<BulkUpdateSuccessItem>(),
                    FailedItems = new List<BulkUpdateFailedItem>()
                };

                foreach (var update in updates)
                {
                    try
                    {
                        // Check if user belongs to company - use AccessibleCompanies
                        var user = await _context.Users
                            .FirstOrDefaultAsync(u => u.Id == update.UserId && u.AccessibleCompanies.Any(c => c.Id == companyId));

                        if (user == null)
                        {
                            result.FailedItems.Add(new BulkUpdateFailedItem
                            {
                                UserId = update.UserId,
                                Date = update.Date,
                                Status = update.Status,
                                Error = "User not found or not in company"
                            });
                            continue;
                        }

                        var attendanceDate = update.Date.Date;

                        // Find or create attendance record
                        var attendance = await _context.Attendances
                            .FirstOrDefaultAsync(a =>
                                a.UserId == update.UserId &&
                                a.CompanyId == companyId &&
                                a.Date == attendanceDate);

                        if (attendance != null)
                        {
                            // Update existing
                            attendance.Status = update.Status;
                            attendance.AdjustedBy = adminId;
                            attendance.AdjustedAt = DateTime.UtcNow;
                            attendance.Notes = update.Notes ?? attendance.Notes;
                            attendance.Source = "admin";
                            attendance.UpdatedAt = DateTime.UtcNow;
                        }
                        else
                        {
                            // Create new
                            attendance = new Attendance
                            {
                                Id = Guid.NewGuid(),
                                UserId = update.UserId,
                                CompanyId = companyId,
                                Date = attendanceDate,
                                Status = update.Status,
                                AdjustedBy = adminId,
                                AdjustedAt = DateTime.UtcNow,
                                Notes = update.Notes,
                                Source = "admin",
                                CreatedAt = DateTime.UtcNow
                            };
                            await _context.Attendances.AddAsync(attendance);
                        }

                        await _context.SaveChangesAsync();

                        result.SuccessItems.Add(new BulkUpdateSuccessItem
                        {
                            UserId = update.UserId,
                            Date = attendanceDate,
                            Status = update.Status,
                            AttendanceId = attendance.Id
                        });
                    }
                    catch (Exception ex)
                    {
                        result.FailedItems.Add(new BulkUpdateFailedItem
                        {
                            UserId = update.UserId,
                            Date = update.Date,
                            Status = update.Status,
                            Error = ex.Message
                        });
                    }
                }

                result.Success = result.SuccessItems.Count;
                result.Failed = result.FailedItems.Count;

                _logger.LogInformation("Bulk update completed: {Success} success, {Failed} failed",
                    result.Success, result.Failed);

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in bulk update for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<ReportResponseDto> GetReportsAsync(Guid companyId, DateTime? startDate, DateTime? endDate, string reportType)
        {
            try
            {
                var company = await _context.Companies
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                if (company == null)
                {
                    throw new KeyNotFoundException("Company not found");
                }

                var start = (startDate ?? DateTime.UtcNow.AddMonths(-1)).Date;
                var end = (endDate ?? DateTime.UtcNow).Date.AddDays(1).AddTicks(-1);

                object reportData;

                switch (reportType.ToLower())
                {
                    case "daily":
                        reportData = await GetDailyReportAsync(companyId, start, end);
                        break;
                    case "user":
                        reportData = await GetUserReportAsync(companyId, start, end);
                        break;
                    case "summary":
                        reportData = await GetSummaryReportAsync(companyId, start, end);
                        break;
                    default:
                        throw new ArgumentException("Invalid report type");
                }

                return new ReportResponseDto
                {
                    Company = new CompanyInfoDto
                    {
                        Id = company.Id,
                        Name = company.Name,
                        AttendanceSettings = company.AttendanceSettings
                    },
                    ReportType = reportType,
                    DateRange = new DateRangeDto
                    {
                        Start = start.ToString("yyyy-MM-dd"),
                        End = end.ToString("yyyy-MM-dd"),
                        StartDate = start,
                        EndDate = end
                    },
                    Report = reportData
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating reports for company {CompanyId}", companyId);
                throw;
            }
        }

        private async Task<List<object>> GetDailyReportAsync(Guid companyId, DateTime start, DateTime end)
        {
            return await _context.Attendances
                .Where(a => a.CompanyId == companyId && a.Date >= start && a.Date <= end)
                .GroupBy(a => new { Date = a.Date.Date, Status = a.Status })
                .Select(g => new
                {
                    Date = g.Key.Date.ToString("yyyy-MM-dd"),
                    Status = g.Key.Status,
                    Count = g.Count(),
                    AvgHours = g.Average(a => a.TotalHours),
                    TotalHours = g.Sum(a => a.TotalHours),
                    Users = g.Select(a => a.UserId).Distinct()
                })
                .GroupBy(g => g.Date)
                .Select(g => new
                {
                    Date = g.Key,
                    Statuses = g.Select(s => new
                    {
                        Status = s.Status,
                        Count = s.Count,
                        AvgHours = s.AvgHours
                    }),
                    TotalUsers = g.SelectMany(s => s.Users).Distinct().Count(),
                    TotalHours = g.Sum(s => s.TotalHours)
                })
                .OrderByDescending(g => g.Date)
                .ToListAsync()
                .ContinueWith(t => t.Result.Cast<object>().ToList());
        }

        private async Task<List<object>> GetUserReportAsync(Guid companyId, DateTime start, DateTime end)
        {
            return await _context.Attendances
                .Where(a => a.CompanyId == companyId && a.Date >= start && a.Date <= end)
                .Include(a => a.User)
                .GroupBy(a => a.UserId)
                .Select(g => new
                {
                    UserId = g.Key,
                    Name = g.FirstOrDefault().User.Name,
                    Email = g.FirstOrDefault().User.Email,
                    Present = g.Count(a => a.Status == "present"),
                    Absent = g.Count(a => a.Status == "absent"),
                    HalfDay = g.Count(a => a.Status == "half_day"),
                    TotalDays = g.Count(),
                    AvgHours = g.Average(a => a.TotalHours),
                    TotalHours = g.Sum(a => a.TotalHours),
                    TotalLateMinutes = g.Sum(a => a.LateMinutes),
                    TotalOvertime = g.Sum(a => a.Overtime)
                })
                .OrderBy(g => g.Name)
                .ToListAsync()
                .ContinueWith(t => t.Result.Cast<object>().ToList());
        }

        private async Task<object> GetSummaryReportAsync(Guid companyId, DateTime start, DateTime end)
        {
            return await _context.Attendances
                .Where(a => a.CompanyId == companyId && a.Date >= start && a.Date <= end)
                .GroupBy(a => 1)
                .Select(g => new
                {
                    TotalRecords = g.Count(),
                    Present = g.Count(a => a.Status == "present"),
                    Absent = g.Count(a => a.Status == "absent"),
                    HalfDay = g.Count(a => a.Status == "half_day"),
                    AvgHours = g.Average(a => a.TotalHours),
                    TotalHours = g.Sum(a => a.TotalHours),
                    AvgLate = g.Average(a => a.LateMinutes),
                    TotalOvertime = g.Sum(a => a.Overtime),
                    TotalUsers = g.Select(a => a.UserId).Distinct().Count()
                })
                .FirstOrDefaultAsync();
        }

        private async Task<List<AttendanceSummaryDto>> GetAttendanceStatsAsync(IQueryable<Attendance> query)
        {
            return await query
                .GroupBy(a => a.Status)
                .Select(g => new AttendanceSummaryDto
                {
                    Status = g.Key,
                    Count = g.Count(),
                    AvgHours = g.Average(a => a.TotalHours)
                })
                .ToListAsync();
        }

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

        public async Task<OfficeLocation> AddOfficeLocationAsync(Guid companyId, Guid adminId, OfficeLocationRequestDto request)
        {
            try
            {
                var company = await _context.Companies
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                if (company == null)
                {
                    throw new KeyNotFoundException("Company not found");
                }

                // Initialize attendance settings if not exists
                if (company.AttendanceSettings == null)
                {
                    company.AttendanceSettings = new CompanyAttendanceSettings
                    {
                        GeoFencingEnabled = false,
                        OfficeLocations = new List<OfficeLocation>(),
                        WorkingHours = new WorkingHours
                        {
                            StartTime = "09:00",
                            EndTime = "17:00",
                            GracePeriod = 15
                        }
                    };
                }

                if (company.AttendanceSettings.OfficeLocations == null)
                {
                    company.AttendanceSettings.OfficeLocations = new List<OfficeLocation>();
                }

                var newLocation = new OfficeLocation
                {
                    Name = request.Name,
                    Coordinates = new Coordinates
                    {
                        Lat = request.Coordinates.Lat,
                        Lng = request.Coordinates.Lng
                    },
                    Radius = request.Radius > 0 ? request.Radius : 100,
                    Address = request.Address ?? string.Empty,
                    IsActive = true
                };

                company.AttendanceSettings.OfficeLocations.Add(newLocation);

                // If this is the first location, enable geo-fencing
                if (company.AttendanceSettings.OfficeLocations.Count == 1)
                {
                    company.AttendanceSettings.GeoFencingEnabled = true;
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("Office location added: CompanyId={CompanyId}, LocationId={LocationId}, AdminId={AdminId}",
                    companyId, newLocation.Id, adminId);

                return newLocation;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding office location for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<OfficeLocation> UpdateOfficeLocationAsync(Guid locationId, Guid companyId, Guid adminId, UpdateOfficeLocationDto updates)
        {
            try
            {
                var company = await _context.Companies
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                if (company == null)
                {
                    throw new KeyNotFoundException("Company not found");
                }

                if (company.AttendanceSettings?.OfficeLocations == null)
                {
                    throw new KeyNotFoundException("Office locations not found");
                }

                var location = company.AttendanceSettings.OfficeLocations
                    .FirstOrDefault(l => l.Id == locationId);

                if (location == null)
                {
                    throw new KeyNotFoundException("Office location not found");
                }

                if (!string.IsNullOrEmpty(updates.Name))
                {
                    location.Name = updates.Name;
                }

                if (updates.Coordinates != null)
                {
                    location.Coordinates.Lat = updates.Coordinates.Lat;
                    location.Coordinates.Lng = updates.Coordinates.Lng;
                }

                if (updates.Radius.HasValue && updates.Radius.Value > 0)
                {
                    location.Radius = updates.Radius.Value;
                }

                if (!string.IsNullOrEmpty(updates.Address))
                {
                    location.Address = updates.Address;
                }

                if (updates.IsActive.HasValue)
                {
                    location.IsActive = updates.IsActive.Value;
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("Office location updated: LocationId={LocationId}, AdminId={AdminId}",
                    locationId, adminId);

                return location;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating office location {LocationId}", locationId);
                throw;
            }
        }

        public async Task<bool> DeleteOfficeLocationAsync(Guid locationId, Guid companyId, Guid adminId)
        {
            try
            {
                var company = await _context.Companies
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                if (company == null)
                {
                    throw new KeyNotFoundException("Company not found");
                }

                if (company.AttendanceSettings?.OfficeLocations == null)
                {
                    throw new KeyNotFoundException("Office locations not found");
                }

                var location = company.AttendanceSettings.OfficeLocations
                    .FirstOrDefault(l => l.Id == locationId);

                if (location == null)
                {
                    throw new KeyNotFoundException("Office location not found");
                }

                company.AttendanceSettings.OfficeLocations.Remove(location);

                // If no locations left, disable geo-fencing
                if (!company.AttendanceSettings.OfficeLocations.Any())
                {
                    company.AttendanceSettings.GeoFencingEnabled = false;
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("Office location deleted: LocationId={LocationId}, AdminId={AdminId}",
                    locationId, adminId);

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting office location {LocationId}", locationId);
                throw;
            }
        }

        public async Task<OfficeLocation> GetOfficeLocationAsync(Guid locationId, Guid companyId)
        {
            var company = await _context.Companies
                .FirstOrDefaultAsync(c => c.Id == companyId);

            if (company == null)
            {
                throw new KeyNotFoundException("Company not found");
            }

            if (company.AttendanceSettings?.OfficeLocations == null)
            {
                throw new KeyNotFoundException("Office locations not found");
            }

            var location = company.AttendanceSettings.OfficeLocations
                .FirstOrDefault(l => l.Id == locationId);

            if (location == null)
            {
                throw new KeyNotFoundException("Office location not found");
            }

            return location;
        }

        public async Task<bool> ToggleGeoFencingAsync(Guid companyId, Guid adminId, bool enabled)
        {
            try
            {
                var company = await _context.Companies
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                if (company == null)
                {
                    throw new KeyNotFoundException("Company not found");
                }

                if (company.AttendanceSettings == null)
                {
                    company.AttendanceSettings = new CompanyAttendanceSettings
                    {
                        GeoFencingEnabled = enabled,
                        OfficeLocations = new List<OfficeLocation>(),
                        WorkingHours = new WorkingHours
                        {
                            StartTime = "09:00",
                            EndTime = "17:00",
                            GracePeriod = 15
                        }
                    };
                }
                else
                {
                    company.AttendanceSettings.GeoFencingEnabled = enabled;
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("Geo-fencing toggled: CompanyId={CompanyId}, Enabled={Enabled}, AdminId={AdminId}",
                    companyId, enabled, adminId);

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error toggling geo-fencing for company {CompanyId}", companyId);
                throw;
            }
        }
    }
}