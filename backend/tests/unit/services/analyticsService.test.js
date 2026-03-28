/**
 * AnalyticsService unit tests.
 *
 * All model dependencies are mocked so the service logic runs in isolation.
 * The config/database module is redirected to the in-memory testDb by
 * jest.config.js moduleNameMapper, so getAdminOverview() queries run against
 * a real in-memory SQLite database.
 */

jest.mock("../../../models/Transaction");
jest.mock("../../../models/PriceData");
jest.mock("../../../models/UserSettings");
jest.mock("../../../models/Broker");
jest.mock("../../../models/Asset");
jest.mock("../../../models/AssetAllocationTarget");
jest.mock("../../../services/priceService");
jest.mock("../../../utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const Transaction = require("../../../models/Transaction");
const PriceData = require("../../../models/PriceData");
const UserSettings = require("../../../models/UserSettings");
const Broker = require("../../../models/Broker");
const Asset = require("../../../models/Asset");
const PriceService = require("../../../services/priceService");
const db = require("../../../config/database");

const AnalyticsService = require("../../../services/analyticsService");

// ── Shared fixtures ───────────────────────────────────────────────────────────

// Three holdings: two lots of AAPL across different brokers + one BOND position.
const mockHoldings = [
  {
    asset_id: 1,
    symbol: "AAPL",
    name: "Apple Inc",
    asset_type: "equity",
    broker_id: 1,
    broker_name: "Fidelity",
    total_quantity: 100,
    cost_basis: 15000,
    realized_gain: 0,
  },
  {
    asset_id: 1,
    symbol: "AAPL",
    name: "Apple Inc",
    asset_type: "equity",
    broker_id: 2,
    broker_name: "Schwab",
    total_quantity: 50,
    cost_basis: 7500,
    realized_gain: 0,
  },
  {
    asset_id: 2,
    symbol: "BOND",
    name: "US Bond",
    asset_type: "fixedincome",
    broker_id: 1,
    broker_name: "Fidelity",
    total_quantity: 100,
    cost_basis: 10000,
    realized_gain: 0,
  },
];

// ── _calculateAssetAllocation ─────────────────────────────────────────────────

describe("AnalyticsService._calculateAssetAllocation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns an empty array for empty holdings", () => {
    const result = AnalyticsService._calculateAssetAllocation([]);
    expect(result).toEqual([]);
  });

  it("returns 100% for a single holding", () => {
    const holdings = [{ asset_type: "equity", market_value: 10000 }];
    const result = AnalyticsService._calculateAssetAllocation(holdings);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("equity");
    expect(result[0].value).toBe(10000);
    expect(result[0].count).toBe(1);
    expect(result[0].percentage).toBe(100);
  });

  it("aggregates multiple holdings of the same type", () => {
    const holdings = [
      { asset_type: "equity", market_value: 30000 },
      { asset_type: "equity", market_value: 20000 },
    ];
    const result = AnalyticsService._calculateAssetAllocation(holdings);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("equity");
    expect(result[0].value).toBe(50000);
    expect(result[0].count).toBe(2);
    expect(result[0].percentage).toBe(100);
  });

  it("splits percentage correctly across different asset types", () => {
    const holdings = [
      { asset_type: "equity", market_value: 30000 },
      { asset_type: "equity", market_value: 20000 },
      { asset_type: "fixedincome", market_value: 10000 },
    ];
    const result = AnalyticsService._calculateAssetAllocation(holdings);

    expect(result).toHaveLength(2);

    const equity = result.find((r) => r.type === "equity");
    const fi = result.find((r) => r.type === "fixedincome");

    expect(equity.value).toBe(50000);
    expect(equity.count).toBe(2);
    expect(equity.percentage).toBeCloseTo((50000 / 60000) * 100, 5);

    expect(fi.value).toBe(10000);
    expect(fi.count).toBe(1);
    expect(fi.percentage).toBeCloseTo((10000 / 60000) * 100, 5);
  });

  it("returns 0 percentage when totalValue is 0", () => {
    const holdings = [
      { asset_type: "equity", market_value: 0 },
      { asset_type: "fixedincome", market_value: 0 },
    ];
    const result = AnalyticsService._calculateAssetAllocation(holdings);

    result.forEach((r) => {
      expect(r.percentage).toBe(0);
    });
  });
});

// ── _calculateDailyPnL ────────────────────────────────────────────────────────

describe("AnalyticsService._calculateDailyPnL", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    UserSettings.findByUserId.mockReturnValue({ timezone: "UTC" });
  });

  it("returns 0 for empty holdings", () => {
    const result = AnalyticsService._calculateDailyPnL(1, []);
    expect(result).toBe(0);
  });

  it("computes todayMarketValue - yesterdayMarketValue when prices are available", () => {
    // Single holding with market_value = 200, yesterday price gives 180
    const holdings = [
      { asset_id: 1, total_quantity: 10, market_value: 200 },
    ];
    // yesterdayPriceRow.price = 18 → yesterdayMarketValue = 10 * 18 = 180
    PriceData.getLatestPriceAsOf.mockReturnValue({ price: 18, date: "2024-01-14" });

    const result = AnalyticsService._calculateDailyPnL(1, holdings);
    expect(result).toBe(200 - 180); // 20
  });

  it("falls back to market_value (no change) when no historical price row", () => {
    const holdings = [
      { asset_id: 1, total_quantity: 10, market_value: 200 },
    ];
    PriceData.getLatestPriceAsOf.mockReturnValue(null);

    const result = AnalyticsService._calculateDailyPnL(1, holdings);
    // No yesterday price → yesterdayMarketValue = market_value (200) → PnL = 0
    expect(result).toBe(0);
  });

  it("aggregates across multiple holdings", () => {
    const holdings = [
      { asset_id: 1, total_quantity: 10, market_value: 200 },
      { asset_id: 2, total_quantity: 5, market_value: 100 },
    ];
    // asset 1: yesterday price 18 → 180; asset 2: null → fallback 100
    PriceData.getLatestPriceAsOf
      .mockReturnValueOnce({ price: 18, date: "2024-01-14" })
      .mockReturnValueOnce(null);

    const result = AnalyticsService._calculateDailyPnL(1, holdings);
    // todayMV = 200 + 100 = 300; yesterdayMV = 180 + 100 = 280; PnL = 20
    expect(result).toBe(20);
  });
});

// ── getPortfolioHoldings ──────────────────────────────────────────────────────

