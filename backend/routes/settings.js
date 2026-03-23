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
 *               timezone:
 *                 type: string
 *               email_notifications_enabled:
 *                 type: boolean
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
        timezone,
        liquidity_asset_id,
        fx_rate_asset_id,
        rebalancing_tolerance,
        email_notifications_enabled,
        validate_cash_balance,
        validate_sell_balance,
        marginal_tax_rate,
        lt_holding_period_days,
        risk_free_rate,
      } = req.body;

      const existingSettings = UserSettings.findByUserId(req.user.id);

      if (!existingSettings) {
        return res.status(404).json({ message: "Settings not found" });
      }

      // Update existing settings
      UserSettings.update(
        req.user.id,
        date_format,
        timezone,
        liquidity_asset_id,
        fx_rate_asset_id,
        rebalancing_tolerance,
        email_notifications_enabled,
        validate_cash_balance,
        validate_sell_balance,
        req.user.id,
        marginal_tax_rate,
        lt_holding_period_days,
        risk_free_rate,
      );

      // Log settings change
      AuditLog.create({
        user_id: req.user.id,
        username: req.user.username,
        action_type: "settings_change",
        table_name: "user_settings",
        record_id: existingSettings.id,
        old_values: {
          date_format: existingSettings.date_format,
          timezone: existingSettings.timezone,
          liquidity_asset_id: existingSettings.liquidity_asset_id,
          fx_rate_asset_id: existingSettings.fx_rate_asset_id,
          rebalancing_tolerance: existingSettings.rebalancing_tolerance,
          email_notifications_enabled:
            existingSettings.email_notifications_enabled,
          validate_cash_balance: existingSettings.validate_cash_balance,
          validate_sell_balance: existingSettings.validate_sell_balance,
          marginal_tax_rate: existingSettings.marginal_tax_rate,
          lt_holding_period_days: existingSettings.lt_holding_period_days,
          risk_free_rate: existingSettings.risk_free_rate,
        },
        new_values: {
          date_format: date_format,
          timezone: timezone,
          liquidity_asset_id: liquidity_asset_id,
          fx_rate_asset_id: fx_rate_asset_id,
          rebalancing_tolerance: rebalancing_tolerance,
          email_notifications_enabled: email_notifications_enabled,
          validate_cash_balance: validate_cash_balance,
          validate_sell_balance: validate_sell_balance,
          marginal_tax_rate: marginal_tax_rate,
          lt_holding_period_days: lt_holding_period_days,
          risk_free_rate: risk_free_rate,
        },
        ip_address: req.ip,
        user_agent: req.get("user-agent"),
      });

      const settings = UserSettings.findByUserId(req.user.id);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
);

router.post("/reviewed", authMiddleware, (req, res) => {
  try {
    UserSettings.markSettingsReviewed(req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/onboarding-complete", authMiddleware, (req, res) => {
  try {
    UserSettings.markOnboardingComplete(req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
