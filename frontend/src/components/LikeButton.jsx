import { useEffect, useState } from "react";
import { hasLiked, toggleLike } from "../api";

export function LikeButton({ likeKey, initialCount = 0, className = "" }) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(() => hasLiked(likeKey));
  const [busy, setBusy] = useState(false);

  useEffect(() => { setCount(initialCount); }, [initialCount]);

  const onClick = async (e) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      const res = await toggleLike(likeKey);
      setCount(res.count);
      setLiked(res.liked);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      className={`like-btn ${liked ? "liked" : ""} ${className}`}
      onClick={onClick}
      data-testid={`like-${likeKey}`}
      aria-label={liked ? "Remove appreciation" : "Appreciate this piece"}
      title="Appreciate"
    >
      <span className="btc-coin">₿</span>
      <span className="like-count" data-testid={`like-count-${likeKey}`}>{count}</span>
    </button>
  );
}
