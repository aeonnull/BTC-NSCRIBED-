import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { artURI, buildWorks } from "../lib/art";

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

  const works = buildWorks(p.id, c);
  const isCollector = p.type === "collector";
  const pad = (n) => String(n).padStart(2, "0");

  return (
    <section className="view" data-testid="view-collection">
      <div className="wrap">
        <span className="back" data-testid="back-profile" onClick={() => navigate(`/u/${handle}`)}>&larr; Back to profile</span>
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
                  {c.marketplace_name || "View"} &#8599;
                </a>
              ) : (
                <span className="v" style={{ color: "var(--muted)" }}>—</span>
              )}
            </div>
          </div>
        </div>

        <div className="sec" style={{ paddingTop: 34 }}>
          <div className="sec-head">
            <h2><span className="idx">//</span> Pieces</h2>
            <span className="count">{pad(works.length)} total</span>
          </div>
          <div className="works" data-testid="works-grid">
            {works.map((w, i) => {
              const uri = artURI(w.seed);
              return (
                <div
                  key={i}
                  className="work"
                  data-testid={`work-${i}`}
                  tabIndex={0}
                  role="button"
                  onClick={() => setLb({ uri, w })}
                  onKeyDown={(e) => e.key === "Enter" && setLb({ uri, w })}
                >
                  <div className="wa" style={{ backgroundImage: `url("${uri}")` }} />
                  <div className="wc">
                    <div className="wt">{w.title}</div>
                    <div className="wm">{w.chain} · {w.year}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {lb && (
        <div className="lb" data-testid="lightbox" onClick={(e) => e.target.classList.contains("lb") && setLb(null)}>
          <div className="lb-card">
            <div className="lb-art" style={{ backgroundImage: `url("${lb.uri}")` }} />
            <div className="lb-info">
              <div>
                <div className="lb-title">{lb.w.title}</div>
                <div className="lb-mani">
                  <div className="kv"><span className="k">Collection</span><span className="dots"></span><span className="v">{c.name}</span></div>
                  <div className="kv"><span className="k">Chain</span><span className="dots"></span><span className="v">{lb.w.chain}</span></div>
                  <div className="kv"><span className="k">Year</span><span className="dots"></span><span className="v">{lb.w.year}</span></div>
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
