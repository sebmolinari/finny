"use strict";

// ── Mocks (hoisted) ──────────────────────────────────────────────────────────
jest.mock("../../../middleware/auth", () => (req, res, next) => {
  req.user = { id: 1, username: "testuser", role: "admin" };
  next();
});
jest.mock("../../../middleware/admin", () => (req, res, next) => next());
jest.mock("../../../services/analyticsService");
jest.mock("../../../models/Transaction");
jest.mock("../../../services/priceService");
jest.mock("../../../models/PriceData");
jest.mock("../../../models/AuditLog");

const request = require("supertest");
const express = require("express");
const analyticsRouter = require("../../../routes/analytics");
const AnalyticsService = require("../../../services/analyticsService");
const Transaction = require("../../../models/Transaction");
const PriceData = require("../../../models/PriceData");
const PriceService = require("../../../services/priceService");

const ERR = new Error("simulated db error");

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/analytics", analyticsRouter);
  return app;
}

let app;

beforeEach(() => {
  jest.clearAllMocks();
  app = makeApp();
  // Default: all methods succeed with empty/simple values
  AnalyticsService.getBrokerHoldings.mockReturnValue([]);
  AnalyticsService.getMarketTrends.mockReturnValue({ trends: [], summary: {} });
  AnalyticsService.getPortfolioAnalytics.mockReturnValue({ nav: 0, transactions: { holdings: [], asset_allocation: [] } });
  AnalyticsService.getCashBalanceDetails.mockReturnValue([]);
  AnalyticsService.getPortfolioPerformance.mockReturnValue([]);
  AnalyticsService.getReturnDetails.mockReturnValue({});
  AnalyticsService.getVolatilityAndDrawdown.mockReturnValue({});
  AnalyticsService.getHistoricalHoldings.mockReturnValue([]);
  AnalyticsService.getRealizedGainsReport.mockReturnValue([]);
  AnalyticsService.getTaxHarvestingSuggestions.mockReturnValue([]);
  AnalyticsService.getMissingPrices.mockReturnValue({ issues: [], summary: {} });
  AnalyticsService.getRebalancingRecommendations.mockReturnValue({});
  AnalyticsService.simulateRebalancing.mockReturnValue({});
  AnalyticsService.getDateRangeMetrics.mockReturnValue({});
  AnalyticsService.getFirstTransactionDate.mockReturnValue(null);
  AnalyticsService.getAdminOverview.mockReturnValue({});
  AnalyticsService.getBenchmarkSeries = jest.fn().mockResolvedValue({});
  AnalyticsService.getPerformanceAttribution.mockReturnValue({});
  AnalyticsService.getCorrelationMatrix.mockReturnValue({});
  AnalyticsService.getPortfolioHoldings.mockReturnValue([]);
  Transaction.getIncomeReport = jest.fn().mockReturnValue({ summary: {}, by_month: [], by_year: [], by_asset: [], transactions: [] });
  PriceData.findByAssetAndDate.mockReturnValue(null);
  PriceData.create.mockReturnValue(1);
  PriceData.update.mockReturnValue(true);
  PriceService.fetchHistoricalPrice = jest.fn().mockResolvedValue(150);
});

// ── GET /brokers/overview ─────────────────────────────────────────────────────
describe("GET /analytics/brokers/overview", () => {
  it("returns 200 on success", async () => {
    AnalyticsService.getBrokerHoldings.mockReturnValue([{ broker: "A" }]);
    const res = await request(app).get("/analytics/brokers/overview");
    expect(res.status).toBe(200);
  });

  it("returns 500 on service error", async () => {
    AnalyticsService.getBrokerHoldings.mockImplementation(() => { throw ERR; });
    const res = await request(app).get("/analytics/brokers/overview");
    expect(res.status).toBe(500);
  });
});

