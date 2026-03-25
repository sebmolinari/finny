import api from "./client";

export const settingsAPI = {
  get: () => api.get("/settings"),

  update: (data) => api.put("/settings", data),

  markOnboardingComplete: () => api.post("/settings/onboarding-complete"),

  markReviewed: () => api.post("/settings/reviewed"),
};
