import { useState } from "react";

/**
 * Top navigation bar: brand, page links, passenger ID search,
 * and the logged-in user with a Log out button.
 */
export default function Navbar({ page, onNavigate, onSearch, user, onLogout }) {
  const [term, setTerm] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const value = term.trim();

    if (!/^\d+$/.test(value) || Number(value) < 1) {
      setError("Enter a numeric passenger ID");
      return;
    }
    setError("");
    onSearch(Number(value));
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">✈</span>
          Petal Air
        </div>

        <nav className="nav-links">
          <button
            className={page === "entry" ? "nav-link active" : "nav-link"}
            onClick={() => onNavigate("entry")}
          >
            Passenger entry
          </button>
                  <button
                      className={page === "bookings" ? "nav-link active" : "nav-link"}
                      onClick={() => onNavigate("bookings")}
                  >
                      {user.role === "Admin" ? "All bookings" : "My bookings"}
                  </button>
                  <button
                      className={page === "history" ? "nav-link active" : "nav-link"}
            onClick={() => onNavigate("history")}
          >
            Travel history
          </button>
        </nav>

        <form className="search" onSubmit={handleSubmit} role="search">
          <input
            type="text"
            inputMode="numeric"
            placeholder="Search passenger ID"
            aria-label="Search by passenger ID"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
          <button type="submit">Search</button>
          {error && <span className="search-error">{error}</span>}
        </form>

        <div className="user-area">
          <span className="user-name">{user.username}</span>
          <span className={user.role === "Admin" ? "role-badge admin" : "role-badge"}>
            {user.role}
          </span>
          <button className="btn btn-small btn-ghost" onClick={onLogout}>Log out</button>
        </div>
      </div>
    </header>
  );
}
