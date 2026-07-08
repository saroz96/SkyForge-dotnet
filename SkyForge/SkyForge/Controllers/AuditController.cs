// // Controllers/AuditController.cs
// using Microsoft.AspNetCore.Authorization;
// using Microsoft.AspNetCore.Mvc;
// using SkyForge.Models.Audit;
// using SkyForge.Services.Audit;

// namespace SkyForge.Controllers
// {
//     [ApiController]
//     [Route("api/audit")]
//     [Authorize]
//     public class AuditController : ControllerBase
//     {
//         private readonly IAuditService _auditService;
//         private readonly ILogger<AuditController> _logger;

//         public AuditController(IAuditService auditService, ILogger<AuditController> logger)
//         {
//             _auditService = auditService;
//             _logger = logger;
//         }

//         [HttpGet("logs")]
//         public async Task<IActionResult> GetLogs(
//             [FromQuery] Guid? userId = null,
//             [FromQuery] string? action = null,
//             [FromQuery] string? entityType = null,
//             [FromQuery] DateTime? fromDate = null,
//             [FromQuery] DateTime? toDate = null,
//             [FromQuery] string? searchTerm = null,
//             [FromQuery] int page = 1,
//             [FromQuery] int pageSize = 20)
//         {
//             try
//             {
//                 var companyIdClaim = User.FindFirst("currentCompany")?.Value;
//                 if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out Guid companyId))
//                 {
//                     return BadRequest(new { success = false, error = "No company selected" });
//                 }

//                 var actionEnum = !string.IsNullOrEmpty(action) && Enum.TryParse<AuditActionType>(action, out var a) ? a : (AuditActionType?)null;
//                 var entityEnum = !string.IsNullOrEmpty(entityType) && Enum.TryParse<AuditEntityType>(entityType, out var e) ? e : (AuditEntityType?)null;

//                 var result = await _auditService.GetLogsAsync(
//                     companyId,
//                     userId,
//                     actionEnum,
//                     entityEnum,
//                     fromDate,
//                     toDate,
//                     searchTerm,
//                     page,
//                     pageSize);

//                 return Ok(new
//                 {
//                     success = true,
//                     data = result
//                 });
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error getting audit logs");
//                 return StatusCode(500, new { success = false, error = "Internal server error" });
//             }
//         }

//         [HttpGet("my-logs")]
//         public async Task<IActionResult> GetMyLogs(
//             [FromQuery] DateTime? fromDate = null,
//             [FromQuery] DateTime? toDate = null,
//             [FromQuery] int page = 1,
//             [FromQuery] int pageSize = 20)
//         {
//             try
//             {
//                 var userIdClaim = User.FindFirst("userId")?.Value;
//                 if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId))
//                 {
//                     return Unauthorized(new { success = false, error = "Invalid user" });
//                 }

//                 var logs = await _auditService.GetUserLogsAsync(userId, fromDate, toDate);

//                 // Apply pagination
//                 var pagedResult = new PagedResult<AuditLog>
//                 {
//                     Items = logs.Skip((page - 1) * pageSize).Take(pageSize),
//                     TotalCount = logs.Count(),
//                     Page = page,
//                     PageSize = pageSize
//                 };

//                 return Ok(new
//                 {
//                     success = true,
//                     data = pagedResult
//                 });
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error getting user audit logs");
//                 return StatusCode(500, new { success = false, error = "Internal server error" });
//             }
//         }

//         [HttpGet("entity/{entityType}/{entityId}")]
//         public async Task<IActionResult> GetEntityLogs(string entityType, string entityId)
//         {
//             try
//             {
//                 if (!Enum.TryParse<AuditEntityType>(entityType, true, out var entityEnum))
//                 {
//                     return BadRequest(new { success = false, error = "Invalid entity type" });
//                 }

//                 var logs = await _auditService.GetEntityLogsAsync(entityEnum, entityId);

//                 return Ok(new
//                 {
//                     success = true,
//                     data = logs
//                 });
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error getting entity audit logs");
//                 return StatusCode(500, new { success = false, error = "Internal server error" });
//             }
//         }

//         [HttpGet("summary")]
//         public async Task<IActionResult> GetAuditSummary(
//             [FromQuery] DateTime? fromDate = null,
//             [FromQuery] DateTime? toDate = null)
//         {
//             try
//             {
//                 var companyIdClaim = User.FindFirst("currentCompany")?.Value;
//                 if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out Guid companyId))
//                 {
//                     return BadRequest(new { success = false, error = "No company selected" });
//                 }

//                 var summary = await _auditService.GetAuditSummaryAsync(companyId, fromDate, toDate);

//                 return Ok(new
//                 {
//                     success = true,
//                     data = summary
//                 });
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error getting audit summary");
//                 return StatusCode(500, new { success = false, error = "Internal server error" });
//             }
//         }
//     }
// }

//-------------------------------------------------------------------end