// ── GET /market-trends ─────────────────────────────────────────────────────────
describe("GET /analytics/market-trends", () => {
  it("returns 200 on success", async () => {
    const res = await request(app).get("/analytics/market-trends");
    expect(res.status).toBe(200);
  });

  it("returns 500 on service error", async () => {
    AnalyticsService.getMarketTrends.mockImplementation(() => { throw ERR; });
    const res = await request(app).get("/analytics/market-trends");
    expect(res.status).toBe(500);
  });
});

// ── GET /portfolio/analytics ───────────────────────────────────────────────────
describe("GET /analytics/portfolio/analytics", () => {
  it("returns 200 on success", async () => {
    const res = await request(app).get("/analytics/portfolio/analytics");
    expect(res.status).toBe(200);
  });

  it("returns 500 on service error", async () => {
    AnalyticsService.getPortfolioAnalytics.mockImplementation(() => { throw ERR; });
    const res = await request(app).get("/analytics/portfolio/analytics");
    expect(res.status).toBe(500);
  });
});

// ── GET /portfolio/cash-details ────────────────────────────────────────────────
describe("GET /analytics/portfolio/cash-details", () => {
  it("returns 200 on success", async () => {
    const res = await request(app).get("/analytics/portfolio/cash-details");
    expect(res.status).toBe(200);
  });

  it("returns 500 on service error", async () => {
    AnalyticsService.getCashBalanceDetails.mockImplementation(() => { throw ERR; });
    const res = await request(app).get("/analytics/portfolio/cash-details");
    expect(res.status).toBe(500);
  });
});

// ── GET /portfolio/performance ─────────────────────────────────────────────────
describe("GET /analytics/portfolio/performance", () => {
  it("returns 200 on success", async () => {
    const res = await request(app).get("/analytics/portfolio/performance?days=30");
    expect(res.status).toBe(200);
  });

  it("returns 400 for days out of range", async () => {
    const res = await request(app).get("/analytics/portfolio/performance?days=0");
    expect(res.status).toBe(400);
  });

  it("returns 500 on service error", async () => {
    AnalyticsService.getPortfolioPerformance.mockImplementation(() => { throw ERR; });
    const res = await request(app).get("/analytics/portfolio/performance?days=30");
    expect(res.status).toBe(500);
  });
});

// ── GET /portfolio/returns/details ────────────────────────────────────────────
describe("GET /analytics/portfolio/returns/details", () => {
  it("returns 200 on success", async () => {
    const res = await request(app).get("/analytics/portfolio/returns/details");
    expect(res.status).toBe(200);
  });

  it("returns 500 on service error", async () => {
    AnalyticsService.getReturnDetails.mockImplementation(() => { throw ERR; });
    const res = await request(app).get("/analytics/portfolio/returns/details");
    expect(res.status).toBe(500);
  });
});

// ── GET /portfolio/performance/range ──────────────────────────────────────────
describe("GET /analytics/portfolio/performance/range", () => {
  it("returns 200 on success", async () => {
    const res = await request(app).get("/analytics/portfolio/performance/range?start_date=2024-01-01&end_date=2024-12-31");
    expect(res.status).toBe(200);
  });

  it("returns 400 for missing dates", async () => {
    const res = await request(app).get("/analytics/portfolio/performance/range");
    expect(res.status).toBe(400);
  });

  it("returns 500 on service error", async () => {
    AnalyticsService.getDateRangeMetrics.mockImplementation(() => { throw ERR; });
    const res = await request(app).get("/analytics/portfolio/performance/range?start_date=2024-01-01&end_date=2024-12-31");
    expect(res.status).toBe(500);
  });
});

// ── GET /portfolio/inception-date ─────────────────────────────────────────────
describe("GET /analytics/portfolio/inception-date", () => {
  it("returns 200 on success", async () => {
    const res = await request(app).get("/analytics/portfolio/inception-date");
    expect(res.status).toBe(200);
  });

  it("returns 500 on service error", async () => {
    AnalyticsService.getFirstTransactionDate.mockImplementation(() => { throw ERR; });
    const res = await request(app).get("/analytics/portfolio/inception-date");
    expect(res.status).toBe(500);
  });
});

