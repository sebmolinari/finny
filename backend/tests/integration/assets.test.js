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

describe("POST /api/v1/assets/bulk", () => {
  afterEach(() => db.prepare("DELETE FROM assets").run());

  const bulkPayload = [
    { symbol: "BULK1", name: "Bulk Asset One", asset_type: "equity", currency: "USD" },
    { symbol: "BULK2", name: "Bulk Asset Two", asset_type: "crypto", currency: "USD" },
  ];

  it("imports assets and returns 200 with success results", async () => {
    const res = await request(app)
      .post("/api/v1/assets/bulk")
      .set(headers)
      .send({ assets: bulkPayload });
    expect(res.status).toBe(200);
    expect(res.body.results.success).toHaveLength(2);
    expect(res.body.results.errors).toHaveLength(0);
  });

  it("returns 400 for empty assets array", async () => {
    const res = await request(app)
      .post("/api/v1/assets/bulk")
      .set(headers)
      .send({ assets: [] });
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing assets array", async () => {
    const res = await request(app)
      .post("/api/v1/assets/bulk")
      .set(headers)
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns row-level errors for duplicate symbols without failing the whole request", async () => {
    await request(app).post("/api/v1/assets/bulk").set(headers).send({ assets: [bulkPayload[0]] });
    const res = await request(app)
      .post("/api/v1/assets/bulk")
      .set(headers)
      .send({ assets: bulkPayload });
    expect(res.status).toBe(200);
    expect(res.body.results.success).toHaveLength(1);
    expect(res.body.results.errors).toHaveLength(1);
    expect(res.body.results.errors[0].row).toBe(2);
  });

  it("returns row-level errors for invalid asset type", async () => {
    const res = await request(app)
      .post("/api/v1/assets/bulk")
      .set(headers)
      .send({ assets: [{ symbol: "BAD1", name: "Bad", asset_type: "invalid", currency: "USD" }] });
    expect(res.status).toBe(200);
    expect(res.body.results.errors).toHaveLength(1);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app)
      .post("/api/v1/assets/bulk")
      .send({ assets: bulkPayload });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/v1/assets/prices/bulk-import", () => {
  let assetId;

  beforeAll(async () => {
    db.prepare("DELETE FROM assets").run();
    const res = await request(app).post("/api/v1/assets").set(headers).send(assetPayload);
    assetId = res.body.id;
  });

  afterEach(() => db.prepare("DELETE FROM price_data").run());

  it("creates price entries and returns 200 with success results", async () => {
    const res = await request(app)
      .post("/api/v1/assets/prices/bulk-import")
      .set(headers)
      .send({ prices: [{ symbol: "AAPL", date: "2026-03-28", price: 172.5 }] });
    expect(res.status).toBe(200);
    expect(res.body.results.success).toHaveLength(1);
    expect(res.body.results.success[0].action).toBe("created");
    expect(res.body.results.errors).toHaveLength(0);
  });

  it("updates an existing price when same symbol and date are imported again", async () => {
    await request(app)
      .post("/api/v1/assets/prices/bulk-import")
      .set(headers)
      .send({ prices: [{ symbol: "AAPL", date: "2026-03-28", price: 172.5 }] });
    const res = await request(app)
      .post("/api/v1/assets/prices/bulk-import")
      .set(headers)
      .send({ prices: [{ symbol: "AAPL", date: "2026-03-28", price: 175.0 }] });
    expect(res.status).toBe(200);
    expect(res.body.results.success[0].action).toBe("updated");
  });

  it("returns row-level error for unknown symbol without failing the whole request", async () => {
    const res = await request(app)
      .post("/api/v1/assets/prices/bulk-import")
      .set(headers)
      .send({
        prices: [
          { symbol: "AAPL", date: "2026-03-27", price: 170.0 },
          { symbol: "UNKNOWN", date: "2026-03-27", price: 10.0 },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.results.success).toHaveLength(1);
    expect(res.body.results.errors).toHaveLength(1);
    expect(res.body.results.errors[0].row).toBe(3);
  });

  it("returns row-level error for price <= 0", async () => {
    const res = await request(app)
      .post("/api/v1/assets/prices/bulk-import")
      .set(headers)
      .send({ prices: [{ symbol: "AAPL", date: "2026-03-28", price: 0 }] });
    expect(res.status).toBe(200);
    expect(res.body.results.errors).toHaveLength(1);
    expect(res.body.results.errors[0].error).toMatch(/positive/);
  });

  it("returns row-level error for invalid date format", async () => {
    const res = await request(app)
      .post("/api/v1/assets/prices/bulk-import")
      .set(headers)
      .send({ prices: [{ symbol: "AAPL", date: "28-03-2026", price: 172.5 }] });
    expect(res.status).toBe(200);
    expect(res.body.results.errors).toHaveLength(1);
    expect(res.body.results.errors[0].error).toMatch(/YYYY-MM-DD/);
  });

  it("returns 400 for empty prices array", async () => {
    const res = await request(app)
      .post("/api/v1/assets/prices/bulk-import")
      .set(headers)
      .send({ prices: [] });
    expect(res.status).toBe(400);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app)
      .post("/api/v1/assets/prices/bulk-import")
      .send({ prices: [{ symbol: "AAPL", date: "2026-03-28", price: 172.5 }] });
    expect(res.status).toBe(401);
  });
});
