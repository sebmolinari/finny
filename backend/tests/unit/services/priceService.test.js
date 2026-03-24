"use strict";

jest.mock("axios");
jest.mock("../../../models/PriceData");
jest.mock("../../../models/UserSettings");
jest.mock("../../../models/Asset");
jest.mock("../../../utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const axios = require("axios");
const PriceData = require("../../../models/PriceData");
const UserSettings = require("../../../models/UserSettings");
const Asset = require("../../../models/Asset");
const PriceService = require("../../../services/priceService");

beforeEach(() => jest.clearAllMocks());

// ── fetchYahooPrice ────────────────────────────────────────────────────────

describe("PriceService.fetchYahooPrice", () => {
  it("returns price from regularMarketPrice", async () => {
    axios.get.mockResolvedValue({
      data: {
        chart: {
          result: [{ meta: { regularMarketPrice: 150.5 } }],
        },
      },
    });
    const result = await PriceService.fetchYahooPrice("AAPL");
    expect(result).toEqual({ symbol: "AAPL", price: 150.5, source: "yahoo" });
  });

  it("falls back to previousClose when regularMarketPrice is absent", async () => {
    axios.get.mockResolvedValue({
      data: {
        chart: {
          result: [{ meta: { previousClose: 148.0 } }],
        },
      },
    });
    const result = await PriceService.fetchYahooPrice("AAPL");
    expect(result.price).toBe(148.0);
  });

  it("returns null when API returns no result", async () => {
    axios.get.mockResolvedValue({ data: { chart: { result: null } } });
    expect(await PriceService.fetchYahooPrice("AAPL")).toBeNull();
  });

  it("returns null when request throws", async () => {
    axios.get.mockRejectedValue(new Error("timeout"));
    expect(await PriceService.fetchYahooPrice("AAPL")).toBeNull();
  });
});

// ── fetchCoinGeckoPrice ────────────────────────────────────────────────────

describe("PriceService.fetchCoinGeckoPrice", () => {
  it("returns price for a mapped symbol", async () => {
    axios.get.mockResolvedValue({ data: { bitcoin: { usd: 60000 } } });
    const result = await PriceService.fetchCoinGeckoPrice("BTC");
    expect(result).toEqual({ symbol: "BTC", price: 60000.0, source: "coingecko" });
  });

  it("returns null for an unmapped symbol", async () => {
    expect(await PriceService.fetchCoinGeckoPrice("XYZ")).toBeNull();
    expect(axios.get).not.toHaveBeenCalled();
  });

  it("returns null when API returns no price", async () => {
    axios.get.mockResolvedValue({ data: { bitcoin: {} } });
    expect(await PriceService.fetchCoinGeckoPrice("BTC")).toBeNull();
  });

  it("returns null when request throws", async () => {
    axios.get.mockRejectedValue(new Error("network"));
    expect(await PriceService.fetchCoinGeckoPrice("ETH")).toBeNull();
  });
});

// ── fetchDollarApiPrice ────────────────────────────────────────────────────

describe("PriceService.fetchDollarApiPrice", () => {
  it("returns price from venta field", async () => {
    axios.get.mockResolvedValue({ data: { venta: 920.5 } });
    const result = await PriceService.fetchDollarApiPrice("oficial");
    expect(result).toEqual({ symbol: "oficial", price: 920.5, source: "dolarapi" });
  });

  it("returns null when venta is missing", async () => {
    axios.get.mockResolvedValue({ data: {} });
    expect(await PriceService.fetchDollarApiPrice("oficial")).toBeNull();
  });

  it("returns null when request throws", async () => {
    axios.get.mockRejectedValue(new Error("timeout"));
    expect(await PriceService.fetchDollarApiPrice("oficial")).toBeNull();
  });
});

// ── fetchSupabasePrice ────────────────────────────────────────────────────

describe("PriceService.fetchSupabasePrice", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://abc.supabase.co";
    process.env.SUPABASE_API_KEY = "key123";
  });

  afterEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_API_KEY;
  });

  it("returns price with priceFactor applied", async () => {
    axios.get.mockResolvedValue({ status: 200, data: [{ price: 1000, yesterday_price: 990 }] });
    const result = await PriceService.fetchSupabasePrice("BTC", 10);
    expect(result.price).toBeCloseTo(100, 4);
    expect(result.source).toBe("supabase");
  });

  it("falls back to yesterday_price when price is null", async () => {
    axios.get.mockResolvedValue({ status: 200, data: [{ price: null, yesterday_price: 500 }] });
    const result = await PriceService.fetchSupabasePrice("BTC", null);
    expect(result.price).toBeCloseTo(500, 4);
  });

  it("returns null when both prices are null", async () => {
    axios.get.mockResolvedValue({ status: 200, data: [{ price: null, yesterday_price: null }] });
    expect(await PriceService.fetchSupabasePrice("BTC", null)).toBeNull();
  });

  it("returns null when data array is empty", async () => {
    axios.get.mockResolvedValue({ status: 200, data: [] });
    expect(await PriceService.fetchSupabasePrice("BTC", null)).toBeNull();
  });

  it("returns null when SUPABASE vars are missing", async () => {
    delete process.env.SUPABASE_URL;
    expect(await PriceService.fetchSupabasePrice("BTC", null)).toBeNull();
  });
});

