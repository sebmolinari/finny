const db = require("../../../tests/setup/testDb");
const Asset = require("../../../models/Asset");

// Seed a user row so created_by FK is satisfied
let userId;
beforeAll(() => {
  db.clearAll();
  userId = db
    .prepare("INSERT INTO users (username, email, password, role) VALUES (?,?,?,?)")
    .run("testuser", "t@t.com", "hash", "admin").lastInsertRowid;
});

beforeEach(() => {
  db.prepare("DELETE FROM price_data").run();
  db.prepare("DELETE FROM assets").run();
});

const createAsset = (symbol = "AAPL") =>
  Asset.create(symbol, "Apple Inc", "equity", "USD", "yahoo", symbol, 1, null, userId);

describe("Asset.create / findById / findBySymbol", () => {
  it("creates an asset and returns the id", () => {
    const id = createAsset("AAPL");
    expect(typeof id).toBe("number");
  });

  it("findById returns the asset", () => {
    const id = createAsset("MSFT");
    const asset = Asset.findById(id);
    expect(asset.symbol).toBe("MSFT");
    expect(asset.name).toBe("Apple Inc");
  });

  it("findBySymbol returns the asset", () => {
    createAsset("GOOG");
    expect(Asset.findBySymbol("GOOG").symbol).toBe("GOOG");
  });

  it("findBySymbol returns undefined for unknown symbol", () => {
    expect(Asset.findBySymbol("UNKNOWN")).toBeUndefined();
  });
});

describe("Asset.update", () => {
  it("updates fields and returns true", () => {
    const id = createAsset("AMZN");
    const result = Asset.update(id, { name: "Amazon", asset_type: "equity", currency: "USD", price_source: "yahoo", price_symbol: "AMZN", active: 1, price_factor: null }, userId);
    expect(result).toBe(true);
    expect(Asset.findById(id).name).toBe("Amazon");
  });
});

describe("Asset.delete", () => {
  it("removes the asset and returns true", () => {
    const id = createAsset("TSLA");
    expect(Asset.delete(id)).toBe(true);
    expect(Asset.findById(id)).toBeUndefined();
  });

  it("returns false when asset does not exist", () => {
    expect(Asset.delete(99999)).toBe(false);
  });
});

describe("Asset.getAll", () => {
  beforeEach(() => {
    createAsset("A1");
    createAsset("A2");
    const id = createAsset("A3");
    Asset.update(id, { name: "A3", asset_type: "equity", currency: "USD", price_source: "yahoo", price_symbol: "A3", active: 0, price_factor: null }, userId);
  });

  it("returns only active assets by default", () => {
    const assets = Asset.getAll();
    expect(assets.every((a) => a.active === 1)).toBe(true);
  });

  it("includes inactive assets when requested", () => {
    const assets = Asset.getAll({ includeInactive: true });
    expect(assets.some((a) => a.active === 0)).toBe(true);
  });

  it("filters by assetType", () => {
    const assets = Asset.getAll({ assetType: "equity" });
    expect(assets.every((a) => a.asset_type === "equity")).toBe(true);
  });

  it("filters by search term (symbol)", () => {
    const assets = Asset.getAll({ search: "A1" });
    expect(assets.length).toBe(1);
    expect(assets[0].symbol).toBe("A1");
  });
});

describe("Asset.getLatestPrice", () => {
  it("returns null when no price data exists", () => {
    const id = createAsset("NOPR");
    expect(Asset.getLatestPrice(id)).toBeNull();
  });

  it("returns the latest price", () => {
    const id = createAsset("PRICED");
    db.prepare("INSERT INTO price_data (asset_id, date, price, source, created_by) VALUES (?,?,?,?,?)")
      .run(id, "2024-01-01", 1500000, "manual", userId); // 1.5 in PRICE_SCALE=6
    const result = Asset.getLatestPrice(id);
    expect(result.price).toBeCloseTo(1.5, 4);
  });
});
