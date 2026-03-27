require("dotenv").config();
const Database = require("better-sqlite3-multiple-ciphers");
const path = require("path");
const fs = require("fs");

const srcPath = path.resolve(__dirname, `../${process.env.DB_PATH}`);
const outPath = srcPath.replace(/\.db$/, "_plain.db");

if (!process.env.DB_KEY) {
  console.error("ERROR: DB_KEY not set in .env");
  process.exit(1);
}

if (!fs.existsSync(srcPath)) {
  console.error(`ERROR: Database not found at ${srcPath}`);
  process.exit(1);
}

if (fs.existsSync(outPath)) {
  fs.unlinkSync(outPath);
}

console.log(`Source : ${srcPath}`);
console.log(`Output : ${outPath}`);

const db = new Database(srcPath);
db.pragma(`key='${process.env.DB_KEY}'`);

// Flush all WAL transactions to the main DB file before exporting
const checkpoint = db.pragma("wal_checkpoint(TRUNCATE)");
console.log(`WAL checkpoint: ${JSON.stringify(checkpoint)}`);

db.close();

// Copy the encrypted file, then rekey it to empty string (removes encryption)
fs.copyFileSync(srcPath, outPath);

const plain = new Database(outPath);
plain.pragma(`key='${process.env.DB_KEY}'`);
plain.rekey(Buffer.from("", "utf8"));
plain.close();

db.close();

console.log("Done. Open the _plain.db file with DB Browser for SQLite.");
