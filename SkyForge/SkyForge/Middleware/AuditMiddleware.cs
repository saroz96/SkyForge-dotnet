// Middleware/AuditMiddleware.cs
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using SkyForge.Models.Audit;
using SkyForge.Services.Audit;

namespace SkyForge.Middleware
{
    public class AuditMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<AuditMiddleware> _logger;

        public AuditMiddleware(RequestDelegate next, ILogger<AuditMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context, IAuditService auditService)
        {
            var path = context.Request.Path.Value?.ToLower() ?? "";
            var shouldLog = ShouldLogEndpoint(path);

            var method = context.Request.Method.ToUpper();
            var entityId = ExtractIdFromPath(path);
            var action = GetActionFromMethod(method);
            var entityType = GetEntityTypeFromPath(path);

            // Continue with the request first
            await _next(context);

            // Log AFTER the response is sent
            if (shouldLog && context.User?.Identity?.IsAuthenticated == true)
            {
                var statusCode = context.Response.StatusCode;
                if (statusCode >= 200 && statusCode < 300)
                {
                    try
                    {
                        await auditService.LogAsync(
                            action,
                            entityType,
                            entityId,
                            description: $"{action} {entityType} via API",
                            requestPath: path,
                            requestMethod: method
                        );
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error in audit logging");
                    }
                }
            }
        }

        private bool ShouldLogEndpoint(string path)
        {
            // Exclude these paths from logging
            var excludedPaths = new[] {
                "/api/auth/login",
                "/api/auth/logout",
                "/api/health",
                "/swagger",
                "/favicon.ico",
                "/api/audit"  // Don't audit the audit endpoints
            };

            if (excludedPaths.Any(p => path.Contains(p)))
                return false;

            // Include these paths for logging
            var includedPaths = new[] {
                // Sales & Purchase
                "/api/retailer/credit-sales",
                "/api/retailer/cash-sales",
                "/api/retailer/purchase",
                "/api/retailer/sales-return",
                "/api/retailer/purchase-return",
                "/api/retailer/sales-quotation",
                
                // Items & Inventory
                "/api/retailer/items",
                "/api/retailer/categories",
                "/api/retailer/units",
                "/api/retailer/mainunits",
                "/api/retailer/stock",
                "/api/retailer/stockadjustments",
                "/api/retailer/stock-status",
                "/api/retailer/items/reorder",
                "/api/retailer/items-ledger",
                "/api/retailer/compositions",
                "/api/retailer/items-company",
                
                // Accounts & Groups
                "/api/retailer/accounts",
                "/api/retailer/accounts-group",
                
                // Payments & Receipts
                "/api/retailer/payments",
                "/api/retailer/receipts",
                "/api/retailer/journal",
                "/api/retailer/debit-note",
                "/api/retailer/credit-note",
                
                // Reports
                "/api/retailer/ageing-report/all-accounts",
                "/api/retailer/day-count-aging",
                "/api/retailer/statement",
                "/api/retailer/sales-vat-report",
                "/api/retailer/salesreturn-vat-report",
                "/api/retailer/purchase-vat-report",
                "/api/retailer/purchasereturn-vat-report",
                "/api/retailer/monthly-vat-summary",
                "/api/retailer/confirmation-of-vat",
                "/api/retailer/daily-profit/sales-analysis",
                "/api/retailer/invoicewise/profitloss",
                
                // Configuration & Settings
                "/api/retailer/voucherconfiguration",
                "/api/change-fiscal-year",
                "/api/list-of-existing/fiscalyears",
                
                // User & Authentication
                "/api/auth/user/change-password",
                "/api/auth/admin/users/list",
                "/api/auth/users/view",
                "/api/user-dashboard",
                "/api/logout"
            };

            // Check if path starts with any included path
            return includedPaths.Any(p => path.Contains(p));
        }

        private AuditActionType GetActionFromMethod(string method)
        {
            return method switch
            {
                "POST" => AuditActionType.Create,
                "PUT" or "PATCH" => AuditActionType.Update,
                "DELETE" => AuditActionType.Delete,
                _ => AuditActionType.View
            };
        }

        private AuditEntityType GetEntityTypeFromPath(string path)
        {
            // Sales & Purchase
            if (path.Contains("credit-sales") || path.Contains("cash-sales"))
                return AuditEntityType.SalesBill;
            if (path.Contains("purchase") && !path.Contains("return"))
                return AuditEntityType.PurchaseBill;
            if (path.Contains("sales-return"))
                return AuditEntityType.SalesReturn;
            if (path.Contains("purchase-return"))
                return AuditEntityType.PurchaseReturn;
            if (path.Contains("sales-quotation"))
                return AuditEntityType.SalesBill;
            
            // Items & Inventory
            if (path.Contains("items") || path.Contains("categories") || 
                path.Contains("units") || path.Contains("mainunits"))
                return AuditEntityType.Item;
            if (path.Contains("stock") && !path.Contains("stock-status"))
                return AuditEntityType.StockEntry;
            if (path.Contains("stockadjustments"))
                return AuditEntityType.StockEntry;
            if (path.Contains("compositions") || path.Contains("items-company"))
                return AuditEntityType.Item;
            
            // Accounts
            if (path.Contains("accounts"))
                return AuditEntityType.Account;
            if (path.Contains("accounts-group"))
                return AuditEntityType.Account;
            
            // Payments & Receipts
            if (path.Contains("payments"))
                return AuditEntityType.Payment;
            if (path.Contains("receipts"))
                return AuditEntityType.Receipt;
            if (path.Contains("journal"))
                return AuditEntityType.Transaction;
            if (path.Contains("debit-note"))
                return AuditEntityType.Transaction;
            if (path.Contains("credit-note"))
                return AuditEntityType.Transaction;
            
            // Reports
            if (path.Contains("ageing-report") || path.Contains("day-count-aging") || 
                path.Contains("statement") || path.Contains("vat-report") ||
                path.Contains("monthly-vat-summary") || path.Contains("confirmation-of-vat") ||
                path.Contains("daily-profit") || path.Contains("invoicewise"))
                return AuditEntityType.Transaction;
            
            // User & Authentication
            if (path.Contains("users") || path.Contains("user"))
                return AuditEntityType.User;
            if (path.Contains("fiscal-year") || path.Contains("fiscalyears"))
                return AuditEntityType.FiscalYear;
            
            // Default
            return AuditEntityType.SalesBill;
        }

        private string? ExtractIdFromPath(string path)
        {
            var segments = path.Split('/');
            foreach (var segment in segments)
            {
                if (Guid.TryParse(segment, out _))
                    return segment;
            }
            return null;
        }
    }
}