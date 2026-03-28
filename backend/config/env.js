require("dotenv").config({ quiet: true });

process.env.NODE_ENV = process.env.NODE_ENV || "production";

process.env.DB_PATH = process.env.DB_PATH || "data/database.db";
process.env.DB_VERBOSE = process.env.DB_VERBOSE || "false";
process.env.DB_AUDIT_QUERIES = process.env.DB_AUDIT_QUERIES || "false";

process.env.JWT_EXPIRATION = process.env.JWT_EXPIRATION || "12h";

process.env.PORT = process.env.PORT || "5000";

process.env.RATE_LIMIT_WINDOW_MS = process.env.RATE_LIMIT_WINDOW_MS || "900000";
process.env.RATE_LIMIT_MAX_REQUESTS = process.env.RATE_LIMIT_MAX_REQUESTS || "1000";

process.env.SUPABASE_ENABLED = process.env.SUPABASE_ENABLED || "false";
process.env.SUPABASE_URL = process.env.SUPABASE_URL || "";
process.env.SUPABASE_API_KEY = process.env.SUPABASE_API_KEY || "";

process.env.EMAIL_ENABLED = process.env.EMAIL_ENABLED || "false";
process.env.EMAIL_HOST = process.env.EMAIL_HOST || "smtp.gmail.com";
process.env.EMAIL_PORT = process.env.EMAIL_PORT || "587";
process.env.EMAIL_SECURE = process.env.EMAIL_SECURE || "false";
process.env.EMAIL_USER = process.env.EMAIL_USER || "";
process.env.EMAIL_APP_PASSWORD = process.env.EMAIL_APP_PASSWORD || "";
process.env.EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || "Finny Portfolio Manager";
process.env.EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || "noreply@finny.com";
