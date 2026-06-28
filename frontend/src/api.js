import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
export const API = `${BACKEND_URL}/api`;

const TOKEN_KEY = "nscribed_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const api = axios.create({ baseURL: API });
api.interceptors.request.use((config) => {
  const t = getToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export const twitterLoginUrl = `${API}/auth/twitter/login`;

export async function uploadImage(file) {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.post("/upload", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.url;
}

// ---------- Likes (open to all visitors; own likes tracked in the browser) ----------
const LIKES_KEY = "nscribed_likes";
const readLiked = () => {
  try { return JSON.parse(localStorage.getItem(LIKES_KEY)) || {}; } catch { return {}; }
};
export const hasLiked = (key) => !!readLiked()[key];

export async function toggleLike(key) {
  const liked = readLiked();
  const wasLiked = !!liked[key];
  const action = wasLiked ? "unlike" : "like";
  const { data } = await api.post("/likes", { key, action });
  if (wasLiked) delete liked[key]; else liked[key] = true;
  localStorage.setItem(LIKES_KEY, JSON.stringify(liked));
  return { count: data.count, liked: !wasLiked };
}

export async function fetchLikes(keys) {
  if (!keys.length) return {};
  const { data } = await api.get("/likes", { params: { keys: keys.join(",") } });
  return data.counts || {};
}
