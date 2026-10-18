using System.ComponentModel.DataAnnotations;

namespace TravelApi.DTOs;

// DTO = "Data Transfer Object": the exact shape of JSON going in/out of the API.

/// <summary>What the Passenger Entry form sends (passenger + one flight).</summary>
public class PassengerEntryDto
{
    [Required, StringLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required, StringLength(20)]
    public string Contact { get; set; } = string.Empty;

    [Required, StringLength(10)]
    public string Gender { get; set; } = string.Empty;

    [Required]
    public DateTime FlightDate { get; set; }

    [Required, StringLength(50)]
    public string Airline { get; set; } = string.Empty;

    [Required, StringLength(20)]
    public string FlightClass { get; set; } = string.Empty;

    [Required, StringLength(100)]
    public string Destination { get; set; } = string.Empty;
}

/// <summary>Passenger details only (admin GET / PUT on passengers).</summary>
public class PassengerDto
{
    public int PassengerId { get; set; }

    [Required, StringLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required, StringLength(20)]
    public string Contact { get; set; } = string.Empty;

    [Required, StringLength(10)]
    public string Gender { get; set; } = string.Empty;
}
