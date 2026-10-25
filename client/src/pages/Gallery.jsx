import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
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
  const all = useAsync(() => api("/paintings"), []); // for the style dropdown and live count
  const styles = [...new Set((all.data?.paintings ?? []).map((p) => p.style).filter(Boolean))].sort();

  // Backend role-aligned navigation routes
  const isStudio = user?.role === "studio";
  const muralLink = isStudio ? "/admin/bookings" : user ? "/book" : "/login?redirect=/book";
  const potteryLink = isStudio ? "/admin/pottery" : user ? "/pottery" : "/login?redirect=/pottery";
  const paintingsLink = isStudio ? "/admin/paintings" : "#collection";

  const scrollToCollection = (e) => {
    if (e) e.preventDefault();
    if (isStudio) {
      navigate("/admin/paintings");
      return;
    }
    const el = document.getElementById("collection");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div>
      {/* ====================================================================
          HERO SECTION (Matching "hero reference.png" with 100% fidelity & full interactivity)
          ==================================================================== */}
      <section className="hero-master-card" aria-label="KĀLORA Atelier">
        {/* Visual master art-directed scene from hero reference.png with clean plaster wall */}
        <img
          src={heroMasterImg}
          alt="KĀLORA Atelier - Jaipur Art Studio: Art for Your Spaces"
          className="hero-master-img"
        />

        {/* Real HTML Action Buttons: text and border elevate together on hover */}
        <div className="hero-cta-button-strip">
          {/* Button 1: Explore Collection */}
          <button
            type="button"
            onClick={scrollToCollection}
            className="btn-hero-cta btn-hero-cta-primary"
            title="Explore Collection → View Available Original Canvases"
          >
            <span className="btn-hero-cta-text">Explore Collection →</span>
          </button>

          {/* Button 2: Commission Wall Mural */}
          <Link
            to={muralLink}
            className="btn-hero-cta btn-hero-cta-secondary"
            title={isStudio ? "Manage Mural Bookings Queue" : "Commission Wall Mural (₹150/sq ft)"}
          >
            <span className="btn-hero-cta-text">{isStudio ? "Manage Mural Bookings" : "Commission Wall Mural"}</span>
          </Link>

          {/* Button 3: Custom Pottery */}
          <Link
            to={potteryLink}
            className="btn-hero-cta btn-hero-cta-secondary"
            title={isStudio ? "Manage Pottery Requests Queue" : "Custom Pottery → Customize Hand-Thrown Clay Pieces"}
          >
            <span className="btn-hero-cta-text">{isStudio ? "Manage Pottery Requests" : "Custom Pottery"}</span>
          </Link>
        </div>

        {/* Interactive hotspot overlays for the 3 Studio Pillars across the bottom */}
        <div className="hero-pillars-overlay">
          {/* Pillar 1: Original Canvases */}
          <button
            type="button"
            onClick={scrollToCollection}
            className="hero-pillar-hotspot"
            title="Original Canvases → Browse One-of-a-Kind Art"
            aria-label="Original Canvases - One-of-a-Kind Art"
          />

          {/* Pillar 2: Bespoke Spaces */}
          <Link
            to={muralLink}
            className="hero-pillar-hotspot"
            title={isStudio ? "Bespoke Spaces → Mural Bookings Queue" : "Bespoke Spaces → Architectural Murals at ₹150/sq ft"}
            aria-label="Bespoke Spaces - Architectural Murals"
          />

          {/* Pillar 3: Studio Pottery */}
          <Link
            to={potteryLink}
            className="hero-pillar-hotspot"
            title={isStudio ? "Studio Pottery → Pottery Requests Queue" : "Studio Pottery → Artisanal Handcrafted Clay Pottery"}
            aria-label="Studio Pottery - Handcrafted Clay Pottery"
          />
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
