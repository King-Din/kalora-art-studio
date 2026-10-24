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
      <p style={{ marginBottom: "1.5rem" }}>
        <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontWeight: 600 }}>
          ← Back to Atelier Collection
        </Link>
      </p>

      <AsyncState state={state}>
        {({ painting: p }) => (
          <article className="detail-view">
            <div className="detail-gallery">
              <Img src={p.imageUrl} alt={p.title} />
            </div>

            <div className="detail-meta-box">
              <div>
                <span className="kicker">Original Canvas</span>
                <h1>{p.title}</h1>
                <p className="serif-subtitle">
                  By {p.artist} · {p.style}
                </p>
              </div>

              <div>
                <h4 style={{ margin: "0 0 0.5rem 0", fontFamily: "var(--font-sans)", fontSize: "0.88rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-subtle)" }}>
                  Artisan Notes
                </h4>
                <p className="prewrap lead-text" style={{ fontSize: "1rem" }}>
                  {p.description}
                </p>
              </div>

              <table className="detail-specs-table" aria-label="Artwork specifications">
                <tbody>
                  <tr>
                    <th>Artistic Style</th>
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

              <div className="detail-purchase-panel">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1rem" }}>
                  <div>
                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-subtle)", display: "block" }}>
                      Acquisition Value
                    </span>
                    <strong style={{ fontSize: "2rem", color: "var(--text-main)", letterSpacing: "-0.02em" }}>
                      {money(p.price)}
                    </strong>
                  </div>
                  <Badge status={p.status === "sold" ? "sold" : "available"} />
                </div>

                {user?.role === "customer" ? (
                  <BuyButton painting={p} onChanged={state.reload} />
                ) : (
                  <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
                    {user?.role === "studio"
                      ? "Studio account mode: Acquisitions are enabled for customer accounts."
                      : "Please sign in as a customer to purchase this artwork."}
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
