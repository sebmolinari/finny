require("dotenv").config({ quiet: true });
const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const logger = require("./config/logger");
const { db, closeDatabase } = require("./config/database");
const PriceService = require("./services/priceService");
const emailService = require("./services/emailService");
const PortfolioEmailService = require("./services/portfolioEmailService");
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
const { runSchemaMigrations } = require("./scripts/migrationRunner");

const app = express();
const PORT = process.env.PORT;

// Validate required environment variables
if (!process.env.PORT || !process.env.NODE_ENV) {
  logger.error("FATAL: PORT or NODE_ENV is not set");
  logger.error("Please set PORT and NODE_ENV in .env file");
  process.exit(1);
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  logger.error("FATAL: JWT_SECRET is not set or too short (min 32 characters)");
  logger.error("Please set JWT_SECRET in .env file");
  process.exit(1);
}
if (!process.env.CORS_ORIGIN) {
  logger.error("FATAL: CORS_ORIGIN is not set");
  logger.error("Please set CORS_ORIGIN in .env file");
  process.exit(1);
}
if (!process.env.RATE_LIMIT_WINDOW_MS || !process.env.RATE_LIMIT_MAX_REQUESTS) {
  logger.error(
    "FATAL: RATE_LIMIT_WINDOW_MS or RATE_LIMIT_MAX_REQUESTS is not set",
  );
  logger.error(
    "Please set RATE_LIMIT_WINDOW_MS and RATE_LIMIT_MAX_REQUESTS in .env file",
  );
  process.exit(1);
}
if (!process.env.DATABASE_PATH) {
  logger.error("FATAL: DATABASE_PATH is not set");
  logger.error("Please set DATABASE_PATH in .env file");
  process.exit(1);
}

if (!process.env.DB_KEY || process.env.DB_KEY.length < 8) {
  logger.error("FATAL: DB_KEY is not set or too short (min 8 characters)");
  logger.error("Please set DB_KEY in .env file");
  process.exit(1);
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
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  }),
);

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
  const frontendBuildPath = path.join(__dirname, "..", "frontend", "build");
  app.use(express.static(frontendBuildPath));

  // Handle React routing - return index.html for all non-API routes
  app.use((req, res) => {
    res.sendFile(path.join(frontendBuildPath, "index.html"));
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
    path: req.path,
  });
});

// Global error handling
app.use((err, req, res, next) => {
  // Log full error details
  logger.error(err.message);
  logger.error(`  Path: ${req.method} ${req.path}`);
  if (process.env.NODE_ENV === "development") {
    logger.error(`  Stack:`, err.stack);
  }

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Send appropriate response
  const response = {
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  };

  res.status(statusCode).json(response);
});

// Run DB migrations before starting the server
runSchemaMigrations();

app.listen(PORT, "0.0.0.0", () => {
  logger.info("========================================");
  logger.info("Server started successfully");
  logger.info(`Port: ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  logger.info("========================================");

  // Verify email service connection if enabled
  if (process.env.EMAIL_ENABLED === "true") {
    emailService.verifyConnection().then((verified) => {
      if (verified) {
        logger.info("Email service configured and ready");
      } else {
        logger.warn("Email service configured but connection failed");
      }
    });
  }
});

const shutdown = (signal) => {
  logger.info(`${signal} received. Shutting down...`);

  closeDatabase();
  logger.info("SQLite connection closed");
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
