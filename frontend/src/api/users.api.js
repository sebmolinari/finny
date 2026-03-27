import api from "./client";

export const userAPI = {
  getAllUsers: (params = {}) => api.get("/users", { params }),

  updateUserStatus: (id, active) =>
    api.patch(`/users/${id}/status`, { active }),

  updateUserRole: (id, role) => api.patch(`/users/${id}/role`, { role }),

  deleteUser: (id) => api.delete(`/users/${id}`),
};
