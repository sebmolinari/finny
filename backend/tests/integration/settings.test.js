"use strict";

const request = require("supertest");
const { app, db, setupAdminUser } = require("./helpers");

let headers;

beforeAll(async () => {
  const admin = await setupAdminUser();
  headers = admin.headers;
});

afterAll(() => db.clearAll());

describe("GET /api/v1/settings", () => {
  it("returns user settings", async () => {
    const res = await request(app).get("/api/v1/settings").set(headers);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("timezone");
  });

  it("returns 401 without token", async () => {
    expect((await request(app).get("/api/v1/settings")).status).toBe(401);
  });
});

describe("PUT /api/v1/settings", () => {
  it("updates settings", async () => {
    const res = await request(app).put("/api/v1/settings").set(headers).send({
      timezone: "America/New_York",
      theme: "dark",
      date_format: "MM/DD/YYYY",
    });
    expect(res.status).toBe(200);
    expect(res.body.timezone).toBe("America/New_York");
  });

  it("returns 401 without token", async () => {
    expect((await request(app).put("/api/v1/settings").send({ timezone: "UTC" })).status).toBe(401);
  });
});

describe("POST /api/v1/settings/onboarding-complete", () => {
  it("marks onboarding as complete", async () => {
    const res = await request(app).post("/api/v1/settings/onboarding-complete").set(headers);
    expect(res.status).toBe(200);
  });
});

describe("POST /api/v1/settings/reviewed", () => {
  it("marks settings as reviewed", async () => {
    const res = await request(app).post("/api/v1/settings/reviewed").set(headers);
    expect(res.status).toBe(200);
  });
});
