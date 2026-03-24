"use strict";

jest.mock("../../../models/UserSettings");
jest.mock("../../../models/Transaction");

const UserSettings = require("../../../models/UserSettings");
const Transaction = require("../../../models/Transaction");
const {
  validateTransactionBusiness,
} = require("../../../middleware/validators/transactionValidators");

beforeEach(() => {
  jest.clearAllMocks();
  UserSettings.findByUserId.mockReturnValue({
    validate_cash_balance: 1,
    validate_sell_balance: 1,
  });
  Transaction.getCashBalance.mockReturnValue(10000);
  Transaction.getAssetBrokerBalance.mockReturnValue(100);
});

// ── deposit / withdraw ──────────────────────────────────────────────────────

describe("deposit/withdraw transactions", () => {
  it("deposit with total_amount only — no asset/broker required, no error", () => {
    expect(() =>
      validateTransactionBusiness({
        tx: { transaction_type: "deposit", total_amount: 500 },
        userId: 1,
      }),
    ).not.toThrow();
  });

  it("withdraw with total_amount only — no error", () => {
    expect(() =>
      validateTransactionBusiness({
        tx: { transaction_type: "withdraw", total_amount: 200 },
        userId: 1,
      }),
    ).not.toThrow();
  });
});

// ── buy ────────────────────────────────────────────────────────────────────

describe("buy transaction validation", () => {
  const validBuy = {
    transaction_type: "buy",
    asset_id: 1,
    broker_id: 1,
    quantity: 10,
    price: 50,
    total_amount: 500, // ≤ 10 000 cash
  };

  it("valid buy — no error", () => {
    expect(() =>
      validateTransactionBusiness({ tx: validBuy, userId: 1 }),
    ).not.toThrow();
  });

  it("buy without asset_id — throws 'asset_id is required'", () => {
    expect(() =>
      validateTransactionBusiness({
        tx: { ...validBuy, asset_id: undefined },
        userId: 1,
      }),
    ).toThrow("asset_id is required");
  });

  it("buy without broker_id — throws about broker_id required", () => {
    expect(() =>
      validateTransactionBusiness({
        tx: { ...validBuy, broker_id: undefined },
        userId: 1,
      }),
    ).toThrow(/broker_id/);
  });

  it("buy with total_amount > cash balance — throws 'Insufficient cash balance'", () => {
    Transaction.getCashBalance.mockReturnValue(100);
    expect(() =>
      validateTransactionBusiness({
        tx: { ...validBuy, total_amount: 500 },
        userId: 1,
      }),
    ).toThrow("Insufficient cash balance");
  });

  it("buy with validateCash disabled — no error even if total_amount > cash", () => {
    UserSettings.findByUserId.mockReturnValue({
      validate_cash_balance: 0,
      validate_sell_balance: 1,
    });
    Transaction.getCashBalance.mockReturnValue(1); // would fail if check ran
    expect(() =>
      validateTransactionBusiness({
        tx: { ...validBuy, total_amount: 9999 },
        userId: 1,
      }),
    ).not.toThrow();
  });

  it("isUpdate=true with currentTx being a buy — adds back currentTx.total_amount (line 149-151)", () => {
    // Available cash = 300; original buy was 250; updated buy is 500.
    // After adding back 250 → effective available = 550 ≥ 500 → should pass.
    Transaction.getCashBalance.mockReturnValue(300);
    expect(() =>
      validateTransactionBusiness({
        tx: { ...validBuy, total_amount: 500 },
        userId: 1,
        isUpdate: true,
        currentTx: { transaction_type: "buy", total_amount: 250 },
      }),
    ).not.toThrow();
  });
});

// ── sell ───────────────────────────────────────────────────────────────────

