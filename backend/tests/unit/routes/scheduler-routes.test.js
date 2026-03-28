"use strict";

/**
 * Unit tests for routes/scheduler.js — error paths and branch coverage.
 */

jest.mock("../../../middleware/auth", () => (req, res, next) => {
  req.user = { id: 1, username: "admin", role: "admin" };
  next();
});
jest.mock("../../../middleware/admin", () => (req, res, next) => next());
jest.mock("../../../services/schedulerService");
jest.mock("../../../models/AuditLog");

const request = require("supertest");
const express = require("express");
const SchedulerService = require("../../../services/schedulerService");
const AuditLog = require("../../../models/AuditLog");

const DB_ERR = new Error("database exploded");

const SCHEDULER = {
  id: 1,
  name: "Daily Report",
  type: "send_report",
  frequency: "daily",
  time_of_day: "08:00",
  enabled: 1,
};

function buildApp() {
  const app = express();
  app.use(express.json());
  const schedulerRouter = require("../../../routes/scheduler");
  app.use("/scheduler", schedulerRouter);
  return app;
}

let app;

beforeEach(() => {
  jest.resetAllMocks();
  app = buildApp();

  SchedulerService.getSchedulers.mockReturnValue([SCHEDULER]);
  SchedulerService.getSchedulersCount.mockReturnValue(1);
  SchedulerService.getSchedulerById.mockReturnValue(SCHEDULER);
  SchedulerService.createScheduler.mockReturnValue(1);
  SchedulerService.updateScheduler.mockReturnValue(1);
  SchedulerService.deleteScheduler.mockReturnValue(1);
  SchedulerService.purgeAllInstances.mockReturnValue(5);
  SchedulerService.getSchedulerInstances.mockReturnValue([]);
  SchedulerService.getSchedulerInstancesCount.mockReturnValue(0);
  AuditLog.logCreate.mockReturnValue(undefined);
  AuditLog.logUpdate.mockReturnValue(undefined);
  AuditLog.logDelete.mockReturnValue(undefined);
});

// ── GET / ──────────────────────────────────────────────────────────────────

describe("GET /scheduler", () => {
  it("returns 200 on success", async () => {
    const res = await request(app).get("/scheduler");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(res.body).toHaveProperty("pagination");
  });

  it("accepts limit and offset params", async () => {
    await request(app).get("/scheduler?limit=10&offset=5");
    expect(SchedulerService.getSchedulers).toHaveBeenCalledWith(10, 5);
  });

  it("returns 500 on error", async () => {
    SchedulerService.getSchedulers.mockImplementation(() => { throw DB_ERR; });
    expect((await request(app).get("/scheduler")).status).toBe(500);
  });
});

// ── POST / ─────────────────────────────────────────────────────────────────

describe("POST /scheduler", () => {
  const validBody = {
    name: "Daily Report",
    type: "send_report",
    frequency: "daily",
    time_of_day: "08:00",
  };

  it("returns 201 on success", async () => {
    expect((await request(app).post("/scheduler").send(validBody)).status).toBe(201);
  });

  it("returns 400 when required fields missing", async () => {
    expect(
      (await request(app).post("/scheduler").send({ name: "x" })).status,
    ).toBe(400);
  });

  it("returns 400 when type is invalid", async () => {
    expect(
      (
        await request(app)
          .post("/scheduler")
          .send({ ...validBody, type: "invalid_type" })
      ).status,
    ).toBe(400);
  });

  it("returns 400 when frequency is invalid", async () => {
    expect(
      (
        await request(app)
          .post("/scheduler")
          .send({ ...validBody, frequency: "hourly" })
      ).status,
    ).toBe(400);
  });

  it("returns 400 on Invalid time format error", async () => {
    SchedulerService.createScheduler.mockImplementation(() => {
      throw new Error("Invalid time format: 25:99");
    });
    expect((await request(app).post("/scheduler").send(validBody)).status).toBe(400);
  });

  it("returns 500 on generic error", async () => {
    SchedulerService.createScheduler.mockImplementation(() => { throw DB_ERR; });
    expect((await request(app).post("/scheduler").send(validBody)).status).toBe(500);
  });

  it("includes warning when type=send_report and EMAIL_ENABLED is not true", async () => {
    const oldEnv = process.env.EMAIL_ENABLED;
    process.env.EMAIL_ENABLED = "false";
    const res = await request(app).post("/scheduler").send(validBody);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("warning");
    process.env.EMAIL_ENABLED = oldEnv;
  });
});

// ── GET /:id ───────────────────────────────────────────────────────────────

describe("GET /scheduler/:id", () => {
  it("returns 200 when found", async () => {
    expect((await request(app).get("/scheduler/1")).status).toBe(200);
  });

  it("returns 404 when not found", async () => {
    SchedulerService.getSchedulerById.mockReturnValue(null);
    expect((await request(app).get("/scheduler/999")).status).toBe(404);
  });

  it("returns 500 on error", async () => {
    SchedulerService.getSchedulerById.mockImplementation(() => { throw DB_ERR; });
    expect((await request(app).get("/scheduler/1")).status).toBe(500);
  });
});

// ── PUT /:id ───────────────────────────────────────────────────────────────