// ── GET /realized-gains ────────────────────────────────────────────────────────
describe("GET /analytics/realized-gains", () => {
  it("returns 200 on success", async () => {
    const res = await request(app).get("/analytics/realized-gains");
    expect(res.status).toBe(200);
  });

  it("returns 500 on service error", async () => {
    AnalyticsService.getRealizedGainsReport.mockImplementation(() => { throw ERR; });
    const res = await request(app).get("/analytics/realized-gains");
    expect(res.status).toBe(500);
  });
});

// ── GET /tax-harvesting ────────────────────────────────────────────────────────
describe("GET /analytics/tax-harvesting", () => {
  it("returns 200 on success", async () => {
    const res = await request(app).get("/analytics/tax-harvesting");
    expect(res.status).toBe(200);
  });

  it("returns 500 on service error", async () => {
    AnalyticsService.getTaxHarvestingSuggestions.mockImplementation(() => { throw ERR; });
    const res = await request(app).get("/analytics/tax-harvesting");
    expect(res.status).toBe(500);
  });
});

// ── GET /missing-prices ────────────────────────────────────────────────────────
describe("GET /analytics/missing-prices", () => {
  it("returns 200 on success (json)", async () => {
    const res = await request(app).get("/analytics/missing-prices");
    expect(res.status).toBe(200);
  });

  it("returns CSV when format=csv with no issues", async () => {
    AnalyticsService.getMissingPrices.mockReturnValue({ issues: [], summary: {} });
    const res = await request(app).get("/analytics/missing-prices?format=csv");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/csv/);
  });

  it("returns CSV with data rows when there are issues", async () => {
    AnalyticsService.getMissingPrices.mockReturnValue({
      issues: [
        {
          transaction_id: 1,
          trade_date: "2024-01-01",
          transaction_type: "buy",
          symbol: "AAPL",
          name: "Apple Inc",
          asset_type: "equity",
          broker_name: "Test",
          status: "missing",
          closest_price_date: null,
          closest_price: null,
          days_without_price: 10,
        },
      ],
      summary: {},
    });
    const res = await request(app).get("/analytics/missing-prices?format=csv");
    expect(res.status).toBe(200);
    expect(res.text).toContain("AAPL");
  });

  it("returns 500 on service error", async () => {
    AnalyticsService.getMissingPrices.mockImplementation(() => { throw ERR; });
    const res = await request(app).get("/analytics/missing-prices");
    expect(res.status).toBe(500);
  });
});

// ── POST /missing-prices/fetch ────────────────────────────────────────────────
describe("POST /analytics/missing-prices/fetch", () => {
  it("returns 400 when items is empty", async () => {
    const res = await request(app).post("/analytics/missing-prices/fetch").send({ items: [] });
    expect(res.status).toBe(400);
  });

  it("returns 400 when items is not array", async () => {
    const res = await request(app).post("/analytics/missing-prices/fetch").send({});
    expect(res.status).toBe(400);
  });

  it("handles item with missing asset_id (status: not_found)", async () => {
    const res = await request(app).post("/analytics/missing-prices/fetch").send({
      items: [{ trade_date: "2024-01-01", price_symbol: null }], // no asset_id
    });
    expect(res.status).toBe(200);
    expect(res.body.results[0].status).toBe("not_found");
  });

  it("handles item with no price_symbol (skips fetch)", async () => {
    const res = await request(app).post("/analytics/missing-prices/fetch").send({
      items: [{ asset_id: 1, trade_date: "2024-01-01", price_symbol: null }],
    });
    expect(res.status).toBe(200);
    expect(res.body.results[0].fetched_price).toBeNull();
  });
});

