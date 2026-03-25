import api from "./client";

export const constantsAPI = {
  getAll: () => api.get("/constants"),

  getByCategory: (category) => api.get(`/constants/${category}`),
};