// ── fetchHistoricalPrice ───────────────────────────────────────────────────

describe("PriceService.fetchHistoricalPrice", () => {
  it("returns close price from closes array", async () => {
    axios.get.mockResolvedValue({
      data: {
        chart: {
          result: [{
            meta: {},
            timestamp: [1704067200],
            indicators: { quote: [{ close: [155.5] }] },
          }],
        },
      },
    });
    const price = await PriceService.fetchHistoricalPrice("AAPL", "2024-01-01");
    expect(price).toBe(155.5);
  });

  it("falls back to meta.regularMarketPrice when closes is empty", async () => {
    axios.get.mockResolvedValue({
      data: {
        chart: {
          result: [{
            meta: { regularMarketPrice: 148.0 },
            indicators: { quote: [{ close: [] }] },
          }],
        },
      },
    });
    expect(await PriceService.fetchHistoricalPrice("AAPL", "2024-01-01")).toBe(148.0);
  });

  it("returns null when no result", async () => {
    axios.get.mockResolvedValue({ data: { chart: { result: null } } });
    expect(await PriceService.fetchHistoricalPrice("AAPL", "2024-01-01")).toBeNull();
  });

  it("returns null when request throws", async () => {
    axios.get.mockRejectedValue(new Error("timeout"));
    expect(await PriceService.fetchHistoricalPrice("AAPL", "2024-01-01")).toBeNull();
  });
});

// ── fetchPriceBySource ─────────────────────────────────────────────────────

describe("PriceService.fetchPriceBySource", () => {
  it("routes to yahoo", async () => {
    const spy = jest.spyOn(PriceService, "fetchYahooPrice").mockResolvedValue({ symbol: "X", price: 1, source: "yahoo" });
    await PriceService.fetchPriceBySource("X", "yahoo", null);
    expect(spy).toHaveBeenCalledWith("X");
    spy.mockRestore();
  });

  it("routes to coingecko", async () => {
    const spy = jest.spyOn(PriceService, "fetchCoinGeckoPrice").mockResolvedValue(null);
    await PriceService.fetchPriceBySource("BTC", "coingecko", null);
    expect(spy).toHaveBeenCalledWith("BTC");
    spy.mockRestore();
  });

  it("routes to supabase", async () => {
    const spy = jest.spyOn(PriceService, "fetchSupabasePrice").mockResolvedValue(null);
    await PriceService.fetchPriceBySource("T", "supabase", 10);
    expect(spy).toHaveBeenCalledWith("T", 10);
    spy.mockRestore();
  });

  it("routes to dolarapi", async () => {
    const spy = jest.spyOn(PriceService, "fetchDollarApiPrice").mockResolvedValue(null);
    await PriceService.fetchPriceBySource("oficial", "dolarapi", null);
    expect(spy).toHaveBeenCalledWith("oficial");
    spy.mockRestore();
  });

  it("returns null for unknown source", async () => {
    expect(await PriceService.fetchPriceBySource("X", "manual", null)).toBeNull();
  });
});

// ── fetchAssetPrice ────────────────────────────────────────────────────────

