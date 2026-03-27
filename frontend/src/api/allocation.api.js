import api from "./client";

export const allocationAPI = {
  getTargets: (includeAssetTypes = []) =>
    api.get("/allocation/targets", {
      params:
        includeAssetTypes && includeAssetTypes.length > 0
          ? { include_asset_types: includeAssetTypes.join(",") }
          : {},
    }),

  getTargetById: (id) => api.get(`/allocation/targets/${id}`),

  createTarget: (data) => api.post("/allocation/targets", data),

  batchUpdateTargets: (targets) =>
    api.post("/allocation/targets/batch", { targets }),

  deleteTarget: (id) => api.delete(`/allocation/targets/${id}`),

  getRebalancing: (includeAssetTypes = []) =>
    api.get("/allocation/rebalancing", {
      params:
        includeAssetTypes && includeAssetTypes.length > 0
          ? { include_asset_types: includeAssetTypes.join(",") }
          : {},
    }),

  simulate: (deposit, includeAssetTypes = []) =>
    api.post("/allocation/simulate", {
      deposit,
      include_asset_types: includeAssetTypes,
    }),
};
