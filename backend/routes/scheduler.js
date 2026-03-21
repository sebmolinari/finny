const express = require("express");
const router = express.Router();
const SchedulerService = require("../services/schedulerService");
const AuditLog = require("../models/AuditLog");
const authMiddleware = require("../middleware/auth");
const adminMiddleware = require("../middleware/admin");
const logger = require("../utils/logger");

/**
 * @swagger
 * /api/v1/schedulers:
 *   get:
 *     summary: Get all schedulers
 *     tags: [Schedulers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of results (default 50)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Number of results to skip (default 0)
 *     responses:
 *       200:
 *         description: List of schedulers
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.get("/", authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const schedulers = SchedulerService.getSchedulers(
      parseInt(limit),
      parseInt(offset),
    );
    const total = SchedulerService.getSchedulersCount();

    res.json({
      data: schedulers,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    logger.error(`Error retrieving schedulers: ${error.message}`);
    res.status(500).json({ message: "Error retrieving schedulers" });
  }
});

/**
 * @swagger
 * /api/v1/schedulers:
 *   post:
 *     summary: Create a new scheduler
 *     tags: [Schedulers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - frequency
 *               - time_of_day
 *             properties:
 *               name:
 *                 type: string
 *                 description: Scheduler name
 *               type:
 *                 type: string
 *                 enum: [send_report, asset_refresh]
 *                 description: Type of scheduler
 *               frequency:
 *                 type: string
 *                 enum: [daily, weekly, monthly]
 *                 description: Frequency of execution
 *               time_of_day:
 *                 type: string
 *                 description: Time to execute (HH:MM format)
 *               metadata:
 *                 type: object
 *                 description: Additional configuration (frequency for send_report, day_of_week for weekly, etc.)
 *     responses:
 *       201:
 *         description: Scheduler created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.post("/", authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { name, type, frequency, time_of_day } = req.body;

    // Validate required fields
    if (!name || !type || !frequency || !time_of_day) {
      return res.status(400).json({
        message: "Missing required fields: name, type, frequency, time_of_day",
      });
    }

    // Validate enum values
    if (!["send_report", "asset_refresh"].includes(type)) {
      return res.status(400).json({
        message: "Invalid type. Must be 'send_report' or 'asset_refresh'",
      });
    }

    if (!["daily", "weekly", "monthly"].includes(frequency)) {
      return res.status(400).json({
        message: "Invalid frequency. Must be 'daily', 'weekly', or 'monthly'",
      });
    }

    // Time format validation is done in the service
    const schedulerId = SchedulerService.createScheduler(
      name,
      type,
      frequency,
      time_of_day,
      req.user.id,
    );

    // Log audit trail
    AuditLog.logCreate(
      req.user.id,
      req.user.username,
      "schedulers",
      schedulerId,
      { name, type, frequency, time_of_day },
      req.ip,
      req.get("user-agent"),
    );

    const scheduler = SchedulerService.getSchedulerById(schedulerId);
    res.status(201).json({
      message: "Scheduler created successfully",
      data: scheduler,
    });
  } catch (error) {
    if (error.message.includes("Invalid time format")) {
      return res.status(400).json({ message: error.message });
    }

    logger.error(`Error creating scheduler: ${error.message}`);
    res.status(500).json({ message: "Error creating scheduler" });
  }
});

/**
 * @swagger
 * /api/v1/schedulers/{id}:
 *   get:
 *     summary: Get a scheduler by ID
 *     tags: [Schedulers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Scheduler details
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Scheduler not found
 *       500:
 *         description: Server error
 */
router.get("/:id", authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const scheduler = SchedulerService.getSchedulerById(id);

    if (!scheduler) {
      return res.status(404).json({ message: "Scheduler not found" });
    }

    res.json({ data: scheduler });
  } catch (error) {
    logger.error(`Error retrieving scheduler: ${error.message}`);
    res.status(500).json({ message: "Error retrieving scheduler" });
  }
});

/**
 * @swagger
 * /api/v1/schedulers/{id}:
 *   put:
 *     summary: Update a scheduler
 *     tags: [Schedulers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - frequency
 *               - time_of_day
 *               - enabled
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [send_report, asset_refresh]
 *               frequency:
 *                 type: string
 *                 enum: [daily, weekly, monthly]
 *               time_of_day:
 *                 type: string
 *               enabled:
 *                 type: boolean
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Scheduler updated successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Scheduler not found
 *       500:
 *         description: Server error
 */
