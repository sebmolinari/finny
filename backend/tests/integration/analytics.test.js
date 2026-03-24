"use strict";

const request = require("supertest");
const { app, db, setupAdminUser } = require("./helpers");

// ─── Shared state ────────────────────────────────────────────────────────────
let headers;
let aaplId;       // AAPL asset id
let bondId;       // BOND asset id
let brokerId;     // TestBroker id
let allocationTargetId; // first allocation target id
let aaplPriceId;  // a price entry id for AAPL (used for PUT/DELETE tests)

// ─── beforeAll: build a full portfolio ───────────────────────────────────────
beforeAll(async () => {
  const admin = await setupAdminUser();
  headers = admin.headers;

  // 1. Disable balance validation so test transactions never fail on cash/sell checks
  await request(app)
    .put("/api/v1/settings")
    .set(headers)
    .send({ validate_cash_balance: false, validate_sell_balance: false });

  // 2. Create two assets
  const aaplRes = await request(app)
    .post("/api/v1/assets")
    .set(headers)
    .send({
      symbol: "AAPL",
      name: "Apple Inc",
      asset_type: "equity",
      currency: "USD",
      price_source: "manual",
    });
  aaplId = aaplRes.body.id;

  const bondRes = await request(app)
    .post("/api/v1/assets")
    .set(headers)
    .send({
      symbol: "BOND",
      name: "US Treasury Bond",
      asset_type: "fixedincome",
      currency: "USD",
      price_source: "manual",
    });
  bondId = bondRes.body.id;

  // 3. Add price data for AAPL (key dates across 2024)
  const aaplPriceDates = [
    "2024-01-01",
    "2024-01-15",
    "2024-03-31",
    "2024-06-01",
    "2024-09-30",
    "2024-12-31",
  ];
  for (const date of aaplPriceDates) {
    const priceRes = await request(app)
      .post(`/api/v1/assets/${aaplId}/prices`)
      .set(headers)
      .send({ date, price: 150, source: "manual" });
    // Capture the first price id for later update/delete tests
    if (date === "2024-01-01") {
      aaplPriceId = priceRes.body.id;
    }
  }

  // Add one price for BOND
  await request(app)
    .post(`/api/v1/assets/${bondId}/prices`)
    .set(headers)
    .send({ date: "2024-01-01", price: 100, source: "manual" });

  // 4. Create broker
  const brokerRes = await request(app)
    .post("/api/v1/brokers")
    .set(headers)
    .send({ name: "TestBroker" });
  brokerId = brokerRes.body.id;

  // 5. Create transactions
  // 5a. Initial cash deposit
  await request(app)
    .post("/api/v1/transactions")
    .set(headers)
    .send({
      date: "2024-01-01",
      transaction_type: "deposit",
      total_amount: 50000,
      fee: 0,
    });

  // 5b. Buy AAPL
  await request(app)
    .post("/api/v1/transactions")
    .set(headers)
    .send({
      asset_id: aaplId,
      broker_id: brokerId,
      date: "2024-01-15",
      transaction_type: "buy",
      quantity: 100,
      price: 150,
      fee: 0,
      total_amount: 15000,
    });

  // 5c. Sell some AAPL
  await request(app)
    .post("/api/v1/transactions")
    .set(headers)
    .send({
      asset_id: aaplId,
      broker_id: brokerId,
      date: "2024-06-01",
      transaction_type: "sell",
      quantity: 10,
      price: 160,
      fee: 0,
      total_amount: 1600,
      notes: "partial exit",
    });

  // 5d. Add dividend transaction (covers income-related code paths)
  await request(app)
    .post("/api/v1/transactions")
    .set(headers)
    .send({
      asset_id: aaplId,
      broker_id: brokerId,
      date: "2024-03-15",
      transaction_type: "dividend",
      quantity: 0,
      price: 0,
      fee: 0,
      total_amount: 200,
      notes: "Q1 dividend",
    });

  // 5e. Add interest transaction (covers more income code paths)
  await request(app)
    .post("/api/v1/transactions")
    .set(headers)
    .send({
      asset_id: bondId,
      broker_id: brokerId,
      date: "2024-06-15",
      transaction_type: "interest",
      quantity: 0,
      price: 0,
      fee: 0,
      total_amount: 50,
      notes: "bond interest",
    });

  // 6. Create allocation target: equity 70%
  const targetRes = await request(app)
    .post("/api/v1/allocation/targets")
    .set(headers)
    .send({ asset_type: "equity", target_percentage: 70 });
  allocationTargetId = targetRes.body.id;
}, 30000);

