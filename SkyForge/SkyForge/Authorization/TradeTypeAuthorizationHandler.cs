// Authorization/TradeTypeAuthorizationHandler.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using SkyForge.Data;
using SkyForge.Models.CompanyModel;
using System;
using System.Threading.Tasks;

public class TradeTypeRequirement : IAuthorizationRequirement
{
    public TradeType RequiredTradeType { get; }

    public TradeTypeRequirement(TradeType requiredTradeType)
    {
        RequiredTradeType = requiredTradeType;
    }
}

public class TradeTypeAuthorizationHandler : AuthorizationHandler<TradeTypeRequirement>
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IServiceProvider _serviceProvider;

    public TradeTypeAuthorizationHandler(
        IHttpContextAccessor httpContextAccessor,
        IServiceProvider serviceProvider)
    {
        _httpContextAccessor = httpContextAccessor;
        _serviceProvider = serviceProvider;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        TradeTypeRequirement requirement)
    {
        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext == null)
        {
            context.Fail();
            return;
        }

        var user = httpContext.User;
        if (!user.Identity?.IsAuthenticated ?? true)
        {
            context.Fail();
            return;
        }

        // Get company ID from JWT claims
        var companyIdClaim = user.FindFirst("currentCompanyId")?.Value;
        if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out Guid companyId))
        {
            context.Fail();
            return;
        }

        // Get trade type
        var tradeType = httpContext.Items["TradeType"] as TradeType?;

        if (!tradeType.HasValue)
        {
            // Get from database
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var company = await dbContext.Companies.FindAsync(companyId);
            if (company == null)
            {
                context.Fail();
                return;
            }

            tradeType = company.TradeType;
            httpContext.Items["TradeType"] = tradeType.Value;
        }

        // Check if trade type matches requirement
        if (tradeType.Value == requirement.RequiredTradeType)
        {
            context.Succeed(requirement);
        }
        else
        {
            context.Fail();
        }
    }
}