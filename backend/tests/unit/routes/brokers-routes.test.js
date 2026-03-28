"use strict";

/**
 * Unit tests for routes/brokers.js — branch coverage for uncovered paths.
 *
 * Covered branches:
 *  - line 352: brokers array contains a non-object entry
 *  - line 396: outer catch handler (error.status branch and fallback to 500)
 */

jest.mock("../../../middleware/auth", () => (req, res, next) => {
  req.user = { id: 1, username: "admin", role: "admin" };
  next();
});
jest.mock("../../../models/Broker");
jest.mock("../../../models/AuditLog");
jest.mock("../../../middleware/validators/brokerValidators");

const request = require("supertest");
const express = require("express");
const Broker = require("../../../models/Broker");
const AuditLog = require("../../../models/AuditLog");
const { runBrokerValidation } = require("../../../middleware/validators/brokerValidators");

function buildApp(bodyPatch) {
  const app = express();
  app.use(express.json());
  if (bodyPatch) app.use(bodyPatch);
  app.use("/brokers", require("../../../routes/brokers"));
  return app;
}

beforeEach(() => {
  jest.resetAllMocks();
  AuditLog.logCreate.mockReturnValue(undefined);
  AuditLog.logUpdate.mockReturnValue(undefined);
  AuditLog.logDelete.mockReturnValue(undefined);
  Broker.findByUser.mockReturnValue([]);
  Broker.findById.mockReturnValue({ id: 1, name: "Fidelity", user_id: 1 });
  Broker.create.mockReturnValue(1);
  Broker.update.mockReturnValue(true);
  Broker.delete.mockReturnValue(true);
  runBrokerValidation.mockResolvedValue({ name: "Fidelity", description: "", website: "" });
});

// ── POST /bulk ────────────────────────────────────────────────────────────────

describe("POST /brokers/bulk — input validation", () => {
  let app;
  beforeEach(() => { app = buildApp(); });

  it("returns 400 when brokers is missing", async () => {
    expect((await request(app).post("/brokers/bulk").send({})).status).toBe(400);
  });

  it("returns 400 when brokers is an empty array", async () => {
    expect((await request(app).post("/brokers/bulk").send({ brokers: [] })).status).toBe(400);
  });

  it("returns 400 when a broker entry is not an object — covers line 352", async () => {
    // Numbers and strings are not typeof === "object"; triggers the every() guard
    const res = await request(app)
      .post("/brokers/bulk")
      .send({ brokers: [42] });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/each broker must be an object/i);
  });

  it("returns 400 when a broker entry is a string — covers line 352 (string variant)", async () => {
    const res = await request(app)
      .post("/brokers/bulk")
      .send({ brokers: ["not-an-object"] });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/each broker must be an object/i);
  });
});

describe("POST /brokers/bulk — per-row error collection", () => {
  let app;
  beforeEach(() => { app = buildApp(); });

  it("returns 200 with a success entry for a valid broker", async () => {
    runBrokerValidation.mockResolvedValue({ name: "Fidelity", description: "desc", website: "https://fidelity.com" });
    Broker.create.mockReturnValue(42);

    const res = await request(app)
      .post("/brokers/bulk")
      .send({ brokers: [{ name: "Fidelity", description: "desc", website: "https://fidelity.com" }] });

    expect(res.status).toBe(200);
    expect(res.body.results.success).toHaveLength(1);
    expect(res.body.results.success[0].id).toBe(42);
  });

  it("collects per-row errors without aborting the whole import", async () => {
    runBrokerValidation.mockRejectedValue(
      Object.assign(new Error("Name is required"), { details: ["name missing"] }),
    );

    const res = await request(app)
      .post("/brokers/bulk")
      .send({ brokers: [{ description: "no name" }] });

    expect(res.status).toBe(200);
    expect(res.body.results.errors).toHaveLength(1);
    expect(res.body.results.errors[0].details).toEqual(["name missing"]);
  });

  it("maps UNIQUE constraint failure to a human-readable duplicate message", async () => {
    Broker.create.mockImplementation(() => {
      throw new Error("UNIQUE constraint failed: brokers.name");
    });

    const res = await request(app)
      .post("/brokers/bulk")
      .send({ brokers: [{ name: "Fidelity" }] });

    expect(res.status).toBe(200);
    expect(res.body.results.errors[0].error).toMatch(/already exists/i);
  });
});

describe("POST /brokers/bulk — outer catch (line 396)", () => {
  it("uses error.status when the outer handler throws an error with a status property", async () => {
    // Inject a middleware that replaces brokers.entries with a throwing function.
    // brokers.entries() is called inside the outer try but outside the per-row try,
    // so the thrown error propagates to the outer catch at line 395–396.
    const bodyPatch = (req, res, next) => {
      const original = req.body;
      Object.defineProperty(req, "body", {
        get() {
          return original;
        },
        configurable: true,
      });
      if (Array.isArray(req.body && req.body.brokers)) {
        req.body.brokers.entries = () => {
          throw Object.assign(new Error("entries exploded"), { status: 503 });
        };
      }
      next();
    };

    const app = buildApp(bodyPatch);
    const res = await request(app)
      .post("/brokers/bulk")
      .send({ brokers: [{ name: "Fidelity" }] });

    expect(res.status).toBe(503);
    expect(res.body.message).toBe("entries exploded");
  });

  it("falls back to 500 when the outer handler throws an error without a status property", async () => {
    const bodyPatch = (req, res, next) => {
      if (req.body && Array.isArray(req.body.brokers)) {
        req.body.brokers.entries = () => {
          throw new Error("no status on this error");
        };
      }
      next();
    };

    const app = buildApp(bodyPatch);
    const res = await request(app)
      .post("/brokers/bulk")
      .send({ brokers: [{ name: "Fidelity" }] });

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("no status on this error");
  });
});