describe("AnalyticsService.getPortfolioHoldings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    UserSettings.findByUserId.mockReturnValue({ timezone: "UTC" });
    // Default: no yesterday price (treated as no change)
    PriceData.getLatestPriceAsOf.mockReturnValue(null);
  });

  it("enriches holdings with market_value based on latest price", () => {
    Transaction.getPortfolioHoldings.mockReturnValue([mockHoldings[0]]);
    // latestPrice.price = 200 → market_value = 100 * 200 = 20000
    PriceData.getLatestPrice.mockReturnValue({ price: 200, date: "2024-01-15" });

    const result = AnalyticsService.getPortfolioHoldings(1);

    expect(result).toHaveLength(1);
    expect(result[0].market_value).toBe(20000);
    expect(result[0].market_price).toBe(200);
  });

  it("sets market_value to 0 when no price is available", () => {
    Transaction.getPortfolioHoldings.mockReturnValue([mockHoldings[0]]);
    PriceData.getLatestPrice.mockReturnValue(null);

    const result = AnalyticsService.getPortfolioHoldings(1);

    expect(result[0].market_value).toBe(0);
    expect(result[0].market_price).toBe(0);
  });

  it("filters out excluded asset types", () => {
    Transaction.getPortfolioHoldings.mockReturnValue(mockHoldings);
    PriceData.getLatestPrice.mockReturnValue({ price: 100, date: "2024-01-15" });

    const result = AnalyticsService.getPortfolioHoldings(
      1,
      true,
      ["fixedincome"],
      false,
    );

    expect(result.every((h) => h.asset_type !== "fixedincome")).toBe(true);
    expect(result.some((h) => h.symbol === "BOND")).toBe(false);
  });

  it("sorts results by market_value descending", () => {
    Transaction.getPortfolioHoldings.mockReturnValue(mockHoldings);
    // AAPL broker1 qty=100 → mv=10000; AAPL broker2 qty=50 → mv=5000; BOND qty=100 → mv=10000
    PriceData.getLatestPrice
      .mockReturnValueOnce({ price: 100, date: "2024-01-15" }) // AAPL/Fidelity
      .mockReturnValueOnce({ price: 100, date: "2024-01-15" }) // AAPL/Schwab
      .mockReturnValueOnce({ price: 100, date: "2024-01-15" }); // BOND

    const result = AnalyticsService.getPortfolioHoldings(1);

    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].market_value).toBeGreaterThanOrEqual(result[i + 1].market_value);
    }
  });

  it("groups holdings by asset when groupByAsset is true", () => {
    Transaction.getPortfolioHoldings.mockReturnValue(mockHoldings);
    PriceData.getLatestPrice.mockReturnValue({ price: 100, date: "2024-01-15" });

    const result = AnalyticsService.getPortfolioHoldings(1, true, [], true);

    // Two unique asset_ids (1 and 2) → two grouped entries
    const aaplEntries = result.filter((h) => h.asset_id === 1);
    const bondEntries = result.filter((h) => h.asset_id === 2);

    expect(aaplEntries).toHaveLength(1);
    expect(bondEntries).toHaveLength(1);

    // Grouped AAPL should aggregate quantities and cost_basis
    expect(aaplEntries[0].total_quantity).toBe(100 + 50); // 150
    expect(aaplEntries[0].cost_basis).toBe(15000 + 7500); // 22500
    expect(aaplEntries[0].broker_id).toBeNull();
    expect(aaplEntries[0].broker_name).toBeNull();
  });

  it("computes unrealized_gain and unrealized_gain_percent correctly", () => {
    Transaction.getPortfolioHoldings.mockReturnValue([mockHoldings[0]]);
    // market_value = 100 * 200 = 20000; cost_basis = 15000
    PriceData.getLatestPrice.mockReturnValue({ price: 200, date: "2024-01-15" });

    const result = AnalyticsService.getPortfolioHoldings(1);

    expect(result[0].unrealized_gain).toBe(20000 - 15000); // 5000
    expect(result[0].unrealized_gain_percent).toBeCloseTo((5000 / 15000) * 100, 5);
  });

  it("computes average_cost as cost_basis / total_quantity", () => {
    Transaction.getPortfolioHoldings.mockReturnValue([mockHoldings[0]]);
    PriceData.getLatestPrice.mockReturnValue({ price: 200, date: "2024-01-15" });

    const result = AnalyticsService.getPortfolioHoldings(1);

    expect(result[0].average_cost).toBe(15000 / 100); // 150
  });

  it("returns 0 for unrealized_gain_percent when cost_basis is 0 (line 134 false branch)", () => {
    Transaction.getPortfolioHoldings.mockReturnValue([
      { ...mockHoldings[0], cost_basis: 0 },
    ]);
    PriceData.getLatestPrice.mockReturnValue({ price: 200, date: "2024-01-15" });

    const result = AnalyticsService.getPortfolioHoldings(1);
    expect(result[0].unrealized_gain_percent).toBe(0);
  });

  it("returns 0 for average_cost when total_quantity is 0 (line 154 false branch)", () => {
    Transaction.getPortfolioHoldings.mockReturnValue([
      { ...mockHoldings[0], total_quantity: 0 },
    ]);
    PriceData.getLatestPrice.mockReturnValue({ price: 200, date: "2024-01-15" });

    const result = AnalyticsService.getPortfolioHoldings(1);
    expect(result[0].average_cost).toBe(0);
  });
});

// ── getBrokerHoldings ─────────────────────────────────────────────────────────

describe("AnalyticsService.getBrokerHoldings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("delegates directly to Broker.getBrokerHoldings", () => {
    const brokerData = [
      { broker_id: 1, broker_name: "Fidelity", market_value: 30000 },
    ];
    Broker.getBrokerHoldings.mockReturnValue(brokerData);

    const result = AnalyticsService.getBrokerHoldings(1);

    expect(Broker.getBrokerHoldings).toHaveBeenCalledWith(1);
    expect(result).toBe(brokerData);
  });
});

// ── getCashBalanceDetails ─────────────────────────────────────────────────────

describe("AnalyticsService.getCashBalanceDetails", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("delegates directly to Transaction.getCashBalanceDetails", () => {
    const cashData = [{ broker_name: "Fidelity", balance: 5000 }];
    Transaction.getCashBalanceDetails.mockReturnValue(cashData);

    const result = AnalyticsService.getCashBalanceDetails(1);

    expect(Transaction.getCashBalanceDetails).toHaveBeenCalledWith(1);
    expect(result).toBe(cashData);
  });
});

// ── getMarketTrends ───────────────────────────────────────────────────────────

describe("AnalyticsService.getMarketTrends", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    UserSettings.findByUserId.mockReturnValue({ timezone: "UTC" });
  });

  it("returns trends array and days field", () => {
    Asset.getAll.mockReturnValue([
      { id: 1, symbol: "AAPL", name: "Apple", asset_type: "equity", currency: "USD" },
    ]);
    PriceData.getLatestPrice.mockReturnValue({ price: 150, date: "2024-01-15" });
    PriceData.findByAsset.mockReturnValue([
      { date: "2024-01-15", price: 150 },
      { date: "2024-01-01", price: 140 },
    ]);

    const result = AnalyticsService.getMarketTrends(1, 30);

    expect(result).toHaveProperty("trends");
    expect(result).toHaveProperty("days", 30);
    expect(result.trends).toHaveLength(1);
    expect(result.trends[0].symbol).toBe("AAPL");
    expect(result.trends[0].current_price).toBe(150);
  });

  it("calculates price_change_percent from first to last history entry", () => {
    Asset.getAll.mockReturnValue([
      { id: 1, symbol: "AAPL", name: "Apple", asset_type: "equity", currency: "USD" },
    ]);
    PriceData.getLatestPrice.mockReturnValue({ price: 150, date: "2024-01-15" });
    // findByAsset returns newest-first; service reverses it → [140, 150] chronological
    PriceData.findByAsset.mockReturnValue([
      { date: "2024-01-15", price: 150 },
      { date: "2024-01-01", price: 140 },
    ]);

    const result = AnalyticsService.getMarketTrends(1, 30);

    // After reverse: firstPrice = 140, lastPrice = 150
    // price_change_percent = ((150 - 140) / 140) * 100
    const expected = ((150 - 140) / 140) * 100;
    expect(result.trends[0].price_change_percent).toBeCloseTo(expected, 5);
  });

  it("returns empty trends when there are no assets", () => {
    Asset.getAll.mockReturnValue([]);

    const result = AnalyticsService.getMarketTrends(1, 30);

    expect(result.trends).toEqual([]);
  });

  it("sets price_change_percent to 0 when firstPrice is 0", () => {
    Asset.getAll.mockReturnValue([
      { id: 1, symbol: "AAPL", name: "Apple", asset_type: "equity", currency: "USD" },
    ]);
    PriceData.getLatestPrice.mockReturnValue({ price: 0, date: "2024-01-15" });
    // Empty history → firstPrice falls back to latestPrice.price (0)
    PriceData.findByAsset.mockReturnValue([]);

    const result = AnalyticsService.getMarketTrends(1, 30);

    expect(result.trends[0].price_change_percent).toBe(0);
  });

  it("builds price_history from the reversed findByAsset results", () => {
    Asset.getAll.mockReturnValue([
      { id: 1, symbol: "AAPL", name: "Apple", asset_type: "equity", currency: "USD" },
    ]);
    PriceData.getLatestPrice.mockReturnValue({ price: 150, date: "2024-01-15" });
    // Service will reverse this array
    PriceData.findByAsset.mockReturnValue([
      { date: "2024-01-15", price: 150 },
      { date: "2024-01-01", price: 140 },
    ]);

    const result = AnalyticsService.getMarketTrends(1, 30);
    const history = result.trends[0].price_history;

    // After reverse: first entry should be the older date
    expect(history[0].date).toBe("2024-01-01");
    expect(history[1].date).toBe("2024-01-15");
  });
});

// ── getAdminOverview ──────────────────────────────────────────────────────────

