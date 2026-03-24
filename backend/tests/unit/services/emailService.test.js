"use strict";

// mockSendMail / mockVerify are defined before jest.mock so the factory can close over them.
const mockSendMail = jest.fn();
const mockVerify = jest.fn();
const mockTransporter = { sendMail: mockSendMail, verify: mockVerify };

jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => mockTransporter),
}));
jest.mock("../../../models/AuditLog");
jest.mock("../../../utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const nodemailer = require("nodemailer");
const AuditLog = require("../../../models/AuditLog");
// EmailService is a singleton; require it once
const emailService = require("../../../services/emailService");

beforeEach(() => {
  jest.clearAllMocks();
  // Reset singleton state between tests
  emailService.transporter = null;
  emailService.enabled = false;
});

// ── EMAIL_ENABLED = false ─────────────────────────────────────────────────

describe("EmailService — disabled", () => {
  it("sendEmail returns disabled message without calling transporter", async () => {
    const result = await emailService.sendEmail("a@b.com", "Subject", "<p>body</p>");
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/disabled/i);
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("verifyConnection returns false", async () => {
    expect(await emailService.verifyConnection()).toBe(false);
  });

  it("getTransporter returns null", () => {
    expect(emailService.getTransporter()).toBeNull();
  });
});

// ── EMAIL_ENABLED = true ─────────────────────────────────────────────────

describe("EmailService — enabled", () => {
  beforeEach(() => {
    emailService.enabled = true;
    emailService.transporter = null; // force fresh createTransport call
  });

  it("getTransporter creates and caches the transporter", () => {
    const t1 = emailService.getTransporter();
    const t2 = emailService.getTransporter();
    expect(nodemailer.createTransport).toHaveBeenCalledTimes(1);
    expect(t1).toBe(t2);
  });

  it("sendEmail sends mail and returns success", async () => {
    mockSendMail.mockResolvedValue({ messageId: "msg-001" });
    const result = await emailService.sendEmail("b@b.com", "Sub", "<p>hi</p>");
    expect(result.success).toBe(true);
    expect(result.messageId).toBe("msg-001");
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "b@b.com", subject: "Sub" }),
    );
  });

  it("sendEmail returns failure when transporter.sendMail throws", async () => {
    mockSendMail.mockRejectedValue(new Error("SMTP error"));
    const result = await emailService.sendEmail("c@c.com", "Sub", "<p>hi</p>");
    expect(result.success).toBe(false);
    expect(result.message).toBe("SMTP error");
  });

  it("sendEmail creates audit log when auditInfo provided", async () => {
    mockSendMail.mockResolvedValue({ messageId: "audit-001" });
    AuditLog.create.mockReturnValue(undefined);

    await emailService.sendEmail("d@d.com", "Sub", "<p>hi</p>", {
      userId: 1,
      username: "alice",
      trigger: "portfolio_summary_sent",
    });

    expect(AuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ action_type: "email_sent" }),
    );
  });

  it("sendEmail does not fail if audit log throws", async () => {
    mockSendMail.mockResolvedValue({ messageId: "x" });
    AuditLog.create.mockImplementation(() => { throw new Error("db error"); });

    const result = await emailService.sendEmail("e@e.com", "Sub", "<p>hi</p>", {
      userId: 1,
      username: "alice",
    });
    expect(result.success).toBe(true);
  });

  it("verifyConnection returns true when verify succeeds", async () => {
    mockVerify.mockResolvedValue(true);
    expect(await emailService.verifyConnection()).toBe(true);
  });

  it("verifyConnection returns false when verify throws", async () => {
    mockVerify.mockRejectedValue(new Error("unreachable"));
    expect(await emailService.verifyConnection()).toBe(false);
  });

  it("sendEmail returns failure when getTransporter returns null (lines 39-40)", async () => {
    jest.spyOn(emailService, "getTransporter").mockReturnValue(null);
    const result = await emailService.sendEmail("a@b.com", "Sub", "<p>hi</p>");
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/not configured/i);
  });

  it("verifyConnection returns false when getTransporter returns null (line 91)", async () => {
    jest.spyOn(emailService, "getTransporter").mockReturnValue(null);
    expect(await emailService.verifyConnection()).toBe(false);
  });
});
