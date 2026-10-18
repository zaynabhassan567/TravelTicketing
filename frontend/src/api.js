import { loadAuth } from "./auth";

// All calls to the C# Web API live in this one file.
// If your backend runs on a different port, change it here only.
const API_BASE = "http://localhost:5050/api";

// App.jsx registers a function here that logs the user out
// whenever the server says the token is missing or expired (401).
let onUnauthorized = null;
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

// Small helper: sends a request with the login token and returns JSON
async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json" };

  const auth = loadAuth();
  if (auth) headers.Authorization = `Bearer ${auth.token}`;

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try {
      const body = await response.json();
      // Our controllers send { message }, ASP.NET validation sends { title, errors }
      if (body.message) message = body.message;
      else if (body.errors) message = Object.values(body.errors).flat().join(" ");
      else if (body.title) message = body.title;
    } catch {
      /* no JSON body - keep the default message */
    }

    // 401 on a normal page = token expired/missing -> log out.
    // (On the login form itself, 401 just means a wrong password.)
    if (response.status === 401 && !path.startsWith("/auth/")) {
      onUnauthorized?.();
      message = "Your session expired. Log in again.";
    }
    if (response.status === 403) {
      message = "Your account isn't allowed to do that.";
    }
      const error = new Error(message);
      error.status = response.status; // lets callers check for e.g. 404
      throw error;
  }

  return response.status === 204 ? null : response.json();
}

// ---- Accounts ----
export const register = (username, password) =>
  request("/auth/register", { method: "POST", body: JSON.stringify({ username, password }) });

export const login = (username, password) =>
  request("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });

// ---- Price list ----
export const getPrices = () => request("/prices");


// ---- Page 1: look up an existing passenger (for auto-fill) ----
export const getPassenger = (passengerId) => request(`/passengers/${passengerId}`);

// ---- Customer: their own passenger profile (404 = not assigned yet) ----
export const getMyProfile = () => request("/passengers/me");

// ---- Page 1: save passenger + one flight ----
export const savePassengerEntry = (entry) =>
  request("/passengers", { method: "POST", body: JSON.stringify(entry) });

// ---- Bookings list (admin: all, customer: their own) ----
export const getBookings = () => request("/tickets");
// ---- Page 2: travel history ----
export const getHistory = (passengerId) => request(`/tickets/history/${passengerId}`);

export const saveAllHistory = (passengerId, tickets) =>
  request(`/tickets/history/${passengerId}`, {
    method: "PUT",
    body: JSON.stringify(tickets),
  });
