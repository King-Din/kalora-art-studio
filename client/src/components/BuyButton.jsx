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
      setMessage({ ok: true, text: "Order placed! You can see it under My activity." });
    } catch (err) {
      setMessage({ ok: false, text: err.code === "PAINTING_ALREADY_SOLD" ? "Someone bought this a moment ago." : friendly(err) });
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
      <button onClick={buy} disabled={sold || busy || message?.ok}>
        {sold ? "Sold" : busy ? "Buying…" : "Buy"}
      </button>
      <div aria-live="polite">
        {message && <p className={message.ok ? "ok" : "alert"} role={message.ok ? "status" : "alert"}>{message.text}</p>}
        {alternatives.length > 0 && (
          <div>
            <small>You might like:</small>
            <ul className="plain">
              {alternatives.map((a) => (
                <li key={a._id}><Link to={`/paintings/${a._id}`}>{a.title}</Link> · {a.style} · {money(a.price)}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
