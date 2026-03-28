const db = require("../../../tests/setup/testDb");
const Broker = require("../../../models/Broker");

let userId;
beforeAll(() => {
  db.clearAll();
  userId = db
    .prepare("INSERT INTO users (username, email, password, role) VALUES (?,?,?,?)")
    .run("brokeruser", "b@b.com", "hash", "user").lastInsertRowid;
});

beforeEach(() => {
  db.prepare("DELETE FROM brokers").run();
});

describe("Broker.create / findById / findByUser", () => {
  it("creates a broker and returns the id", () => {
    const id = Broker.create(userId, "TD Ameritrade", "A broker", "https://td.com", 1, userId);
    expect(typeof id).toBe("number");
  });

  it("findById returns the broker for the correct user", () => {
    const id = Broker.create(userId, "Fidelity", null, null, 1, userId);
    const broker = Broker.findById(id, userId);
    expect(broker.name).toBe("Fidelity");
  });

  it("findById returns undefined for the wrong userId", () => {
    const id = Broker.create(userId, "Schwab", null, null, 1, userId);
    expect(Broker.findById(id, userId + 999)).toBeUndefined();
  });

  it("findByUser returns all brokers for the user", () => {
    Broker.create(userId, "Broker A", null, null, 1, userId);
    Broker.create(userId, "Broker B", null, null, 1, userId);
    const brokers = Broker.findByUser(userId);
    expect(brokers.length).toBe(2);
  });

  it("findByUser excludes inactive by default", () => {
    Broker.create(userId, "Inactive", null, null, 0, userId);
    Broker.create(userId, "Active", null, null, 1, userId);
    const brokers = Broker.findByUser(userId);
    expect(brokers.every((b) => b.active === 1)).toBe(true);
  });

  it("findByUser includes inactive when requested", () => {
    Broker.create(userId, "InactiveB", null, null, 0, userId);
    const brokers = Broker.findByUser(userId, { includeInactive: true });
    expect(brokers.some((b) => b.active === 0)).toBe(true);
  });
});

describe("Broker.update", () => {
  it("updates broker fields", () => {
    const id = Broker.create(userId, "OldName", null, null, 1, userId);
    Broker.update(id, userId, { name: "NewName", description: "desc", website: null, active: 1 }, userId);
    expect(Broker.findById(id, userId).name).toBe("NewName");
  });
});

