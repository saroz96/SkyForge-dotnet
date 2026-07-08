// // Services/Audit/AuditService.cs
// using Microsoft.AspNetCore.Http;
// using Microsoft.EntityFrameworkCore;
// using Newtonsoft.Json;
// using SkyForge.Data;
// using SkyForge.Models.Audit;
// using System.Security.Claims;

// namespace SkyForge.Services.Audit
// {
//     public interface IAuditService
//     {
//         Task LogAsync(
//             AuditActionType action,
//             AuditEntityType entityType,
//             string? entityId = null,
//             string? entityName = null,
//             string? billNumber = null,
//             string? description = null,
//             object? oldValues = null,
//             object? newValues = null,
//             string? additionalInfo = null,
//             string? requestPath = null,
//             string? requestMethod = null);

//         Task<IEnumerable<AuditLog>> GetUserLogsAsync(Guid userId, DateTime? fromDate = null, DateTime? toDate = null);
//         Task<IEnumerable<AuditLog>> GetEntityLogsAsync(AuditEntityType entityType, string entityId);
//         Task<PagedResult<AuditLog>> GetLogsAsync(
//             Guid? companyId = null,
//             Guid? userId = null,
//             AuditActionType? action = null,
//             AuditEntityType? entityType = null,
//             DateTime? fromDate = null,
//             DateTime? toDate = null,
//             string? searchTerm = null,
//             int page = 1,
//             int pageSize = 20);
//         Task<IEnumerable<AuditSummary>> GetAuditSummaryAsync(Guid companyId, DateTime? fromDate = null, DateTime? toDate = null);
//     }

//     public class AuditService : IAuditService
//     {
//         private readonly ApplicationDbContext _context;
//         private readonly IHttpContextAccessor _httpContextAccessor;
//         private readonly ILogger<AuditService> _logger;

//         public AuditService(
//             ApplicationDbContext context,
//             IHttpContextAccessor httpContextAccessor,
//             ILogger<AuditService> logger)
//         {
//             _context = context;
//             _httpContextAccessor = httpContextAccessor;
//             _logger = logger;
//         }

//         public async Task LogAsync(
//             AuditActionType action,
//             AuditEntityType entityType,
//             string? entityId = null,
//             string? entityName = null,
//             string? billNumber = null,
//             string? description = null,
//             object? oldValues = null,
//             object? newValues = null,
//             string? additionalInfo = null,
//             string? requestPath = null,
//             string? requestMethod = null)
//         {
//             try
//             {
//                 var httpContext = _httpContextAccessor.HttpContext;
                
//                 // Get user ID from claims
//                 var userIdClaim = httpContext?.User?.FindFirst("userId")?.Value 
//                     ?? httpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                
//                 if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId))
//                 {
//                     _logger.LogWarning("Could not determine user ID for audit log");
//                     return;
//                 }

//                 // Get company ID from claims
//                 var companyIdClaim = httpContext?.User?.FindFirst("currentCompany")?.Value;
//                 Guid? companyId = null;
//                 if (!string.IsNullOrEmpty(companyIdClaim) && Guid.TryParse(companyIdClaim, out Guid parsedCompanyId))
//                 {
//                     companyId = parsedCompanyId;
//                 }

//                 // Get IP address
//                 var ipAddress = httpContext?.Connection?.RemoteIpAddress?.ToString() ?? "unknown";
                
//                 // Get User Agent
//                 var userAgent = httpContext?.Request?.Headers["User-Agent"].ToString() ?? "unknown";
                
//                 // Generate a session-like ID from request headers or create a new one
//                 // This avoids the session dependency
//                 var sessionId = httpContext?.Request?.Headers["X-Session-Id"].FirstOrDefault() 
//                                 ?? httpContext?.Request?.Headers["X-Request-Id"].FirstOrDefault()
//                                 ?? Guid.NewGuid().ToString();

