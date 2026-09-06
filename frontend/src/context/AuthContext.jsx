import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState(null);
  const [loading, setLoading] = useState(true);

  const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
    withCredentials: true,
  });

  // Add access token to every request
  api.interceptors.request.use((config) => {
    const accessToken = localStorage.getItem("access_token");

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  });

  const login = async (email, password) => {
    const response = await api.post("/auth/login", {
      email,
      password,
    });

    const accessToken = response.data.access_token;
    const refreshToken = response.data.refresh_token;

    // Save tokens
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("refreshToken", refreshToken);

    setTokens({
      accessToken,
      refreshToken,
    });

    // Get logged-in user
    const userResponse = await api.get("/auth/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    setUser(userResponse.data);

    return userResponse.data;
  };

  const register = async (email, password, name) => {
    // Register user
    await api.post("/auth/register", {
      email,
      password,
      name,
    });

    // Backend registration currently doesn't return tokens,
    // so login immediately after successful registration.
    return await login(email, password);
  };

  const logout = () => {
    setUser(null);
    setTokens(null);

    localStorage.removeItem("access_token");
    localStorage.removeItem("refreshToken");
  };

  useEffect(() => {
    const restoreSession = async () => {
      const accessToken = localStorage.getItem("access_token");

      if (!accessToken) {
        setLoading(false);
        return;
      }

      try {
        // Restore user using saved access token
        const response = await api.get("/auth/me", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        setUser(response.data);

        setTokens({
          accessToken,
          refreshToken: localStorage.getItem("refreshToken"),
        });
      } catch (error) {
        console.error("Session restore failed:", error);

        localStorage.removeItem("access_token");
        localStorage.removeItem("refreshToken");

        setUser(null);
        setTokens(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        tokens,
        login,
        register,
        logout,
        loading,
        api,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};