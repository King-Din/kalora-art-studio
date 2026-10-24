import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import AsyncState from "../components/AsyncState.jsx";
import { useAsync } from "../hooks/useAsync.js";

export default function AdminDashboard() {
  const state = useAsync(() => api("/admin/summary"), [], { refetchOnFocus: true });
  const links = {
    paintings: { title: "Paintings Catalog", path: "/admin/paintings" },
    orders: { title: "Original Art Orders", path: "/admin/orders" },
    bookings: { title: "Wall Mural Bookings", path: "/admin/bookings" },
    pottery: { title: "Pottery Inquiries", path: "/admin/pottery" },
  };

  return (
    <div style={{ maxWidth: "1080px", margin: "0 auto" }}>
      <span className="kicker">Studio Management</span>
      <h1>Atelier Operations</h1>
      <p className="lead-text" style={{ marginBottom: "2rem" }}>
        Real-time telemetry and management metrics directly from the MongoDB Atlas database.
      </p>

      <AsyncState state={state}>
        {(d) => (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem" }}>
            {Object.keys(links).map((k) => (
              <section key={k} className="card" style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ borderBottom: "1px solid var(--border-cream)", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
                  <span className="kicker" style={{ fontSize: "0.68rem" }}>Management Queue</span>
                  <h3 style={{ margin: 0 }}>
                    <Link to={links[k].path}>{links[k].title}</Link>
                  </h3>
                </div>

                <dl style={{ margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
                  {Object.entries(d[k]).map(([status, n]) => (
                    <div
                      key={status}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.35rem 0",
                        borderBottom: "1px dashed var(--border-light)",
                      }}
                    >
                      <dt style={{ textTransform: "capitalize", fontSize: "0.9rem", color: "var(--text-muted)" }}>
                        {status}
                      </dt>
                      <dd style={{ margin: 0, fontWeight: 700, fontSize: "1.1rem", color: "var(--text-main)" }}>
                        {n}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div style={{ marginTop: "1.25rem", paddingTop: "0.75rem" }}>
                  <Link to={links[k].path} className="btn secondary" style={{ width: "100%", fontSize: "0.85rem" }}>
                    Manage {links[k].title} →
                  </Link>
                </div>
              </section>
            ))}
          </div>
        )}
      </AsyncState>
    </div>
  );
}
