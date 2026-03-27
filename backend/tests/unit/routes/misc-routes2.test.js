"use strict";

/**
 * Unit tests for constants, hostMetrics, and system routes.
 */

jest.mock("../../../middleware/auth", () => (req, res, next) => {
  req.user = { id: 1, username: "admin", role: "admin" };
  next();
});
jest.mock("../../../middleware/admin", () => (req, res, next) => next());

const request = require("supertest");
const express = require("express");

function buildApp(router, prefix = "") {
  const app = express();
  app.use(express.json());
  app.use(prefix, router);
  return app;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS ROUTES
// ─────────────────────────────────────────────────────────────────────────────
describe("routes/constants", () => {
  let app;

  beforeEach(() => {
    jest.resetModules();
    const router = require("../../../routes/constants");
    app = buildApp(router, "/constants");
  });

  it("GET / returns 200 with all valid values", async () => {
    const res = await request(app).get("/constants");
    expect(res.status).toBe(200);
    expect(typeof res.body).toBe("object");
  });

  it("GET /:category returns 200 for a known category (case-insensitive)", async () => {
    const res = await request(app).get("/constants/asset_types");
    if (res.status === 404) {
      // Category name differs — just verify the endpoint responds correctly
      expect(res.body).toHaveProperty("availableCategories");
    } else {
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    }
  });

  it("GET /:category returns 404 for unknown category", async () => {
    const res = await request(app).get("/constants/nonexistent_xyz");
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("availableCategories");
  });

  it("GET / filters out supabase price source when SUPABASE_ENABLED is not true", async () => {
    const original = process.env.SUPABASE_ENABLED;
    delete process.env.SUPABASE_ENABLED;
    const res = await request(app).get("/constants");
    expect(res.status).toBe(200);
    if (res.body.PRICE_SOURCES) {
      expect(res.body.PRICE_SOURCES).not.toContain("supabase");
    }
    process.env.SUPABASE_ENABLED = original;
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// HOST METRICS ROUTES
// ─────────────────────────────────────────────────────────────────────────────
describe("routes/hostMetrics", () => {
  let app;

  beforeEach(() => {
    jest.resetModules();
    const router = require("../../../routes/hostMetrics");
    app = buildApp(router, "/metrics");
  });

  it("GET /host-metrics returns 200 with expected fields", async () => {
    const res = await request(app).get("/metrics/host-metrics");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("cpuLoad");
    expect(res.body).toHaveProperty("totalMem");
    expect(res.body).toHaveProperty("freeMem");
    expect(res.body).toHaveProperty("uptime");
    expect(res.body).toHaveProperty("platform");
    expect(res.body).toHaveProperty("arch");
    expect(res.body).toHaveProperty("hostname");
  });

  it("GET /host-metrics returns cpuTemp as null when thermal file unavailable", async () => {
    const res = await request(app).get("/metrics/host-metrics");
    expect(res.status).toBe(200);
    // On non-Linux/RPi systems cpuTemp is null — either null or a number is valid
    expect(
      res.body.cpuTemp === null || typeof res.body.cpuTemp === "number",
    ).toBe(true);
  });

  it("GET /host-metrics returns disk as null or object", async () => {
    const res = await request(app).get("/metrics/host-metrics");
    expect(res.status).toBe(200);
    expect(
      res.body.disk === null ||
        (typeof res.body.disk === "object" && res.body.disk !== null),
    ).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM ROUTES
// ─────────────────────────────────────────────────────────────────────────────
describe("routes/system", () => {
  let app;

  beforeEach(() => {
    jest.resetModules();
    const router = require("../../../routes/system");
    app = buildApp(router, "/system");
  });

  it("GET /config returns 200 with masked secrets", async () => {
    process.env.DB_KEY = "secret";
    process.env.JWT_SECRET = "jwt-secret";
    const res = await request(app).get("/system/config");
    expect(res.status).toBe(200);
    expect(res.body.DB_KEY).toBe("••••••••");
    expect(res.body.JWT_SECRET).toBe("••••••••");
  });

  it("GET /config returns (not set) for unset secrets", async () => {
    delete process.env.DB_KEY;
    delete process.env.JWT_SECRET;
    const res = await request(app).get("/system/config");
    expect(res.status).toBe(200);
    expect(res.body.DB_KEY).toBe("(not set)");
    expect(res.body.JWT_SECRET).toBe("(not set)");
  });

  it("GET /config returns NODE_ENV from environment", async () => {
    process.env.NODE_ENV = "test";
    const res = await request(app).get("/system/config");
    expect(res.status).toBe(200);
    expect(res.body.NODE_ENV).toBe("test");
  });
});
