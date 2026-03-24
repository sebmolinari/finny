"use strict";

/**
 * Unit tests for routes/assets.js — error paths and branch coverage.
 */

jest.mock("../../../middleware/auth", () => (req, res, next) => {
  req.user = { id: 1, username: "admin", role: "admin" };
  next();
});
jest.mock("../../../middleware/admin", () => (req, res, next) => next());
jest.mock("../../../models/Asset");
jest.mock("../../../models/PriceData");
jest.mock("../../../models/AuditLog");
jest.mock("../../../services/priceService");

const request = require("supertest");
const express = require("express");
const Asset = require("../../../models/Asset");
const PriceData = require("../../../models/PriceData");
const AuditLog = require("../../../models/AuditLog");
const PriceService = require("../../../services/priceService");

const DB_ERR = new Error("database exploded");

function buildApp() {
  const app = express();
  app.use(express.json());
  const assetsRouter = require("../../../routes/assets");
  app.use("/assets", assetsRouter);
  return app;
}

let app;

beforeEach(() => {
  jest.resetAllMocks();
  app = buildApp();

  Asset.getAll.mockReturnValue([]);
  Asset.findById.mockReturnValue({ id: 1, symbol: "AAPL", name: "Apple", active: 1 });
  Asset.findBySymbol.mockReturnValue({ id: 1, symbol: "AAPL" });
  Asset.create.mockReturnValue(1);
  Asset.update.mockReturnValue({ id: 1 });
  Asset.delete.mockReturnValue(true);
  PriceData.findByAsset.mockReturnValue([]);
  PriceData.findById.mockReturnValue({ id: 10, price: 150, source: "manual" });
  PriceData.findByAssetAndDate.mockReturnValue({ id: 10, price: 150 });
  PriceData.getLatestPrice.mockReturnValue({ price: 150, date: "2024-01-01" });
  PriceData.create.mockReturnValue(10);
  PriceData.update.mockReturnValue(true);
  PriceData.delete.mockReturnValue(true);
  PriceData.bulkCreate.mockReturnValue(undefined);
  AuditLog.logCreate.mockReturnValue(undefined);
  AuditLog.logUpdate.mockReturnValue(undefined);
  AuditLog.logDelete.mockReturnValue(undefined);
  AuditLog.create.mockReturnValue(undefined);
  PriceService.refreshAllPrices = jest.fn().mockResolvedValue({
    updated: 1, skipped: 0, failed: 0, total: 1,
  });
  PriceService.refreshAssetPrice = jest.fn().mockResolvedValue({
    success: true,
    price: { date: "2024-01-01", price: 150, source: "api" },
  });
});

// ── GET / ──────────────────────────────────────────────────────────────────

describe("GET /assets", () => {
  it("returns 200 on success", async () => {
    Asset.getAll.mockReturnValue([{ id: 1 }]);
    expect((await request(app).get("/assets")).status).toBe(200);
  });

  it("passes query params (includeInactive=true branch)", async () => {
    const res = await request(app).get("/assets?assetType=equity&search=Apple&includeInactive=true");
    expect(res.status).toBe(200);
    expect(Asset.getAll).toHaveBeenCalledWith(
      expect.objectContaining({ includeInactive: true }),
    );
  });

  it("returns 500 on error", async () => {
    Asset.getAll.mockImplementation(() => { throw DB_ERR; });
    expect((await request(app).get("/assets")).status).toBe(500);
  });
});

// ── GET /:id ───────────────────────────────────────────────────────────────

describe("GET /assets/:id", () => {
  it("returns 200 when found", async () => {
    expect((await request(app).get("/assets/1")).status).toBe(200);
  });

  it("returns 404 when not found", async () => {
    Asset.findById.mockReturnValue(null);
    expect((await request(app).get("/assets/999")).status).toBe(404);
  });

  it("returns 500 on error", async () => {
    Asset.findById.mockImplementation(() => { throw DB_ERR; });
    expect((await request(app).get("/assets/1")).status).toBe(500);
  });
});

// ── GET /symbol/:symbol ────────────────────────────────────────────────────

describe("GET /assets/symbol/:symbol", () => {
  it("returns 200 when found", async () => {
    expect((await request(app).get("/assets/symbol/AAPL")).status).toBe(200);
  });

  it("returns 404 when not found", async () => {
    Asset.findBySymbol.mockReturnValue(null);
    expect((await request(app).get("/assets/symbol/UNKNOWN")).status).toBe(404);
  });

  it("returns 500 on error", async () => {
    Asset.findBySymbol.mockImplementation(() => { throw DB_ERR; });
    expect((await request(app).get("/assets/symbol/AAPL")).status).toBe(500);
  });
});

// ── POST / ─────────────────────────────────────────────────────────────────

