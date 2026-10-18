namespace TravelApi.Models;

/// <summary>One row in the FlightPrices table: the price for an airline + class.</summary>
public class FlightPrice
{
    public string Airline { get; set; } = string.Empty;
    public string FlightClass { get; set; } = string.Empty;  // Economy, Business, First
    public decimal Price { get; set; }
}
