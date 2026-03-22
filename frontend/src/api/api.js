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
  getAll: () => api.get("/transactions"),

  getById: (id) => api.get(`/transactions/${id}`),

  create: (data) => api.post("/transactions", data),

  update: (id, data) => api.put(`/transactions/${id}`, data),

  delete: (id) => api.delete(`/transactions/${id}`),

  transfer: (data) => api.post("/transactions/transfer", data),

  bulkImport: (transactions) =>
    api.post("/transactions/bulk", { transactions }),
};

export const analyticsAPI = {
  getPortfolioAnalytics: (excludeTypes = []) =>
    api.get("/analytics/portfolio/analytics", {
      params: excludeTypes.length ? { exclude: excludeTypes.join(",") } : {},
    }),

  getPortfolioPerformance: (
    days = 30,
    excludeTypes = [],
    startDate = null,
    endDate = null,
  ) => {
    const params = {};
    // Only send `days` when not using explicit date bounds (backend ignores it either way,
    // but omitting avoids misleading query strings in logs)
    if (!startDate || !endDate) params.days = days;
    if (excludeTypes.length) params.exclude = excludeTypes.join(",");
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return api.get("/analytics/portfolio/performance", { params });
  },

  getDateRangeMetrics: (startDate, endDate) =>
    api.get("/analytics/portfolio/performance/range", {
      params: { start_date: startDate, end_date: endDate },
    }),

  getInceptionDate: () => api.get("/analytics/portfolio/inception-date"),

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

  getRealizedGains: (year = null, ltDays = 365) => {
    const params = { lt_days: ltDays };
    if (year) params.year = year;
    return api.get("/analytics/realized-gains", { params });
  },

  getIncome: (year = null, startDate = null, endDate = null) => {
    const params = {};
    if (year !== null) params.year = year;
    if (startDate !== null) params.startDate = startDate;
    if (endDate !== null) params.endDate = endDate;
    return api.get("/analytics/income", { params });
  },

  getTaxHarvesting: (marginalRate = null, year = null) => {
    const params = {};
    if (marginalRate !== null) params.marginal_rate = marginalRate;
    if (year !== null) params.year = year;
    return api.get("/analytics/tax-harvesting", { params });
  },

getRiskMetrics: (days = 365, startDate = null, endDate = null) => {
    const params = {};
    if (!startDate || !endDate) params.days = days;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return api.get("/analytics/portfolio/risk-metrics", { params });
  },

  getHistoricalHoldings: (asOf) =>
    api.get("/analytics/portfolio/historical-holdings", {
      params: { as_of: asOf },
    }),

  getEconomicCalendar: () => api.get("/analytics/economic-calendar"),

  getBenchmark: (params) =>
    api.get("/analytics/portfolio/benchmark", { params }),

  getAttribution: (startDate, endDate) =>
    api.get("/analytics/portfolio/attribution", {
      params: { startDate, endDate },
    }),

  getCorrelation: (days = 365) =>
    api.get("/analytics/portfolio/correlation", { params: { days } }),

  getAdminOverview: () => api.get("/analytics/admin/overview"),

  getMissingPrices: () => api.get("/analytics/missing-prices"),

  fetchMissingPrices: (items) =>
    api.post("/analytics/missing-prices/fetch", { items }, { timeout: 120000 }),

  applyMissingPrices: (items) =>
    api.post("/analytics/missing-prices/apply", { items }),
};

export const emailAPI = {
  sendPortfolioSummary: () => api.post("/email/summary"),
};

export const notificationsAPI = {
  getAll: (unreadOnly = false) =>
    api.get("/notifications", {
      params: unreadOnly ? { unread_only: true } : {},
    }),

  markRead: (id) => api.patch(`/notifications/${id}/read`),

  markAllRead: () => api.patch("/notifications/read-all"),

  purgeAll: () => api.delete("/notifications/admin/purge"),
};

export const systemAPI = {
  getConfig: () => api.get("/system/config"),
};

export const databaseAPI = {
  walCheckpoint: () => api.post("/database/wal-checkpoint"),
  resetAllData: () => api.delete("/database/reset"),
  seedSampleData: () => api.post("/database/seed"),
};

export const settingsAPI = {
  get: () => api.get("/settings"),

  update: (data) => api.put("/settings", data),

  markOnboardingComplete: () => api.post("/settings/onboarding-complete"),

  markReviewed: () => api.post("/settings/reviewed"),
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

  simulate: (deposit, includeAssetTypes = []) =>
    api.post("/allocation/simulate", {
      deposit,
      include_asset_types: includeAssetTypes,
    }),
};

export const schedulerAPI = {
  getAll: (limit = 50, offset = 0) =>
    api.get("/schedulers", { params: { limit, offset } }),

  getById: (id) => api.get(`/schedulers/${id}`),

  create: (data) => api.post("/schedulers", data),

  update: (id, data) => api.put(`/schedulers/${id}`, data),

  delete: (id) => api.delete(`/schedulers/${id}`),

  getInstances: (schedulerId, limit = 50, offset = 0) =>
    api.get(`/schedulers/${schedulerId}/instances`, {
      params: { limit, offset },
    }),

  purgeInstances: () => api.delete("/schedulers/instances"),
};

export default api;
