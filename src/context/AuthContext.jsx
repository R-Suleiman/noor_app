import { createContext, useContext, useEffect, useState } from "react";
import { axiosClient } from "../lib/api"; 

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("noor_token");
    const stored = localStorage.getItem("noor_user");
    
    if (token && stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}

      axiosClient.get("/auth/me")
        .then((data) => {
          setUser(data.user);
          localStorage.setItem("noor_user", JSON.stringify(data.user));
        })
        .catch((error) => {
          localStorage.removeItem("noor_token");
          localStorage.removeItem("noor_user");
          setUser(null);
          console.error("Session verification failed:", error.message);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (identity, password) => {
    const data = await axiosClient.post("/auth/login", { identity, password });
    
    localStorage.setItem("noor_token", data.token);
    localStorage.setItem("noor_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async (fields) => {
    const data = await axiosClient.post("/auth/register", fields);
    
    localStorage.setItem("noor_token", data.token);
    localStorage.setItem("noor_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("noor_token");
    localStorage.removeItem("noor_user");
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}