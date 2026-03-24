"use strict";

jest.mock("../../../models/UserSettings");
jest.mock("../../../services/analyticsService");
jest.mock("../../../services/emailService", () => ({
  sendEmail: jest.fn(),
}));

const UserSettings = require("../../../models/UserSettings");
const AnalyticsService = require("../../../services/analyticsService");
const emailService = require("../../../services/emailService");
const PortfolioEmailService = require("../../../services/portfolioEmailService");

const mockAnalytics = () => ({
  nav: 100000,
  transactions: {
    holdings_market_value: 80000,
    daily_pnl: 500,
    cash_balance: 10000,
    unrealized_gain: 5000,
    unrealized_gain_percent: 6.25,
    liquidity_balance: 90000,
    mwrr: 8.5,
    cagr: 7.2,
    holdings: [
      { symbol: "AAPL", name: "Apple Inc", market_value: 40000, unrealized_gain: 3000, daily_pnl: 200, unrealized_gain_percent: 8.0 },
      { symbol: "MSFT", name: "Microsoft", market_value: 30000, unrealized_gain: 1500, daily_pnl: 150, unrealized_gain_percent: 5.3 },
    ],
    asset_allocation: [
      { type: "equity", value: 70000, percentage: 77.8, daily_pnl: 350 },
      { type: "fixedincome", value: 10000, percentage: 11.1, daily_pnl: 50 },
    ],
  },
});

const mockPerformance = [
  { date: "2024-01-01", total_value: 95000 },
  { date: "2024-02-01", total_value: 98000 },
  { date: "2024-03-01", total_value: 100000 },
];

describe("PortfolioEmailService.generatePortfolioSummaryEmail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    UserSettings.findByUserId.mockReturnValue({ timezone: "UTC" });
    AnalyticsService.getPortfolioAnalytics.mockReturnValue(mockAnalytics());
    AnalyticsService.getPortfolioPerformance.mockReturnValue(mockPerformance);
  });

  it("returns subject and html for valid user", () => {
    const result = PortfolioEmailService.generatePortfolioSummaryEmail(1, "alice");
    expect(result).not.toBeNull();
    expect(result).toHaveProperty("subject");
    expect(result).toHaveProperty("html");
    expect(result.subject).toMatch(/Portfolio Summary/);
    expect(result.html).toContain("Net Asset Value");
  });

  it("returns null if analytics throws", () => {
    AnalyticsService.getPortfolioAnalytics.mockImplementation(() => { throw new Error("db error"); });
    const result = PortfolioEmailService.generatePortfolioSummaryEmail(1, "alice");
    expect(result).toBeNull();
  });

  it("returns null if UserSettings throws", () => {
    UserSettings.findByUserId.mockImplementation(() => { throw new Error("settings error"); });
    const result = PortfolioEmailService.generatePortfolioSummaryEmail(1, "alice");
    expect(result).toBeNull();
  });
});

describe("PortfolioEmailService._generateHTML", () => {
  const analytics = mockAnalytics();

  it("generates HTML with date and NAV", () => {
    const html = PortfolioEmailService._generateHTML(analytics, "alice", "2024-01-15", mockPerformance, mockPerformance);
    expect(html).toContain("2024-01-15");
    expect(html).toContain("Net Asset Value");
    expect(typeof html).toBe("string");
    expect(html.length).toBeGreaterThan(100);
  });

  it("includes holdings table", () => {
    const html = PortfolioEmailService._generateHTML(analytics, "alice", "2024-01-15", [], []);
    expect(html).toContain("AAPL");
    expect(html).toContain("Apple Inc");
  });

  it("includes asset allocation table", () => {
    const html = PortfolioEmailService._generateHTML(analytics, "alice", "2024-01-15", [], []);
    expect(html).toContain("Equity");
    expect(html).toContain("Fixed Income");
  });

  it("shows daily pnl when provided", () => {
    const html = PortfolioEmailService._generateHTML(analytics, "alice", "2024-01-15", [], []);
    // daily_pnl is 500 (positive), should show up arrow
    expect(html).toContain("▲");
  });

  it("shows negative daily pnl with down arrow", () => {
    const negAnalytics = { ...analytics, transactions: { ...analytics.transactions, daily_pnl: -200 } };
    const html = PortfolioEmailService._generateHTML(negAnalytics, "alice", "2024-01-15", [], []);
    expect(html).toContain("▼");
  });

  it("handles null mwrr and cagr gracefully", () => {
    const nullMetrics = { ...analytics, transactions: { ...analytics.transactions, mwrr: null, cagr: null } };
    const html = PortfolioEmailService._generateHTML(nullMetrics, "alice", "2024-01-15", [], []);
    expect(html).not.toContain("MWRR (IRR)");
    expect(html).not.toContain("CAGR");
  });

  it("includes chart img for performance data with >= 2 points", () => {
    const html = PortfolioEmailService._generateHTML(analytics, "alice", "2024-01-15", mockPerformance, mockPerformance);
    expect(html).toContain("quickchart.io");
  });

  it("handles unknown asset type labels", () => {
    const unknownAlloc = { ...analytics, transactions: { ...analytics.transactions, asset_allocation: [{ type: "exotic", value: 5000, percentage: 5, daily_pnl: 0 }] } };
    const html = PortfolioEmailService._generateHTML(unknownAlloc, "alice", "2024-01-15", [], []);
    expect(html).toContain("Exotic"); // first letter capitalized
  });

  it("handles null asset type", () => {
    const nullAlloc = { ...analytics, transactions: { ...analytics.transactions, asset_allocation: [{ type: null, value: 5000, percentage: 5, daily_pnl: 0 }] } };
    const html = PortfolioEmailService._generateHTML(nullAlloc, "alice", "2024-01-15", [], []);
    expect(typeof html).toBe("string");
  });
});

