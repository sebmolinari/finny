import api from "./client";

export const settingsAPI = {
  get: (signal) => api.get("/settings", { signal }),

  update: (data) => api.put("/settings", data),

  markOnboardingComplete: () => api.post("/settings/onboarding-complete"),

  markReviewed: () => api.post("/settings/reviewed"),
};