//                 // Use provided values or get from context
//                 var actualRequestPath = requestPath ?? httpContext?.Request?.Path ?? "/";
//                 var actualRequestMethod = requestMethod ?? httpContext?.Request?.Method ?? "GET";

//                 // Create audit log entry
//                 var auditLog = new AuditLog
//                 {
//                     Id = Guid.NewGuid(),
//                     UserId = userId,
//                     CompanyId = companyId ?? Guid.Empty,
//                     Action = action,
//                     EntityType = entityType,
//                     EntityId = entityId,
//                     EntityName = entityName ?? entityId,
//                     BillNumber = billNumber,
//                     Description = description ?? $"{action} {entityType}",
//                     OldValues = oldValues != null ? JsonConvert.SerializeObject(oldValues) : null,
//                     NewValues = newValues != null ? JsonConvert.SerializeObject(newValues) : null,
//                     IPAddress = ipAddress,
//                     UserAgent = userAgent,
//                     SessionId = sessionId,
//                     CreatedAt = DateTime.UtcNow,
//                     RequestPath = actualRequestPath,
//                     RequestMethod = actualRequestMethod
//                 };

//                 // Save to database
//                 await _context.AuditLogs.AddAsync(auditLog);
//                 await _context.SaveChangesAsync();

//                 _logger.LogInformation($"Audit log created: {action} {entityType} by user {userId}");
//             }
//             catch (Exception ex)
//             {
//                 // Log error but don't throw - audit logging should not break the main flow
//                 _logger.LogError(ex, "Error creating audit log");
//             }
//         }

//         public async Task<IEnumerable<AuditLog>> GetUserLogsAsync(Guid userId, DateTime? fromDate = null, DateTime? toDate = null)
//         {
//             var query = _context.AuditLogs
//                 .Include(a => a.User)
//                 .Include(a => a.Company)
//                 .Where(a => a.UserId == userId);

//             if (fromDate.HasValue)
//                 query = query.Where(a => a.CreatedAt >= fromDate.Value);

//             if (toDate.HasValue)
//                 query = query.Where(a => a.CreatedAt <= toDate.Value);

//             return await query
//                 .OrderByDescending(a => a.CreatedAt)
//                 .ToListAsync();
//         }

//         public async Task<IEnumerable<AuditLog>> GetEntityLogsAsync(AuditEntityType entityType, string entityId)
//         {
//             return await _context.AuditLogs
//                 .Include(a => a.User)
//                 .Include(a => a.Company)
//                 .Where(a => a.EntityType == entityType && a.EntityId == entityId)
//                 .OrderByDescending(a => a.CreatedAt)
//                 .ToListAsync();
//         }

//         public async Task<PagedResult<AuditLog>> GetLogsAsync(
//             Guid? companyId = null,
//             Guid? userId = null,
//             AuditActionType? action = null,
//             AuditEntityType? entityType = null,
//             DateTime? fromDate = null,
//             DateTime? toDate = null,
//             string? searchTerm = null,
//             int page = 1,
//             int pageSize = 20)
//         {
//             var query = _context.AuditLogs
//                 .Include(a => a.User)
//                 .Include(a => a.Company)
//                 .AsQueryable();

//             if (companyId.HasValue)
//                 query = query.Where(a => a.CompanyId == companyId.Value);

//             if (userId.HasValue)
//                 query = query.Where(a => a.UserId == userId.Value);

//             if (action.HasValue)
//                 query = query.Where(a => a.Action == action.Value);

//             if (entityType.HasValue)
//                 query = query.Where(a => a.EntityType == entityType.Value);

//             if (fromDate.HasValue)
//                 query = query.Where(a => a.CreatedAt >= fromDate.Value);

//             if (toDate.HasValue)
//                 query = query.Where(a => a.CreatedAt <= toDate.Value);

