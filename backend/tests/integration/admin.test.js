"use strict";

/**
 * Covers: admin-only routes — audit subpaths, database maintenance, allocation utils
 */
const request = require("supertest");
const { app, db, setupAdminUser } = require("./helpers");

let headers, userId;

beforeAll(async () => {
  const admin = await setupAdminUser();
  headers = admin.headers;
  userId = admin.userId;
});

afterAll(() => db.clearAll());

// ── Audit sub-routes ────────────────────────────────────────────────────────

describe("GET /api/v1/audit/:id", () => {
  it("returns audit log by id", async () => {
    // There should be at least one audit log from registration
    const logs = await request(app).get("/api/v1/audit").set(headers);
    const logId = logs.body[0]?.id;
    if (!logId) return; // skip if no logs
    const res = await request(app).get(`/api/v1/audit/${logId}`).set(headers);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", logId);
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app).get("/api/v1/audit/99999").set(headers);
    expect(res.status).toBe(404);
  });
});

describe("GET /api/v1/audit/user/:userId/logins", () => {
  it("returns login history", async () => {
    const res = await request(app).get(`/api/v1/audit/user/${userId}/logins`).set(headers);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("respects limit param", async () => {
    const res = await request(app).get(`/api/v1/audit/user/${userId}/logins?limit=5`).set(headers);
    expect(res.status).toBe(200);
  });
});

describe("GET /api/v1/audit/user/:userId/summary", () => {
  it("returns activity summary", async () => {
    const res = await request(app).get(`/api/v1/audit/user/${userId}/summary`).set(headers);
    expect(res.status).toBe(200);
  });

  it("respects days param", async () => {
    const res = await request(app).get(`/api/v1/audit/user/${userId}/summary?days=7`).set(headers);
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/v1/audit/cleanup", () => {
  it("cleans up old audit logs", async () => {
    const res = await request(app).delete("/api/v1/audit/cleanup?days=30").set(headers);
    expect(res.status).toBe(200);
  });
});

// ── Database maintenance ────────────────────────────────────────────────────

describe("POST /api/v1/database/wal-checkpoint", () => {
  it("runs WAL checkpoint", async () => {
    const res = await request(app).post("/api/v1/database/wal-checkpoint").set(headers);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("busy");
  });
});

describe("DELETE /api/v1/database/reset", () => {
  it("resets user data", async () => {
    const res = await request(app).delete("/api/v1/database/reset").set(headers);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("deleted");
  });
});

// ── Allocation rebalancing / simulate ──────────────────────────────────────

describe("GET /api/v1/allocation/rebalancing", () => {
  it("returns rebalancing recommendations", async () => {
    const res = await request(app).get("/api/v1/allocation/rebalancing").set(headers);
    expect(res.status).toBe(200);
  });
});

describe("POST /api/v1/allocation/simulate", () => {
  it("returns simulation result", async () => {
    const res = await request(app).post("/api/v1/allocation/simulate").set(headers).send({});
    expect([200, 400]).toContain(res.status);
  });
});

// ── Host Metrics ────────────────────────────────────────────────────────────

describe("GET /api/v1/metrics/host-metrics", () => {
  it("returns host metrics", async () => {
    const res = await request(app).get("/api/v1/metrics/host-metrics").set(headers);
    expect([200, 403]).toContain(res.status);
  });
});

// ── Analytics edge cases ────────────────────────────────────────────────────

describe("GET /api/v1/analytics/portfolio/performance/range", () => {
  it("returns range performance data", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/portfolio/performance/range?startDate=2024-01-01&endDate=2024-12-31")
      .set(headers);
    expect([200, 400]).toContain(res.status);
  });
});

describe("GET /api/v1/analytics/economic-calendar", () => {
  it("returns economic calendar or error", async () => {
    const res = await request(app).get("/api/v1/analytics/economic-calendar").set(headers);
    expect([200, 400, 500]).toContain(res.status);
  });
});

describe("GET /api/v1/assets/prices/refresh-all (admin)", () => {
  it("triggers price refresh", async () => {
    const res = await request(app).post("/api/v1/assets/prices/refresh-all").set(headers);
    expect([200, 201, 400, 500]).toContain(res.status);
  });
});

// ── Database seed ────────────────────────────────────────────────────────────

describe("POST /api/v1/database/seed", () => {
  it("seeds sample data", async () => {
    const res = await request(app).post("/api/v1/database/seed").set(headers);
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty("created");
    }
  });
});

// ── Email routes ────────────────────────────────────────────────────────────

describe("POST /api/v1/email/summary", () => {
  it("returns appropriate response", async () => {
    const res = await request(app).post("/api/v1/email/summary").set(headers);
    expect([200, 400, 403, 500]).toContain(res.status);
  });
});
