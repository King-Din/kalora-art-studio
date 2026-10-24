import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import AsyncState from "../components/AsyncState.jsx";
import { useAsync } from "../hooks/useAsync.js";

export default function AdminDashboard() {
  const state = useAsync(() => api("/admin/summary"), [], { refetchOnFocus: true });
  const links = { paintings: "/admin/paintings", orders: "/admin/orders", bookings: "/admin/bookings", pottery: "/admin/pottery" };
  return (
    <div>
      <h1>Studio dashboard</h1>
      <p className="muted">Live counts from the database.</p>
      <AsyncState state={state}>
        {(d) => (
          <div className="grid">
            {Object.keys(links).map((k) => (
              <section key={k} className="card">
                <h2><Link to={links[k]}>{k}</Link></h2>
                <dl>
                  {Object.entries(d[k]).map(([status, n]) => (
                    <div key={status} className="stat"><dt>{status}</dt><dd>{n}</dd></div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        )}
      </AsyncState>
    </div>
  );
}
