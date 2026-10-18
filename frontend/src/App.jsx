import { useCallback, useEffect, useMemo, useState } from "react";
import { getPrices, setUnauthorizedHandler } from "./api";
import { clearAuth, loadAuth, saveAuth } from "./auth";
import { buildPricing } from "./pricing";
import AuthPage from "./components/AuthPage";
import Navbar from "./components/Navbar";
import PassengerForm from "./components/PassengerForm";
import HistoryPage from "./components/HistoryPage";
import BookingsList from "./components/BookingsList";

/**
 * App = the shell.
 * - Not logged in  -> show the Login / Register page.
 * - Logged in      -> show the navbar + the current page.
 */
export default function App() {
  const [auth, setAuth] = useState(loadAuth);         // { token, username, role, expiresAt } or null
  const [authNotice, setAuthNotice] = useState("");   // e.g. "Your session expired"
  const [page, setPage] = useState("entry");          // "entry" | "history"
  const [searchRequest, setSearchRequest] = useState(null);
  const [prices, setPrices] = useState([]);
  const [pricesError, setPricesError] = useState("");

  // Rebuild the price helpers only when the price list changes
  const pricing = useMemo(() => buildPricing(prices), [prices]);

  const handleLogin = (data) => {
    saveAuth(data);
    setAuth(data);
      // Admins start on the full bookings list, customers on the booking form
    setPage(data.role === "Admin" ? "bookings" : "entry");
    setAuthNotice("");
  };

  const logout = useCallback((notice = "") => {
    clearAuth();
    setAuth(null);
    setAuthNotice(notice);
    setPage("entry");
    setSearchRequest(null);
    setPrices([]);
  }, []);

  // If any API call comes back 401, log out with a message
  useEffect(() => {
    setUnauthorizedHandler(() => logout("Your session expired. Log in again."));
  }, [logout]);

  // After login: load the price list, and log out automatically when the token expires
  useEffect(() => {
    if (!auth) return;

    getPrices()
      .then((data) => { setPrices(data); setPricesError(""); })
      .catch((err) => setPricesError(err.message));

    const msLeft = new Date(auth.expiresAt) - Date.now();
    const timer = setTimeout(() => logout("Your session expired. Log in again."), msLeft);
    return () => clearTimeout(timer);
  }, [auth, logout]);

  const handleSearch = (id) => {
    setSearchRequest({ id, at: Date.now() });
    setPage("history");
  };

  if (!auth) {
    return <AuthPage onLoggedIn={handleLogin} notice={authNotice} />;
  }

  const isAdmin = auth.role === "Admin";

  return (
    <>
      <Navbar
        page={page}
        onNavigate={setPage}
        onSearch={handleSearch}
        user={auth}
        onLogout={() => logout()}
      />
      <main className="container">
        {pricesError && (
          <p className="alert alert-error">Couldn't load the price list: {pricesError}</p>
        )}
        {page === "entry" && <PassengerForm pricing={pricing} isAdmin={isAdmin} />}
        {page === "bookings" && <BookingsList isAdmin={isAdmin} onOpenPassenger={handleSearch} />}
        {page === "history" && (
              <HistoryPage searchRequest={searchRequest} pricing={pricing} isAdmin={isAdmin} />
         )}
      </main>
    </>
  );
}