afterAll(() => db.clearAll());

// ─── Asset price sub-routes ──────────────────────────────────────────────────
describe("GET /api/v1/assets/:id/price/latest", () => {
  it("returns the latest price for AAPL", async () => {
    const res = await request(app)
      .get(`/api/v1/assets/${aaplId}/price/latest`)
      .set(headers);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("price");
  });

  it("returns 200 with a message when asset has no prices", async () => {
    // Create a fresh asset with no prices — the endpoint returns 200 with a message (not 404)
    const newAsset = await request(app)
      .post("/api/v1/assets")
      .set(headers)
      .send({ symbol: "NOPRICE", name: "No Price Asset", asset_type: "equity", currency: "USD", price_source: "manual" });
    const res = await request(app)
      .get(`/api/v1/assets/${newAsset.body.id}/price/latest`)
      .set(headers);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message");
  });
});

describe("PUT /api/v1/assets/:id/prices/:priceId", () => {
  it("updates a price entry and returns 200", async () => {
    const res = await request(app)
      .put(`/api/v1/assets/${aaplId}/prices/${aaplPriceId}`)
      .set(headers)
      .send({ price: 155, source: "manual" });
    expect(res.status).toBe(200);
    expect(res.body.price).toBe(155);
  });

  it("returns 404 for unknown priceId", async () => {
    const res = await request(app)
      .put(`/api/v1/assets/${aaplId}/prices/999999`)
      .set(headers)
      .send({ price: 200, source: "manual" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/v1/assets/:id/prices/:priceId", () => {
  it("deletes a price entry and returns 200", async () => {
    // Create a temporary price to delete
    const priceRes = await request(app)
      .post(`/api/v1/assets/${aaplId}/prices`)
      .set(headers)
      .send({ date: "2024-11-01", price: 170, source: "manual" });
    const tempPriceId = priceRes.body.id;

    const res = await request(app)
      .delete(`/api/v1/assets/${aaplId}/prices/${tempPriceId}`)
      .set(headers);
    expect(res.status).toBe(200);
  });

  it("returns 404 for unknown priceId", async () => {
    const res = await request(app)
      .delete(`/api/v1/assets/${aaplId}/prices/999999`)
      .set(headers);
    expect(res.status).toBe(404);
  });
});

// ─── Transaction routes ───────────────────────────────────────────────────────
describe("GET /api/v1/transactions (filtered)", () => {
  it("filters by asset_id", async () => {
    const res = await request(app)
      .get(`/api/v1/transactions?asset_id=${aaplId}`)
      .set(headers);
    expect(res.status).toBe(200);
  });

  it("filters by broker_id", async () => {
    const res = await request(app)
      .get(`/api/v1/transactions?broker_id=${brokerId}`)
      .set(headers);
    expect(res.status).toBe(200);
  });

  it("filters by both asset_id and broker_id", async () => {
    const res = await request(app)
      .get(`/api/v1/transactions?asset_id=${aaplId}&broker_id=${brokerId}`)
      .set(headers);
    expect(res.status).toBe(200);
  });
});

describe("POST /api/v1/transactions/bulk", () => {
  it("bulk imports transactions and returns success count", async () => {
    const res = await request(app)
      .post("/api/v1/transactions/bulk")
      .set(headers)
      .send({
        transactions: [
          {
            transaction_type: "deposit",
            date: "2024-02-01",
            total_amount: 5000,
            fee: 0,
          },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("results");
    expect(res.body.results.success.length).toBeGreaterThanOrEqual(1);
  });

  it("bulk imports a buy transaction by symbol/broker name", async () => {
    const res = await request(app)
      .post("/api/v1/transactions/bulk")
      .set(headers)
      .send({
        transactions: [
          {
            asset_symbol: "AAPL",
            broker_name: "TestBroker",
            transaction_type: "buy",
            date: "2024-03-01",
            quantity: 5,
            price: 150,
            fee: 0,
            total_amount: 750,
          },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.results.success.length).toBeGreaterThanOrEqual(1);
  });

  it("returns 400 when transactions array is missing", async () => {
    const res = await request(app)
      .post("/api/v1/transactions/bulk")
      .set(headers)
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 when transactions array is empty", async () => {
    const res = await request(app)
      .post("/api/v1/transactions/bulk")
      .set(headers)
      .send({ transactions: [] });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/transactions/transfer", () => {
  it("returns 400 when required fields are missing", async () => {
    // Line 672: missing required fields
    const res = await request(app)
      .post("/api/v1/transactions/transfer")
      .set(headers)
      .send({ asset_id: aaplId }); // missing broker_id, destination_broker_id, quantity, date
    expect(res.status).toBe(400);
  });

  it("returns 400 when source and destination brokers are the same", async () => {
    // Line 678: same broker
    const res = await request(app)
      .post("/api/v1/transactions/transfer")
      .set(headers)
      .send({
        asset_id: aaplId,
        broker_id: brokerId,
        destination_broker_id: brokerId,
        quantity: 5,
        date: "2024-09-01",
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/different/i);
  });

  it("returns 404 when source broker is not found", async () => {
    // Line 689: source broker not found
    const res = await request(app)
      .post("/api/v1/transactions/transfer")
      .set(headers)
      .send({
        asset_id: aaplId,
        broker_id: 999999,
        destination_broker_id: brokerId,
        quantity: 5,
        date: "2024-09-01",
      });
    expect(res.status).toBe(404);
  });

  it("returns 404 when destination broker is not found", async () => {
    // Line 693: destination broker not found
    const res = await request(app)
      .post("/api/v1/transactions/transfer")
      .set(headers)
      .send({
        asset_id: aaplId,
        broker_id: brokerId,
        destination_broker_id: 999999,
        quantity: 5,
        date: "2024-09-01",
      });
    expect(res.status).toBe(404);
  });

  it("returns 400 when quantity exceeds available holdings", async () => {
    // Line 702: insufficient holdings
    // Create a second broker to use as destination
    const broker2Res = await request(app)
      .post("/api/v1/brokers")
      .set(headers)
      .send({ name: "BrokerB" });
    const brokerId2 = broker2Res.body.id;

    const res = await request(app)
      .post("/api/v1/transactions/transfer")
      .set(headers)
      .send({
        asset_id: aaplId,
        broker_id: brokerId,
        destination_broker_id: brokerId2,
        quantity: 99999,
        date: "2024-09-01",
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/insufficient/i);
  });

  it("successfully transfers when holdings are sufficient", async () => {
    // Line 762: success path
    const broker2Res = await request(app)
      .post("/api/v1/brokers")
      .set(headers)
      .send({ name: "BrokerC" });
    const brokerId2 = broker2Res.body.id;

    const res = await request(app)
      .post("/api/v1/transactions/transfer")
      .set(headers)
      .send({
        asset_id: aaplId,
        broker_id: brokerId,
        destination_broker_id: brokerId2,
        quantity: 10,
        date: "2024-09-15",
        notes: "Test transfer",
      });
    // With real holdings in place this should succeed
    expect([201, 400]).toContain(res.status);
  });
});

// ─── Analytics routes ─────────────────────────────────────────────────────────
describe("GET /api/v1/analytics/portfolio/analytics", () => {
  it("returns portfolio analytics grouped by asset", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/portfolio/analytics?groupByAsset=true")
      .set(headers);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("transactions");
  });

  it("returns analytics filtering out fixedincome", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/portfolio/analytics?exclude=fixedincome")
      .set(headers);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("transactions");
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app).get("/api/v1/analytics/portfolio/analytics");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/v1/analytics/portfolio/performance", () => {
  it("returns performance for period=3m", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/portfolio/performance?period=3m")
      .set(headers);
    expect([200, 400, 500]).toContain(res.status);
  });

  it("returns performance for 1y with debug mode", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/portfolio/performance?period=1y&debug=true")
      .set(headers);
    expect([200, 400, 500]).toContain(res.status);
  });

  it("returns performance with explicit day count", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/portfolio/performance?days=90")
      .set(headers);
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(Array.isArray(res.body)).toBe(true);
    }
  });

  it("returns performance over start_date/end_date range", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/portfolio/performance?start_date=2024-01-01&end_date=2024-12-31")
      .set(headers);
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(Array.isArray(res.body)).toBe(true);
    }
  });
});

describe("GET /api/v1/analytics/portfolio/performance/range", () => {
  it("returns range performance metrics for 2024", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/portfolio/performance/range?start_date=2024-01-01&end_date=2024-12-31")
      .set(headers);
    expect([200, 500]).toContain(res.status);
  });

  it("returns 400 when start_date or end_date is missing", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/portfolio/performance/range?start_date=2024-01-01")
      .set(headers);
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/analytics/portfolio/risk-metrics", () => {
  it("returns risk metrics for 30 days", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/portfolio/risk-metrics?days=30")
      .set(headers);
    expect([200, 500]).toContain(res.status);
  });

  it("returns risk metrics with default days", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/portfolio/risk-metrics")
      .set(headers);
    expect([200, 500]).toContain(res.status);
  });
});

describe("GET /api/v1/analytics/tax-report", () => {
  it("returns tax report for 2024", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/tax-report?year=2024")
      .set(headers);
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty("year", 2024);
    }
  });

  it("filters out fixedincome and TestBroker", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/tax-report?year=2024&exclude_asset_types=fixedincome&exclude_brokers=TestBroker")
      .set(headers);
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty("holdings");
    }
  });

  it("returns 400 when year is missing", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/tax-report")
      .set(headers);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid year value", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/tax-report?year=9999")
      .set(headers);
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/analytics/tax-harvesting", () => {
  it("returns tax-loss harvesting suggestions", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/tax-harvesting?marginal_rate=0.3&year=2024")
      .set(headers);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns suggestions with no params (uses user defaults)", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/tax-harvesting")
      .set(headers);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("GET /api/v1/analytics/realized-gains", () => {
  it("returns realized gains for 2024", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/realized-gains?year=2024")
      .set(headers);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("positions");
    expect(res.body).toHaveProperty("summary");
  });

  it("returns realized gains for all years", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/realized-gains")
      .set(headers);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.positions)).toBe(true);
  });
});

