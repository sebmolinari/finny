import api from "./client";

export const brokerAPI = {
  getAll: (options = {}) => api.get("/brokers", { params: options }),

  getById: (id) => api.get(`/brokers/${id}`),

  create: (data) => api.post("/brokers", data),

  update: (id, data) => api.put(`/brokers/${id}`, data),

  delete: (id) => api.delete(`/brokers/${id}`),
};
