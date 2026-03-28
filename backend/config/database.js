const Database = require("better-sqlite3-multiple-ciphers");
const path = require("path");
const fs = require("fs");

const dbPath = path.join(__dirname, `../${process.env.DB_PATH}`);
const auditPath = path.join(__dirname, `../query_audit.json`);

// 1. Check if auditing is enabled via .env
const IS_AUDIT_ENABLED = process.env.DB_AUDIT_QUERIES === "true";

const dbOptions = process.env.DB_VERBOSE.toLowerCase() === "true" ? { verbose: console.log } : {};

const rawDb = new Database(dbPath, dbOptions);

// Initial Setup
rawDb.pragma(`key='${process.env.DB_KEY}'`);
rawDb.pragma("foreign_keys = ON");
rawDb.pragma("journal_mode = WAL");

// 2. The Proxy (Only wraps if enabled)
let db;

if (IS_AUDIT_ENABLED) {
  console.log("🛠️ SQLite Audit Mode: Enabled. Plans will be saved to query_audit.json");

  db = new Proxy(rawDb, {
    get(target, prop) {
      const value = target[prop];

      if (prop === "prepare" && typeof value === "function") {
        return function (sql) {
          const statement = value.apply(target, arguments);

          // Only audit SELECT queries
          if (sql.trim().toUpperCase().startsWith("SELECT")) {
            auditQueryPlan(target, sql);
          }

          return statement;
        };
      }
      return value;
    },
  });
} else {
  // If disabled, just use the raw database object directly (zero overhead)
  db = rawDb;
}

function auditQueryPlan(target, sql) {
  try {
    const fingerPrint = sql.trim().replace(/\s+/g, " ");
    let report = {};

    if (fs.existsSync(auditPath)) {
      report = JSON.parse(fs.readFileSync(auditPath, "utf8"));
    }

    // Only run EXPLAIN for new unique queries
    if (!report[fingerPrint]) {
      const plan = target.prepare(`EXPLAIN QUERY PLAN ${sql}`).all();
      const isOptimized = !planString.includes("SCAN") && !planString.includes("TEMP B-TREE");

      report[fingerPrint] = {
        timestamp: new Date().toISOString(),
        plan: plan,
        is_optimized: isOptimized,
      };

      fs.writeFileSync(auditPath, JSON.stringify(report, null, 2));
    }
  } catch (err) {
    // Silently catch errors to keep the app running
  }
}

function closeDatabase() {
  rawDb.close();
}

module.exports = db;
module.exports.db = db;
module.exports.closeDatabase = closeDatabase;
