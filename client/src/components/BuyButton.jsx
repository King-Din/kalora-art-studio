import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { friendly } from "../api/messages.js";
import { money } from "../api/format.js";

// HELPFUL REFUSAL: if someone else got the painting first, say so, refresh, and suggest up to 3 alternatives.
export default function BuyButton({ painting, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const sold = painting.status === "sold";

  async function buy() {
    setBusy(true);
    setMessage(null);
    setAlternatives([]);
    try {
      await api(`/paintings/${painting._id}/buy`, { method: "POST" });
      setMessage({ ok: true, text: "Acquisition confirmed! Your order is recorded under My Activity." });
    } catch (err) {
      setMessage({
        ok: false,
        text: err.code === "PAINTING_ALREADY_SOLD" ? "Another collector acquired this piece a moment ago." : friendly(err),
      });
      if (err.code === "PAINTING_ALREADY_SOLD") {
        try {
          const fresh = (await api("/paintings?available=true")).paintings.filter((p) => p._id !== painting._id);
          const sameStyle = fresh.filter((p) => p.style === painting.style);
          const pool = sameStyle.length ? sameStyle : fresh;
          setAlternatives([...pool].sort((a, b) => Math.abs(a.price - painting.price) - Math.abs(b.price - painting.price)).slice(0, 3));
        } catch {
          /* suggestions are a bonus; ignore failures */
        }
      }
    } finally {
      setBusy(false);
      onChanged?.(); // refresh the gallery so the new state is visible
    }
  }

  return (
    <div>
      <button
        onClick={buy}
        disabled={sold || busy || message?.ok}
        className={sold ? "secondary" : "btn"}
        style={{ width: "100%", justifyContent: "center" }}
      >
        {sold ? "Archived / Sold" : busy ? "Securing Canvas…" : `Acquire Original · ${money(painting.price)}`}
      </button>

      <div aria-live="polite">
        {message && (
          <p
            className={message.ok ? "ok" : "alert"}
            role={message.ok ? "status" : "alert"}
            style={{ fontSize: "0.88rem", marginTop: "0.75rem" }}
          >
            {message.text}
          </p>
        )}
        {alternatives.length > 0 && (
          <div style={{ marginTop: "0.75rem", background: "var(--surface-warm)", padding: "0.75rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-cream)" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--terracotta)", display: "block", marginBottom: "0.35rem" }}>
              Suggested Alternative Works:
            </span>
            <ul className="plain" style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              {alternatives.map((a) => (
                <li key={a._id} style={{ fontSize: "0.85rem" }}>
                  <Link to={`/paintings/${a._id}`} style={{ fontWeight: 600 }}>
                    {a.title}
                  </Link>{" "}
                  <span className="muted">· {a.style} · {money(a.price)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
