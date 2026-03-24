"use strict";

const request = require("supertest");
const { app, db, setupAdminUser } = require("./helpers");

let headers, userId;

beforeAll(async () => {
  const admin = await setupAdminUser();
  headers = admin.headers;
  userId = admin.userId;
  // Seed a notification directly
  db.prepare(
    "INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'info', 'Test', 'msg')",
  ).run(userId);
});

afterAll(() => db.clearAll());

describe("GET /api/v1/notifications", () => {
  it("returns notifications for the current user", async () => {
    const res = await request(app).get("/api/v1/notifications").set(headers);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.notifications)).toBe(true);
  });

  it("supports unreadOnly filter", async () => {
    const res = await request(app).get("/api/v1/notifications?unreadOnly=true").set(headers);
    expect(res.status).toBe(200);
  });

  it("returns 401 without auth", async () => {
    expect((await request(app).get("/api/v1/notifications")).status).toBe(401);
  });
});


describe("PATCH /api/v1/notifications/:id/read", () => {
  it("marks a notification as read", async () => {
    const notif = db.prepare("SELECT id FROM notifications WHERE user_id = ? LIMIT 1").get(userId);
    const res = await request(app).patch(`/api/v1/notifications/${notif.id}/read`).set(headers);
    expect(res.status).toBe(200);
  });

  it("returns 404 for unknown id", async () => {
    expect((await request(app).patch("/api/v1/notifications/99999/read").set(headers)).status).toBe(404);
  });
});

describe("PATCH /api/v1/notifications/read-all", () => {
  it("marks all notifications as read", async () => {
    const res = await request(app).patch("/api/v1/notifications/read-all").set(headers);
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/v1/notifications/admin/purge (admin)", () => {
  it("purges all notifications", async () => {
    const res = await request(app).delete("/api/v1/notifications/admin/purge").set(headers);
    expect(res.status).toBe(200);
  });
});
