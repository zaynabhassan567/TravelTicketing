import { useEffect, useState } from "react";
import { getHistory, saveAllHistory } from "../api";
import { formatPrice } from "../pricing";
import HistoryRow from "./HistoryRow";

// Each local row needs a unique React "key". Rows from the DB use their TicketId,
// rows added in the browser get a temporary key.
let tempKeyCounter = 0;
const newTempKey = () => `new-${++tempKeyCounter}`;

// Convert the API's ticket into our local row shape
const toLocalRow = (t) => ({
  key: `t-${t.ticketId}`,
  ticketId: t.ticketId,
  flightDate: t.flightDate.slice(0, 10), // "2026-04-03T00:00:00" -> "2026-04-03"
  airline: t.airline,
  flightClass: t.flightClass,
  price: t.price,
  destination: t.destination,
  bookedBy: t.bookedBy,
});

/**
 * Page 2: Detail & History.
 * - Loads the flights for the searched passenger ID
 *   (admin: all flights, customer: only the ones they booked).
 * - Edits/deletes happen in a LOCAL buffer (the `rows` state).
 * - "Save all" sends the whole buffer; the API clears and re-inserts.
 */
export default function HistoryPage({ searchRequest, pricing, isAdmin }) {
  const [passenger, setPassenger] = useState(null); // { passengerId, name }
  const [rows, setRows] = useState([]);              // local buffer of flights
  const [dirty, setDirty] = useState(false);         // true = unsaved changes
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  // Put API data into state (used after load and after save)
  const applyHistory = (data) => {
    setPassenger({ passengerId: data.passengerId, name: data.name });
    setRows(data.tickets.map(toLocalRow));
    setDirty(false);
  };

  const load = async (id) => {
    setLoading(true);
    setStatus(null);
    try {
      applyHistory(await getHistory(id));
    } catch (err) {
      setPassenger(null);
      setRows([]);
      setStatus({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Run a new search whenever the navbar sends one
  useEffect(() => {
    if (searchRequest) load(searchRequest.id);
  }, [searchRequest]);

  // ---- Local-only changes (no API calls) ----
  const updateRow = (updated) => {
    setRows((prev) => prev.map((r) => (r.key === updated.key ? updated : r)));
    setDirty(true);
  };

  const deleteRow = (key) => {
    setRows((prev) => prev.filter((r) => r.key !== key));
    setDirty(true);
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        key: newTempKey(), ticketId: null, flightDate: "", airline: "", flightClass: "",
        price: null, destination: "", bookedBy: "", isNew: true,
      },
    ]);
    setDirty(true);
  };

  // ---- Bulk sync: one API call for the whole list ----
  const handleSaveAll = async () => {
    const incomplete = rows.some(
      (r) => r.isNew || !r.flightDate || !r.airline || !r.flightClass || !r.destination
    );
    if (incomplete) {
      setStatus({ type: "error", text: "Finish or cancel the rows still being edited, then save." });
      return;
    }
    if (rows.length === 0 &&
        !window.confirm("This removes every flight in this list. Continue?")) {
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      // Only send what the API needs (no keys / UI flags / prices)
      const payload = rows.map(({ ticketId, flightDate, airline, flightClass, destination }) => ({
        ticketId, flightDate, airline, flightClass, destination,
      }));
      applyHistory(await saveAllHistory(passenger.passengerId, payload));
      setStatus({ type: "success", text: "All changes saved." });
    } catch (err) {
      setStatus({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const total = rows.reduce((sum, r) => sum + (Number(r.price) || 0), 0);
  const columnCount = isAdmin ? 9 : 8;

  // ---- Render ----
  if (!searchRequest) {
    return (
      <section className="card empty-state">
        <h1>Travel history</h1>
        <p>
          {isAdmin
            ? "Search a passenger ID in the top bar, or click one in All bookings."
            : "You haven't booked any flights yet. Use Book a flight to make your first booking."}
        </p>
      </section>
    );
  }

  if (loading) return <section className="card"><p>Loading passenger {searchRequest.id}…</p></section>;

  return (
    <section className="card">
      {passenger ? (
        <>
          {/* Boarding-pass style header */}
          <div className="pass">
            <div className="pass-main">
              <span className="pass-label">Passenger</span>
              <span className="pass-name">{passenger.name}</span>
            </div>
            <div className="pass-stub">
              <span className="pass-label">ID</span>
              <span className="pass-id">{passenger.passengerId}</span>
            </div>
          </div>

          {!isAdmin && (
            <p className="subtitle">Your flights. Edit, delete or add a flight, then click Save all.</p>
          )}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Name</th>
                  <th>Flight date</th>
                  <th>Airline</th>
                  <th>Class</th>
                  <th>Price</th>
                  <th>Destination</th>
                  {isAdmin && <th>Booked by</th>}
                  <th aria-label="Actions"></th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={columnCount} className="empty-row">
                      No flights in the list. Add one below.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <HistoryRow
                      key={row.key}
                      row={row}
                      passengerId={passenger.passengerId}
                      name={passenger.name}
                      pricing={pricing}
                      showBookedBy={isAdmin}
                      onUpdate={updateRow}
                      onDelete={deleteRow}
                    />
                  ))
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={5} className="total-label">Total</td>
                    <td className="price-cell total-value">{formatPrice(total)}</td>
                    <td colSpan={columnCount - 6}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <div className="table-footer">
            {/* Only customers add flights; admins edit and delete */}
            {isAdmin ? <span /> : (
              <button className="btn btn-ghost" onClick={addRow}>Add flight</button>
            )}
            <div className="footer-right">
              {dirty && <span className="unsaved">Unsaved changes</span>}
              <button className="btn btn-ghost" disabled={!dirty || saving}
                onClick={() => load(passenger.passengerId)}>
                Discard
              </button>
              <button className="btn btn-primary" disabled={!dirty || saving}
                onClick={handleSaveAll}>
                {saving ? "Saving…" : "Save all"}
              </button>
            </div>
          </div>
        </>
      ) : (
        <h1>Travel history</h1>
      )}

      {status && (
        <p className={`alert alert-${status.type}`} role="status">{status.text}</p>
      )}
    </section>
  );
}
