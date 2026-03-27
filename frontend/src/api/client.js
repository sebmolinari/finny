import axios from "axios";
import { toast } from "react-toastify";

const api = axios.create({
  baseURL: "/api/v1",
  timeout: 30000, // 30 second timeout
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Global response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Intentional abort (AbortController) — do not toast
    if (error.name === "CanceledError" || axios.isCancel(error)) {
      return Promise.reject(error);
    }

    // Handle network errors
    if (!error.response) {
      toast.error("Network error. Please check your connection.");
      return Promise.reject(new Error("Network error"));
    }

    // Handle specific HTTP status codes
    const { status, data } = error.response;

    switch (status) {
      case 401:
        // Unauthorized - token expired or invalid
        if (window.location.pathname !== "/login") {
          toast.error("Session expired. Please login again.");
          window.dispatchEvent(new CustomEvent("auth:unauthorized"));
        }
        break;
      case 403:
        toast.error("Access denied. You don't have permission.");
        break;
      case 404:
        toast.error(data.message || "Resource not found.");
        break;
      case 429:
        toast.error("Too many requests. Please slow down.");
        break;
      case 500:
        toast.error("Server error. Please try again later.");
        break;
      default:
        // Show specific error message from server if available
        if (data && data.message) {
          // Don't toast here - let components handle it for better UX
          // toast.error(data.message);
        }
    }

    return Promise.reject(error);
  },
);

export default api;
