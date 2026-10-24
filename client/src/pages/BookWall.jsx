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
    <div style={{ maxWidth: "880px", margin: "0 auto" }}>
      <span style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--gold-antique)", fontWeight: 700 }}>
        BESPOKE SPACES · SITE-SPECIFIC MURALS
      </span>
      <h1 style={{ fontSize: "2.8rem", color: "var(--text-ivory)", margin: "0.25rem 0 0.75rem 0", fontFamily: "var(--font-serif)" }}>
        Commission a Wall Mural
      </h1>
      <p style={{ color: "var(--text-sage)", fontSize: "1.05rem", lineHeight: 1.6, marginBottom: "2rem" }}>
        Transform residences, heritage courtyards, or contemporary studios with custom Indian murals.
        Hand-painted on-site by master artisans using archival mineral pigments.
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
      <div className="panel-cream" role="status">
        <h3 style={{ color: "var(--status-available-text)", marginTop: 0 }}>
          Wall Mural Commission Scheduled
        </h3>
        <p>
          Your requested date of <strong>{niceDate(done.date)}</strong> has been recorded.
          <br />
          Estimated investment: <strong>{money(done.price)}</strong> ({done.wallSqFt} sq ft × {money(done.ratePerSqFt)}/sq ft).
        </p>
        <p style={{ color: "var(--text-dark-muted)", fontSize: "0.9rem" }}>
          Free cancellation is available until {niceDate(done.cancelCutoff)} (3 days prior).
        </p>
        <Link to="/activity" className="btn secondary" style={{ marginTop: "1rem" }}>
          Track Status in My Activity
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="panel-cream">
      {/* Policy banner */}
      <div style={{ background: "var(--surface-cream-alt)", padding: "1rem 1.25rem", borderRadius: "var(--radius-btn)", marginBottom: "1.75rem", border: "1px solid var(--border-cream)" }}>
        <h4 style={{ margin: "0 0 0.35rem 0", fontSize: "0.95rem" }}>Studio Commission Guidelines</h4>
        <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text-dark-muted)", lineHeight: 1.6 }}>
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
            <legend style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-dark-title)", marginBottom: "0.5rem" }}>
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
            <div style={{ display: "flex", gap: "1.25rem", fontSize: "0.8rem", color: "var(--text-dark-muted)", marginTop: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ width: "10px", height: "10px", background: "#FFFFFF", border: "1px solid var(--border-cream)", borderRadius: "2px" }} />
                <span>Available</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ width: "10px", height: "10px", background: "var(--terracotta)", borderRadius: "2px" }} />
                <span>Selected</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ width: "10px", height: "10px", background: "#EAE2D4", borderRadius: "2px" }} />
                <span>Booked</span>
              </div>
            </div>
          </fieldset>
        )}
      </AsyncState>

      <p aria-live="polite" style={{ fontSize: "0.95rem", fontWeight: 700, color: date ? "var(--terracotta)" : "var(--text-dark-subtle)", margin: "0 0 1.5rem 0" }}>
        {date ? `✦ Selected Date: ${niceDate(date)}` : "Please choose an open date on the calendar above."}
      </p>

      {/* Wall area */}
      <Field
        label={`2. Wall Surface Area (Square Feet, ${limits.wallMinSqFt}–${limits.wallMaxSqFt} sq ft)`}
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
          <span style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-dark-subtle)", display: "block" }}>
            Estimated Investment
          </span>
          <strong style={{ fontSize: "1.7rem", color: "var(--text-dark-title)" }}>
            {money(estimate)}
          </strong>
          <span style={{ display: "block", fontSize: "0.85rem", color: "var(--text-dark-muted)", marginTop: "2px" }}>
            {sqft} sq ft × {money(muralRatePerSqFt)} / sq ft (verified and locked by server on confirmation).
          </span>
        </div>
      )}

      <Field label="3. Mural Site Address & Space Details" error={error?.details?.address}>
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          maxLength={limits.addressMax}
          placeholder="City, street address, wall dimensions or indoor/outdoor surface type..."
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
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
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
