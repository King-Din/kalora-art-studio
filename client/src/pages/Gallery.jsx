import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { money } from "../api/format.js";
import { useAuth } from "../auth.jsx";
import AsyncState from "../components/AsyncState.jsx";
import BuyButton from "../components/BuyButton.jsx";
import { Badge, Img } from "../components/Common.jsx";
import { useAsync } from "../hooks/useAsync.js";

export default function Gallery() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({ q: "", style: "", available: "", sort: "newest" });
  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.type === "checkbox" ? (e.target.checked ? "true" : "") : e.target.value });

  const query = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
  const list = useAsync(() => api(`/paintings${query ? `?${query}` : ""}`), [query], { refetchOnFocus: true });
  const all = useAsync(() => api("/paintings"), []); // only to build the style dropdown
  const styles = [...new Set((all.data?.paintings ?? []).map((p) => p.style).filter(Boolean))].sort();

  return (
    <div>
      <h1>Gallery</h1>
      <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <label>Search <input type="search" value={filters.q} onChange={set("q")} maxLength={100} /></label>
        <label>Style
          <select value={filters.style} onChange={set("style")}>
            <option value="">All styles</option>
            {styles.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label>Sort
          <select value={filters.sort} onChange={set("sort")}>
            <option value="newest">Newest</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
        </label>
        <label className="inline"><input type="checkbox" checked={filters.available === "true"} onChange={set("available")} /> Available only</label>
      </form>

      <AsyncState state={list} isEmpty={(d) => d.paintings.length === 0} emptyText="No paintings match your filters.">
        {(d) => (
          <ul className="grid plain">
            {d.paintings.map((p) => (
              <li key={p._id} className="card painting">
                <Link to={`/paintings/${p._id}`}><Img src={p.imageUrl} alt={p.title} /></Link>
                <h3 className="clamp-2"><Link to={`/paintings/${p._id}`}>{p.title}</Link></h3>
                <p className="muted">{p.artist} · {p.style}</p>
                <p className="clamp-3">{p.description}</p>
                <p><strong>{money(p.price)}</strong> <Badge status={p.status === "sold" ? "sold" : "available"} /></p>
                {user?.role === "customer" && <BuyButton painting={p} onChanged={list.reload} />}
              </li>
            ))}
          </ul>
        )}
      </AsyncState>
    </div>
  );
}
