import { useEffect, useState } from "react";
import { getBookings } from "../api";
import { formatPrice } from "../pricing";

// Turns "2026-04-03T00:00:00" into "03 Apr 2026"
function formatDate(isoDate) {
  return new Date(`${isoDate.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Bookings list tab.
 * - Admin:    "All bookings"  -> every flight booked by every account
 * - Customer: "My bookings"   -> only the flights this customer booked
 * The list is read-only. Clicking a Passenger ID opens that passenger's
 * Travel history page, where flights can be edited and saved.
 */
export default function BookingsList({ isAdmin, onOpenPassenger }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setBookings(await getBookings());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load once when the tab opens
  useEffect(() => {
    load();
  }, []);

  const total = bookings.reduce((sum, b) => sum + Number(b.price), 0);

  return (
    <section className="card">
      <div className="list-header">
        <div>
          <h1>{isAdmin ? "All bookings" : "My bookings"}</h1>
          <p className="subtitle">
            {isAdmin
              ? "Every flight booked by every account. Click a Passenger ID to view or edit that passenger's history."
              : "The flights you booked. Click a Passenger ID to view or edit that passenger's history."}
          </p>
        </div>
        <button className="btn btn-ghost" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      {error && <p className="alert alert-error">{error}</p>}

      {loading ? (
        <p>Loading bookings…</p>
      ) : bookings.length === 0 ? (
        <p className="empty-row">No bookings yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Passenger ID</th>
                <th>Name</th>
                <th>Flight date</th>
                <th>Airline</th>
                <th>Class</th>
                <th>Price</th>
                <th>Destination</th>
                {isAdmin && <th>Booked by</th>}
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.ticketId}>
                  <td>
                    <button className="link-btn" onClick={() => onOpenPassenger(b.passengerId)}>
                      {b.passengerId}
                    </button>
                  </td>
                  <td>{b.passengerName}</td>
                  <td>{formatDate(b.flightDate)}</td>
                  <td>{b.airline}</td>
                  <td>{b.flightClass}</td>
                  <td className="price-cell">{formatPrice(b.price)}</td>
                  <td>{b.destination}</td>
                  {isAdmin && <td>{b.bookedBy}</td>}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} className="total-label">
                  Total ({bookings.length} {bookings.length === 1 ? "flight" : "flights"})
                </td>
                <td className="price-cell total-value">{formatPrice(total)}</td>
                <td colSpan={isAdmin ? 2 : 1}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}