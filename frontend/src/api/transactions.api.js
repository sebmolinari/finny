import api from "./client";

export const transactionAPI = {
  getAll: (params = {}) => api.get("/transactions", { params }),

  getById: (id) => api.get(`/transactions/${id}`),

  create: (data) => api.post("/transactions", data),

  update: (id, data) => api.put(`/transactions/${id}`, data),

  delete: (id) => api.delete(`/transactions/${id}`),

  transfer: (data) => api.post("/transactions/transfer", data),

  bulkImport: (transactions) =>
    api.post("/transactions/bulk", { transactions }),

  bulkDelete: (ids) => api.delete("/transactions/bulk", { data: { ids } }),
};
