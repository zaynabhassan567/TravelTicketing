using Microsoft.EntityFrameworkCore;

namespace TravelApi.Data;

/// <summary>
/// The server always works out the price itself from the FlightPrices table.
/// It never trusts a price sent by the browser (someone could edit it).
/// </summary>
public static class PriceLookup
{
    /// <returns>The price, or null if that airline doesn't offer that class.</returns>
    public static Task<decimal?> FindPriceAsync(this AppDbContext db, string airline, string flightClass)
    {
        return db.FlightPrices
            .Where(p => p.Airline == airline && p.FlightClass == flightClass)
            .Select(p => (decimal?)p.Price)
            .FirstOrDefaultAsync();
    }
}
