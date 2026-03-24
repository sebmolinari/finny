"use strict";

/**
 * Unit tests for routes/transactions.js — error paths and branch coverage.
 */

jest.mock("../../../middleware/auth", () => (req, res, next) => {
  req.user = { id: 1, username: "admin", role: "admin" };
  next();
});
jest.mock("../../../models/Transaction");
jest.mock("../../../models/Asset");
jest.mock("../../../models/Broker");
jest.mock("../../../models/AuditLog");
jest.mock("../../../models/UserSettings");
jest.mock("../../../middleware/validators/transactionValidators", () => ({
  transactionValidation: [],
  validateTransactionBusiness: jest.fn(),
}));

const request = require("supertest");
const express = require("express");
const Transaction = require("../../../models/Transaction");
const Asset = require("../../../models/Asset");
const Broker = require("../../../models/Broker");
const AuditLog = require("../../../models/AuditLog");
const UserSettings = require("../../../models/UserSettings");
const {
  validateTransactionBusiness,
} = require("../../../middleware/validators/transactionValidators");

const DB_ERR = new Error("database exploded");

const TX = {
  id: 1,
  transaction_type: "deposit",
  total_amount: 1000,
  date: "2024-01-15",
  user_id: 1,
};

function buildApp() {
  const app = express();
  app.use(express.json());
  const txRouter = require("../../../routes/transactions");
  app.use("/transactions", txRouter);
  return app;
}

let app;

beforeEach(() => {
  jest.resetAllMocks();
  app = buildApp();

  Transaction.findByUser.mockReturnValue({ data: [TX], total: 1 });
  Transaction.findById.mockReturnValue(TX);
  Transaction.create.mockReturnValue(1);
  Transaction.update.mockReturnValue(TX);
  Transaction.delete.mockReturnValue(true);
  AuditLog.logCreate.mockReturnValue(undefined);
  AuditLog.logUpdate.mockReturnValue(undefined);
  AuditLog.logDelete.mockReturnValue(undefined);
  UserSettings.findByUserId.mockReturnValue({ timezone: "UTC" });
  Asset.getAll.mockReturnValue([]);
  Broker.findByUser.mockReturnValue([]);
  validateTransactionBusiness.mockReturnValue(undefined);
});

// ── GET / ──────────────────────────────────────────────────────────────────

describe("GET /transactions", () => {
  it("returns 200 on success", async () => {
    expect((await request(app).get("/transactions")).status).toBe(200);
  });

  it("returns 500 on error", async () => {
    Transaction.findByUser.mockImplementation(() => { throw DB_ERR; });
    expect((await request(app).get("/transactions")).status).toBe(500);
  });
});

// ── GET /:id ───────────────────────────────────────────────────────────────

describe("GET /transactions/:id", () => {
  it("returns 200 when found", async () => {
    expect((await request(app).get("/transactions/1")).status).toBe(200);
  });

  it("returns 404 when not found", async () => {
    Transaction.findById.mockReturnValue(null);
    expect((await request(app).get("/transactions/999")).status).toBe(404);
  });

  it("returns 500 on error", async () => {
    Transaction.findById.mockImplementation(() => { throw DB_ERR; });
    expect((await request(app).get("/transactions/1")).status).toBe(500);
  });
});

// ── POST / ─────────────────────────────────────────────────────────────────

describe("POST /transactions", () => {
  const validBody = {
    transaction_type: "deposit",
    date: "2024-01-15",
    total_amount: 1000,
  };

  it("returns 201 on success", async () => {
    Transaction.findById.mockReturnValue(TX);
    expect((await request(app).post("/transactions").send(validBody)).status).toBe(201);
  });

  it("returns 500 on Transaction.create error", async () => {
    Transaction.create.mockImplementation(() => { throw DB_ERR; });
    expect((await request(app).post("/transactions").send(validBody)).status).toBe(500);
  });

  it("returns error.status when validateTransactionBusiness throws with status", async () => {
    const err = new Error("Insufficient cash balance");
    err.status = 400;
    validateTransactionBusiness.mockImplementation(() => { throw err; });
    const res = await request(app).post("/transactions").send(validBody);
    expect(res.status).toBe(400);
  });
});

// ── PUT /:id ───────────────────────────────────────────────────────────────

