import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { addDays } from "../api/format.js";
import AsyncState from "../components/AsyncState.jsx";
import { Field, FormError } from "../components/Common.jsx";
import { useAsync } from "../hooks/useAsync.js";

export function PotteryForm({ options, cfg, initial, submitLabel, onSubmit, onCancel }) {
  const [form, setForm] = useState(initial ?? { itemId: "", glazeId: "", quantity: "1", neededBy: "" });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const min = addDays(cfg.today, cfg.limits.potteryMinDays);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ ...form, quantity: Number(form.quantity) });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card">
      <Field label="Item" error={error?.details?.itemId}>
        <select value={form.itemId} onChange={set("itemId")} required>
          <option value="">Choose an item</option>
          {options.items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </Field>
      <Field label="Glaze" error={error?.details?.glazeId}>
        <select value={form.glazeId} onChange={set("glazeId")} required>
          <option value="">Choose a glaze</option>
          {options.glazes.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </Field>
      <Field label={`Quantity (${cfg.limits.quantityMin}–${cfg.limits.quantityMax})`} error={error?.details?.quantity}>
        <input type="number" min={cfg.limits.quantityMin} max={cfg.limits.quantityMax} step="1" value={form.quantity} onChange={set("quantity")} required />
      </Field>
      <Field label="Needed by" error={error?.details?.neededBy}>
        <input type="date" min={min} value={form.neededBy} onChange={set("neededBy")} required />
      </Field>
      <FormError error={error} />
      <div className="row">
        <button disabled={busy}>{busy ? "Saving…" : submitLabel}</button>
        {onCancel && <button type="button" className="secondary" onClick={onCancel}>Close</button>}
      </div>
    </form>
  );
}

export default function RequestPottery() {
  const data = useAsync(async () => ({ options: await api("/pottery/options"), cfg: await api("/config") }), []);
  const [done, setDone] = useState(false);
  return (
    <div>
      <h1>Request pottery</h1>
      <p className="muted">The studio reviews every request and confirms details with you. There is no online price for pottery.</p>
      {done ? (
        <p className="ok" role="status">Request sent! <Link to="/activity">See it in My activity</Link></p>
      ) : (
        <AsyncState state={data} isEmpty={(d) => d.options.items.length === 0} emptyText="No pottery items are available right now.">
          {({ options, cfg }) => (
            <PotteryForm options={options} cfg={cfg} submitLabel="Send request"
              onSubmit={async (body) => { await api("/pottery", { method: "POST", body }); setDone(true); }} />
          )}
        </AsyncState>
      )}
    </div>
  );
}