//             if (!string.IsNullOrEmpty(searchTerm))
//             {
//                 query = query.Where(a =>
//                     a.Description.Contains(searchTerm) ||
//                     a.EntityName.Contains(searchTerm) ||
//                     a.BillNumber.Contains(searchTerm) ||
//                     a.User.Name.Contains(searchTerm));
//             }

//             var totalCount = await query.CountAsync();

//             var items = await query
//                 .OrderByDescending(a => a.CreatedAt)
//                 .Skip((page - 1) * pageSize)
//                 .Take(pageSize)
//                 .ToListAsync();

//             return new PagedResult<AuditLog>
//             {
//                 Items = items,
//                 TotalCount = totalCount,
//                 Page = page,
//                 PageSize = pageSize
//             };
//         }

//         public async Task<IEnumerable<AuditSummary>> GetAuditSummaryAsync(Guid companyId, DateTime? fromDate = null, DateTime? toDate = null)
//         {
//             var query = _context.AuditLogs
//                 .Where(a => a.CompanyId == companyId);

//             if (fromDate.HasValue)
//                 query = query.Where(a => a.CreatedAt >= fromDate.Value);

//             if (toDate.HasValue)
//                 query = query.Where(a => a.CreatedAt <= toDate.Value);

//             var summary = await query
//                 .GroupBy(a => a.Action)
//                 .Select(g => new AuditSummary
//                 {
//                     Action = g.Key,
//                     Count = g.Count(),
//                     LastOccurrence = g.Max(a => a.CreatedAt)
//                 })
//                 .ToListAsync();

//             // Add total
//             var total = new AuditSummary
//             {
//                 Action = AuditActionType.View, // Not used
//                 Count = summary.Sum(s => s.Count),
//                 LastOccurrence = summary.Any() ? summary.Max(s => s.LastOccurrence) : null
//             };

//             var result = summary.ToList();
//             result.Add(total);

//             return result;
//         }
//     }

//     public class PagedResult<T>
//     {
//         public IEnumerable<T> Items { get; set; } = new List<T>();
//         public int TotalCount { get; set; }
//         public int Page { get; set; }
//         public int PageSize { get; set; }
//         public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
//         public bool HasNextPage => Page < TotalPages;
//         public bool HasPreviousPage => Page > 1;
//     }

//     public class AuditSummary
//     {
//         public AuditActionType Action { get; set; }
//         public int Count { get; set; }
//         public DateTime? LastOccurrence { get; set; }
//     }
// }

//---------------------------------------------------------end

// Services/Audit/AuditService.cs
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using SkyForge.Data;
using SkyForge.Models.Audit;
using System.Security.Claims;

namespace SkyForge.Services.Audit
{
    public interface IAuditService
    {
        Task LogAsync(
            AuditActionType action,
            AuditEntityType entityType,
            string? entityId = null,
            string? entityName = null,
            string? billNumber = null,
            string? description = null,
            object? oldValues = null,
            object? newValues = null,
            string? additionalInfo = null,
            string? requestPath = null,
            string? requestMethod = null);

        Task<IEnumerable<AuditLog>> GetUserLogsAsync(Guid userId, DateTime? fromDate = null, DateTime? toDate = null);
        Task<IEnumerable<AuditLog>> GetEntityLogsAsync(AuditEntityType entityType, string entityId);
        Task<PagedResult<AuditLog>> GetLogsAsync(
            Guid? companyId = null,
            Guid? userId = null,
            AuditActionType? action = null,
            AuditEntityType? entityType = null,
            DateTime? fromDate = null,
            DateTime? toDate = null,
            string? searchTerm = null,
            int page = 1,
            int pageSize = 20);
        Task<IEnumerable<AuditSummary>> GetAuditSummaryAsync(Guid companyId, DateTime? fromDate = null, DateTime? toDate = null);
        Task<int> GetTotalCountAsync(Guid companyId);
        Task<int> GetCountOlderThanAsync(Guid companyId, int days);
        Task<int> DeleteOldLogsAsync(Guid companyId, int maxRecords = 5000);
        Task<int> DeleteLogsOlderThanAsync(Guid companyId, int days = 30);
        Task<CleanupResult> PerformFullCleanupAsync(Guid companyId, int maxRecords = 5000, int retentionDays = 30);
    }

