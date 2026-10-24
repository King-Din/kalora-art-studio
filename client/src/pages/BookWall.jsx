import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { addDays, daysBetween, money, niceDate, weekday } from "../api/format.js";
import AsyncState from "../components/AsyncState.jsx";
import { Field, FormError } from "../components/Common.jsx";
import { useAsync } from "../hooks/useAsync.js";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function BookWall() {
  const config = useAsync(() => api("/config"), []);
  return (
    <div style={{ maxWidth: "860px", margin: "0 auto" }}>
      <span className="kicker">Architectural Murals</span>
      <h1>Commission a Wall Mural</h1>
      <p className="lead-text">
        Transform living rooms, courtyards, boutique hotels, or studio spaces with bespoke site-specific Indian murals.
        Hand-painted by master artisans using enduring archival mineral paints.
      </p>
      <AsyncState state={config}>{(cfg) => <BookingForm cfg={cfg} />}</AsyncState>
    </div>
  );
}

function BookingForm({ cfg }) {
  const { today, limits, muralRatePerSqFt } = cfg;
  const first = addDays(today, limits.bookingMinDays);
  const last = addDays(today, limits.bookingMaxDays);
  const availability = useAsync(
    () => api(`/bookings/availability?from=${first}&to=${last}`),
    [first, last],
    { refetchOnFocus: true }
  );

  const [date, setDate] = useState("");
  const [sqft, setSqft] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [busy, setBusy] = useState(false);

  const taken = new Set(availability.data?.takenDates ?? []);
  const days = Array.from({ length: daysBetween(first, last) + 1 }, (_, i) => addDays(first, i));
  const estimate =
    Number.isInteger(Number(sqft)) && Number(sqft) > 0 ? Number(sqft) * muralRatePerSqFt : null;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuggestions([]);
    try {
      const { booking } = await api("/bookings", {
        method: "POST",
        body: { date, wallSqFt: Number(sqft), address },
      });
      setDone(booking);
      availability.reload();
    } catch (err) {
      setError(err);
      if (err.code === "DATE_TAKEN") {
        // HELPFUL REFUSAL: refresh availability, then offer the 3 nearest free dates.
        try {
          const fresh = await api(`/bookings/availability?from=${first}&to=${last}`);
          const freeNow = days.filter((d) => !fresh.takenDates.includes(d));
          setSuggestions(
            freeNow
              .sort((a, b) => Math.abs(daysBetween(date, a)) - Math.abs(daysBetween(date, b)))
              .slice(0, 3)
          );
          setDate("");
        } catch {
          /* ignore */
        }
        availability.reload();
      }
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="ok" role="status" style={{ padding: "2rem", marginTop: "2rem" }}>
        <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--status-available-text)" }}>
          Mural Commission Request Submitted
        </h3>
        <p>
          Your requested date of <strong>{niceDate(done.date)}</strong> has been recorded.
          <br />
          Estimated investment: <strong>{money(done.price)}</strong> ({done.wallSqFt} sq ft at {money(done.ratePerSqFt)}/sq ft).
        </p>
        <p className="muted" style={{ fontSize: "0.9rem" }}>
          Free cancellation is available until {niceDate(done.cancelCutoff)} (3 days before start).
        </p>
        <Link to="/activity" className="btn secondary" style={{ marginTop: "1rem" }}>
          Track Status in My Activity
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: "2.25rem", marginTop: "1.5rem" }}>
      {/* Policy banner */}
      <div style={{ background: "var(--surface-warm)", padding: "1rem 1.25rem", borderRadius: "var(--radius-sm)", marginBottom: "1.75rem", border: "1px solid var(--border-cream)" }}>
        <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "0.95rem" }}>Studio Commission Guidelines</h4>
        <p className="muted" style={{ margin: 0, fontSize: "0.88rem" }}>
          • Fixed studio rate: <strong>{money(muralRatePerSqFt)} / sq ft</strong>.
          <br />
          • Advance booking window: <strong>{limits.bookingMinDays} to {limits.bookingMaxDays} days</strong> ahead ({niceDate(first)} – {niceDate(last)}).
          <br />
          • Free cancellation up to <strong>3 days</strong> prior to appointment.
        </p>
      </div>

      {/* 7-Column Calendar Grid */}
      <AsyncState state={availability}>
        {() => (
          <fieldset style={{ border: "none", padding: 0, margin: "0 0 1.5rem 0" }}>
            <legend style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              1. Select Mural Date
            </legend>
            <div className="cal-grid" role="group" aria-label="Available studio dates">
              {DAY_NAMES.map((n) => (
                <strong key={n} className="cal-head">
                  {n}
                </strong>
              ))}
              {Array.from({ length: weekday(first) }, (_, i) => (
                <span key={`blank-${i}`} />
              ))}
              {days.map((d) => {
                const isTaken = taken.has(d);
                const isSelected = date === d;
                return (
                  <button
                    type="button"
                    key={d}
                    disabled={isTaken}
                    aria-pressed={isSelected}
                    className={`cal-day ${isSelected ? "selected" : ""}`}
                    onClick={() => setDate(d)}
                    title={isTaken ? `Date ${niceDate(d)} is booked` : `Select ${niceDate(d)}`}
                  >
                    {Number(d.slice(8))}
                  </button>
                );
              })}
            </div>
            <div className="cal-legend">
              <div className="cal-legend-item">
                <span className="cal-legend-dot" style={{ background: "var(--surface-cream)", border: "1px solid var(--border-cream)" }} />
                <span>Available</span>
              </div>
              <div className="cal-legend-item">
                <span className="cal-legend-dot" style={{ background: "var(--terracotta)" }} />
                <span>Selected</span>
              </div>
              <div className="cal-legend-item">
                <span className="cal-legend-dot" style={{ background: "#EFE9DE", textDecoration: "line-through" }} />
                <span>Booked</span>
              </div>
            </div>
          </fieldset>
        )}
      </AsyncState>

      <p aria-live="polite" style={{ fontSize: "0.95rem", fontWeight: 600, color: date ? "var(--terracotta)" : "var(--text-subtle)", marginBottom: "1.5rem" }}>
        {date ? `✦ Selected Date: ${niceDate(date)}` : "Please choose an open date on the calendar above."}
      </p>

      {/* Dimensions & Address */}
      <Field
        label={`2. Wall Area (Square Feet, ${limits.wallMinSqFt}–${limits.wallMaxSqFt} sq ft)`}
        error={error?.details?.wallSqFt}
      >
        <input
          type="number"
          inputMode="numeric"
          min={limits.wallMinSqFt}
          max={limits.wallMaxSqFt}
          step="1"
          placeholder="e.g. 120"
          value={sqft}
          onChange={(e) => setSqft(e.target.value)}
          required
        />
      </Field>

      {/* Real-time calculated price estimate */}
      {estimate !== null && (
        <div className="live-estimate-box" aria-live="polite">
          <span style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-subtle)", display: "block" }}>
            Estimated Investment
          </span>
          <strong style={{ fontSize: "1.6rem", color: "var(--text-main)" }}>
            {money(estimate)}
          </strong>
          <span className="muted" style={{ display: "block", fontSize: "0.85rem", marginTop: "2px" }}>
            Calculation: {sqft} sq ft × {money(muralRatePerSqFt)} / sq ft (verified and locked by server on confirmation).
          </span>
        </div>
      )}

      <Field label="3. Mural Site Address & Space Details" error={error?.details?.address}>
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          maxLength={limits.addressMax}
          placeholder="Include city, street address, wall dimensions or indoor/outdoor surface type..."
          required
          rows={3}
        />
      </Field>

      {error?.details?.date && <p className="err">{error.details.date}</p>}
      <FormError error={error} />

      {/* Helpful Refusal: Nearest Available Dates */}
      {suggestions.length > 0 && (
        <div className="alert" role="status" style={{ margin: "1.25rem 0" }}>
          <p style={{ margin: "0 0 0.5rem 0" }}>
            <strong>The selected date was just reserved.</strong> Recommended nearest available dates:
          </p>
          <div className="row" style={{ margin: 0 }}>
            {suggestions.map((s) => (
              <button
                type="button"
                className="secondary"
                key={s}
                onClick={() => setDate(s)}
                style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem" }}
              >
                {niceDate(s)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: "2rem" }}>
        <button disabled={busy || !date} className="btn" style={{ minWidth: "180px" }}>
          {busy ? "Securing booking…" : "Submit Mural Commission"}
        </button>
      </div>
    </form>
  );
}