describe("PUT /scheduler/:id", () => {
  const validBody = {
    name: "Updated",
    type: "asset_refresh",
    frequency: "weekly",
    time_of_day: "09:00",
    enabled: true,
    metadata: { day_of_week: 1 },
  };

  it("returns 200 on success", async () => {
    const res = await request(app).put("/scheduler/1").send(validBody);
    expect(res.status).toBe(200);
  });

  it("returns 404 when scheduler not found initially", async () => {
    SchedulerService.getSchedulerById.mockReturnValue(null);
    expect(
      (await request(app).put("/scheduler/999").send(validBody)).status,
    ).toBe(404);
  });

  it("returns 400 when required fields are missing", async () => {
    expect(
      (
        await request(app)
          .put("/scheduler/1")
          .send({ name: "x", type: "send_report", frequency: "daily" })
      ).status,
    ).toBe(400);
  });

  it("returns 400 when type is invalid", async () => {
    expect(
      (
        await request(app)
          .put("/scheduler/1")
          .send({ ...validBody, type: "bad_type" })
      ).status,
    ).toBe(400);
  });

  it("returns 400 when frequency is invalid", async () => {
    expect(
      (
        await request(app)
          .put("/scheduler/1")
          .send({ ...validBody, frequency: "hourly" })
      ).status,
    ).toBe(400);
  });

  it("returns 404 when updateScheduler returns 0 changes", async () => {
    SchedulerService.updateScheduler.mockReturnValue(0);
    expect(
      (await request(app).put("/scheduler/1").send(validBody)).status,
    ).toBe(404);
  });

  it("returns 400 on Invalid time format error", async () => {
    SchedulerService.updateScheduler.mockImplementation(() => {
      throw new Error("Invalid time format: 99:00");
    });
    expect(
      (await request(app).put("/scheduler/1").send(validBody)).status,
    ).toBe(400);
  });

  it("returns 500 on generic error", async () => {
    SchedulerService.updateScheduler.mockImplementation(() => { throw DB_ERR; });
    expect(
      (await request(app).put("/scheduler/1").send(validBody)).status,
    ).toBe(500);
  });

  it("enabled=false covers the false branch of ternary (line 307)", async () => {
    SchedulerService.getSchedulerById
      .mockReturnValueOnce(SCHEDULER)
      .mockReturnValueOnce(SCHEDULER);
    const res = await request(app).put("/scheduler/1").send({ ...validBody, enabled: false });
    expect(res.status).toBe(200);
    expect(SchedulerService.updateScheduler).toHaveBeenCalledWith(
      "1", expect.anything(), expect.anything(), expect.anything(),
      expect.anything(), 0, 1, expect.anything(),
    );
  });

  it("includes warning for send_report when EMAIL_ENABLED is not true (line 331)", async () => {
    const old = process.env.EMAIL_ENABLED;
    process.env.EMAIL_ENABLED = "false";
    SchedulerService.getSchedulerById
      .mockReturnValueOnce(SCHEDULER)
      .mockReturnValueOnce(SCHEDULER);
    const res = await request(app).put("/scheduler/1").send({
      ...validBody,
      type: "send_report",
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("warning");
    process.env.EMAIL_ENABLED = old;
  });
});

// ── DELETE /instances ──────────────────────────────────────────────────────

describe("DELETE /scheduler/instances", () => {
  it("returns 200 on success", async () => {
    const res = await request(app).delete("/scheduler/instances");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("deleted");
  });

  it("returns 500 on error", async () => {
    SchedulerService.purgeAllInstances.mockImplementation(() => { throw DB_ERR; });
    expect((await request(app).delete("/scheduler/instances")).status).toBe(500);
  });
});

// ── DELETE /:id ────────────────────────────────────────────────────────────

describe("DELETE /scheduler/:id", () => {
  it("returns 200 on success", async () => {
    expect((await request(app).delete("/scheduler/1")).status).toBe(200);
  });

  it("returns 404 when scheduler not found initially", async () => {
    SchedulerService.getSchedulerById.mockReturnValue(null);
    expect((await request(app).delete("/scheduler/999")).status).toBe(404);
  });

  it("returns 404 when deleteScheduler returns 0 changes", async () => {
    SchedulerService.deleteScheduler.mockReturnValue(0);
    expect((await request(app).delete("/scheduler/1")).status).toBe(404);
  });

  it("returns 500 on error", async () => {
    SchedulerService.deleteScheduler.mockImplementation(() => { throw DB_ERR; });
    expect((await request(app).delete("/scheduler/1")).status).toBe(500);
  });
});

// ── GET /:id/instances ─────────────────────────────────────────────────────

describe("GET /scheduler/:id/instances", () => {
  it("returns 200 on success", async () => {
    const res = await request(app).get("/scheduler/1/instances");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
  });

  it("returns 404 when scheduler not found", async () => {
    SchedulerService.getSchedulerById.mockReturnValue(null);
    expect((await request(app).get("/scheduler/999/instances")).status).toBe(404);
  });

  it("returns 500 on error", async () => {
    SchedulerService.getSchedulerInstances.mockImplementation(() => { throw DB_ERR; });
    expect((await request(app).get("/scheduler/1/instances")).status).toBe(500);
  });
});
