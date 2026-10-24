import { useState } from "react";
import { api } from "../api/client.js";
import { money } from "../api/format.js";
import AsyncState from "../components/AsyncState.jsx";
import { Badge, Field, FormError, Img } from "../components/Common.jsx";
import { useAsync } from "../hooks/useAsync.js";

const EMPTY = {
  title: "",
  artist: "",
  description: "",
  price: "",
  imageUrl: "/images/",
  style: "",
};

export default function AdminPaintings() {
  const state = useAsync(() => api("/paintings"), [], { refetchOnFocus: true });
  const [editing, setEditing] = useState(null); // painting _id, or "new"

  return (
    <div style={{ maxWidth: "1080px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <span className="kicker">Catalog Inventory</span>
          <h1>Original Paintings</h1>
        </div>
        <button onClick={() => setEditing("new")} className="btn">
          + Add New Painting
        </button>
      </div>

      {editing === "new" && (
        <div style={{ marginBottom: "2rem" }}>
          <PaintingForm
            onDone={() => {
              setEditing(null);
              state.reload();
            }}
            onClose={() => setEditing(null)}
          />
        </div>
      )}

      <AsyncState
        state={state}
        isEmpty={(d) => d.paintings.length === 0}
        emptyText="No paintings currently in database. Add the first one."
      >
        {(d) => (
          <ul className="plain" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {d.paintings.map((p) => (
              <li key={p._id} className="card" style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", flexWrap: "wrap" }}>
                <Img
                  src={p.imageUrl}
                  alt={p.title}
                  style={{ width: "120px", height: "90px", objectFit: "cover", borderRadius: "var(--radius-sm)" }}
                />
                <div style={{ flex: 1, minWidth: "260px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                    <h3 style={{ margin: "0 0 0.25rem 0" }}>{p.title}</h3>
                    <Badge status={p.status} />
                  </div>
                  <p className="muted" style={{ margin: "0.25rem 0 0.75rem 0", fontSize: "0.9rem" }}>
                    {p.artist} · {p.style} · <strong>{money(p.price)}</strong>
                  </p>
                  <div className="row" style={{ margin: 0 }}>
                    <button
                      className="secondary"
                      disabled={p.status !== "available"}
                      onClick={() => setEditing(editing === p._id ? null : p._id)}
                      style={{ fontSize: "0.85rem" }}
                    >
                      {editing === p._id ? "Close Editor" : "Edit Details"}
                    </button>
                    {p.status !== "available" && (
                      <small className="muted">Sold paintings are archived and immutable.</small>
                    )}
                  </div>
                </div>

                {editing === p._id && (
                  <div style={{ width: "100%", marginTop: "1rem", borderTop: "1px solid var(--border-cream)", paddingTop: "1rem" }}>
                    <PaintingForm
                      painting={p}
                      onDone={() => {
                        setEditing(null);
                        state.reload();
                      }}
                      onClose={() => setEditing(null)}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </AsyncState>
    </div>
  );
}

function PaintingForm({ painting, onDone, onClose }) {
  const [form, setForm] = useState(
    painting ? { ...painting, price: String(painting.price) } : EMPTY
  );
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError(null);
    const body = {
      title: form.title,
      artist: form.artist,
      description: form.description,
      price: Number(form.price),
      imageUrl: form.imageUrl,
      style: form.style,
    };
    try {
      await api(painting ? `/paintings/${painting._id}` : "/paintings", {
        method: painting ? "PATCH" : "POST",
        body,
      });
      onDone();
    } catch (err) {
      setError(err);
      if (err.code === "INVALID_STATE") onDone(); // sold meanwhile: refresh
    }
  }

  const d = error?.details ?? {};
  return (
    <form onSubmit={submit} className="card" style={{ background: "var(--surface-warm)" }}>
      <h3>{painting ? `Edit “${painting.title}”` : "Add New Artwork"}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
        <Field label="Artwork Title" error={d.title}>
          <input value={form.title} onChange={set("title")} required maxLength={200} />
        </Field>
        <Field label="Artist Name" error={d.artist}>
          <input value={form.artist} onChange={set("artist")} required maxLength={200} />
        </Field>
        <Field label="Style / Movement" error={d.style}>
          <input value={form.style} onChange={set("style")} required maxLength={80} />
        </Field>
        <Field label="Price (INR, whole rupees)" error={d.price}>
          <input type="number" min="1" step="1" value={form.price} onChange={set("price")} required />
        </Field>
      </div>

      <Field label="Image URL (/images/... or external URL)" error={d.imageUrl}>
        <input value={form.imageUrl} onChange={set("imageUrl")} required />
      </Field>

      <Field label="Description & Technique" error={d.description}>
        <textarea rows={4} value={form.description} onChange={set("description")} maxLength={1500} />
      </Field>

      <FormError error={error} />

      <div className="row" style={{ marginTop: "1rem" }}>
        <button className="btn">Save Artwork</button>
        <button type="button" className="secondary" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}