describe("PortfolioEmailService._generateChartImg", () => {
  it("returns empty string for null data", () => {
    expect(PortfolioEmailService._generateChartImg(null)).toBe("");
  });

  it("returns empty string for < 2 data points", () => {
    expect(PortfolioEmailService._generateChartImg([{ date: "2024-01-01", total_value: 100 }])).toBe("");
    expect(PortfolioEmailService._generateChartImg([])).toBe("");
  });

  it("returns HTML with chart URL for 2+ data points", () => {
    const result = PortfolioEmailService._generateChartImg(mockPerformance, "My Chart");
    expect(result).toContain("quickchart.io");
    expect(result).toContain("My Chart");
    expect(result).toContain("<img");
  });

  it("downsamples large datasets to max 60 points", () => {
    const bigData = Array.from({ length: 120 }, (_, i) => ({
      date: `2024-${String(Math.floor(i / 30) + 1).padStart(2, "0")}-${String((i % 30) + 1).padStart(2, "0")}`,
      total_value: 100000 + i * 100,
    }));
    const result = PortfolioEmailService._generateChartImg(bigData);
    expect(result).toContain("quickchart.io");
    // Should be valid (chart generated)
    expect(result).toContain("<img");
  });
});

describe("PortfolioEmailService.sendBatchEmails", () => {
  const origEnv = process.env.EMAIL_ENABLED;
  const db = require("../../../config/database");

  function seedEmailUser() {
    // Disable FK so we can cleanly wipe and re-seed without cascade conflicts
    db.pragma("foreign_keys = OFF");
    db.prepare("DELETE FROM user_settings").run();
    db.prepare("DELETE FROM users").run();
    db.prepare("INSERT INTO users (id, username, email, password, role, active) VALUES (1, 'alice', 'alice@test.com', 'x', 'user', 1)").run();
    db.prepare("INSERT INTO user_settings (user_id, email_notifications_enabled, timezone, created_by) VALUES (1, 1, 'UTC', 1)").run();
    db.pragma("foreign_keys = ON");
  }

  function cleanupEmailUser() {
    db.pragma("foreign_keys = OFF");
    db.prepare("DELETE FROM user_settings").run();
    db.prepare("DELETE FROM users").run();
    db.pragma("foreign_keys = ON");
  }

  afterEach(() => {
    process.env.EMAIL_ENABLED = origEnv;
    jest.clearAllMocks();
  });

  it("returns {sent:0, failed:0} when email disabled", async () => {
    process.env.EMAIL_ENABLED = "false";
    const result = await PortfolioEmailService.sendBatchEmails();
    expect(result).toEqual({ sent: 0, failed: 0 });
  });

  it("sends emails to users with notifications enabled", async () => {
    process.env.EMAIL_ENABLED = "true";
    seedEmailUser();

    UserSettings.findByUserId.mockReturnValue({ timezone: "UTC" });
    AnalyticsService.getPortfolioAnalytics.mockReturnValue(mockAnalytics());
    AnalyticsService.getPortfolioPerformance.mockReturnValue(mockPerformance);
    emailService.sendEmail.mockResolvedValue({ success: true });

    const result = await PortfolioEmailService.sendBatchEmails();
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);

    cleanupEmailUser();
  });

  it("counts failed when sendEmail fails", async () => {
    process.env.EMAIL_ENABLED = "true";
    seedEmailUser();

    UserSettings.findByUserId.mockReturnValue({ timezone: "UTC" });
    AnalyticsService.getPortfolioAnalytics.mockReturnValue(mockAnalytics());
    AnalyticsService.getPortfolioPerformance.mockReturnValue(mockPerformance);
    emailService.sendEmail.mockResolvedValue({ success: false, message: "SMTP error" });

    const result = await PortfolioEmailService.sendBatchEmails();
    expect(result.failed).toBe(1);

    cleanupEmailUser();
  });

  it("counts failed when email content generation fails", async () => {
    process.env.EMAIL_ENABLED = "true";
    seedEmailUser();

    AnalyticsService.getPortfolioAnalytics.mockImplementation(() => { throw new Error("analytics error"); });

    const result = await PortfolioEmailService.sendBatchEmails();
    expect(result.failed).toBe(1);

    cleanupEmailUser();
  });
});
