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
    title: "Orders", path: "/orders", key: "orders", statuses: ["placed", "cancelled"], actions: [],
    summary: (o) => `${o.painting?.title ?? "Painting"} · ${money(o.priceAtPurchase)}`,
    detail: (o) => <p>Painting: {o.painting?.title} ({o.painting?.artist})</p>,
  },
  bookings: {
    title: "Wall bookings", path: "/bookings", key: "bookings", statuses: ["requested", "confirmed", "declined", "cancelled"],
    actions: [{ label: "Confirm", slug: "confirm", from: ["requested"] }, { label: "Decline", slug: "decline", from: ["requested"] }],
    summary: (b) => `${niceDate(b.date)} · ${b.wallSqFt} sq ft · ${money(b.price)}`,
    detail: (b) => <p>{b.wallSqFt} sq ft at {money(b.ratePerSqFt)}/sq ft = {money(b.price)}<br />Address: {b.address}</p>,
  },
  pottery: {
    title: "Pottery requests", path: "/pottery", key: "requests", statuses: ["requested", "accepted", "declined", "cancelled"],
    actions: [{ label: "Accept", slug: "accept", from: ["requested"] }, { label: "Decline", slug: "decline", from: ["requested"] }],
    summary: (r) => `${r.quantity} × ${r.itemName}, ${r.glazeName} · needed by ${niceDate(r.neededBy)}`,
    detail: (r) => <p>{r.quantity} × {r.itemName} in {r.glazeName}, needed by {niceDate(r.neededBy)}</p>,
  },
};

export default function AdminQueue({ kind }) {
  const cfg = KINDS[kind];
  const [status, setStatus] = useState("");
  const [openId, setOpenId] = useState(null);
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");
  const state = useAsync(() => api(`${cfg.path}${status ? `?status=${status}` : ""}`), [kind, status], { refetchOnFocus: true });

  async function act(item, slug) {
    setNotice("");
    try {
      await api(`${cfg.path}/${item._id}/${slug}`, { method: "POST", body: note ? { note } : {} });
      setNotice(`${slug} done.`);
      setOpenId(null);
      setNote("");
    } catch (err) {
      setNotice(`${friendly(err)} The list now shows the current state.`);
    }
    state.reload();
  }

  return (
    <div>
      <h1>{cfg.title}</h1>
      <label>Status
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          {cfg.statuses.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      <p aria-live="polite">{notice}</p>
      <AsyncState state={state} isEmpty={(d) => d[cfg.key].length === 0} emptyText="Nothing in this queue.">
        {(d) => (
          <ul className="plain">
            {d[cfg.key].map((item) => (
              <li key={item._id} className="card">
                <h3>{cfg.summary(item)} <Badge status={item.status} /></h3>
                <p className="muted">{item.customer?.name} · {item.customer?.email}</p>
                <button className="secondary" aria-expanded={openId === item._id} onClick={() => setOpenId(openId === item._id ? null : item._id)}>
                  {openId === item._id ? "Hide details" : "Details"}
                </button>
                {openId === item._id && (
                  <div className="detail-panel">
                    {cfg.detail(item)}
                    <Timeline history={item.history} />
                    {cfg.actions.some((a) => a.from.includes(item.status)) ? (
                      <>
                        <label>Note (optional) <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} /></label>
                        <div className="row">
                          {cfg.actions.map((a) => <button key={a.slug} onClick={() => act(item, a.slug)}>{a.label}</button>)}
                        </div>
                      </>
                    ) : (
                      cfg.actions.length > 0 && <p className="muted">No further actions: this item is {item.status}.</p>
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
