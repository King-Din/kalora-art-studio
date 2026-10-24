import { friendly } from "../api/messages.js";
import { niceTime } from "../api/format.js";

export const Badge = ({ status }) => (
  <span className={`badge ${status}`}>{status}</span>
);

export function FormError({ error }) {
  // aria-live so screen readers announce errors as they appear
  return (
    <div aria-live="polite">
      {error && <p className="alert" role="alert">{friendly(error)}</p>}
    </div>
  );
}

export function Field({ label, error, children, className = "" }) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      {children}
      {error && <small className="err">{error}</small>}
    </label>
  );
}

export function Timeline({ history = [] }) {
  return (
    <ol className="timeline">
      {history.map((h, i) => (
        <li key={i}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <Badge status={h.status} />
            <strong style={{ color: "var(--text-dark-title)" }}>{h.role}</strong>
            <span style={{ color: "var(--text-dark-subtle)" }}>·</span>
            <time style={{ color: "var(--text-dark-muted)" }}>{niceTime(h.at)}</time>
            {h.note && <span style={{ color: "var(--text-dark-muted)" }}>· <em>“{h.note}”</em></span>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="#E8DDCB"/><text x="50%" y="45%" text-anchor="middle" fill="#A94E2D" font-family="serif" font-size="22" font-style="italic">KĀLORA</text><text x="50%" y="60%" text-anchor="middle" fill="#7D8B82" font-family="sans-serif" font-size="13">Artisan Studio Piece</text></svg>'
  );

export const Img = ({ src, alt, ...rest }) => (
  <img
    src={src}
    alt={alt}
    loading="lazy"
    onError={(e) => {
      e.currentTarget.onerror = null;
      e.currentTarget.src = PLACEHOLDER;
    }}
    {...rest}
  />
);
