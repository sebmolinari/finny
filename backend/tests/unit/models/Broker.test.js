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
