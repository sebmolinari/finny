const db = require("../config/database");
const logger = require("../config/logger");
const path = require("path");
const fs = require("fs");

const migrationsDir = path.join(__dirname, "../migrations");

function getAppliedMigrationFilenames() {
  const rows = db.prepare("SELECT filename FROM schema_version").all();
  return new Set(rows.map((r) => r.filename));
}

function getMigrationFiles() {
  if (!fs.existsSync(migrationsDir)) return [];
  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

function applyMigration(filename) {
  const sql = fs.readFileSync(path.join(migrationsDir, filename), "utf8");
  db.exec(sql);
  db.prepare("INSERT INTO schema_version (filename) VALUES (?)").run(filename);
  logger.info(`Applied migration: ${filename}`);
}

function runSchemaMigrations() {
  const appliedFilenames = getAppliedMigrationFilenames();
  const files = getMigrationFiles();
  console.log("Applied Migrations:", appliedFilenames);
  console.log("Migration Files:", files);
  for (const file of files) {
    if (!appliedFilenames.has(file)) {
      applyMigration(file);
    }
  }
  logger.info("DB Schema is up to date.");
}

module.exports = { runSchemaMigrations };
