import api from "./client";

export const emailAPI = {
  sendPortfolioSummary: () => api.post("/email/summary"),
};
