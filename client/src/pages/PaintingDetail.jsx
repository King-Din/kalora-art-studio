import { Link, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import { money } from "../api/format.js";
import { useAuth } from "../auth.jsx";
import AsyncState from "../components/AsyncState.jsx";
import BuyButton from "../components/BuyButton.jsx";
import { Badge, Img } from "../components/Common.jsx";
import { useAsync } from "../hooks/useAsync.js";

export default function PaintingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const state = useAsync(() => api(`/paintings/${id}`), [id], { refetchOnFocus: true });

  return (
    <div>
      <p style={{ marginBottom: "1.75rem" }}>
        <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontWeight: 600, color: "var(--gold-antique)" }}>
          ← Return to Atelier Collection
        </Link>
      </p>

      <AsyncState state={state}>
        {({ painting: p }) => (
          <article className="detail-layout">
            <div className="detail-mat-frame">
              <Img src={p.imageUrl} alt={p.title} />
            </div>

            <div className="panel-cream">
              <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--terracotta)", fontWeight: 700, display: "block", marginBottom: "0.4rem" }}>
                ORIGINAL CANVAS · 1/1 EDITION
              </span>
              <h1 style={{ fontSize: "2.5rem", margin: "0 0 0.5rem 0", color: "var(--text-dark-title)", lineHeight: 1.2 }}>
                {p.title}
              </h1>
              <p style={{ fontStyle: "italic", color: "var(--terracotta)", fontSize: "1.1rem", margin: "0 0 1.25rem 0" }}>
                By {p.artist} · {p.style}
              </p>

              <div style={{ margin: "1.25rem 0" }}>
                <h4 style={{ margin: "0 0 0.4rem 0", fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-dark-subtle)" }}>
                  Artist's Technique & Narrative
                </h4>
                <p style={{ margin: 0, fontSize: "0.96rem", lineHeight: 1.6, color: "var(--text-dark-body)", whiteSpace: "pre-wrap" }}>
                  {p.description}
                </p>
              </div>

              <table className="detail-specs-table" aria-label="Artwork specifications">
                <tbody>
                  <tr>
                    <th>Artistic Movement</th>
                    <td>{p.style}</td>
                  </tr>
                  <tr>
                    <th>Lead Artist</th>
                    <td>{p.artist}</td>
                  </tr>
                  <tr>
                    <th>Edition</th>
                    <td>Unique 1/1 Original</td>
                  </tr>
                  <tr>
                    <th>Origin</th>
                    <td>Jaipur Atelier, Rajasthan</td>
                  </tr>
                  <tr>
                    <th>Certificate</th>
                    <td>Signed Certificate of Authenticity included</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ background: "var(--surface-cream-alt)", border: "1px solid var(--border-cream)", borderRadius: "var(--radius-btn)", padding: "1.25rem", marginTop: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1rem" }}>
                  <div>
                    <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-dark-subtle)", display: "block" }}>
                      Acquisition Value
                    </span>
                    <strong style={{ fontSize: "1.9rem", color: "var(--text-dark-title)" }}>
                      {money(p.price)}
                    </strong>
                  </div>
                  <Badge status={p.status === "sold" ? "sold" : "available"} />
                </div>

                {user?.role === "customer" ? (
                  <BuyButton painting={p} onChanged={state.reload} />
                ) : (
                  <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text-dark-muted)" }}>
                    {user?.role === "studio"
                      ? "Studio mode: Original art acquisitions are active for collector accounts."
                      : "Please sign in to acquire this original piece."}
                  </p>
                )}
              </div>
            </div>
          </article>
        )}
      </AsyncState>
    </div>
  );
}
