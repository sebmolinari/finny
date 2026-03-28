import api from "./client";

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

  bulkImport: (assets) => api.post("/assets/bulk", { assets }),

  bulkImportPrices: (prices) => api.post("/assets/prices/bulk-import", { prices }),
};
