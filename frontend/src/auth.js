// Keeps the login (token, username, role, expiry) in the browser's localStorage,
// so a page refresh doesn't log you out.
const STORAGE_KEY = "travel_auth";

export function saveAuth(auth) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

export function clearAuth() {
  localStorage.removeItem(STORAGE_KEY);
}

// Returns the saved login, or null if there is none or it has expired
export function loadAuth() {
  try {
    const auth = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!auth?.token || new Date(auth.expiresAt) <= new Date()) {
      clearAuth();
      return null;
    }
    return auth;
  } catch {
    clearAuth();
    return null;
  }
}
