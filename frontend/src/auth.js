import { createContext, useContext, useEffect, useState } from "react";
import { api, getToken, setToken, clearToken, twitterLoginUrl } from "./api";

const AuthContext = createContext(null);

// Blockheads holder handoff: blockheadsbtc.xyz sends verified holders here as
// `?bh_token=<address>:<exp>.<hmac>`. Stash it until the user is signed in with X
// (they may already be, or may still need to sign in), then link it server-side.
const BH_TOKEN_KEY = "nscribed_bh_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  const refresh = async () => {
    if (!getToken()) {
      setUser(null);
      setReady(true);
      return null;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
      setReady(true);
      return data;
    } catch {
      clearToken();
      setUser(null);
      setReady(true);
      return null;
    }
  };

  useEffect(() => { refresh(); }, []);

  // Pick up a bh_token from the URL on first load, on whichever page it lands, and
  // strip it out of the visible URL/history right away.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("bh_token");
    if (!token) return;
    sessionStorage.setItem(BH_TOKEN_KEY, token);
    params.delete("bh_token");
    const rest = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : ""));
  }, []);

  // Once we know who's signed in, consume any pending bh_token and attach holder
  // status to that account.
  useEffect(() => {
    if (!ready || !user) return;
    const token = sessionStorage.getItem(BH_TOKEN_KEY);
    if (!token) return;
    sessionStorage.removeItem(BH_TOKEN_KEY);
    api.post("/holder/link-wallet", { token })
      .then(({ data }) => setUser(data))
      .catch(() => {});
  }, [ready, user]);

  const login = () => { window.location.href = twitterLoginUrl; };
  const logout = () => { clearToken(); setUser(null); };
  const setAuthToken = (t) => { setToken(t); return refresh(); };
  const hasPendingWalletLink = () => !!sessionStorage.getItem(BH_TOKEN_KEY);

  return (
    <AuthContext.Provider value={{ user, ready, login, logout, refresh, setAuthToken, setUser, hasPendingWalletLink }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
