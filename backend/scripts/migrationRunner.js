const logger = require("../utils/logger");
const path = require("path");
const fs = require("fs");

const migrationsDir = path.join(__dirname, "../migrations");

/**
 * Apply all pending migrations from the migrations/ directory to the given db.
 * Creates the schema_version bootstrap table if it doesn't exist yet.
 */
function runMigrationsOn(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_version (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT UNIQUE NOT NULL,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  const applied = new Set(
    db.prepare("SELECT filename FROM schema_version").all().map((r) => r.filename)
  );

  if (!fs.existsSync(migrationsDir)) return;

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (!applied.has(file)) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      db.exec(sql);
      db.prepare("INSERT INTO schema_version (filename) VALUES (?)").run(file);
      logger.info(`Applied migration: ${file}`);
    }
  }

  logger.info("DB Schema is up to date.");
}

/**
 * Convenience wrapper used by server startup.
 * Lazy-requires config/database so this module is safe to import from testDb.js
 * without creating a circular dependency.
 */
function runSchemaMigrations() {
  const db = require("../config/database");
  runMigrationsOn(db);
}

module.exports = { runSchemaMigrations, runMigrationsOn };
