"use strict";

const request = require("supertest");
const { app, db, setupAdminUser } = require("./helpers");

let headers, adminId;

beforeAll(async () => {
  const admin = await setupAdminUser();
  headers = admin.headers;
  adminId = admin.userId;
});

afterAll(() => db.clearAll());

describe("GET /api/v1/users", () => {
  it("returns user list for admin", async () => {
    const res = await request(app).get("/api/v1/users").set(headers);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("users");
    expect(Array.isArray(res.body.users)).toBe(true);
  });

  it("returns 401 without auth", async () => {
    expect((await request(app).get("/api/v1/users")).status).toBe(401);
  });
});

describe("PATCH /api/v1/users/:id/status", () => {
  let userId;
  beforeEach(async () => {
    db.prepare("DELETE FROM users WHERE username != 'admin'").run();
    const reg = await request(app).post("/api/v1/auth/register").send({
      username: "bob", email: "bob@test.com", password: "Bob12345",
    });
    userId = reg.body.user?.id;
  });

  it("deactivates a user", async () => {
    const res = await request(app).patch(`/api/v1/users/${userId}/status`).set(headers).send({ active: false });
    expect(res.status).toBe(200);
    expect(res.body.user.active).toBe(0);
  });

  it("returns 404 for unknown id", async () => {
    expect((await request(app).patch("/api/v1/users/99999/status").set(headers).send({ active: false })).status).toBe(404);
  });
});

describe("PATCH /api/v1/users/:id/role", () => {
  let userId;
  beforeEach(async () => {
    db.prepare("DELETE FROM users WHERE username != 'admin'").run();
    const reg = await request(app).post("/api/v1/auth/register").send({
      username: "bob", email: "bob@test.com", password: "Bob12345",
    });
    userId = reg.body.user?.id;
  });

  it("promotes user to admin", async () => {
    const res = await request(app).patch(`/api/v1/users/${userId}/role`).set(headers).send({ role: "admin" });
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/v1/users/:id", () => {
  it("deletes a non-admin user", async () => {
    db.prepare("DELETE FROM users WHERE username != 'admin'").run();
    const reg = await request(app).post("/api/v1/auth/register").send({
      username: "todelete", email: "del@test.com", password: "Del12345",
    });
    const res = await request(app).delete(`/api/v1/users/${reg.body.user?.id}`).set(headers);
    expect(res.status).toBe(200);
  });

  it("prevents deleting self", async () => {
    const res = await request(app).delete(`/api/v1/users/${adminId}`).set(headers);
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown id", async () => {
    expect((await request(app).delete("/api/v1/users/99999").set(headers)).status).toBe(404);
  });
});
