import { friendly } from "../api/messages.js";
import { niceTime } from "../api/format.js";

export const Badge = ({ status }) => <span className={`badge ${status}`}>{status}</span>;

export function FormError({ error }) {
  // aria-live so screen readers announce errors as they appear
  return (
    <div aria-live="polite">
      {error && <p className="alert" role="alert">{friendly(error)}</p>}
    </div>
  );
}

export function Field({ label, error, children }) {
  return (
    <label className="field">
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
          <Badge status={h.status} /> <small>{h.role} · {niceTime(h.at)}{h.note ? ` · “${h.note}”` : ""}</small>
        </li>
      ))}
    </ol>
  );
}

export const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#e8e2d8"/><text x="50%" y="50%" text-anchor="middle" fill="#8a8173" font-family="sans-serif" font-size="20">No image</text></svg>');

export const Img = ({ src, alt, ...rest }) => (
  <img src={src} alt={alt} loading="lazy" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = PLACEHOLDER; }} {...rest} />
);
