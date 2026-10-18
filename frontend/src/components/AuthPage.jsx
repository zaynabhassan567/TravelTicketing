import { useState } from "react";
import { login, register } from "../api";

/**
 * Login and Register on one page, with a link to switch between them.
 * - Register: creates a Customer account, then switches to Login.
 * - Login: gets a token from the API and hands it to App.
 */
export default function AuthPage({ onLoggedIn, notice }) {
  const [portal, setPortal] = useState("customer"); // "customer" | "admin"
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ username: "", password: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(notice ? { type: "error", text: notice } : null);

  const isRegister = mode === "register";

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });


    // Switch between the Customer and Admin login
  const choosePortal = (next) => {
     setPortal(next);
     setMode("login"); // admins can't register, so always show the login form
     setForm({ ...form, password: "", confirm: "" });
     setStatus(null);
    };
  const switchMode = () => {
    setMode(isRegister ? "login" : "register");
    setForm({ ...form, password: "", confirm: "" });
    setStatus(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);

    if (isRegister && form.password !== form.confirm) {
      setStatus({ type: "error", text: "The two passwords don't match." });
      return;
    }

    setBusy(true);
    try {
      if (isRegister) {
        const result = await register(form.username.trim(), form.password);
        setMode("login");
        setForm({ ...form, password: "", confirm: "" });
        setStatus({ type: "success", text: result.message });
      } else {

          const data = await login(form.username.trim(), form.password);

          // Make sure the account matches the login that was chosen
          const wantsAdmin = portal === "admin";
          if ((data.role === "Admin") !== wantsAdmin) {
              setStatus({
                  type: "error",
                  text: wantsAdmin
                      ? "This isn't an admin account. Use the Customer login."
                      : "This is an admin account. Use the Admin login.",
              });
              return;
          }
          onLoggedIn(data); // App saves it and shows the main pages
      }
    } catch (err) {
      setStatus({ type: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="brand auth-brand">
        <span className="brand-mark" aria-hidden="true">✈</span>
        Petal Air
      </div>

      <section className="card auth-card">
              {/* Customer / Admin login switch */}
              <div className="portal-switch" role="tablist" aria-label="Login type">
                  <button type="button" role="tab" aria-selected={portal === "customer"}
                      className={portal === "customer" ? "portal-tab active" : "portal-tab"}
                      onClick={() => choosePortal("customer")}>
                      Customer
                  </button>
                  <button type="button" role="tab" aria-selected={portal === "admin"}
                      className={portal === "admin" ? "portal-tab active" : "portal-tab"}
                      onClick={() => choosePortal("admin")}>
                      Admin
                  </button>
              </div>

              <h1>
                  {isRegister ? "Create an account" : portal === "admin" ? "Admin login" : "Customer login"}
              </h1>
              <p className="subtitle">
                  {isRegister
                      ? "New accounts can book flights and see the flights they booked."
                      : portal === "admin"
                          ? "See every booking and search any passenger."
                          : "Book flights and see the flights you booked."}
              </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Username
            <input name="username" type="text" autoComplete="username" required
              minLength={isRegister ? 3 : undefined} maxLength={50}
              value={form.username} onChange={handleChange} />
          </label>

          <label>
            Password
            <input name="password" type="password" required
              autoComplete={isRegister ? "new-password" : "current-password"}
              minLength={isRegister ? 6 : undefined}
              value={form.password} onChange={handleChange} />
          </label>

          {isRegister && (
            <label>
              Confirm password
              <input name="confirm" type="password" autoComplete="new-password" required
                value={form.confirm} onChange={handleChange} />
            </label>
          )}

          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Please wait…" : isRegister ? "Create account" : "Log in"}
          </button>
        </form>

        {status && (
          <p className={`alert alert-${status.type}`} role="status">{status.text}</p>
        )}

        {/* Only customers can create accounts */}
          {portal === "customer" && (
              <p className="auth-switch">
                 {isRegister ? "Already have an account?" : "New here?"}{" "}
                  <button type="button" className="link-btn" onClick={switchMode}>
                 {isRegister ? "Log in" : "Create an account"}
                  </button>
              </p>
              )}
      </section>
    </div>
  );
}
