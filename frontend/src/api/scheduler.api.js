import api from "./client";

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
