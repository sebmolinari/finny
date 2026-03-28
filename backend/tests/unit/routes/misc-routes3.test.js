"use strict";

/**
 * Unit tests for notifications and constants route error paths.
 */

jest.mock("../../../middleware/auth", () => (req, res, next) => {
  req.user = { id: 1, username: "admin", role: "admin" };
  next();
});
jest.mock("../../../middleware/admin", () => (req, res, next) => next());
jest.mock("../../../models/Notification");
jest.mock("../../../models/AuditLog");

const request = require("supertest");
const express = require("express");
const Notification = require("../../../models/Notification");
const AuditLog = require("../../../models/AuditLog");

const DB_ERR = new Error("database exploded");

function buildApp(router, prefix = "") {
  const app = express();
  app.use(express.json());
  app.use(prefix, router);
  return app;
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS ROUTES — error paths
// ─────────────────────────────────────────────────────────────────────────────
describe("routes/notifications — error paths", () => {
  let app;

  beforeEach(() => {
    jest.resetAllMocks();
    const notificationsRouter = require("../../../routes/notifications");
    app = buildApp(notificationsRouter, "/notifications");

    Notification.getByUser.mockReturnValue([]);
    Notification.getUnreadCount.mockReturnValue(0);
    Notification.markAllRead.mockReturnValue(3);
    Notification.markRead.mockReturnValue(1);
    Notification.deleteAll.mockReturnValue(5);
    AuditLog.logUpdate.mockReturnValue(undefined);
    AuditLog.logDelete.mockReturnValue(undefined);
  });

  it("GET / returns 200 on success", async () => {
    expect((await request(app).get("/notifications")).status).toBe(200);
  });

  it("GET / returns 500 on error (line 66)", async () => {
    Notification.getByUser.mockImplementation(() => {
      throw DB_ERR;
    });
    expect((await request(app).get("/notifications")).status).toBe(500);
  });

  it("PATCH /read-all returns 200 on success", async () => {
    expect((await request(app).patch("/notifications/read-all")).status).toBe(200);
  });

  it("PATCH /read-all returns 500 on error (line 105)", async () => {
    Notification.markAllRead.mockImplementation(() => {
      throw DB_ERR;
    });
    expect((await request(app).patch("/notifications/read-all")).status).toBe(500);
  });

  it("PATCH /:id/read returns 200 on success", async () => {
    expect((await request(app).patch("/notifications/1/read")).status).toBe(200);
  });

  it("PATCH /:id/read returns 404 when notification not found", async () => {
    Notification.markRead.mockReturnValue(0);
    expect((await request(app).patch("/notifications/999/read")).status).toBe(404);
  });

  it("PATCH /:id/read returns 500 on error (line 156)", async () => {
    Notification.markRead.mockImplementation(() => {
      throw DB_ERR;
    });
    expect((await request(app).patch("/notifications/1/read")).status).toBe(500);
  });

  it("DELETE /admin/purge returns 200 on success", async () => {
    expect((await request(app).delete("/notifications/admin/purge")).status).toBe(200);
  });

  it("DELETE /admin/purge returns 500 on error (line 199)", async () => {
    Notification.deleteAll.mockImplementation(() => {
      throw DB_ERR;
    });
    expect(
      (await request(app).delete("/notifications/admin/purge")).status,
    ).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS ROUTES — error paths (lines 28, 73)
// These require mocking validValues to trigger exceptions in the try blocks.
// ─────────────────────────────────────────────────────────────────────────────
describe("routes/constants — error paths when PRICE_SOURCES is broken", () => {
  let app;

  beforeEach(() => {
    jest.resetModules();
    // Mock validValues so that PRICE_SOURCES exists but has no .filter method,
    // causing an error when SUPABASE_ENABLED !== "true" tries to filter it.
    jest.mock("../../../constants/validValues", () => ({
      VALID_VALUES: { PRICE_SOURCES: true },
    }));
    // Re-mock auth/admin since resetModules cleared the registry
    jest.mock("../../../middleware/auth", () => (req, res, next) => {
      req.user = { id: 1, username: "admin", role: "admin" };
      next();
    });
    jest.mock("../../../middleware/admin", () => (req, res, next) => next());

    const constantsRouter = require("../../../routes/constants");
    const appInstance = express();
    appInstance.use(express.json());
    appInstance.use("/constants", constantsRouter);
    app = appInstance;

    // Ensure SUPABASE_ENABLED is not "true" so the filter branch runs
    delete process.env.SUPABASE_ENABLED;
  });

  it("GET / returns 500 when PRICE_SOURCES.filter throws (line 28)", async () => {
    const res = await request(app).get("/constants");
    expect(res.status).toBe(500);
  });

  it("GET /PRICE_SOURCES returns 500 when values.filter throws (line 73)", async () => {
    const res = await request(app).get("/constants/PRICE_SOURCES");
    expect(res.status).toBe(500);
  });
});
