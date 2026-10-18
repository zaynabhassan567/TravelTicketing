import { useRef, useState } from "react";
import { getPassenger, savePassengerEntry } from "../api";
import { GENDERS } from "../constants";
import { formatPrice } from "../pricing";

// The blank form - used on first load and after a successful save
const emptyForm = {
    passengerId: "",
    name: "",
    contact: "",
    gender: "",
    flightDate: "",
    airline: "",
    flightClass: "",
    destination: "",
};

/**
 * Page 1: Passenger Entry form.
 * - Typing an existing Passenger ID and leaving the field auto-fills
 *   name, contact and gender (GET /api/passengers/{id}).
 * - "Save" sends one passenger + one flight to POST /api/passengers.
 * - The price is previewed from the price list; the server works out
 *   the final price itself when saving.
 */
export default function PassengerForm({ pricing, isAdmin }) {
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState(null); // { type: "success" | "error", text }

    // Auto-fill state: "idle" | "loading" | "found" | "none"
    const [lookup, setLookup] = useState("idle");
    // The ID we last looked up. Used to ignore old answers if the user
    // changed the ID while a lookup was still on its way.
    const lastLookupId = useRef(null);

    // Customers can't change an existing passenger's saved details, so lock them
    const detailsLocked = lookup === "found" && !isAdmin;

    // Classes the chosen airline offers, and the live price preview
    const classOptions = form.airline ? pricing.classesFor(form.airline) : [];
    const previewPrice = pricing.priceFor(form.airline, form.flightClass);

    const resetAll = () => {
        setForm(emptyForm);
        setLookup("idle");
        lastLookupId.current = null;
    };

    // One handler for every input: uses the input's "name" to update the right field
    const handleChange = (e) => {
        const { name, value } = e.target;
        const next = { ...form, [name]: value };

        // Changing the ID after an auto-fill: the filled details belong to the
        // old ID, so clear them and look up again when the field is left.
        if (name === "passengerId" && lookup !== "idle") {
            if (lookup === "found") {
                next.name = "";
                next.contact = "";
                next.gender = "";
            }
            setLookup("idle");
            lastLookupId.current = null;
        }

        // New airline might not offer the class that was picked -> clear it
        if (name === "airline" && !pricing.classesFor(value).includes(form.flightClass)) {
            next.flightClass = "";
        }
        setForm(next);
    };

    // Runs when the user leaves the Passenger ID field
    const handleIdBlur = async () => {
        const id = Number(form.passengerId);
        if (!Number.isInteger(id) || id < 1) return;
        if (lastLookupId.current === id) return; // already looked this one up

        lastLookupId.current = id;
        setLookup("loading");

        try {
            const passenger = await getPassenger(id);
            if (lastLookupId.current !== id) return; // user typed a different ID meanwhile

            setForm((f) => ({
                ...f,
                name: passenger.name,
                contact: passenger.contact,
                gender: passenger.gender,
            }));
            setLookup("found");
        } catch (err) {
            if (lastLookupId.current !== id) return;
            // 404 = new passenger (or one this customer hasn't booked for): just type the details.
            // Other errors: stay quiet, the form still works without auto-fill.
            setLookup(err.status === 404 ? "none" : "idle");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); // stop the browser from reloading the page
        setSaving(true);
        setStatus(null);

        try {
            const result = await savePassengerEntry({
                ...form,
                passengerId: Number(form.passengerId),
            });
            setStatus({ type: "success", text: result.message });
            resetAll();
        } catch (err) {
            setStatus({ type: "error", text: err.message });
        } finally {
            setSaving(false);
        }
    };

    // Small note under the Passenger ID field
    const lookupNote = {
        loading: "Checking this ID…",
        found: isAdmin
            ? "Existing passenger: details filled in. Changing them updates their saved record."
            : "Existing passenger: details filled in from your earlier bookings.",
        none: "No saved details for this ID. Fill them in below.",
    }[lookup];

    return (
        <section className="card">
            <h1>Passenger entry</h1>
            <p className="subtitle">
                Enter a Passenger ID first. If the passenger already exists, their
                details fill in by themselves.
            </p>

            <form className="form-grid" onSubmit={handleSubmit}>
                <label>
                    Passenger ID
                    <input name="passengerId" type="number" min="1" required
                        value={form.passengerId} onChange={handleChange} onBlur={handleIdBlur} />
                    {lookupNote && (
                        <span className={`lookup-note lookup-${lookup}`} aria-live="polite">{lookupNote}</span>
                    )}
                </label>

                <label>
                    Full name
                    <input name="name" type="text" maxLength={100} required
                        readOnly={detailsLocked}
                        value={form.name} onChange={handleChange} />
                </label>

                <label>
                    Contact number
                    <input name="contact" type="tel" maxLength={20} required
                        readOnly={detailsLocked}
                        value={form.contact} onChange={handleChange} />
                </label>

                <label>
                    Gender
                    <select name="gender" required value={form.gender} onChange={handleChange}
                        disabled={detailsLocked}>
                        <option value="">Choose gender</option>
                        {GENDERS.map((g) => (
                            <option key={g} value={g}>{g}</option>
                        ))}
                    </select>
                </label>

                <label>
                    Flight date
                    <input name="flightDate" type="date" required
                        value={form.flightDate} onChange={handleChange} />
                </label>

                <label>
                    Destination
                    <input name="destination" type="text" maxLength={100} required
                        value={form.destination} onChange={handleChange} />
                </label>

                <label>
                    Airline
                    <select name="airline" required value={form.airline} onChange={handleChange}>
                        <option value="">Choose airline</option>
                        {pricing.airlines.map((a) => (
                            <option key={a} value={a}>{a}</option>
                        ))}
                    </select>
                </label>

                <label>
                    Class
                    <select name="flightClass" required value={form.flightClass} onChange={handleChange}
                        disabled={!form.airline}>
                        <option value="">{form.airline ? "Choose class" : "Choose an airline first"}</option>
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
                        onClick={() => { resetAll(); setStatus(null); }}>
                        Clear
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? "Saving…" : "Save"}
                    </button>
                </div>
            </form>

            {status && (
                <p className={`alert alert-${status.type}`} role="status">{status.text}</p>
            )}
        </section>
    );
}