const Database = require("better-sqlite3-multiple-ciphers");
//https://github.com/m4heshd/better-sqlite3-multiple-ciphers
const path = require("path");

const dbPath = path.join(__dirname, `../${process.env.DATABASE_PATH}`);
const db = new Database(
  dbPath,
  // Enable for debugging
  // {
  //   verbose: console.log,
  // },
);

db.pragma(`key='${process.env.DB_KEY}'`);
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

function closeDatabase() {
  db.close(); // sync & safe
}

// 👇 backward-compatible export
module.exports = db;
module.exports.db = db;
module.exports.closeDatabase = closeDatabase;