describe("PriceService.fetchAssetPrice", () => {
  it("throws when asset has no price_source", async () => {
    await expect(
      PriceService.fetchAssetPrice({ symbol: "X", price_source: null }),
    ).rejects.toThrow("no price source configured");
  });

  it("delegates to fetchPriceBySource with asset fields", async () => {
    const spy = jest.spyOn(PriceService, "fetchPriceBySource").mockResolvedValue(null);
    await PriceService.fetchAssetPrice({ symbol: "AAPL", price_symbol: "AAPL", price_source: "yahoo", price_factor: null });
    expect(spy).toHaveBeenCalledWith("AAPL", "yahoo", null);
    spy.mockRestore();
  });
});

// ── fetchHistoricalPriceSeries ─────────────────────────────────────────────

describe("PriceService.fetchHistoricalPriceSeries", () => {
  it("returns array of { date, price } on success", async () => {
    axios.get.mockResolvedValue({
      data: {
        chart: {
          result: [{
            timestamp: [1704067200, 1704153600],
            indicators: { quote: [{ close: [155.5, 156.0] }] },
          }],
        },
      },
    });
    const result = await PriceService.fetchHistoricalPriceSeries("AAPL", "2024-01-01", "2024-01-10");
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result[0]).toHaveProperty("date");
    expect(result[0]).toHaveProperty("price");
  });

  it("skips null close values in the series", async () => {
    axios.get.mockResolvedValue({
      data: {
        chart: {
          result: [{
            timestamp: [1704067200, 1704153600],
            indicators: { quote: [{ close: [null, 156.0] }] },
          }],
        },
      },
    });
    const result = await PriceService.fetchHistoricalPriceSeries("AAPL", "2024-01-01", "2024-01-10");
    expect(result.length).toBe(1);
  });

  it("returns null when chart result is null", async () => {
    axios.get.mockResolvedValue({ data: { chart: { result: null } } });
    expect(await PriceService.fetchHistoricalPriceSeries("AAPL", "2024-01-01", "2024-01-10")).toBeNull();
  });

  it("returns null when all close values are null (empty series)", async () => {
    axios.get.mockResolvedValue({
      data: {
        chart: {
          result: [{
            timestamp: [1704067200],
            indicators: { quote: [{ close: [null] }] },
          }],
        },
      },
    });
    expect(await PriceService.fetchHistoricalPriceSeries("AAPL", "2024-01-01", "2024-01-10")).toBeNull();
  });

  it("returns null when request throws", async () => {
    axios.get.mockRejectedValue(new Error("timeout"));
    expect(await PriceService.fetchHistoricalPriceSeries("AAPL", "2024-01-01", "2024-01-10")).toBeNull();
  });
});

// ── refreshAllPrices ───────────────────────────────────────────────────────

describe("PriceService.refreshAllPrices", () => {
  it("skips assets with manual price_source", async () => {
    Asset.getAll.mockReturnValue([
      { id: 1, symbol: "CASH", name: "Cash", price_source: "manual" },
    ]);
    UserSettings.findByUserId.mockReturnValue({ timezone: "UTC" });

    const result = await PriceService.refreshAllPrices(1);
    expect(result.skipped).toBe(1);
    expect(result.updated).toBe(0);
    expect(result.failed).toBe(0);
  });

  it("counts failed when fetchAssetPrice returns null", async () => {
    Asset.getAll.mockReturnValue([
      { id: 1, symbol: "AAPL", name: "Apple", price_source: "yahoo", price_symbol: "AAPL", price_factor: null },
    ]);
    UserSettings.findByUserId.mockReturnValue({ timezone: "UTC" });
    jest.spyOn(PriceService, "fetchAssetPrice").mockResolvedValue(null);

    const result = await PriceService.refreshAllPrices(1);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
  });

  it("updates existing price when one already exists for today", async () => {
    Asset.getAll.mockReturnValue([
      { id: 1, symbol: "AAPL", name: "Apple", price_source: "yahoo", price_symbol: "AAPL", price_factor: null },
    ]);
    UserSettings.findByUserId.mockReturnValue({ timezone: "UTC" });
    jest.spyOn(PriceService, "fetchAssetPrice").mockResolvedValue({ price: 155.0, source: "yahoo" });
    PriceData.findByAssetAndDate.mockReturnValue({ id: 10 });
    PriceData.update.mockReturnValue(1);

    const result = await PriceService.refreshAllPrices(1);
    expect(result.updated).toBe(1);
    expect(PriceData.update).toHaveBeenCalled();
    expect(PriceData.create).not.toHaveBeenCalled();
  });

  it("creates new price when none exists for today", async () => {
    Asset.getAll.mockReturnValue([
      { id: 1, symbol: "AAPL", name: "Apple", price_source: "yahoo", price_symbol: "AAPL", price_factor: null },
    ]);
    UserSettings.findByUserId.mockReturnValue({ timezone: "UTC" });
    jest.spyOn(PriceService, "fetchAssetPrice").mockResolvedValue({ price: 155.0, source: "yahoo" });
    PriceData.findByAssetAndDate.mockReturnValue(null);
    PriceData.create.mockReturnValue(1);

    const result = await PriceService.refreshAllPrices(1);
    expect(result.updated).toBe(1);
    expect(PriceData.create).toHaveBeenCalled();
  });

  it("works when userId is null (skips settings lookup)", async () => {
    Asset.getAll.mockReturnValue([]);
    const result = await PriceService.refreshAllPrices(null);
    expect(result.total).toBe(0);
    expect(UserSettings.findByUserId).not.toHaveBeenCalled();
  });

  it("counts failed when fetchAssetPrice throws (inner catch per asset)", async () => {
    Asset.getAll.mockReturnValue([
      { id: 1, symbol: "AAPL", name: "Apple", price_source: "yahoo", price_symbol: "AAPL", price_factor: null },
    ]);
    UserSettings.findByUserId.mockReturnValue({ timezone: "UTC" });
    jest.spyOn(PriceService, "fetchAssetPrice").mockRejectedValue(new Error("network error"));

    const result = await PriceService.refreshAllPrices(1);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
  });
});