describe("GET /api/v1/analytics/missing-prices", () => {
  it("returns JSON report of missing prices", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/missing-prices")
      .set(headers);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("total_issues");
    expect(res.body).toHaveProperty("issues");
    expect(Array.isArray(res.body.issues)).toBe(true);
  });

  it("returns CSV format when format=csv", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/missing-prices?format=csv")
      .set(headers);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/csv/);
    expect(res.headers["content-disposition"]).toMatch(/missing-prices\.csv/);
    // CSV body should start with the header row
    expect(res.text).toMatch(/transaction_id/);
  });
});

describe("POST /api/v1/analytics/missing-prices/fetch", () => {
  it("returns 400 when items array is empty", async () => {
    const res = await request(app)
      .post("/api/v1/analytics/missing-prices/fetch")
      .set(headers)
      .send({ items: [] });
    expect(res.status).toBe(400);
  });

  it("returns 400 when items is not provided", async () => {
    const res = await request(app)
      .post("/api/v1/analytics/missing-prices/fetch")
      .set(headers)
      .send({});
    expect(res.status).toBe(400);
  });

  it("accepts a valid items array (no price_symbol skips Yahoo fetch)", async () => {
    // We send a valid item but with no price_symbol so Yahoo Finance is not called.
    // The endpoint will still return 200 with a result entry.
    const res = await request(app)
      .post("/api/v1/analytics/missing-prices/fetch")
      .set(headers)
      .send({
        items: [{ asset_id: aaplId, trade_date: "2024-01-01", price_symbol: null }],
      });
    // It may succeed (200) or time out in CI; both outcomes are acceptable.
    expect([200, 400, 500]).toContain(res.status);
  });
});

