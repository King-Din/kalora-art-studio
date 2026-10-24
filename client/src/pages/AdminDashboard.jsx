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
    pottery: { title: "Clay Pottery Inquiries", path: "/admin/pottery" },
  };

  return (
    <div style={{ maxWidth: "1180px", margin: "0 auto" }}>
      <span style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--gold-antique)", fontWeight: 700 }}>
        STUDIO OPERATIONS
      </span>
      <h1 style={{ fontSize: "2.8rem", color: "var(--text-ivory)", margin: "0.25rem 0 0.75rem 0", fontFamily: "var(--font-serif)" }}>
        Atelier Dashboard
      </h1>
      <p style={{ color: "var(--text-sage)", fontSize: "1.05rem", lineHeight: 1.6, marginBottom: "2rem" }}>
        Live operational telemetry and queue metrics directly from the MongoDB Atlas database.
      </p>

      <AsyncState state={state}>
        {(d) => (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.5rem" }}>
            {Object.keys(links).map((k) => (
              <section key={k} className="panel-cream" style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ borderBottom: "1px solid var(--border-cream)", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
                  <span style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--terracotta)", fontWeight: 700, display: "block" }}>
                    OPERATIONS QUEUE
                  </span>
                  <h3 style={{ margin: "0.25rem 0 0 0", fontSize: "1.4rem" }}>
                    <Link to={links[k].path} style={{ color: "var(--text-dark-title)" }}>{links[k].title}</Link>
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
                        borderBottom: "1px dashed var(--border-cream)",
                      }}
                    >
                      <dt style={{ textTransform: "capitalize", fontSize: "0.9rem", color: "var(--text-dark-muted)" }}>
                        {status}
                      </dt>
                      <dd style={{ margin: 0, fontWeight: 700, fontSize: "1.15rem", color: "var(--text-dark-title)" }}>
                        {n}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div style={{ marginTop: "1.5rem" }}>
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
