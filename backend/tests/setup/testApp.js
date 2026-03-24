/**
 * Express app built purely for integration tests.
 *
 * Does NOT call app.listen() or runSchemaMigrations().
 * Uses the in-memory test DB via moduleNameMapper (config/database → testDb.js).
 */
"use strict";

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const errorHandler = require("../../middleware/errorHandler");

const authRoutes = require("../../routes/auth");
const userRoutes = require("../../routes/users");
const assetRoutes = require("../../routes/assets");
const brokerRoutes = require("../../routes/brokers");
const transactionRoutes = require("../../routes/transactions");
const analyticsRoutes = require("../../routes/analytics");
const settingsRoutes = require("../../routes/settings");
const auditRoutes = require("../../routes/audit");
const constantsRoutes = require("../../routes/constants");
const emailRoutes = require("../../routes/email");
const allocationRoutes = require("../../routes/allocation");
const notificationsRoutes = require("../../routes/notifications");
const schedulerRoutes = require("../../routes/scheduler");
const systemRoutes = require("../../routes/system");
const hostMetricsRoutes = require("../../routes/hostMetrics");
const databaseRoutes = require("../../routes/database");

const app = express();

// Security & body parsing
app.use(helmet({ contentSecurityPolicy: false, hsts: false, crossOriginOpenerPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Generous rate limits for test environment
const limiter = rateLimit({ windowMs: 60000, max: 10000 });
app.use("/api/", limiter);

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/assets", assetRoutes);
app.use("/api/v1/brokers", brokerRoutes);
app.use("/api/v1/transactions", transactionRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/settings", settingsRoutes);
app.use("/api/v1/audit", auditRoutes);
app.use("/api/v1/constants", constantsRoutes);
app.use("/api/v1/email", emailRoutes);
app.use("/api/v1/allocation", allocationRoutes);
app.use("/api/v1/notifications", notificationsRoutes);
app.use("/api/v1/schedulers", schedulerRoutes);
app.use("/api/v1/system", systemRoutes);
app.use("/api/v1/metrics", hostMetricsRoutes);
app.use("/api/v1/database", databaseRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found", path: req.path });
});

app.use(errorHandler);

module.exports = app;
