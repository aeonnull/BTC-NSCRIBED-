import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, uploadImage } from "../api";
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
  const [busy, setBusy] = useState("");
  const [copied, setCopied] = useState(false);
  const avatarRef = useRef();

  useEffect(() => {
    if (ready && user) {
      setForm({
        name: user.name || "",
        type: user.type || "artist",
        bio: user.bio || "",
        avatar: user.avatar || "",
        links: user.links || [],
        marketplaces: user.marketplaces || [],
        collections: (user.collections || []).map((c) => ({ ...c, works: c.works || [] })),
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
  const updItem = (key, i, field, v) => setForm((f) => { const arr = [...f[key]]; arr[i] = { ...arr[i], [field]: v }; return { ...f, [key]: arr }; });
  const addItem = (key, blank) => setForm((f) => ({ ...f, [key]: [...f[key], blank] }));
  const delItem = (key, i) => setForm((f) => ({ ...f, [key]: f[key].filter((_, idx) => idx !== i) }));

  const onAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy("avatar");
    try { const url = await uploadImage(file); set("avatar", url); } finally { setBusy(""); }
  };

  const updWork = (ci, wi, field, v) => setForm((f) => {
    const cols = [...f.collections];
    const works = [...(cols[ci].works || [])];
    works[wi] = { ...works[wi], [field]: v };
    cols[ci] = { ...cols[ci], works };
    return { ...f, collections: cols };
  });
  const delWork = (ci, wi) => setForm((f) => {
    const cols = [...f.collections];
    cols[ci] = { ...cols[ci], works: cols[ci].works.filter((_, idx) => idx !== wi) };
    return { ...f, collections: cols };
  });
  const addWork = async (ci, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(`work-${ci}`);
    try {
      const url = await uploadImage(file);
      setForm((f) => {
        const cols = [...f.collections];
        cols[ci] = { ...cols[ci], works: [...(cols[ci].works || []), { id: Math.random().toString(36).slice(2, 10), title: "", image: url }] };
        return { ...f, collections: cols };
      });
    } finally { setBusy(""); e.target.value = ""; }
  };

  const updCol = (i, field, v) => updItem("collections", i, field, v);
  const newCollection = () => ({ id: Math.random().toString(36).slice(2, 10), name: "New collection", chain: "Bitcoin", year: "2025", marketplace_name: "", marketplace_url: "", works: [] });

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put("/profiles/me", form);
      setUser(data);
      setFlash(true);
      setTimeout(() => setFlash(false), 2500);
    } finally { setSaving(false); }
  };

  const copyLink = () => {
    navigator.clipboard?.writeText(`${window.location.origin}/${user.handle}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="wrap">
      <div className="editor view" data-testid="editor">
        <h1>Edit your profile</h1>
        <p className="lead">@{user.handle} · signed in with X</p>

        <div className="link-box">
          <span className="link-box-url">{window.location.host}/{user.handle}</span>
          <button className="btn-ghost" data-testid="copy-link" onClick={copyLink}>{copied ? "Copied ✓" : "Copy link for X bio"}</button>
        </div>

        <div className="field">
          <label>Profile picture</label>
          <div className="avatar-edit">
            <div className="avatar-prev" style={form.avatar ? { backgroundImage: `url("${form.avatar}")` } : { background: "var(--bg-2)" }} />
            <div>
              <button className="add-btn" data-testid="change-avatar" disabled={busy === "avatar"} onClick={() => avatarRef.current?.click()}>{busy === "avatar" ? "Uploading…" : "Upload new picture"}</button>
              <input ref={avatarRef} type="file" accept="image/*" hidden onChange={onAvatar} data-testid="avatar-input" />
              <div className="hint">Comes from X by default. Upload to replace.</div>
            </div>
          </div>
        </div>

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
                <input className="inp" placeholder="Collection name" data-testid={`col-name-${i}`} value={c.name} onChange={(e) => updCol(i, "name", e.target.value)} />
                <button className="del-btn" data-testid={`col-del-${i}`} onClick={() => delItem("collections", i)}><Trash /></button>
              </div>
              <div className="grid2">
                <input className="inp" placeholder="Chain (e.g. Bitcoin)" data-testid={`col-chain-${i}`} value={c.chain} onChange={(e) => updCol(i, "chain", e.target.value)} />
                <input className="inp" placeholder="Year (e.g. 2025)" data-testid={`col-year-${i}`} value={c.year} onChange={(e) => updCol(i, "year", e.target.value)} />
                <input className="inp" placeholder="Marketplace name" data-testid={`col-mkt-name-${i}`} value={c.marketplace_name} onChange={(e) => updCol(i, "marketplace_name", e.target.value)} />
                <input className="inp" placeholder="Marketplace link (https://…)" data-testid={`col-mkt-url-${i}`} value={c.marketplace_url} onChange={(e) => updCol(i, "marketplace_url", e.target.value)} />
              </div>

              <div className="works-edit">
                {(c.works || []).map((w, wi) => (
                  <div className="work-edit" key={w.id || wi} data-testid={`work-edit-${i}-${wi}`}>
                    <div className="work-thumb" style={w.image ? { backgroundImage: `url("${w.image}")` } : { background: "var(--bg)" }} />
                    <input className="inp" placeholder="Title (optional)" data-testid={`work-title-${i}-${wi}`} value={w.title} onChange={(e) => updWork(i, wi, "title", e.target.value)} />
                    <button className="del-btn" data-testid={`work-del-${i}-${wi}`} onClick={() => delWork(i, wi)}><Trash /></button>
                  </div>
                ))}
                <label className="add-btn upload-art" data-testid={`add-work-${i}`}>
                  {busy === `work-${i}` ? "Uploading…" : "+ Add artwork"}
                  <input type="file" accept="image/*" hidden onChange={(e) => addWork(i, e)} />
                </label>
              </div>
            </div>
          ))}
          <button className="add-btn" data-testid="add-collection" onClick={() => addItem("collections", newCollection())}>+ Add collection</button>
        </div>

        <div className="save-bar">
          <button className="btn-primary" data-testid="save-profile" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save profile"}</button>
          <button className="btn-ghost" data-testid="view-public" onClick={() => navigate(`/${user.handle}`)}>View public page</button>
          {flash && <span className="saved-flash" data-testid="saved-flash">✓ Saved</span>}
        </div>
      </div>
    </div>
  );
}
