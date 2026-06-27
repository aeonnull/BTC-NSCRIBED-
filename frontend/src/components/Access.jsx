import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { XLogo } from "../lib/icons";

export default function Access() {
  const { user, ready, login } = useAuth();
  const [params] = useSearchParams();
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const result = params.get("holder");

  useEffect(() => {
    if (ready && user) {
      api.get("/holder/status").then(({ data }) => setStatus(data)).catch(() => {});
    }
  }, [ready, user]);

  useEffect(() => {
    if (result === "ok") setMsg("✓ Verified — you're in.");
    else if (result === "failed") setMsg("We couldn't confirm a matching Ordinal in that wallet.");
    else if (result === "error") setMsg("Verification link was invalid or expired. Try again.");
  }, [result]);

  const start = async () => {
    setBusy(true);
    setMsg("");
    try {
      const { data } = await api.post("/holder/start");
      window.location.href = data.redirect_url;
    } catch (e) {
      if (e?.response?.status === 503) {
        setMsg("Holder verification isn't connected yet — coming soon.");
      } else {
        setMsg("Something went wrong. Please try again.");
      }
      setBusy(false);
    }
  };

  if (ready && !user) {
    return (
      <div className="wrap">
        <div className="login-wrap">
          <h1>Get access</h1>
          <p>First, sign in with your X account. Then you'll prove you hold the required Ordinal — no wallet needed inside nscribed, we hand you to the holder-verification app and bring you back.</p>
          <button className="x-btn" data-testid="access-login" onClick={login}><XLogo /> Sign in with X</button>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="editor view" data-testid="access-page" style={{ maxWidth: 620 }}>
        <h1>Get access</h1>
        <p className="lead">@{user?.handle} · holder verification</p>

        <ol className="steps">
          <li className="done"><span className="step-n">1</span> Signed in with X ✓</li>
          <li className={status?.holder ? "done" : "active"}>
            <span className="step-n">2</span> Prove you hold the required Ordinal
          </li>
          <li className={status?.holder ? "active" : ""}>
            <span className="step-n">3</span> Access unlocked
          </li>
        </ol>

        {status?.holder ? (
          <div className="access-card ok" data-testid="holder-ok">
            <div className="access-title">✓ You're a verified holder</div>
            <div className="access-sub">Access is unlocked. {status.holder_verified_at && `Verified ${new Date(status.holder_verified_at).toLocaleDateString()}.`}</div>
          </div>
        ) : (
          <div className="access-card">
            <div className="access-title">Verify your Ordinal holding</div>
            <div className="access-sub">You'll be taken to the holder-verification app to connect your wallet (Xverse, Leather or Unisat) and sign a message. No transaction, no wallet stored here. Then you're sent back automatically.</div>
            <button className="x-btn" data-testid="verify-holder" disabled={busy} onClick={start} style={{ marginTop: 16 }}>
              {busy ? "Opening verifier…" : "Verify holder status"}
            </button>
            {status && !status.configured && (
              <div className="hint" data-testid="not-configured">Note: the verification app isn't connected yet — this button will be live once it's linked.</div>
            )}
          </div>
        )}

        {msg && <div className="saved-flash" data-testid="access-msg" style={{ marginTop: 16, display: "block" }}>{msg}</div>}
      </div>
    </div>
  );
}