    public class CleanupResult
    {
        public int DeletedByCount { get; set; }
        public int DeletedByAge { get; set; }
        public int TotalDeleted { get; set; }
        public int RemainingCount { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    public class AuditService : IAuditService
    {
        private readonly ApplicationDbContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger<AuditService> _logger;

        public AuditService(
            ApplicationDbContext context,
            IHttpContextAccessor httpContextAccessor,
            ILogger<AuditService> logger)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
        }

        public async Task LogAsync(
            AuditActionType action,
            AuditEntityType entityType,
            string? entityId = null,
            string? entityName = null,
            string? billNumber = null,
            string? description = null,
            object? oldValues = null,
            object? newValues = null,
            string? additionalInfo = null,
            string? requestPath = null,
            string? requestMethod = null)
        {
            try
            {
                var httpContext = _httpContextAccessor.HttpContext;
                
                // Get user ID from claims
                var userIdClaim = httpContext?.User?.FindFirst("userId")?.Value 
                    ?? httpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                
                if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId))
                {
                    _logger.LogWarning("Could not determine user ID for audit log");
                    return;
                }

                // Get company ID from claims
                var companyIdClaim = httpContext?.User?.FindFirst("currentCompany")?.Value;
                Guid? companyId = null;
                if (!string.IsNullOrEmpty(companyIdClaim) && Guid.TryParse(companyIdClaim, out Guid parsedCompanyId))
                {
                    companyId = parsedCompanyId;
                }

                // Get IP address
                var ipAddress = httpContext?.Connection?.RemoteIpAddress?.ToString() ?? "unknown";
                
                // Get User Agent
                var userAgent = httpContext?.Request?.Headers["User-Agent"].ToString() ?? "unknown";
                
                // Generate a session-like ID
                var sessionId = httpContext?.Request?.Headers["X-Session-Id"].FirstOrDefault() 
                                ?? httpContext?.Request?.Headers["X-Request-Id"].FirstOrDefault()
                                ?? Guid.NewGuid().ToString();

                // Use provided values or get from context
                var actualRequestPath = requestPath ?? httpContext?.Request?.Path ?? "/";
                var actualRequestMethod = requestMethod ?? httpContext?.Request?.Method ?? "GET";

                // Create audit log entry
                var auditLog = new AuditLog
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    CompanyId = companyId ?? Guid.Empty,
                    Action = action,
                    EntityType = entityType,
                    EntityId = entityId,
                    EntityName = entityName ?? entityId,
                    BillNumber = billNumber,
                    Description = description ?? $"{action} {entityType}",
                    OldValues = oldValues != null ? JsonConvert.SerializeObject(oldValues) : null,
                    NewValues = newValues != null ? JsonConvert.SerializeObject(newValues) : null,
                    IPAddress = ipAddress,
                    UserAgent = userAgent,
                    SessionId = sessionId,
                    CreatedAt = DateTime.UtcNow,
                    RequestPath = actualRequestPath,
                    RequestMethod = actualRequestMethod
                };

                // Save to database
                await _context.AuditLogs.AddAsync(auditLog);
                await _context.SaveChangesAsync();

                _logger.LogInformation($"Audit log created: {action} {entityType} by user {userId}");

                // Auto-cleanup: Check both conditions for this company
                if (companyId.HasValue)
                {
                    await PerformFullCleanupAsync(companyId.Value, 5000, 30);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating audit log");
            }
        }

        public async Task<int> GetTotalCountAsync(Guid companyId)
        {
            return await _context.AuditLogs
                .Where(a => a.CompanyId == companyId)
                .CountAsync();
        }

