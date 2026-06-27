import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { Verified, XLogo } from "../lib/icons";

function Thumb({ src, className }) {
  return <div className={className} style={src ? { backgroundImage: `url("${src}")` } : { background: "var(--bg-2)" }} />;
}

export default function Profile() {
  const { handle } = useParams();
  const navigate = useNavigate();
  const [p, setP] = useState(null);
  const [err, setErr] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setP(null);
    setErr(false);
    api.get(`/profiles/${handle}`).then(({ data }) => setP(data)).catch(() => setErr(true));
  }, [handle]);

  const copyLink = () => {
    navigator.clipboard?.writeText(`${window.location.origin}/${handle}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (err) return <div className="wrap"><div className="empty-note" data-testid="profile-notfound">Profile not found.</div></div>;
  if (!p) return <div className="wrap"><div className="empty-note">Loading…</div></div>;

  const pad = (n) => String(n).padStart(2, "0");
  const labelWord = p.type === "artist" ? "Works" : "Collection";

  return (
    <section className="view" data-testid="view-profile">
      <div className="wrap">
        <span className="back" data-testid="back-index" onClick={() => navigate("/")}>&larr; Index</span>
        <div className="profile">
          <Thumb src={p.avatar} className="pf-avatar" />
          <div className="pf-meta">
            <div className="pf-type">{p.type}</div>
            <div className="pf-name" data-testid="profile-name">{p.name}{p.verified && <Verified size={26} />}</div>
            <a className="pf-handle" href={`https://x.com/${p.handle}`} target="_blank" rel="noreferrer" data-testid="profile-x-link">
              <XLogo style={{ width: 15, height: 15, fill: "var(--cream)" }} /> @{p.handle}
            </a>
            <p className="pf-bio">{p.bio}</p>

            <div className="links">
              <button className="chip" data-testid="copy-profile-link" onClick={copyLink}>
                {copied ? "Copied ✓" : "Copy profile link"}<span className="ar">⧉</span>
              </button>
            </div>

            {p.links?.length > 0 && (
              <>
                <div className="subhead">Links</div>
                <div className="links">
                  {p.links.map((l, i) => (
                    <a key={i} className="chip" href={l.url} target="_blank" rel="noreferrer" data-testid={`profile-link-${i}`}>
                      {l.label}<span className="ar">&#8599;</span>
                    </a>
                  ))}
                </div>
              </>
            )}

            {p.marketplaces?.length > 0 && (
              <>
                <div className="subhead">Marketplaces</div>
                <div className="links" data-testid="profile-marketplaces">
                  {p.marketplaces.map((m, i) => (
                    <a key={i} className="chip mkt" href={m.url} target="_blank" rel="noreferrer" data-testid={`marketplace-${i}`}>
                      {m.name}<span className="ar">&#8599;</span>
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="sec">
          <div className="sec-head">
            <h2><span className="idx">//</span> {labelWord}</h2>
            <span className="count">{pad(p.collections.length)} sets</span>
          </div>
          {p.collections.length ? (
            <div className="cards" data-testid="profile-cards">
              {p.collections.map((c) => (
                <div key={c.id} className="card" data-testid={`collection-card-${c.id}`}
                  onClick={() => navigate(`/${p.handle}/c/${c.id}`)} tabIndex={0} role="button"
                  onKeyDown={(e) => e.key === "Enter" && navigate(`/${p.handle}/c/${c.id}`)}>
                  <Thumb src={c.works?.[0]?.image} className="ca" />
                  <div className="ci">
                    <div className="cname">{c.name}</div>
                    <div className="cmeta">
                      <span><b>{c.chain}</b></span><span><b>{c.year}</b></span><span>{(c.works || []).length} pcs</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="empty-note">No collections yet.</div>}
        </div>
      </div>
    </section>
  );
}