describe("Broker.getBrokerHoldings", () => {
  it("returns an array of broker value objects", () => {
    Broker.create(userId, "Holdings Broker", null, null, 1, userId);
    const holdings = Broker.getBrokerHoldings(userId);
    expect(Array.isArray(holdings)).toBe(true);
  });

  it("includes inactive brokers when requested", () => {
    Broker.create(userId, "Inactive Holdings", null, null, 0, userId);
    const withInactive = Broker.getBrokerHoldings(userId, { includeInactive: true });
    const withoutInactive = Broker.getBrokerHoldings(userId, { includeInactive: false });
    expect(withInactive.length).toBeGreaterThan(withoutInactive.length);
  });

  describe("transfer handling", () => {
    // price stored at PRICE_SCALE=6 → 150 * 1e6 = 150000000
    // quantity stored at QUANTITY_SCALE=8 → 1 unit = 1e8
    const PRICE_VAL = 150 * 1e6;   // $150 per share
    const QTY_100   = 100 * 1e8;   // 100 units
    const QTY_50    =  50 * 1e8;   //  50 units
    // total_amount stored at AMOUNT_SCALE=4 → dollar * 1e4
    const AMT_15000 = 15000 * 1e4; // 100 × $150
    const AMT_7500  =  7500 * 1e4; //  50 × $150

    let b1, b2, assetId;

    beforeEach(() => {
      db.prepare("DELETE FROM transactions").run();
      db.prepare("DELETE FROM price_data").run();
      db.prepare("DELETE FROM assets").run();

      b1 = Broker.create(userId, "Broker1", null, null, 1, userId);
      b2 = Broker.create(userId, "Broker2", null, null, 1, userId);

      assetId = db
        .prepare("INSERT INTO assets (symbol, name, asset_type, currency, created_by) VALUES (?,?,?,?,?)")
        .run("AAPL", "Apple Inc", "equity", "USD", userId).lastInsertRowid;

      db.prepare("INSERT INTO price_data (asset_id, date, price, created_by) VALUES (?,?,?,?)")
        .run(assetId, "2024-06-01", PRICE_VAL, userId);
    });

    it("reflects a buy at source broker with no transfers", () => {
      db.prepare(
        "INSERT INTO transactions (user_id, asset_id, broker_id, date, transaction_type, quantity, price, fee, total_amount, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)",
      ).run(userId, assetId, b1, "2024-01-10", "buy", QTY_100, PRICE_VAL, 0, AMT_15000, userId);

      const holdings = Broker.getBrokerHoldings(userId);
      const h1 = holdings.find((h) => h.name === "Broker1");
      const h2 = holdings.find((h) => h.name === "Broker2");

      expect(h1.current_value).toBeCloseTo(100 * 150, 2); // $15 000
      expect(h2.current_value).toBeCloseTo(0, 2);
    });

    it("moves exposure from source to destination broker after a transfer", () => {
      // Buy 100 at b1
      db.prepare(
        "INSERT INTO transactions (user_id, asset_id, broker_id, date, transaction_type, quantity, price, fee, total_amount, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)",
      ).run(userId, assetId, b1, "2024-01-10", "buy", QTY_100, PRICE_VAL, 0, AMT_15000, userId);

      // Transfer 50 from b1 → b2
      db.prepare(
        "INSERT INTO transactions (user_id, asset_id, broker_id, destination_broker_id, date, transaction_type, quantity, price, fee, total_amount, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      ).run(userId, assetId, b1, b2, "2024-02-01", "transfer", QTY_50, PRICE_VAL, 0, AMT_7500, userId);

      const holdings = Broker.getBrokerHoldings(userId);
      const h1 = holdings.find((h) => h.name === "Broker1");
      const h2 = holdings.find((h) => h.name === "Broker2");

      expect(h1.current_value).toBeCloseTo(50 * 150, 2); // $7 500
      expect(h2.current_value).toBeCloseTo(50 * 150, 2); // $7 500
    });

    it("shows zero exposure at source after transferring full position", () => {
      db.prepare(
        "INSERT INTO transactions (user_id, asset_id, broker_id, date, transaction_type, quantity, price, fee, total_amount, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)",
      ).run(userId, assetId, b1, "2024-01-10", "buy", QTY_100, PRICE_VAL, 0, AMT_15000, userId);

      // Transfer all 100 from b1 → b2
      db.prepare(
        "INSERT INTO transactions (user_id, asset_id, broker_id, destination_broker_id, date, transaction_type, quantity, price, fee, total_amount, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      ).run(userId, assetId, b1, b2, "2024-02-01", "transfer", QTY_100, PRICE_VAL, 0, AMT_15000, userId);

      const holdings = Broker.getBrokerHoldings(userId);
      const h1 = holdings.find((h) => h.name === "Broker1");
      const h2 = holdings.find((h) => h.name === "Broker2");

      expect(h1.current_value).toBeCloseTo(0, 2);
      expect(h2.current_value).toBeCloseTo(100 * 150, 2); // $15 000
    });
  });
});

describe("Broker.delete", () => {
  it("deletes a broker and returns true", () => {
    const id = Broker.create(userId, "ToDelete", null, null, 1, userId);
    expect(Broker.delete(id, userId)).toBe(true);
    expect(Broker.findById(id, userId)).toBeUndefined();
  });

  it("returns false when broker does not exist", () => {
    expect(Broker.delete(99999, userId)).toBe(false);
  });
});
