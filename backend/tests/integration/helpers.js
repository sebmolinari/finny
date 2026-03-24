"use strict";

const request = require("supertest");
const app = require("../setup/testApp");
const db = require("../setup/testDb");

/**
 * Reset DB and register + log in an admin user.
 * Returns { token, userId, headers }.
 */
async function setupAdminUser() {
  db.clearAll();
  const res = await request(app).post("/api/v1/auth/register").send({
    username: "admin",
    email: "admin@test.com",
    password: "Admin1234",
  });
  // First registered user becomes admin automatically
  return {
    token: res.body.token,
    userId: res.body.user?.id,
    headers: { Authorization: `Bearer ${res.body.token}` },
  };
}

/**
 * Register + log in a second regular user.
 */
async function setupSecondUser(adminHeaders) {
  await request(app)
    .post("/api/v1/users")
    .set(adminHeaders)
    .send({ username: "user2", email: "user2@test.com", password: "User12345", role: "user" });

  const res = await request(app).post("/api/v1/auth/login").send({
    username: "user2",
    password: "User12345",
  });
  return { token: res.body.token, userId: res.body.user?.id, headers: { Authorization: `Bearer ${res.body.token}` } };
}

module.exports = { app, db, setupAdminUser, setupSecondUser };
