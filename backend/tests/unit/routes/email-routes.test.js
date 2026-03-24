"use strict";

/**
 * Unit tests for routes/email.js — branch coverage.
 */

jest.mock("../../../middleware/auth", () => (req, res, next) => {
  req.user = { id: 1, username: "admin", role: "admin" };
  next();
});
jest.mock("../../../models/User");
jest.mock("../../../services/emailService");
jest.mock("../../../services/portfolioEmailService");

const request = require("supertest");
const express = require("express");
const User = require("../../../models/User");
const emailService = require("../../../services/emailService");
const PortfolioEmailService = require("../../../services/portfolioEmailService");

const DB_ERR = new Error("database exploded");

function buildApp() {
  const app = express();
  app.use(express.json());
  const emailRouter = require("../../../routes/email");
  app.use("/email", emailRouter);
  return app;
}

let app;

beforeEach(() => {
  jest.resetAllMocks();
  app = buildApp();

  User.findById.mockReturnValue({ id: 1, username: "admin", email: "admin@test.com" });
  PortfolioEmailService.generatePortfolioSummaryEmail = jest.fn().mockReturnValue({
    subject: "Portfolio Summary",
    html: "<p>Test</p>",
  });
  emailService.sendEmail = jest.fn().mockResolvedValue({ success: true });
  PortfolioEmailService.sendBatchEmails = jest.fn().mockResolvedValue({
    sent: 1,
    failed: 0,
  });
});

// ── POST /email/summary ───────────────────────────────────────────────────

describe("POST /email/summary", () => {
  it("returns 400 when EMAIL_ENABLED is not true", async () => {
    const old = process.env.EMAIL_ENABLED;
    process.env.EMAIL_ENABLED = "false";
    const res = await request(app).post("/email/summary");
    expect(res.status).toBe(400);
    process.env.EMAIL_ENABLED = old;
  });

  it("returns 400 when user not found", async () => {
    const old = process.env.EMAIL_ENABLED;
    process.env.EMAIL_ENABLED = "true";
    User.findById.mockReturnValue(null);
    const res = await request(app).post("/email/summary");
    expect(res.status).toBe(400);
    process.env.EMAIL_ENABLED = old;
  });

  it("returns 400 when user has no email", async () => {
    const old = process.env.EMAIL_ENABLED;
    process.env.EMAIL_ENABLED = "true";
    User.findById.mockReturnValue({ id: 1, username: "admin", email: null });
    const res = await request(app).post("/email/summary");
    expect(res.status).toBe(400);
    process.env.EMAIL_ENABLED = old;
  });

  it("returns 500 when generatePortfolioSummaryEmail returns null", async () => {
    const old = process.env.EMAIL_ENABLED;
    process.env.EMAIL_ENABLED = "true";
    PortfolioEmailService.generatePortfolioSummaryEmail.mockReturnValue(null);
    const res = await request(app).post("/email/summary");
    expect(res.status).toBe(500);
    process.env.EMAIL_ENABLED = old;
  });

  it("returns 200 when email sent successfully", async () => {
    const old = process.env.EMAIL_ENABLED;
    process.env.EMAIL_ENABLED = "true";
    const res = await request(app).post("/email/summary");
    expect(res.status).toBe(200);
    process.env.EMAIL_ENABLED = old;
  });

  it("returns 500 when sendEmail returns success=false", async () => {
    const old = process.env.EMAIL_ENABLED;
    process.env.EMAIL_ENABLED = "true";
    emailService.sendEmail.mockResolvedValue({ success: false, message: "SMTP error" });
    const res = await request(app).post("/email/summary");
    expect(res.status).toBe(500);
    process.env.EMAIL_ENABLED = old;
  });

  it("returns 500 on thrown error", async () => {
    const old = process.env.EMAIL_ENABLED;
    process.env.EMAIL_ENABLED = "true";
    User.findById.mockImplementation(() => { throw DB_ERR; });
    const res = await request(app).post("/email/summary");
    expect(res.status).toBe(500);
    process.env.EMAIL_ENABLED = old;
  });
});

// ── POST /email/batch ─────────────────────────────────────────────────────

describe("POST /email/batch", () => {
  it("returns 200 on success", async () => {
    const res = await request(app).post("/email/batch");
    expect(res.status).toBe(200);
  });

  it("returns 500 on error", async () => {
    PortfolioEmailService.sendBatchEmails.mockRejectedValue(DB_ERR);
    const res = await request(app).post("/email/batch");
    expect(res.status).toBe(500);
  });
});
