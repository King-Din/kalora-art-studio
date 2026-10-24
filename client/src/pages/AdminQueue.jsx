import { useState } from "react";
import { api } from "../api/client.js";
import { friendly } from "../api/messages.js";
import { money, niceDate } from "../api/format.js";
import AsyncState from "../components/AsyncState.jsx";
import { Badge, Timeline } from "../components/Common.jsx";
import { useAsync } from "../hooks/useAsync.js";

// One generic queue screen for orders, bookings and pottery requests.
const KINDS = {
  orders: {
    title: "Painting Orders",
    path: "/orders",
    key: "orders",
    statuses: ["placed", "cancelled"],
    actions: [],
    summary: (o) => `${o.painting?.title ?? "Painting"} · ${money(o.priceAtPurchase)}`,
    detail: (o) => (
      <p>
        <strong>Artwork:</strong> {o.painting?.title} (by {o.painting?.artist})
        <br />
        <strong>Purchase Value:</strong> {money(o.priceAtPurchase)}
      </p>
    ),
  },
  bookings: {
    title: "Wall Mural Bookings",
    path: "/bookings",
    key: "bookings",
    statuses: ["requested", "confirmed", "declined", "cancelled"],
    actions: [
      { label: "Confirm Booking", slug: "confirm", from: ["requested"] },
      { label: "Decline", slug: "decline", from: ["requested"] },
    ],
    summary: (b) => `${niceDate(b.date)} · ${b.wallSqFt} sq ft · ${money(b.price)}`,
    detail: (b) => (
      <p>
        <strong>Dimensions:</strong> {b.wallSqFt} sq ft at {money(b.ratePerSqFt)}/sq ft ={" "}
        <strong>{money(b.price)}</strong>
        <br />
        <strong>Site Address:</strong> {b.address}
      </p>
    ),
  },
  pottery: {
    title: "Custom Pottery Inquiries",
    path: "/pottery",
    key: "requests",
    statuses: ["requested", "accepted", "declined", "cancelled"],
    actions: [
      { label: "Accept Inquiry", slug: "accept", from: ["requested"] },
      { label: "Decline", slug: "decline", from: ["requested"] },
    ],
    summary: (r) =>
      `${r.quantity} × ${r.itemName}, ${r.glazeName} Glaze · Needed by ${niceDate(r.neededBy)}`,
    detail: (r) => (
      <p>
        <strong>Request:</strong> {r.quantity} × {r.itemName} in {r.glazeName} glaze.
        <br />
        <strong>Completion Target:</strong> {niceDate(r.neededBy)}
      </p>
    ),
  },
};

export default function AdminQueue({ kind }) {
  const cfg = KINDS[kind];
  const [status, setStatus] = useState("");
  const [openId, setOpenId] = useState(null);
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");
  const state = useAsync(
    () => api(`${cfg.path}${status ? `?status=${status}` : ""}`),
    [kind, status],
    { refetchOnFocus: true }
  );

  async function act(item, slug) {
    setNotice("");
    try {
      await api(`${cfg.path}/${item._id}/${slug}`, {
        method: "POST",
        body: note ? { note } : {},
      });
      setNotice(`Action “${slug}” completed successfully.`);
      setOpenId(null);
      setNote("");
    } catch (err) {
      setNotice(`${friendly(err)} The queue has been refreshed with current records.`);
    }
    state.reload();
  }

  return (
    <div style={{ maxWidth: "1080px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <span className="kicker">Operations Queue</span>
          <h1>{cfg.title}</h1>
        </div>
        <div style={{ minWidth: "180px" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>
            Filter by Status
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ marginTop: "0.25rem" }}>
              <option value="">All Statuses</option>
              {cfg.statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {notice && <div className="alert" role="status">{notice}</div>}

      <AsyncState
        state={state}
        isEmpty={(d) => d[cfg.key].length === 0}
        emptyText="No items found in this operational queue."
      >
        {(d) => (
          <ul className="plain" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {d[cfg.key].map((item) => (
              <li key={item._id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <h3 style={{ margin: "0 0 0.25rem 0" }}>{cfg.summary(item)}</h3>
                    <p className="muted" style={{ margin: 0, fontSize: "0.88rem" }}>
                      <strong>Collector:</strong> {item.customer?.name} ({item.customer?.email})
                    </p>
                  </div>
                  <Badge status={item.status} />
                </div>

                <div style={{ marginTop: "1rem" }}>
                  <button
                    className="secondary"
                    aria-expanded={openId === item._id}
                    onClick={() => setOpenId(openId === item._id ? null : item._id)}
                    style={{ fontSize: "0.85rem" }}
                  >
                    {openId === item._id ? "Collapse Details" : "Inspect & Manage"}
                  </button>
                </div>

                {openId === item._id && (
                  <div
                    style={{
                      marginTop: "1.25rem",
                      paddingTop: "1.25rem",
                      borderTop: "1px solid var(--border-cream)",
                      background: "var(--surface-warm)",
                      padding: "1.25rem",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    {cfg.detail(item)}
                    <h4 style={{ margin: "1rem 0 0.5rem 0", fontSize: "0.9rem" }}>Audit Log & History</h4>
                    <Timeline history={item.history} />

                    {cfg.actions.some((a) => a.from.includes(item.status)) ? (
                      <div style={{ marginTop: "1.25rem", borderTop: "1px solid var(--border-cream)", paddingTop: "1rem" }}>
                        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.85rem", fontWeight: 600 }}>
                          Studio Action Note (Optional)
                          <input
                            value={note}
                            maxLength={300}
                            placeholder="Add reason or client note..."
                            onChange={(e) => setNote(e.target.value)}
                          />
                        </label>
                        <div className="row" style={{ marginTop: "0.75rem" }}>
                          {cfg.actions.map((a) => (
                            <button
                              key={a.slug}
                              className={a.slug === "decline" ? "secondary" : "btn"}
                              onClick={() => act(item, a.slug)}
                              style={{ fontSize: "0.85rem" }}
                            >
                              {a.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      cfg.actions.length > 0 && (
                        <p className="muted" style={{ fontSize: "0.85rem", marginTop: "0.75rem" }}>
                          No further operations allowed: this item is {item.status}.
                        </p>
                      )
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </AsyncState>
    </div>
  );
}
