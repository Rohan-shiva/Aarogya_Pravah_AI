import React, { createContext, useContext, useState, useEffect } from "react";
import authService from "../services/authService";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("aarogyapravah_token") || localStorage.getItem("smartqueue_token");
    const savedUser = authService.getCurrentUser();

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(savedUser);
    }
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const response = await authService.login(credentials);
      if (response && response.success && response.user) {
        setUser(response.user);
        setToken(response.token || localStorage.getItem("aarogyapravah_token") || localStorage.getItem("smartqueue_token"));
        return { success: true, user: response.user };
      }
      return { success: false, message: response?.message || "Login failed" };
    } catch (error) {
      return { success: false, message: error.message || "Login failed" };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const response = await authService.register(userData);
      if (response && response.success && response.user) {
        setUser(response.user);
        setToken(response.token || localStorage.getItem("aarogyapravah_token") || localStorage.getItem("smartqueue_token"));
      }
      return response;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setToken(null);
  };

  const isRole = (role) => {
    if (!user || !user.role) return false;
    const current = user.role.toLowerCase();
    const target = (role || "").toLowerCase();
    if (current === target) return true;
    if (target === "staff" && (current === "support" || current === "nurse" || current === "compounder")) return true;
    if (target === "doctor" && (current === "physician" || current === "specialist")) return true;
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!token,
        isRole,
        setUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
