using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using System.Text.Json;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class EnsureCompanySelectedAttribute : Attribute, IAuthorizationFilter
{
    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var httpContext = context.HttpContext;

        // Debug logging
        var sessionData = new
        {
            CurrentCompany = httpContext.Session.GetString("currentCompany"),
            CurrentCompanyName = httpContext.Session.GetString("currentCompanyName"),
            CurrentFiscalYear = httpContext.Session.GetString("currentFiscalYear")
        };

        Console.WriteLine($"Session data: {JsonSerializer.Serialize(sessionData)}");

        if (string.IsNullOrEmpty(httpContext.Session.GetString("currentCompany")))
        {
            // Check if it's an API request
            var path = httpContext.Request.Path.Value;
            if (path != null && path.StartsWith("/api", StringComparison.OrdinalIgnoreCase))
            {
                context.Result = new JsonResult(new
                {
                    success = false,
                    error = "No company selected",
                    redirectTo = "/select-company"
                })
                {
                    StatusCode = 400
                };
            }
            else
            {
                httpContext.Session.SetString("error", "Please select a company first");
                context.Result = new RedirectToRouteResult(
                    new RouteValueDictionary
                    {
                        { "controller", "Company" },
                        { "action", "Select" }
                    });
            }
        }
        else
        {
            // Set in ViewData for views
            context.HttpContext.Items["currentCompanyName"] =
                httpContext.Session.GetString("currentCompanyName");
        }
    }
}