// Controllers/AuditController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkyForge.Models.Audit;
using SkyForge.Services.Audit;
using System.Security.Claims;

namespace SkyForge.Controllers
{
    [ApiController]
    [Route("api/audit")]
    [Authorize]
    public class AuditController : ControllerBase
    {
        private readonly IAuditService _auditService;
        private readonly ILogger<AuditController> _logger;

        public AuditController(IAuditService auditService, ILogger<AuditController> logger)
        {
            _auditService = auditService;
            _logger = logger;
        }

        [HttpGet("logs")]
        public async Task<IActionResult> GetLogs(
            [FromQuery] Guid? userId = null,
            [FromQuery] string? action = null,
            [FromQuery] string? entityType = null,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] string? searchTerm = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var companyIdClaim = User.FindFirst("currentCompany")?.Value;
                if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out Guid companyId))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                var actionEnum = !string.IsNullOrEmpty(action) && Enum.TryParse<AuditActionType>(action, out var a) ? a : (AuditActionType?)null;
                var entityEnum = !string.IsNullOrEmpty(entityType) && Enum.TryParse<AuditEntityType>(entityType, out var e) ? e : (AuditEntityType?)null;

                var result = await _auditService.GetLogsAsync(
                    companyId,
                    userId,
                    actionEnum,
                    entityEnum,
                    fromDate,
                    toDate,
                    searchTerm,
                    page,
                    pageSize);

                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting audit logs");
                return StatusCode(500, new { success = false, error = "Internal server error" });
            }
        }

        [HttpGet("my-logs")]
        public async Task<IActionResult> GetMyLogs(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var userIdClaim = User.FindFirst("userId")?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId))
                {
                    return Unauthorized(new { success = false, error = "Invalid user" });
                }

                var logs = await _auditService.GetUserLogsAsync(userId, fromDate, toDate);

                // Apply pagination
                var pagedResult = new PagedResult<AuditLog>
                {
                    Items = logs.Skip((page - 1) * pageSize).Take(pageSize),
                    TotalCount = logs.Count(),
                    Page = page,
                    PageSize = pageSize
                };

                return Ok(new
                {
                    success = true,
                    data = pagedResult
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user audit logs");
                return StatusCode(500, new { success = false, error = "Internal server error" });
            }
        }

        [HttpGet("entity/{entityType}/{entityId}")]
        public async Task<IActionResult> GetEntityLogs(string entityType, string entityId)
        {
            try
            {
                if (!Enum.TryParse<AuditEntityType>(entityType, true, out var entityEnum))
                {
                    return BadRequest(new { success = false, error = "Invalid entity type" });
                }

                var logs = await _auditService.GetEntityLogsAsync(entityEnum, entityId);

                return Ok(new
                {
                    success = true,
                    data = logs
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting entity audit logs");
                return StatusCode(500, new { success = false, error = "Internal server error" });
            }
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetAuditSummary(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null)
        {
            try
            {
                var companyIdClaim = User.FindFirst("currentCompany")?.Value;
                if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out Guid companyId))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                var summary = await _auditService.GetAuditSummaryAsync(companyId, fromDate, toDate);

                return Ok(new
                {
                    success = true,
                    data = summary
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting audit summary");
                return StatusCode(500, new { success = false, error = "Internal server error" });
            }
        }

        [HttpGet("count")]
        public async Task<IActionResult> GetTotalCount()
        {
            try
            {
                var companyIdClaim = User.FindFirst("currentCompany")?.Value;
                if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out Guid companyId))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                var totalCount = await _auditService.GetTotalCountAsync(companyId);
                var olderThan30Days = await _auditService.GetCountOlderThanAsync(companyId, 30);
                
                return Ok(new
                {
                    success = true,
                    data = new 
                    { 
                        totalCount,
                        olderThan30Days,
                        limit = 5000,
                        retentionDays = 30
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting audit count");
                return StatusCode(500, new { success = false, error = "Internal server error" });
            }
        }

        [HttpPost("cleanup")]
        public async Task<IActionResult> CleanupOldLogs(
            [FromQuery] int maxRecords = 5000, 
            [FromQuery] int retentionDays = 30)
        {
            try
            {
                var companyIdClaim = User.FindFirst("currentCompany")?.Value;
                if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out Guid companyId))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                // Check if user is admin or supervisor
                var isAdmin = User.FindFirst("isAdmin")?.Value == "true";
                var role = User.FindFirst(ClaimTypes.Role)?.Value;
                var isSupervisor = role == "Supervisor";

                if (!isAdmin && !isSupervisor)
                {
                    return StatusCode(403, new { success = false, error = "Only admins and supervisors can perform cleanup" });
                }

                var result = await _auditService.PerformFullCleanupAsync(companyId, maxRecords, retentionDays);
                
                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cleaning up audit logs");
                return StatusCode(500, new { success = false, error = "Internal server error" });
            }
        }
    }
}