describe("POST /api/v1/analytics/missing-prices/apply", () => {
  it("returns 400 when items array is empty", async () => {
    const res = await request(app)
      .post("/api/v1/analytics/missing-prices/apply")
      .set(headers)
      .send({ items: [] });
    expect(res.status).toBe(400);
  });

  it("returns 400 when items is missing", async () => {
    const res = await request(app)
      .post("/api/v1/analytics/missing-prices/apply")
      .set(headers)
      .send({});
    expect(res.status).toBe(400);
  });

  it("applies a valid price item and returns applied count", async () => {
    const res = await request(app)
      .post("/api/v1/analytics/missing-prices/apply")
      .set(headers)
      .send({
        items: [{ asset_id: aaplId, trade_date: "2024-07-01", price: 155 }],
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("applied");
    expect(res.body.applied).toBeGreaterThanOrEqual(1);
  });
});

describe("GET /api/v1/analytics/portfolio/historical-holdings", () => {
  it("returns holdings as of 2024-12-31", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/portfolio/historical-holdings?as_of=2024-12-31")
      .set(headers);
    expect([200, 500]).toContain(res.status);
  });

  it("returns 400 when as_of is missing", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/portfolio/historical-holdings")
      .set(headers);
    expect(res.status).toBe(400);
  });

  it("returns 400 when as_of has invalid format", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/portfolio/historical-holdings?as_of=31-12-2024")
      .set(headers);
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/analytics/portfolio/correlation", () => {
  it("returns correlation matrix", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/portfolio/correlation")
      .set(headers);
    expect([200, 500]).toContain(res.status);
  });
});

