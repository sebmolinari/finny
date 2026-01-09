const express = require("express");
const router = express.Router();
const UserSettings = require("../models/UserSettings");
const AuditLog = require("../models/AuditLog");
const authMiddleware = require("../middleware/auth");
const { validate } = require("../utils/validationMiddleware");
const {
  updateSettingsValidation,
} = require("../middleware/validators/settingsValidators");

/**
 * @swagger
 * /settings:
 *   get:
 *     summary: Get user settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User settings
 *       500:
 *         description: Server error
 */
router.get("/", authMiddleware, (req, res) => {
  try {
    const settings = UserSettings.findByUserId(req.user.id);

    if (!settings) {
      return res.status(404).json({ message: "Settings not found" });
    }

    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /settings:
 *   put:
 *     summary: Update user settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date_format:
 *                 type: string
 *               theme:
 *                 type: string
 *                 enum: [light, dark]
 *               timezone:
 *                 type: string
 *               language:
 *                 type: string
 *               email_notifications_enabled:
 *                 type: boolean
 *               email_frequency:
 *                 type: string
 *                 enum: [daily, weekly, monthly]
 *     responses:
 *       200:
 *         description: Updated user settings
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.put(
  "/",
  authMiddleware,
  validate(updateSettingsValidation),
  (req, res) => {
    try {
      const {
        date_format,
        theme,
        timezone,
        language,
        liquidity_asset_id,
        fx_rate_asset_id,
        rebalancing_tolerance,
        email_notifications_enabled,
        email_frequency,
        validate_cash_balance,
        validate_sell_balance,
      } = req.body;

      const existingSettings = UserSettings.findByUserId(req.user.id);

      if (!existingSettings) {
        return res.status(404).json({ message: "Settings not found" });
      }

      // Update existing settings
      UserSettings.update(
        req.user.id,
        date_format,
        theme,
        timezone,
        language,
        liquidity_asset_id,
        fx_rate_asset_id,
        rebalancing_tolerance,
        email_notifications_enabled,
        email_frequency,
        validate_cash_balance,
        validate_sell_balance,
        req.user.id
      );

      // Log settings change
      AuditLog.create({
        user_id: req.user.id,
        username: req.user.username,
        action_type: "settings_change",
        table_name: "user_settings",
        record_id: existingSettings.id,
        old_values: {
          theme: existingSettings.theme,
          date_format: existingSettings.date_format,
          timezone: existingSettings.timezone,
          language: existingSettings.language,
          liquidity_asset_id: existingSettings.liquidity_asset_id,
          fx_rate_asset_id: existingSettings.fx_rate_asset_id,
          rebalancing_tolerance: existingSettings.rebalancing_tolerance,
          email_notifications_enabled:
            existingSettings.email_notifications_enabled,
          email_frequency: existingSettings.email_frequency,
          validate_cash_balance: existingSettings.validate_cash_balance,
          validate_sell_balance: existingSettings.validate_sell_balance,
        },
        new_values: {
          theme: theme,
          date_format: date_format,
          timezone: timezone,
          language: language,
          liquidity_asset_id: liquidity_asset_id,
          fx_rate_asset_id: fx_rate_asset_id,
          rebalancing_tolerance: rebalancing_tolerance,
          email_notifications_enabled: email_notifications_enabled,
          email_frequency: email_frequency,
          validate_cash_balance: validate_cash_balance,
          validate_sell_balance: validate_sell_balance,
        },
      });

      const settings = UserSettings.findByUserId(req.user.id);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

module.exports = router;
