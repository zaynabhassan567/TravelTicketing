import { useState } from "react";
import { formatPrice } from "../pricing";
import { todayIso } from "../constants";

// Turns "2026-04-03" into "03 Apr 2026" for display
function formatDate(isoDate) {
  if (!isoDate) return "—";
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * One row of the history table.
 * Edit/Update/Delete only change the LOCAL list in HistoryPage.
 * Nothing touches the database until "Save all" is clicked.
 */
export default function HistoryRow({ row, passengerId, name, pricing, showBookedBy, onUpdate, onDelete }) {
  // New (blank) rows start in edit mode so the user can fill them in
  const [editing, setEditing] = useState(row.isNew === true);
  const [draft, setDraft] = useState(row);

  const classOptions = draft.airline ? pricing.classesFor(draft.airline) : [];
  const draftPrice = pricing.priceFor(draft.airline, draft.flightClass);

  const startEdit = () => {
    setDraft(row); // copy current values into the editable draft
    setEditing(true);
  };

  const applyEdit = () => {
    if (!draft.flightDate || !draft.airline || !draft.flightClass || !draft.destination.trim()) {
      alert("Fill in date, airline, class and destination before updating the row.");
      return;
    }

    // New rows and changed dates must be today or later (old dates can stay as they are)
    const dateChanged = row.isNew || draft.flightDate !== row.flightDate;
    if (dateChanged && draft.flightDate < todayIso()) {
      alert("Flight date can't be in the past. Pick today or a later date.");
      return;
    }
    onUpdate({
      ...draft,
      destination: draft.destination.trim(),
      price: draftPrice, // preview only; the server recalculates on Save all
      isNew: false,
    });
    setEditing(false);
  };

  const cancelEdit = () => {
    // Cancelling a brand-new empty row simply removes it
    if (row.isNew) onDelete(row.key);
    else setEditing(false);
  };

  const change = (field) => (e) => {
    const next = { ...draft, [field]: e.target.value };
    // Changing airline: keep the class only if the new airline offers it
    if (field === "airline" && !pricing.classesFor(e.target.value).includes(draft.flightClass)) {
      next.flightClass = "";
    }
    setDraft(next);
  };

  if (editing) {
    return (
      <tr className="row-editing">
        <td>{passengerId}</td>
        <td>{name}</td>
        <td>
          <input type="date" value={draft.flightDate} onChange={change("flightDate")}
            min={todayIso()} aria-label="Flight date" />
        </td>
        <td>
          <select value={draft.airline} onChange={change("airline")} aria-label="Airline">
            <option value="">Choose</option>
            {pricing.airlines.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </td>
        <td>
          <select value={draft.flightClass} onChange={change("flightClass")} aria-label="Class"
            disabled={!draft.airline}>
            <option value="">Choose</option>
            {classOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </td>
        <td className="price-cell">{formatPrice(draftPrice)}</td>
        <td>
          <input type="text" value={draft.destination} maxLength={100}
            onChange={change("destination")} aria-label="Destination" />
        </td>
        {showBookedBy && <td>{row.bookedBy || "you"}</td>}
        <td className="row-actions">
          <button className="btn btn-small btn-primary" onClick={applyEdit}>Update</button>
          <button className="btn btn-small btn-ghost" onClick={cancelEdit}>Cancel</button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>{passengerId}</td>
      <td>{name}</td>
      <td>{formatDate(row.flightDate)}</td>
      <td>{row.airline}</td>
      <td>{row.flightClass}</td>
      <td className="price-cell">{formatPrice(row.price)}</td>
      <td>{row.destination}</td>
      {showBookedBy && <td>{row.bookedBy || "you"}</td>}
      <td className="row-actions">
        <button className="btn btn-small btn-ghost" onClick={startEdit}>Edit</button>
        <button className="btn btn-small btn-danger" onClick={() => onDelete(row.key)}>
          Delete
        </button>
      </td>
    </tr>
  );
}
