"use strict";

const db = require("../../setup/testDb");
const Transaction = require("../../../models/Transaction");

beforeEach(() => db.clearAll());

// ── Seed helpers ─────────────────────────────────────────────────────────────

function seedUser(id = 1) {
  db.prepare(
    "INSERT INTO users (id, username, email, password, created_by) VALUES (?, ?, ?, 'hash', ?)",
  ).run(id, `user${id}`, `u${id}@t.com`, id);
}

function seedUserSettings(userId = 1) {
  db.prepare(
    "INSERT INTO user_settings (user_id, timezone, created_by) VALUES (?, 'UTC', ?)",
  ).run(userId, userId);
}

function seedAsset(id = 1, symbol = "AAPL") {
  db.prepare(
    "INSERT INTO assets (id, symbol, name, asset_type, currency, created_by) VALUES (?, ?, ?, 'stock', 'USD', 1)",
  ).run(id, symbol, symbol + " Inc");
}

function seedBroker(id = 1, userId = 1) {
  db.prepare(
    "INSERT INTO brokers (id, user_id, name, created_by) VALUES (?, ?, ?, ?)",
  ).run(id, userId, `Broker${id}`, userId);
}

// Create a transaction using value scale constants (quantity * 1e8, price * 1e6, fee * 1e4, amount * 1e4)
function makeTxData(overrides = {}) {
  return {
    asset_id: 1,
    broker_id: 1,
    destination_broker_id: null,
    date: "2024-01-10",
    transaction_type: "buy",
    quantity: 10,
    price: 100,
    fee: 1,
    total_amount: 1001,
    notes: "test",
    ...overrides,
  };
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

describe("Transaction.create", () => {
  beforeEach(() => {
    seedUser(1);
    seedAsset(1);
    seedBroker(1, 1);
  });

  it("inserts a transaction and returns its id", () => {
    const id = Transaction.create(1, makeTxData(), 1);
    expect(typeof id).toBe("number");
    expect(id).toBeGreaterThan(0);
  });

  it("stores destination_broker_id as null by default", () => {
    const id = Transaction.create(1, makeTxData(), 1);
    const row = db.prepare("SELECT * FROM transactions WHERE id = ?").get(id);
    expect(row.destination_broker_id).toBeNull();
  });
});

describe("Transaction.findById", () => {
  beforeEach(() => {
    seedUser(1);
    seedAsset(1);
    seedBroker(1, 1);
  });

  it("returns the transaction with float conversions", () => {
    const id = Transaction.create(1, makeTxData(), 1);
    const t = Transaction.findById(id, 1);
    expect(t).not.toBeNull();
    expect(t.quantity).toBeCloseTo(10, 5);
    expect(t.price).toBeCloseTo(100, 4);
    expect(t.fee).toBeCloseTo(1, 2);
    expect(t.total_amount).toBeCloseTo(1001, 2);
  });

  it("returns null for wrong userId", () => {
    const id = Transaction.create(1, makeTxData(), 1);
    expect(Transaction.findById(id, 999)).toBeNull();
  });

  it("returns null for non-existent id", () => {
    expect(Transaction.findById(9999, 1)).toBeNull();
  });
});

describe("Transaction.findByUser", () => {
  beforeEach(() => {
    seedUser(1);
    seedAsset(1);
    seedBroker(1, 1);
  });

  it("returns all transactions for a user", () => {
    Transaction.create(1, makeTxData(), 1);
    Transaction.create(1, makeTxData({ date: "2024-02-01" }), 1);
    const { data } = Transaction.findByUser(1);
    expect(data).toHaveLength(2);
  });

  it("returns empty data array when no transactions exist", () => {
    const { data } = Transaction.findByUser(1);
    expect(data).toEqual([]);
  });
});

describe("Transaction.update", () => {
  beforeEach(() => {
    seedUser(1);
    seedAsset(1);
    seedBroker(1, 1);
  });

  it("updates a transaction and returns true", () => {
    const id = Transaction.create(1, makeTxData(), 1);
    const ok = Transaction.update(id, 1, makeTxData({ price: 200, total_amount: 2001 }), 1);
    expect(ok).toBe(true);
    const updated = Transaction.findById(id, 1);
    expect(updated.price).toBeCloseTo(200, 4);
  });

  it("returns false for wrong userId", () => {
    const id = Transaction.create(1, makeTxData(), 1);
    expect(Transaction.update(id, 999, makeTxData(), 1)).toBe(false);
  });
});

describe("Transaction.delete", () => {
  beforeEach(() => {
    seedUser(1);
    seedAsset(1);
    seedBroker(1, 1);
  });

  it("deletes a transaction and returns true", () => {
    const id = Transaction.create(1, makeTxData(), 1);
    expect(Transaction.delete(id, 1)).toBe(true);
    expect(Transaction.findById(id, 1)).toBeNull();
  });

  it("returns false for non-existent id", () => {
    expect(Transaction.delete(9999, 1)).toBe(false);
  });
});

// ── Utility queries ───────────────────────────────────────────────────────────

describe("Transaction.getFirstTransactionDate", () => {
  beforeEach(() => {
    seedUser(1);
    seedAsset(1);
    seedBroker(1, 1);
  });

  it("returns the earliest date", () => {
    Transaction.create(1, makeTxData({ date: "2024-03-01" }), 1);
    Transaction.create(1, makeTxData({ date: "2024-01-01" }), 1);
    expect(Transaction.getFirstTransactionDate(1)).toBe("2024-01-01");
  });

  it("returns null when no transactions", () => {
    expect(Transaction.getFirstTransactionDate(1)).toBeNull();
  });
});

describe("Transaction.getNetInvested", () => {
  beforeEach(() => {
    seedUser(1);
    seedAsset(1);
    seedBroker(1, 1);
  });

  it("returns buy minus sell amounts", () => {
    Transaction.create(1, makeTxData({ transaction_type: "buy", total_amount: 1000 }), 1);
    Transaction.create(1, makeTxData({ transaction_type: "sell", total_amount: 500 }), 1);
    const net = Transaction.getNetInvested(1);
    expect(net).toBeCloseTo(500, 2);
  });

  it("returns 0 when no transactions", () => {
    expect(Transaction.getNetInvested(1)).toBe(0);
  });
});

describe("Transaction.getNetContributions", () => {
  beforeEach(() => {
    seedUser(1);
    seedAsset(1);
    seedBroker(1, 1);
  });

  it("returns deposit minus withdraw amounts", () => {
    Transaction.create(1, makeTxData({ transaction_type: "deposit", total_amount: 5000 }), 1);
    Transaction.create(1, makeTxData({ transaction_type: "withdraw", total_amount: 1000 }), 1);
    const net = Transaction.getNetContributions(1);
    expect(net).toBeCloseTo(4000, 2);
  });

  it("ignores buy/sell for contributions", () => {
    Transaction.create(1, makeTxData({ transaction_type: "buy", total_amount: 1000 }), 1);
    expect(Transaction.getNetContributions(1)).toBe(0);
  });
});

describe("Transaction.getCashBalance", () => {
  beforeEach(() => {
    seedUser(1);
    seedAsset(1);
    seedBroker(1, 1);
  });

  it("deposit increases, buy decreases cash balance", () => {
    Transaction.create(1, makeTxData({ transaction_type: "deposit", total_amount: 10000 }), 1);
    Transaction.create(1, makeTxData({ transaction_type: "buy", total_amount: 3000 }), 1);
    expect(Transaction.getCashBalance(1)).toBeCloseTo(7000, 2);
  });

  it("sell increases cash balance", () => {
    Transaction.create(1, makeTxData({ transaction_type: "sell", total_amount: 2000 }), 1);
    expect(Transaction.getCashBalance(1)).toBeCloseTo(2000, 2);
  });

  it("withdraw decreases cash balance", () => {
    Transaction.create(1, makeTxData({ transaction_type: "withdraw", total_amount: 500 }), 1);
    expect(Transaction.getCashBalance(1)).toBeCloseTo(-500, 2);
  });

  it("dividend, interest, rental, coupon add to cash", () => {
    for (const type of ["dividend", "interest", "rental", "coupon"]) {
      Transaction.create(1, makeTxData({ transaction_type: type, total_amount: 100 }), 1);
    }
    expect(Transaction.getCashBalance(1)).toBeCloseTo(400, 2);
  });

  it("returns 0 when no transactions", () => {
    expect(Transaction.getCashBalance(1)).toBe(0);
  });
});

describe("Transaction.getAllTransactionsForMWRR", () => {
  beforeEach(() => {
    seedUser(1);
    seedAsset(1);
    seedBroker(1, 1);
  });

  it("returns only deposit and withdraw types with float amounts", () => {
    Transaction.create(1, makeTxData({ transaction_type: "deposit", total_amount: 5000 }), 1);
    Transaction.create(1, makeTxData({ transaction_type: "buy", total_amount: 3000 }), 1);
    const rows = Transaction.getAllTransactionsForMWRR(1);
    expect(rows).toHaveLength(1);
    expect(rows[0].transaction_type).toBe("deposit");
    expect(rows[0].total_amount).toBeCloseTo(5000, 2);
  });
});

// ── Portfolio holdings (FIFO) ─────────────────────────────────────────────────

describe("Transaction.getPortfolioHoldings", () => {
  beforeEach(() => {
    seedUser(1);
    seedAsset(1);
    seedBroker(1, 1);
  });

  it("returns empty array with no transactions", () => {
    expect(Transaction.getPortfolioHoldings(1)).toEqual([]);
  });

  it("calculates held quantity from a single buy", () => {
    Transaction.create(1, makeTxData({ quantity: 10, price: 100, total_amount: 1000 }), 1);
    const holdings = Transaction.getPortfolioHoldings(1);
    expect(holdings).toHaveLength(1);
    expect(holdings[0].total_quantity).toBeCloseTo(10, 5);
    expect(holdings[0].cost_basis).toBeCloseTo(1000, 2);
    expect(holdings[0].realized_gain).toBe(0);
  });

  it("applies FIFO on partial sell", () => {
    Transaction.create(1, makeTxData({ quantity: 10, price: 100, total_amount: 1000, date: "2024-01-01" }), 1);
    Transaction.create(1, makeTxData({ transaction_type: "sell", quantity: 4, price: 150, total_amount: 600, date: "2024-06-01" }), 1);
    const holdings = Transaction.getPortfolioHoldings(1);
    expect(holdings).toHaveLength(1);
    expect(holdings[0].total_quantity).toBeCloseTo(6, 5);
    // Cost basis of 6 remaining shares: 6/10 * 1000 = 600
    expect(holdings[0].cost_basis).toBeCloseTo(600, 2);
    // Realized gain: 600 - (4/10 * 1000) = 600 - 400 = 200
    expect(holdings[0].realized_gain).toBeCloseTo(200, 2);
  });

  it("excludes zero-quantity holdings when hideZeroQuantity=true", () => {
    Transaction.create(1, makeTxData({ quantity: 5, price: 100, total_amount: 500, date: "2024-01-01" }), 1);
    Transaction.create(1, makeTxData({ transaction_type: "sell", quantity: 5, price: 120, total_amount: 600, date: "2024-06-01" }), 1);
    const holdings = Transaction.getPortfolioHoldings(1, true);
    expect(holdings).toHaveLength(0);
  });

  it("includes zero-quantity holdings when hideZeroQuantity=false", () => {
    Transaction.create(1, makeTxData({ quantity: 5, price: 100, total_amount: 500, date: "2024-01-01" }), 1);
    Transaction.create(1, makeTxData({ transaction_type: "sell", quantity: 5, price: 120, total_amount: 600, date: "2024-06-01" }), 1);
    const holdings = Transaction.getPortfolioHoldings(1, false);
    expect(holdings).toHaveLength(1);
    expect(holdings[0].total_quantity).toBeCloseTo(0, 5);
  });

  it("filters by asOf date", () => {
    // Buy on Jan 1, sell on Jun 1 — query asOf Feb 1 should show full position
    Transaction.create(1, makeTxData({ quantity: 10, price: 100, total_amount: 1000, date: "2024-01-01" }), 1);
    Transaction.create(1, makeTxData({ transaction_type: "sell", quantity: 10, price: 120, total_amount: 1200, date: "2024-06-01" }), 1);
    const holdings = Transaction.getPortfolioHoldings(1, true, "2024-02-01");
    expect(holdings).toHaveLength(1);
    expect(holdings[0].total_quantity).toBeCloseTo(10, 5);
  });

  it("handles transfer between brokers", () => {
    seedBroker(2, 1);
    // Buy at broker 1
    Transaction.create(1, makeTxData({ quantity: 10, price: 100, total_amount: 1000, date: "2024-01-01" }), 1);
    // Transfer from broker 1 to broker 2
    Transaction.create(1, makeTxData({
      transaction_type: "transfer",
      broker_id: 1,
      destination_broker_id: 2,
      quantity: 10,
      price: 100,
      total_amount: 1000,
      date: "2024-03-01",
    }), 1);
    const holdings = Transaction.getPortfolioHoldings(1, true);
    // Broker 1 should have 0 shares (transferred out), broker 2 should have 10
    const b1 = holdings.find((h) => h.broker_id === 1);
    const b2 = holdings.find((h) => h.broker_id === 2);
    expect(b1).toBeUndefined(); // hidden (zero qty)
    expect(b2).toBeDefined();
    expect(b2.total_quantity).toBeCloseTo(10, 5);
  });
});

// ── Realized gains report ─────────────────────────────────────────────────────

describe("Transaction.getRealizedGainsReport", () => {
  beforeEach(() => {
    seedUser(1);
    seedAsset(1);
    seedBroker(1, 1);
  });

  it("returns empty array when no transactions", () => {
    expect(Transaction.getRealizedGainsReport(1)).toEqual([]);
  });

  it("produces a closed position record for a full sell", () => {
    Transaction.create(1, makeTxData({ quantity: 5, price: 100, total_amount: 500, date: "2024-01-01" }), 1);
    Transaction.create(1, makeTxData({ transaction_type: "sell", quantity: 5, price: 150, total_amount: 750, date: "2024-06-01" }), 1);
    const report = Transaction.getRealizedGainsReport(1);
    expect(report).toHaveLength(1);
    expect(report[0].gain_loss).toBeCloseTo(250, 2);
    expect(report[0].holding_days).toBeGreaterThan(0);
  });

  it("filters by year", () => {
    Transaction.create(1, makeTxData({ quantity: 5, price: 100, total_amount: 500, date: "2023-01-01" }), 1);
    Transaction.create(1, makeTxData({ transaction_type: "sell", quantity: 5, price: 120, total_amount: 600, date: "2023-06-01" }), 1);
    expect(Transaction.getRealizedGainsReport(1, 2024)).toHaveLength(0);
    expect(Transaction.getRealizedGainsReport(1, 2023)).toHaveLength(1);
  });

  it("detects wash sale on loss with repurchase within 30 days", () => {
    // Sell at a loss on Jun 1, then repurchase on Jun 15 (within 30 days)
    Transaction.create(1, makeTxData({ quantity: 5, price: 200, total_amount: 1000, date: "2024-01-01" }), 1);
    Transaction.create(1, makeTxData({ transaction_type: "sell", quantity: 5, price: 150, total_amount: 750, date: "2024-06-01" }), 1);
    Transaction.create(1, makeTxData({ quantity: 5, price: 155, total_amount: 775, date: "2024-06-15" }), 1);
    const report = Transaction.getRealizedGainsReport(1, 2024);
    // The sell produces a loss record — should flag wash sale
    const lossRecord = report.find((r) => r.gain_loss < 0);
    expect(lossRecord).toBeDefined();
    expect(lossRecord.is_wash_sale).toBe(true);
  });
});

// ── getAssetBrokerBalance ──────────────────────────────────────────────────────

describe("Transaction.getAssetBrokerBalance", () => {
  beforeEach(() => {
    seedUser(1);
    seedAsset(1);
    seedBroker(1, 1);
    seedBroker(2, 1);
  });

  it("returns correct balance after buy and sell", () => {
    Transaction.create(1, makeTxData({ quantity: 10, price: 100, total_amount: 1000 }), 1);
    Transaction.create(1, makeTxData({ transaction_type: "sell", quantity: 3, price: 100, total_amount: 300 }), 1);
    expect(Transaction.getAssetBrokerBalance(1, 1, 1)).toBeCloseTo(7, 5);
  });

  it("accounts for outgoing and incoming transfers", () => {
    Transaction.create(1, makeTxData({ quantity: 10, price: 100, total_amount: 1000, broker_id: 1, date: "2024-01-01" }), 1);
    Transaction.create(1, makeTxData({
      transaction_type: "transfer",
      broker_id: 1,
      destination_broker_id: 2,
      quantity: 4,
      price: 100,
      total_amount: 400,
      date: "2024-03-01",
    }), 1);
    expect(Transaction.getAssetBrokerBalance(1, 1, 1)).toBeCloseTo(6, 5);
    expect(Transaction.getAssetBrokerBalance(1, 1, 2)).toBeCloseTo(4, 5);
  });

  it("returns 0 when no transactions", () => {
    expect(Transaction.getAssetBrokerBalance(1, 1, 1)).toBe(0);
  });
});

// ── getLiquidityBalance ───────────────────────────────────────────────────────

describe("Transaction.getLiquidityBalance", () => {
  beforeEach(() => {
    seedUser(1);
    seedAsset(1, "MMKT");
    seedBroker(1, 1);
    seedUserSettings(1);
  });

  it("returns 0 when no liquidity_asset_id configured", () => {
    expect(Transaction.getLiquidityBalance(1)).toBe(0);
  });

  it("calculates balance from buys and sells when liquidity asset configured", () => {
    // Configure liquidity asset
    db.prepare("UPDATE user_settings SET liquidity_asset_id = 1 WHERE user_id = 1").run();
    // Add a price
    db.prepare(
      "INSERT INTO price_data (asset_id, date, price, created_by) VALUES (1, '2024-01-10', 10000, 1)",
    ).run(); // price = 1.0 (10000 / 1e6)
    Transaction.create(1, makeTxData({ quantity: 100, price: 1, total_amount: 100 }), 1);
    Transaction.create(1, makeTxData({ transaction_type: "sell", quantity: 20, price: 1, total_amount: 20 }), 1);
    // Balance: 80 units * price ~1.0 = ~80
    const balance = Transaction.getLiquidityBalance(1);
    expect(balance).toBeGreaterThan(0);
  });
});

// ── MWRR ──────────────────────────────────────────────────────────────────────

describe("Transaction.calculateMWRR", () => {
  beforeEach(() => {
    seedUser(1);
    seedUserSettings(1);
    seedAsset(1);
    seedBroker(1, 1);
  });

  it("returns 0 when no cash flow transactions", () => {
    expect(Transaction.calculateMWRR(1, 10000)).toBe(0);
  });

  it("returns a numeric rate with deposit and current value", () => {
    Transaction.create(1, makeTxData({ transaction_type: "deposit", total_amount: 10000, date: "2022-01-01" }), 1);
    const rate = Transaction.calculateMWRR(1, 12000);
    expect(typeof rate).toBe("number");
    expect(rate).toBeGreaterThan(0);
  });
});

describe("Transaction.calculateMWRRDetails", () => {
  beforeEach(() => {
    seedUser(1);
    seedUserSettings(1);
    seedAsset(1);
    seedBroker(1, 1);
  });

  it("returns zero struct when no transactions", () => {
    const result = Transaction.calculateMWRRDetails(1, 5000);
    expect(result.mwrr).toBe(0);
    expect(result.cashFlows).toEqual([]);
  });

  it("returns mwrr, cashFlows, and iterations", () => {
    Transaction.create(1, makeTxData({ transaction_type: "deposit", total_amount: 10000, date: "2022-01-01" }), 1);
    const result = Transaction.calculateMWRRDetails(1, 12000);
    expect(result).toHaveProperty("mwrr");
    expect(result).toHaveProperty("cashFlows");
    expect(result).toHaveProperty("iterations");
    expect(Array.isArray(result.cashFlows)).toBe(true);
  });
});

// ── CAGR ──────────────────────────────────────────────────────────────────────

describe("Transaction.calculateCAGR", () => {
  beforeEach(() => {
    seedUser(1);
    seedUserSettings(1);
    seedAsset(1);
    seedBroker(1, 1);
  });

  it("returns 0 when no cash flow transactions", () => {
    expect(Transaction.calculateCAGR(1)).toBe(0);
  });
});

describe("Transaction.calculateCAGRDetails", () => {
  beforeEach(() => {
    seedUser(1);
    seedUserSettings(1);
    seedAsset(1);
    seedBroker(1, 1);
  });

  it("returns zero struct when no transactions", () => {
    const result = Transaction.calculateCAGRDetails(1, 5000);
    expect(result.cagr).toBe(0);
    expect(result.firstDate).toBeNull();
  });
});
