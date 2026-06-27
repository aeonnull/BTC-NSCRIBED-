import { createContext, useContext, useEffect, useState } from "react";
import { api, getToken, setToken, clearToken, twitterLoginUrl } from "./api";

const AuthContext = createContext(null);

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

  const login = () => { window.location.href = twitterLoginUrl; };
  const logout = () => { clearToken(); setUser(null); };
  const setAuthToken = (t) => { setToken(t); return refresh(); };

  return (
    <AuthContext.Provider value={{ user, ready, login, logout, refresh, setAuthToken, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
