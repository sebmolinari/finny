"use strict";

/**
 * Unit tests for routes/allocation.js — error paths and branch coverage.
 */

jest.mock("../../../middleware/auth", () => (req, res, next) => {
  req.user = { id: 1, username: "admin", role: "admin" };
  next();
});
jest.mock("../../../models/AssetAllocationTarget");
jest.mock("../../../models/Asset");
jest.mock("../../../services/analyticsService");
jest.mock("../../../models/AuditLog");

const request = require("supertest");
const express = require("express");
const AssetAllocationTarget = require("../../../models/AssetAllocationTarget");
const Asset = require("../../../models/Asset");
const AnalyticsService = require("../../../services/analyticsService");
const AuditLog = require("../../../models/AuditLog");

const DB_ERR = new Error("database exploded");

const TARGET = {
  id: 1,
  user_id: 1,
  asset_type: "equity",
  target_percentage: 60,
  notes: "",
};

function buildApp() {
  const app = express();
  app.use(express.json());
  const allocationRouter = require("../../../routes/allocation");
  app.use("/allocation", allocationRouter);
  return app;
}

let app;

beforeEach(() => {
  jest.resetAllMocks();
  app = buildApp();

  AssetAllocationTarget.getAllByUser.mockReturnValue([TARGET]);
  AssetAllocationTarget.validateTotalAllocation.mockReturnValue({
    total: 30,
    remaining: 70,
    isValid: true,
  });
  AssetAllocationTarget.getById.mockReturnValue(TARGET);
  AssetAllocationTarget.upsert.mockReturnValue(TARGET);
  AssetAllocationTarget.batchUpsert.mockReturnValue({ created: 1, updated: 0 });
  AssetAllocationTarget.delete.mockReturnValue(1);
  Asset.getDistinctAssetTypes.mockReturnValue(["equity", "bond", "crypto"]);
  AnalyticsService.getRebalancingRecommendations.mockReturnValue([]);
  AnalyticsService.simulateRebalancing.mockReturnValue({ allocations: [] });
  AuditLog.logCreate.mockReturnValue(undefined);
  AuditLog.logUpdate.mockReturnValue(undefined);
  AuditLog.logDelete.mockReturnValue(undefined);
});

// ── GET /targets ───────────────────────────────────────────────────────────────

describe("GET /allocation/targets", () => {
  it("returns 200 on success", async () => {
    const res = await request(app).get("/allocation/targets");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("targets");
    expect(res.body).toHaveProperty("is_valid");
  });

  it("filters by include_asset_types query param", async () => {
    const res = await request(app).get(
      "/allocation/targets?include_asset_types=equity,bond",
    );
    expect(res.status).toBe(200);
    expect(Asset.getDistinctAssetTypes).toHaveBeenCalled();
  });

  it("returns 500 on error (line 70)", async () => {
    AssetAllocationTarget.getAllByUser.mockImplementation(() => {
      throw DB_ERR;
    });
    expect((await request(app).get("/allocation/targets")).status).toBe(500);
  });
});

// ── GET /targets/:id ───────────────────────────────────────────────────────────

describe("GET /allocation/targets/:id", () => {
  it("returns 200 when found", async () => {
    const res = await request(app).get("/allocation/targets/1");
    expect(res.status).toBe(200);
  });

  it("returns 404 when not found", async () => {
    AssetAllocationTarget.getById.mockReturnValue(null);
    expect((await request(app).get("/allocation/targets/999")).status).toBe(404);
  });

  it("returns 500 on error (line 102)", async () => {
    AssetAllocationTarget.getById.mockImplementation(() => {
      throw DB_ERR;
    });
    expect((await request(app).get("/allocation/targets/1")).status).toBe(500);
  });
});

// ── POST /targets ──────────────────────────────────────────────────────────────

