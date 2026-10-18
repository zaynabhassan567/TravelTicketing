import { useEffect, useState } from "react";
import { savePassengerEntry } from "../api";
import { GENDERS, todayIso } from "../constants";
import { formatPrice } from "../pricing";

const emptyDetails = { name: "", contact: "", gender: "" };
const emptyFlight = { flightDate: "", destination: "", airline: "", flightClass: "" };

/**
 * Customer page: "Book a flight".
 * - Returning customer: their Passenger ID and details are filled in already.
 * - New customer: they type their details once; the server assigns a new
 *   Passenger ID on the first booking, and it's reused every time after.
 * - Flight date must be today or later.
 */
export default function PassengerForm({ pricing, profile, onProfileSaved }) {
  const [details, setDetails] = useState(emptyDetails);
  const [flight, setFlight] = useState(emptyFlight);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // { type: "success" | "error", text }

  // When the profile arrives (or changes), fill in the passenger details
  useEffect(() => {
    if (profile) {
      setDetails({ name: profile.name, contact: profile.contact, gender: profile.gender });
    }
  }, [profile]);

  const classOptions = flight.airline ? pricing.classesFor(flight.airline) : [];
  const previewPrice = pricing.priceFor(flight.airline, flight.flightClass);

  const changeDetails = (e) => setDetails({ ...details, [e.target.name]: e.target.value });

  const changeFlight = (e) => {
    const { name, value } = e.target;
    const next = { ...flight, [name]: value };
    // New airline might not offer the class that was picked -> clear it
    if (name === "airline" && !pricing.classesFor(value).includes(flight.flightClass)) {
      next.flightClass = "";
    }
    setFlight(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // stop the browser from reloading the page

    if (flight.flightDate < todayIso()) {
      setStatus({ type: "error", text: "Flight date can't be in the past. Pick today or a later date." });
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      const result = await savePassengerEntry({ ...details, ...flight });
      setStatus({ type: "success", text: result.message });
      setFlight(emptyFlight); // keep the details, clear the flight
      onProfileSaved({ passengerId: result.passengerId, ...details });
    } catch (err) {
      setStatus({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (profile === undefined) {
    return <section className="card"><p>Loading your details…</p></section>;
  }

  return (
    <section className="card">
      <h1>Book a flight</h1>
      <p className="subtitle">
        {profile
          ? "Your details are filled in. Pick your flight and save."
          : "Fill in your details once. You get a Passenger ID with your first booking."}
      </p>

      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          Passenger ID
          <input type="text" readOnly
            value={profile ? profile.passengerId : "Assigned on your first booking"} />
        </label>

        <label>
          Full name
          <input name="name" type="text" maxLength={100} required
            value={details.name} onChange={changeDetails} />
        </label>

        <label>
          Contact number
          <input name="contact" type="tel" maxLength={20} required
            value={details.contact} onChange={changeDetails} />
        </label>

        <label>
          Gender
          <select name="gender" required value={details.gender} onChange={changeDetails}>
            <option value="">Choose gender</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </label>

        <label>
          Flight date
          <input name="flightDate" type="date" required min={todayIso()}
            value={flight.flightDate} onChange={changeFlight} />
        </label>

        <label>
          Destination
          <input name="destination" type="text" maxLength={100} required
            value={flight.destination} onChange={changeFlight} />
        </label>

        <label>
          Airline
          <select name="airline" required value={flight.airline} onChange={changeFlight}>
            <option value="">Choose airline</option>
            {pricing.airlines.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>

        <label>
          Class
          <select name="flightClass" required value={flight.flightClass} onChange={changeFlight}
            disabled={!flight.airline}>
            <option value="">{flight.airline ? "Choose class" : "Choose an airline first"}</option>
            {classOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        {/* Live price preview */}
        <div className="price-preview full-width" aria-live="polite">
          <span>Ticket price</span>
          <strong>
            {previewPrice !== null ? formatPrice(previewPrice) : "Choose an airline and class"}
          </strong>
        </div>

        <div className="form-actions full-width">
          <button type="button" className="btn btn-ghost"
            onClick={() => { setFlight(emptyFlight); setStatus(null); }}>
            Clear flight
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Booking…" : "Book flight"}
          </button>
        </div>
      </form>

      {status && (
        <p className={`alert alert-${status.type}`} role="status">{status.text}</p>
      )}
    </section>
  );
}
