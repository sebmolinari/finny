const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const authMiddleware = require("../middleware/auth");
const adminMiddleware = require("../middleware/admin");
const logger = require("../utils/logger");

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
 *     summary: Run a WAL TRUNCATE checkpoint (admin only)
 *     description: Flushes all committed WAL frames to the main database file and truncates the WAL file back to zero bytes.
 *     tags: [Database]
 *     security:
 *       - bearerAuth: []
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

module.exports = router;
