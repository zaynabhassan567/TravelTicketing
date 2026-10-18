// Dropdown options that don't come from the database.
// (Airlines and classes now come from the price list: GET /api/prices)
export const GENDERS = ["Male", "Female", "Other"];

// Shown in front of every price
export const CURRENCY = "PKR";

// Today's date as "YYYY-MM-DD" (local time), the format date inputs use
export function todayIso() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}
