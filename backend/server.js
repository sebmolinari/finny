const logger = require("./utils/logger");
require("./config/env");

const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { db, closeDatabase } = require("./config/database");
const emailService = require("./services/emailService");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const assetRoutes = require("./routes/assets");
const brokerRoutes = require("./routes/brokers");
const transactionRoutes = require("./routes/transactions");
const analyticsRoutes = require("./routes/analytics");
const settingsRoutes = require("./routes/settings");
const auditRoutes = require("./routes/audit");
const constantsRoutes = require("./routes/constants");
const emailRoutes = require("./routes/email");
const allocationRoutes = require("./routes/allocation");
const hostMetricsRoutes = require("./routes/hostMetrics");
const notificationsRoutes = require("./routes/notifications");
const schedulerRoutes = require("./routes/scheduler");
const databaseRoutes = require("./routes/database");
const systemRoutes = require("./routes/system");
const { runSchemaMigrations } = require("./scripts/migrationRunner");
const SchedulerService = require("./services/schedulerService");
const errorHandler = require("./middleware/errorHandler");

const SCHEDULER_INTERVAL_SECONDS = 60;
let schedulerInterval;

const app = express();
const PORT = parseInt(process.env.PORT);

// Required env vars — user must provide these in .env
if (!process.env.DB_KEY || process.env.DB_KEY.length < 8) {
  logger.error("FATAL: DB_KEY is not set or too short (min 8 characters)");
  logger.error("Please set DB_KEY in your .env file");
  process.exit(1);
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  logger.error("FATAL: JWT_SECRET is not set or too short (min 32 characters)");
  logger.error("Please set JWT_SECRET in your .env file");
  process.exit(1);
}
if (process.env.EMAIL_ENABLED === "true") {
  const missingEmailVars = ["EMAIL_USER", "EMAIL_APP_PASSWORD"].filter(
    (v) => !process.env[v],
  );
  if (missingEmailVars.length > 0) {
    logger.error(
      `FATAL: EMAIL_ENABLED=true but missing required email vars: ${missingEmailVars.join(", ")}`,
    );
    logger.error("Please set them in your .env file");
    process.exit(1);
  }
}

// Trust proxy - needed for rate limiting when behind a proxy/load balancer
// For development, trust the first hop. For production, configure appropriately.
app.set("trust proxy", 1);

// Security Middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
    hsts: false,
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(cors({ origin: true, credentials: true }));

// Rate limiting for all routes
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS),
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many login attempts, please try again later.",
  skipSuccessfulRequests: true,
});

// Body parser with size limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);

  // Log request body for non-GET requests (excluding password)
  // Guard against undefined/null req.body (some requests may not set a body)
  if (
    req.method !== "GET" &&
    req.body &&
    typeof req.body === "object" &&
    Object.keys(req.body).length > 0
  ) {
    const sanitizedBody = { ...req.body };
    if (sanitizedBody.password) sanitizedBody.password = "***";
    logger.info(`  Body:`, sanitizedBody);
  }

  next();
});

// Swagger API docs (only in development)
if (process.env.NODE_ENV !== "production") {
  const swaggerSetup = require("./config/swagger");
  swaggerSetup(app);
  logger.info("Swagger API docs available at /api/v1/api-docs");
}

// API v1 Routes
app.use("/api/v1/auth", authLimiter, authRoutes);
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
app.use("/api/v1/metrics", hostMetricsRoutes);
app.use("/api/v1/notifications", notificationsRoutes);
app.use("/api/v1/schedulers", schedulerRoutes);
app.use("/api/v1/database", databaseRoutes);
app.use("/api/v1/system", systemRoutes);

// Health check with database validation
app.get("/api/v1/health", (req, res) => {
  try {
    const result = db.prepare("SELECT 1 as test").get();
    res.json({
      status: "ok",
      message: "Server is running",
      version: "v1",
      database: result ? "connected" : "error",
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      message: "Database connection failed",
      version: "v1",
    });
  }
});

// Serve static files from React app in production
if (process.env.NODE_ENV === "production") {
  const staticPath = path.join(__dirname, "public");
  app.use(express.static(staticPath));

  // SPA fallback: all non-API routes serve index.html for React Router
  app.use((req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
    path: req.path,
  });
});

// Global error handling — translates AppError subclasses to correct HTTP status
app.use(errorHandler);

// Run DB migrations before starting the server
runSchemaMigrations();

app.listen(PORT, "0.0.0.0", () => {
  logger.info("========================================");
  logger.info("Server started successfully");
  logger.info(`Port: ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  logger.info("========================================");

  schedulerInterval = setInterval(() => {
    SchedulerService.checkDueSchedules();
  }, SCHEDULER_INTERVAL_SECONDS * 1000);
  logger.info(
    `Background scheduler initialized (checks every ${SCHEDULER_INTERVAL_SECONDS} seconds)`,
  );

  // Verify email service connection if enabled
  if (process.env.EMAIL_ENABLED === "true") {
    emailService.verifyConnection().then((verified) => {
      if (verified) {
        logger.info("Email service configured and ready");
      } else {
        logger.error(
          "FATAL: Email service connection failed. Check EMAIL_HOST/EMAIL_PORT/EMAIL_USER/EMAIL_APP_PASSWORD.",
        );
        process.exit(1);
      }
    });
  }
});

const shutdown = (signal) => {
  logger.info(`${signal} received. Shutting down...`);

  // Clear scheduler interval
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    logger.info("Background scheduler stopped");
  }

  closeDatabase();
  logger.info("SQLite connection closed");
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
