const db = require("../config/database");

class UserSettings {
  static create(
    userId,
    dateFormat = "DD/MM/YYYY",
    timezone = "America/Argentina/Buenos_Aires",
    liquidityAssetId,
    fxRateAssetId,
    rebalancingTolerance,
    emailNotificationsEnabled,
    validateCashBalance,
    validateSellBalance,
    createdBy = userId,
    marginalTaxRate = 0.25,
    ltHoldingPeriodDays = 365,
    riskFreeRate = 0.05,
  ) {
    const stmt = db.prepare(`
      INSERT INTO user_settings
      (user_id, date_format, timezone, liquidity_asset_id, fx_rate_asset_id, rebalancing_tolerance, email_notifications_enabled, validate_cash_balance, validate_sell_balance, created_by, updated_by, marginal_tax_rate, lt_holding_period_days, risk_free_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        date_format = ?,
        timezone = ?,
        liquidity_asset_id = ?,
        fx_rate_asset_id = ?,
        rebalancing_tolerance = ?,
        email_notifications_enabled = ?,
        validate_cash_balance = ?,
        validate_sell_balance = ?,
        marginal_tax_rate = ?,
        lt_holding_period_days = ?,
        risk_free_rate = ?,
        updated_at = CURRENT_TIMESTAMP
    `);
    const result = stmt.run(
      userId,
      dateFormat,
      timezone,
      liquidityAssetId,
      fxRateAssetId,
      rebalancingTolerance,
      emailNotificationsEnabled,
      validateCashBalance,
      validateSellBalance,
      createdBy,
      createdBy,
      marginalTaxRate,
      ltHoldingPeriodDays,
      riskFreeRate,
      dateFormat,
      timezone,
      liquidityAssetId,
      fxRateAssetId,
      rebalancingTolerance,
      emailNotificationsEnabled,
      validateCashBalance,
      validateSellBalance,
      marginalTaxRate,
      ltHoldingPeriodDays,
      riskFreeRate,
    );
    return result.lastInsertRowid;
  }

  static update(
    userId,
    dateFormat,
    timezone,
    liquidityAssetId,
    fxRateAssetId,
    rebalancingTolerance,
    emailNotificationsEnabled,
    validateCashBalance,
    validateSellBalance,
    updatedBy,
    marginalTaxRate,
    ltHoldingPeriodDays,
    riskFreeRate,
  ) {
    const stmt = db.prepare(`
      UPDATE user_settings
      SET date_format = ?,
          timezone = ?,
          liquidity_asset_id = ?,
          fx_rate_asset_id = ?,
          rebalancing_tolerance = ?,
          email_notifications_enabled = ?,
          validate_cash_balance = ?,
          validate_sell_balance = ?,
          marginal_tax_rate = ?,
          lt_holding_period_days = ?,
          risk_free_rate = ?,
          updated_by = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `);
    const result = stmt.run(
      dateFormat,
      timezone,
      liquidityAssetId,
      fxRateAssetId,
      rebalancingTolerance,
      emailNotificationsEnabled,
      validateCashBalance,
      validateSellBalance,
      marginalTaxRate,
      ltHoldingPeriodDays,
      riskFreeRate,
      updatedBy,
      userId,
    );
    return result.changes;
  }

  static markSettingsReviewed(userId) {
    const stmt = db.prepare(
      "UPDATE user_settings SET settings_reviewed = 1 WHERE user_id = ?",
    );
    return stmt.run(userId);
  }

  static markOnboardingComplete(userId) {
    const stmt = db.prepare(
      "UPDATE user_settings SET onboarding_completed = 1 WHERE user_id = ?",
    );
    return stmt.run(userId);
  }

  static deleteByUserId(userId) {
    const stmt = db.prepare("DELETE FROM user_settings WHERE user_id = ?");
    return stmt.run(userId);
  }

  static findByUserId(userId) {
    const stmt = db.prepare("SELECT * FROM user_settings WHERE user_id = ?");
    return stmt.get(userId);
  }
}

module.exports = UserSettings;
