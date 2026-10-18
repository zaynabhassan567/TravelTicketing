using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelApi.Auth;
using TravelApi.Data;
using TravelApi.DTOs;
using TravelApi.Models;

namespace TravelApi.Controllers;

/// <summary>
/// Travel history for one passenger.
///   GET api/tickets/history/{passengerId} -> passenger name + flights
///   PUT api/tickets/history/{passengerId} -> "Save all": replace the flights
///
/// Who sees what:
///   Admin    -> every flight of that passenger
///   Customer -> only the flights THEY booked for that passenger
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TicketsController : ControllerBase
{
    private readonly AppDbContext _db;

    public TicketsController(AppDbContext db) => _db = db;



    // GET api/tickets -> the bookings list
    //   Admin    -> every booking in the system
    //   Customer -> only the bookings they made
    [HttpGet]
    public async Task<ActionResult<List<BookingRowDto>>> GetAll()
    {
        var isAdmin = User.IsAdmin();
        var userId = User.GetUserId();

        var bookings = await _db.Tickets
            .Where(t => isAdmin || t.BookedByUserId == userId)
            .OrderByDescending(t => t.FlightDate)
            .ThenBy(t => t.PassengerId)
            .Select(t => new BookingRowDto
            {
                TicketId = t.TicketId,
                PassengerId = t.PassengerId,
                PassengerName = t.Passenger!.Name,
                FlightDate = t.FlightDate,
                Airline = t.Airline,
                FlightClass = t.FlightClass,
                Price = t.Price,
                Destination = t.Destination,
                BookedBy = t.BookedBy!.Username
            })
            .ToListAsync();

        return Ok(bookings);
    }
    [HttpGet("history/{passengerId:int}")]
    public async Task<ActionResult<HistoryDto>> GetHistory(int passengerId)
    {
        var isAdmin = User.IsAdmin();
        var history = await LoadHistory(passengerId, User.GetUserId(), isAdmin);

        if (history is null)
            return NotFound(new { message = NotFoundMessage(passengerId, isAdmin) });

        // A customer with no flights for this passenger shouldn't see their name either
        if (!isAdmin && history.Tickets.Count == 0)
            return NotFound(new { message = NotFoundMessage(passengerId, isAdmin) });

        return Ok(history);
    }

    /// <summary>
    /// Bulk sync, same idea as before:
    /// 1) delete the flights this user is allowed to manage for the passenger
    /// 2) insert the full list sent by the frontend
    /// Both inside ONE transaction, so it's all-or-nothing.
    /// Rules:
    ///   - customers can only save their OWN passenger profile
    ///   - admins can edit or delete flights, but not add new ones (customers book)
    ///   - new or changed dates must be today or later
    /// </summary>
    [HttpPut("history/{passengerId:int}")]
    public async Task<ActionResult<HistoryDto>> SaveAll(int passengerId, List<TicketItemDto> items)
    {
        var userId = User.GetUserId();
        var isAdmin = User.IsAdmin();

        if (!await _db.Passengers.AnyAsync(p => p.PassengerId == passengerId))
            return NotFound(new { message = NotFoundMessage(passengerId, isAdmin) });

        if (!isAdmin)
        {
            var myPassengerId = await _db.Users
                .Where(u => u.UserId == userId)
                .Select(u => u.PassengerId)
                .FirstOrDefaultAsync();
            if (myPassengerId != passengerId)
                return Forbid();   // 403: not your passenger profile
        }

        // The rows this user may replace: admin = all of them, customer = only their own
        var editable = _db.Tickets.Where(t =>
            t.PassengerId == passengerId && (isAdmin || t.BookedByUserId == userId));

        // Remember each existing row's owner and date
        var originals = await editable
            .Select(t => new { t.TicketId, t.BookedByUserId, t.FlightDate })
            .ToDictionaryAsync(t => t.TicketId);

        // Check and price every row BEFORE deleting anything
        var priceList = await _db.FlightPrices.ToListAsync();
        var newTickets = new List<Ticket>();

        foreach (var item in items)
        {
            originals.TryGetValue(item.TicketId ?? 0, out var original);

            if (isAdmin && original == null)
                return BadRequest(new { message = "Admins can't add new flights. Customers book their own." });

            // New rows and changed dates must be today or later (old dates may stay)
            var keepsOldDate = original != null && original.FlightDate.Date == item.FlightDate.Date;
            if (!keepsOldDate && item.FlightDate.Date < DateTime.Today)
                return BadRequest(new
                {
                    message = $"{item.FlightDate:dd MMM yyyy} is in the past. New or changed flight dates must be today or later."
                });

            var match = priceList.FirstOrDefault(p =>
                string.Equals(p.Airline, item.Airline, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(p.FlightClass, item.FlightClass, StringComparison.OrdinalIgnoreCase));

            if (match is null)
                return BadRequest(new { message = $"{item.Airline} doesn't offer {item.FlightClass} class." });

            newTickets.Add(new Ticket
            {
                PassengerId = passengerId,
                FlightDate = item.FlightDate.Date,
                Airline = match.Airline,
                FlightClass = match.FlightClass,
                Price = match.Price,
                Destination = item.Destination.Trim(),
                BookedByUserId = original?.BookedByUserId ?? userId   // existing row keeps its owner
            });
        }

        await using var transaction = await _db.Database.BeginTransactionAsync();

        await editable.ExecuteDeleteAsync();   // Step 1: clear
        _db.Tickets.AddRange(newTickets);      // Step 2: bulk insert
        await _db.SaveChangesAsync();

        await transaction.CommitAsync();

        return Ok(await LoadHistory(passengerId, userId, isAdmin));
    }

    // Builds the HistoryDto (or null if the passenger doesn't exist)
    private async Task<HistoryDto?> LoadHistory(int passengerId, int userId, bool isAdmin)
    {
        return await _db.Passengers
            .Where(p => p.PassengerId == passengerId)
            .Select(p => new HistoryDto
            {
                PassengerId = p.PassengerId,
                Name = p.Name,
                Tickets = p.Tickets
                    .Where(t => isAdmin || t.BookedByUserId == userId)
                    .OrderBy(t => t.FlightDate)
                    .Select(t => new TicketRowDto
                    {
                        TicketId = t.TicketId,
                        FlightDate = t.FlightDate,
                        Airline = t.Airline,
                        FlightClass = t.FlightClass,
                        Price = t.Price,
                        Destination = t.Destination,
                        BookedBy = t.BookedBy!.Username
                    })
                    .ToList()
            })
            .FirstOrDefaultAsync();
    }

    private static string NotFoundMessage(int passengerId, bool isAdmin) => isAdmin
        ? $"No passenger found with ID {passengerId}."
        : $"You haven't booked any flights for passenger {passengerId}.";
}
