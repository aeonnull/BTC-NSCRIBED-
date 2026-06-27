import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { XLogo } from "../lib/icons";

export default function Header() {
  const navigate = useNavigate();
  const { user, login, logout } = useAuth();

  return (
    <header className="bar">
      <div className="bar-in">
        <div className="brand" data-testid="brand-home" onClick={() => navigate("/")} tabIndex={0} role="button" onKeyDown={(e) => e.key === "Enter" && navigate("/")}>
          <span className="mark">nscribed<img className="splat" src="/splat.png" alt="" /></span>
          <span className="by">// by blockheads</span>
        </div>
        <nav className="top">
          <a className="lnk ghost-only" href="https://x.com/nscribed" target="_blank" rel="noreferrer" data-testid="nav-support">Support</a>
          {user ? (
            <>
              <span className="lnk ghost-only" data-testid="nav-edit" onClick={() => navigate("/edit")}>Edit profile</span>
              <span className="lnk ghost-only" data-testid="nav-access" onClick={() => navigate("/access")}>Get access</span>
              <span className="lnk" data-testid="nav-myprofile" onClick={() => navigate(`/${user.handle}`)}>@{user.handle}</span>
              <span className="lnk" data-testid="nav-logout" onClick={() => { logout(); navigate("/"); }}>Log out</span>
              <div className="avatar-mini" style={user.avatar ? { backgroundImage: `url("${user.avatar}")` } : { background: "var(--bg-2)" }} onClick={() => navigate("/edit")} />
            </>
          ) : (
            <button className="join" data-testid="nav-join" onClick={login}><XLogo /> Join with X</button>
          )}
        </nav>
      </div>
    </header>
  );
}
