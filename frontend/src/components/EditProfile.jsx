import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { XLogo } from "../lib/icons";

const Trash = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
);

export default function EditProfile() {
  const navigate = useNavigate();
  const { user, ready, login, setUser } = useAuth();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (ready && user) {
      setForm({
        name: user.name || "",
        type: user.type || "artist",
        bio: user.bio || "",
        links: user.links || [],
        marketplaces: user.marketplaces || [],
        collections: user.collections || [],
      });
    }
  }, [ready, user]);

  if (ready && !user) {
    return (
      <div className="wrap">
        <div className="login-wrap">
          <h1>Claim your inscribed profile</h1>
          <p>Sign in with your X account to create and edit your profile. Your @handle, name and picture come straight from X — everything else is yours to choose.</p>
          <button className="x-btn" data-testid="login-with-x" onClick={login}><XLogo /> Sign in with X</button>
        </div>
      </div>
    );
  }
  if (!form) return <div className="wrap"><div className="empty-note">Loading…</div></div>;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const updItem = (key, i, field, v) =>
    setForm((f) => {
      const arr = [...f[key]];
      arr[i] = { ...arr[i], [field]: v };
      return { ...f, [key]: arr };
    });
  const addItem = (key, blank) => setForm((f) => ({ ...f, [key]: [...f[key], blank] }));
  const delItem = (key, i) => setForm((f) => ({ ...f, [key]: f[key].filter((_, idx) => idx !== i) }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        collections: form.collections.map((c) => ({
          ...c,
          pieces: Math.max(0, Math.min(60, parseInt(c.pieces, 10) || 0)),
        })),
      };
      const { data } = await api.put("/profiles/me", payload);
      setUser(data);
      setFlash(true);
      setTimeout(() => setFlash(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const newCollection = () => ({
    id: Math.random().toString(36).slice(2, 10),
    name: "New collection",
    chain: "Bitcoin",
    year: "2025",
    pieces: 6,
    marketplace_name: "",
    marketplace_url: "",
  });

  return (
    <div className="wrap">
      <div className="editor view" data-testid="editor">
        <h1>Edit your profile</h1>
        <p className="lead">@{user.handle} · signed in with X</p>

        <div className="field">
          <label>Display name</label>
          <input className="inp" data-testid="edit-name" value={form.name} onChange={(e) => set("name", e.target.value)} />
        </div>

        <div className="field">
          <label>I am a…</label>
          <div className="seg">
            <button className={form.type === "artist" ? "on" : ""} data-testid="type-artist" onClick={() => set("type", "artist")}>Artist</button>
            <button className={form.type === "collector" ? "on" : ""} data-testid="type-collector" onClick={() => set("type", "collector")}>Collector</button>
          </div>
        </div>

        <div className="field">
          <label>Bio</label>
          <textarea className="inp" data-testid="edit-bio" value={form.bio} onChange={(e) => set("bio", e.target.value)} />
        </div>

        <div className="field">
          <label>Links</label>
          {form.links.map((l, i) => (
            <div className="row-pair" key={i}>
              <input className="inp" placeholder="Label (e.g. Website)" data-testid={`link-label-${i}`} value={l.label} onChange={(e) => updItem("links", i, "label", e.target.value)} />
              <input className="inp" placeholder="https://…" data-testid={`link-url-${i}`} value={l.url} onChange={(e) => updItem("links", i, "url", e.target.value)} />
              <button className="del-btn" data-testid={`link-del-${i}`} onClick={() => delItem("links", i)}><Trash /></button>
            </div>
          ))}
          <button className="add-btn" data-testid="add-link" onClick={() => addItem("links", { label: "", url: "" })}>+ Add link</button>
        </div>

        <div className="field">
          <label>Marketplaces</label>
          {form.marketplaces.map((m, i) => (
            <div className="row-pair" key={i}>
              <input className="inp" placeholder="Marketplace name (e.g. OpenSea)" data-testid={`mkt-name-${i}`} value={m.name} onChange={(e) => updItem("marketplaces", i, "name", e.target.value)} />
              <input className="inp" placeholder="https://…" data-testid={`mkt-url-${i}`} value={m.url} onChange={(e) => updItem("marketplaces", i, "url", e.target.value)} />
              <button className="del-btn" data-testid={`mkt-del-${i}`} onClick={() => delItem("marketplaces", i)}><Trash /></button>
            </div>
          ))}
          <button className="add-btn" data-testid="add-marketplace" onClick={() => addItem("marketplaces", { name: "", url: "" })}>+ Add marketplace</button>
        </div>

        <div className="field">
          <label>Collections</label>
          {form.collections.map((c, i) => (
            <div className="col-edit" key={c.id} data-testid={`col-edit-${i}`}>
              <div className="row-pair">
                <input className="inp" placeholder="Collection name" data-testid={`col-name-${i}`} value={c.name} onChange={(e) => updItem("collections", i, "name", e.target.value)} />
                <button className="del-btn" data-testid={`col-del-${i}`} onClick={() => delItem("collections", i)}><Trash /></button>
              </div>
              <div className="grid2">
                <input className="inp" placeholder="Chain (e.g. Bitcoin)" data-testid={`col-chain-${i}`} value={c.chain} onChange={(e) => updItem("collections", i, "chain", e.target.value)} />
                <input className="inp" placeholder="Year (e.g. 2025)" data-testid={`col-year-${i}`} value={c.year} onChange={(e) => updItem("collections", i, "year", e.target.value)} />
                <input className="inp" type="number" min="0" max="60" placeholder="Pieces" data-testid={`col-pieces-${i}`} value={c.pieces} onChange={(e) => updItem("collections", i, "pieces", e.target.value)} />
                <input className="inp" placeholder="Marketplace name" data-testid={`col-mkt-name-${i}`} value={c.marketplace_name} onChange={(e) => updItem("collections", i, "marketplace_name", e.target.value)} />
              </div>
              <div style={{ marginTop: 10 }}>
                <input className="inp" placeholder="Marketplace link (https://…)" data-testid={`col-mkt-url-${i}`} value={c.marketplace_url} onChange={(e) => updItem("collections", i, "marketplace_url", e.target.value)} />
              </div>
            </div>
          ))}
          <button className="add-btn" data-testid="add-collection" onClick={() => addItem("collections", newCollection())}>+ Add collection</button>
        </div>

        <div className="save-bar">
          <button className="btn-primary" data-testid="save-profile" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save profile"}</button>
          <button className="btn-ghost" data-testid="view-public" onClick={() => navigate(`/u/${user.handle}`)}>View public page</button>
          {flash && <span className="saved-flash" data-testid="saved-flash">✓ Saved</span>}
        </div>
      </div>
    </div>
  );
}