router.put("/:id", authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, frequency, time_of_day, enabled } = req.body;

    // Check if scheduler exists
    const scheduler = SchedulerService.getSchedulerById(id);
    if (!scheduler) {
      return res.status(404).json({ message: "Scheduler not found" });
    }

    // Validate required fields
    if (
      name === undefined ||
      type === undefined ||
      frequency === undefined ||
      time_of_day === undefined ||
      enabled === undefined
    ) {
      return res.status(400).json({
        message:
          "Missing required fields: name, type, frequency, time_of_day, enabled",
      });
    }

    // Validate enum values
    if (!["send_report", "asset_refresh"].includes(type)) {
      return res.status(400).json({
        message: "Invalid type. Must be 'send_report' or 'asset_refresh'",
      });
    }

    if (!["daily", "weekly", "monthly"].includes(frequency)) {
      return res.status(400).json({
        message: "Invalid frequency. Must be 'daily', 'weekly', or 'monthly'",
      });
    }

    const changes = SchedulerService.updateScheduler(
      id,
      name,
      type,
      frequency,
      time_of_day,
      enabled ? 1 : 0,
      req.user.id,
    );

    if (changes === 0) {
      return res.status(404).json({ message: "Scheduler not found" });
    }

    // Log audit trail
    AuditLog.logUpdate(
      req.user.id,
      req.user.username,
      "schedulers",
      id,
      scheduler,
      { name, type, frequency, time_of_day, enabled },
      req.ip,
      req.get("user-agent"),
    );

    const updatedScheduler = SchedulerService.getSchedulerById(id);
    res.json({
      message: "Scheduler updated successfully",
      data: updatedScheduler,
    });
  } catch (error) {
    if (error.message.includes("Invalid time format")) {
      return res.status(400).json({ message: error.message });
    }

    logger.error(`Error updating scheduler: ${error.message}`);
    res.status(500).json({ message: "Error updating scheduler" });
  }
});

/**
 * @swagger
 * /api/v1/schedulers/instances:
 *   delete:
 *     summary: Purge all scheduler instances (execution history)
 *     tags: [Schedulers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All instances deleted
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.delete("/instances", authMiddleware, adminMiddleware, (req, res) => {
  try {
    const deleted = SchedulerService.purgeAllInstances();

    AuditLog.logDelete(
      req.user.id,
      req.user.username,
      "scheduler_instances",
      null,
      { purged: deleted },
      req.ip,
      req.get("user-agent"),
    );

    res.json({ message: "Scheduler history purged", deleted });
  } catch (error) {
    logger.error(`Error purging scheduler instances: ${error.message}`);
    res.status(500).json({ message: "Error purging scheduler history" });
  }
});

/**
 * @swagger
 * /api/v1/schedulers/{id}:
 *   delete:
 *     summary: Delete a scheduler
 *     tags: [Schedulers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Scheduler deleted successfully
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Scheduler not found
 *       500:
 *         description: Server error
 */
router.delete("/:id", authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { id } = req.params;

    // Check if scheduler exists
    const scheduler = SchedulerService.getSchedulerById(id);
    if (!scheduler) {
      return res.status(404).json({ message: "Scheduler not found" });
    }

    const changes = SchedulerService.deleteScheduler(id);

    if (changes === 0) {
      return res.status(404).json({ message: "Scheduler not found" });
    }

    // Log audit trail
    AuditLog.logDelete(
      req.user.id,
      req.user.username,
      "schedulers",
      id,
      scheduler,
      req.ip,
      req.get("user-agent"),
    );

    res.json({ message: "Scheduler deleted successfully" });
  } catch (error) {
    logger.error(`Error deleting scheduler: ${error.message}`);
    res.status(500).json({ message: "Error deleting scheduler" });
  }
});

/**
 * @swagger
 * /api/v1/schedulers/{id}/instances:
 *   get:
 *     summary: Get execution history for a scheduler
 *     tags: [Schedulers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of results (default 50)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Number of results to skip (default 0)
 *     responses:
 *       200:
 *         description: Execution history
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Scheduler not found
 *       500:
 *         description: Server error
 */
router.get("/:id/instances", authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Check if scheduler exists
    const scheduler = SchedulerService.getSchedulerById(id);
    if (!scheduler) {
      return res.status(404).json({ message: "Scheduler not found" });
    }

    const instances = SchedulerService.getSchedulerInstances(
      id,
      parseInt(limit),
      parseInt(offset),
    );
    const total = SchedulerService.getSchedulerInstancesCount(id);

    res.json({
      data: instances,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    logger.error(`Error retrieving scheduler instances: ${error.message}`);
    res.status(500).json({ message: "Error retrieving execution history" });
  }
});

module.exports = router;
