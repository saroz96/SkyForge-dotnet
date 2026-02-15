// Attributes/EnsureTradeTypeAttribute.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.DependencyInjection;
using SkyForge.Data;
using SkyForge.Models.CompanyModel;
using System;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class EnsureTradeTypeAttribute : Attribute, IAsyncActionFilter
{
    private readonly TradeType? _requiredTradeType;

    // Constructor without parameters - just ensures trade type is available
    public EnsureTradeTypeAttribute() { }

    // Constructor with required trade type parameter
    public EnsureTradeTypeAttribute(TradeType requiredTradeType)
    {
        _requiredTradeType = requiredTradeType;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var httpContext = context.HttpContext;
        var user = httpContext.User;

        // Check if user is authenticated
        if (!user.Identity?.IsAuthenticated ?? true)
        {
            await next();
            return;
        }

        // Get company ID from JWT claims
        var companyIdClaim = user.FindFirst("currentCompanyId")?.Value;
        if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out Guid companyId))
        {
            context.Result = new JsonResult(new
            {
                success = false,
                error = "Please select a company first",
                redirectTo = "/api/company/select"
            })
            {
                StatusCode = 400
            };
            return;
        }

        // Get trade type from HttpContext.Items (set by middleware) or database
        var tradeType = httpContext.Items["TradeType"] as TradeType?;

        if (!tradeType.HasValue)
        {
            var dbContext = httpContext.RequestServices.GetRequiredService<ApplicationDbContext>();
            var company = await dbContext.Companies.FindAsync(companyId);

            if (company == null)
            {
                context.Result = new JsonResult(new
                {
                    success = false,
                    error = "Company not found",
                    redirectTo = "/api/company/select"
                })
                {
                    StatusCode = 404
                };
                return;
            }

            tradeType = company.TradeType;
            httpContext.Items["TradeType"] = tradeType.Value;
            httpContext.Items["CompanyName"] = company.Name;
        }

        // Check if specific trade type is required
        if (_requiredTradeType.HasValue && tradeType.Value != _requiredTradeType.Value)
        {
            context.Result = new JsonResult(new
            {
                success = false,
                error = $"This feature is only available for {_requiredTradeType} companies",
                currentTradeType = tradeType.Value.ToString(),
                requiredTradeType = _requiredTradeType.Value.ToString()
            })
            {
                StatusCode = 403
            };
            return;
        }

        await next();
    }
}