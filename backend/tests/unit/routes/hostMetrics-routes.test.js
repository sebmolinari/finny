"use strict";

/**
 * Unit tests for routes/hostMetrics.js
 * Mocks fs and child_process to cover getCpuTemperature and getDiskSpace helper paths.
 */

jest.mock("fs");
jest.mock("child_process");
jest.mock("../../../middleware/auth", () => (req, res, next) => {
  req.user = { id: 1, username: "admin", role: "admin" };
  next();
});
jest.mock("../../../middleware/admin", () => (req, res, next) => next());

const request = require("supertest");
const express = require("express");
const fs = require("fs");
const childProcess = require("child_process");

function buildApp() {
  // Re-require so the route module picks up the mocked fs/child_process
  jest.resetModules();
  jest.mock("fs");
  jest.mock("child_process");
  const router = require("../../../routes/hostMetrics");
  const app = express();
  app.use(express.json());
  app.use("/metrics", router);
  return app;
}

// ─────────────────────────────────────────────────────────────────────────────
// getCpuTemperature — success path (line 72)
// ─────────────────────────────────────────────────────────────────────────────
describe("routes/hostMetrics — getCpuTemperature success path (line 72)", () => {
  it("returns cpuTemp as a number when thermal file is readable", async () => {
    const mockFs = require("fs");
    mockFs.readFileSync.mockReturnValue("45000\n");

    const router = require("../../../routes/hostMetrics");
    const app = express();
    app.use(express.json());
    app.use("/metrics", router);

    const res = await request(app).get("/metrics/host-metrics");
    expect(res.status).toBe(200);
    expect(res.body.cpuTemp).toBe(45);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getDiskSpace — linux platform paths (lines 81-92)
// ─────────────────────────────────────────────────────────────────────────────
describe("routes/hostMetrics — getDiskSpace linux paths (lines 81-92)", () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(process, "platform");

  beforeEach(() => {
    jest.resetModules();
    jest.mock("fs");
    jest.mock("child_process");
    Object.defineProperty(process, "platform", {
      value: "linux",
      configurable: true,
    });
  });

  afterEach(() => {
    if (originalDescriptor) {
      Object.defineProperty(process, "platform", originalDescriptor);
    }
  });

  it("returns disk object when execSync succeeds (lines 82-90)", async () => {
    const mockChild = require("child_process");
    mockChild.execSync.mockReturnValue(
      "/dev/sda1       50G   20G   30G  40% /\n",
    );

    const mockFs = require("fs");
    mockFs.readFileSync.mockImplementation(() => {
      throw new Error("no thermal file");
    });

    const router = require("../../../routes/hostMetrics");
    const app = express();
    app.use(express.json());
    app.use("/metrics", router);

    const res = await request(app).get("/metrics/host-metrics");
    expect(res.status).toBe(200);
    expect(res.body.disk).not.toBeNull();
    expect(res.body.disk).toHaveProperty("size");
    expect(res.body.disk).toHaveProperty("used");
    expect(res.body.disk).toHaveProperty("avail");
    expect(res.body.disk).toHaveProperty("percent");
  });

  it("returns disk as null when execSync throws (lines 91-92)", async () => {
    const mockChild = require("child_process");
    mockChild.execSync.mockImplementation(() => {
      throw new Error("df command failed");
    });

    const mockFs = require("fs");
    mockFs.readFileSync.mockImplementation(() => {
      throw new Error("no thermal file");
    });

    const router = require("../../../routes/hostMetrics");
    const app = express();
    app.use(express.json());
    app.use("/metrics", router);

    const res = await request(app).get("/metrics/host-metrics");
    expect(res.status).toBe(200);
    expect(res.body.disk).toBeNull();
  });
});
