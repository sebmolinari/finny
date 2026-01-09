const express = require("express");
const router = express.Router();
const Broker = require("../models/Broker");
const AuditLog = require("../models/AuditLog");
const authMiddleware = require("../middleware/auth");
const { validate } = require("../utils/validationMiddleware");
const {
  brokerValidation,
} = require("../middleware/validators/brokerValidators");

// Get all brokers for user
router.get("/", authMiddleware, (req, res) => {
  try {
    /**
     * @swagger
     * /brokers:
     *   get:
     *     summary: Get all brokers for the current user
     *     tags: [Brokers]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: includeInactive
     *         schema:
     *           type: boolean
     *         description: Include inactive brokers
     *     responses:
     *       200:
     *         description: List of brokers
     *       500:
     *         description: Server error
     */
    const { includeInactive } = req.query;
    const brokers = Broker.findByUser(req.user.id, {
      includeInactive: includeInactive === "true",
    });
    res.json(brokers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get broker by ID
router.get("/:id", authMiddleware, (req, res) => {
  try {
    /**
     * @swagger
     * /brokers/{id}:
     *   get:
     *     summary: Get broker by ID
     *     tags: [Brokers]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: Broker ID
     *     responses:
     *       200:
     *         description: Broker details
     *       404:
     *         description: Broker not found
     *       500:
     *         description: Server error
     */
    const broker = Broker.findById(req.params.id, req.user.id);
    if (!broker) {
      return res.status(404).json({ message: "Broker not found" });
    }
    res.json(broker);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new broker
router.post("/", authMiddleware, validate(brokerValidation), (req, res) => {
  try {
    /**
     * @swagger
     * /brokers:
     *   post:
     *     summary: Create a new broker
     *     tags: [Brokers]
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
     *             properties:
     *               name:
     *                 type: string
     *               description:
     *                 type: string
     *               website:
     *                 type: string
     *               active:
     *                 type: boolean
     *                 default: true
     *     responses:
     *       201:
     *         description: Broker created
     *       400:
     *         description: Validation error
     *       500:
     *         description: Server error
     */
    const { name, description, website } = req.body;
    const active = req.body.active === undefined ? 1 : req.body.active ? 1 : 0;

    const id = Broker.create(
      req.user.id,
      name,
      description,
      website,
      active,
      req.user.id
    );

    const broker = Broker.findById(id, req.user.id);

    // Log broker creation
    AuditLog.logCreate(
      req.user.id,
      req.user.username,
      "brokers",
      id,
      {
        name,
        description,
        website,
        active,
      },
      req.ip,
      req.get("user-agent")
    );

    res.status(201).json(broker);
  } catch (error) {
    if (error.message.includes("UNIQUE constraint failed")) {
      return res.status(400).json({
        message: "A broker with this name already exists for your account",
      });
    }
    res.status(500).json({ message: error.message });
  }
});

// Update broker
router.put("/:id", authMiddleware, validate(brokerValidation), (req, res) => {
  try {
    /**
     * @swagger
     * /brokers/{id}:
     *   put:
     *     summary: Update broker
     *     tags: [Brokers]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: Broker ID
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               name:
     *                 type: string
     *               description:
     *                 type: string
     *               website:
     *                 type: string
     *               active:
     *                 type: boolean
     *     responses:
     *       200:
     *         description: Broker updated
     *       404:
     *         description: Broker not found
     *       500:
     *         description: Server error
     */
    const broker = Broker.findById(req.params.id, req.user.id);
    if (!broker) {
      return res.status(404).json({ message: "Broker not found" });
    }

    const { name, description, website } = req.body;
    const active = req.body.active === undefined ? 1 : req.body.active ? 1 : 0;

    const oldValues = {
      name: broker.name,
      description: broker.description,
      website: broker.website,
      active: broker.active,
    };

    Broker.update(
      req.params.id,
      req.user.id,
      {
        name,
        description,
        website,
        active,
      },
      req.user.id
    );

    const updatedBroker = Broker.findById(req.params.id, req.user.id);

    // Log broker update
    AuditLog.logUpdate(
      req.user.id,
      req.user.username,
      "brokers",
      parseInt(req.params.id),
      oldValues,
      { name, description, website, active },
      req.ip,
      req.get("user-agent")
    );

    res.json(updatedBroker);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete broker
router.delete("/:id", authMiddleware, (req, res) => {
  try {
    /**
     * @swagger
     * /brokers/{id}:
     *   delete:
     *     summary: Delete broker
     *     tags: [Brokers]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: Broker ID
     *     responses:
     *       200:
     *         description: Broker deleted
     *       400:
     *         description: Cannot delete broker (has transactions)
     *       404:
     *         description: Broker not found
     *       500:
     *         description: Server error
     */
    const broker = Broker.findById(req.params.id, req.user.id);
    if (!broker) {
      return res.status(404).json({ message: "Broker not found" });
    }

    const deleted = Broker.delete(req.params.id, req.user.id);

    if (!deleted) {
      return res.status(400).json({
        message: "Cannot delete broker. It may have associated transactions.",
      });
    }

    // Log broker deletion
    AuditLog.logDelete(
      req.user.id,
      req.user.username,
      "brokers",
      parseInt(req.params.id),
      {
        name: broker.name,
      },
      req.ip,
      req.get("user-agent")
    );

    res.json({ message: "Broker deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
