const db = require("../../../tests/setup/testDb");
const PriceData = require("../../../models/PriceData");

let userId, assetId;
beforeAll(() => {
  db.clearAll();
  userId = db
    .prepare("INSERT INTO users (username, email, password, role) VALUES (?,?,?,?)")
    .run("priceuser", "p@p.com", "hash", "user").lastInsertRowid;
  assetId = db
    .prepare("INSERT INTO assets (symbol, name, asset_type, currency, created_by) VALUES (?,?,?,?,?)")
    .run("BTC", "Bitcoin", "crypto", "USD", userId).lastInsertRowid;
});

beforeEach(() => {
  db.prepare("DELETE FROM price_data").run();
});

describe("PriceData.create", () => {
  it("creates a price record and returns the id", () => {
    const id = PriceData.create(assetId, "2024-01-01", 45000, "manual", userId);
    expect(typeof id).toBe("number");
  });

  it("throws when a price already exists for the same date", () => {
    PriceData.create(assetId, "2024-01-01", 45000, "manual", userId);
    expect(() => PriceData.create(assetId, "2024-01-01", 46000, "manual", userId)).toThrow();
  });
});

describe("PriceData.findById / findByAssetAndDate", () => {
  it("findById returns the record with price as float", () => {
    const id = PriceData.create(assetId, "2024-01-02", 50000, "manual", userId);
    const row = PriceData.findById(id);
    expect(row.price).toBeCloseTo(50000, 2);
  });

  it("findByAssetAndDate returns the record", () => {
    PriceData.create(assetId, "2024-01-03", 52000, "manual", userId);
    const row = PriceData.findByAssetAndDate(assetId, "2024-01-03");
    expect(row).not.toBeNull();
    expect(row.price).toBeCloseTo(52000, 2);
  });

  it("findByAssetAndDate returns null for unknown date", () => {
    expect(PriceData.findByAssetAndDate(assetId, "1900-01-01")).toBeNull();
  });
});

describe("PriceData.getLatestPrice", () => {
  it("returns null when no data", () => {
    expect(PriceData.getLatestPrice(assetId)).toBeNull();
  });

  it("returns the most recent price", () => {
    PriceData.create(assetId, "2024-01-01", 40000, "manual", userId);
    PriceData.create(assetId, "2024-01-05", 45000, "manual", userId);
    PriceData.create(assetId, "2024-01-03", 43000, "manual", userId);
    const latest = PriceData.getLatestPrice(assetId);
    expect(latest.price).toBeCloseTo(45000, 2);
  });
});

describe("PriceData.getLatestPriceAsOf", () => {
  it("returns the most recent price on or before the given date", () => {
    PriceData.create(assetId, "2024-01-01", 40000, "manual", userId);
    PriceData.create(assetId, "2024-01-10", 50000, "manual", userId);
    const row = PriceData.getLatestPriceAsOf(assetId, "2024-01-05");
    expect(row.price).toBeCloseTo(40000, 2);
  });

  it("returns null when no price on or before the date", () => {
    PriceData.create(assetId, "2024-06-01", 55000, "manual", userId);
    expect(PriceData.getLatestPriceAsOf(assetId, "2024-01-01")).toBeNull();
  });
});

describe("PriceData.update / delete", () => {
  it("update changes the price", () => {
    const id = PriceData.create(assetId, "2024-02-01", 30000, "manual", userId);
    PriceData.update(id, 35000, "manual", userId);
    expect(PriceData.findById(id).price).toBeCloseTo(35000, 2);
  });

  it("delete removes the record", () => {
    const id = PriceData.create(assetId, "2024-03-01", 30000, "manual", userId);
    expect(PriceData.delete(id)).toBe(true);
    expect(PriceData.findById(id)).toBeNull();
  });
});

describe("PriceData.bulkCreate", () => {
  it("inserts multiple price records", () => {
    PriceData.bulkCreate(
      [
        { asset_id: assetId, date: "2024-10-01", price: 1000, source: "manual" },
        { asset_id: assetId, date: "2024-10-02", price: 2000, source: "manual" },
      ],
      userId
    );
    const rows = PriceData.findByAsset(assetId);
    expect(rows.length).toBe(2);
  });

  it("silently skips duplicate dates in bulk insert", () => {
    PriceData.create(assetId, "2024-11-01", 5000, "manual", userId);
    expect(() =>
      PriceData.bulkCreate(
        [{ asset_id: assetId, date: "2024-11-01", price: 9999, source: "manual" }],
        userId
      )
    ).not.toThrow();
  });
});

describe("PriceData.getAssetPriceHistory", () => {
  it("returns price history for the asset", () => {
    PriceData.create(assetId, "2024-12-01", 3000, "manual", userId);
    const history = PriceData.getAssetPriceHistory(assetId, 365 * 5);
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0]).toHaveProperty("date");
    expect(history[0]).toHaveProperty("price");
  });
});

describe("PriceData.findByAsset", () => {
  it("returns price history ordered by date desc", () => {
    PriceData.create(assetId, "2024-04-01", 10000, "manual", userId);
    PriceData.create(assetId, "2024-04-02", 11000, "manual", userId);
    PriceData.create(assetId, "2024-04-03", 12000, "manual", userId);
    const rows = PriceData.findByAsset(assetId);
    expect(rows[0].date).toBe("2024-04-03");
  });

  it("respects startDate filter", () => {
    PriceData.create(assetId, "2024-05-01", 1000, "manual", userId);
    PriceData.create(assetId, "2024-05-10", 2000, "manual", userId);
    const rows = PriceData.findByAsset(assetId, { startDate: "2024-05-05" });
    expect(rows.every((r) => r.date >= "2024-05-05")).toBe(true);
  });

  it("respects endDate filter", () => {
    PriceData.create(assetId, "2024-06-01", 1000, "manual", userId);
    PriceData.create(assetId, "2024-06-10", 2000, "manual", userId);
    PriceData.create(assetId, "2024-06-20", 3000, "manual", userId);
    const rows = PriceData.findByAsset(assetId, { endDate: "2024-06-10" });
    expect(rows.every((r) => r.date <= "2024-06-10")).toBe(true);
    expect(rows.length).toBe(2);
  });
});
