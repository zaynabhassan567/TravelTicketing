namespace TravelApi.Models;

/// <summary>
/// One row in the Tickets table (a single flight).
/// </summary>
public class Ticket
{
    public int TicketId { get; set; }          // auto-generated (IDENTITY)
    public int PassengerId { get; set; }       // foreign key -> Passengers (who flies)
    public DateTime FlightDate { get; set; }
    public string Airline { get; set; } = string.Empty;
    public string FlightClass { get; set; } = string.Empty;
    public decimal Price { get; set; }         // copied from FlightPrices when booked
    public string Destination { get; set; } = string.Empty;
    public int BookedByUserId { get; set; }    // foreign key -> Users (who booked it)

    // Navigation properties
    public Passenger? Passenger { get; set; }
    public User? BookedBy { get; set; }
}
