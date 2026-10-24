import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { addDays, niceDate } from "../api/format.js";
import AsyncState from "../components/AsyncState.jsx";
import { Field, FormError, Img } from "../components/Common.jsx";
import { useAsync } from "../hooks/useAsync.js";

// Mapped authentic pottery image assets
const POTTERY_IMAGES = {
  "i-01": "/images/pottery-kulhad.webp",
  "i-02": "/images/pottery-surahi.webp",
  "i-03": "/images/pottery-matka.jpg",
  "i-04": "/images/pottery-diya-set.webp",
  "i-05": "/images/pottery-gamla.jpg",
};

// Traditional mineral glaze palette
const GLAZE_COLORS = {
  "g-01": "#9B2226", // Kumkum Red
  "g-02": "#E9A036", // Haldi Yellow
  "g-03": "#386641", // Mehendi Green
  "g-04": "#1D3557", // Indigo Blue
  "g-05": "#D4A373", // Sandalwood Beige
  "g-06": "#2B2D42", // Charcoal Black
};

export function PotteryForm({ options, cfg, initial, submitLabel, onSubmit, onCancel }) {
  const [form, setForm] = useState(
    initial ?? { itemId: options.items[0]?.id || "", glazeId: options.glazes[0]?.id || "", quantity: "1", neededBy: "" }
  );
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const min = addDays(cfg.today, cfg.limits.potteryMinDays);

  const selectedItem = options.items.find((i) => i.id === form.itemId);
  const isDiyaSet = form.itemId === "i-04" || selectedItem?.name?.toLowerCase().includes("diya");
  const parsedQty = Math.max(1, Number(form.quantity) || 1);

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
    <form onSubmit={submit} className="panel-cream">
      {/* 1. Visual Ceramic Item Selector */}
      <div className="field">
        <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-dark-title)" }}>
          1. Select Clay Pottery Form
        </span>
        <div className="pottery-grid-selector" role="radiogroup" aria-label="Pottery Items">
          {options.items.map((i) => {
            const isSelected = form.itemId === i.id;
            return (
              <button
                type="button"
                key={i.id}
                role="radio"
                aria-checked={isSelected}
                className={`pottery-option-card ${isSelected ? "selected" : ""}`}
                onClick={() => setForm({ ...form, itemId: i.id })}
              >
                <Img
                  src={POTTERY_IMAGES[i.id] || "/images/pottery-kulhad.webp"}
                  alt={i.name}
                  className="pottery-option-img"
                />
                <div>
                  <h4 className="pottery-option-title">{i.name}</h4>
                  <small style={{ color: "var(--text-dark-muted)", display: "block", marginTop: "2px" }}>
                    {i.id === "i-04" ? "Set of 4 hand-carved diyas" : "Wheel-thrown earthenware"}
                  </small>
                </div>
              </button>
            );
          })}
        </div>
        {/* Hidden select for standard form semantics */}
        <select
          value={form.itemId}
          onChange={set("itemId")}
          style={{ display: "none" }}
          required
        >
          {options.items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
        {error?.details?.itemId && <small className="err">{error.details.itemId}</small>}
      </div>

      {/* 2. Visual Mineral Glaze Selector */}
      <div className="field">
        <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-dark-title)" }}>
          2. Select Natural Mineral Glaze
        </span>
        <div className="glaze-swatches-row" role="radiogroup" aria-label="Glaze Finishes">
          {options.glazes.map((g) => {
            const isSelected = form.glazeId === g.id;
            return (
              <button
                type="button"
                key={g.id}
                role="radio"
                aria-checked={isSelected}
                className={`glaze-swatch-btn ${isSelected ? "selected" : ""}`}
                onClick={() => setForm({ ...form, glazeId: g.id })}
              >
                <span
                  className="swatch-color-disc"
                  style={{ backgroundColor: GLAZE_COLORS[g.id] || "#888" }}
                />
                <span>{g.name}</span>
              </button>
            );
          })}
        </div>
        <select
          value={form.glazeId}
          onChange={set("glazeId")}
          style={{ display: "none" }}
          required
        >
          {options.glazes.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        {error?.details?.glazeId && <small className="err">{error.details.glazeId}</small>}
      </div>

      {/* Diya Set Explanatory Callout Banner */}
      {isDiyaSet && (
        <div className="diya-badge-note" role="status">
          <strong>🪔 Diya Set Craftsmanship:</strong> Each set contains exactly <strong>4 hand-carved earthen diyas</strong>.
          <br />
          <span>
            Selected: <strong>{parsedQty} {parsedQty === 1 ? "set" : "sets"}</strong> = <strong>{parsedQty * 4} total diyas</strong>.
          </span>
        </div>
      )}

      {/* 3. Quantity & Date */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem", margin: "1rem 0" }}>
        <Field
          label={isDiyaSet ? `Quantity of Sets (${cfg.limits.quantityMin}–${cfg.limits.quantityMax})` : `Quantity of Pieces (${cfg.limits.quantityMin}–${cfg.limits.quantityMax})`}
          error={error?.details?.quantity}
        >
          <input
            type="number"
            min={cfg.limits.quantityMin}
            max={cfg.limits.quantityMax}
            step="1"
            value={form.quantity}
            onChange={set("quantity")}
            required
          />
        </Field>

        <Field label={`Needed By (Lead time min ${cfg.limits.potteryMinDays} days)`} error={error?.details?.neededBy}>
          <input
            type="date"
            min={min}
            value={form.neededBy}
            onChange={set("neededBy")}
            required
          />
        </Field>
      </div>

      <FormError error={error} />

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
        <button disabled={busy} className="btn">
          {busy ? "Submitting request…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="secondary" onClick={onCancel}>
            Close
          </button>
        )}
      </div>
    </form>
  );
}