describe("POST /assets", () => {
  const validBody = {
    symbol: "AAPL",
    name: "Apple",
    asset_type: "equity",
    currency: "USD",
  };

  it("returns 201 on success", async () => {
    expect((await request(app).post("/assets").send(validBody)).status).toBe(201);
  });

  it("returns 201 when active is explicitly true (branch: active ? 1 : 0)", async () => {
    expect(
      (await request(app).post("/assets").send({ ...validBody, active: true })).status,
    ).toBe(201);
  });

  it("returns 201 when active is explicitly false", async () => {
    expect(
      (await request(app).post("/assets").send({ ...validBody, active: false })).status,
    ).toBe(201);
  });

  it("returns 400 on UNIQUE constraint error", async () => {
    Asset.create.mockImplementation(() => {
      throw new Error("UNIQUE constraint failed: assets.symbol");
    });
    expect((await request(app).post("/assets").send(validBody)).status).toBe(400);
  });

  it("returns 500 on generic error", async () => {
    Asset.create.mockImplementation(() => { throw DB_ERR; });
    expect((await request(app).post("/assets").send(validBody)).status).toBe(500);
  });
});

// ── PUT /:id ───────────────────────────────────────────────────────────────

describe("PUT /assets/:id", () => {
  const validBody = {
    symbol: "AAPL",
    name: "Apple Inc",
    asset_type: "equity",
    currency: "USD",
  };

  it("returns 200 on success", async () => {
    expect((await request(app).put("/assets/1").send(validBody)).status).toBe(200);
  });

  it("returns 404 when asset not found (findById returns null)", async () => {
    Asset.findById.mockReturnValue(null);
    expect((await request(app).put("/assets/999").send(validBody)).status).toBe(404);
  });

  it("returns 404 when update returns falsy", async () => {
    // First call for oldAsset returns something, second for refresh returns something
    Asset.findById
      .mockReturnValueOnce({ id: 1, name: "Old", asset_type: "equity", currency: "USD" })
      .mockReturnValueOnce({ id: 1, name: "Apple Inc" });
    Asset.update.mockReturnValue(null);
    expect((await request(app).put("/assets/1").send(validBody)).status).toBe(404);
  });

  it("returns 500 on error", async () => {
    Asset.findById.mockReturnValueOnce({ id: 1, name: "Old" });
    Asset.update.mockImplementation(() => { throw DB_ERR; });
    expect((await request(app).put("/assets/1").send(validBody)).status).toBe(500);
  });
});

// ── DELETE /:id ────────────────────────────────────────────────────────────

describe("DELETE /assets/:id", () => {
  it("returns 200 on success", async () => {
    expect((await request(app).delete("/assets/1")).status).toBe(200);
  });

  it("returns 200 and skips audit log when findById returns null before delete", async () => {
    Asset.findById.mockReturnValue(null);
    Asset.delete.mockReturnValue(true);
    expect((await request(app).delete("/assets/1")).status).toBe(200);
  });

  it("returns 404 when delete returns falsy", async () => {
    Asset.delete.mockReturnValue(false);
    expect((await request(app).delete("/assets/999")).status).toBe(404);
  });

  it("returns 500 on error", async () => {
    Asset.delete.mockImplementation(() => { throw DB_ERR; });
    expect((await request(app).delete("/assets/1")).status).toBe(500);
  });
});

// ── GET /:id/prices ────────────────────────────────────────────────────────

describe("GET /assets/:id/prices", () => {
  it("returns 200 on success", async () => {
    expect((await request(app).get("/assets/1/prices")).status).toBe(200);
  });

  it("returns 500 on error", async () => {
    PriceData.findByAsset.mockImplementation(() => { throw DB_ERR; });
    expect((await request(app).get("/assets/1/prices")).status).toBe(500);
  });
});

// ── GET /:id/price/latest ──────────────────────────────────────────────────

describe("GET /assets/:id/price/latest", () => {
  it("returns 200 with price when found", async () => {
    expect((await request(app).get("/assets/1/price/latest")).status).toBe(200);
  });

  it("returns 200 with 'No price data available' when no price", async () => {
    PriceData.getLatestPrice.mockReturnValue(null);
    const res = await request(app).get("/assets/1/price/latest");
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/No price data available/);
  });

  it("returns 500 on error", async () => {
    PriceData.getLatestPrice.mockImplementation(() => { throw DB_ERR; });
    expect((await request(app).get("/assets/1/price/latest")).status).toBe(500);
  });
});

// ── POST /:id/prices ───────────────────────────────────────────────────────

