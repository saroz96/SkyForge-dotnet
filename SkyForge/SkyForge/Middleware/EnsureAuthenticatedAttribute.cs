using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using System.Security.Claims;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class EnsureAuthenticatedAttribute : Attribute, IAuthorizationFilter
{
    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var user = context.HttpContext.User;

        if (!user.Identity.IsAuthenticated)
        {
            context.HttpContext.Session.SetString("error", "Please log in to view that resource");
            context.Result = new RedirectToRouteResult(
                new RouteValueDictionary
                {
                    { "controller", "Auth" },
                    { "action", "Login" }
                });
            return;
        }

        // Check if user is deactivated (assuming claim exists)
        var isActiveClaim = user.FindFirst("isActive");
        if (isActiveClaim != null && isActiveClaim.Value == "false")
        {
            // Sign out the user
            context.HttpContext.SignOutAsync();

            context.HttpContext.Session.SetString("error",
                "Your account has been deactivated. Please contact the admin.");
            context.Result = new RedirectToRouteResult(
                new RouteValueDictionary
                {
                    { "controller", "Auth" },
                    { "action", "Login" }
                });
        }
    }
}