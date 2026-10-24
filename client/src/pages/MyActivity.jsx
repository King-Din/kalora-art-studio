import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { friendly } from "../api/messages.js";
import { money, niceDate } from "../api/format.js";
import AsyncState from "../components/AsyncState.jsx";
import { Badge, Img, Timeline } from "../components/Common.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { useAsync } from "../hooks/useAsync.js";
import { PotteryForm } from "./RequestPottery.jsx";

export default function MyActivity() {
  const [tab, setTab] = useState("orders");

  return (
    <div style={{ maxWidth: "1080px", margin: "0 auto" }}>
      <span style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--gold-antique)", fontWeight: 700 }}>
        COLLECTOR PORTAL
      </span>
      <h1 style={{ fontSize: "2.8rem", color: "var(--text-ivory)", margin: "0.25rem 0 0.75rem 0", fontFamily: "var(--font-serif)" }}>
        My Studio Activity
      </h1>
      <p style={{ color: "var(--text-sage)", fontSize: "1.05rem", lineHeight: 1.6, marginBottom: "2rem" }}>
        Track your original painting acquisitions, custom wall mural dates, and clay pottery requests with verified provenance and history.
      </p>

      <nav className="tabs-nav" role="tablist" aria-label="Activity Categories">
        {[
          { key: "orders", label: "Painting Orders" },
          { key: "bookings", label: "Wall Murals" },
          { key: "pottery", label: "Clay Pottery Requests" },
        ].map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            className="tab-btn"
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "orders" && <Orders />}
      {tab === "bookings" && <Bookings />}
      {tab === "pottery" && <Pottery />}
    </div>
  );
}

// Shared cancel flow: confirm dialog -> call -> on a stale-state refusal refetch and explain.
function useCancel(path, reload) {
  const [target, setTarget] = useState(null);
  const [notice, setNotice] = useState("");

  async function confirm() {
    const id = target;
    setTarget(null);
    try {
      await api(`${path}/${id}/cancel`, { method: "POST" });
      setNotice("The requested cancellation was processed successfully.");
    } catch (err) {
      setNotice(`${friendly(err)} The list below reflects the current state.`);
    }
    reload();
  }

  return { target, setTarget, notice, confirm };
}

function CancelDialog({ c, what }) {
  return (
    <ConfirmDialog
      open={Boolean(c.target)}
      title={`Confirm Cancellation of this ${what}?`}
      confirmLabel="Yes, Cancel"
      onConfirm={c.confirm}
      onCancel={() => c.setTarget(null)}
    >
      <p>
        Are you certain you wish to cancel this {what}? Once cancelled, this action cannot be undone and dates or inventory will be released back to the atelier.
      </p>
    </ConfirmDialog>
  );
}

