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
    <div style={{ maxWidth: "960px", margin: "0 auto" }}>
      <span className="kicker">Collector Portal</span>
      <h1>My Studio Activity</h1>
      <p className="lead-text" style={{ marginBottom: "2rem" }}>
        Track your fine art acquisitions, commissioned wall murals, and artisanal pottery orders with full provenance and history.
      </p>

      <nav className="tabs-nav" role="tablist" aria-label="Activity Categories">
        {[
          { key: "orders", label: "Painting Orders" },
          { key: "bookings", label: "Wall Murals" },
          { key: "pottery", label: "Pottery Requests" },
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
          <ul className="plain">
            {d.orders.map((o) => (
              <li key={o._id} className="activity-card">
                <Img
                  src={o.painting?.imageUrl}
                  alt={o.painting?.title ?? "Painting"}
                  className="activity-thumb"
                />
                <div className="activity-content">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div>
                      <h3 style={{ margin: "0 0 0.25rem 0" }}>
                        <Link to={`/paintings/${o.painting?._id}`}>{o.painting?.title}</Link>
                      </h3>
                      <span className="muted" style={{ fontSize: "0.85rem" }}>
                        {o.painting?.artist} · {o.painting?.style}
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <strong style={{ fontSize: "1.15rem", display: "block" }}>{money(o.priceAtPurchase)}</strong>
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
                      <small className="muted" style={{ marginLeft: "0.75rem" }}>
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
        emptyText="You have no mural commissions booked yet. Choose a date on our architectural mural calendar."
      >
        {(d) => (
          <ul className="plain">
            {d.bookings.map((b) => {
              const open = ["requested", "confirmed"].includes(b.status);
              return (
                <li key={b._id} className="card" style={{ marginBottom: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem" }}>
                    <h3>Mural Date: {niceDate(b.date)}</h3>
                    <Badge status={b.status} />
                  </div>

                  <p className="lead-text" style={{ fontSize: "1rem", margin: "0.5rem 0" }}>
                    <strong>{money(b.price)}</strong> ({b.wallSqFt} sq ft at {money(b.ratePerSqFt)}/sq ft)
                  </p>
                  <p className="muted" style={{ fontSize: "0.9rem" }}>
                    <strong>Site Location:</strong> {b.address}
                  </p>

                  <Timeline history={b.history} />

                  <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border-light)" }}>
                    <button
                      className="secondary"
                      disabled={!b.canCancel}
                      onClick={() => c.setTarget(b._id)}
                      style={{ fontSize: "0.85rem" }}
                    >
                      Cancel Booking
                    </button>
                    {open && !b.canCancel && (
                      <span className="muted" style={{ display: "block", marginTop: "0.5rem", fontSize: "0.85rem" }}>
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
        emptyText="You have no custom pottery inquiries currently. Commission a wheel-thrown ceramic piece."
      >
        {(d) => (
          <ul className="plain">
            {d.requests.map((r) => (
              <li key={r._id} className="card" style={{ marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem" }}>
                  <h3>
                    {r.quantity} × {r.itemName} ({r.glazeName} Glaze)
                  </h3>
                  <Badge status={r.status} />
                </div>

                <p className="muted" style={{ margin: "0.5rem 0" }}>
                  Needed by <strong>{niceDate(r.neededBy)}</strong>
                </p>

                <Timeline history={r.history} />

                <div className="row" style={{ marginTop: "1rem" }}>
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
                  <small className="muted" style={{ display: "block", marginTop: "0.5rem" }}>
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
