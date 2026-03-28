"use strict";

const request = require("supertest");
const { app, db, setupAdminUser } = require("./helpers");

let headers;

beforeAll(async () => {
  const admin = await setupAdminUser();
  headers = admin.headers;
});

afterAll(() => db.clearAll());

const schedPayload = {
  name: "Daily Price Refresh",
  type: "asset_refresh",
  frequency: "daily",
  time_of_day: "08:00",
};

describe("GET /api/v1/schedulers", () => {
  it("returns list with pagination", async () => {
    const res = await request(app).get("/api/v1/schedulers").set(headers);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(res.body).toHaveProperty("pagination");
  });

  it("returns 401 without auth", async () => {
    expect((await request(app).get("/api/v1/schedulers")).status).toBe(401);
  });
});

describe("POST /api/v1/schedulers", () => {
  afterEach(() => db.prepare("DELETE FROM schedulers").run());

  it("creates a scheduler", async () => {
    const res = await request(app).post("/api/v1/schedulers").set(headers).send(schedPayload);
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Daily Price Refresh");
  });

  it("returns 400 for invalid time format", async () => {
    const res = await request(app).post("/api/v1/schedulers").set(headers).send({ ...schedPayload, time_of_day: "8am" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing required fields", async () => {
    const res = await request(app).post("/api/v1/schedulers").set(headers).send({});
    expect(res.status).toBe(400);
  });

  it("creates a weekdays scheduler", async () => {
    const res = await request(app).post("/api/v1/schedulers").set(headers).send({
      name: "Weekday Refresh",
      type: "asset_refresh",
      frequency: "weekdays",
      time_of_day: "08:00",
    });
    expect(res.status).toBe(201);
    expect(res.body.data.frequency).toBe("weekdays");
  });

  it("creates a weekly scheduler with valid day_of_week", async () => {
    const res = await request(app).post("/api/v1/schedulers").set(headers).send({
      name: "Weekly Monday",
      type: "asset_refresh",
      frequency: "weekly",
      time_of_day: "08:00",
      metadata: { day_of_week: 1 },
    });
    expect(res.status).toBe(201);
    expect(JSON.parse(res.body.data.metadata)).toEqual({ day_of_week: 1 });
  });

  it("returns 400 for weekly scheduler without metadata", async () => {
    const res = await request(app).post("/api/v1/schedulers").set(headers).send({
      name: "Bad Weekly",
      type: "asset_refresh",
      frequency: "weekly",
      time_of_day: "08:00",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for weekly scheduler with out-of-range day_of_week", async () => {
    const res = await request(app).post("/api/v1/schedulers").set(headers).send({
      name: "Bad Weekly 2",
      type: "asset_refresh",
      frequency: "weekly",
      time_of_day: "08:00",
      metadata: { day_of_week: 7 },
    });
    expect(res.status).toBe(400);
  });

  it("creates a monthly scheduler with valid day_of_month", async () => {
    const res = await request(app).post("/api/v1/schedulers").set(headers).send({
      name: "Monthly 15th",
      type: "asset_refresh",
      frequency: "monthly",
      time_of_day: "08:00",
      metadata: { day_of_month: 15 },
    });
    expect(res.status).toBe(201);
    expect(JSON.parse(res.body.data.metadata)).toEqual({ day_of_month: 15 });
  });

  it("returns 400 for monthly scheduler without metadata", async () => {
    const res = await request(app).post("/api/v1/schedulers").set(headers).send({
      name: "Bad Monthly",
      type: "asset_refresh",
      frequency: "monthly",
      time_of_day: "08:00",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for monthly scheduler with out-of-range day_of_month", async () => {
    const res = await request(app).post("/api/v1/schedulers").set(headers).send({
      name: "Bad Monthly 2",
      type: "asset_refresh",
      frequency: "monthly",
      time_of_day: "08:00",
      metadata: { day_of_month: 32 },
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/schedulers/:id", () => {
  let schedId;
  beforeAll(async () => {
    db.prepare("DELETE FROM schedulers").run();
    const res = await request(app).post("/api/v1/schedulers").set(headers).send(schedPayload);
    schedId = res.body.data?.id;
  });

  it("returns scheduler by id", async () => {
    const res = await request(app).get(`/api/v1/schedulers/${schedId}`).set(headers);
    expect(res.status).toBe(200);
  });

  it("returns 404 for unknown id", async () => {
    expect((await request(app).get("/api/v1/schedulers/99999").set(headers)).status).toBe(404);
  });
});

describe("PUT /api/v1/schedulers/:id", () => {
  let schedId;
  beforeAll(async () => {
    db.prepare("DELETE FROM schedulers").run();
    const res = await request(app).post("/api/v1/schedulers").set(headers).send(schedPayload);
    schedId = res.body.data?.id;
  });

  it("updates a scheduler", async () => {
    const res = await request(app).put(`/api/v1/schedulers/${schedId}`).set(headers).send({ ...schedPayload, name: "Updated", enabled: true });
    expect(res.status).toBe(200);
  });

  it("returns 404 for unknown id", async () => {
    expect((await request(app).put("/api/v1/schedulers/99999").set(headers).send(schedPayload)).status).toBe(404);
  });
});

describe("DELETE /api/v1/schedulers/:id", () => {
  it("deletes a scheduler", async () => {
    const res = await request(app).post("/api/v1/schedulers").set(headers).send({ ...schedPayload, name: "ToDelete" });
    const del = await request(app).delete(`/api/v1/schedulers/${res.body.data?.id}`).set(headers);
    expect(del.status).toBe(200);
  });

  it("returns 404 for unknown id", async () => {
    expect((await request(app).delete("/api/v1/schedulers/99999").set(headers)).status).toBe(404);
  });
});

describe("GET /api/v1/schedulers/:id/instances", () => {
  let schedId;
  beforeAll(async () => {
    db.prepare("DELETE FROM schedulers").run();
    const res = await request(app).post("/api/v1/schedulers").set(headers).send(schedPayload);
    schedId = res.body.data?.id;
  });

  it("returns instances list with pagination", async () => {
    const res = await request(app).get(`/api/v1/schedulers/${schedId}/instances`).set(headers);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
  });
});

describe("DELETE /api/v1/schedulers/instances", () => {
  it("purges all scheduler instances", async () => {
    const res = await request(app).delete("/api/v1/schedulers/instances").set(headers);
    expect(res.status).toBe(200);
  });
});
