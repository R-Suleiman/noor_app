import axios from "axios";

export const API = "http://localhost:3001/api/v1";

export const GENRE_BG = { 
  QASIDAS: "bg-emerald-800", 
  NASHEEDS: "bg-violet-800", 
  DUFF: "bg-orange-800", 
  INSTRUMENTAL: "bg-amber-800", 
  MADRASSA: "bg-teal-800", 
  OTHER: "bg-zinc-700"  
};

export const trackBg = t => t.bg ?? GENRE_BG[t.genre] ?? "bg-zinc-700";
export const fmtDur = s => `${Math.floor(s/60)}:${String(s%60).padStart(2, "0")}`;
export const fmtNum = n => n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(n ?? 0);

// ─── Exported Axios Instance ─────────────────────────────────────────────────
export const axiosClient = axios.create({
  baseURL: API,
  headers: {
    "Content-Type": "application/json",
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
    const status = error.response ? error.response.status : null;
    const errorMessage = error.response?.data?.error ?? "Request execution failed";

    if (status === 401) {
      console.warn("Session expired or token invalid.");
      localStorage.removeItem("noor_token");
      localStorage.removeItem("noor_user");
      
      if (!window.location.pathname.includes("/login") && !window.location.pathname.includes("/register")) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(new Error(errorMessage));
  }
);