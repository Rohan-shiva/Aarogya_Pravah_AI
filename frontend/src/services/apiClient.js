import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
export const BACKEND_SERVER_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

/**
 * Resolve relative medical image or static upload path to full URL
 */
export const getAssetUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:") || path.startsWith("data:")) {
    return path;
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${BACKEND_SERVER_URL}${cleanPath}`;
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json"
  }
});

// Request interceptor to attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("aarogyapravah_token") || localStorage.getItem("smartqueue_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle auth expiration & standard errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("aarogyapravah_token");
      localStorage.removeItem("aarogyapravah_user");
      localStorage.removeItem("smartqueue_token");
      localStorage.removeItem("smartqueue_user");
    }
    return Promise.reject(error);
  }
);

export default apiClient;
