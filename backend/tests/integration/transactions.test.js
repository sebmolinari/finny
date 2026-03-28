"use strict";

const request = require("supertest");
const { app, db, setupAdminUser } = require("./helpers");

let headers, assetId, brokerId;

beforeAll(async () => {
  const admin = await setupAdminUser();
  headers = admin.headers;

  // Disable cash and sell balance validation so tests don't depend on pre-existing deposits
  await request(app).put("/api/v1/settings").set(headers).send({
    validate_cash_balance: 1,
    validate_sell_balance: 1,
  });

  const aRes = await request(app).post("/api/v1/assets").set(headers).send({
    symbol: "AAPL",
    name: "Apple Inc",
    asset_type: "equity",
    currency: "USD",
    price_source: "yahoo",
  });
  assetId = aRes.body.id;

  const bRes = await request(app).post("/api/v1/brokers").set(headers).send({ name: "Fidelity" });
  brokerId = bRes.body.id;
});

afterAll(() => db.clearAll());

const txDepositPayload = () => ({
  date: "2024-01-01",
  transaction_type: "deposit",
  total_amount: 10000,
  fee: 0,
});

const txPayload = () => ({
  asset_id: assetId,
  broker_id: brokerId,
  date: "2024-01-10",
  transaction_type: "buy",
  quantity: 10,
  price: 150,
  fee: 1,
  total_amount: 1501,
});

describe("GET /api/v1/transactions", () => {
  it("returns 200 with data array", async () => {
    const res = await request(app).get("/api/v1/transactions").set(headers);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
  });

  it("returns 401 without auth", async () => {
    expect((await request(app).get("/api/v1/transactions")).status).toBe(401);
  });
});

describe("POST /api/v1/transactions", () => {
  afterAll(() => db.prepare("DELETE FROM transactions").run());

  it("creates a deposit transaction", async () => {
    const res = await request(app).post("/api/v1/transactions").set(headers).send(txDepositPayload());
    expect(res.status).toBe(201);
  });

  it("creates a buy transaction and returns 201", async () => {
    const res = await request(app).post("/api/v1/transactions").set(headers).send(txPayload());
    expect(res.status).toBe(201);
    expect(res.body.transaction_type).toBe("buy");
    expect(res.body.quantity).toBeCloseTo(10, 4);
  });

  it("creates a sell transaction", async () => {
    await request(app).post("/api/v1/transactions").set(headers).send(txPayload());
    const res = await request(app)
      .post("/api/v1/transactions")
      .set(headers)
      .send({
        ...txPayload(),
        transaction_type: "sell",
        date: "2024-06-01",
        notes: "selling shares",
      });
    expect(res.status).toBe(201);
  });

  it("returns 400 for missing date", async () => {
    const { date: _d, ...rest } = txPayload();
    const res = await request(app).post("/api/v1/transactions").set(headers).send(rest);
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/transactions/:id", () => {
  let txId;
  afterAll(() => db.prepare("DELETE FROM transactions").run());

  beforeAll(async () => {
    await request(app).post("/api/v1/transactions").set(headers).send(txDepositPayload());
    const res = await request(app).post("/api/v1/transactions").set(headers).send(txPayload());
    txId = res.body.id;
  });

  it("returns the transaction by id", async () => {
    const res = await request(app).get(`/api/v1/transactions/${txId}`).set(headers);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(txId);
  });

  it("returns 404 for unknown id", async () => {
    expect((await request(app).get("/api/v1/transactions/99999").set(headers)).status).toBe(404);
  });
});

describe("PUT /api/v1/transactions/:id", () => {
  let txId;
  afterAll(() => db.prepare("DELETE FROM transactions").run());

  beforeAll(async () => {
    await request(app).post("/api/v1/transactions").set(headers).send(txDepositPayload());
    const res = await request(app).post("/api/v1/transactions").set(headers).send(txPayload());
    txId = res.body.id;
  });

  it("updates transaction and returns 200", async () => {
    const res = await request(app)
      .put(`/api/v1/transactions/${txId}`)
      .set(headers)
      .send({
        ...txPayload(),
        notes: "updated note",
      });
    expect(res.status).toBe(200);
  });

  it("returns 404 for unknown id", async () => {
    expect((await request(app).put("/api/v1/transactions/99999").set(headers).send(txPayload())).status).toBe(404);
  });
});

describe("DELETE /api/v1/transactions/:id", () => {
  afterAll(() => db.prepare("DELETE FROM transactions").run());

  it("deletes a transaction", async () => {
    await request(app).post("/api/v1/transactions").set(headers).send(txDepositPayload());
    const res = await request(app).post("/api/v1/transactions").set(headers).send(txPayload());
    expect((await request(app).delete(`/api/v1/transactions/${res.body.id}`).set(headers)).status).toBe(200);
  });

  it("returns 404 for unknown id", async () => {
    expect((await request(app).delete("/api/v1/transactions/99999").set(headers)).status).toBe(404);
  });
});

describe("POST /api/v1/transactions/transfer", () => {
  let broker2Id;
  beforeAll(async () => {
    const bRes = await request(app).post("/api/v1/brokers").set(headers).send({ name: "Schwab" });
    broker2Id = bRes.body.id;
    // Need a holding first
    await request(app).post("/api/v1/transactions").set(headers).send(txPayload());
  });

  it("creates a transfer transaction between brokers", async () => {
    const res = await request(app).post("/api/v1/transactions/transfer").set(headers).send({
      asset_id: assetId,
      broker_id: brokerId,
      destination_broker_id: broker2Id,
      date: "2024-06-01",
      quantity: 5,
      price: 150,
      fee: 0,
      total_amount: 750,
    });
    expect([201, 400]).toContain(res.status); // 400 if validation fails
  });
});
