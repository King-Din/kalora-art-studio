import { createContext, useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "./api/client.js";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api("/auth/me")
      .then((d) => setUser(d.user))
      .catch(() => setUser(null)) // 401 simply means "not logged in"
      .finally(() => setReady(true));
  }, []);

  const logout = async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      /* a 401 here means we were already logged out */
    }
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, setUser, logout, ready }}>{children}</AuthContext.Provider>;
}

// Route guard = UX only. The server enforces every rule again.
export function RequireRole({ role, children }) {
  const { user, ready } = useAuth();
  if (!ready) return <p role="status">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}
