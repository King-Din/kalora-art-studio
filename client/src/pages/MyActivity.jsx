import { useState } from "react";
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
    <div>
      <h1>My activity</h1>
      <div role="tablist" className="row">
        {["orders", "bookings", "pottery"].map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "" : "secondary"} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
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
      setNotice("Cancelled.");
    } catch (err) {
      setNotice(`${friendly(err)} The list below shows the current state.`);
    }
    reload();
  }
  return { target, setTarget, notice, confirm };
}

function CancelDialog({ c, what }) {
  return (
    <ConfirmDialog open={Boolean(c.target)} title={`Cancel this ${what}?`} confirmLabel="Yes, cancel it" onConfirm={c.confirm} onCancel={() => c.setTarget(null)}>
      <p>This can't be undone.</p>
    </ConfirmDialog>
  );
}

function Orders() {
  const state = useAsync(() => api("/orders"), [], { refetchOnFocus: true });
  const c = useCancel("/orders", state.reload);
  return (
    <>
      <p aria-live="polite">{c.notice}</p>
      <AsyncState state={state} isEmpty={(d) => d.orders.length === 0} emptyText="You haven't bought any paintings yet.">
        {(d) => (
          <ul className="plain">
            {d.orders.map((o) => (
              <li key={o._id} className="card row-card">
                <Img src={o.painting?.imageUrl} alt={o.painting?.title ?? "Painting"} className="thumb" />
                <div>
                  <h3>{o.painting?.title}</h3>
                  <p>{money(o.priceAtPurchase)} <Badge status={o.status} /></p>
                  <Timeline history={o.history} />
                  <button disabled={o.status !== "placed"} onClick={() => c.setTarget(o._id)}>Cancel order</button>
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
      <p aria-live="polite">{c.notice}</p>
      <AsyncState state={state} isEmpty={(d) => d.bookings.length === 0} emptyText="No wall bookings yet.">
        {(d) => (
          <ul className="plain">
            {d.bookings.map((b) => {
              const open = ["requested", "confirmed"].includes(b.status);
              return (
                <li key={b._id} className="card">
                  <h3>{niceDate(b.date)} <Badge status={b.status} /></h3>
                  <p>{b.wallSqFt} sq ft · {money(b.price)} ({money(b.ratePerSqFt)}/sq ft) · {b.address}</p>
                  <Timeline history={b.history} />
                  <button disabled={!b.canCancel} onClick={() => c.setTarget(b._id)}>Cancel booking</button>
                  {open && !b.canCancel && <p className="muted">Cancellation closed: bookings can be cancelled until {niceDate(b.cancelCutoff)}.</p>}
                </li>
              );
            })}
          </ul>
        )}
      </AsyncState>
      <CancelDialog c={c} what="booking" />
    </>
  );
}

function Pottery() {
  const state = useAsync(() => api("/pottery"), [], { refetchOnFocus: true });
  const extras = useAsync(async () => ({ options: await api("/pottery/options"), cfg: await api("/config") }), []);
  const c = useCancel("/pottery", state.reload);
  const [editing, setEditing] = useState(null);
  return (
    <>
      <p aria-live="polite">{c.notice}</p>
      <AsyncState state={state} isEmpty={(d) => d.requests.length === 0} emptyText="No pottery requests yet.">
        {(d) => (
          <ul className="plain">
            {d.requests.map((r) => (
              <li key={r._id} className="card">
                <h3>{r.quantity} × {r.itemName}, {r.glazeName} <Badge status={r.status} /></h3>
                <p>Needed by {niceDate(r.neededBy)}</p>
                <Timeline history={r.history} />
                <div className="row">
                  <button disabled={r.status !== "requested"} onClick={() => setEditing(editing === r._id ? null : r._id)}>Edit</button>
                  <button disabled={r.status !== "requested"} onClick={() => c.setTarget(r._id)}>Cancel request</button>
                </div>
                {r.status !== "requested" && <p className="muted">Only requests that are still “requested” can be changed.</p>}
                {editing === r._id && extras.data && (
                  <PotteryForm options={extras.data.options} cfg={extras.data.cfg} submitLabel="Save changes"
                    initial={{ itemId: r.itemId, glazeId: r.glazeId, quantity: String(r.quantity), neededBy: r.neededBy }}
                    onCancel={() => setEditing(null)}
                    onSubmit={async (body) => {
                      try { await api(`/pottery/${r._id}`, { method: "PATCH", body }); setEditing(null); state.reload(); }
                      catch (err) { if (err.code === "INVALID_STATE") { setEditing(null); state.reload(); } throw err; }
                    }} />
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