function Orders() {
  const state = useAsync(() => api("/orders"), [], { refetchOnFocus: true });
  const c = useCancel("/orders", state.reload);

  return (
    <>
      {c.notice && <div className="alert" role="status">{c.notice}</div>}
      <AsyncState
        state={state}
        isEmpty={(d) => d.orders.length === 0}
        emptyText="You have not acquired any original paintings yet. Explore our curated gallery collection."
      >
        {(d) => (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {d.orders.map((o) => (
              <li key={o._id} className="panel-cream" style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", flexWrap: "wrap" }}>
                <Img
                  src={o.painting?.imageUrl}
                  alt={o.painting?.title ?? "Painting"}
                  style={{ width: "120px", height: "90px", objectFit: "cover", borderRadius: "var(--radius-media)", flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: "260px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div>
                      <h3 style={{ margin: "0 0 0.25rem 0" }}>
                        <Link to={`/paintings/${o.painting?._id}`}>{o.painting?.title}</Link>
                      </h3>
                      <span style={{ color: "var(--text-dark-muted)", fontSize: "0.85rem" }}>
                        {o.painting?.artist} · {o.painting?.style}
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <strong style={{ fontSize: "1.2rem", display: "block" }}>{money(o.priceAtPurchase)}</strong>
                      <Badge status={o.status} />
                    </div>
                  </div>

                  <Timeline history={o.history} />

                  <div style={{ marginTop: "1rem" }}>
                    <button
                      className="secondary"
                      disabled={o.status !== "placed"}
                      onClick={() => c.setTarget(o._id)}
                      style={{ fontSize: "0.85rem" }}
                    >
                      Cancel Order
                    </button>
                    {o.status !== "placed" && (
                      <small style={{ marginLeft: "0.75rem", color: "var(--text-dark-muted)" }}>
                        Order is {o.status}; cancellations are only accepted while placed.
                      </small>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AsyncState>
      <CancelDialog c={c} what="order" />
    </>
  );
}

function Bookings() {
  const state = useAsync(() => api("/bookings"), [], { refetchOnFocus: true });
  const c = useCancel("/bookings", state.reload);

  return (
    <>
      {c.notice && <div className="alert" role="status">{c.notice}</div>}
      <AsyncState
        state={state}
        isEmpty={(d) => d.bookings.length === 0}
        emptyText="You have no wall bookings yet. Choose a date on our architectural mural calendar."
      >
        {(d) => (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {d.bookings.map((b) => {
              const open = ["requested", "confirmed"].includes(b.status);
              return (
                <li key={b._id} className="panel-cream">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem" }}>
                    <h3 style={{ margin: "0 0 0.5rem 0" }}>Mural Date: {niceDate(b.date)}</h3>
                    <Badge status={b.status} />
                  </div>

                  <p style={{ fontSize: "1.05rem", margin: "0.25rem 0", fontWeight: 600 }}>
                    {money(b.price)} ({b.wallSqFt} sq ft × {money(b.ratePerSqFt)}/sq ft)
                  </p>
                  <p style={{ color: "var(--text-dark-muted)", fontSize: "0.9rem", margin: "0 0 0.75rem 0" }}>
                    <strong>Site Location:</strong> {b.address}
                  </p>

                  <Timeline history={b.history} />

                  <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border-cream)" }}>
                    <button
                      className="secondary"
                      disabled={!b.canCancel}
                      onClick={() => c.setTarget(b._id)}
                      style={{ fontSize: "0.85rem" }}
                    >
                      Cancel Booking
                    </button>
                    {open && !b.canCancel && (
                      <span style={{ display: "block", marginTop: "0.5rem", fontSize: "0.85rem", color: "var(--text-dark-muted)" }}>
                        ⓘ Cancellation policy: Reservations may only be cancelled up to 3 days prior ({niceDate(b.cancelCutoff)}).
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </AsyncState>
      <CancelDialog c={c} what="mural booking" />
    </>
  );
}

function Pottery() {
  const state = useAsync(() => api("/pottery"), [], { refetchOnFocus: true });
  const extras = useAsync(
    async () => ({
      options: await api("/pottery/options"),
      cfg: await api("/config"),
    }),
    []
  );
  const c = useCancel("/pottery", state.reload);
  const [editing, setEditing] = useState(null);

  return (
    <>
      {c.notice && <div className="alert" role="status">{c.notice}</div>}
      <AsyncState
        state={state}
        isEmpty={(d) => d.requests.length === 0}
        emptyText="You have no clay pottery requests yet. Commission hand-thrown earthenware."
      >
        {(d) => (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {d.requests.map((r) => (
              <li key={r._id} className="panel-cream">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem" }}>
                  <h3 style={{ margin: "0 0 0.5rem 0" }}>
                    {r.quantity} × {r.itemName} ({r.glazeName} Glaze)
                  </h3>
                  <Badge status={r.status} />
                </div>

                <p style={{ color: "var(--text-dark-muted)", margin: "0 0 0.75rem 0" }}>
                  Needed by <strong>{niceDate(r.neededBy)}</strong>
                </p>

                <Timeline history={r.history} />

                <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
                  <button
                    className="secondary"
                    disabled={r.status !== "requested"}
                    onClick={() => setEditing(editing === r._id ? null : r._id)}
                    style={{ fontSize: "0.85rem" }}
                  >
                    {editing === r._id ? "Close Editor" : "Modify Request"}
                  </button>
                  <button
                    className="secondary"
                    disabled={r.status !== "requested"}
                    onClick={() => c.setTarget(r._id)}
                    style={{ fontSize: "0.85rem" }}
                  >
                    Cancel Request
                  </button>
                </div>

                {r.status !== "requested" && (
                  <small style={{ display: "block", marginTop: "0.5rem", color: "var(--text-dark-muted)" }}>
                    Requests are locked once reviewed and accepted by the studio.
                  </small>
                )}

                {editing === r._id && extras.data && (
                  <div style={{ marginTop: "1.25rem", borderTop: "1px solid var(--border-cream)", paddingTop: "1.25rem" }}>
                    <h4>Modify Request Specifications</h4>
                    <PotteryForm
                      options={extras.data.options}
                      cfg={extras.data.cfg}
                      submitLabel="Save Changes"
                      initial={{
                        itemId: r.itemId,
                        glazeId: r.glazeId,
                        quantity: String(r.quantity),
                        neededBy: r.neededBy,
                      }}
                      onCancel={() => setEditing(null)}
                      onSubmit={async (body) => {
                        try {
                          await api(`/pottery/${r._id}`, { method: "PATCH", body });
                          setEditing(null);
                          state.reload();
                        } catch (err) {
                          if (err.code === "INVALID_STATE") {
                            setEditing(null);
                            state.reload();
                          }
                          throw err;
                        }
                      }}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </AsyncState>
      <CancelDialog c={c} what="pottery request" />
    </>
  );
}
