/**
 * In-memory SQLite database for tests.
 *
 * Intercepted by jest.config.js moduleNameMapper so that every
 * `require('.../config/database')` in application code receives this
 * unencrypted in-memory DB instead of the real encrypted file.
 *
 * Schema is built by running the real migration files, so no manual
 * schema maintenance is needed here — just add a migration file as usual.
 */
const Database = require("better-sqlite3-multiple-ciphers");
const { runMigrationsOn } = require("../../scripts/migrationRunner");

const db = new Database(":memory:");

db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

runMigrationsOn(db);

// ── Helpers exported for test cleanup ───────────────────────────────────────

/**
 * Delete all rows from every user table.
 * Call in beforeEach when you need a clean slate.
 */
db.clearAll = () => {
  const tables = db
    .prepare(
      `SELECT name FROM sqlite_master
       WHERE type = 'table'
         AND name NOT IN ('schema_version', 'sqlite_sequence')`
    )
    .all()
    .map((r) => r.name);

  db.pragma("foreign_keys = OFF");
  for (const table of tables) {
    db.exec(`DELETE FROM "${table}"`);
  }
  db.pragma("foreign_keys = ON");
};

module.exports = db;
module.exports.db = db;
module.exports.closeDatabase = () => {};