describe("POST /assets/:id/prices", () => {
  const validBody = { date: "2024-01-01", price: 150, source: "manual" };

  it("returns 201 on success", async () => {
    expect(
      (await request(app).post("/assets/1/prices").send(validBody)).status,
    ).toBe(201);
  });

  it("returns 409 when price already exists", async () => {
    PriceData.create.mockImplementation(() => {
      throw new Error("Price entry already exists");
    });
    expect(
      (await request(app).post("/assets/1/prices").send(validBody)).status,
    ).toBe(409);
  });

  it("returns 500 on generic error", async () => {
    PriceData.create.mockImplementation(() => { throw DB_ERR; });
    expect(
      (await request(app).post("/assets/1/prices").send(validBody)).status,
    ).toBe(500);
  });
});

// ── PUT /:id/prices/:priceId ───────────────────────────────────────────────

describe("PUT /assets/:id/prices/:priceId", () => {
  const validBody = { price: 160, source: "manual" };

  it("returns 200 on success", async () => {
    expect(
      (await request(app).put("/assets/1/prices/10").send(validBody)).status,
    ).toBe(200);
  });

  it("returns 200 and uses oldPriceData.source when source is undefined", async () => {
    const res = await request(app).put("/assets/1/prices/10").send({ price: 160 });
    expect(res.status).toBe(200);
    expect(PriceData.update).toHaveBeenCalledWith(
      "10",
      160,
      "manual", // from oldPriceData mock
      1,
    );
  });

  it("returns 404 when priceId not found", async () => {
    PriceData.findById.mockReturnValue(null);
    expect(
      (await request(app).put("/assets/1/prices/999").send(validBody)).status,
    ).toBe(404);
  });

  it("returns 404 when update returns falsy", async () => {
    PriceData.update.mockReturnValue(null);
    // second findById call (after update) can also return null
    PriceData.findById
      .mockReturnValueOnce({ id: 10, price: 150, source: "manual" })
      .mockReturnValueOnce(null);
    expect(
      (await request(app).put("/assets/1/prices/10").send(validBody)).status,
    ).toBe(404);
  });

  it("returns 500 on error", async () => {
    PriceData.update.mockImplementation(() => { throw DB_ERR; });
    expect(
      (await request(app).put("/assets/1/prices/10").send(validBody)).status,
    ).toBe(500);
  });
});

// ── DELETE /:id/prices/:priceId ────────────────────────────────────────────

describe("DELETE /assets/:id/prices/:priceId", () => {
  it("returns 200 on success", async () => {
    expect((await request(app).delete("/assets/1/prices/10")).status).toBe(200);
  });

  it("returns 200 and skips audit log when findById returns null before delete", async () => {
    PriceData.findById.mockReturnValue(null);
    PriceData.delete.mockReturnValue(true);
    expect((await request(app).delete("/assets/1/prices/10")).status).toBe(200);
  });

  it("returns 404 when delete returns falsy", async () => {
    PriceData.delete.mockReturnValue(false);
    expect((await request(app).delete("/assets/1/prices/999")).status).toBe(404);
  });

  it("returns 500 on error", async () => {
    PriceData.delete.mockImplementation(() => { throw DB_ERR; });
    expect((await request(app).delete("/assets/1/prices/10")).status).toBe(500);
  });
});

// ── POST /prices/refresh-all ───────────────────────────────────────────────

describe("POST /assets/prices/refresh-all", () => {
  it("returns 200 on success", async () => {
    expect((await request(app).post("/assets/prices/refresh-all")).status).toBe(200);
  });

  it("returns 500 on error", async () => {
    PriceService.refreshAllPrices.mockRejectedValue(DB_ERR);
    expect((await request(app).post("/assets/prices/refresh-all")).status).toBe(500);
  });
});

// ── POST /:id/prices/refresh ───────────────────────────────────────────────

describe("POST /assets/:id/prices/refresh", () => {
  it("returns 200 on success with audit log", async () => {
    expect((await request(app).post("/assets/1/prices/refresh")).status).toBe(200);
    expect(AuditLog.create).toHaveBeenCalled();
  });

  it("skips audit log when result.success is false", async () => {
    PriceService.refreshAssetPrice.mockResolvedValue({ success: false });
    const res = await request(app).post("/assets/1/prices/refresh");
    expect(res.status).toBe(200);
    expect(AuditLog.create).not.toHaveBeenCalled();
  });

  it("returns 400 when error contains 'inactive'", async () => {
    PriceService.refreshAssetPrice.mockRejectedValue(
      new Error("Asset is inactive"),
    );
    expect((await request(app).post("/assets/1/prices/refresh")).status).toBe(400);
  });

  it("returns 500 on generic error", async () => {
    PriceService.refreshAssetPrice.mockRejectedValue(DB_ERR);
    expect((await request(app).post("/assets/1/prices/refresh")).status).toBe(500);
  });
});
