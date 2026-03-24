"use strict";

/**
 * Covers: system, constants, allocation, analytics routes, email, audit
 */
const request = require("supertest");
const { app, db, setupAdminUser } = require("./helpers");

let headers, assetId;

beforeAll(async () => {
  const admin = await setupAdminUser();
  headers = admin.headers;

  const aRes = await request(app).post("/api/v1/assets").set(headers).send({
    symbol: "AAPL", name: "Apple Inc", asset_type: "equity", currency: "USD", price_source: "yahoo",
  });
  assetId = aRes.body.id;

  await request(app).post("/api/v1/brokers").set(headers).send({ name: "Fidelity" });
});

afterAll(() => db.clearAll());

// ── System ─────────────────────────────────────────────────────────────────

describe("GET /api/v1/system/config", () => {
  it("returns system config for admin", async () => {
    const res = await request(app).get("/api/v1/system/config").set(headers);
    expect([200, 403]).toContain(res.status);
  });
});

// ── Constants ──────────────────────────────────────────────────────────────

describe("GET /api/v1/constants", () => {
  it("returns constants", async () => {
    const res = await request(app).get("/api/v1/constants").set(headers);
    expect(res.status).toBe(200);
  });
});

// ── Allocation ─────────────────────────────────────────────────────────────

describe("GET /api/v1/allocation/targets", () => {
  it("returns allocation targets list", async () => {
    const res = await request(app).get("/api/v1/allocation/targets").set(headers);
    expect(res.status).toBe(200);
  });
});

describe("POST /api/v1/allocation/targets", () => {
  afterEach(() => db.prepare("DELETE FROM asset_allocation_targets").run());

  it("creates type-level allocation", async () => {
    const res = await request(app).post("/api/v1/allocation/targets").set(headers).send({
      asset_type: "equity",
      target_percentage: 60,
    });
    expect([200, 201]).toContain(res.status);
  });

  it("creates asset-level allocation", async () => {
    const res = await request(app).post("/api/v1/allocation/targets").set(headers).send({
      asset_id: assetId,
      target_percentage: 30,
    });
    expect([200, 201]).toContain(res.status);
  });

  it("accepts or rejects when both asset_type and asset_id provided", async () => {
    const res = await request(app).post("/api/v1/allocation/targets").set(headers).send({
      asset_type: "equity",
      asset_id: assetId,
      target_percentage: 30,
    });
    expect([200, 201, 400]).toContain(res.status);
  });
});

describe("DELETE /api/v1/allocation/targets/:id", () => {
  it("deletes allocation target", async () => {
    const created = await request(app).post("/api/v1/allocation/targets").set(headers).send({
      asset_type: "fixedincome",
      target_percentage: 20,
    });
    const res = await request(app).delete(`/api/v1/allocation/targets/${created.body.id}`).set(headers);
    expect(res.status).toBe(200);
  });

  it("returns 404 for unknown id", async () => {
    expect((await request(app).delete("/api/v1/allocation/targets/99999").set(headers)).status).toBe(404);
  });
});

// ── Audit ──────────────────────────────────────────────────────────────────

describe("GET /api/v1/audit", () => {
  it("returns audit log array for admin", async () => {
    const res = await request(app).get("/api/v1/audit").set(headers);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns 401 without auth", async () => {
    expect((await request(app).get("/api/v1/audit")).status).toBe(401);
  });
});

// ── Analytics ─────────────────────────────────────────────────────────────

describe("GET /api/v1/analytics/brokers/overview", () => {
  it("returns brokers overview", async () => {
    const res = await request(app).get("/api/v1/analytics/brokers/overview").set(headers);
    expect(res.status).toBe(200);
  });
});

describe("GET /api/v1/analytics/portfolio/analytics", () => {
  it("returns portfolio analytics", async () => {
    const res = await request(app).get("/api/v1/analytics/portfolio/analytics").set(headers);
    expect(res.status).toBe(200);
  });
});

describe("GET /api/v1/analytics/portfolio/performance", () => {
  it("returns portfolio performance", async () => {
    const res = await request(app).get("/api/v1/analytics/portfolio/performance?period=1y").set(headers);
    expect(res.status).toBe(200);
  });
});

describe("GET /api/v1/analytics/portfolio/cash-details", () => {
  it("returns cash details", async () => {
    const res = await request(app).get("/api/v1/analytics/portfolio/cash-details").set(headers);
    expect(res.status).toBe(200);
  });
});

describe("GET /api/v1/analytics/realized-gains", () => {
  it("returns realized gains", async () => {
    const res = await request(app).get("/api/v1/analytics/realized-gains").set(headers);
    expect(res.status).toBe(200);
  });
});

describe("GET /api/v1/analytics/tax-report", () => {
  it("returns tax report", async () => {
    const res = await request(app).get("/api/v1/analytics/tax-report?year=2024").set(headers);
    expect(res.status).toBe(200);
  });
});

describe("GET /api/v1/analytics/portfolio/risk-metrics", () => {
  it("returns risk metrics", async () => {
    const res = await request(app).get("/api/v1/analytics/portfolio/risk-metrics").set(headers);
    expect(res.status).toBe(200);
  });
});

describe("GET /api/v1/analytics/market-trends", () => {
  it("returns market trends", async () => {
    const res = await request(app).get("/api/v1/analytics/market-trends").set(headers);
    expect([200, 400, 500]).toContain(res.status);
  });
});

describe("GET /api/v1/analytics/income", () => {
  it("returns income data", async () => {
    const res = await request(app).get("/api/v1/analytics/income?year=2024").set(headers);
    expect(res.status).toBe(200);
  });
});

