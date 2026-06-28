import { useNavigate } from "react-router-dom";
import { Verified } from "../lib/icons";
import { LikeButton } from "./LikeButton";

export function DiscoverTile({ w }) {
  const navigate = useNavigate();
  const go = () => navigate(`/${w.handle}/c/${w.cid}`);
  return (
    <div className={`drop ${w.type}`} data-testid={`drop-${w.like_key}`}
      onClick={go} tabIndex={0} role="button"
      onKeyDown={(e) => e.key === "Enter" && go()}>
      <div className="drop-art"
        style={w.image ? { backgroundImage: `url("${w.image}")` } : { background: "var(--bg-2)" }}>
        <LikeButton likeKey={w.like_key} initialCount={w.likes || 0} className="drop-like" />
      </div>
      <div className="drop-info">
        <div className="drop-title">{w.title || "Untitled"}</div>
        <div className="drop-row">
          <span className="drop-handle">@{w.handle}{w.verified && <Verified size={12} />}</span>
          <span className="drop-role">{w.type}</span>
        </div>
      </div>
    </div>
  );
}
