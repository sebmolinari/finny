"use strict";

/**
 * Unit tests for routes/database.js — error-path branch coverage.
 *
 * config/database is mapped to testDb.js by moduleNameMapper, so we get the
 * real in-memory SQLite instance. For branches that require db methods to
 * throw we use Object.defineProperty to temporarily replace the method on the
 * db instance, then restore it after.
 */

jest.mock("../../../middleware/auth", () => (req, res, next) => {
  req.user = { id: 1, username: "admin", role: "admin" };
  next();
});
jest.mock("../../../middleware/admin", () => (req, res, next) => next());

jest.mock("../../../models/Asset");
jest.mock("../../../models/Broker");
jest.mock("../../../models/PriceData");
jest.mock("../../../models/Transaction");
jest.mock("../../../models/AssetAllocationTarget");

const request = require("supertest");
const express = require("express");
const Broker = require("../../../models/Broker");
const Asset = require("../../../models/Asset");
const Transaction = require("../../../models/Transaction");
const AssetAllocationTarget = require("../../../models/AssetAllocationTarget");

// testDb is what config/database resolves to inside the route (via moduleNameMapper)
const db = require("../../setup/testDb");

function makeApp() {
  const router = require("../../../routes/database");
  const app = express();
  app.use(express.json());
  app.use("/database", router);
  return app;
}

let app;

beforeEach(() => {
  jest.clearAllMocks();
  app = makeApp();
});

// ── POST /database/wal-checkpoint ─────────────────────────────────────────────

describe("POST /database/wal-checkpoint", () => {
  it("returns 200 with checkpoint result on success", async () => {
    const res = await request(app).post("/database/wal-checkpoint");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("checkpointed");
  });

  it("returns 500 when db.pragma throws (error path)", async () => {
    const orig = db.pragma.bind(db);
    db.pragma = () => {
      throw new Error("wal error");
    };
    try {
      const res = await request(app).post("/database/wal-checkpoint");
      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Checkpoint failed");
    } finally {
      db.pragma = orig;
    }
  });
});

// ── DELETE /database/reset ────────────────────────────────────────────────────

describe("DELETE /database/reset", () => {
  it("returns 200 on successful reset", async () => {
    const res = await request(app).delete("/database/reset");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("deleted");
  });

  it("returns 500 when db.transaction throws (error path)", async () => {
    const orig = db.transaction.bind(db);
    db.transaction = () => {
      throw new Error("reset error");
    };
    try {
      const res = await request(app).delete("/database/reset");
      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Reset failed");
    } finally {
      db.transaction = orig;
    }
  });
});

// ── POST /database/seed ───────────────────────────────────────────────────────

describe("POST /database/seed", () => {
  beforeEach(() => {
    Broker.create.mockReturnValue(1);
    Asset.create.mockReturnValue(10);
    Transaction.create.mockReturnValue(20);
    AssetAllocationTarget.upsert.mockReturnValue({});
  });

  it("returns 200 and logs warning when Broker.create throws (inner catch)", async () => {
    Broker.create.mockImplementation(() => {
      throw new Error("dup broker");
    });
    const res = await request(app).post("/database/seed");
    expect(res.status).toBe(200);
    expect(res.body.created.brokers).toBe(0);
  });

  it("returns 200 and logs warning when Asset.create throws (inner catch)", async () => {
    Asset.create.mockImplementation(() => {
      throw new Error("dup asset");
    });
    const res = await request(app).post("/database/seed");
    expect(res.status).toBe(200);
    expect(res.body.created.assets).toBe(0);
  });

  it("returns 200 and logs warning when Transaction.create throws (inner catch)", async () => {
    Transaction.create.mockImplementation(() => {
      throw new Error("tx error");
    });
    const res = await request(app).post("/database/seed");
    expect(res.status).toBe(200);
    expect(res.body.created.transactions).toBe(0);
  });

  it("returns 200 and logs warning when AssetAllocationTarget.upsert throws (inner catch)", async () => {
    AssetAllocationTarget.upsert.mockImplementation(() => {
      throw new Error("alloc error");
    });
    const res = await request(app).post("/database/seed");
    expect(res.status).toBe(200);
    expect(res.body.created.allocationTargets).toBe(0);
  });

  it("returns 500 when PriceData.bulkCreate throws (outer catch, lines 257-258)", async () => {
    const PriceData = require("../../../models/PriceData");
    PriceData.bulkCreate.mockImplementation(() => {
      throw new Error("bulk price error");
    });
    const res = await request(app).post("/database/seed");
    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Seed failed");
  });
});

// ── POST /database/seed — defensive fallback branches ─────────────────────────

describe("POST /database/seed – fallback branches", () => {
  it("covers broker.active ?? 1 and asset.active ?? 1 fallbacks when active is undefined", (done) => {
    // Use jest.isolateModules so we can inject a different data.json
    jest.isolateModules(() => {
      jest.doMock("../../../sample_data/data.json", () => ({
        brokers: [{ name: "NoBrokerActive", description: "d" }], // active undefined → ?? 1 fires
        assets: [
          { symbol: "NOACT", name: "N", type: "equity", currency: "USD" },
        ], // active undefined → ?? 1 fires
        priceHistory: undefined, // || {} fires
        transactions: undefined, // || [] fires
        allocationTargets: undefined, // || {} fires
      }));
      const router = require("../../../routes/database");
      const Broker = require("../../../models/Broker");
      const Asset = require("../../../models/Asset");
      Broker.create.mockReturnValue(1);
      Asset.create.mockReturnValue(10);

      const express = require("express");
      const testApp = express();
      testApp.use(express.json());
      testApp.use("/database", router);

      const request = require("supertest");
      request(testApp)
        .post("/database/seed")
        .then((res) => {
          expect(res.status).toBe(200);
          done();
        })
        .catch(done);
    });
  });
});
