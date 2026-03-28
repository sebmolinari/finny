"use strict";

const request = require("supertest");
const { app, db, setupAdminUser } = require("./helpers");

let headers, userId;

beforeAll(async () => {
  const admin = await setupAdminUser();
  headers = admin.headers;
  userId = admin.userId;
});

afterAll(() => db.clearAll());

const payload = { name: "Fidelity", description: "Main broker", website: "https://fidelity.com" };

describe("GET /api/v1/brokers", () => {
  it("returns 200 with empty list initially", async () => {
    const res = await request(app).get("/api/v1/brokers").set(headers);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns 401 without auth", async () => {
    expect((await request(app).get("/api/v1/brokers")).status).toBe(401);
  });
});

describe("POST /api/v1/brokers", () => {
  afterEach(() => db.prepare("DELETE FROM brokers").run());

  it("creates a broker and returns 201", async () => {
    const res = await request(app).post("/api/v1/brokers").set(headers).send(payload);
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Fidelity");
  });

  it("returns 400 for missing name", async () => {
    const res = await request(app).post("/api/v1/brokers").set(headers).send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 when duplicate broker name for same user", async () => {
    await request(app).post("/api/v1/brokers").set(headers).send(payload);
    const res = await request(app).post("/api/v1/brokers").set(headers).send(payload);
    expect([400, 409]).toContain(res.status);
  });
});

describe("GET /api/v1/brokers/:id", () => {
  let brokerId;
  beforeAll(async () => {
    const res = await request(app).post("/api/v1/brokers").set(headers).send(payload);
    brokerId = res.body.id;
  });

  it("returns broker by id", async () => {
    const res = await request(app).get(`/api/v1/brokers/${brokerId}`).set(headers);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Fidelity");
  });

  it("returns 404 for unknown id", async () => {
    expect((await request(app).get("/api/v1/brokers/99999").set(headers)).status).toBe(404);
  });
});

describe("PUT /api/v1/brokers/:id", () => {
  let brokerId;
  beforeAll(async () => {
    db.prepare("DELETE FROM brokers").run();
    const res = await request(app).post("/api/v1/brokers").set(headers).send(payload);
    brokerId = res.body.id;
  });

  it("updates broker name", async () => {
    const res = await request(app).put(`/api/v1/brokers/${brokerId}`).set(headers).send({ name: "Schwab" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Schwab");
  });

  it("returns 404 for unknown id", async () => {
    expect((await request(app).put("/api/v1/brokers/99999").set(headers).send({ name: "X" })).status).toBe(404);
  });
});

describe("DELETE /api/v1/brokers/:id", () => {
  it("deletes broker", async () => {
    const res = await request(app).post("/api/v1/brokers").set(headers).send({ name: "ToBeDel" });
    expect((await request(app).delete(`/api/v1/brokers/${res.body.id}`).set(headers)).status).toBe(200);
  });

  it("returns 404 for unknown id", async () => {
    expect((await request(app).delete("/api/v1/brokers/99999").set(headers)).status).toBe(404);
  });
});

describe("POST /api/v1/brokers/bulk", () => {
  afterEach(() => db.prepare("DELETE FROM brokers").run());

  const bulkPayload = [
    { name: "Broker One", description: "First broker" },
    { name: "Broker Two", website: "https://brokertwo.com" },
  ];

  it("imports brokers and returns 200 with success results", async () => {
    const res = await request(app)
      .post("/api/v1/brokers/bulk")
      .set(headers)
      .send({ brokers: bulkPayload });
    expect(res.status).toBe(200);
    expect(res.body.results.success).toHaveLength(2);
    expect(res.body.results.errors).toHaveLength(0);
  });

  it("returns 400 for empty brokers array", async () => {
    const res = await request(app)
      .post("/api/v1/brokers/bulk")
      .set(headers)
      .send({ brokers: [] });
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing brokers array", async () => {
    const res = await request(app)
      .post("/api/v1/brokers/bulk")
      .set(headers)
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns row-level errors for duplicate broker names without failing the whole request", async () => {
    await request(app).post("/api/v1/brokers/bulk").set(headers).send({ brokers: [bulkPayload[0]] });
    const res = await request(app)
      .post("/api/v1/brokers/bulk")
      .set(headers)
      .send({ brokers: bulkPayload });
    expect(res.status).toBe(200);
    expect(res.body.results.success).toHaveLength(1);
    expect(res.body.results.errors).toHaveLength(1);
    expect(res.body.results.errors[0].row).toBe(2);
  });

  it("returns row-level errors for missing broker name", async () => {
    const res = await request(app)
      .post("/api/v1/brokers/bulk")
      .set(headers)
      .send({ brokers: [{ description: "No name" }] });
    expect(res.status).toBe(200);
    expect(res.body.results.errors).toHaveLength(1);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app)
      .post("/api/v1/brokers/bulk")
      .send({ brokers: bulkPayload });
    expect(res.status).toBe(401);
  });
});
