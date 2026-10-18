using System.ComponentModel.DataAnnotations;

namespace TravelApi.DTOs;

/// <summary>Sent by the Register form.</summary>
public class RegisterDto
{
    [Required, StringLength(50, MinimumLength = 3)]
    [RegularExpression(@"^[A-Za-z0-9_.]+$",
        ErrorMessage = "Username can only use letters, numbers, dots and underscores.")]
    public string Username { get; set; } = string.Empty;

    [Required, StringLength(100, MinimumLength = 6,
        ErrorMessage = "Password must be at least 6 characters.")]
    public string Password { get; set; } = string.Empty;
}

/// <summary>Sent by the Login form.</summary>
public class LoginDto
{
    [Required]
    public string Username { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}

/// <summary>Returned after a successful login.</summary>
public class AuthResponseDto
{
    public string Token { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }   // UTC
}
