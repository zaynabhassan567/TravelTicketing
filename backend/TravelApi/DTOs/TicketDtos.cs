using System.ComponentModel.DataAnnotations;

namespace TravelApi.DTOs;

/// <summary>One flight row, as sent by the "Save all" button.</summary>
public class TicketItemDto
{
    // Set for rows that already existed, null for rows added in the browser.
    // Only used to keep the original "booked by" owner when an admin saves.
    public int? TicketId { get; set; }

    [Required]
    public DateTime FlightDate { get; set; }

    [Required, StringLength(50)]
    public string Airline { get; set; } = string.Empty;

    [Required, StringLength(20)]
    public string FlightClass { get; set; } = string.Empty;

    [Required, StringLength(100)]
    public string Destination { get; set; } = string.Empty;
}

/// <summary>One flight row as returned to the History page.</summary>
public class TicketRowDto
{
    public int TicketId { get; set; }
    public DateTime FlightDate { get; set; }
    public string Airline { get; set; } = string.Empty;
    public string FlightClass { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string Destination { get; set; } = string.Empty;
    public string BookedBy { get; set; } = string.Empty;   // username
}

/// <summary>Everything the History page needs for one passenger.</summary>
public class HistoryDto
{
    public int PassengerId { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<TicketRowDto> Tickets { get; set; } = new();
}

/// <summary>One line of the price list.</summary>
public class PriceDto
{
    public string Airline { get; set; } = string.Empty;
    public string FlightClass { get; set; } = string.Empty;
    public decimal Price { get; set; }
}


/// <summary>One row of the bookings list (All bookings / My bookings tab).</summary>
public class BookingRowDto
{
    public int TicketId { get; set; }
    public int PassengerId { get; set; }
    public string PassengerName { get; set; } = string.Empty;
    public DateTime FlightDate { get; set; }
    public string Airline { get; set; } = string.Empty;
    public string FlightClass { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string Destination { get; set; } = string.Empty;
    public string BookedBy { get; set; } = string.Empty;   // username
}