import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { marketLabel } from "../lib/marketplace";

function Thumb({ src, className, onClick, ...rest }) {
  return <div className={className} onClick={onClick} style={src ? { backgroundImage: `url("${src}")` } : { background: "var(--bg-2)" }} {...rest} />;
}

export default function Collection() {
  const { handle, cid } = useParams();
  const navigate = useNavigate();
  const [p, setP] = useState(null);
  const [lb, setLb] = useState(null);

  useEffect(() => {
    api.get(`/profiles/${handle}`).then(({ data }) => setP(data)).catch(() => setP(false));
  }, [handle]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setLb(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  if (p === false) return <div className="wrap"><div className="empty-note">Profile not found.</div></div>;
  if (!p) return <div className="wrap"><div className="empty-note">Loading…</div></div>;

  const c = p.collections.find((x) => x.id === cid);
  if (!c) return <div className="wrap"><div className="empty-note">Collection not found.</div></div>;

  const works = c.works || [];
  const isCollector = p.type === "collector";
  const pad = (n) => String(n).padStart(2, "0");

  return (
    <section className="view" data-testid="view-collection">
      <div className="wrap">
        <span className="back" data-testid="back-profile" onClick={() => navigate(`/${handle}`)}>&larr; Back to profile</span>
        <div className="col-head">
          <div className="col-title" data-testid="collection-title">{c.name}</div>
          <div className="manifest">
            {isCollector ? (
              <div className="kv"><span className="k">Held by</span><span className="dots"></span><span className="v">@{p.handle}</span></div>
            ) : (
              <div className="kv"><span className="k">Artist</span><span className="dots"></span><span className="v">{p.name}</span></div>
            )}
            <div className="kv"><span className="k">Chain</span><span className="dots"></span><span className="v">{c.chain}</span></div>
            <div className="kv"><span className="k">Year</span><span className="dots"></span><span className="v">{c.year}</span></div>
            <div className="kv"><span className="k">Pieces</span><span className="dots"></span><span className="v">{pad(works.length)}</span></div>
            <div className="kv">
              <span className="k">Marketplace</span><span className="dots"></span>
              {c.marketplace_url ? (
                <a className="v mk" href={c.marketplace_url} target="_blank" rel="noreferrer" data-testid="collection-marketplace">
                  {marketLabel(c.marketplace_url, c.marketplace_name)} &#8599;
                </a>
              ) : (<span className="v" style={{ color: "var(--muted)" }}>—</span>)}
            </div>
          </div>
        </div>

        <div className="sec" style={{ paddingTop: 34 }}>
          <div className="sec-head">
            <h2><span className="idx">//</span> Pieces</h2>
            <span className="count">{pad(works.length)} total</span>
          </div>
          {works.length ? (
            <div className="works" data-testid="works-grid">
              {works.map((w, i) => (
                <div key={w.id || i} className="work" data-testid={`work-${i}`} tabIndex={0} role="button"
                  onClick={() => setLb(w)} onKeyDown={(e) => e.key === "Enter" && setLb(w)}>
                  <Thumb src={w.image} className="wa" />
                  <div className="wc">
                    <div className="wt">{w.title || "Untitled"}</div>
                    <div className="wm">{c.chain} · {c.year}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="empty-note">No pieces uploaded yet.</div>}
        </div>
      </div>

      {lb && (
        <div className="lb" data-testid="lightbox" onClick={(e) => e.target.classList.contains("lb") && setLb(null)}>
          <div className="lb-card">
            <Thumb src={lb.image} className="lb-art" />
            <div className="lb-info">
              <div>
                <div className="lb-title">{lb.title || "Untitled"}</div>
                <div className="lb-mani">
                  <div className="kv"><span className="k">Collection</span><span className="dots"></span><span className="v">{c.name}</span></div>
                  <div className="kv"><span className="k">Chain</span><span className="dots"></span><span className="v">{c.chain}</span></div>
                  <div className="kv"><span className="k">Year</span><span className="dots"></span><span className="v">{c.year}</span></div>
                </div>
              </div>
              <button className="lb-close" data-testid="lightbox-close" onClick={() => setLb(null)} aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
