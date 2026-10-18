namespace TravelApi.Models;

/// <summary>One row in the Users table (a login account).</summary>
public class User
{
    public int UserId { get; set; }                         // auto-generated
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty; // BCrypt hash, never the real password
    public string Role { get; set; } = string.Empty;         // "Admin" or "Customer"

    // Customers only: their own passenger profile. Null until their first booking.
    public int? PassengerId { get; set; }
}
