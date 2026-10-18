using System.Security.Claims;

namespace TravelApi.Auth;

/// <summary>
/// Helpers to read the logged-in user from the token.
/// Inside a controller, "User" is the person whose token came with the request.
/// </summary>
public static class UserExtensions
{
    public static int GetUserId(this ClaimsPrincipal user)
    {
        var value = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("nameid");
        return int.TryParse(value, out var id)
            ? id
            : throw new InvalidOperationException("The login token has no user id.");
    }

    public static bool IsAdmin(this ClaimsPrincipal user) => user.IsInRole(Roles.Admin);
}
