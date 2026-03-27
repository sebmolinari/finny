// Environment variables required by the application before any module is loaded.
// These are test-safe values — no real DB file is created; config/database is
// intercepted by jest.config.js moduleNameMapper and replaced with testDb.js.

process.env.NODE_ENV = "test";
process.env.PORT = "5001";
process.env.DB_KEY = "test-key-12345678";
process.env.DB_PATH = "test.db"; // never actually opened
process.env.JWT_SECRET = "test-jwt-secret-that-is-at-least-32-characters-long";
process.env.JWT_EXPIRATION = "1h";
process.env.EMAIL_ENABLED = "false";
process.env.RATE_LIMIT_WINDOW_MS = "900000";
process.env.RATE_LIMIT_MAX_REQUESTS = "100";
process.env.SUPABASE_ENABLED = "false";
