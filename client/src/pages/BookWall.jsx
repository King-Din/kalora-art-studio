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
    <div>
      <h1>Book a wall painting</h1>
      <AsyncState state={config}>{(cfg) => <BookingForm cfg={cfg} />}</AsyncState>
    </div>
  );
}

function BookingForm({ cfg }) {
  const { today, limits, muralRatePerSqFt } = cfg;
  const first = addDays(today, limits.bookingMinDays);
  const last = addDays(today, limits.bookingMaxDays);
  const availability = useAsync(() => api(`/bookings/availability?from=${first}&to=${last}`), [first, last], { refetchOnFocus: true });

  const [date, setDate] = useState("");
  const [sqft, setSqft] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [busy, setBusy] = useState(false);

  const taken = new Set(availability.data?.takenDates ?? []);
  const days = Array.from({ length: daysBetween(first, last) + 1 }, (_, i) => addDays(first, i));
  const estimate = Number.isInteger(Number(sqft)) && Number(sqft) > 0 ? Number(sqft) * muralRatePerSqFt : null;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuggestions([]);
    try {
      const { booking } = await api("/bookings", { method: "POST", body: { date, wallSqFt: Number(sqft), address } });
      setDone(booking);
      availability.reload();
    } catch (err) {
      setError(err);
      if (err.code === "DATE_TAKEN") {
        // HELPFUL REFUSAL: refresh availability, then offer the 3 nearest free dates.
        try {
          const fresh = await api(`/bookings/availability?from=${first}&to=${last}`);
          const freeNow = days.filter((d) => !fresh.takenDates.includes(d));
          setSuggestions(freeNow.sort((a, b) => Math.abs(daysBetween(date, a)) - Math.abs(daysBetween(date, b))).slice(0, 3));
          setDate("");
        } catch { /* ignore */ }
        availability.reload();
      }
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="ok" role="status">
        <p>Request sent for {niceDate(done.date)}. Price: {money(done.price)} ({done.wallSqFt} sq ft × {money(done.ratePerSqFt)}). The studio will confirm or decline.</p>
        <p><Link to="/activity">See it in My activity</Link></p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card">
      <p className="muted">Pick a date between {niceDate(first)} and {niceDate(last)}. Greyed dates are taken. Rate: {money(muralRatePerSqFt)} per sq ft.</p>
      <AsyncState state={availability}>
        {() => (
          <fieldset className="calendar">
            <legend>Date</legend>
            <div className="cal-grid" role="group" aria-label="Available dates">
              {DAY_NAMES.map((n) => <strong key={n} className="cal-head">{n}</strong>)}
              {Array.from({ length: weekday(first) }, (_, i) => <span key={`b${i}`} />)}
              {days.map((d) => (
                <button type="button" key={d} disabled={taken.has(d)} aria-pressed={date === d}
                  className={`cal-day ${date === d ? "selected" : ""}`} onClick={() => setDate(d)}
                  title={taken.has(d) ? "Taken" : "Available"}>
                  {Number(d.slice(8))}
                </button>
              ))}
            </div>
          </fieldset>
        )}
      </AsyncState>
      <p aria-live="polite">{date ? `Selected: ${niceDate(date)}` : "No date selected yet."}</p>
      <Field label={`Wall size (sq ft, ${limits.wallMinSqFt}–${limits.wallMaxSqFt})`} error={error?.details?.wallSqFt}>
        <input type="number" inputMode="numeric" min={limits.wallMinSqFt} max={limits.wallMaxSqFt} step="1" value={sqft} onChange={(e) => setSqft(e.target.value)} required />
      </Field>
      <Field label="Wall address" error={error?.details?.address}>
        <textarea value={address} onChange={(e) => setAddress(e.target.value)} maxLength={limits.addressMax} required rows={3} />
      </Field>
      <p aria-live="polite">{estimate !== null ? `Estimated price: ${money(estimate)} (the server recalculates it)` : ""}</p>
      {error?.details?.date && <p className="err">{error.details.date}</p>}
      <FormError error={error} />
      {suggestions.length > 0 && (
        <div role="status">
          <p>Nearest free dates:</p>
          <div className="row">{suggestions.map((s) => <button type="button" className="secondary" key={s} onClick={() => setDate(s)}>{niceDate(s)}</button>)}</div>
        </div>
      )}
      <button disabled={busy || !date}>{busy ? "Sending…" : "Request booking"}</button>
    </form>
  );
}
