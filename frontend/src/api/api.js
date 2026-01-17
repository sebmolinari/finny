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
          localStorage.removeItem("token");
          window.location.href = "/login";
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

export const authAPI = {
  login: (username, password) =>
    api.post("/auth/login", { username, password }),

  register: (username, email, password) =>
    api.post("/auth/register", { username, email, password }),

  logout: () => api.post("/auth/logout"),

  getCurrentUser: () => api.get("/auth/me"),
};

export const userAPI = {
  getAllUsers: (params = {}) => api.get("/users", { params }),

  updateUserStatus: (id, active) =>
    api.patch(`/users/${id}/status`, { active }),

  updateUserRole: (id, role) => api.patch(`/users/${id}/role`, { role }),

  deleteUser: (id) => api.delete(`/users/${id}`),
};

export const assetAPI = {
  getAll: (params = {}) => api.get("/assets", { params }),

  getById: (id) => api.get(`/assets/${id}`),

  getBySymbol: (symbol) => api.get(`/assets/symbol/${symbol}`),

  create: (data) => api.post("/assets", data),

  update: (id, data) => api.put(`/assets/${id}`, data),

  delete: (id) => api.delete(`/assets/${id}`),

  getPrices: (id, params = {}) => api.get(`/assets/${id}/prices`, { params }),

  getLatestPrice: (id) => api.get(`/assets/${id}/price/latest`),

  addPrice: (id, data) => api.post(`/assets/${id}/prices`, data),

  updatePrice: (assetId, priceId, data) =>
    api.put(`/assets/${assetId}/prices/${priceId}`, data),

  bulkAddPrices: (id, prices) =>
    api.post(`/assets/${id}/prices/bulk`, { prices }),

  deletePrice: (assetId, priceId) =>
    api.delete(`/assets/${assetId}/prices/${priceId}`),

  refreshAllPrices: () => api.post("/assets/prices/refresh-all"),

  refreshAssetPrice: (assetId) => api.post(`/assets/${assetId}/prices/refresh`),
};

export const transactionAPI = {
  getAll: (params = {}) => api.get("/transactions", { params }),

  getById: (id) => api.get(`/transactions/${id}`),

  create: (data) => api.post("/transactions", data),

  update: (id, data) => api.put(`/transactions/${id}`, data),

  delete: (id) => api.delete(`/transactions/${id}`),

  bulkImport: (transactions) =>
    api.post("/transactions/bulk", { transactions }),

  exportTransactions: (params = {}) =>
    api.get("/transactions/export", {
      params,
      responseType: "blob",
    }),
};

export const analyticsAPI = {
  getPortfolioAnalytics: () => api.get("/analytics/portfolio/analytics"),

  getPortfolioPerformance: (days = 30) =>
    api.get("/analytics/portfolio/performance", { params: { days } }),

  getReturnDetails: () => api.get("/analytics/portfolio/returns/details"),

  getCashBalanceDetails: () => api.get("/analytics/portfolio/cash-details"),

  getBrokerOverview: () => api.get("/analytics/brokers/overview"),

  getMarketTrends: (days = 30) =>
    api.get("/analytics/market-trends", { params: { days } }),

  getTaxReport: (year, excludeAssetTypes = [], excludeBrokers = []) => {
    const params = { year };
    if (excludeAssetTypes.length > 0) {
      params.exclude_asset_types = excludeAssetTypes.join(",");
    }
    if (excludeBrokers.length > 0) {
      params.exclude_brokers = excludeBrokers.join(",");
    }
    return api.get("/analytics/tax-report", { params });
  },
};

export const emailAPI = {
  sendPortfolioSummary: () => api.post("/email/summary"),
};

export const settingsAPI = {
  get: () => api.get("/settings"),

  update: (data) => api.put("/settings", data),
};

export const brokerAPI = {
  getAll: (options = {}) => api.get("/brokers", { params: options }),

  getById: (id) => api.get(`/brokers/${id}`),

  create: (data) => api.post("/brokers", data),

  update: (id, data) => api.put(`/brokers/${id}`, data),

  delete: (id) => api.delete(`/brokers/${id}`),
};

export const constantsAPI = {
  getAll: () => api.get("/constants"),

  getByCategory: (category) => api.get(`/constants/${category}`),
};

export const allocationAPI = {
  getTargets: (includeAssetTypes = []) =>
    api.get("/allocation/targets", {
      params:
        includeAssetTypes && includeAssetTypes.length > 0
          ? { include_asset_types: includeAssetTypes.join(",") }
          : {},
    }),

  getTargetById: (id) => api.get(`/allocation/targets/${id}`),

  createTarget: (data) => api.post("/allocation/targets", data),

  batchUpdateTargets: (targets) =>
    api.post("/allocation/targets/batch", { targets }),

  deleteTarget: (id) => api.delete(`/allocation/targets/${id}`),

  getRebalancing: (includeAssetTypes = []) =>
    api.get("/allocation/rebalancing", {
      params:
        includeAssetTypes && includeAssetTypes.length > 0
          ? { include_asset_types: includeAssetTypes.join(",") }
          : {},
    }),
};

export default api;
