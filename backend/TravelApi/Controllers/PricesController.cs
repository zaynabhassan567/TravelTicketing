using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelApi.Data;
using TravelApi.DTOs;

namespace TravelApi.Controllers;

/// <summary>
///   GET api/prices -> the full price list (airline + class + price).
/// React loads this once after login and uses it to fill the Airline and
/// Class dropdowns and to show the price preview instantly.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PricesController : ControllerBase
{
    private readonly AppDbContext _db;

    public PricesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<PriceDto>>> GetAll()
    {
        var prices = await _db.FlightPrices
            .OrderBy(p => p.Airline)
            .ThenBy(p => p.Price)
            .Select(p => new PriceDto
            {
                Airline = p.Airline,
                FlightClass = p.FlightClass,
                Price = p.Price
            })
            .ToListAsync();

        return Ok(prices);
    }
}