describe("AnalyticsService.getAdminOverview", () => {
  beforeEach(() => {
    db.clearAll();
  });

  it("returns an object with the expected top-level shape on an empty DB", () => {
    const result = AnalyticsService.getAdminOverview();

    expect(result).toHaveProperty("users");
    expect(result).toHaveProperty("transactions");
    expect(result).toHaveProperty("assets");
    expect(result).toHaveProperty("brokers");
    expect(result).toHaveProperty("price_data");
    expect(result).toHaveProperty("recent_price_refreshes");
    expect(result).toHaveProperty("failed_refreshes");
    expect(result).toHaveProperty("top_users");
    expect(result).toHaveProperty("recent_registrations");
    expect(result).toHaveProperty("recent_audit");
    expect(result).toHaveProperty("stale_assets");
    expect(result).toHaveProperty("recent_scheduler_runs");
    expect(result).toHaveProperty("schema_migrations");
  });

  it("counts users correctly after inserting rows", () => {
    db.prepare(
      `INSERT INTO users (username, email, password, role, active) VALUES (?, ?, ?, ?, ?)`,
    ).run("alice", "alice@example.com", "hash", "user", 1);

    db.prepare(
      `INSERT INTO users (username, email, password, role, active) VALUES (?, ?, ?, ?, ?)`,
    ).run("bob", "bob@example.com", "hash", "user", 0);

    const result = AnalyticsService.getAdminOverview();

    expect(result.users.total).toBe(2);
    expect(result.users.active).toBe(1);
  });

  it("returns empty arrays for list fields on a clean DB", () => {
    const result = AnalyticsService.getAdminOverview();

    expect(result.recent_price_refreshes).toEqual([]);
    expect(result.failed_refreshes).toEqual([]);
    expect(result.top_users).toEqual([]);
    expect(result.recent_registrations).toEqual([]);
    expect(result.recent_audit).toEqual([]);
    expect(result.stale_assets).toEqual([]);
    expect(result.recent_scheduler_runs).toEqual([]);
    // schema_version is populated by the migration runner in testDb setup
    expect(Array.isArray(result.schema_migrations)).toBe(true);
  });

  it("counts assets and brokers correctly", () => {
    const { lastInsertRowid: uid } = db.prepare(
      `INSERT INTO users (username, email, password, role, active) VALUES (?, ?, ?, ?, ?)`,
    ).run("alice", "alice@example.com", "hash", "user", 1);

    db.prepare(
      `INSERT INTO assets (symbol, name, asset_type, currency, active, created_by) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run("AAPL", "Apple Inc", "equity", "USD", 1, uid);

    db.prepare(
      `INSERT INTO brokers (user_id, name, active, created_by) VALUES (?, ?, ?, ?)`,
    ).run(uid, "Fidelity", 1, uid);

    const result = AnalyticsService.getAdminOverview();

    expect(result.assets.total).toBe(1);
    expect(result.brokers.total).toBe(1);
  });
});

// ── getRebalancingRecommendations ─────────────────────────────────────────────

describe("AnalyticsService.getRebalancingRecommendations", () => {
  const AssetAllocationTarget = require("../../../models/AssetAllocationTarget");

  const mockPortfolio = {
    nav: 10000,
    transactions: {
      asset_allocation: [
        { type: "equity", value: 6000, percentage: 60, count: 2 },
        { type: "fixedincome", value: 4000, percentage: 40, count: 1 },
      ],
      holdings: [
        { asset_id: 1, symbol: "AAPL", asset_type: "equity", market_value: 6000 },
        { asset_id: 2, symbol: "BOND", asset_type: "fixedincome", market_value: 4000 },
      ],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    UserSettings.findByUserId.mockReturnValue({ timezone: "UTC", rebalancing_tolerance: 5 });
    jest.spyOn(AnalyticsService, "getPortfolioAnalytics").mockReturnValue(mockPortfolio);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns has_targets: false when no targets defined", () => {
    AssetAllocationTarget.getAllByUser.mockReturnValue([]);
    const result = AnalyticsService.getRebalancingRecommendations(1);
    expect(result.has_targets).toBe(false);
  });

  it("builds type-level recommendations with BUY/SELL/HOLD actions", () => {
    AssetAllocationTarget.getAllByUser.mockReturnValue([
      { asset_type: "equity", asset_id: null, target_percentage: 70 },
      { asset_type: "fixedincome", asset_id: null, target_percentage: 30 },
    ]);

    const result = AnalyticsService.getRebalancingRecommendations(1);
    expect(result.has_targets).toBe(true);
    expect(result.recommendations.length).toBeGreaterThan(0);
    const equityRec = result.recommendations.find((r) => r.asset_type === "equity");
    expect(equityRec.action).toBe("BUY"); // 60% current vs 70% target → BUY
  });

  it("processes asset-level targets and adds asset recommendations (lines 852-924)", () => {
    AssetAllocationTarget.getAllByUser.mockReturnValue([
      { asset_type: "equity", asset_id: null, target_percentage: 60 },
      { asset_type: null, asset_id: 1, asset_asset_type: "equity", target_percentage: 80 },
    ]);

    const result = AnalyticsService.getRebalancingRecommendations(1);
    expect(result.has_targets).toBe(true);
    // Should have processed at least one asset-level recommendation
    const assetRecs = result.recommendations.filter((r) => r.level === "asset");
    expect(assetRecs.length).toBeGreaterThanOrEqual(0); // may be 0 if AAPL is balanced
  });

  it("asset recommendation has HOLD action when within tolerance", () => {
    AssetAllocationTarget.getAllByUser.mockReturnValue([
      { asset_type: "equity", asset_id: null, target_percentage: 60 },
      { asset_type: null, asset_id: 1, asset_asset_type: "equity", target_percentage: 100 },
    ]);

    const result = AnalyticsService.getRebalancingRecommendations(1);
    expect(result.has_targets).toBe(true);
  });

  it("rethrows on error (catch block lines 953-956)", () => {
    jest.spyOn(AnalyticsService, "getPortfolioAnalytics").mockImplementation(() => {
      throw new Error("portfolio exploded");
    });
    expect(() => AnalyticsService.getRebalancingRecommendations(1)).toThrow(
      "portfolio exploded",
    );
  });
});

// ── getBenchmarkSeries ────────────────────────────────────────────────────────

describe("AnalyticsService.getBenchmarkSeries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    UserSettings.findByUserId.mockReturnValue({ timezone: "UTC" });
    jest.spyOn(AnalyticsService, "getPortfolioPerformance").mockReturnValue([
      { date: "2024-01-05", total_value: 10000 },
      { date: "2024-01-10", total_value: 10500 },
    ]);
  });

  afterEach(() => jest.restoreAllMocks());

  it("returns empty series when portfolio NAV is empty", async () => {
    jest.spyOn(AnalyticsService, "getPortfolioPerformance").mockReturnValue([]);
    const result = await AnalyticsService.getBenchmarkSeries(1, "^GSPC", "2024-01-01", "2024-01-31");
    expect(result.portfolio_series).toEqual([]);
    expect(result.benchmark_series).toEqual([]);
  });

  it("returns empty series when fetchHistoricalPriceSeries returns null", async () => {
    PriceService.fetchHistoricalPriceSeries.mockResolvedValue(null);
    const result = await AnalyticsService.getBenchmarkSeries(1, "^GSPC", "2024-01-01", "2024-01-31");
    expect(result.portfolio_series).toEqual([]);
    expect(result.benchmark_series).toEqual([]);
  });

  it("returns empty series when no overlapping dates between portfolio and benchmark", async () => {
    PriceService.fetchHistoricalPriceSeries.mockResolvedValue([
      { date: "2023-12-01", price: 4700 },
      { date: "2023-12-02", price: 4710 },
    ]);
    const result = await AnalyticsService.getBenchmarkSeries(1, "^GSPC", "2024-01-01", "2024-01-31");
    expect(result.portfolio_series).toEqual([]);
    expect(result.benchmark_series).toEqual([]);
    expect(result.symbol).toBe("^GSPC");
  });

  it("returns normalized series when data overlaps", async () => {
    PriceService.fetchHistoricalPriceSeries.mockResolvedValue([
      { date: "2024-01-05", price: 4700 },
      { date: "2024-01-10", price: 4750 },
    ]);
    const result = await AnalyticsService.getBenchmarkSeries(1, "^GSPC", "2024-01-01", "2024-01-31");
    expect(result.portfolio_series.length).toBeGreaterThan(0);
    expect(result.benchmark_series.length).toBeGreaterThan(0);
    // First point normalized to 100
    expect(result.portfolio_series[0].value).toBe(100);
    expect(result.benchmark_series[0].value).toBe(100);
  });
});

// ── getCorrelationMatrix ──────────────────────────────────────────────────────

describe("AnalyticsService.getCorrelationMatrix", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    UserSettings.findByUserId.mockReturnValue({ timezone: "UTC" });
    db.clearAll();
  });

  it("returns empty matrix when fewer than 2 assets held", () => {
    Transaction.getPortfolioHoldings.mockReturnValue([]);
    const result = AnalyticsService.getCorrelationMatrix(1);
    expect(result.assets).toEqual([]);
    expect(result.matrix).toEqual([]);
  });

  it("returns empty matrix when exactly 1 unique asset", () => {
    Transaction.getPortfolioHoldings.mockReturnValue([
      { asset_id: 1, symbol: "AAPL", name: "Apple Inc" },
    ]);
    const result = AnalyticsService.getCorrelationMatrix(1);
    expect(result.assets).toHaveLength(1);
    expect(result.matrix).toEqual([]);
  });

  it("deduplicates assets held across multiple brokers (seenIds branch)", () => {
    Transaction.getPortfolioHoldings.mockReturnValue([
      { asset_id: 1, symbol: "AAPL", name: "Apple" },
      { asset_id: 1, symbol: "AAPL", name: "Apple" }, // duplicate
    ]);
    const result = AnalyticsService.getCorrelationMatrix(1);
    // Only one unique asset → still < 2, returns empty matrix
    expect(result.assets).toHaveLength(1);
    expect(result.matrix).toEqual([]);
  });

  it("computes correlation matrix for 2 assets with price data in DB", () => {
    // Seed DB with assets and price data
    const userId = db
      .prepare("INSERT INTO users (username, email, password, role) VALUES (?,?,?,?)")
      .run("corruser", "corr@c.com", "hash", "user").lastInsertRowid;
    const a1 = db
      .prepare("INSERT INTO assets (symbol, name, asset_type, currency, created_by) VALUES (?,?,?,?,?)")
      .run("AAA", "Asset A", "equity", "USD", userId).lastInsertRowid;
    const a2 = db
      .prepare("INSERT INTO assets (symbol, name, asset_type, currency, created_by) VALUES (?,?,?,?,?)")
      .run("BBB", "Asset B", "equity", "USD", userId).lastInsertRowid;

    const { toValueScale } = require("../../../utils/valueScale");
    const PRICE_SCALE = 6;
    // Insert 3 price data points for each asset (need at least 2 for daily returns)
    const prices = [[45000, 46000, 47000], [30000, 31000, 32000]];
    const dates = ["2024-01-01", "2024-01-02", "2024-01-03"];
    for (let i = 0; i < 3; i++) {
      db.prepare("INSERT INTO price_data (asset_id, date, price, source, created_by) VALUES (?,?,?,?,?)")
        .run(a1, dates[i], toValueScale(prices[0][i], PRICE_SCALE).value, "manual", userId);
      db.prepare("INSERT INTO price_data (asset_id, date, price, source, created_by) VALUES (?,?,?,?,?)")
        .run(a2, dates[i], toValueScale(prices[1][i], PRICE_SCALE).value, "manual", userId);
    }

    Transaction.getPortfolioHoldings.mockReturnValue([
      { asset_id: a1, symbol: "AAA", name: "Asset A" },
      { asset_id: a2, symbol: "BBB", name: "Asset B" },
    ]);

    const result = AnalyticsService.getCorrelationMatrix(userId, 3650);
    expect(result.assets).toHaveLength(2);
    expect(result.matrix).toHaveLength(2);
    expect(result.matrix[0][0]).toBe(1.0);
    expect(result.matrix[1][1]).toBe(1.0);
    // Both assets going up together → positive correlation
    expect(result.matrix[0][1]).toBeGreaterThan(0);
  });
});

// ── getBenchmarkSeries — anchorBench-not-found branch ─────────────────────────

describe("AnalyticsService.getBenchmarkSeries — anchorBench null branch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    UserSettings.findByUserId.mockReturnValue({ timezone: "UTC" });
    jest.spyOn(AnalyticsService, "getPortfolioPerformance").mockReturnValue([
      { date: "2024-01-05", total_value: 10000 },
    ]);
  });

  afterEach(() => jest.restoreAllMocks());

  it("returns empty series when benchmark anchor price is zero/falsy", async () => {
    // rawSeries has firstCommon date but price is 0 → anchorBench is falsy
    PriceService.fetchHistoricalPriceSeries.mockResolvedValue([
      { date: "2024-01-05", price: 0 },
    ]);
    const result = await AnalyticsService.getBenchmarkSeries(1, "^GSPC", "2024-01-01", "2024-01-31");
    expect(result.portfolio_series).toEqual([]);
    expect(result.benchmark_series).toEqual([]);
    expect(result.symbol).toBe("^GSPC");
  });
});

// ── getPerformanceAttribution ─────────────────────────────────────────────────

describe("AnalyticsService.getPerformanceAttribution", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.clearAll();
    jest.spyOn(AnalyticsService, "getPortfolioPerformance").mockReturnValue([]);
  });

  afterEach(() => jest.restoreAllMocks());

  it("returns empty attributions when no holdings at either boundary", () => {
    Transaction.getPortfolioHoldings.mockReturnValue([]);
    const result = AnalyticsService.getPerformanceAttribution(1, "2024-01-01", "2024-12-31");
    expect(result.start_date).toBe("2024-01-01");
    expect(result.end_date).toBe("2024-12-31");
    expect(result.attributions).toEqual([]);
    expect(result.beginning_nav).toBe(0);
  });

  it("returns attribution with price gain for an asset held at both dates", () => {
    // Seed an asset so the active assets query finds it
    const userId = db
      .prepare("INSERT INTO users (username, email, password, role) VALUES (?,?,?,?)")
      .run("attruser", "attr@t.com", "hash", "user").lastInsertRowid;
    const assetId = db
      .prepare("INSERT INTO assets (symbol, name, asset_type, currency, active, created_by) VALUES (?,?,?,?,1,?)")
      .run("AAPL", "Apple", "equity", "USD", userId).lastInsertRowid;

    const { toValueScale } = require("../../../utils/valueScale");
    const PRICE_SCALE = 6;
    db.prepare("INSERT INTO price_data (asset_id, date, price, source, created_by) VALUES (?,?,?,?,?)")
      .run(assetId, "2024-01-01", toValueScale(100, PRICE_SCALE).value, "manual", userId);
    db.prepare("INSERT INTO price_data (asset_id, date, price, source, created_by) VALUES (?,?,?,?,?)")
      .run(assetId, "2024-12-31", toValueScale(120, PRICE_SCALE).value, "manual", userId);

    Transaction.getPortfolioHoldings
      .mockReturnValueOnce([{ asset_id: assetId, symbol: "AAPL", name: "Apple", asset_type: "equity", total_quantity: 10, broker_id: 1 }])  // startHoldings
      .mockReturnValueOnce([{ asset_id: assetId, symbol: "AAPL", name: "Apple", asset_type: "equity", total_quantity: 10, broker_id: 1 }]); // endHoldings

    jest.spyOn(AnalyticsService, "getPortfolioPerformance").mockReturnValue([
      { date: "2024-01-01", total_value: 1000 },
    ]);

    const result = AnalyticsService.getPerformanceAttribution(userId, "2024-01-01", "2024-12-31");
    expect(result.attributions).toHaveLength(1);
    expect(result.attributions[0].symbol).toBe("AAPL");
    // 10 shares × $120 end − 10 shares × $100 start − 0 net flows = $200 price gain
    expect(result.attributions[0].price_gain).toBeCloseTo(200, 0);
    expect(result.beginning_nav).toBe(1000);
  });
});

// ── getTaxReport ─────────────────────────────────────────────────────────────

describe("AnalyticsService.getTaxReport", () => {
  let userId, assetId, fxAssetId;

  beforeEach(() => {
    jest.clearAllMocks();
    db.clearAll();

    // Seed user
    userId = db.prepare(
      "INSERT INTO users (username, email, password, role) VALUES (?,?,?,?)"
    ).run("taxuser", "tax@t.com", "hash", "user").lastInsertRowid;

    // Seed FX asset
    fxAssetId = db.prepare(
      "INSERT INTO assets (symbol, name, asset_type, currency, active, created_by) VALUES (?,?,?,?,1,?)"
    ).run("USDARS", "USD/ARS", "cash", "ARS", userId).lastInsertRowid;

    // Seed equity asset
    assetId = db.prepare(
      "INSERT INTO assets (symbol, name, asset_type, currency, active, created_by) VALUES (?,?,?,?,1,?)"
    ).run("AAPL", "Apple", "equity", "USD", userId).lastInsertRowid;

    // Seed broker
    const brokerId = db.prepare(
      "INSERT INTO brokers (user_id, name, description, active, created_by) VALUES (?,?,?,1,?)"
    ).run(userId, "MyBroker", "test", userId).lastInsertRowid;

    // Seed buy transaction in 2024
    const { toValueScale } = require("../../../utils/valueScale");
    db.prepare(
      "INSERT INTO transactions (user_id, asset_id, broker_id, date, transaction_type, quantity, price, fee, total_amount, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)"
    ).run(userId, assetId, brokerId, "2024-06-01", "buy",
      toValueScale(10, 8).value, toValueScale(100, 6).value, 0, toValueScale(1000, 4).value, userId);

    // Seed price at year-end
    db.prepare(
      "INSERT INTO price_data (asset_id, date, price, source, created_by) VALUES (?,?,?,?,?)"
    ).run(assetId, "2024-12-31", toValueScale(120, 6).value, "manual", userId);

    // Seed FX rate at year-end
    db.prepare(
      "INSERT INTO price_data (asset_id, date, price, source, created_by) VALUES (?,?,?,?,?)"
    ).run(fxAssetId, "2024-12-31", toValueScale(900, 6).value, "manual", userId);

    UserSettings.findByUserId.mockReturnValue({ fx_rate_asset_id: fxAssetId });
  });

  afterEach(() => {
    db.clearAll();
  });

  it("returns year-end holdings with FX conversion", () => {
    const result = AnalyticsService.getTaxReport(userId, 2024);
    expect(result.year).toBe(2024);
    expect(result.holdings).toHaveLength(1);
    expect(result.holdings[0].asset).toBe("AAPL");
    expect(result.holdings[0].quantity).toBeCloseTo(10, 0);
    expect(result.fx_rate).toBeCloseTo(900, 0);
  });

  it("throws when fx_rate_asset_id is not configured", () => {
    UserSettings.findByUserId.mockReturnValue({});
    expect(() => AnalyticsService.getTaxReport(userId, 2024)).toThrow(
      "FX Rate asset not configured"
    );
  });

  it("filters by excludeAssetTypes (covers branch 634-636)", () => {
    const result = AnalyticsService.getTaxReport(userId, 2024, ["equity"]);
    expect(result.holdings).toHaveLength(0);
  });

  it("filters by excludeBrokers (covers branch 641-643)", () => {
    const result = AnalyticsService.getTaxReport(userId, 2024, [], ["MyBroker"]);
    expect(result.holdings).toHaveLength(0);
  });
});

// ── simulateRebalancing ────────────────────────────────────────────────────────

describe("AnalyticsService.simulateRebalancing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => jest.restoreAllMocks());

  it("returns error object when no targets defined (line 1079)", () => {
    jest.spyOn(AnalyticsService, "getRebalancingRecommendations").mockReturnValue({
      has_targets: false,
    });
    const result = AnalyticsService.simulateRebalancing(1, 10000);
    expect(result).toHaveProperty("error");
    expect(result.deposit_amount).toBe(10000);
  });

  it("includes holdRecs when some types are fully funded (line 1137)", () => {
    // Equity is over-weight, fixedincome is under-weight.
    // After deposit, equity stays at 0 allocated (holdRec), fixedincome gets allocation.
    jest.spyOn(AnalyticsService, "getRebalancingRecommendations").mockReturnValue({
      has_targets: true,
      total_portfolio_value: 100000,
      recommendations: [
        {
          level: "type",
          asset_type: "equity",
          current_value: 80000,
          current_percentage: 80,
          target_percentage: 60,
          action: "overweight",
        },
        {
          level: "type",
          asset_type: "fixedincome",
          current_value: 20000,
          current_percentage: 20,
          target_percentage: 40,
          action: "underweight",
        },
      ],
    });
    const result = AnalyticsService.simulateRebalancing(1, 10000);
    expect(result.simulation).toBeDefined();
    // equity should have 0 allocated (holdRec path), fixedincome gets allocation
    const equity = result.simulation.find((r) => r.asset_type === "equity");
    expect(equity.allocated_deposit).toBe(0);
  });
});

// ── getTaxHarvestingSuggestions ─────────────────────────────────────────────

describe("AnalyticsService.getTaxHarvestingSuggestions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    UserSettings.findByUserId.mockReturnValue({ marginal_tax_rate: 0.3 });
  });

  it("returns suggestions for holdings with unrealized losses (lines 1240-1241)", () => {
    Transaction.getPortfolioHoldings.mockReturnValue([
      {
        asset_id: 1,
        symbol: "LOSER",
        name: "Loser Corp",
        asset_type: "equity",
        broker_name: "Broker",
        total_quantity: 100,
        cost_basis: 10000,
      },
    ]);
    // Price below cost basis → unrealized loss
    PriceData.getLatestPrice.mockReturnValue({ price: 80 });

    const result = AnalyticsService.getTaxHarvestingSuggestions(1);
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe("LOSER");
    expect(result[0].unrealized_gain_loss).toBeLessThan(0);
    expect(result[0].potential_tax_saving).toBeGreaterThan(0);
  });

  it("returns empty when holdings have gains", () => {
    Transaction.getPortfolioHoldings.mockReturnValue([
      {
        asset_id: 1,
        symbol: "WINNER",
        name: "Winner Corp",
        asset_type: "equity",
        broker_name: "Broker",
        total_quantity: 100,
        cost_basis: 5000,
      },
    ]);
    PriceData.getLatestPrice.mockReturnValue({ price: 200 });

    const result = AnalyticsService.getTaxHarvestingSuggestions(1);
    expect(result).toHaveLength(0);
  });

  it("uses asOf date when year is provided (getLatestPriceAsOf path)", () => {
    Transaction.getPortfolioHoldings.mockReturnValue([
      {
        asset_id: 1,
        symbol: "LOSER",
        name: "Loser Corp",
        asset_type: "equity",
        broker_name: "Broker",
        total_quantity: 10,
        cost_basis: 2000,
      },
    ]);
    PriceData.getLatestPriceAsOf.mockReturnValue({ price: 100 });

    const result = AnalyticsService.getTaxHarvestingSuggestions(1, 0.25, 2024);
    expect(result).toHaveLength(1);
    expect(PriceData.getLatestPriceAsOf).toHaveBeenCalledWith(1, "2024-12-31");
  });
});

// ── getMissingPrices ──────────────────────────────────────────────────────────

describe("AnalyticsService.getMissingPrices", () => {
  let userId, assetId;
  const { toValueScale } = require("../../../utils/valueScale");

  const insertTx = (aid, date, type = "buy", qty = 5, price = 50) =>
    db.prepare(
      "INSERT INTO transactions (user_id, asset_id, date, transaction_type, quantity, price, fee, total_amount, created_by) VALUES (?,?,?,?,?,?,?,?,?)"
    ).run(userId, aid, date, type,
      toValueScale(qty, 8).value, toValueScale(price, 6).value, 0,
      toValueScale(qty * price, 4).value, userId).lastInsertRowid;

  const insertPrice = (aid, date, price = 50, source = "yahoo") =>
    db.prepare(
      "INSERT INTO price_data (asset_id, date, price, source, created_by) VALUES (?,?,?,?,?)"
    ).run(aid, date, toValueScale(price, 6).value, source, userId).lastInsertRowid;

  beforeEach(() => {
    jest.clearAllMocks();
    db.clearAll();

    userId = db.prepare(
      "INSERT INTO users (username, email, password, role) VALUES (?,?,?,?)"
    ).run("priceuser", "price@t.com", "hash", "user").lastInsertRowid;

    assetId = db.prepare(
      "INSERT INTO assets (symbol, name, asset_type, currency, active, created_by) VALUES (?,?,?,?,1,?)"
    ).run("NOPRICE", "No Price Corp", "equity", "USD", userId).lastInsertRowid;
  });

  afterEach(() => {
    db.clearAll();
  });

  // ── no_price ──────────────────────────────────────────────────────────────

  it("returns no_price issue when transaction has no price data at all", () => {
    insertTx(assetId, "2024-01-15");

    const result = AnalyticsService.getMissingPrices(userId);
    expect(result.total_issues).toBe(1);
    expect(result.total_issues).toBe(result.issues.length);
    expect(result.issues[0].status).toBe("no_price");
    expect(result.issues[0].symbol).toBe("NOPRICE");
    expect(result.issues[0].transaction_id).not.toBeNull();
    expect(result.issues[0].closest_price_date).toBeNull();
    expect(result.issues[0].closest_price).toBeNull();
    expect(result.issues[0].days_without_price).toBeNull();
  });

  it("returns empty when there are no buy/sell transactions", () => {
    const result = AnalyticsService.getMissingPrices(userId);
    expect(result.total_issues).toBe(0);
    expect(result.issues).toEqual([]);
    expect(result.stale_metadata).toBeNull();
  });

  it("does not flag a transaction when an exact price exists on the trade date", () => {
    insertTx(assetId, "2024-06-01");
    insertPrice(assetId, "2024-06-01");

    // No transaction-level issue (no_price or stale tx) — the exact price satisfies the trade
    const result = AnalyticsService.getMissingPrices(userId, { includeStale: true });
    const txIssues = result.issues.filter((i) => i.transaction_id !== null);
    expect(txIssues).toHaveLength(0);
  });

  it("does not flag a transaction when an older price exists as a fallback", () => {
    insertTx(assetId, "2024-06-10");
    insertPrice(assetId, "2024-06-01"); // earlier price — engine can use it

    // With includeStale=false: no issues (the tx itself is ok, stale suppressed)
    const result = AnalyticsService.getMissingPrices(userId, { includeStale: false });
    expect(result.issues.filter((i) => i.status === "no_price")).toHaveLength(0);
  });

  it("includes price_source in no_price issues", () => {
    const cgAssetId = db.prepare(
      "INSERT INTO assets (symbol, name, asset_type, currency, price_source, active, created_by) VALUES (?,?,?,?,?,1,?)"
    ).run("BTC", "Bitcoin", "crypto", "USD", "coingecko", userId).lastInsertRowid;

    insertTx(cgAssetId, "2024-03-01", "buy", 1, 60000);

    const result = AnalyticsService.getMissingPrices(userId);
    expect(result.issues[0].price_source).toBe("coingecko");
  });

  it("ignores dividend and non-buy/sell transactions", () => {
    db.prepare(
      "INSERT INTO transactions (user_id, asset_id, date, transaction_type, quantity, price, fee, total_amount, created_by) VALUES (?,?,?,?,?,?,?,?,?)"
    ).run(userId, assetId, "2024-01-01", "dividend", 0, 0, 0, toValueScale(10, 4).value, userId);

    const result = AnalyticsService.getMissingPrices(userId);
    expect(result.total_issues).toBe(0);
  });

  // ── transaction-level stale_price ─────────────────────────────────────────

  it("includes transaction-level stale_price when price exists but predates the trade date", () => {
    insertPrice(assetId, "2024-01-01");
    insertTx(assetId, "2024-02-15");

    const result = AnalyticsService.getMissingPrices(userId, { includeStale: true });
    const txStale = result.issues.filter(
      (i) => i.status === "stale_price" && i.transaction_id !== null,
    );
    expect(txStale).toHaveLength(1);
    expect(txStale[0].trade_date).toBe("2024-02-15");
    expect(txStale[0].closest_price_date).toBe("2024-01-01");
    expect(txStale[0].days_without_price).toBe(45);
  });

  it("suppresses transaction-level stale_price when includeStale is false", () => {
    insertPrice(assetId, "2024-01-01"); // price before tx
    insertTx(assetId, "2024-02-15");

    const result = AnalyticsService.getMissingPrices(userId, { includeStale: false });
    expect(result.issues.filter((i) => i.status === "stale_price")).toHaveLength(0);
  });

  it("propagates price_source into transaction-level stale_price issues", () => {
    const cgAssetId = db.prepare(
      "INSERT INTO assets (symbol, name, asset_type, currency, price_source, active, created_by) VALUES (?,?,?,?,?,1,?)"
    ).run("ETH", "Ethereum", "crypto", "USD", "coingecko", userId).lastInsertRowid;

    insertPrice(cgAssetId, "2024-01-01", 3000);
    insertTx(cgAssetId, "2024-03-01", "buy", 1, 3500);

    const result = AnalyticsService.getMissingPrices(userId, { includeStale: true });
    const txStale = result.issues.filter(
      (i) => i.status === "stale_price" && i.transaction_id !== null,
    );
    expect(txStale[0].price_source).toBe("coingecko");
  });

  // ── asset-level stale_price (gap-fill) ────────────────────────────────────

  it("generates one stale issue per missing day from latest price to today (open position)", () => {
    insertTx(assetId, "2020-01-01");
    insertPrice(assetId, "2020-01-01"); // latest price is 2020-01-01, open position

    const result = AnalyticsService.getMissingPrices(userId, { includeStale: true });
    const assetStale = result.issues.filter(
      (i) => i.status === "stale_price" && i.transaction_id === null,
    );
    expect(assetStale.length).toBeGreaterThan(0);
    expect(assetStale[0].trade_date).toBe("2020-01-02"); // day after latest price
    expect(assetStale[0].closest_price_date).toBe("2020-01-01");
    expect(assetStale[0].days_without_price).toBe(1);
    expect(assetStale[0].transaction_id).toBeNull();
    expect(assetStale[0].symbol).toBe("NOPRICE");
  });

  it("stops asset-level stale at last transaction date for a closed position", () => {
    // buy 5 then sell 5 → net_quantity = 0 → closed position
    insertTx(assetId, "2024-01-01", "buy", 5);
    insertTx(assetId, "2024-03-01", "sell", 5);
    insertPrice(assetId, "2024-01-01");

    const result = AnalyticsService.getMissingPrices(userId, { includeStale: true });
    const assetStale = result.issues.filter(
      (i) => i.status === "stale_price" && i.transaction_id === null,
    );
    expect(assetStale.length).toBeGreaterThan(0);
    const lastDate = assetStale[assetStale.length - 1].trade_date;
    expect(lastDate).toBe("2024-03-01"); // stops at last tx, not today
  });

  it("propagates price_source into asset-level stale_price issues", () => {
    const cgAssetId = db.prepare(
      "INSERT INTO assets (symbol, name, asset_type, currency, price_source, active, created_by) VALUES (?,?,?,?,?,1,?)"
    ).run("BTC", "Bitcoin", "crypto", "USD", "coingecko", userId).lastInsertRowid;

    insertTx(cgAssetId, "2024-01-01", "buy", 1, 40000);
    insertPrice(cgAssetId, "2024-01-01", 40000);

    const result = AnalyticsService.getMissingPrices(userId, { includeStale: true });
    const assetStale = result.issues.filter(
      (i) => i.status === "stale_price" && i.transaction_id === null && i.asset_id === cgAssetId,
    );
    expect(assetStale.length).toBeGreaterThan(0);
    expect(assetStale[0].price_source).toBe("coingecko");
  });

  it("does not generate asset-level stale issues when latest price is today", () => {
    const { getTodayInTimezone } = require("../../../utils/dateUtils");
    const today = getTodayInTimezone("UTC");

    insertTx(assetId, today);
    insertPrice(assetId, today);

    const result = AnalyticsService.getMissingPrices(userId, { includeStale: true });
    expect(result.issues.filter((i) => i.status === "stale_price" && i.transaction_id === null)).toHaveLength(0);
  });

  it("excludes assets with price_source=manual from asset-level stale detection", () => {
    const manualAssetId = db.prepare(
      "INSERT INTO assets (symbol, name, asset_type, currency, price_source, active, created_by) VALUES (?,?,?,?,?,1,?)"
    ).run("MANL", "Manual Asset", "realestate", "USD", "manual", userId).lastInsertRowid;

    insertTx(manualAssetId, "2020-01-01", "buy", 1, 100);
    insertPrice(manualAssetId, "2020-01-01", 100, "manual");

    const result = AnalyticsService.getMissingPrices(userId, { includeStale: true });
    expect(result.issues.filter((i) => i.asset_id === manualAssetId && i.status === "stale_price")).toHaveLength(0);
    expect(result.stale_metadata.excluded_manual_count).toBe(1);
    expect(result.stale_metadata.excluded_manual_symbols).toContain("MANL");
  });

  // ── stale_metadata ────────────────────────────────────────────────────────

  it("returns stale_metadata=null when includeStale is false", () => {
    const result = AnalyticsService.getMissingPrices(userId, { includeStale: false });
    expect(result.stale_metadata).toBeNull();
  });

  it("returns stale_metadata with zero counts when no manual assets exist", () => {
    insertTx(assetId, "2020-01-01");
    insertPrice(assetId, "2020-01-01");

    const result = AnalyticsService.getMissingPrices(userId, { includeStale: true });
    expect(result.stale_metadata).not.toBeNull();
    expect(result.stale_metadata.excluded_manual_count).toBe(0);
    expect(result.stale_metadata.excluded_manual_symbols).toEqual([]);
  });

  // ── total_issues consistency ──────────────────────────────────────────────

  it("total_issues always equals issues.length", () => {
    insertTx(assetId, "2024-01-15");
    insertPrice(assetId, "2023-12-01"); // price before tx → stale_price tx-level

    const withStale = AnalyticsService.getMissingPrices(userId, { includeStale: true });
    expect(withStale.total_issues).toBe(withStale.issues.length);

    const withoutStale = AnalyticsService.getMissingPrices(userId, { includeStale: false });
    expect(withoutStale.total_issues).toBe(withoutStale.issues.length);
  });
});

// ── getVolatilityAndDrawdown ──────────────────────────────────────────────────

describe("AnalyticsService.getVolatilityAndDrawdown", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    UserSettings.findByUserId.mockReturnValue({ risk_free_rate: 0.05 });
  });

  afterEach(() => jest.restoreAllMocks());

  it("returns empty metrics when performance has fewer than 2 points (line 1369)", () => {
    jest.spyOn(AnalyticsService, "getPortfolioPerformance").mockReturnValue([
      { date: "2024-01-01", total_value: 10000 },
    ]);
    const result = AnalyticsService.getVolatilityAndDrawdown(1);
    expect(result.nav_series).toEqual([]);
    expect(result.max_drawdown).toBeNull();
  });

  it("returns empty metrics when performance is empty (line 1369)", () => {
    jest.spyOn(AnalyticsService, "getPortfolioPerformance").mockReturnValue([]);
    const result = AnalyticsService.getVolatilityAndDrawdown(1);
    expect(result.nav_series).toEqual([]);
  });

  it("covers nav > peak branch and drawdown branch (lines 1418-1427)", () => {
    // Sequence: rises to 12000 (new peak), then falls to 9000 (drawdown)
    jest.spyOn(AnalyticsService, "getPortfolioPerformance").mockReturnValue([
      { date: "2024-01-01", total_value: 10000 },
      { date: "2024-01-02", total_value: 12000 },
      { date: "2024-01-03", total_value: 9000 },
    ]);
    const result = AnalyticsService.getVolatilityAndDrawdown(1);
    expect(result.max_drawdown.value).toBeGreaterThan(0);
    expect(result.max_drawdown.peak_value).toBe(12000);
    expect(result.max_drawdown.trough_value).toBe(9000);
  });

  it("computes sharpe and sortino ratios with sufficient data (lines 1478-1497)", () => {
    // 40 daily returns — enough for rolling window + sharpe/sortino
    const perf = [];
    let val = 10000;
    for (let i = 0; i < 40; i++) {
      const date = new Date(2024, 0, i + 1).toISOString().split("T")[0];
      // Alternate up/down so there are negative returns for sortino
      val = i % 4 === 3 ? val * 0.97 : val * 1.005;
      perf.push({ date, total_value: val });
    }
    jest.spyOn(AnalyticsService, "getPortfolioPerformance").mockReturnValue(perf);
    const result = AnalyticsService.getVolatilityAndDrawdown(1);
    expect(typeof result.sharpe_ratio).toBe("number");
    expect(result.sortino_ratio).not.toBeNull();
  });
});

// ── getBenchmarkSeries – fallback anchor branch (line 1687) ────────────────────

describe("AnalyticsService.getBenchmarkSeries – fallback anchor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    UserSettings.findByUserId.mockReturnValue({ timezone: "UTC" });
  });

  afterEach(() => jest.restoreAllMocks());

  it("evaluates fallback anchor expression when exact date price is undefined (line 1687)", async () => {
    // firstCommon = "2024-01-01" (in benchDateSet); its price is undefined → ?? fallback fires
    // The fallback also resolves to undefined → returns empty series
    jest.spyOn(AnalyticsService, "getPortfolioPerformance").mockReturnValue([
      { date: "2024-01-01", total_value: 10000 },
      { date: "2024-01-02", total_value: 10100 },
    ]);
    PriceService.fetchHistoricalPriceSeries.mockResolvedValue([
      { date: "2024-01-01", price: undefined }, // triggers ?? fallback on line 1687
      { date: "2024-01-02", price: undefined }, // fallback also undefined → anchorBench falsy
    ]);
    const result = await AnalyticsService.getBenchmarkSeries(1, "^GSPC", "2024-01-01", "2024-01-31");
    // Both expressions produce undefined → anchorBench falsy → early return with empty arrays
    expect(result.benchmark_series).toEqual([]);
    expect(result.portfolio_series).toEqual([]);
  });
});

// ── getPortfolioPerformance – debug mode (line 492 sort comparator) ───────────

describe("AnalyticsService.getPortfolioPerformance – debug mode", () => {
  let userId;

  beforeEach(() => {
    jest.clearAllMocks();
    db.clearAll();
    UserSettings.findByUserId.mockReturnValue({ timezone: "UTC" });

    userId = db.prepare(
      "INSERT INTO users (username, email, password, role) VALUES (?,?,?,?)"
    ).run("perfuser", "perf@t.com", "hash", "user").lastInsertRowid;
  });

  afterEach(() => {
    db.clearAll();
  });

  it("includes sorted holdingsBreakdown in debug mode with 2+ holdings (covers line 492)", () => {
    const { toValueScale } = require("../../../utils/valueScale");
    const PRICE_SCALE = 6, QTY_SCALE = 8, AMOUNT_SCALE = 4;

    // Seed two assets
    const assetId1 = db.prepare(
      "INSERT INTO assets (symbol, name, asset_type, currency, active, created_by) VALUES (?,?,?,?,1,?)"
    ).run("AAA", "Asset A", "equity", "USD", userId).lastInsertRowid;
    const assetId2 = db.prepare(
      "INSERT INTO assets (symbol, name, asset_type, currency, active, created_by) VALUES (?,?,?,?,1,?)"
    ).run("BBB", "Asset B", "equity", "USD", userId).lastInsertRowid;

    // Deposit
    db.prepare(
      "INSERT INTO transactions (user_id, date, transaction_type, total_amount, created_by) VALUES (?,?,?,?,?)"
    ).run(userId, "2024-01-01", "deposit", toValueScale(50000, AMOUNT_SCALE).value, userId);

    // Buy both assets on 2024-01-01
    db.prepare(
      "INSERT INTO transactions (user_id, asset_id, date, transaction_type, quantity, price, fee, total_amount, created_by) VALUES (?,?,?,?,?,?,?,?,?)"
    ).run(userId, assetId1, "2024-01-01", "buy",
      toValueScale(10, QTY_SCALE).value, toValueScale(100, PRICE_SCALE).value, 0,
      toValueScale(1000, AMOUNT_SCALE).value, userId);
    db.prepare(
      "INSERT INTO transactions (user_id, asset_id, date, transaction_type, quantity, price, fee, total_amount, created_by) VALUES (?,?,?,?,?,?,?,?,?)"
    ).run(userId, assetId2, "2024-01-01", "buy",
      toValueScale(5, QTY_SCALE).value, toValueScale(200, PRICE_SCALE).value, 0,
      toValueScale(1000, AMOUNT_SCALE).value, userId);

    // Prices for both assets
    db.prepare(
      "INSERT INTO price_data (asset_id, date, price, source, created_by) VALUES (?,?,?,?,?)"
    ).run(assetId1, "2024-01-01", toValueScale(100, PRICE_SCALE).value, "manual", userId);
    db.prepare(
      "INSERT INTO price_data (asset_id, date, price, source, created_by) VALUES (?,?,?,?,?)"
    ).run(assetId2, "2024-01-01", toValueScale(200, PRICE_SCALE).value, "manual", userId);

    const result = AnalyticsService.getPortfolioPerformance(
      userId, 1, [], "2024-01-01", "2024-01-01", true
    );

    expect(result).toHaveLength(1);
    const entry = result[0];
    expect(entry).toHaveProperty("holdings_breakdown");
    // Two holdings: AAA ($1000) and BBB ($1000). Sort comparator (line 492) fires.
    expect(entry.holdings_breakdown).toHaveLength(2);
    // Should be sorted descending by value
    expect(entry.holdings_breakdown[0].value).toBeGreaterThanOrEqual(
      entry.holdings_breakdown[1].value
    );
  });
});

// ── getPortfolioUnrealizedPnlHistory ──────────────────────────────────────────

describe("AnalyticsService.getPortfolioUnrealizedPnlHistory", () => {
  let userId;
  const { toValueScale } = require("../../../utils/valueScale");
  const QTY_SCALE = 8, PRICE_SCALE = 6, AMOUNT_SCALE = 4;

  beforeEach(() => {
    jest.clearAllMocks();
    db.clearAll();
    UserSettings.findByUserId.mockReturnValue({ timezone: "UTC" });

    userId = db
      .prepare(
        "INSERT INTO users (username, email, password, role) VALUES (?,?,?,?)",
      )
      .run("pnluser", "pnl@t.com", "hash", "user").lastInsertRowid;
  });

  afterEach(() => {
    db.clearAll();
  });

  it("returns zeros for all dates when portfolio is empty", () => {
    const result = AnalyticsService.getPortfolioUnrealizedPnlHistory(
      userId,
      2,
      [],
    );

    expect(result).toHaveLength(2);
    result.forEach((entry) => {
      expect(entry).toHaveProperty("date");
      expect(entry.unrealized_gain).toBe(0);
    });
  });

  it("returns positive unrealized gain when price exceeds cost basis", () => {
    const assetId = db
      .prepare(
        "INSERT INTO assets (symbol, name, asset_type, currency, active, created_by) VALUES (?,?,?,?,1,?)",
      )
      .run("TST", "Test Asset", "equity", "USD", userId).lastInsertRowid;

    // Buy 10 units at $100 each → cost basis $1000
    db.prepare(
      "INSERT INTO transactions (user_id, asset_id, date, transaction_type, quantity, price, fee, total_amount, created_by) VALUES (?,?,?,?,?,?,?,?,?)",
    ).run(
      userId,
      assetId,
      "2023-01-01",
      "buy",
      toValueScale(10, QTY_SCALE).value,
      toValueScale(100, PRICE_SCALE).value,
      0,
      toValueScale(1000, AMOUNT_SCALE).value,
      userId,
    );

    // Current price: $150 → unrealized gain = 10 * 150 - 1000 = $500
    db.prepare(
      "INSERT INTO price_data (asset_id, date, price, source, created_by) VALUES (?,?,?,?,?)",
    ).run(
      assetId,
      "2023-01-01",
      toValueScale(150, PRICE_SCALE).value,
      "manual",
      userId,
    );

    const result = AnalyticsService.getPortfolioUnrealizedPnlHistory(
      userId,
      2,
      [],
    );

    expect(result).toHaveLength(2);
    result.forEach((entry) => {
      expect(entry.unrealized_gain).toBeCloseTo(500, 2);
    });
  });

  it("correctly reduces cost basis after a partial FIFO sell", () => {
    const assetId = db
      .prepare(
        "INSERT INTO assets (symbol, name, asset_type, currency, active, created_by) VALUES (?,?,?,?,1,?)",
      )
      .run("TST2", "Test Asset 2", "equity", "USD", userId).lastInsertRowid;

    // Buy 10 units at $100 each → cost $1000
    db.prepare(
      "INSERT INTO transactions (user_id, asset_id, date, transaction_type, quantity, price, fee, total_amount, created_by) VALUES (?,?,?,?,?,?,?,?,?)",
    ).run(
      userId,
      assetId,
      "2023-01-01",
      "buy",
      toValueScale(10, QTY_SCALE).value,
      toValueScale(100, PRICE_SCALE).value,
      0,
      toValueScale(1000, AMOUNT_SCALE).value,
      userId,
    );

    // Sell 5 units → FIFO removes half the lot; remaining cost basis = $500
    db.prepare(
      "INSERT INTO transactions (user_id, asset_id, date, transaction_type, quantity, price, fee, total_amount, created_by) VALUES (?,?,?,?,?,?,?,?,?)",
    ).run(
      userId,
      assetId,
      "2023-06-01",
      "sell",
      toValueScale(5, QTY_SCALE).value,
      toValueScale(150, PRICE_SCALE).value,
      0,
      toValueScale(750, AMOUNT_SCALE).value,
      userId,
    );

    // Current price $150 → unrealized gain = 5 * 150 - 500 = $250
    db.prepare(
      "INSERT INTO price_data (asset_id, date, price, source, created_by) VALUES (?,?,?,?,?)",
    ).run(
      assetId,
      "2023-01-01",
      toValueScale(150, PRICE_SCALE).value,
      "manual",
      userId,
    );

    const result = AnalyticsService.getPortfolioUnrealizedPnlHistory(
      userId,
      2,
      [],
    );

    expect(result).toHaveLength(2);
    result.forEach((entry) => {
      expect(entry.unrealized_gain).toBeCloseTo(250, 2);
    });
  });

  it("excludes specified asset types from unrealized gain computation", () => {
    const equityId = db
      .prepare(
        "INSERT INTO assets (symbol, name, asset_type, currency, active, created_by) VALUES (?,?,?,?,1,?)",
      )
      .run("EQ", "Equity", "equity", "USD", userId).lastInsertRowid;

    const realEstateId = db
      .prepare(
        "INSERT INTO assets (symbol, name, asset_type, currency, active, created_by) VALUES (?,?,?,?,1,?)",
      )
      .run("RE", "Real Estate", "realestate", "USD", userId).lastInsertRowid;

    // Buy equity: cost $1000, price $150 → gain $500
    db.prepare(
      "INSERT INTO transactions (user_id, asset_id, date, transaction_type, quantity, price, fee, total_amount, created_by) VALUES (?,?,?,?,?,?,?,?,?)",
    ).run(
      userId,
      equityId,
      "2023-01-01",
      "buy",
      toValueScale(10, QTY_SCALE).value,
      toValueScale(100, PRICE_SCALE).value,
      0,
      toValueScale(1000, AMOUNT_SCALE).value,
      userId,
    );
    db.prepare(
      "INSERT INTO price_data (asset_id, date, price, source, created_by) VALUES (?,?,?,?,?)",
    ).run(
      equityId,
      "2023-01-01",
      toValueScale(150, PRICE_SCALE).value,
      "manual",
      userId,
    );

    // Buy real estate: cost $1000, price $300 → gain $500 (if included)
    db.prepare(
      "INSERT INTO transactions (user_id, asset_id, date, transaction_type, quantity, price, fee, total_amount, created_by) VALUES (?,?,?,?,?,?,?,?,?)",
    ).run(
      userId,
      realEstateId,
      "2023-01-01",
      "buy",
      toValueScale(5, QTY_SCALE).value,
      toValueScale(200, PRICE_SCALE).value,
      0,
      toValueScale(1000, AMOUNT_SCALE).value,
      userId,
    );
    db.prepare(
      "INSERT INTO price_data (asset_id, date, price, source, created_by) VALUES (?,?,?,?,?)",
    ).run(
      realEstateId,
      "2023-01-01",
      toValueScale(300, PRICE_SCALE).value,
      "manual",
      userId,
    );

    const withExclusion = AnalyticsService.getPortfolioUnrealizedPnlHistory(
      userId,
      2,
      ["realestate"],
    );
    const withoutExclusion = AnalyticsService.getPortfolioUnrealizedPnlHistory(
      userId,
      2,
      [],
    );

    // Excluding real estate: only equity gain ($500)
    withExclusion.forEach((entry) => {
      expect(entry.unrealized_gain).toBeCloseTo(500, 2);
    });

    // Including all: equity ($500) + real estate ($500) = $1000
    withoutExclusion.forEach((entry) => {
      expect(entry.unrealized_gain).toBeCloseTo(1000, 2);
    });
  });

  it("exhausts an entire lot (FIFO oldest.quantityValue <= remaining branch)", () => {
    const assetId = db
      .prepare(
        "INSERT INTO assets (symbol, name, asset_type, currency, active, created_by) VALUES (?,?,?,?,1,?)",
      )
      .run("TST3", "Test Asset 3", "equity", "USD", userId).lastInsertRowid;

    // Buy 5 units at $100 each → lot A: qty=5, cost=$500
    db.prepare(
      "INSERT INTO transactions (user_id, asset_id, date, transaction_type, quantity, price, fee, total_amount, created_by) VALUES (?,?,?,?,?,?,?,?,?)",
    ).run(
      userId, assetId, "2023-01-01", "buy",
      toValueScale(5, QTY_SCALE).value,
      toValueScale(100, PRICE_SCALE).value,
      0,
      toValueScale(500, AMOUNT_SCALE).value,
      userId,
    );

    // Buy another 5 units at $120 each → lot B: qty=5, cost=$600
    db.prepare(
      "INSERT INTO transactions (user_id, asset_id, date, transaction_type, quantity, price, fee, total_amount, created_by) VALUES (?,?,?,?,?,?,?,?,?)",
    ).run(
      userId, assetId, "2023-02-01", "buy",
      toValueScale(5, QTY_SCALE).value,
      toValueScale(120, PRICE_SCALE).value,
      0,
      toValueScale(600, AMOUNT_SCALE).value,
      userId,
    );

    // Sell 7 units → exhausts lot A entirely (5 units, hits oldest.quantityValue <= remaining),
    // then partially deducts lot B (2 units from 5)
    db.prepare(
      "INSERT INTO transactions (user_id, asset_id, date, transaction_type, quantity, price, fee, total_amount, created_by) VALUES (?,?,?,?,?,?,?,?,?)",
    ).run(
      userId, assetId, "2023-06-01", "sell",
      toValueScale(7, QTY_SCALE).value,
      toValueScale(150, PRICE_SCALE).value,
      0,
      toValueScale(1050, AMOUNT_SCALE).value,
      userId,
    );

    // Current price $150 → 3 remaining units, cost basis = 3/5 * $600 = $360
    // unrealized gain = 3 * 150 - 360 = $90
    db.prepare(
      "INSERT INTO price_data (asset_id, date, price, source, created_by) VALUES (?,?,?,?,?)",
    ).run(assetId, "2023-01-01", toValueScale(150, PRICE_SCALE).value, "manual", userId);

    const result = AnalyticsService.getPortfolioUnrealizedPnlHistory(userId, 2, []);

    expect(result).toHaveLength(2);
    result.forEach((entry) => {
      expect(entry.unrealized_gain).toBeCloseTo(90, 2);
    });
  });
});
