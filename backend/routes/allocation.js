const express = require("express");
const router = express.Router();
const { validationResult } = require("express-validator");
const AssetAllocationTarget = require("../models/AssetAllocationTarget");
const AnalyticsService = require("../services/analytics");
const auth = require("../middleware/auth");
const {
  allocationTargetValidation,
  batchAllocationTargetsValidation,
} = require("../middleware/validators/allocationValidators");

/**
 * @swagger
 * tags:
 *   name: Allocation
 *   description: Asset allocation targets and rebalancing
 */

/**
 * @swagger
 * /allocation/targets:
 *   get:
 *     summary: Get all allocation targets for current user
 *     tags: [Allocation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of allocation targets
 *       401:
 *         description: Unauthorized
 */
router.get("/targets", auth, async (req, res) => {
  try {
    const targets = AssetAllocationTarget.getAllByUser(req.user.id);
    const validation = AssetAllocationTarget.validateTotalAllocation(
      req.user.id
    );

    res.json({
      targets,
      total_allocated: validation.total,
      remaining: validation.remaining,
      is_valid: validation.isValid,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /allocation/targets/{id}:
 *   get:
 *     summary: Get specific allocation target by ID
 *     tags: [Allocation]
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
 *         description: Allocation target details
 *       404:
 *         description: Target not found
 */
router.get("/targets/:id", auth, async (req, res) => {
  try {
    const target = AssetAllocationTarget.getById(req.params.id, req.user.id);
    if (!target) {
      return res.status(404).json({ message: "Allocation target not found" });
    }
    res.json(target);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /allocation/targets:
 *   post:
 *     summary: Create or update allocation target
 *     tags: [Allocation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               asset_type:
 *                 type: string
 *               target_percentage:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Target created/updated successfully
 *       400:
 *         description: Invalid input
 */
router.post("/targets", auth, allocationTargetValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { asset_type, asset_id, target_percentage, notes } = req.body;

    // Validate total won't exceed 100%
    const validation = AssetAllocationTarget.validateTotalAllocation(
      req.user.id,
      asset_type,
      asset_id
    );

    if (validation.total + target_percentage > 100) {
      return res.status(400).json({
        message: `Total allocation would exceed 100%. Currently allocated: ${validation.total}%, attempting to add: ${target_percentage}%`,
        current_total: validation.total,
        remaining: validation.remaining,
      });
    }

    const target = AssetAllocationTarget.upsert(
      req.user.id,
      asset_type || null,
      asset_id || null,
      target_percentage,
      notes,
      req.user.id
    );

    res.json(target);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /allocation/targets/batch:
 *   post:
 *     summary: Batch create/update multiple allocation targets
 *     tags: [Allocation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               targets:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     asset_type:
 *                       type: string
 *                     target_percentage:
 *                       type: number
 *                     notes:
 *                       type: string
 *     responses:
 *       200:
 *         description: Targets updated successfully
 *       400:
 *         description: Invalid input or total exceeds 100%
 */
router.post(
  "/targets/batch",
  auth,
  batchAllocationTargetsValidation,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { targets } = req.body;
      const result = AssetAllocationTarget.batchUpsert(
        req.user.id,
        targets,
        req.user.id
      );
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

/**
 * @swagger
 * /allocation/targets/{id}:
 *   delete:
 *     summary: Delete allocation target
 *     tags: [Allocation]
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
 *         description: Target deleted successfully
 *       404:
 *         description: Target not found
 */
router.delete("/targets/:id", auth, async (req, res) => {
  try {
    const deleted = AssetAllocationTarget.delete(req.params.id, req.user.id);
    if (!deleted) {
      return res.status(404).json({ message: "Allocation target not found" });
    }
    res.json({ message: "Allocation target deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /allocation/rebalancing:
 *   get:
 *     summary: Get rebalancing recommendations
 *     tags: [Allocation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rebalancing recommendations with current vs target allocation
 *       401:
 *         description: Unauthorized
 */
router.get("/rebalancing", auth, async (req, res) => {
  try {
    const recommendations = AnalyticsService.getRebalancingRecommendations(
      req.user.id
    );
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
