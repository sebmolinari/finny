const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const adminMiddleware = require("../middleware/admin");

const mask = (value) => (value ? "••••••••" : "(not set)");

/**
 * @swagger
 * /api/v1/system/config:
 *   get:
 *     summary: Get sanitized server configuration
 *     tags: [System]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Server configuration with secrets masked
 *       403:
 *         description: Admin access required
 */
router.get("/config", authMiddleware, adminMiddleware, (_req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_PATH: process.env.DATABASE_PATH,
    PORT: process.env.PORT,
    DB_KEY: mask(process.env.DB_KEY),
    JWT_SECRET: mask(process.env.JWT_SECRET),
    JWT_EXPIRATION: process.env.JWT_EXPIRATION,
    RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
    RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
    EMAIL_ENABLED: process.env.EMAIL_ENABLED,
    EMAIL_HOST: process.env.EMAIL_HOST,
    EMAIL_PORT: process.env.EMAIL_PORT,
    EMAIL_SECURE: process.env.EMAIL_SECURE,
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_APP_PASSWORD: mask(process.env.EMAIL_APP_PASSWORD),
    EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
    EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS,
    SUPABASE_ENABLED: process.env.SUPABASE_ENABLED,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_API_KEY: mask(process.env.SUPABASE_API_KEY),
  });
});

module.exports = router;
