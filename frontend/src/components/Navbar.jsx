import { useState } from "react";

/**
 * Top navigation bar.
 * - Customer: "Book a flight" and "My flights" (no search; they only see their own).
 * - Admin:    "All bookings", "Travel history" and the passenger ID search.
 * Both see their username, role and a Log out button.
 */
export default function Navbar({ page, onNavigate, onSearch, user, onLogout }) {
  const [term, setTerm] = useState("");
  const [error, setError] = useState("");

  const isAdmin = user.role === "Admin";

  // Tabs for each role: [page name, label]
  const tabs = isAdmin
    ? [["bookings", "All bookings"], ["history", "Travel history"]]
    : [["entry", "Book a flight"], ["history", "My flights"]];

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
          {tabs.map(([name, label]) => (
            <button
              key={name}
              className={page === name ? "nav-link active" : "nav-link"}
              onClick={() => onNavigate(name)}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Passenger ID search: admin only */}
        {isAdmin && (
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
        )}

        <div className="user-area">
          <span className="user-name">{user.username}</span>
          <span className={isAdmin ? "role-badge admin" : "role-badge"}>{user.role}</span>
          <button className="btn btn-small btn-ghost" onClick={onLogout}>Log out</button>
        </div>
      </div>
    </header>
  );
}
