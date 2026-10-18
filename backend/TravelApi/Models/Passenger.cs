namespace TravelApi.Models;

/// <summary>
/// One row in the Passengers table.
/// </summary>
public class Passenger
{
    // Entered by the user (not auto-generated) - see AppDbContext
    public int PassengerId { get; set; }

    public string Name { get; set; } = string.Empty;
    public string Contact { get; set; } = string.Empty;
    public string Gender { get; set; } = string.Empty;

    // Navigation property: all tickets that belong to this passenger
    public List<Ticket> Tickets { get; set; } = new();
}
