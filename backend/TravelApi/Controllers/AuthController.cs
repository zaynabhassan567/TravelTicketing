using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelApi.Auth;
using TravelApi.Data;
using TravelApi.DTOs;
using TravelApi.Models;

namespace TravelApi.Controllers;

/// <summary>
/// Accounts.
///   POST api/auth/register -> create a Customer account
///   POST api/auth/login    -> check username + password, return a JWT token
/// These two endpoints are open to everyone (you can't have a token before logging in).
/// </summary>
[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly TokenService _tokens;

    public AuthController(AppDbContext db, TokenService tokens)
    {
        _db = db;
        _tokens = tokens;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterDto dto)
    {
        var username = dto.Username.Trim();

        if (await _db.Users.AnyAsync(u => u.Username == username))
            return Conflict(new { message = "That username is taken. Choose another one." });

        _db.Users.Add(new User
        {
            Username = username,
            // HashPassword adds a random "salt" and scrambles the password one-way.
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Role = Roles.Customer   // the app never lets people make themselves Admin
        });
        await _db.SaveChangesAsync();

        return Ok(new { message = "Account created. Log in with your new username." });
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login(LoginDto dto)
    {
        var username = dto.Username.Trim();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == username);

        // Same message for "no such user" and "wrong password",
        // so nobody can find out which usernames exist.
        if (user is null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return Unauthorized(new { message = "Wrong username or password." });

        var (token, expiresAt) = _tokens.CreateToken(user);

        return Ok(new AuthResponseDto
        {
            Token = token,
            Username = user.Username,
            Role = user.Role,
            ExpiresAt = expiresAt
        });
    }
}