        public async Task<int> GetCountOlderThanAsync(Guid companyId, int days)
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-days);
            return await _context.AuditLogs
                .Where(a => a.CompanyId == companyId && a.CreatedAt < cutoffDate)
                .CountAsync();
        }

        public async Task<int> DeleteLogsOlderThanAsync(Guid companyId, int days = 30)
        {
            try
            {
                var cutoffDate = DateTime.UtcNow.AddDays(-days);
                
                var oldLogs = await _context.AuditLogs
                    .Where(a => a.CompanyId == companyId && a.CreatedAt < cutoffDate)
                    .ToListAsync();

                if (oldLogs.Any())
                {
                    _context.AuditLogs.RemoveRange(oldLogs);
                    var deletedCount = await _context.SaveChangesAsync();
                    
                    _logger.LogInformation($"Deleted {deletedCount} audit logs older than {days} days for company {companyId}");
                    return deletedCount;
                }

                return 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error deleting logs older than {days} days for company {companyId}");
                return 0;
            }
        }

        public async Task<int> DeleteOldLogsAsync(Guid companyId, int maxRecords = 5000)
        {
            try
            {
                // Get total count of logs for this company
                var totalCount = await _context.AuditLogs
                    .Where(a => a.CompanyId == companyId)
                    .CountAsync();
                
                if (totalCount <= maxRecords)
                {
                    _logger.LogInformation($"Audit logs count ({totalCount}) is within limit ({maxRecords}). No deletion needed.");
                    return 0;
                }

                // Calculate how many to delete (keep the most recent maxRecords)
                var recordsToDelete = totalCount - maxRecords;
                
                // Get the oldest records to delete for this company
                var oldestLogs = await _context.AuditLogs
                    .Where(a => a.CompanyId == companyId)
                    .OrderBy(a => a.CreatedAt)
                    .Take(recordsToDelete)
                    .ToListAsync();

                if (oldestLogs.Any())
                {
                    _context.AuditLogs.RemoveRange(oldestLogs);
                    var deletedCount = await _context.SaveChangesAsync();
                    
                    _logger.LogInformation($"Deleted {deletedCount} old audit logs by count for company {companyId}");
                    return deletedCount;
                }

                return 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error deleting old audit logs by count for company {companyId}");
                return 0;
            }
        }

        public async Task<CleanupResult> PerformFullCleanupAsync(Guid companyId, int maxRecords = 5000, int retentionDays = 30)
        {
            var result = new CleanupResult();
            
            try
            {
                // Get initial count for this company
                var initialCount = await _context.AuditLogs
                    .Where(a => a.CompanyId == companyId)
                    .CountAsync();
                
                var totalDeleted = 0;

                // Step 1: Delete logs older than retentionDays for this company
                var deletedByAge = await DeleteLogsOlderThanAsync(companyId, retentionDays);
                totalDeleted += deletedByAge;
                result.DeletedByAge = deletedByAge;

                // Step 2: If still exceeding maxRecords, delete oldest by count for this company
                var currentCount = await _context.AuditLogs
                    .Where(a => a.CompanyId == companyId)
                    .CountAsync();
                
                if (currentCount > maxRecords)
                {
                    var deletedByCount = await DeleteOldLogsAsync(companyId, maxRecords);
                    totalDeleted += deletedByCount;
                    result.DeletedByCount = deletedByCount;
                }

                // Get final count for this company
                var finalCount = await _context.AuditLogs
                    .Where(a => a.CompanyId == companyId)
                    .CountAsync();
                
                result.TotalDeleted = totalDeleted;
                result.RemainingCount = finalCount;
                result.Message = totalDeleted > 0 
                    ? $"Cleanup completed: Deleted {totalDeleted} logs (Age: {deletedByAge}, Count: {result.DeletedByCount}). Remaining: {finalCount} logs." 
                    : $"No cleanup needed. Current logs: {finalCount} (limit: {maxRecords}, retention: {retentionDays} days)";

                _logger.LogInformation(result.Message);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during full cleanup");
                result.Message = $"Cleanup failed: {ex.Message}";
                return result;
            }
        }

        public async Task<IEnumerable<AuditLog>> GetUserLogsAsync(Guid userId, DateTime? fromDate = null, DateTime? toDate = null)
        {
            var query = _context.AuditLogs
                .Include(a => a.User)
                .Include(a => a.Company)
                .Where(a => a.UserId == userId);

            if (fromDate.HasValue)
                query = query.Where(a => a.CreatedAt >= fromDate.Value);

            if (toDate.HasValue)
                query = query.Where(a => a.CreatedAt <= toDate.Value);

            return await query
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<AuditLog>> GetEntityLogsAsync(AuditEntityType entityType, string entityId)
        {
            return await _context.AuditLogs
                .Include(a => a.User)
                .Include(a => a.Company)
                .Where(a => a.EntityType == entityType && a.EntityId == entityId)
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();
        }

        public async Task<PagedResult<AuditLog>> GetLogsAsync(
            Guid? companyId = null,
            Guid? userId = null,
            AuditActionType? action = null,
            AuditEntityType? entityType = null,
            DateTime? fromDate = null,
            DateTime? toDate = null,
            string? searchTerm = null,
            int page = 1,
            int pageSize = 20)
        {
            var query = _context.AuditLogs
                .Include(a => a.User)
                .Include(a => a.Company)
                .AsQueryable();

            if (companyId.HasValue)
                query = query.Where(a => a.CompanyId == companyId.Value);

            if (userId.HasValue)
                query = query.Where(a => a.UserId == userId.Value);

            if (action.HasValue)
                query = query.Where(a => a.Action == action.Value);

            if (entityType.HasValue)
                query = query.Where(a => a.EntityType == entityType.Value);

            if (fromDate.HasValue)
                query = query.Where(a => a.CreatedAt >= fromDate.Value);

            if (toDate.HasValue)
                query = query.Where(a => a.CreatedAt <= toDate.Value);

            if (!string.IsNullOrEmpty(searchTerm))
            {
                query = query.Where(a =>
                    a.Description.Contains(searchTerm) ||
                    a.EntityName.Contains(searchTerm) ||
                    a.BillNumber.Contains(searchTerm) ||
                    a.User.Name.Contains(searchTerm));
            }

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(a => a.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new PagedResult<AuditLog>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<IEnumerable<AuditSummary>> GetAuditSummaryAsync(Guid companyId, DateTime? fromDate = null, DateTime? toDate = null)
        {
            var query = _context.AuditLogs
                .Where(a => a.CompanyId == companyId);

            if (fromDate.HasValue)
                query = query.Where(a => a.CreatedAt >= fromDate.Value);

            if (toDate.HasValue)
                query = query.Where(a => a.CreatedAt <= toDate.Value);

            var summary = await query
                .GroupBy(a => a.Action)
                .Select(g => new AuditSummary
                {
                    Action = g.Key,
                    Count = g.Count(),
                    LastOccurrence = g.Max(a => a.CreatedAt)
                })
                .ToListAsync();

            // Add total
            var total = new AuditSummary
            {
                Action = AuditActionType.View,
                Count = summary.Sum(s => s.Count),
                LastOccurrence = summary.Any() ? summary.Max(s => s.LastOccurrence) : null
            };

            var result = summary.ToList();
            result.Add(total);

            return result;
        }
    }

    public class PagedResult<T>
    {
        public IEnumerable<T> Items { get; set; } = new List<T>();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
        public bool HasNextPage => Page < TotalPages;
        public bool HasPreviousPage => Page > 1;
    }

    public class AuditSummary
    {
        public AuditActionType Action { get; set; }
        public int Count { get; set; }
        public DateTime? LastOccurrence { get; set; }
    }
}