describe("POST /allocation/targets", () => {
  const validBody = {
    asset_type: "equity",
    target_percentage: 60, // 30 + 60 = 90 ≤ 100, so validation passes
  };

  it("returns 200 on success", async () => {
    const res = await request(app)
      .post("/allocation/targets")
      .send(validBody);
    expect(res.status).toBe(200);
  });

  it("returns 500 on error (line 178)", async () => {
    AssetAllocationTarget.upsert.mockImplementation(() => {
      throw DB_ERR;
    });
    expect(
      (await request(app).post("/allocation/targets").send(validBody)).status,
    ).toBe(500);
  });
});

// ── POST /targets/batch ────────────────────────────────────────────────────────

describe("POST /allocation/targets/batch", () => {
  const validBody = {
    targets: [{ asset_type: "equity", target_percentage: 60 }],
  };

  it("returns 200 on success", async () => {
    const res = await request(app)
      .post("/allocation/targets/batch")
      .send(validBody);
    expect(res.status).toBe(200);
  });

  it("returns 400 on error (line 244)", async () => {
    AssetAllocationTarget.batchUpsert.mockImplementation(() => {
      throw DB_ERR;
    });
    expect(
      (
        await request(app)
          .post("/allocation/targets/batch")
          .send(validBody)
      ).status,
    ).toBe(400);
  });
});

// ── DELETE /targets/:id ────────────────────────────────────────────────────────

describe("DELETE /allocation/targets/:id", () => {
  it("returns 200 on success", async () => {
    const res = await request(app).delete("/allocation/targets/1");
    expect(res.status).toBe(200);
  });

  it("returns 404 when not found", async () => {
    AssetAllocationTarget.delete.mockReturnValue(0);
    expect((await request(app).delete("/allocation/targets/999")).status).toBe(
      404,
    );
  });

  it("returns 500 on error (line 287)", async () => {
    AssetAllocationTarget.delete.mockImplementation(() => {
      throw DB_ERR;
    });
    expect((await request(app).delete("/allocation/targets/1")).status).toBe(
      500,
    );
  });
});

// ── GET /rebalancing ───────────────────────────────────────────────────────────

describe("GET /allocation/rebalancing", () => {
  it("returns 200 on success", async () => {
    const res = await request(app).get("/allocation/rebalancing");
    expect(res.status).toBe(200);
  });

  it("returns 500 on error (line 326)", async () => {
    AnalyticsService.getRebalancingRecommendations.mockImplementation(() => {
      throw DB_ERR;
    });
    expect((await request(app).get("/allocation/rebalancing")).status).toBe(
      500,
    );
  });
});

// ── POST /simulate ─────────────────────────────────────────────────────────────

describe("POST /allocation/simulate", () => {
  it("returns 200 on success", async () => {
    const res = await request(app)
      .post("/allocation/simulate")
      .send({ deposit: 1000 });
    expect(res.status).toBe(200);
  });

  it("returns 400 when deposit is missing", async () => {
    const res = await request(app).post("/allocation/simulate").send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 when deposit is zero", async () => {
    const res = await request(app)
      .post("/allocation/simulate")
      .send({ deposit: 0 });
    expect(res.status).toBe(400);
  });

  it("returns 400 when deposit is negative", async () => {
    const res = await request(app)
      .post("/allocation/simulate")
      .send({ deposit: -100 });
    expect(res.status).toBe(400);
  });

  it("filters by include_asset_types when provided (lines 386-388)", async () => {
    const res = await request(app)
      .post("/allocation/simulate")
      .send({ deposit: 1000, include_asset_types: ["equity", "bond"] });
    expect(res.status).toBe(200);
    expect(Asset.getDistinctAssetTypes).toHaveBeenCalled();
    expect(AnalyticsService.simulateRebalancing).toHaveBeenCalledWith(
      1,
      1000,
      expect.arrayContaining(["crypto"]),
    );
  });

  it("returns 500 on error (line 398)", async () => {
    AnalyticsService.simulateRebalancing.mockImplementation(() => {
      throw DB_ERR;
    });
    expect(
      (
        await request(app)
          .post("/allocation/simulate")
          .send({ deposit: 1000 })
      ).status,
    ).toBe(500);
  });
});
