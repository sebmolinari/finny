"use strict";

const request = require("supertest");
const { app, db, setupAdminUser } = require("./helpers");

let headers;

beforeAll(async () => {
  const admin = await setupAdminUser();
  headers = admin.headers;
});

afterAll(() => db.clearAll());

const assetPayload = {
  symbol: "AAPL",
  name: "Apple Inc",
  asset_type: "equity",
  currency: "USD",
  price_source: "yahoo",
  price_symbol: "AAPL",
};

describe("GET /api/v1/assets", () => {
  it("returns 200 with empty list", async () => {
    const res = await request(app).get("/api/v1/assets").set(headers);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns 401 without token", async () => {
    expect((await request(app).get("/api/v1/assets")).status).toBe(401);
  });
});

describe("POST /api/v1/assets", () => {
  afterEach(() => {
    // Clean up created assets
    db.prepare("DELETE FROM assets").run();
  });

  it("creates an asset and returns 201", async () => {
    const res = await request(app).post("/api/v1/assets").set(headers).send(assetPayload);
    expect(res.status).toBe(201);
    expect(res.body.symbol).toBe("AAPL");
  });

  it("returns 400 for missing required fields", async () => {
    const res = await request(app).post("/api/v1/assets").set(headers).send({ symbol: "X" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when symbol already exists", async () => {
    await request(app).post("/api/v1/assets").set(headers).send(assetPayload);
    const res = await request(app).post("/api/v1/assets").set(headers).send(assetPayload);
    expect([400, 409]).toContain(res.status);
  });
});

describe("GET /api/v1/assets/:id", () => {
  let assetId;

  beforeAll(async () => {
    db.prepare("DELETE FROM assets").run();
    const res = await request(app).post("/api/v1/assets").set(headers).send(assetPayload);
    assetId = res.body.id;
  });

  it("returns the asset by id", async () => {
    const res = await request(app).get(`/api/v1/assets/${assetId}`).set(headers);
    expect(res.status).toBe(200);
    expect(res.body.symbol).toBe("AAPL");
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app).get("/api/v1/assets/99999").set(headers);
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/v1/assets/:id", () => {
  let assetId;

  beforeAll(async () => {
    db.prepare("DELETE FROM assets").run();
    const res = await request(app).post("/api/v1/assets").set(headers).send(assetPayload);
    assetId = res.body.id;
  });

  it("updates an asset", async () => {
    const res = await request(app).put(`/api/v1/assets/${assetId}`).set(headers).send({ ...assetPayload, name: "Apple Inc Updated" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Apple Inc Updated");
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app).put("/api/v1/assets/99999").set(headers).send(assetPayload);
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/v1/assets/:id", () => {
  it("deletes an asset", async () => {
    const created = await request(app).post("/api/v1/assets").set(headers).send({ ...assetPayload, symbol: "DLTE" });
    const assetId = created.body.id;
    const res = await request(app).delete(`/api/v1/assets/${assetId}`).set(headers);
    expect(res.status).toBe(200);
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app).delete("/api/v1/assets/99999").set(headers);
    expect(res.status).toBe(404);
  });
});

describe("GET /api/v1/assets/:id/prices", () => {
  let assetId;

  beforeAll(async () => {
    db.prepare("DELETE FROM assets").run();
    const res = await request(app).post("/api/v1/assets").set(headers).send(assetPayload);
    assetId = res.body.id;
  });

  it("returns empty price list", async () => {
    const res = await request(app).get(`/api/v1/assets/${assetId}/prices`).set(headers);
    expect(res.status).toBe(200);
  });
});

describe("POST /api/v1/assets/:id/prices", () => {
  let assetId;

  beforeAll(async () => {
    db.prepare("DELETE FROM assets").run();
    const res = await request(app).post("/api/v1/assets").set(headers).send(assetPayload);
    assetId = res.body.id;
  });

  it("adds a manual price entry", async () => {
    const res = await request(app)
      .post(`/api/v1/assets/${assetId}/prices`)
      .set(headers)
      .send({ date: "2024-01-10", price: 185.5 });
    expect(res.status).toBe(201);
    expect(res.body.price).toBe(185.5);
  });
});
