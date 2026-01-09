const express = require("express");
const router = express.Router();
const { VALID_VALUES } = require("../constants/validValues");
const authMiddleware = require("../middleware/auth");

/**
 * @swagger
 * /constants:
 *   get:
 *     summary: Get all valid values for dropdowns and validation
 *     tags: [Constants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All valid values
 *       500:
 *         description: Server error
 */
router.get("/", authMiddleware, (req, res) => {
  try {
    res.json(VALID_VALUES);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /constants/{category}:
 *   get:
 *     summary: Get valid values for a specific category
 *     tags: [Constants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *         description: Category name (case-insensitive)
 *     responses:
 *       200:
 *         description: Array of valid values for the category
 *       404:
 *         description: Category not found
 *       500:
 *         description: Server error
 */
router.get("/:category", authMiddleware, (req, res) => {
  try {
    const category = req.params.category.toUpperCase();

    if (!VALID_VALUES[category]) {
      return res.status(404).json({
        message: `Category '${category}' not found`,
        availableCategories: Object.keys(VALID_VALUES),
      });
    }

    // Return the array directly for easy frontend consumption
    res.json(VALID_VALUES[category]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
