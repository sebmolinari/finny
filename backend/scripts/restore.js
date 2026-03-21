//stop backed to commit transactions
//scp username@ip_address:/path/to/remote/file /path/to/local/destination
//start backedn

require("dotenv").config();
const Database = require("better-sqlite3-multiple-ciphers");
const readline = require("readline");
const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");

// Setup readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Promisify readline question
const question = (query) =>
  new Promise((resolve) => rl.question(query, resolve));

async function restoreDatabase() {
  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║        DATABASE RESTORE - ENCRYPTION RECOVERY          ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  // Step 1: Confirm with user
  console.log("⚠️  WARNING: This operation will DESTROY the current database!");
  console.log("⚠️  All existing data will be permanently lost!\n");

  const confirmation = await question(
    "Do you want to proceed? Type 'yes' to continue: ",
  );

  if (confirmation.toLowerCase() !== "yes") {
    console.log("\n❌ Restore operation cancelled.");
    rl.close();
    process.exit(0);
  }

  // Step 2: Get backup file path
  const backupPath = await question(
    "\nEnter the path to the encrypted backup database: ",
  );

  if (!fs.existsSync(backupPath)) {
    console.error(`\n❌ Backup file not found: ${backupPath}`);
    rl.close();
    process.exit(1);
  }

  // Step 3: Get old password
  console.log("\nThe backup database is encrypted with a password.");
  const oldPassword = await question("Enter the backup database password: ");

  if (!oldPassword) {
    console.error("\n❌ Password cannot be empty.");
    rl.close();
    process.exit(1);
  }

  // Get the new encryption key from environment
  const newPassword = process.env.DB_KEY;
  if (!newPassword) {
    console.error(
      "\n❌ DB_KEY not found in environment variables. Cannot proceed.",
    );
    rl.close();
    process.exit(1);
  }

  // Get target database path
  const targetDbPath = path.join(__dirname, `../${process.env.DATABASE_PATH}`);

  console.log("\n📋 Restore Summary:");
  console.log(`   Source: ${backupPath}`);
  console.log(`   Target: ${targetDbPath}`);

  try {
    // Step 4: Open backup database with old password
    console.log("🔓 Opening encrypted backup database...");
    const backupDb = new Database(backupPath);

    // Apply the old password
    backupDb.pragma(`key='${oldPassword}'`);

    // Test if password is correct by running a simple query
    try {
      backupDb.prepare("SELECT name FROM sqlite_master LIMIT 1").get();
      console.log("✓ Backup database decrypted successfully");
    } catch (error) {
      console.error(
        "\n❌ Failed to decrypt backup database. Incorrect password?",
      );
      console.error(`Error: ${error.message}`);
      backupDb.close();
      rl.close();
      process.exit(1);
    }

    // Step 5: Create temporary copy and rekey
    console.log("🔐 Re-encrypting database with new key...");

    const tempPath = targetDbPath + ".temp";

    // Remove temp file if it exists
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }

    // Optionally create a backup of current database if it exists
    if (fs.existsSync(targetDbPath)) {
      const backupConfirm = await question(
        "\nDo you want to back up the current database before replacing it? (yes/no): ",
      );
      if (backupConfirm.toLowerCase() === "yes") {
        const backupTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const currentBackupPath = `${targetDbPath}.backup-${backupTimestamp}`;
        console.log(
          `📦 Backing up current database to: ${path.basename(currentBackupPath)}`,
        );
        fs.copyFileSync(targetDbPath, currentBackupPath);
      } else {
        console.log("⏭️  Skipping backup of current database.");
      }
    }

    // Copy backup to temp location
    fs.copyFileSync(backupPath, tempPath);
    backupDb.close();

    // Open temp database and rekey it
    const tempDb = new Database(tempPath);
    tempDb.pragma(`key='${oldPassword}'`);

    // Rekey to new password using the documented API
    tempDb.rekey(Buffer.from(newPassword, "utf8"));
    tempDb.close();

    console.log("✓ Database re-encrypted successfully");

    // Step 6: Replace target database with new encrypted one
    console.log("📝 Replacing current database...");
    if (fs.existsSync(targetDbPath)) {
      fs.unlinkSync(targetDbPath);
    }
    fs.renameSync(tempPath, targetDbPath);

    // Verify the new database
    console.log("🔍 Verifying restored database...");
    const verifyDb = new Database(targetDbPath, { readonly: true });
    verifyDb.pragma(`key='${newPassword}'`);

    try {
      const tables = verifyDb
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
        )
        .all();
      console.log(`✓ Verified ${tables.length} tables in restored database:`);
      tables.forEach((table) => {
        const count = verifyDb
          .prepare(`SELECT COUNT(*) as count FROM ${table.name}`)
          .get();
        console.log(`   - ${table.name}: ${count.count} rows`);
      });

      verifyDb.close();
    } catch (error) {
      console.error("\n❌ Failed to verify restored database");
      console.error(`Error: ${error.message}`);
      verifyDb.close();
      rl.close();
      process.exit(1);
    }

    console.log("\n✅ Database restore completed successfully!");
    console.log(
      "✅ The database is now encrypted with the key from DB_KEY environment variable.\n",
    );

    logger.info("Database restore completed successfully");
  } catch (error) {
    console.error("\n❌ Restore operation failed");
    console.error(`Error: ${error.message}`);
    logger.error("Database restore failed", { error: error.message });
    rl.close();
    process.exit(1);
  }

  rl.close();
  process.exit(0);
}

// Run the restore
restoreDatabase().catch((error) => {
  console.error("\n❌ Unexpected error during restore:");
  console.error(error);
  rl.close();
  process.exit(1);
});
