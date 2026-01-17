const express = require("express");
const router = express.Router();
const AuditLog = require("../models/AuditLog");
const authMiddleware = require("../middleware/auth");
const adminMiddleware = require("../middleware/admin");
const logger = require("../config/logger");

// All audit routes require authentication and admin privileges
router.use(authMiddleware);
router.use(adminMiddleware);

/**
 * @swagger
 * /audit:
 *   get:
 *     summary: Get all audit logs (admin only)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: integer
 *         description: Filter by user ID
 *       - in: query
 *         name: action_type
 *         schema:
 *           type: string
 *         description: Filter by action type
 *       - in: query
 *         name: table_name
 *         schema:
 *           type: string
 *         description: Filter by table name
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *       - in: query
 *         name: success
 *         schema:
 *           type: boolean
 *         description: Filter by success
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Limit number of results
 *     responses:
 *       200:
 *         description: List of audit logs
 *       500:
 *         description: Server error
 */
router.get("/", (req, res) => {
  try {
    const {
      user_id,
      action_type,
      table_name,
      start_date,
      end_date,
      success,
      limit,
    } = req.query;

    const filters = {};
    if (user_id) filters.user_id = parseInt(user_id);
    if (action_type) filters.action_type = action_type;
    if (table_name) filters.table_name = table_name;
    if (start_date) filters.start_date = start_date;
    if (end_date) filters.end_date = end_date;
    if (success !== undefined) filters.success = success === "true";
    if (limit) filters.limit = parseInt(limit);

    const logs = AuditLog.findAll(filters);
    res.json(logs);
  } catch (error) {
    logger.error(`Error fetching audit logs: ${error.message}`);
    res.status(500).json({ message: "Server error fetching audit logs" });
  }
});

/**
 * @swagger
 * /audit/{id}:
 *   get:
 *     summary: Get audit log by ID (admin only)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Audit log ID
 *     responses:
 *       200:
 *         description: Audit log details
 *       404:
 *         description: Audit log not found
 *       500:
 *         description: Server error
 */
router.get("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const log = AuditLog.findById(id);

    if (!log) {
      return res.status(404).json({ message: "Audit log not found" });
    }

    res.json(log);
  } catch (error) {
    logger.error(`Error fetching audit log: ${error.message}`);
    res.status(500).json({ message: "Server error fetching audit log" });
  }
});

/**
 * @swagger
 * /audit/user/{userId}/logins:
 *   get:
 *     summary: Get login history for a user (admin only)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Limit number of results (default 10)
 *     responses:
 *       200:
 *         description: Login history
 *       500:
 *         description: Server error
 */
router.get("/user/:userId/logins", (req, res) => {
  try {
    const { userId } = req.params;
    const { limit } = req.query;

    const logs = AuditLog.getLoginHistory(
      parseInt(userId),
      limit ? parseInt(limit) : 10,
    );
    res.json(logs);
  } catch (error) {
    logger.error(`Error fetching login history: ${error.message}`);
    res.status(500).json({ message: "Server error fetching login history" });
  }
});

/**
 * @swagger
 * /audit/user/{userId}/summary:
 *   get:
 *     summary: Get activity summary for a user (admin only)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *         description: Number of days to summarize (default 30)
 *     responses:
 *       200:
 *         description: Activity summary
 *       500:
 *         description: Server error
 */
router.get("/user/:userId/summary", (req, res) => {
  try {
    const { userId } = req.params;
    const { days } = req.query;

    const summary = AuditLog.getUserActivitySummary(
      parseInt(userId),
      days ? parseInt(days) : 30,
    );
    res.json(summary);
  } catch (error) {
    logger.error(`Error fetching activity summary: ${error.message}`);
    res.status(500).json({ message: "Server error fetching activity summary" });
  }
});

/**
 * @swagger
 * /audit/cleanup:
 *   delete:
 *     summary: Delete old audit logs (maintenance endpoint, admin only)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         required: true
 *         schema:
 *           type: integer
 *         description: Delete logs older than this many days
 *     responses:
 *       200:
 *         description: Number of logs deleted
 *       400:
 *         description: Days parameter required
 *       500:
 *         description: Server error
 */
router.delete("/cleanup", (req, res) => {
  try {
    const { days } = req.query;

    if (!days) {
      return res.status(400).json({ message: "Days parameter is required" });
    }

    const deletedCount = AuditLog.deleteOlderThan(parseInt(days));
    res.json({
      message: `Successfully deleted ${deletedCount} audit logs`,
      count: deletedCount,
    });
  } catch (error) {
    logger.error(`Error deleting old audit logs: ${error.message}`);
    res.status(500).json({ message: "Server error deleting audit logs" });
  }
});

module.exports = router;
