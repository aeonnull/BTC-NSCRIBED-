import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { artURI } from "../lib/art";
import { Verified } from "../lib/icons";
import { useAuth } from "../auth";

function PersonTile({ p, onClick }) {
  return (
    <div
      className="person"
      data-testid={`person-${p.handle}`}
      onClick={onClick}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <div className="pa" style={{ backgroundImage: `url("${p.avatar || artURI(p.handle + "-av")}")` }} />
      <div className="pi">
        <div className="pname">{p.name}{p.verified && <Verified />}</div>
        <div className="phandle">@{p.handle}</div>
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [artists, setArtists] = useState([]);
  const [collectors, setCollectors] = useState([]);

  useEffect(() => {
    api.get("/profiles").then(({ data }) => {
      setArtists(data.artists || []);
      setCollectors(data.collectors || []);
    });
  }, []);

  const pad = (n) => String(n).padStart(2, "0");

  return (
    <section className="view" data-testid="view-home">
      <div className="wrap">
        <div className="hero">
          <span className="eyebrow"><span className="slash">//</span> nscribed — by blockheads</span>
          <h1>One link for everything you've <em>inscribed</em>.</h1>
          <p className="sub">A profile home for Ordinals artists and collectors. Show your work, your collections, your marketplaces — then drop one clean address in your X bio.</p>
          <div className="req"><span className="dot"></span> the only thing we require is your <b>X account</b> — everything else is yours to choose</div>
          {!user && (
            <div style={{ marginTop: 24 }}>
              <button className="btn-primary" data-testid="hero-join" onClick={login}>Claim your profile with X</button>
            </div>
          )}
        </div>
      </div>

      <div className="wrap">
        <div className="sec">
          <div className="sec-head">
            <h2><span className="idx">01</span> Artists</h2>
            <span className="count">{pad(artists.length)} profiles</span>
          </div>
          {artists.length ? (
            <div className="people" data-testid="artists-row">
              {artists.map((p) => <PersonTile key={p.handle} p={p} onClick={() => navigate(`/u/${p.handle}`)} />)}
            </div>
          ) : <div className="empty-note">No artists yet — be the first to inscribe.</div>}
        </div>

        <div className="sec">
          <div className="sec-head">
            <h2><span className="idx">02</span> Collectors</h2>
            <span className="count">{pad(collectors.length)} profiles</span>
          </div>
          {collectors.length ? (
            <div className="people" data-testid="collectors-row">
              {collectors.map((p) => <PersonTile key={p.handle} p={p} onClick={() => navigate(`/u/${p.handle}`)} />)}
            </div>
          ) : <div className="empty-note">No collectors yet.</div>}
        </div>
      </div>
    </section>
  );
}
