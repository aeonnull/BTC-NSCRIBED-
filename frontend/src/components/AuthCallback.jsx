import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth";

export default function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setAuthToken } = useAuth();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const token = params.get("token");
    if (!token) {
      navigate("/?auth=error");
      return;
    }
    setAuthToken(token).then(() => navigate("/edit"));
  }, [params, navigate, setAuthToken]);

  return (
    <div className="wrap">
      <div className="login-wrap" data-testid="auth-callback">
        <p>Authenticating with X…</p>
      </div>
    </div>
  );
}
