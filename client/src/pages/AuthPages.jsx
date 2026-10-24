import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { Field, FormError } from "../components/Common.jsx";
import { useAuth } from "../auth.jsx";

// Accessible Password Eye Toggle Button
function PasswordField({ label, value, onChange, error, required, minLength, maxLength, autoComplete }) {
  const [show, setShow] = useState(false);

  return (
    <div className="field">
      <span>{label}</span>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          autoComplete={autoComplete}
          style={{ paddingRight: "2.75rem" }}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          aria-label={show ? "Hide password" : "Show password"}
          title={show ? "Hide password" : "Show password"}
          style={{
            position: "absolute",
            right: "0.5rem",
            background: "transparent",
            border: "none",
            color: "var(--text-dark-subtle)",
            cursor: "pointer",
            padding: "0.35rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {show ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      {error && <small className="err">{error}</small>}
    </div>
  );
}

function AuthForm({ mode }) {
  const signup = mode === "signup";
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = signup ? form : { email: form.email, password: form.password };
      const { user } = await api(`/auth/${mode}`, { method: "POST", body });
      setUser(user);
      navigate(user.role === "studio" ? "/admin" : "/");
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: "460px", margin: "3rem auto" }}>
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <img
          src="/images/logo-emblem-transparent.png"
          alt="KĀLORA Emblem"
          style={{ height: "52px", margin: "0 auto 0.5rem" }}
        />
        <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.18em", color: "var(--gold-antique)", fontWeight: 700 }}>
          KĀLORA ATELIER
        </span>
        <h2 style={{ margin: "0.25rem 0 0 0", color: "var(--text-ivory)", fontFamily: "var(--font-serif)", fontSize: "2rem" }}>
          {signup ? "Create Collector Account" : "Sign In to Studio"}
        </h2>
      </div>

      <form onSubmit={submit} className="panel-cream" style={{ borderTop: "4px solid var(--terracotta)" }}>
        {signup && (
          <Field label="Full Name" error={error?.details?.name}>
            <input
              value={form.name}
              onChange={set("name")}
              required
              maxLength={80}
              autoComplete="name"
              placeholder="e.g. Dinesh Sharma"
            />
          </Field>
        )}

        <Field label="Email Address" error={error?.details?.email}>
          <input
            type="email"
            value={form.email}
            onChange={set("email")}
            required
            autoComplete="email"
            placeholder="collector@example.com"
          />
        </Field>

        <PasswordField
          label="Password"
          value={form.password}
          onChange={set("password")}
          error={error?.details?.password}
          required
          minLength={signup ? 8 : 1}
          maxLength={72}
          autoComplete={signup ? "new-password" : "current-password"}
        />

        <FormError error={error} />

        <button disabled={busy} className="btn" style={{ width: "100%", marginTop: "1rem" }}>
          {busy ? "Authenticating…" : signup ? "Register Collector Account" : "Sign In"}
        </button>

        <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.9rem", color: "var(--text-dark-muted)" }}>
          {signup ? (
            <p style={{ margin: 0 }}>
              Already registered with KĀLORA?{" "}
              <Link to="/login" style={{ fontWeight: 600, color: "var(--terracotta)" }}>
                Sign in here
              </Link>
            </p>
          ) : (
            <p style={{ margin: 0 }}>
              New to KĀLORA?{" "}
              <Link to="/signup" style={{ fontWeight: 600, color: "var(--terracotta)" }}>
                Create an account
              </Link>
            </p>
          )}
        </div>
      </form>
    </div>
  );
}

export const Login = () => <AuthForm mode="login" />;
export const Signup = () => <AuthForm mode="signup" />;
