import api from "./client";

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
