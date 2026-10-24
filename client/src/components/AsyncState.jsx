import { friendly } from "../api/messages.js";

// Branded Artistic Loading Spinner (Indian studio pottery wheel motif)
export function BrandedLoader({ message = "Curating collection…" }) {
  return (
    <div className="loading-container" role="status" aria-live="polite">
      <svg
        className="pottery-wheel-spinner"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Outer Wheel Rim */}
        <circle cx="50" cy="50" r="46" stroke="#E5DAC7" strokeWidth="4" />
        {/* Terracotta Clay Ring */}
        <circle
          cx="50"
          cy="50"
          r="36"
          stroke="#B95735"
          strokeWidth="6"
          strokeDasharray="160 50"
          strokeLinecap="round"
        />
        {/* Ochre Glaze Arc */}
        <circle
          cx="50"
          cy="50"
          r="24"
          stroke="#C89543"
          strokeWidth="4"
          strokeDasharray="80 70"
          strokeLinecap="round"
        />
        {/* Center Pivot */}
        <circle cx="50" cy="50" r="8" fill="#183B2D" />
        <circle cx="50" cy="50" r="3" fill="#D4AC68" />
      </svg>
      <span className="loading-text">{message}</span>
    </div>
  );
}

// The single place that renders loading / error (with Retry) / empty for every data screen.
export default function AsyncState({
  state,
  isEmpty,
  emptyText = "Nothing in this view yet.",
  children,
}) {
  const { data, error, loading, reload } = state;

  if (loading && data === null) {
    return <BrandedLoader />;
  }

  if (error && data === null) {
    return (
      <div role="alert" className="alert">
        <p><strong>Unable to load studio content:</strong> {friendly(error)}</p>
        {error.requestId && <small>Audit reference: {error.requestId}</small>}
        <div>
          <button onClick={reload} style={{ marginTop: "0.5rem" }}>
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (data !== null && (isEmpty ? isEmpty(data) : false)) {
    return (
      <div className="empty-state-box">
        <p>{emptyText}</p>
      </div>
    );
  }

  return children(data);
}
