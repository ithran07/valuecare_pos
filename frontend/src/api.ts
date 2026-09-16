import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8001/api",
});

let refreshRequest: Promise<string> | null = null;

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(undefined, async (error) => {
  const original = error.config;
  const refreshToken = localStorage.getItem("refresh_token");

  if (error.response?.status !== 401 || !refreshToken || original?._retry) {
    return Promise.reject(error);
  }

  original._retry = true;
  refreshRequest ??= axios.post<{ access: string }>(
    `${api.defaults.baseURL}/auth/token/refresh/`,
    { refresh: refreshToken },
  ).then((response) => response.data.access).finally(() => {
    refreshRequest = null;
  });

  try {
    const accessToken = await refreshRequest;
    localStorage.setItem("access_token", accessToken);
    original.headers.Authorization = `Bearer ${accessToken}`;
    return api(original);
  } catch (refreshError) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    if (window.location.pathname !== "/login") window.location.assign("/login");
    return Promise.reject(refreshError);
  }
});