describe("PUT /transactions/:id", () => {
  const validBody = {
    transaction_type: "deposit",
    date: "2024-01-15",
    total_amount: 1500,
  };

  it("returns 200 on success", async () => {
    Transaction.findById
      .mockReturnValueOnce(TX) // existing tx
      .mockReturnValueOnce(TX); // refreshed tx
    expect((await request(app).put("/transactions/1").send(validBody)).status).toBe(200);
  });

  it("returns 404 when transaction not found initially", async () => {
    Transaction.findById.mockReturnValue(null);
    expect((await request(app).put("/transactions/999").send(validBody)).status).toBe(404);
  });

  it("returns 404 when update returns null", async () => {
    Transaction.findById.mockReturnValue(TX);
    Transaction.update.mockReturnValue(null);
    expect((await request(app).put("/transactions/1").send(validBody)).status).toBe(404);
  });

  it("returns 500 on error", async () => {
    Transaction.findById.mockReturnValue(TX);
    Transaction.update.mockImplementation(() => { throw DB_ERR; });
    expect((await request(app).put("/transactions/1").send(validBody)).status).toBe(500);
  });

  it("returns error.status when error has status", async () => {
    Transaction.findById.mockReturnValue(TX);
    const err = new Error("Insufficient");
    err.status = 400;
    validateTransactionBusiness.mockImplementation(() => { throw err; });
    const res = await request(app).put("/transactions/1").send(validBody);
    expect(res.status).toBe(400);
  });
});

// ── DELETE /:id ────────────────────────────────────────────────────────────

describe("DELETE /transactions/:id", () => {
  it("returns 200 on success", async () => {
    expect((await request(app).delete("/transactions/1")).status).toBe(200);
  });

  it("returns 404 when delete returns falsy", async () => {
    Transaction.delete.mockReturnValue(false);
    expect((await request(app).delete("/transactions/999")).status).toBe(404);
  });

  it("returns 500 on error", async () => {
    Transaction.delete.mockImplementation(() => { throw DB_ERR; });
    expect((await request(app).delete("/transactions/1")).status).toBe(500);
  });
});

// ── POST /bulk ─────────────────────────────────────────────────────────────

describe("POST /transactions/bulk", () => {
  const validBulk = {
    transactions: [
      {
        transaction_type: "deposit",
        date: "2024-01-15",
        total_amount: 1000,
      },
    ],
  };

  it("returns 200 on success", async () => {
    expect(
      (await request(app).post("/transactions/bulk").send(validBulk)).status,
    ).toBe(200);
  });

  it("includes error row when validateTransactionBusiness throws", async () => {
    validateTransactionBusiness.mockImplementationOnce(() => {
      throw new Error("Insufficient cash balance");
    });
    const res = await request(app).post("/transactions/bulk").send(validBulk);
    expect(res.status).toBe(200);
    expect(res.body.results.errors).toHaveLength(1);
  });

  it("includes error row when Transaction.create throws for a row", async () => {
    Transaction.create.mockImplementationOnce(() => { throw DB_ERR; });
    const res = await request(app).post("/transactions/bulk").send(validBulk);
    expect(res.status).toBe(200);
    expect(res.body.results.errors).toHaveLength(1);
  });

  it("returns 500 when Broker.findByUser throws (outer catch)", async () => {
    Broker.findByUser.mockImplementation(() => { throw DB_ERR; });
    const res = await request(app).post("/transactions/bulk").send(validBulk);
    expect(res.status).toBe(500);
  });
});

// ── POST /transfer ─────────────────────────────────────────────────────────

describe("POST /transactions/transfer", () => {
  const validTransfer = {
    asset_id: 1,
    broker_id: 1,
    destination_broker_id: 2,
    quantity: 10,
    date: "2024-01-15",
  };

  beforeEach(() => {
    Asset.findById = jest.fn().mockReturnValue({ id: 1, symbol: "AAPL" });
    Broker.findById = jest.fn().mockReturnValue({ id: 1, name: "Broker A" });
    Transaction.getAssetBrokerBalance = jest.fn().mockReturnValue(100);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await request(app).post("/transactions/transfer").send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 when source === destination broker", async () => {
    const res = await request(app)
      .post("/transactions/transfer")
      .send({ ...validTransfer, destination_broker_id: 1 });
    expect(res.status).toBe(400);
  });

  it("returns 404 when asset not found", async () => {
    Asset.findById.mockReturnValue(null);
    const res = await request(app).post("/transactions/transfer").send(validTransfer);
    expect(res.status).toBe(404);
  });

  it("returns 500 on thrown error (line 762)", async () => {
    Transaction.getAssetBrokerBalance.mockImplementation(() => { throw DB_ERR; });
    const res = await request(app).post("/transactions/transfer").send(validTransfer);
    expect(res.status).toBe(500);
  });
});
