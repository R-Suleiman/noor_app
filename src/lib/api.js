import axios from "axios";

const configuredApi = import.meta.env?.VITE_API_BASE_URL || import.meta.env?.API_BASE_URL || "http://localhost:3001";
export const API_ORIGIN = configuredApi.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
export const API = `${API_ORIGIN}/api/v1`;

export const mediaUrl = (value) => {
  if (!value) return "";
  if (/^(https?:|blob:|data:)/i.test(value)) return value;
  return `${API_ORIGIN}${value.startsWith("/") ? "" : "/"}${value}`;
};

export const GENRE_BG = { 
  QASIDAS: "bg-emerald-800", 
  NASHEEDS: "bg-violet-800", 
  DUFF: "bg-orange-800", 
  INSTRUMENTAL: "bg-amber-800", 
  MADRASSA: "bg-teal-800", 
  OTHER: "bg-zinc-700"  
};

export const trackBg = t => t.bg ?? GENRE_BG[t.genre] ?? "bg-zinc-700";
export const fmtDur = s => {
  if (isNaN(s) || s === null || s === undefined) return "0:00";
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
};
export const fmtNum = (value) => {
  const number = Number(value) || 0;
  const units = [
    { threshold: 1_000_000_000, suffix: "B" },
    { threshold: 1_000_000, suffix: "M" },
    { threshold: 1_000, suffix: "k" },
  ];
  const unit = units.find(({ threshold }) => Math.abs(number) >= threshold);
  if (!unit) return String(number);
  const shortened = number / unit.threshold;
  return `${Number(shortened.toFixed(shortened >= 100 ? 0 : 1))}${unit.suffix}`;
};

// ─── Exported Axios Instance ─────────────────────────────────────────────────
export const axiosClient = axios.create({
  baseURL: API,
  timeout: 20_000,
  headers: {
    Accept: "application/json",
  },
});

// Request Interceptor: Auto inject saved tokens
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("noor_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Clean unpacking and automated session cleanup
axiosClient.interceptors.response.use(
  (response) => {
    // Return the response object or data based on preference. 
    // Returning response.data makes calls much cleaner so you don't have to keep writing .data.data
    return response.data;
  },
  (error) => {
    if (axios.isCancel(error)) return Promise.reject(error);
    const status = error.response ? error.response.status : null;
    const errorMessage = error.response?.data?.error
      ?? (error.code === "ECONNABORTED" ? "The request took too long. Please try again." : "Could not reach Noor. Check your connection and try again.");

    if (status === 401) {
      console.warn("Session expired or token invalid.");
      localStorage.removeItem("noor_token");
      localStorage.removeItem("noor_user");
      
      if (window.location.pathname !== "/auth") {
        sessionStorage.setItem("noor_return_to", `${window.location.pathname}${window.location.search}`);
        window.location.assign("/auth");
      }
    }

    const normalized = new Error(errorMessage, { cause: error });
    normalized.status = status;
    normalized.code = error.code;
    normalized.details = error.response?.data;
    return Promise.reject(normalized);
  }
);
