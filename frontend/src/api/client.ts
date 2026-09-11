import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // sends the HttpOnly refresh cookie automatically
});

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// On a 401, the access token has expired. Try one silent refresh against the
// cookie before giving up, so the user isn't logged out every 15 minutes.
let refreshing: Promise<string | null> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (!refreshing) {
        refreshing = api
          .post("/auth/refresh")
          .then((r) => {
            setAccessToken(r.data.accessToken);
            return r.data.accessToken as string;
          })
          .catch(() => {
            setAccessToken(null);
            window.location.href = "/login";
            return null;
          })
          .finally(() => {
            refreshing = null;
          });
      }
      const newToken = await refreshing;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);
