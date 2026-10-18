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
///   POST   api/passengers        -> "Book a flight" (Customer only; assigns/reuses their Passenger ID)
///   GET    api/passengers/me     -> the customer's own passenger profile (Customer only)
///   GET    api/passengers        -> list all passengers        (Admin only)
///   GET    api/passengers/{id}   -> one passenger              (Admin: any, Customer: own)
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

    // CREATE - the customer's "Book a flight" form. Only customers book.
    //   First booking  -> a NEW Passenger ID is assigned and linked to the account
    //   Later bookings -> the SAME Passenger ID is used again
    [HttpPost]
    [Authorize(Roles = Roles.Customer)]
    public async Task<IActionResult> SaveEntry(PassengerEntryDto dto)
    {
        // 1) Flights can only be booked for today or a later date
        if (dto.FlightDate.Date < DateTime.Today)
            return BadRequest(new { message = "Flight date can't be in the past. Pick today or a later date." });

        // 2) Work out the price on the server
        var price = await _db.FindPriceAsync(dto.Airline, dto.FlightClass);
        if (price is null)
            return BadRequest(new { message = $"{dto.Airline} doesn't offer {dto.FlightClass} class." });

        // 3) Find this customer's passenger profile, or create one with a new ID
        var userId = User.GetUserId();
        var user = await _db.Users.FindAsync(userId);
        if (user is null) return Unauthorized();

        Passenger? passenger = user.PassengerId is int existingId
            ? await _db.Passengers.FindAsync(existingId)
            : null;

        string message;
        if (passenger is null)
        {
            // New ID = highest existing Passenger ID + 1
            var nextId = (await _db.Passengers.MaxAsync(p => (int?)p.PassengerId) ?? 0) + 1;
            passenger = new Passenger { PassengerId = nextId };
            _db.Passengers.Add(passenger);
            user.PassengerId = nextId;   // link it to the account for next time
            message = $"Flight booked. Your Passenger ID is {nextId}, and it will be used for all your bookings.";
        }
        else
        {
            message = $"Flight booked for Passenger ID {passenger.PassengerId}.";
        }

        // The customer's own details (they may update them)
        passenger.Name = dto.Name.Trim();
        passenger.Contact = dto.Contact.Trim();
        passenger.Gender = dto.Gender;

        // 4) Add the ticket
        _db.Tickets.Add(new Ticket
        {
            PassengerId = passenger.PassengerId,
            FlightDate = dto.FlightDate.Date,
            Airline = dto.Airline,
            FlightClass = dto.FlightClass,
            Price = price.Value,
            Destination = dto.Destination.Trim(),
            BookedByUserId = userId
        });

        await _db.SaveChangesAsync();
        return Ok(new { message, passengerId = passenger.PassengerId });
    }

    // GET api/passengers/me -> the logged-in customer's own passenger profile.
    // 404 = no booking yet, so no Passenger ID has been assigned.
    [HttpGet("me")]
    [Authorize(Roles = Roles.Customer)]
    public async Task<ActionResult<PassengerDto>> GetMyProfile()
    {
        var userId = User.GetUserId();
        var passengerId = await _db.Users
            .Where(u => u.UserId == userId)
            .Select(u => u.PassengerId)
            .FirstOrDefaultAsync();

        var p = passengerId is int id ? await _db.Passengers.FindAsync(id) : null;
        if (p is null)
            return NotFound(new { message = "No Passenger ID yet. One is assigned on your first booking." });

        return Ok(new PassengerDto
        {
            PassengerId = p.PassengerId,
            Name = p.Name,
            Contact = p.Contact,
            Gender = p.Gender
        });
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