describe("sell transaction validation", () => {
  const validSell = {
    transaction_type: "sell",
    asset_id: 1,
    broker_id: 1,
    quantity: 10,
    price: 50,
    total_amount: 500,
  };

  it("valid sell — no error", () => {
    // getAssetBrokerBalance returns 100 ≥ 10
    expect(() =>
      validateTransactionBusiness({ tx: validSell, userId: 1 }),
    ).not.toThrow();
  });

  it("sell without broker_id — throws", () => {
    expect(() =>
      validateTransactionBusiness({
        tx: { ...validSell, broker_id: undefined },
        userId: 1,
      }),
    ).toThrow();
  });

  it("sell quantity > available balance — throws 'Insufficient balance'", () => {
    Transaction.getAssetBrokerBalance.mockReturnValue(5);
    expect(() =>
      validateTransactionBusiness({
        tx: { ...validSell, quantity: 10 },
        userId: 1,
      }),
    ).toThrow("Insufficient balance");
  });

  it("sell with validateSell disabled — no error even if quantity > balance", () => {
    UserSettings.findByUserId.mockReturnValue({
      validate_cash_balance: 1,
      validate_sell_balance: 0,
    });
    Transaction.getAssetBrokerBalance.mockReturnValue(1); // would fail if check ran
    expect(() =>
      validateTransactionBusiness({
        tx: { ...validSell, quantity: 999 },
        userId: 1,
      }),
    ).not.toThrow();
  });

  it("isUpdate=true with currentTx being a sell — adds back currentTx.quantity (line 169-171)", () => {
    // Available = 5; original sell was 8; updated sell is 10.
    // After adding back 8 → effective available = 13 ≥ 10 → should pass.
    Transaction.getAssetBrokerBalance.mockReturnValue(5);
    expect(() =>
      validateTransactionBusiness({
        tx: { ...validSell, quantity: 10 },
        userId: 1,
        isUpdate: true,
        currentTx: { transaction_type: "sell", quantity: 8 },
      }),
    ).not.toThrow();
  });
});

// ── transfer ───────────────────────────────────────────────────────────────

describe("transfer transaction validation", () => {
  const validTransfer = {
    transaction_type: "transfer",
    asset_id: 1,
    broker_id: 1,
    destination_broker_id: 2,
    quantity: 10,
    total_amount: 0,
  };

  it("valid transfer — no error (covers lines 182-203)", () => {
    // getAssetBrokerBalance returns 100 ≥ 10
    expect(() =>
      validateTransactionBusiness({ tx: validTransfer, userId: 1 }),
    ).not.toThrow();
  });

  it("transfer without destination_broker_id — throws", () => {
    expect(() =>
      validateTransactionBusiness({
        tx: { ...validTransfer, destination_broker_id: undefined },
        userId: 1,
      }),
    ).toThrow();
  });

  it("transfer where source === destination broker — throws 'Source and destination brokers must be different' (line 188-190)", () => {
    expect(() =>
      validateTransactionBusiness({
        tx: { ...validTransfer, destination_broker_id: 1 },
        userId: 1,
      }),
    ).toThrow("Source and destination brokers must be different");
  });

  it("transfer quantity > available at source — throws 'Insufficient holdings'", () => {
    Transaction.getAssetBrokerBalance.mockReturnValue(3);
    expect(() =>
      validateTransactionBusiness({
        tx: { ...validTransfer, quantity: 10 },
        userId: 1,
      }),
    ).toThrow("Insufficient holdings");
  });

  it("transfer with validateSell disabled — no error even if quantity > balance", () => {
    UserSettings.findByUserId.mockReturnValue({
      validate_cash_balance: 1,
      validate_sell_balance: 0,
    });
    Transaction.getAssetBrokerBalance.mockReturnValue(1); // would fail if check ran
    expect(() =>
      validateTransactionBusiness({
        tx: { ...validTransfer, quantity: 999 },
        userId: 1,
      }),
    ).not.toThrow();
  });
});

// ── asset-required types ────────────────────────────────────────────────────

describe("asset-required types", () => {
  it("dividend without asset_id — throws 'asset_id is required' (line 132)", () => {
    expect(() =>
      validateTransactionBusiness({
        tx: {
          transaction_type: "dividend",
          total_amount: 10,
          asset_id: undefined,
        },
        userId: 1,
      }),
    ).toThrow("asset_id is required");
  });

  it("dividend with asset_id — no error", () => {
    expect(() =>
      validateTransactionBusiness({
        tx: {
          transaction_type: "dividend",
          asset_id: 1,
          total_amount: 10,
        },
        userId: 1,
      }),
    ).not.toThrow();
  });
});