export default function RequestPottery() {
  const data = useAsync(
    async () => ({
      options: await api("/pottery/options"),
      cfg: await api("/config"),
    }),
    []
  );
  const [done, setDone] = useState(false);

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      <span style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--gold-antique)", fontWeight: 700 }}>
        POTTERY STUDIO · JAIPUR ATELIER
      </span>
      <h1 style={{ fontSize: "2.8rem", color: "var(--text-ivory)", margin: "0.25rem 0 0.75rem 0", fontFamily: "var(--font-serif)" }}>
        Handcrafted Clay Pottery
      </h1>
      <p style={{ color: "var(--text-sage)", fontSize: "1.05rem", lineHeight: 1.6, marginBottom: "2rem" }}>
        Commission authentic hand-thrown clay pottery crafted from natural earth by our studio potters.
        Every piece is thrown on the wheel and finished with traditional mineral glazes. Because clay pottery is made by hand in limited batches, our atelier reviews each inquiry personally and confirms pricing with you directly.
      </p>

      {done ? (
        <div className="panel-cream" role="status">
          <h3 style={{ color: "var(--status-available-text)", marginTop: 0 }}>
            Clay Pottery Request Received
          </h3>
          <p>
            Our master potter will inspect your specifications, verify kiln availability, and update your inquiry.
          </p>
          <Link to="/activity" className="btn secondary" style={{ marginTop: "0.5rem" }}>
            View in My Activity
          </Link>
        </div>
      ) : (
        <AsyncState
          state={data}
          isEmpty={(d) => d.options.items.length === 0}
          emptyText="No clay pottery items are currently open for inquiry."
        >
          {({ options, cfg }) => (
            <PotteryForm
              options={options}
              cfg={cfg}
              submitLabel="Submit Pottery Request"
              onSubmit={async (body) => {
                await api("/pottery", { method: "POST", body });
                setDone(true);
              }}
            />
          )}
        </AsyncState>
      )}
    </div>
  );
}
