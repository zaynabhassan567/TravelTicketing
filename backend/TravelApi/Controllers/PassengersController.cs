using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TravelApi.Auth;
using TravelApi.Data;
using TravelApi.DTOs;
using TravelApi.Models;
using Microsoft.EntityFrameworkCore;

namespace TravelApi.Controllers;

/// <summary>
/// Passengers. Everything here needs a login token ([Authorize]).
///   POST   api/passengers        -> Entry form: save passenger + book one flight (any user)
///   GET    api/passengers        -> list all passengers        (Admin only)
///   GET    api/passengers/{id}   -> one passenger              (Admin only)
///   PUT    api/passengers/{id}   -> update passenger details   (Admin only)
///   DELETE api/passengers/{id}   -> delete passenger + tickets (Admin only)
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PassengersController : ControllerBase
{
    private readonly AppDbContext _db;

    public PassengersController(AppDbContext db) => _db = db;

    // CREATE (used by the Save button on the Entry form)
    [HttpPost]
    public async Task<IActionResult> SaveEntry(PassengerEntryDto dto)
    {
        // 1) Work out the price on the server
        var price = await _db.FindPriceAsync(dto.Airline, dto.FlightClass);
        if (price is null)
            return BadRequest(new { message = $"{dto.Airline} doesn't offer {dto.FlightClass} class." });

        // 2) Create or update the passenger
        var passenger = await _db.Passengers.FindAsync(dto.PassengerId);
        string message;

        if (passenger is null)
        {
            _db.Passengers.Add(new Passenger
            {
                PassengerId = dto.PassengerId,
                Name = dto.Name.Trim(),
                Contact = dto.Contact.Trim(),
                Gender = dto.Gender
            });
            message = $"Passenger {dto.PassengerId} created and flight booked.";
        }
        else if (User.IsAdmin())
        {
            passenger.Name = dto.Name.Trim();
            passenger.Contact = dto.Contact.Trim();
            passenger.Gender = dto.Gender;
            message = $"Flight booked and passenger {dto.PassengerId}'s details updated.";
        }
        else
        {
            // Customers may book for an existing passenger, but can't overwrite
            // details that someone else saved.
            message = $"Flight booked for existing passenger {dto.PassengerId}. Their saved details were kept.";
        }

        // 3) Add the ticket, owned by whoever is logged in
        _db.Tickets.Add(new Ticket
        {
            PassengerId = dto.PassengerId,
            FlightDate = dto.FlightDate.Date,
            Airline = dto.Airline,
            FlightClass = dto.FlightClass,
            Price = price.Value,
            Destination = dto.Destination.Trim(),
            BookedByUserId = User.GetUserId()
        });

        await _db.SaveChangesAsync();
        return Ok(new { message });
    }

    // READ (all)
    [HttpGet]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<List<PassengerDto>>> GetAll()
    {
        var passengers = await _db.Passengers
            .OrderBy(p => p.PassengerId)
            .Select(p => new PassengerDto
            {
                PassengerId = p.PassengerId,
                Name = p.Name,
                Contact = p.Contact,
                Gender = p.Gender
            })
            .ToListAsync();

        return Ok(passengers);
    }

   
    // READ (one) - the entry form calls this to auto-fill an existing passenger.
    //   Admin    -> any passenger
    //   Customer -> only passengers they have booked a flight for
    //               (so customers can't look up strangers' phone numbers)
    [HttpGet("{id:int}")]
    public async Task<ActionResult<PassengerDto>> GetById(int id)
    {
        var isAdmin = User.IsAdmin();
        var userId = User.GetUserId();

        var passenger = await _db.Passengers
            .Where(x => x.PassengerId == id &&
                        (isAdmin || x.Tickets.Any(t => t.BookedByUserId == userId)))
            .Select(x => new PassengerDto
            {
                PassengerId = x.PassengerId,
                Name = x.Name,
                Contact = x.Contact,
                Gender = x.Gender
            })
            .FirstOrDefaultAsync();

        if (passenger is null)
            return NotFound(new { message = $"No saved details for passenger {id}." });

        return Ok(passenger);
    }

    // UPDATE
    [HttpPut("{id:int}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> Update(int id, PassengerDto dto)
    {
        var passenger = await _db.Passengers.FindAsync(id);
        if (passenger is null) return NotFound(new { message = $"No passenger found with ID {id}." });

        passenger.Name = dto.Name.Trim();
        passenger.Contact = dto.Contact.Trim();
        passenger.Gender = dto.Gender;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE (tickets are removed automatically thanks to ON DELETE CASCADE)
    [HttpDelete("{id:int}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> Delete(int id)
    {
        var passenger = await _db.Passengers.FindAsync(id);
        if (passenger is null) return NotFound(new { message = $"No passenger found with ID {id}." });

        _db.Passengers.Remove(passenger);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
