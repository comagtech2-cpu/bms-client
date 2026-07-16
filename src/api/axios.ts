import axios from "axios";
import { useAuthStore } from "../store/authStore";

const api = axios.create({
  baseURL:
    (import.meta as any).env?.VITE_API_URL ||
    ((import.meta as any).env?.PROD
      ? "https://bms-server-hu2d.onrender.com/api/v1"
      : "http://localhost:3001/api/v1"),
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default api;
