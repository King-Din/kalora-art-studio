import { friendly } from "../api/messages.js";

// The single place that renders loading / error (with Retry) / empty for every data screen.
export default function AsyncState({ state, isEmpty, emptyText = "Nothing here yet.", children }) {
  const { data, error, loading, reload } = state;
  if (loading && data === null) return <p role="status" className="muted">Loading…</p>;
  if (error && data === null) {
    return (
      <div role="alert" className="alert">
        <p>{friendly(error)}</p>
        {error.requestId && <small>Reference: {error.requestId}</small>}
        <div><button onClick={reload}>Retry</button></div>
      </div>
    );
  }
  if (data !== null && (isEmpty ? isEmpty(data) : false)) return <p className="muted">{emptyText}</p>;
  return children(data);
}
