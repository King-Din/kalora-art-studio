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
      <p><Link to="/">← Gallery</Link></p>
      <AsyncState state={state}>
        {({ painting: p }) => (
          <article className="detail">
            <Img src={p.imageUrl} alt={p.title} />
            <div>
              <h1>{p.title}</h1>
              <p className="muted">{p.artist} · {p.style}</p>
              <p className="prewrap">{p.description}</p>
              <p><strong>{money(p.price)}</strong> <Badge status={p.status === "sold" ? "sold" : "available"} /></p>
              {user?.role === "customer" && <BuyButton painting={p} onChanged={state.reload} />}
            </div>
          </article>
        )}
      </AsyncState>
    </div>
  );
}
