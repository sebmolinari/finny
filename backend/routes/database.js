const express = require("express");
const path = require("path");
const router = express.Router();
const { db } = require("../config/database");
const authMiddleware = require("../middleware/auth");
const adminMiddleware = require("../middleware/admin");
const logger = require("../utils/logger");
const Asset = require("../models/Asset");
const Broker = require("../models/Broker");
const PriceData = require("../models/PriceData");
const Transaction = require("../models/Transaction");
const AssetAllocationTarget = require("../models/AssetAllocationTarget");

const PROTECTED_SYMBOLS = ["USD", "USDARS_BNA", "USDARS_CCL"];
const PROTECTED_SYMBOLS_SQL = PROTECTED_SYMBOLS.map((s) => `'${s}'`).join(",");

/**
 * @swagger
 * tags:
 *   name: Database
 *   description: Database maintenance endpoints (admin only)
 */

/**
 * @swagger
 * /database/wal-checkpoint:
 *   post:
 *     summary: Run a WAL TRUNCATE checkpoint
 *     description: Flushes all committed WAL frames to the main database file and truncates the WAL file back to zero bytes.
 *     tags: [Database]
 *     security:
 *       - adminAuth: []
 *     responses:
 *       200:
 *         description: Checkpoint completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 busy:
 *                   type: integer
 *                   description: 1 if a checkpoint could not complete due to active readers, 0 otherwise
 *                 log:
 *                   type: integer
 *                   description: Total number of frames in the WAL file
 *                 checkpointed:
 *                   type: integer
 *                   description: Number of frames successfully checkpointed
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Checkpoint failed
 */
router.post("/wal-checkpoint", authMiddleware, adminMiddleware, (req, res) => {
  try {
    const result = db.pragma("wal_checkpoint(TRUNCATE)");
    const { busy, log, checkpointed } = result[0];
    logger.info(
      `WAL checkpoint: busy=${busy}, log=${log}, checkpointed=${checkpointed}`,
    );
    res.json({ busy, log, checkpointed });
  } catch (error) {
    logger.error(`WAL checkpoint error: ${error.message}`);
    res.status(500).json({ message: "Checkpoint failed" });
  }
});

/**
 * @swagger
 * /database/reset:
 *   delete:
 *     summary: Reset all user data
 *     description: Deletes all transactions, price data (except protected symbols), assets (except protected symbols), brokers, allocation targets, notifications, and audit logs. Also resets onboarding and settings_reviewed flags.
 *     tags: [Database]
 *     security:
 *       - adminAuth: []
 *     responses:
 *       200:
 *         description: Data reset summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deleted:
 *                   type: object
 *                   properties:
 *                     allocationTargets:
 *                       type: integer
 *                     transactions:
 *                       type: integer
 *                     priceData:
 *                       type: integer
 *                     assets:
 *                       type: integer
 *                     brokers:
 *                       type: integer
 *                     auditLogs:
 *                       type: integer
 *                     notifications:
 *                       type: integer
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Reset failed
 */
router.delete("/reset", authMiddleware, adminMiddleware, (req, res) => {
  try {
    const resetAll = db.transaction(() => {
      const allocationTargets = db
        .prepare("DELETE FROM asset_allocation_targets")
        .run().changes;
      const transactions = db.prepare("DELETE FROM transactions").run().changes;
      const priceData = db
        .prepare(
          `DELETE FROM price_data WHERE asset_id NOT IN (
            SELECT id FROM assets WHERE symbol IN (${PROTECTED_SYMBOLS_SQL})
          )`,
        )
        .run().changes;
      const assets = db
        .prepare(
          `DELETE FROM assets WHERE symbol NOT IN (${PROTECTED_SYMBOLS_SQL})`,
        )
        .run().changes;
      const brokers = db.prepare("DELETE FROM brokers").run().changes;
      const notifications = db
        .prepare("DELETE FROM notifications")
        .run().changes;
      const auditLogs = db.prepare("DELETE FROM audit_logs").run().changes;
      db.prepare(
        "UPDATE user_settings SET onboarding_completed = 0, settings_reviewed = 0",
      ).run();
      return {
        allocationTargets,
        transactions,
        priceData,
        assets,
        brokers,
        auditLogs,
        notifications,
      };
    });

    const deleted = resetAll();
    logger.info(
      `Data reset by admin ${req.user.username}: ${JSON.stringify(deleted)}`,
    );
    res.json({ deleted });
  } catch (error) {
    logger.error(`Data reset error: ${error.message}`);
    res.status(500).json({ message: "Reset failed" });
  }
});

