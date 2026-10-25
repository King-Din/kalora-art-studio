import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { money } from "../api/format.js";
import { useAuth } from "../auth.jsx";
import AsyncState from "../components/AsyncState.jsx";
import BuyButton from "../components/BuyButton.jsx";
import { Badge, Img } from "../components/Common.jsx";
import { useAsync } from "../hooks/useAsync.js";
import heroMasterImg from "../assets/hero-card-master.png";

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
          HERO SECTION (Matching "hero reference.png" with 100% fidelity)
          ==================================================================== */}
      <section className="hero-master-card" aria-label="KĀLORA Atelier">
        {/* Visual master art-directed scene from hero reference.png */}
        <img
          src={heroMasterImg}
          alt="KĀLORA Atelier - Jaipur Art Studio: Art for Your Spaces"
          className="hero-master-img"
        />

        {/* Interactive pixel-matched hotspot overlays */}
        <div className="hero-interactive-overlay">
          {/* Button 1: Explore Collection */}
          <a
            href="#collection"
            className="hero-hotspot hero-hotspot-b1"
            title="Explore Collection"
            aria-label="Explore Collection"
          />

          {/* Button 2: Commission Wall Mural */}
          <Link
            to="/book"
            className="hero-hotspot hero-hotspot-b2"
            title="Commission Wall Mural"
            aria-label="Commission Wall Mural"
          />

          {/* Button 3: Custom Ceramics / Pottery Studio */}
          <Link
            to="/pottery"
            className="hero-hotspot hero-hotspot-b3"
            title="Custom Ceramics & Pottery Studio"
            aria-label="Custom Ceramics & Pottery Studio"
          />

          {/* Pillar 1: Original Canvases */}
          <a
            href="#collection"
            className="hero-hotspot-pillar hero-hotspot-p1"
            title="Original Canvases - One-of-a-Kind Art"
            aria-label="Original Canvases - One-of-a-Kind Art"
          />

          {/* Pillar 2: Bespoke Spaces */}
          <Link
            to="/book"
            className="hero-hotspot-pillar hero-hotspot-p2"
            title="Bespoke Spaces - Architectural Murals"
            aria-label="Bespoke Spaces - Architectural Murals"
          />

          {/* Pillar 3: Studio Ceramics */}
          <Link
            to="/pottery"
            className="hero-hotspot-pillar hero-hotspot-p3"
            title="Studio Ceramics - Handcrafted Clay Pottery"
            aria-label="Studio Ceramics - Handcrafted Clay Pottery"
          />
        </div>

        {/* Accessible Semantic DOM for Screen Readers, Assistive Tech and SEO */}
        <div className="sr-only">
          <span className="hero-kicker">✦ HANDCRAFTED IN INDIA · JAIPUR ATELIER</span>
          <h1 className="hero-heading">Art for Your Spaces</h1>
          <p className="hero-lead">
            Immerse yourself in authentic contemporary Indian artistry. From one-of-a-kind original
            canvases to bespoke architectural wall murals and hand-thrown studio pottery.
          </p>
          <div className="hero-cta-group">
            <a href="#collection">Explore Collection →</a>
            <Link to="/book">Commission Wall Mural</Link>
            <Link to="/pottery">Custom Ceramics & Pottery Studio</Link>
          </div>
          <div className="hero-pillars-semantic">
            <div>
              <span>ORIGINAL CANVASES</span>
              <h3>One-of-a-Kind Art</h3>
              <p>Every painting is a unique original. Once acquired, it is archived forever.</p>
            </div>
            <div>
              <span>BESPOKE SPACES</span>
              <h3>Architectural Murals</h3>
              <p>Custom site-specific murals hand-painted at a fixed studio rate of ₹150/sq ft.</p>
            </div>
            <div>
              <span>STUDIO CERAMICS</span>
              <h3>Handcrafted Clay Pottery</h3>
              <p>Wheel-thrown clay tableware and decor finished with custom mineral glazes.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile CTA quick tray (enhanced touch targets on mobile screens) */}
      <div className="hero-mobile-cta">
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