// ── POST /missing-prices/apply ────────────────────────────────────────────────
describe("POST /analytics/missing-prices/apply", () => {
  it("returns 400 when items is empty", async () => {
    const res = await request(app).post("/analytics/missing-prices/apply").send({ items: [] });
    expect(res.status).toBe(400);
  });

  it("handles item with missing fields (skips invalid)", async () => {
    const res = await request(app).post("/analytics/missing-prices/apply").send({
      items: [{ trade_date: "2024-01-01", price: 150 }], // no asset_id
    });
    expect(res.status).toBe(200);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });
});

// ── GET /portfolio/risk-metrics ────────────────────────────────────────────────
describe("GET /analytics/portfolio/risk-metrics", () => {
  it("returns 200 on success", async () => {
    const res = await request(app).get("/analytics/portfolio/risk-metrics");
    expect(res.status).toBe(200);
  });

  it("returns 500 on service error", async () => {
    AnalyticsService.getVolatilityAndDrawdown.mockImplementation(() => { throw ERR; });
    const res = await request(app).get("/analytics/portfolio/risk-metrics");
    expect(res.status).toBe(500);
  });
});

// ── GET /portfolio/historical-holdings ────────────────────────────────────────
describe("GET /analytics/portfolio/historical-holdings", () => {
  it("returns 400 when as_of missing", async () => {
    const res = await request(app).get("/analytics/portfolio/historical-holdings");
    expect(res.status).toBe(400);
  });

  it("returns 400 when as_of is invalid format", async () => {
    const res = await request(app).get("/analytics/portfolio/historical-holdings?as_of=invalid");
    expect(res.status).toBe(400);
  });

  it("returns 200 on success", async () => {
    const res = await request(app).get("/analytics/portfolio/historical-holdings?as_of=2024-12-31");
    expect(res.status).toBe(200);
  });

  it("returns 500 on service error", async () => {
    AnalyticsService.getHistoricalHoldings.mockImplementation(() => { throw ERR; });
    const res = await request(app).get("/analytics/portfolio/historical-holdings?as_of=2024-12-31");
    expect(res.status).toBe(500);
  });
});

// ── GET /income ────────────────────────────────────────────────────────────────
describe("GET /analytics/income", () => {
  it("returns 200 on success", async () => {
    const res = await request(app).get("/analytics/income?year=2024");
    expect(res.status).toBe(200);
  });

  it("returns 500 on service error", async () => {
    Transaction.getIncomeReport.mockImplementation(() => { throw ERR; });
    const res = await request(app).get("/analytics/income?year=2024");
    expect(res.status).toBe(500);
  });
});

// ── GET /admin/overview ────────────────────────────────────────────────────────
describe("GET /analytics/admin/overview", () => {
  it("returns 200 on success", async () => {
    const res = await request(app).get("/analytics/admin/overview");
    expect(res.status).toBe(200);
  });

  it("returns 500 on service error", async () => {
    AnalyticsService.getAdminOverview.mockImplementation(() => { throw ERR; });
    const res = await request(app).get("/analytics/admin/overview");
    expect(res.status).toBe(500);
  });
});

// ── GET /portfolio/attribution ─────────────────────────────────────────────────
describe("GET /analytics/portfolio/attribution", () => {
  it("returns 200 on success", async () => {
    const res = await request(app).get("/analytics/portfolio/attribution?startDate=2024-01-01&endDate=2024-12-31");
    expect(res.status).toBe(200);
  });

  it("returns 500 on service error", async () => {
    AnalyticsService.getPerformanceAttribution.mockImplementation(() => { throw ERR; });
    const res = await request(app).get("/analytics/portfolio/attribution?startDate=2024-01-01&endDate=2024-12-31");
    expect(res.status).toBe(500);
  });
});

