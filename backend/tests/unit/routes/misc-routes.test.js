"use strict";

/**
 * Unit tests for error-path branches in: audit, brokers, settings, users routes.
 * All mocks are at the top level so Jest's hoist works correctly.
 */

jest.mock("../../../middleware/auth", () => (req, res, next) => {
  req.user = { id: 1, username: "admin", role: "admin" };
  next();
});
jest.mock("../../../middleware/admin", () => (req, res, next) => next());
jest.mock("../../../models/AuditLog");
jest.mock("../../../models/Broker");
jest.mock("../../../models/UserSettings");
jest.mock("../../../models/User");

const request = require("supertest");
const express = require("express");
const AuditLog = require("../../../models/AuditLog");
const Broker = require("../../../models/Broker");
const UserSettings = require("../../../models/UserSettings");
const User = require("../../../models/User");

const DB_ERR = new Error("database exploded");

function buildApp(router, prefix = "") {
  const app = express();
  app.use(express.json());
  app.use(prefix, router);
  return app;
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT ROUTES
// ─────────────────────────────────────────────────────────────────────────────
describe("routes/audit — error paths", () => {
  let app;

  beforeEach(() => {
    jest.resetAllMocks();
    const auditRouter = require("../../../routes/audit");
    app = buildApp(auditRouter, "/audit");
    AuditLog.findAll.mockReturnValue([]);
    AuditLog.findById.mockReturnValue(null);
    AuditLog.getLoginHistory.mockReturnValue([]);
    AuditLog.getUserActivitySummary.mockReturnValue({});
    AuditLog.deleteOlderThan.mockReturnValue({ deleted: 0 });
  });

  it("GET / returns 200 on success", async () => {
    AuditLog.findAll.mockReturnValue([{ id: 1 }]);
    expect((await request(app).get("/audit")).status).toBe(200);
  });

  it("GET / returns 200 with filter params (covers all branch conditions)", async () => {
    AuditLog.findAll.mockReturnValue([]);
    const res = await request(app).get(
      "/audit?user_id=1&action_type=login&table_name=users&start_date=2024-01-01&end_date=2024-12-31&success=true&limit=10",
    );
    expect(res.status).toBe(200);
  });

  it("GET / returns 500 on error", async () => {
    AuditLog.findAll.mockImplementation(() => {
      throw DB_ERR;
    });
    expect((await request(app).get("/audit")).status).toBe(500);
  });

  it("GET /:id returns 404 when not found", async () => {
    AuditLog.findById.mockReturnValue(null);
    expect((await request(app).get("/audit/999")).status).toBe(404);
  });

  it("GET /:id returns 200 when found", async () => {
    AuditLog.findById.mockReturnValue({ id: 1, action: "login" });
    expect((await request(app).get("/audit/1")).status).toBe(200);
  });

  it("GET /:id returns 500 on error", async () => {
    AuditLog.findById.mockImplementation(() => {
      throw DB_ERR;
    });
    expect((await request(app).get("/audit/1")).status).toBe(500);
  });

  it("GET /user/:userId/logins returns 200", async () => {
    AuditLog.getLoginHistory.mockReturnValue([{ id: 1 }]);
    expect((await request(app).get("/audit/user/1/logins")).status).toBe(200);
  });

  it("GET /user/:userId/logins returns 500 on error", async () => {
    AuditLog.getLoginHistory.mockImplementation(() => {
      throw DB_ERR;
    });
    expect((await request(app).get("/audit/user/1/logins")).status).toBe(500);
  });

  it("GET /user/:userId/summary returns 200", async () => {
    AuditLog.getUserActivitySummary.mockReturnValue({ total: 5 });
    expect((await request(app).get("/audit/user/1/summary")).status).toBe(200);
  });

  it("GET /user/:userId/summary returns 500 on error", async () => {
    AuditLog.getUserActivitySummary.mockImplementation(() => {
      throw DB_ERR;
    });
    expect((await request(app).get("/audit/user/1/summary")).status).toBe(500);
  });

  it("DELETE /cleanup returns 400 when days missing", async () => {
    expect((await request(app).delete("/audit/cleanup")).status).toBe(400);
  });

  it("DELETE /cleanup returns 200 on success", async () => {
    AuditLog.deleteOlderThan.mockReturnValue({ deleted: 5 });
    expect((await request(app).delete("/audit/cleanup?days=30")).status).toBe(
      200,
    );
  });

  it("DELETE /cleanup returns 500 on error", async () => {
    AuditLog.deleteOlderThan.mockImplementation(() => {
      throw DB_ERR;
    });
    expect((await request(app).delete("/audit/cleanup?days=30")).status).toBe(
      500,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BROKERS ROUTES
// ─────────────────────────────────────────────────────────────────────────────
describe("routes/brokers — error paths", () => {
  let app;

  beforeEach(() => {
    jest.resetAllMocks();
    const brokersRouter = require("../../../routes/brokers");
    app = buildApp(brokersRouter, "/brokers");
    Broker.findByUser.mockReturnValue([]);
    Broker.findById.mockReturnValue({ id: 1, name: "Test", user_id: 1 });
    Broker.create.mockReturnValue(1);
    Broker.update.mockReturnValue({ id: 1, name: "Updated" });
    Broker.delete.mockReturnValue(true);
  });

  it("GET / returns 200 on success", async () => {
    Broker.findByUser.mockReturnValue([{ id: 1, name: "A" }]);
    expect((await request(app).get("/brokers")).status).toBe(200);
  });

  it("GET / returns 500 on error", async () => {
    Broker.findByUser.mockImplementation(() => {
      throw DB_ERR;
    });
    expect((await request(app).get("/brokers")).status).toBe(500);
  });

  it("GET /:id returns 404 when not found", async () => {
    Broker.findById.mockReturnValue(null);
    expect((await request(app).get("/brokers/999")).status).toBe(404);
  });

  it("GET /:id returns 500 on error", async () => {
    Broker.findById.mockImplementation(() => {
      throw DB_ERR;
    });
    expect((await request(app).get("/brokers/1")).status).toBe(500);
  });

  it("PUT /:id returns 404 when not found", async () => {
    Broker.findById.mockReturnValue(null);
    expect(
      (await request(app).put("/brokers/999").send({ name: "X" })).status,
    ).toBe(404);
  });

  it("PUT /:id returns 500 on error", async () => {
    Broker.findById.mockReturnValueOnce({ id: 1, name: "Old" });
    Broker.update.mockImplementation(() => {
      throw DB_ERR;
    });
    expect(
      (await request(app).put("/brokers/1").send({ name: "New" })).status,
    ).toBe(500);
  });

  it("DELETE /:id returns 404 when not found", async () => {
    Broker.findById.mockReturnValue(null);
    expect((await request(app).delete("/brokers/999")).status).toBe(404);
  });

  it("DELETE /:id returns 500 on error", async () => {
    Broker.delete.mockImplementation(() => {
      throw DB_ERR;
    });
    expect((await request(app).delete("/brokers/1")).status).toBe(500);
  });

  it("DELETE /:id returns 400 when broker has associated transactions", async () => {
    Broker.delete.mockReturnValue(false);
    expect((await request(app).delete("/brokers/1")).status).toBe(400);
  });

  it("POST / returns 400 on UNIQUE constraint error", async () => {
    Broker.create.mockImplementation(() => {
      throw new Error("UNIQUE constraint failed: brokers.name");
    });
    expect((await request(app).post("/brokers").send({ name: "Dup" })).status).toBe(400);
  });

  it("POST / returns 500 on non-UNIQUE error", async () => {
    Broker.create.mockImplementation(() => {
      throw new Error("database exploded");
    });
    expect((await request(app).post("/brokers").send({ name: "X" })).status).toBe(500);
  });

  it("POST / with active: false covers the false branch of ternary (line 118)", async () => {
    // active = false → active ? 1 : 0 → 0
    expect(
      (await request(app).post("/brokers").send({ name: "Test", active: false })).status,
    ).toBe(201);
  });

  it("PUT /:id with active: false covers the false branch of ternary (line 205)", async () => {
    Broker.findById
      .mockReturnValueOnce({ id: 1, name: "Old" })
      .mockReturnValueOnce({ id: 1, name: "Updated" });
    expect(
      (await request(app).put("/brokers/1").send({ name: "Test", active: false })).status,
    ).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS ROUTES
// ─────────────────────────────────────────────────────────────────────────────
describe("routes/settings — error paths", () => {
  let app;

  beforeEach(() => {
    jest.resetAllMocks();
    const settingsRouter = require("../../../routes/settings");
    app = buildApp(settingsRouter, "/settings");
    UserSettings.findByUserId.mockReturnValue({
      user_id: 1,
      date_format: "DD/MM/YYYY",
      timezone: "UTC",
      validate_cash_balance: 1,
      validate_sell_balance: 1,
      email_notifications_enabled: 0,
      rebalancing_tolerance: 5,
    });
    UserSettings.update.mockReturnValue({ user_id: 1 });
    UserSettings.markSettingsReviewed.mockReturnValue(true);
    UserSettings.markOnboardingComplete.mockReturnValue(true);
  });

  it("GET / returns 200 on success", async () => {
    expect((await request(app).get("/settings")).status).toBe(200);
  });

  it("GET / returns 404 when settings not found", async () => {
    UserSettings.findByUserId.mockReturnValue(null);
    expect((await request(app).get("/settings")).status).toBe(404);
  });

  it("GET / returns 500 on error", async () => {
    UserSettings.findByUserId.mockImplementation(() => {
      throw DB_ERR;
    });
    expect((await request(app).get("/settings")).status).toBe(500);
  });

  it("PUT / returns 404 when settings not found", async () => {
    UserSettings.findByUserId.mockReturnValue(null);
    expect((await request(app).put("/settings").send({})).status).toBe(404);
  });

  it("PUT / returns 500 on error", async () => {
    UserSettings.update.mockImplementation(() => {
      throw DB_ERR;
    });
    expect((await request(app).put("/settings").send({})).status).toBe(500);
  });

  it("POST /reviewed returns 500 on error", async () => {
    UserSettings.markSettingsReviewed.mockImplementation(() => {
      throw DB_ERR;
    });
    expect((await request(app).post("/settings/reviewed")).status).toBe(500);
  });

  it("POST /onboarding-complete returns 500 on error", async () => {
    UserSettings.markOnboardingComplete.mockImplementation(() => {
      throw DB_ERR;
    });
    expect(
      (await request(app).post("/settings/onboarding-complete")).status,
    ).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// USERS ROUTES
// ─────────────────────────────────────────────────────────────────────────────
describe("routes/users — error paths", () => {
  let app;

  beforeEach(() => {
    jest.resetAllMocks();
    const usersRouter = require("../../../routes/users");
    app = buildApp(usersRouter, "/users");
    User.getAll.mockReturnValue([]);
    User.findById.mockReturnValue({
      id: 2,
      username: "bob",
      role: "user",
      active: 1,
    });
    User.updateStatus.mockReturnValue({ id: 2, active: 0 });
    User.updateRole.mockReturnValue({ id: 2, role: "admin" });
    User.deleteById.mockReturnValue(true);
    User.create.mockReturnValue(2);
  });

  it("GET / returns 200 on success", async () => {
    User.getAll.mockReturnValue([{ id: 2, username: "bob" }]);
    expect((await request(app).get("/users")).status).toBe(200);
  });

  it("GET / returns 500 on error", async () => {
    User.getAll.mockImplementation(() => {
      throw DB_ERR;
    });
    expect((await request(app).get("/users")).status).toBe(500);
  });

  it("PATCH /:id/status returns 404 when user not found", async () => {
    User.findById.mockReturnValue(null);
    expect(
      (await request(app).patch("/users/999/status").send({ active: 0 }))
        .status,
    ).toBe(404);
  });

  it("PATCH /:id/status returns 500 on error", async () => {
    User.updateStatus.mockImplementation(() => {
      throw DB_ERR;
    });
    expect(
      (await request(app).patch("/users/2/status").send({ active: 0 })).status,
    ).toBe(500);
  });

  it("PATCH /:id/role returns 404 when user not found", async () => {
    User.findById.mockReturnValue(null);
    expect(
      (await request(app).patch("/users/999/role").send({ role: "admin" }))
        .status,
    ).toBe(404);
  });

  it("PATCH /:id/role returns 500 on error", async () => {
    User.findById.mockReturnValueOnce({ id: 2 });
    User.updateRole.mockImplementation(() => {
      throw DB_ERR;
    });
    expect(
      (await request(app).patch("/users/2/role").send({ role: "admin" }))
        .status,
    ).toBe(500);
  });

  it("DELETE /:id returns 404 when user not found", async () => {
    User.findById.mockReturnValue(null);
    expect((await request(app).delete("/users/999")).status).toBe(404);
  });

  it("DELETE /:id returns 500 on error", async () => {
    User.findById.mockReturnValueOnce({ id: 2, username: "bob" });
    User.deleteById.mockImplementation(() => {
      throw DB_ERR;
    });
    expect((await request(app).delete("/users/2")).status).toBe(500);
  });

  it("PATCH /:id/status returns 400 when disabling yourself", async () => {
    // req.user.id is 1; patching id 1 triggers self-disable check
    expect((await request(app).patch("/users/1/status").send({ active: 0 })).status).toBe(400);
  });

  it("PATCH /:id/role returns 400 when changing your own role", async () => {
    expect((await request(app).patch("/users/1/role").send({ role: "user" })).status).toBe(400);
  });

  it("PATCH /:id/status succeeds — covers active=true branch (lines 121,131-148)", async () => {
    // active = true/1 → activeValue = 1, logger 'enabled', AuditLog.logUpdate
    AuditLog.logUpdate.mockReturnValue(undefined);
    const res = await request(app).patch("/users/2/status").send({ active: 1 });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/enabled/);
  });

  it("PATCH /:id/status succeeds — covers active=false branch (lines 121,131-148)", async () => {
    // active = 0 → activeValue = 0, logger 'disabled'
    AuditLog.logUpdate.mockReturnValue(undefined);
    const res = await request(app).patch("/users/2/status").send({ active: 0 });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/disabled/);
  });

  it("PATCH /:id/role succeeds — updatedUser.role===role covers ternary true branch (line 230)", async () => {
    // updatedUser.role = "user" (from mock), role = "user" → ternary true branch → oldRole = "user"
    AuditLog.logUpdate.mockReturnValue(undefined);
    const res = await request(app).patch("/users/2/role").send({ role: "user" });
    expect(res.status).toBe(200);
  });

  it("PATCH /:id/role succeeds — updatedUser.role!==role covers ternary false branch (line 230)", async () => {
    // updatedUser.role = "user" (from mock), role = "admin" → ternary false branch → oldRole = "user"
    AuditLog.logUpdate.mockReturnValue(undefined);
    const res = await request(app).patch("/users/2/role").send({ role: "admin" });
    expect(res.status).toBe(200);
  });
});
