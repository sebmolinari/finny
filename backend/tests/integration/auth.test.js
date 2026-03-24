"use strict";

const request = require("supertest");
const { app, db } = require("./helpers");

beforeEach(() => db.clearAll());

describe("POST /api/v1/auth/register", () => {
  it("registers the first user as admin and returns token", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      username: "alice",
      email: "alice@test.com",
      password: "Alice1234",
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user.role).toBe("admin"); // first user = admin
  });

  it("returns 409 when username already exists", async () => {
    await request(app).post("/api/v1/auth/register").send({ username: "alice", email: "a@t.com", password: "Alice1234" });
    const res = await request(app).post("/api/v1/auth/register").send({ username: "alice", email: "b@t.com", password: "Alice1234" });
    expect(res.status).toBe(409);
  });

  it("returns 409 when email already exists", async () => {
    await request(app).post("/api/v1/auth/register").send({ username: "alice", email: "a@t.com", password: "Alice1234" });
    const res = await request(app).post("/api/v1/auth/register").send({ username: "bob", email: "a@t.com", password: "Alice1234" });
    expect(res.status).toBe(409);
  });

  it("returns 400 when fields are missing", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({ username: "x" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/auth/login", () => {
  beforeEach(async () => {
    await request(app).post("/api/v1/auth/register").send({ username: "alice", email: "a@t.com", password: "Alice1234" });
  });

  it("returns 200 with token on valid credentials", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({ username: "alice", password: "Alice1234" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
  });

  it("returns 401 for wrong password", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({ username: "alice", password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("returns 401 for unknown user", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({ username: "nobody", password: "pass" });
    expect(res.status).toBe(401);
  });

  it("returns 400 when body is empty", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({});
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/auth/me", () => {
  it("returns current user info with valid token", async () => {
    const reg = await request(app).post("/api/v1/auth/register").send({ username: "alice", email: "a@t.com", password: "Alice1234" });
    const res = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${reg.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe("alice");
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/v1/auth/change-password", () => {
  let token;
  beforeEach(async () => {
    const reg = await request(app).post("/api/v1/auth/register").send({ username: "alice", email: "a@t.com", password: "Alice1234" });
    token = reg.body.token;
  });

  it("changes password successfully", async () => {
    const res = await request(app)
      .post("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "Alice1234", newPassword: "NewPass99" });
    expect(res.status).toBe(200);
  });

  it("returns 400 when current password is wrong", async () => {
    const res = await request(app)
      .post("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "wrong", newPassword: "NewPass99" });
    expect(res.status).toBe(400);
  });

  it("returns 401 without token", async () => {
    const res = await request(app)
      .post("/api/v1/auth/change-password")
      .send({ currentPassword: "Alice1234", newPassword: "NewPass99" });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/v1/auth/logout", () => {
  it("returns 200", async () => {
    const reg = await request(app).post("/api/v1/auth/register").send({ username: "alice", email: "a@t.com", password: "Alice1234" });
    const res = await request(app).post("/api/v1/auth/logout").set("Authorization", `Bearer ${reg.body.token}`);
    expect(res.status).toBe(200);
  });
});
