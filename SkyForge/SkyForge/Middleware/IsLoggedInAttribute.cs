using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class IsLoggedInAttribute : Attribute, IAuthorizationFilter
{
    public void OnAuthorization(AuthorizationFilterContext context)
    {
        if (!context.HttpContext.User.Identity.IsAuthenticated)
        {
            context.HttpContext.Session.SetString("error", "You must be signed in first!");
            context.Result = new RedirectToRouteResult(
                new RouteValueDictionary
                {
                    { "controller", "Auth" },
                    { "action", "Login" }
                });
        }
    }
}