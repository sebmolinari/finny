"use strict";

/**
 * Unit tests for routes/auth.js — branch coverage for uncovered error paths.
 */

jest.mock("../../../middleware/auth", () => (req, res, next) => {
  req.user = { id: 1, username: "admin", role: "admin" };
  next();
});
jest.mock("../../../models/User");
jest.mock("../../../models/UserSettings");
jest.mock("../../../models/AuditLog");
jest.mock("../../../services/authService");
jest.mock("../../../utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const request = require("supertest");
const express = require("express");
const User = require("../../../models/User");
const UserSettings = require("../../../models/UserSettings");
const AuditLog = require("../../../models/AuditLog");

const DB_ERR = new Error("database exploded");

function buildApp() {
  const app = express();
  app.use(express.json());
  // Error-handling middleware so next(error) is caught
  const authRouter = require("../../../routes/auth");
  app.use("/auth", authRouter);
  app.use((err, _req, res, _next) => {
    res.status(500).json({ message: err.message });
  });
  return app;
}

let app;

beforeEach(() => {
  jest.resetAllMocks();
  app = buildApp();

  User.findById.mockReturnValue({
    id: 1,
    username: "admin",
    email: "admin@test.com",
    role: "admin",
  });
  UserSettings.findByUserId.mockReturnValue({
    timezone: "UTC",
    onboarding_completed: 1,
  });
  AuditLog.logLogout.mockReturnValue(undefined);
  AuditLog.logLogin.mockReturnValue(undefined);
});

// ── GET /auth/me ───────────────────────────────────────────────────────────

describe("GET /auth/me", () => {
  it("returns 200 on success", async () => {
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe("admin");
  });

  it("returns 404 when user not found", async () => {
    User.findById.mockReturnValue(null);
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(404);
  });

  it("calls next(error) when User.findById throws — covers line 151", async () => {
    User.findById.mockImplementation(() => { throw DB_ERR; });
    const res = await request(app).get("/auth/me");
    // next(error) passes to error handler which returns 500
    expect(res.status).toBe(500);
  });

  it("handles null UserSettings gracefully (optional chaining branch)", async () => {
    UserSettings.findByUserId.mockReturnValue(null);
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(200);
    expect(res.body.user.onboarding_completed).toBe(0);
  });
});