// ── GET /portfolio/correlation ─────────────────────────────────────────────────
describe("GET /analytics/portfolio/correlation", () => {
  it("returns 200 on success", async () => {
    const res = await request(app).get("/analytics/portfolio/correlation");
    expect(res.status).toBe(200);
  });

  it("returns 500 on service error", async () => {
    AnalyticsService.getCorrelationMatrix.mockImplementation(() => { throw ERR; });
    const res = await request(app).get("/analytics/portfolio/correlation");
    expect(res.status).toBe(500);
  });
});

// ── GET /portfolio/benchmark ──────────────────────────────────────────────────
describe("GET /analytics/portfolio/benchmark", () => {
  it("returns 200 on success", async () => {
    AnalyticsService.getBenchmarkSeries = jest.fn().mockResolvedValue({ data: [] });
    const res = await request(app).get("/analytics/portfolio/benchmark?symbol=SPY");
    expect(res.status).toBe(200);
  });

  it("returns 400 when symbol is missing", async () => {
    const res = await request(app).get("/analytics/portfolio/benchmark");
    expect(res.status).toBe(400);
  });

  it("returns 500 on service error", async () => {
    AnalyticsService.getBenchmarkSeries = jest.fn().mockRejectedValue(ERR);
    const res = await request(app).get("/analytics/portfolio/benchmark?symbol=SPY");
    expect(res.status).toBe(500);
  });
});

// ── GET /portfolio/performance with exclude param ──────────────────────────────
describe("GET /analytics/portfolio/performance with exclude", () => {
  it("passes exclude types when provided", async () => {
    const res = await request(app).get("/analytics/portfolio/performance?days=30&exclude=equity,crypto");
    expect(res.status).toBe(200);
  });
});

// ── POST /missing-prices/fetch — price_symbol branch ─────────────────────────
describe("POST /analytics/missing-prices/fetch — price_symbol coverage", () => {
  it("calls fetchHistoricalPrice when price_symbol is set", async () => {
    PriceService.fetchHistoricalPrice = jest.fn().mockResolvedValue(99.5);
    const res = await request(app).post("/analytics/missing-prices/fetch").send({
      items: [{ asset_id: 1, trade_date: "2024-01-01", price_symbol: "AAPL" }],
    });
    expect(res.status).toBe(200);
    expect(res.body.results[0].fetched_price).toBe(99.5);
  });

  it("returns 500 when PriceService throws", async () => {
    PriceService.fetchHistoricalPrice = jest.fn().mockRejectedValue(new Error("network error"));
    const res = await request(app).post("/analytics/missing-prices/fetch").send({
      items: [{ asset_id: 1, trade_date: "2024-01-01", price_symbol: "AAPL" }],
    });
    expect(res.status).toBe(500);
  });
});

// ── POST /missing-prices/apply — update vs create paths ─────────────────────
describe("POST /analytics/missing-prices/apply — update/create coverage", () => {
  it("updates existing price when PriceData.findByAssetAndDate returns record", async () => {
    PriceData.findByAssetAndDate.mockReturnValue({ id: 5, price: 100, source: "manual" });
    const res = await request(app).post("/analytics/missing-prices/apply").send({
      items: [{ asset_id: 1, trade_date: "2024-01-01", price: 150 }],
    });
    expect(res.status).toBe(200);
    expect(res.body.applied).toBe(1);
  });

  it("creates new price when PriceData.findByAssetAndDate returns null", async () => {
    PriceData.findByAssetAndDate.mockReturnValue(null);
    const res = await request(app).post("/analytics/missing-prices/apply").send({
      items: [{ asset_id: 1, trade_date: "2024-01-01", price: 150 }],
    });
    expect(res.status).toBe(200);
    expect(res.body.applied).toBe(1);
  });

  it("catches per-item errors and continues", async () => {
    PriceData.findByAssetAndDate.mockImplementation(() => { throw new Error("db error"); });
    const res = await request(app).post("/analytics/missing-prices/apply").send({
      items: [{ asset_id: 1, trade_date: "2024-01-01", price: 150 }],
    });
    expect(res.status).toBe(200);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });
});
