/**
 * Generates a SQL migration script with INSERT placeholders for all buy/sell
 * transactions that have no price data on or before their trade date.
 *
 * Calls GET /analytics/missing-prices — no logic duplication.
 *
 * Usage (from backend/):
 *   node scripts/generateMissingPricesMigration.js
 *
 * Output: migrations/NNN_add_missing_prices.sql  (NNN auto-incremented)
 */

require("dotenv").config();
const axios = require("axios");
const readline = require("readline");
const fs = require("fs");
const path = require("path");

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5000/api/v1";
const MIGRATIONS_DIR = path.join(__dirname, "../migrations");

function nextMigrationNumber() {
  const files = fs.existsSync(MIGRATIONS_DIR)
    ? fs.readdirSync(MIGRATIONS_DIR).filter((f) => /^\d+.*\.sql$/.test(f))
    : [];
  const max = files.reduce((m, f) => {
    const n = parseInt(f, 10);
    return n > m ? n : m;
  }, 0);
  return String(max + 1).padStart(3, "0");
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const question = (q) => new Promise((resolve) => rl.question(q, resolve));

async function main() {
  // Authenticate
  const username = await question("Username: ");
  const password = await question("Password: ");
  rl.close();

  let token;
  try {
    const loginRes = await axios.post(`${API_BASE_URL}/auth/login`, {
      username,
      password,
    });
    token = loginRes.data.token;
  } catch (err) {
    console.error("Login failed:", err.response?.data?.message || err.message);
    process.exit(1);
  }

  // Fetch missing prices from the endpoint
  let issues;
  try {
    const res = await axios.get(`${API_BASE_URL}/analytics/missing-prices`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    issues = res.data.issues;
  } catch (err) {
    console.error(
      "Failed to fetch missing prices:",
      err.response?.data?.message || err.message,
    );
    process.exit(1);
  }

  if (!issues || issues.length === 0) {
    console.log("No missing prices found — nothing to generate.");
    process.exit(0);
  }

  // Group by asset for readability
  const byAsset = {};
  for (const issue of issues) {
    const key = `${issue.asset_id}|${issue.symbol}`;
    if (!byAsset[key]) {
      byAsset[key] = {
        asset_id: issue.asset_id,
        symbol: issue.symbol,
        name: issue.name,
        dates: [],
      };
    }
    byAsset[key].dates.push(issue.trade_date);
  }

  const lines = [];
  lines.push(
    "-- =============================================================",
  );
  const migrationNum = nextMigrationNumber();
  lines.push(`-- Migration ${migrationNum}: add missing price data`);
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push(
    "-- ⚠️  EDIT BEFORE RUNNING: replace every 0 placeholder with the",
  );
  lines.push("--    correct closing price × 100000 (e.g. $312.47 → 31247000).");
  lines.push("--    Then apply via the migration runner (server startup) or:");
  lines.push("--      node scripts/migrationRunner.js");
  lines.push(
    "-- =============================================================",
  );
  lines.push("");

  for (const group of Object.values(byAsset)) {
    lines.push(
      `-- ${group.symbol} (asset_id=${group.asset_id}) — ${group.name}`,
    );
    for (const date of group.dates) {
      lines.push(
        `INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (${group.asset_id}, '${date}', ?);`,
      );
    }
    lines.push("");
  }

  lines.push("-- End of missing prices migration");

  const outPath = path.join(
    MIGRATIONS_DIR,
    `${migrationNum}_add_missing_prices.sql`,
  );
  fs.writeFileSync(outPath, lines.join("\n"), "utf8");

  console.log(
    `Generated ${issues.length} INSERT(s) across ${Object.keys(byAsset).length} asset(s).`,
  );
  console.log(`Output: ${outPath}`);
}

main();
