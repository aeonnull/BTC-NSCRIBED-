import { useLocation } from "react-router-dom";
import { useAuth } from "../auth";
import { XLogo } from "../lib/icons";

export default function Gate({ children }) {
  const { user, ready, login, hasPendingWalletLink } = useAuth();
  const { pathname } = useLocation();

  // The X OAuth callback must run even before a session exists.
  if (pathname === "/auth/callback") return children;

  if (!ready) {
    return <div className="wrap"><div className="empty-note">Loading…</div></div>;
  }

  if (!user) {
    const pending = hasPendingWalletLink();
    return (
      <div className="wrap">
        <div className="login-wrap" data-testid="view-gate">
          <h1>Sign in with X to enter</h1>
          <p>nscribed is an X-only space. Sign in with your X account to explore artists,
            collectors and their work. Creating your own profile also requires a verified
            Blockheads wallet.</p>
          {pending && (
            <div className="access-card ok" data-testid="pending-wallet-link" style={{ margin: "18px 0", maxWidth: 480 }}>
              <div className="access-title">✓ Blockheads holding verified</div>
              <div className="access-sub">Sign in with X to finish linking it to your nscribed account.</div>
            </div>
          )}
          <button className="x-btn" data-testid="gate-login" onClick={login}><XLogo /> Sign in with X</button>
        </div>
      </div>
    );
  }

  return children;
}