/**
 * @swagger
 * /database/seed:
 *   post:
 *     summary: Seed database with sample data
 *     description: Loads brokers, assets, price history, transactions, and allocation targets from the bundled sample_data/data.json file. Skips protected symbols and logs conflicts as warnings.
 *     tags: [Database]
 *     security:
 *       - adminAuth: []
 *     responses:
 *       200:
 *         description: Seed counts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 created:
 *                   type: object
 *                   properties:
 *                     brokers:
 *                       type: integer
 *                     assets:
 *                       type: integer
 *                     priceData:
 *                       type: integer
 *                     transactions:
 *                       type: integer
 *                     allocationTargets:
 *                       type: integer
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Seed failed
 */
router.post("/seed", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const sampleData = require(
      path.join(__dirname, "../sample_data/data.json"),
    );
    const userId = req.user.id;
    const counts = { brokers: 0, assets: 0, priceData: 0, transactions: 0 };

    // Brokers
    const brokerIds = {};
    for (const broker of sampleData.brokers) {
      try {
        const id = Broker.create(
          userId,
          broker.name,
          broker.description,
          broker.website || null,
          broker.active ?? 1,
          userId,
        );
        brokerIds[broker.name] = id;
        counts.brokers++;
      } catch (e) {
        logger.warn(`Seed: skipping broker "${broker.name}": ${e.message}`);
      }
    }

    // Assets (skip protected symbols)
    const assetIds = {};
    for (const asset of sampleData.assets) {
      if (PROTECTED_SYMBOLS.includes(asset.symbol)) continue;
      try {
        const id = Asset.create(
          asset.symbol,
          asset.name,
          asset.type,
          asset.currency,
          asset.price_source,
          asset.price_symbol,
          asset.active ?? 1,
          asset.price_factor ?? null,
          userId,
        );
        assetIds[asset.symbol] = id;
        counts.assets++;
      } catch (e) {
        logger.warn(`Seed: skipping asset "${asset.symbol}": ${e.message}`);
      }
    }

    // Price data
    const priceRows = [];
    for (const symbol of Object.keys(sampleData.priceHistory || {})) {
      const assetId = assetIds[symbol];
      if (!assetId) continue;
      for (const entry of sampleData.priceHistory[symbol]) {
        priceRows.push({
          asset_id: assetId,
          date: entry.date,
          price: entry.price,
          source: "manual",
        });
      }
    }
    if (priceRows.length > 0) {
      PriceData.bulkCreate(priceRows, userId);
      counts.priceData = priceRows.length;
    }

    // Transactions
    for (const tx of sampleData.transactions || []) {
      const assetId = tx.asset_symbol ? assetIds[tx.asset_symbol] : undefined;
      const brokerId = tx.broker_name ? brokerIds[tx.broker_name] : undefined;
      try {
        Transaction.create(
          userId,
          {
            asset_id: assetId || null,
            broker_id: brokerId || null,
            date: tx.date,
            transaction_type: tx.transaction_type,
            quantity: tx.quantity,
            price: tx.price,
            fee: tx.fee,
            total_amount: tx.total_amount,
            notes: tx.notes,
          },
          userId,
        );
        counts.transactions++;
      } catch (e) {
        logger.warn(`Seed: skipping transaction on ${tx.date}: ${e.message}`);
      }
    }

    // Allocation targets
    counts.allocationTargets = 0;
    const allocationTargets = sampleData.allocationTargets || {};
    for (const target of allocationTargets.byType || []) {
      try {
        AssetAllocationTarget.upsert(
          userId,
          target.asset_type,
          null,
          target.target_percentage,
          null,
          userId,
        );
        counts.allocationTargets++;
      } catch (e) {
        logger.warn(
          `Seed: skipping type allocation "${target.asset_type}": ${e.message}`,
        );
      }
    }
    for (const target of allocationTargets.byAsset || []) {
      const assetId = assetIds[target.symbol];
      if (!assetId) continue;
      try {
        AssetAllocationTarget.upsert(
          userId,
          null,
          assetId,
          target.target_percentage,
          null,
          userId,
        );
        counts.allocationTargets++;
      } catch (e) {
        logger.warn(
          `Seed: skipping asset allocation "${target.symbol}": ${e.message}`,
        );
      }
    }

    logger.info(
      `Sample data seeded by admin ${req.user.username}: ${JSON.stringify(counts)}`,
    );
    res.json({ created: counts });
  } catch (error) {
    logger.error(`Seed error: ${error.message}`);
    res.status(500).json({ message: "Seed failed" });
  }
});

module.exports = router;
