import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Verified } from "../lib/icons";
import { useAuth } from "../auth";
import { DiscoverTile } from "./DiscoverTile";

function Thumb({ src, className }) {
  return (
    <div className={className} style={src ? { backgroundImage: `url("${src}")` } : { background: "var(--bg-2)" }} />
  );
}

function PersonTile({ p, onClick }) {
  return (
    <div className={`person ${p.type}`} data-testid={`person-${p.handle}`} onClick={onClick} tabIndex={0} role="button" onKeyDown={(e) => e.key === "Enter" && onClick()}>
      <Thumb src={p.avatar} className="pa" />
      <div className="pi">
        <div className="pname">{p.name}{p.verified && <Verified />}</div>
        <div className="prow">
          <span className="phandle">@{p.handle}</span>
          <span className="prole" data-testid={`role-${p.handle}`}>{p.type}</span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [artists, setArtists] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [recent, setRecent] = useState([]);
  const [top, setTop] = useState([]);

  useEffect(() => {
    api.get("/profiles").then(({ data }) => {
      setArtists(data.artists || []);
      setCollectors(data.collectors || []);
    });
    api.get("/recent?limit=8").then(({ data }) => setRecent(data.works || []));
    api.get("/top?limit=8").then(({ data }) => setTop(data.works || []));
  }, []);

  const pad = (n) => String(n).padStart(2, "0");

  return (
    <section className="view" data-testid="view-home">
      <div className="wrap">
        <div className="hero">
          <span className="eyebrow"><span className="slash">//</span> nscribed — by blockheads</span>
          <h1>One link for all your <em>digital art</em>.</h1>
          <p className="sub">Whether you create it or collect it — show your digital art in one place, then drop a single clean link in your X bio.</p>
          <div className="req"><span className="dot"></span> the only thing we require is your <b>X account</b> — everything else is yours to choose</div>
          {!user && (
            <div style={{ marginTop: 24 }}>
              <button className="btn-primary" data-testid="hero-join" onClick={login}>Claim your profile with X</button>
            </div>
          )}
        </div>
      </div>

      <div className="wrap">
        {recent.length > 0 && (
          <div className="sec" data-testid="sec-recent">
            <div className="sec-head">
              <h2><span className="idx">✦</span> <span className="sec-tag fill">Latest drops</span></h2>
              <span className="count">freshly inscribed</span>
            </div>
            <div className="drops" data-testid="recent-row">
              {recent.map((w) => <DiscoverTile key={w.like_key} w={w} />)}
            </div>
          </div>
        )}

        {top.length > 0 && (
          <div className="sec" data-testid="sec-top">
            <div className="sec-head">
              <h2><span className="idx">₿</span> <span className="sec-tag inv">Trending now</span></h2>
              <span className="count">liked &amp; fresh</span>
            </div>
            <div className="drops" data-testid="top-row">
              {top.map((w) => <DiscoverTile key={w.like_key} w={w} />)}
            </div>
          </div>
        )}
      </div>

      <div className="wrap">
        <div className="sec">
          <div className="sec-head">
            <h2><span className="idx">01</span> <span className="sec-tag fill">Artists</span></h2>
            <span className="count">{pad(artists.length)} profiles</span>
          </div>
          {artists.length ? (
            <div className="people" data-testid="artists-row">
              {artists.map((p) => <PersonTile key={p.handle} p={p} onClick={() => navigate(`/${p.handle}`)} />)}
            </div>
          ) : <div className="empty-note">No artists yet — be the first to inscribe.</div>}
        </div>

        <div className="sec">
          <div className="sec-head">
            <h2><span className="idx">02</span> <span className="sec-tag inv">Collectors</span></h2>
            <span className="count">{pad(collectors.length)} profiles</span>
          </div>
          {collectors.length ? (
            <div className="people" data-testid="collectors-row">
              {collectors.map((p) => <PersonTile key={p.handle} p={p} onClick={() => navigate(`/${p.handle}`)} />)}
            </div>
          ) : <div className="empty-note">No collectors yet.</div>}
        </div>
      </div>
    </section>
  );
}
