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
const PRICE_SCALE = 6; // must match backend/utils/valueScale.js

/**
 * Try to fetch the closing price for `symbol` on `dateStr` (YYYY-MM-DD)
 * from Yahoo Finance.  Returns the raw float price on success, or null.
 */
async function fetchYahooHistoricalPrice(symbol, dateStr) {
  try {
    const date = new Date(dateStr + "T00:00:00Z");
    const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
    const period1 = Math.floor(date.getTime() / 1000);
    const period2 = Math.floor(nextDate.getTime() / 1000);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
    const response = await axios.get(url, {
      params: { interval: "1d", period1, period2 },
      timeout: 8000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const result = response.data?.chart?.result?.[0];
    if (!result) return null;

    // Prefer the closes array; fall back to meta.previousClose
    const closes = result.indicators?.quote?.[0]?.close;
    if (closes && closes.length > 0) {
      const close = closes.find((c) => c != null);
      if (close != null) return close;
    }

    const fallback =
      result.meta?.regularMarketPrice ?? result.meta?.previousClose;
    return fallback ?? null;
  } catch {
    return null;
  }
}

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
        price_symbol: issue.price_symbol || null,
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
    "-- Prices fetched automatically from Yahoo Finance where possible.",
  );
  lines.push(
    `-- Prices are stored as integer (float × 10^${PRICE_SCALE}, e.g. $1.23 → ${Math.round(1.23 * Math.pow(10, PRICE_SCALE))}).`,
  );
  lines.push("-- ⚠️  Lines ending with '-- ?' still need a manual price.");
  lines.push("--    Then apply via the migration runner (server startup) or:");
  lines.push("--      node scripts/migrationRunner.js");
  lines.push(
    "-- =============================================================",
  );
  lines.push("");

  let fetched = 0;
  let missing = 0;

  for (const group of Object.values(byAsset)) {
    lines.push(
      `-- ${group.symbol} (asset_id=${group.asset_id}) — ${group.name}`,
    );
    for (const date of group.dates) {
      const fetchSymbol = group.price_symbol || group.symbol;
      const yahooPrice = await fetchYahooHistoricalPrice(fetchSymbol, date);
      let priceValue;
      let suffix;
      if (yahooPrice != null) {
        priceValue = Math.round(yahooPrice * Math.pow(10, PRICE_SCALE));
        suffix = `-- yahoo(${fetchSymbol}): $${yahooPrice.toFixed(6)}`;
        fetched++;
      } else {
        priceValue = "?";
        suffix = "-- ?";
        missing++;
      }
      lines.push(
        `INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (${group.asset_id}, '${date}', ${priceValue}); ${suffix}`,
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
  console.log(`  Prices resolved from Yahoo: ${fetched}`);
  if (missing > 0) {
    console.log(`  Still needs manual entry:   ${missing} (marked with -- ?)`);
  }
  console.log(`Output: ${outPath}`);
}

main();
