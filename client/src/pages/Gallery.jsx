import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { money } from "../api/format.js";
import { useAuth } from "../auth.jsx";
import AsyncState from "../components/AsyncState.jsx";
import BuyButton from "../components/BuyButton.jsx";
import { Badge, Img } from "../components/Common.jsx";
import { useAsync } from "../hooks/useAsync.js";
import heroArtImg from "../assets/hero-interior-feathered.png";

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
      {/* ====================================================================
          HERO SECTION (Matching "hero reference.png")
          ==================================================================== */}
      <section className="hero-frame" aria-label="KĀLORA Atelier">
        <div className="hero-main-row">
          <div className="hero-text-col">
            <span className="hero-kicker">✦ HANDCRAFTED IN INDIA · JAIPUR ATELIER</span>
            <h1 className="hero-heading">Art for Your Spaces</h1>
            <p className="hero-lead">
              Immerse yourself in authentic contemporary Indian artistry. From one-of-a-kind original
              canvases to bespoke architectural wall murals and hand-thrown studio pottery.
            </p>
            <div className="hero-cta-group">
              <a href="#collection" className="btn-hero-primary">
                Explore Collection →
              </a>
              <Link to="/book" className="btn-hero-secondary">
                Commission Wall Mural
              </Link>
              <Link to="/pottery" className="btn-hero-secondary">
                Pottery Studio
              </Link>
            </div>
          </div>

          <div className="hero-art-col">
            <img
              src={heroArtImg}
              alt="Artisan Indian interior with peacock painting and lotus murals"
              className="hero-art-img"
            />
          </div>
        </div>

        {/* 3 Studio Pillars (Bottom of Hero Frame) */}
        <div className="hero-pillars-row">
          <div className="pillar-item">
            <div className="pillar-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <div className="pillar-content">
              <span className="pillar-kicker">ORIGINAL CANVASES</span>
              <h3 className="pillar-title">One-of-a-Kind Art</h3>
              <p className="pillar-desc">
                Every painting is a unique original. Once acquired, it is archived forever.
              </p>
            </div>
          </div>

          <div className="pillar-item">
            <div className="pillar-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 21V10a8 8 0 0 1 16 0v11" />
                <path d="M4 21h16" />
                <path d="M9 21v-6a3 3 0 0 1 6 0v6" />
              </svg>
            </div>
            <div className="pillar-content">
              <span className="pillar-kicker">BESPOKE SPACES</span>
              <h3 className="pillar-title">Architectural Murals</h3>
              <p className="pillar-desc">
                Custom site-specific murals hand-painted at a fixed studio rate of ₹150/sq ft.
              </p>
            </div>
          </div>

          <div className="pillar-item">
            <div className="pillar-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3h8l1 4c0 3-2 5-2 7 0 3 2 4 2 7H7c0-3 2-4 2-7 0-2-2-4-2-7l1-4z" />
                <path d="M10 3v4" />
                <path d="M14 3v4" />
              </svg>
            </div>
            <div className="pillar-content">
              <span className="pillar-kicker">POTTERY STUDIO</span>
              <h3 className="pillar-title">Handcrafted Clay Pottery</h3>
              <p className="pillar-desc">
                Wheel-thrown clay tableware and decor finished with custom mineral glazes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          CATALOG SECTION & FILTER BAR
          ==================================================================== */}
      <div id="collection" className="catalog-header-bar">
        <div>
          <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--gold-antique)", fontWeight: 700 }}>
            CURATED ATELIER COLLECTION
          </span>
          <h2 className="catalog-title">Original Paintings</h2>
        </div>
        <span style={{ color: "var(--text-sage)", fontSize: "0.92rem" }}>
          {list.data?.paintings ? `${list.data.paintings.length} creations available` : ""}
        </span>
      </div>

      <form className="filters-bar" role="search" onSubmit={(e) => e.preventDefault()}>
        <label>
          Search Art & Artists
          <input
            type="search"
            placeholder="Search title, artist, style..."
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

      {/* ====================================================================
          PRODUCT CARDS GRID (Matching "product cards reference.png")
          ==================================================================== */}
      <AsyncState
        state={list}
        isEmpty={(d) => d.paintings.length === 0}
        emptyText="No original paintings match your current filter criteria."
      >
        {(d) => (
          <ul className="product-grid">
            {d.paintings.map((p) => (
              <li key={p._id} className="card-product">
                {/* Delicate translucent botanical leaf accents */}
                <div className="leaf-tr" aria-hidden="true" />
                <div className="leaf-bl" aria-hidden="true" />

                <div className="card-media">
                  <Link to={`/paintings/${p._id}`} aria-label={`View ${p.title}`}>
                    <Img src={p.imageUrl} alt={p.title} />
                  </Link>
                </div>

                <div className="card-content">
                  <div className="card-artist-meta">
                    {p.artist.toUpperCase()} · {p.style.toUpperCase()}
                  </div>

                  <h3 className="card-title">
                    <Link to={`/paintings/${p._id}`}>{p.title}</Link>
                  </h3>

                  <p className="card-desc clamp-2">{p.description}</p>

                  <div className="card-divider" />

                  <div className="card-pricing-row">
                    <div className="price-stack">
                      <span className="price-kicker">PRICE</span>
                      <strong className="price-val">{money(p.price)}</strong>
                    </div>
                    <Badge status={p.status === "sold" ? "sold" : "available"} />
                  </div>

                  <div style={{ marginTop: "auto" }}>
                    <BuyButton painting={p} onChanged={list.reload} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AsyncState>
    </div>
  );
}
