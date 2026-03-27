import api from "./client";

export const systemAPI = {
  getConfig: () => api.get("/system/config"),
};

export const databaseAPI = {
  walCheckpoint: () => api.post("/database/wal-checkpoint"),
  resetAllData: () => api.delete("/database/reset"),
  seedSampleData: () => api.post("/database/seed"),
};