// ── refreshAssetPrice ──────────────────────────────────────────────────────

describe("PriceService.refreshAssetPrice", () => {
  beforeEach(() => {
    Asset.findById.mockReturnValue({
      id: 1, symbol: "AAPL", price_source: "yahoo", price_symbol: "AAPL", price_factor: null, active: 1,
    });
    UserSettings.findByUserId.mockReturnValue({ timezone: "UTC" });
    jest.spyOn(PriceService, "fetchAssetPrice").mockResolvedValue({ price: 155.0, source: "yahoo" });
    PriceData.findByAssetAndDate.mockReturnValue(null);
    PriceData.create.mockReturnValue(10);
    PriceData.findById.mockReturnValue({ id: 10, price: 155.0 });
  });

  afterEach(() => jest.restoreAllMocks());

  it("throws when asset not found", async () => {
    Asset.findById.mockReturnValue(null);
    await expect(PriceService.refreshAssetPrice(999, 1)).rejects.toThrow("Asset not found");
  });

  it("returns skipped=true when price_source is manual", async () => {
    Asset.findById.mockReturnValue({ id: 1, symbol: "CASH", price_source: "manual", active: 1 });
    const result = await PriceService.refreshAssetPrice(1, 1);
    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
  });

  it("throws when asset is inactive", async () => {
    Asset.findById.mockReturnValue({
      id: 1, symbol: "AAPL", price_source: "yahoo", active: 0,
    });
    await expect(PriceService.refreshAssetPrice(1, 1)).rejects.toThrow("inactive");
  });

  it("throws when fetchAssetPrice returns null", async () => {
    jest.spyOn(PriceService, "fetchAssetPrice").mockResolvedValue(null);
    await expect(PriceService.refreshAssetPrice(1, 1)).rejects.toThrow("Failed to fetch price");
  });

  it("creates new price when none exists for today", async () => {
    PriceData.findByAssetAndDate.mockReturnValue(null);
    const result = await PriceService.refreshAssetPrice(1, 1);
    expect(result.success).toBe(true);
    expect(PriceData.create).toHaveBeenCalled();
  });

  it("updates existing price when one already exists for today", async () => {
    PriceData.findByAssetAndDate.mockReturnValue({ id: 5 });
    PriceData.update.mockReturnValue(true);
    PriceData.findById.mockReturnValue({ id: 5, price: 155.0 });
    const result = await PriceService.refreshAssetPrice(1, 1);
    expect(result.success).toBe(true);
    expect(PriceData.update).toHaveBeenCalled();
    expect(PriceData.create).not.toHaveBeenCalled();
  });
});
