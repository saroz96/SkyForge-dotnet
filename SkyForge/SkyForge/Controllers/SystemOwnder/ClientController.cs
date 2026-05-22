using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkyForge.Data;
using SkyForge.Models.CompanyModel;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using SkyForge.Models.Shared;

namespace SkyForge.Controllers.SystemOwnder
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ClientController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<ClientController> _logger;

        public ClientController(
            ApplicationDbContext context,
            ILogger<ClientController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// GET: api/client/clients
        /// Fetches and displays all companies (clients)
        /// </summary>
        [HttpGet("clients")]
        public async Task<IActionResult> GetAllClients()
        {
            try
            {
                _logger.LogInformation("=== GetAllClients Started ===");

                // Check if it's an API/JSON request (from React/Angular/etc.)
                var acceptHeader = Request.Headers["Accept"].ToString();
                bool isJsonRequest = acceptHeader.Contains("application/json");

                // Get all companies from database
                var clients = await _context.Companies
                    .Include(c => c.Owner)
                    .Include(c => c.FiscalYears)
                    .OrderBy(c => c.Name)
                    .Select(c => new
                    {
                        id = c.Id,
                        name = c.Name,
                        email = c.Email,
                        phone = c.Phone,
                        address = c.Address,
                        city = c.City,
                        state = c.State,
                        country = c.Country,
                        pan = c.Pan,
                        ward = c.Ward,
                        tradeType = c.TradeType.ToString(),
                        contactPerson = c.Owner != null ? new
                        {
                            id = c.Owner.Id,
                            name = c.Owner.Name,
                            email = c.Owner.Email,
                        } : null,
                        status = "active",
                        dateFormat = c.DateFormat.ToString(),
                        renewalDate = c.RenewalDate,
                        vatEnabled = c.VatEnabled,
                        storeManagement = c.StoreManagement,
                        createdAt = c.CreatedAt,
                        updatedAt = c.UpdatedAt,
                        fiscalYearCount = c.FiscalYears.Count
                    })
                    .ToListAsync();

                _logger.LogInformation($"Successfully fetched {clients.Count} clients");

                if (isJsonRequest)
                {
                    return Ok(new
                    {
                        success = true,
                        message = "Clients fetched successfully",
                        data = clients,
                        count = clients.Count
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = "Clients fetched successfully",
                    data = clients,
                    count = clients.Count,
                    isHtmlRequest = true
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching companies");
                var acceptHeader = Request.Headers["Accept"].ToString();
                bool isJsonRequest = acceptHeader.Contains("application/json");

                if (isJsonRequest)
                {
                    return StatusCode(500, new
                    {
                        success = false,
                        message = "Could not fetch clients. Please try again.",
                        error = ex.Message
                    });
                }

                return StatusCode(500, new
                {
                    success = false,
                    message = "Could not fetch clients. Please try again.",
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// GET: api/client/clients/search
        /// Searches clients by name, email, or phone
        /// </summary>
        [HttpGet("clients/search")]
        public async Task<IActionResult> SearchClients([FromQuery] string term)
        {
            try
            {
                _logger.LogInformation($"=== SearchClients Started with term: {term} ===");

                if (string.IsNullOrWhiteSpace(term))
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Search term is required"
                    });
                }

                var clients = await _context.Companies
                    .Where(c => c.Name.Contains(term) ||
                                c.Email.Contains(term) ||
                                c.Phone.Contains(term) ||
                                c.Pan.Contains(term))
                    .OrderBy(c => c.Name)
                    .Select(c => new
                    {
                        id = c.Id,
                        name = c.Name,
                        email = c.Email,
                        phone = c.Phone,
                        pan = c.Pan,
                        city = c.City,
                        tradeType = c.TradeType.ToString(),
                        status = "active"
                    })
                    .ToListAsync();

                return Ok(new
                {
                    success = true,
                    message = $"Found {clients.Count} clients matching '{term}'",
                    data = clients,
                    count = clients.Count,
                    searchTerm = term
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error searching clients with term: {term}");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Could not search clients. Please try again.",
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// GET: api/client/clients/paginated
        /// Fetches clients with pagination
        /// </summary>
        [HttpGet("clients/paginated")]
        public async Task<IActionResult> GetPaginatedClients(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? sortBy = "name",
            [FromQuery] bool ascending = true)
        {
            try
            {
                _logger.LogInformation($"=== GetPaginatedClients Started - Page: {page}, PageSize: {pageSize} ===");

                if (page < 1) page = 1;
                if (pageSize < 1) pageSize = 10;
                if (pageSize > 100) pageSize = 100;

                var query = _context.Companies.AsQueryable();

                query = sortBy?.ToLower() switch
                {
                    "name" => ascending ? query.OrderBy(c => c.Name) : query.OrderByDescending(c => c.Name),
                    "email" => ascending ? query.OrderBy(c => c.Email) : query.OrderByDescending(c => c.Email),
                    "createdat" => ascending ? query.OrderBy(c => c.CreatedAt) : query.OrderByDescending(c => c.CreatedAt),
                    "tradetype" => ascending ? query.OrderBy(c => c.TradeType) : query.OrderByDescending(c => c.TradeType),
                    _ => ascending ? query.OrderBy(c => c.Name) : query.OrderByDescending(c => c.Name)
                };

                var totalCount = await query.CountAsync();
                var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

                var clients = await query
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(c => new
                    {
                        id = c.Id,
                        name = c.Name,
                        email = c.Email,
                        phone = c.Phone,
                        city = c.City,
                        tradeType = c.TradeType.ToString(),
                        status = "active",
                        createdAt = c.CreatedAt
                    })
                    .ToListAsync();

                return Ok(new
                {
                    success = true,
                    message = "Clients fetched successfully",
                    data = clients,
                    pagination = new
                    {
                        currentPage = page,
                        pageSize = pageSize,
                        totalCount = totalCount,
                        totalPages = totalPages,
                        hasPrevious = page > 1,
                        hasNext = page < totalPages
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching paginated clients");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Could not fetch clients. Please try again.",
                    error = ex.Message
                });
            }
        }

        // /// <summary>
        // /// GET: api/client/clients/{id}/details
        // /// Fetches complete client details for view page
        // /// </summary>
        // [HttpGet("clients/{id}/details")]
        // public async Task<IActionResult> GetClientDetails(Guid id)
        // {
        //     try
        //     {
        //         _logger.LogInformation($"=== GetClientDetails Started for ID: {id} ===");

        //         var client = await _context.Companies
        //             .Include(c => c.Owner)
        //             .Include(c => c.FiscalYears)
        //             .Include(c => c.Users)
        //             .Include(c => c.AccountGroups)
        //             .Include(c => c.Settings)
        //             .Where(c => c.Id == id)
        //             .Select(c => new
        //             {
        //                 // Basic Information
        //                 id = c.Id,
        //                 name = c.Name,
        //                 email = c.Email,
        //                 phone = c.Phone,
        //                 address = c.Address,
        //                 city = c.City,
        //                 state = c.State,
        //                 country = c.Country,
        //                 pan = c.Pan,
        //                 ward = c.Ward,

        //                 // Business Information
        //                 tradeType = c.TradeType.ToString(),
        //                 dateFormat = c.DateFormat.ToString(),
        //                 renewalDate = c.RenewalDate,
        //                 fiscalYearStartDate = c.FiscalYearStartDate,

        //                 // Features
        //                 vatEnabled = c.VatEnabled,
        //                 storeManagement = c.StoreManagement,
        //                 notificationEmails = c.NotificationEmails,

        //                 // Owner Information
        //                 owner = c.Owner != null ? new
        //                 {
        //                     id = c.Owner.Id,
        //                     name = c.Owner.Name,
        //                     email = c.Owner.Email,
        //                 } : null,

        //                 // Attendance Settings
        //                 attendanceSettings = new
        //                 {
        //                     geoFencingEnabled = c.AttendanceSettings.GeoFencingEnabled,
        //                     officeLocations = c.AttendanceSettings.OfficeLocations.Select(loc => new
        //                     {
        //                         name = loc.Name,
        //                         coordinates = new
        //                         {
        //                             lat = loc.Coordinates.Lat,
        //                             lng = loc.Coordinates.Lng
        //                         },
        //                         radius = loc.Radius,
        //                         address = loc.Address,
        //                         isActive = loc.IsActive
        //                     }).ToList(),
        //                     workingHours = new
        //                     {
        //                         startTime = c.AttendanceSettings.WorkingHours.StartTime,
        //                         endTime = c.AttendanceSettings.WorkingHours.EndTime,
        //                         gracePeriod = c.AttendanceSettings.WorkingHours.GracePeriod
        //                     },
        //                     autoClockOut = new
        //                     {
        //                         enabled = c.AttendanceSettings.AutoClockOut.Enabled,
        //                         time = c.AttendanceSettings.AutoClockOut.Time
        //                     }
        //                 },

        //                 // Fiscal Years
        //                 fiscalYears = c.FiscalYears
        //                     .Select(fy => new
        //                     {
        //                         id = fy.Id,
        //                         name = fy.Name,
        //                         startDate = fy.StartDate,
        //                         endDate = fy.EndDate,
        //                         isActive = fy.IsActive,
        //                     })
        //                     .ToList()
        //                     .OrderByDescending(fy => fy.startDate),

        //                 // Account Groups
        //                 accountGroups = c.AccountGroups
        //                     .Select(ag => new
        //                     {
        //                         id = ag.Id,
        //                         name = ag.Name,
        //                         type = ag.Type.ToString(),
        //                     })
        //                     .Take(5)
        //                     .ToList(),

        //                 // Users with access
        //                 users = c.Users
        //                     .Select(u => new
        //                     {
        //                         id = u.Id,
        //                         name = u.Name,
        //                         email = u.Email,
        //                     })
        //                     .Take(5)
        //                     .ToList(),

        //                 // Settings
        //                 settings = c.Settings
        //                     .Select(s => new
        //                     {
        //                         id = s.Id,
        //                         value = s.Value,
        //                     })
        //                     .Take(10)
        //                     .ToList(),

        //                 // Statistics
        //                 stats = new
        //                 {
        //                     totalUsers = c.Users.Count,
        //                     totalFiscalYears = c.FiscalYears.Count,
        //                     totalAccountGroups = c.AccountGroups.Count,
        //                     totalSettings = c.Settings.Count
        //                 },

        //                 // Timestamps
        //                 createdAt = c.CreatedAt,
        //                 updatedAt = c.UpdatedAt,

        //                 // Status (derived from renewal date)
        //                 status = GetClientStatus(c.RenewalDate)
        //             })
        //             .FirstOrDefaultAsync();

        //         if (client == null)
        //         {
        //             return NotFound(new
        //             {
        //                 success = false,
        //                 message = $"Client with ID {id} not found"
        //             });
        //         }

        //         return Ok(new
        //         {
        //             success = true,
        //             message = "Client details fetched successfully",
        //             data = client
        //         });
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, $"Error fetching client details for ID: {id}");
        //         return StatusCode(500, new
        //         {
        //             success = false,
        //             message = "Could not fetch client details. Please try again.",
        //             error = ex.Message
        //         });
        //     }
        // }

        /// <summary>
        /// GET: api/client/clients/{id}/details
        /// Fetches complete client details for view page
        /// </summary>
        [HttpGet("clients/{id}/details")]
        public async Task<IActionResult> GetClientDetails(Guid id)
        {
            try
            {
                _logger.LogInformation($"=== GetClientDetails Started for ID: {id} ===");

                // First fetch the company with all related data
                var company = await _context.Companies
                    .Include(c => c.Owner)
                    .Include(c => c.FiscalYears)
                    .Include(c => c.Users)
                    .Include(c => c.AccountGroups)
                    .Include(c => c.Settings)
                    .FirstOrDefaultAsync(c => c.Id == id);

                if (company == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = $"Client with ID {id} not found"
                    });
                }

                // Then build the response with ordered collections
                var response = new
                {
                    // Basic Information
                    id = company.Id,
                    name = company.Name,
                    email = company.Email,
                    phone = company.Phone,
                    address = company.Address,
                    city = company.City,
                    state = company.State,
                    country = company.Country,
                    pan = company.Pan,
                    ward = company.Ward,

                    // Business Information
                    tradeType = company.TradeType.ToString(),
                    dateFormat = company.DateFormat.ToString(),
                    renewalDate = company.RenewalDate,
                    fiscalYearStartDateNepali = company.FiscalYearStartDateNepali,
                    fiscalYearStartDateEnglish = company.FiscalYearStartDateEnglish,

                    // Features
                    vatEnabled = company.VatEnabled,
                    storeManagement = company.StoreManagement,
                    notificationEmails = company.NotificationEmails,

                    // Owner Information
                    owner = company.Owner != null ? new
                    {
                        id = company.Owner.Id,
                        name = company.Owner.Name,
                        email = company.Owner.Email,
                    } : null,

                    // Attendance Settings
                    attendanceSettings = new
                    {
                        geoFencingEnabled = company.AttendanceSettings.GeoFencingEnabled,
                        officeLocations = company.AttendanceSettings.OfficeLocations.Select(loc => new
                        {
                            name = loc.Name,
                            coordinates = new
                            {
                                lat = loc.Coordinates.Lat,
                                lng = loc.Coordinates.Lng
                            },
                            radius = loc.Radius,
                            address = loc.Address,
                            isActive = loc.IsActive
                        }),
                        workingHours = new
                        {
                            startTime = company.AttendanceSettings.WorkingHours.StartTime,
                            endTime = company.AttendanceSettings.WorkingHours.EndTime,
                            gracePeriod = company.AttendanceSettings.WorkingHours.GracePeriod
                        },
                        autoClockOut = new
                        {
                            enabled = company.AttendanceSettings.AutoClockOut.Enabled,
                            time = company.AttendanceSettings.AutoClockOut.Time
                        }
                    },

                    // Fiscal Years - Order after fetching from database
                    fiscalYears = company.FiscalYears
                        .Select(fy => new
                        {
                            id = fy.Id,
                            name = fy.Name,
                            startDate = fy.StartDate,
                            endDate = fy.EndDate,
                            isActive = fy.IsActive,
                        })
                        .OrderByDescending(fy => fy.startDate)
                        .ToList(),

                    // Account Groups
                    accountGroups = company.AccountGroups
                        .Select(ag => new
                        {
                            id = ag.Id,
                            name = ag.Name,
                            type = ag.Type.ToString(),
                        })
                        .Take(5)
                        .ToList(),

                    // Users with access
                    users = company.Users
                        .Select(u => new
                        {
                            id = u.Id,
                            name = u.Name,
                            email = u.Email,
                        })
                        .Take(5)
                        .ToList(),

                    // Settings
                    settings = company.Settings
                        .Select(s => new
                        {
                            id = s.Id,
                            value = s.Value,
                        })
                        .Take(10)
                        .ToList(),

                    // Statistics
                    stats = new
                    {
                        totalUsers = company.Users.Count,
                        totalFiscalYears = company.FiscalYears.Count,
                        totalAccountGroups = company.AccountGroups.Count,
                        totalSettings = company.Settings.Count
                    },

                    // Timestamps
                    createdAt = company.CreatedAt,
                    updatedAt = company.UpdatedAt,

                    // Status (derived from renewal date)
                    status = GetClientStatus(company.RenewalDate)
                };

                return Ok(new
                {
                    success = true,
                    message = "Client details fetched successfully",
                    data = response
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error fetching client details for ID: {id}");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Could not fetch client details. Please try again.",
                    error = ex.Message
                });
            }
        }

        // Helper method to determine client status
        private string GetClientStatus(string renewalDate)
        {
            if (string.IsNullOrEmpty(renewalDate))
                return "demo";

            if (DateTime.TryParse(renewalDate, out DateTime renewal))
            {
                var today = DateTime.UtcNow.Date;
                var daysUntilRenewal = (renewal - today).Days;

                if (renewal > today)
                {
                    if (daysUntilRenewal <= 30)
                        return "expiring_soon";
                    return "active";
                }
                else
                {
                    return "inactive";
                }
            }
            return "demo";
        }



        /// <summary>
        /// Request model for renewal
        /// </summary>
        public class RenewalRequest
        {
            public int MonthsToAdd { get; set; } = 12; // Default 12 months
            public string? NewRenewalDate { get; set; } // Optional: provide custom date
        }

        /// <summary>
        /// POST: api/client/clients/{id}/renew
        /// Renews a client's subscription
        /// </summary>
        // [HttpPost("clients/{id}/renew")]
        // public async Task<IActionResult> RenewClient(Guid id, [FromBody] RenewalRequest request)
        // {
        //     try
        //     {
        //         _logger.LogInformation($"=== RenewClient Started for ID: {id} ===");

        //         var company = await _context.Companies
        //             .FirstOrDefaultAsync(c => c.Id == id);

        //         if (company == null)
        //         {
        //             return NotFound(new
        //             {
        //                 success = false,
        //                 message = $"Client with ID {id} not found"
        //             });
        //         }

        //         string newRenewalDate;

        //         // If custom date is provided, use it
        //         if (!string.IsNullOrEmpty(request.NewRenewalDate))
        //         {
        //             newRenewalDate = request.NewRenewalDate;
        //         }
        //         else
        //         {
        //             // Calculate new renewal date based on current date and months to add
        //             var currentDate = DateTime.UtcNow;
        //             var newDate = currentDate.AddMonths(request.MonthsToAdd);

        //             // Format based on company's date format
        //             if (company.DateFormat == DateFormatEnum.Nepali)
        //             {
        //                 // Since RenewalDate is stored as string in Nepali format,
        //                 // we need to parse it, add months, and convert back
        //                 // For now, we'll use English date for calculation and store as string
        //                 // You'll need proper Nepali date conversion logic here
        //                 newRenewalDate = newDate.ToString("yyyy-MM-dd");
        //             }
        //             else
        //             {
        //                 newRenewalDate = newDate.ToString("yyyy-MM-dd");
        //             }
        //         }

        //         // Store the old renewal date for history
        //         var oldRenewalDate = company.RenewalDate;

        //         // Update the renewal date
        //         company.RenewalDate = newRenewalDate;
        //         company.UpdatedAt = DateTime.UtcNow;

        //         // Optional: Add renewal history record (you might want to create a RenewalHistory table)
        //         // For now, we'll just log it
        //         _logger.LogInformation($"Company {company.Name} renewed from {oldRenewalDate} to {newRenewalDate}");

        //         await _context.SaveChangesAsync();

        //         return Ok(new
        //         {
        //             success = true,
        //             message = $"Client subscription renewed successfully until {newRenewalDate}",
        //             data = new
        //             {
        //                 oldRenewalDate = oldRenewalDate,
        //                 newRenewalDate = newRenewalDate,
        //                 monthsAdded = request.MonthsToAdd
        //             }
        //         });
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, $"Error renewing client for ID: {id}");
        //         return StatusCode(500, new
        //         {
        //             success = false,
        //             message = "Could not renew client subscription. Please try again.",
        //             error = ex.Message
        //         });
        //     }
        // }

        /// <summary>
        /// POST: api/client/clients/{id}/renew
        /// Renews a client's subscription
        /// </summary>
        [HttpPost("clients/{id}/renew")]
        public async Task<IActionResult> RenewClient(Guid id, [FromBody] RenewalRequest request)
        {
            try
            {
                _logger.LogInformation($"=== RenewClient Started for ID: {id} ===");
                _logger.LogInformation($"Request received: MonthsToAdd={request.MonthsToAdd}, NewRenewalDate={request.NewRenewalDate}");

                var company = await _context.Companies
                    .FirstOrDefaultAsync(c => c.Id == id);

                if (company == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = $"Client with ID {id} not found"
                    });
                }

                string oldRenewalDate = company.RenewalDate;

                // Use the date sent from frontend (already calculated correctly for Nepali or English format)
                string newRenewalDate = request.NewRenewalDate;

                if (string.IsNullOrEmpty(newRenewalDate))
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "New renewal date is required"
                    });
                }

                // Update the renewal date
                company.RenewalDate = newRenewalDate;
                company.UpdatedAt = DateTime.UtcNow;

                _logger.LogInformation($"Company {company.Name} renewed from '{oldRenewalDate}' to '{newRenewalDate}'");

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = $"Client subscription renewed successfully until {newRenewalDate}",
                    data = new
                    {
                        oldRenewalDate = oldRenewalDate,
                        newRenewalDate = newRenewalDate,
                        monthsAdded = request.MonthsToAdd,
                        dateFormat = company.DateFormat.ToString()
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error renewing client for ID: {id}");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Could not renew client subscription. Please try again.",
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// GET: api/client/clients/{id}/renewal-history
        /// Gets renewal history (if you have a history table)
        /// </summary>
        [HttpGet("clients/{id}/renewal-history")]
        public async Task<IActionResult> GetRenewalHistory(Guid id)
        {
            try
            {
                // If you have a RenewalHistory table, query it here
                // For now, return a placeholder
                return Ok(new
                {
                    success = true,
                    message = "Renewal history retrieved successfully",
                    data = new List<object>() // Return empty list for now
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error fetching renewal history for ID: {id}");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Could not fetch renewal history",
                    error = ex.Message
                });
            }
        }
    }
}