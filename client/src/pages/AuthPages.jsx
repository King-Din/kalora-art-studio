import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { Field, FormError } from "../components/Common.jsx";
import { useAuth } from "../auth.jsx";

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
    <form onSubmit={submit} className="card narrow">
      <h2>{signup ? "Create an account" : "Log in"}</h2>
      {signup && <Field label="Name" error={error?.details?.name}><input value={form.name} onChange={set("name")} required maxLength={80} autoComplete="name" /></Field>}
      <Field label="Email" error={error?.details?.email}><input type="email" value={form.email} onChange={set("email")} required autoComplete="email" /></Field>
      <Field label="Password" error={error?.details?.password}>
        <input type="password" value={form.password} onChange={set("password")} required minLength={signup ? 8 : 1} maxLength={72} autoComplete={signup ? "new-password" : "current-password"} />
      </Field>
      <FormError error={error} />
      <button disabled={busy}>{busy ? "Please wait…" : signup ? "Sign up" : "Log in"}</button>
      <p>{signup ? <>Already registered? <Link to="/login">Log in</Link></> : <>New here? <Link to="/signup">Create an account</Link></>}</p>
    </form>
  );
}

export const Login = () => <AuthForm mode="login" />;
export const Signup = () => <AuthForm mode="signup" />;
