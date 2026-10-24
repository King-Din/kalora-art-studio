import { useState } from "react";
import { api } from "../api/client.js";
import { money } from "../api/format.js";
import AsyncState from "../components/AsyncState.jsx";
import { Badge, Field, FormError } from "../components/Common.jsx";
import { useAsync } from "../hooks/useAsync.js";

const EMPTY = { title: "", artist: "", description: "", price: "", imageUrl: "/images/", style: "" };

export default function AdminPaintings() {
  const state = useAsync(() => api("/paintings"), [], { refetchOnFocus: true });
  const [editing, setEditing] = useState(null); // painting _id, or "new"
  return (
    <div>
      <h1>Paintings</h1>
      <button onClick={() => setEditing("new")}>Add painting</button>
      {editing === "new" && <PaintingForm onDone={() => { setEditing(null); state.reload(); }} onClose={() => setEditing(null)} />}
      <AsyncState state={state} isEmpty={(d) => d.paintings.length === 0} emptyText="No paintings yet. Add the first one.">
        {(d) => (
          <ul className="plain">
            {d.paintings.map((p) => (
              <li key={p._id} className="card">
                <h3 className="clamp-2">{p.title} <Badge status={p.status} /></h3>
                <p className="muted">{p.artist} · {p.style} · {money(p.price)}</p>
                <button disabled={p.status !== "available"} onClick={() => setEditing(editing === p._id ? null : p._id)}>Edit</button>
                {p.status !== "available" && <small className="muted"> Sold paintings can't be edited.</small>}
                {editing === p._id && <PaintingForm painting={p} onDone={() => { setEditing(null); state.reload(); }} onClose={() => setEditing(null)} />}
              </li>
            ))}
          </ul>
        )}
      </AsyncState>
    </div>
  );
}

function PaintingForm({ painting, onDone, onClose }) {
  const [form, setForm] = useState(painting ? { ...painting, price: String(painting.price) } : EMPTY);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError(null);
    const body = { title: form.title, artist: form.artist, description: form.description, price: Number(form.price), imageUrl: form.imageUrl, style: form.style };
    try {
      await api(painting ? `/paintings/${painting._id}` : "/paintings", { method: painting ? "PATCH" : "POST", body });
      onDone();
    } catch (err) {
      setError(err);
      if (err.code === "INVALID_STATE") onDone(); // it was sold meanwhile: refresh the list
    }
  }

  const d = error?.details ?? {};
  return (
    <form onSubmit={submit} className="card">
      <Field label="Title" error={d.title}><input value={form.title} onChange={set("title")} required maxLength={200} /></Field>
      <Field label="Artist" error={d.artist}><input value={form.artist} onChange={set("artist")} required maxLength={200} /></Field>
      <Field label="Style" error={d.style}><input value={form.style} onChange={set("style")} required maxLength={80} /></Field>
      <Field label="Price (INR, whole rupees)" error={d.price}><input type="number" min="1" step="1" value={form.price} onChange={set("price")} required /></Field>
      <Field label="Image URL (/images/... or https://...)" error={d.imageUrl}><input value={form.imageUrl} onChange={set("imageUrl")} required /></Field>
      <Field label="Description" error={d.description}><textarea rows={4} value={form.description} onChange={set("description")} maxLength={1500} /></Field>
      <FormError error={error} />
      <div className="row"><button>Save</button><button type="button" className="secondary" onClick={onClose}>Close</button></div>
    </form>
  );
}