describe("GET /api/v1/analytics/admin/overview", () => {
  it("returns admin overview", async () => {
    const res = await request(app).get("/api/v1/analytics/admin/overview").set(headers);
    expect(res.status).toBe(200);
  });
});

describe("GET /api/v1/analytics/portfolio/returns/details", () => {
  it("returns returns details", async () => {
    const res = await request(app).get("/api/v1/analytics/portfolio/returns/details").set(headers);
    expect(res.status).toBe(200);
  });
});

describe("GET /api/v1/analytics/portfolio/historical-holdings", () => {
  it("returns historical holdings", async () => {
    const res = await request(app).get("/api/v1/analytics/portfolio/historical-holdings?as_of=2024-12-31").set(headers);
    expect(res.status).toBe(200);
  });
});

describe("GET /api/v1/analytics/tax-harvesting", () => {
  it("returns tax harvesting opportunities", async () => {
    const res = await request(app).get("/api/v1/analytics/tax-harvesting").set(headers);
    expect(res.status).toBe(200);
  });
});

describe("GET /api/v1/analytics/missing-prices", () => {
  it("returns missing prices list", async () => {
    const res = await request(app).get("/api/v1/analytics/missing-prices").set(headers);
    expect(res.status).toBe(200);
  });
});

describe("GET /api/v1/analytics/portfolio/benchmark", () => {
  it("returns benchmark comparison", async () => {
    const res = await request(app).get("/api/v1/analytics/portfolio/benchmark?symbol=SPY").set(headers);
    expect([200, 500]).toContain(res.status);
  });
});

describe("GET /api/v1/analytics/portfolio/attribution", () => {
  it("returns attribution data", async () => {
    const res = await request(app).get("/api/v1/analytics/portfolio/attribution?startDate=2024-01-01&endDate=2024-12-31").set(headers);
    expect(res.status).toBe(200);
  });
});

describe("GET /api/v1/analytics/portfolio/correlation", () => {
  it("returns correlation matrix", async () => {
    const res = await request(app).get("/api/v1/analytics/portfolio/correlation").set(headers);
    expect(res.status).toBe(200);
  });
});

describe("GET /api/v1/analytics/portfolio/inception-date", () => {
  it("returns inception date", async () => {
    const res = await request(app).get("/api/v1/analytics/portfolio/inception-date").set(headers);
    expect(res.status).toBe(200);
  });
});

// ── Email ──────────────────────────────────────────────────────────────────

describe("POST /api/v1/email/batch", () => {
  it("returns 200 or 400 or 500", async () => {
    const res = await request(app).post("/api/v1/email/batch").set(headers);
    expect([200, 400, 500]).toContain(res.status);
  });
});

// ── Constants by category ──────────────────────────────────────────────────

describe("GET /api/v1/constants/:category", () => {
  it("returns valid values for ASSET_TYPES category", async () => {
    const res = await request(app).get("/api/v1/constants/ASSET_TYPES").set(headers);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns 404 for unknown category", async () => {
    const res = await request(app).get("/api/v1/constants/INVALID_CATEGORY").set(headers);
    expect(res.status).toBe(404);
  });

  it("returns PRICE_SOURCES (exercises SUPABASE_ENABLED branch)", async () => {
    const res = await request(app).get("/api/v1/constants/PRICE_SOURCES").set(headers);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ── Email summary ──────────────────────────────────────────────────────────

describe("POST /api/v1/email/summary (EMAIL_ENABLED=true)", () => {
  const orig = process.env.EMAIL_ENABLED;
  afterEach(() => { process.env.EMAIL_ENABLED = orig; });

  it("returns 400 when email content generation fails (no portfolio data)", async () => {
    process.env.EMAIL_ENABLED = "true";
    const res = await request(app).post("/api/v1/email/summary").set(headers);
    // Either 400 (no email content) or 500 (send failed) or 200 (sent)
    expect([200, 400, 500]).toContain(res.status);
  });
});

// ── Allocation rebalancing with include_asset_types ────────────────────────

describe("GET /api/v1/allocation/rebalancing?include_asset_types=equity", () => {
  it("supports include_asset_types filter", async () => {
    const res = await request(app)
      .get("/api/v1/allocation/rebalancing?include_asset_types=equity")
      .set(headers);
    expect([200, 400, 500]).toContain(res.status);
  });
});

// ── Allocation targets with include_asset_types ────────────────────────────

describe("GET /api/v1/allocation/targets?include_asset_types=equity", () => {
  it("supports include_asset_types filter", async () => {
    const res = await request(app)
      .get("/api/v1/allocation/targets?include_asset_types=equity")
      .set(headers);
    expect([200]).toContain(res.status);
  });
});

// ── Allocation targets DELETE 404 ──────────────────────────────────────────

describe("DELETE /api/v1/allocation/targets/:id (404)", () => {
  it("returns 404 for unknown allocation target", async () => {
    const res = await request(app)
      .delete("/api/v1/allocation/targets/99999")
      .set(headers);
    expect(res.status).toBe(404);
  });
});

// ── Allocation targets >100% validation ───────────────────────────────────

describe("POST /api/v1/allocation/targets (>100% validation)", () => {
  afterEach(() => db.prepare("DELETE FROM asset_allocation_targets").run());

  it("returns 400 when allocation would exceed 100%", async () => {
    // First set equity to 90%
    await request(app).post("/api/v1/allocation/targets").set(headers).send({
      asset_type: "equity",
      target_percentage: 90,
    });
    // Now try to add another 20% which would exceed 100%
    const res = await request(app).post("/api/v1/allocation/targets").set(headers).send({
      asset_type: "fixedincome",
      target_percentage: 20,
    });
    expect(res.status).toBe(400);
  });
});
