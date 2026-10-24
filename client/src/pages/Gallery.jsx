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
  const set = (k) => (e) =>
    setFilters({
      ...filters,
      [k]: e.target.type === "checkbox" ? (e.target.checked ? "true" : "") : e.target.value,
    });

  const query = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
  const list = useAsync(() => api(`/paintings${query ? `?${query}` : ""}`), [query], {
    refetchOnFocus: true,
  });
  const all = useAsync(() => api("/paintings"), []); // for the style dropdown
  const styles = [...new Set((all.data?.paintings ?? []).map((p) => p.style).filter(Boolean))].sort();

  return (
    <div>
      {/* Editorial Luxury Hero Banner */}
      <section className="hero-editorial" aria-label="Studio Introduction">
        <div className="hero-content">
          <span className="hero-kicker">✦ Handcrafted in India · Jaipur Atelier</span>
          <h1 className="hero-title">Art for Your Spaces</h1>
          <p className="hero-subtitle">
            Immerse yourself in authentic contemporary Indian artistry. From one-of-a-kind original
            canvases to bespoke architectural wall murals and hand-thrown studio pottery.
          </p>
          <div className="hero-actions">
            <a href="#catalogue" className="btn">
              Explore Collection
            </a>
            {user?.role === "customer" && (
              <>
                <Link to="/book" className="btn secondary">
                  Commission Wall Mural
                </Link>
                <Link to="/pottery" className="btn secondary">
                  Custom Ceramics
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Studio Pillars Showcase */}
        <div className="hero-pillars-grid">
          <div className="hero-pillar-card">
            <span className="hero-pillar-tag">Original Canvases</span>
            <h3 className="hero-pillar-title">One-of-a-Kind Art</h3>
            <p className="hero-pillar-desc">
              Every painting is a unique original. Once acquired, it is archived forever.
            </p>
          </div>
          <div className="hero-pillar-card">
            <span className="hero-pillar-tag">Bespoke Spaces</span>
            <h3 className="hero-pillar-title">Architectural Murals</h3>
            <p className="hero-pillar-desc">
              Custom site-specific murals hand-painted at a fixed studio rate of ₹150/sq ft.
            </p>
          </div>
          <div className="hero-pillar-card">
            <span className="hero-pillar-tag">Studio Ceramics</span>
            <h3 className="hero-pillar-title">Artisanal Pottery</h3>
            <p className="hero-pillar-desc">
              Wheel-thrown clay tableware and decor finished with custom mineral glazes.
            </p>
          </div>
        </div>
      </section>

      {/* Catalog Section Header & Filters */}
      <div id="catalogue" className="catalog-section-header">
        <div>
          <span className="kicker">The Atelier Collection</span>
          <h2>Curated Original Paintings</h2>
        </div>
        <span className="muted" style={{ fontSize: "0.95rem" }}>
          {list.data?.paintings ? `${list.data.paintings.length} creations available` : ""}
        </span>
      </div>

      <form className="filters-bar" role="search" onSubmit={(e) => e.preventDefault()}>
        <label>
          Search Art & Artists
          <input
            type="search"
            placeholder="Search by title, artist, theme..."
            value={filters.q}
            onChange={set("q")}
            maxLength={100}
          />
        </label>

        <label>
          Artistic Style
          <select value={filters.style} onChange={set("style")}>
            <option value="">All Styles</option>
            {styles.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label>
          Sort By
          <select value={filters.sort} onChange={set("sort")}>
            <option value="newest">Newest Acquisitions</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </label>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={filters.available === "true"}
            onChange={set("available")}
          />
          <span>Available pieces only</span>
        </label>
      </form>

      {/* Paintings Grid */}
      <AsyncState
        state={list}
        isEmpty={(d) => d.paintings.length === 0}
        emptyText="No original paintings match your current filter criteria."
      >
        {(d) => (
          <ul className="painting-grid">
            {d.paintings.map((p) => (
              <li key={p._id} className="painting-card">
                <div className="painting-card-media">
                  <Link to={`/paintings/${p._id}`} aria-label={`View details for ${p.title}`}>
                    <Img src={p.imageUrl} alt={p.title} />
                  </Link>
                </div>
                <div className="painting-card-body">
                  <span className="painting-artist">
                    {p.artist} · {p.style}
                  </span>
                  <h3 className="painting-card-title">
                    <Link to={`/paintings/${p._id}`}>{p.title}</Link>
                  </h3>
                  <p className="painting-desc clamp-3">{p.description}</p>
                  <div className="painting-card-footer">
                    <div className="painting-price-block">
                      <span className="painting-price-label">Price</span>
                      <span className="painting-price">{money(p.price)}</span>
                    </div>
                    <Badge status={p.status === "sold" ? "sold" : "available"} />
                  </div>
                  {user?.role === "customer" && (
                    <div style={{ marginTop: "1rem" }}>
                      <BuyButton painting={p} onChanged={list.reload} />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </AsyncState>
    </div>
  );
}
