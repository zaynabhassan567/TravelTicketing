import { useCallback, useEffect, useMemo, useState } from "react";
import { getMyProfile, getPrices, setUnauthorizedHandler } from "./api";
import { clearAuth, loadAuth, saveAuth } from "./auth";
import { buildPricing } from "./pricing";
import AuthPage from "./components/AuthPage";
import Navbar from "./components/Navbar";
import PassengerForm from "./components/PassengerForm";
import HistoryPage from "./components/HistoryPage";
import BookingsList from "./components/BookingsList";

// Where each role starts after logging in
const homePage = (role) => (role === "Admin" ? "bookings" : "entry");

/**
 * App = the shell.
 * - Not logged in -> Login / Register page.
 * - Customer      -> "Book a flight" and "My flights" (their own passenger profile).
 * - Admin         -> "All bookings" and "Travel history" with passenger ID search.
 */
export default function App() {
  const [auth, setAuth] = useState(loadAuth);         // { token, username, role, expiresAt } or null
  const [authNotice, setAuthNotice] = useState("");   // e.g. "Your session expired"
  const [page, setPage] = useState(() => homePage(loadAuth()?.role)); // "entry" | "bookings" | "history"
  const [searchRequest, setSearchRequest] = useState(null);
  const [prices, setPrices] = useState([]);
  const [pricesError, setPricesError] = useState("");

  // Customer only: their passenger profile { passengerId, name, contact, gender },
  // or null if they haven't booked yet. undefined = still loading.
  const [profile, setProfile] = useState(undefined);

  const isAdmin = auth?.role === "Admin";

  // Rebuild the price helpers only when the price list changes
  const pricing = useMemo(() => buildPricing(prices), [prices]);

  const handleLogin = (data) => {
    saveAuth(data);
    setAuth(data);
    setAuthNotice("");
    setPage(homePage(data.role));
  };

  const logout = useCallback((notice = "") => {
    clearAuth();
    setAuth(null);
    setAuthNotice(notice);
    setPage("entry");
    setSearchRequest(null);
    setPrices([]);
    setProfile(undefined);
  }, []);

  // If any API call comes back 401, log out with a message
  useEffect(() => {
    setUnauthorizedHandler(() => logout("Your session expired. Log in again."));
  }, [logout]);

  // After login: load the price list (and a customer's profile),
  // and log out automatically when the token expires
  useEffect(() => {
    if (!auth) return;

    getPrices()
      .then((data) => { setPrices(data); setPricesError(""); })
      .catch((err) => setPricesError(err.message));

    if (auth.role !== "Admin") {
      getMyProfile()
        .then(setProfile)
        .catch(() => setProfile(null)); // 404 = no booking yet
    }

    const msLeft = new Date(auth.expiresAt) - Date.now();
    const timer = setTimeout(() => logout("Your session expired. Log in again."), msLeft);
    return () => clearTimeout(timer);
  }, [auth, logout]);

  // Admin: search or click a passenger ID -> open their history
  const openPassenger = (id) => {
    setSearchRequest({ id, at: Date.now() });
    setPage("history");
  };

  // Navbar tabs. A customer's "My flights" always opens their own passenger ID.
  const navigate = (target) => {
    if (target === "history" && !isAdmin) {
      setSearchRequest(profile ? { id: profile.passengerId, at: Date.now() } : null);
    }
    setPage(target);
  };

  if (!auth) {
    return <AuthPage onLoggedIn={handleLogin} notice={authNotice} />;
  }

  return (
    <>
      <Navbar
        page={page}
        onNavigate={navigate}
        onSearch={openPassenger}
        user={auth}
        onLogout={() => logout()}
      />
      <main className="container">
        {pricesError && (
          <p className="alert alert-error">Couldn't load the price list: {pricesError}</p>
        )}

        {/* Customer pages */}
        {!isAdmin && page === "entry" && (
          <PassengerForm pricing={pricing} profile={profile} onProfileSaved={setProfile} />
        )}

        {/* Admin pages */}
        {isAdmin && page === "bookings" && (
          <BookingsList isAdmin={isAdmin} onOpenPassenger={openPassenger} />
        )}

        {/* Both: admin = searched passenger, customer = their own flights */}
        {page === "history" && (
          <HistoryPage searchRequest={searchRequest} pricing={pricing} isAdmin={isAdmin} />
        )}
      </main>
    </>
  );
}
