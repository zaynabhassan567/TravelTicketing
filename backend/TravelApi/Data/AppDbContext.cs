using Microsoft.EntityFrameworkCore;
using TravelApi.Models;

namespace TravelApi.Data;

/// <summary>
/// The bridge between C# classes and SQL Server tables.
/// The tables already exist (created by the SQL scripts), so we just map to them.
/// </summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Passenger> Passengers => Set<Passenger>();
    public DbSet<Ticket> Tickets => Set<Ticket>();
    public DbSet<User> Users => Set<User>();
    public DbSet<FlightPrice> FlightPrices => Set<FlightPrice>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Passenger>(entity =>
        {
            entity.ToTable("Passengers");
            entity.HasKey(p => p.PassengerId);

            // IMPORTANT: the user types the ID, so EF must NOT expect SQL to generate it
            entity.Property(p => p.PassengerId).ValueGeneratedNever();
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("Users");
            entity.HasKey(u => u.UserId);

            // A customer account is linked to (at most) one passenger profile.
            // If that passenger is deleted, the link is cleared (SET NULL).
            entity.HasOne<Passenger>()
                  .WithOne()
                  .HasForeignKey<User>(u => u.PassengerId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<FlightPrice>(entity =>
        {
            entity.ToTable("FlightPrices");
            // Composite key: the pair (Airline, FlightClass) is unique
            entity.HasKey(fp => new { fp.Airline, fp.FlightClass });
            entity.Property(fp => fp.Price).HasColumnType("decimal(10,2)");
        });

        modelBuilder.Entity<Ticket>(entity =>
        {
            entity.ToTable("Tickets");
            entity.HasKey(t => t.TicketId);
            entity.Property(t => t.FlightDate).HasColumnType("date");
            entity.Property(t => t.Price).HasColumnType("decimal(10,2)");

            // One passenger -> many tickets
            entity.HasOne(t => t.Passenger)
                  .WithMany(p => p.Tickets)
                  .HasForeignKey(t => t.PassengerId)
                  .OnDelete(DeleteBehavior.Cascade);

            // One user (account) -> many tickets they booked
            entity.HasOne(t => t.BookedBy)
                  .WithMany()
                  .HasForeignKey(t => t.BookedByUserId)
                  .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