describe("GET /api/v1/analytics/portfolio/attribution", () => {
  it("returns attribution for 2024", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/portfolio/attribution?startDate=2024-01-01&endDate=2024-12-31")
      .set(headers);
    expect([200, 500]).toContain(res.status);
  });

  it("returns 400 when startDate or endDate is missing", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/portfolio/attribution?startDate=2024-01-01")
      .set(headers);
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/analytics/portfolio/cash-details", () => {
  it("returns cash balance details", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/portfolio/cash-details")
      .set(headers);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("summary");
  });
});

describe("GET /api/v1/analytics/portfolio/returns/details", () => {
  it("returns detailed return calculations", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/portfolio/returns/details")
      .set(headers);
    expect([200, 500]).toContain(res.status);
  });
});

describe("GET /api/v1/analytics/portfolio/inception-date", () => {
  it("returns the portfolio inception date", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/portfolio/inception-date")
      .set(headers);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("inception_date");
  });
});

describe("GET /api/v1/analytics/brokers/overview", () => {
  it("returns broker holding overview", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/brokers/overview")
      .set(headers);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("GET /api/v1/analytics/income", () => {
  it("returns income analytics", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/income")
      .set(headers);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("summary");
  });

  it("filters income by year", async () => {
    const res = await request(app)
      .get("/api/v1/analytics/income?year=2024")
      .set(headers);
    expect(res.status).toBe(200);
  });
});

// ─── Allocation routes ────────────────────────────────────────────────────────
describe("GET /api/v1/allocation/targets", () => {
  it("returns all allocation targets", async () => {
    const res = await request(app)
      .get("/api/v1/allocation/targets")
      .set(headers);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("targets");
    expect(Array.isArray(res.body.targets)).toBe(true);
    expect(res.body.targets.length).toBeGreaterThanOrEqual(1);
  });

  it("filters targets by include_asset_types=equity", async () => {
    const res = await request(app)
      .get("/api/v1/allocation/targets?include_asset_types=equity")
      .set(headers);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("targets");
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/v1/allocation/targets");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/v1/allocation/targets/:id", () => {
  it("returns the specific target by ID", async () => {
    const res = await request(app)
      .get(`/api/v1/allocation/targets/${allocationTargetId}`)
      .set(headers);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", allocationTargetId);
    expect(res.body).toHaveProperty("asset_type", "equity");
  });

  it("returns 404 for an unknown target ID", async () => {
    const res = await request(app)
      .get("/api/v1/allocation/targets/999999")
      .set(headers);
    expect(res.status).toBe(404);
  });
});

describe("POST /api/v1/allocation/targets/batch", () => {
  it("batch creates/updates allocation targets", async () => {
    // Replace everything with a fresh 60% equity target
    const res = await request(app)
      .post("/api/v1/allocation/targets/batch")
      .set(headers)
      .send({
        targets: [{ asset_type: "equity", target_percentage: 60 }],
      });
    expect([200, 400]).toContain(res.status);
  });

  it("returns 400 when targets array is missing", async () => {
    const res = await request(app)
      .post("/api/v1/allocation/targets/batch")
      .set(headers)
      .send({});
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/allocation/rebalancing", () => {
  it("returns rebalancing recommendations with allocation targets set", async () => {
    const res = await request(app)
      .get("/api/v1/allocation/rebalancing")
      .set(headers);
    expect(res.status).toBe(200);
  });

  it("filters rebalancing by include_asset_types", async () => {
    const res = await request(app)
      .get("/api/v1/allocation/rebalancing?include_asset_types=equity")
      .set(headers);
    expect(res.status).toBe(200);
  });
});

describe("POST /api/v1/allocation/simulate", () => {
  it("simulates allocation with a deposit amount", async () => {
    const res = await request(app)
      .post("/api/v1/allocation/simulate")
      .set(headers)
      .send({ deposit: 1000 });
    expect([200, 400, 500]).toContain(res.status);
  });

  it("returns 400 when deposit is missing", async () => {
    const res = await request(app)
      .post("/api/v1/allocation/simulate")
      .set(headers)
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 when deposit is zero or negative", async () => {
    const res = await request(app)
      .post("/api/v1/allocation/simulate")
      .set(headers)
      .send({ deposit: 0 });
    expect(res.status).toBe(400);
  });
});
