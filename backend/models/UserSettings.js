const db = require("../config/database");

class UserSettings {
  static create(
    userId,
    dateFormat = "YYYY-MM-DD",
    theme = "light",
    timezone = "America/Argentina/Buenos_Aires",
    language = "en",
    liquidityAssetId,
    fxRateAssetId,
    rebalancingTolerance,
    emailNotificationsEnabled,
    emailFrequency,
    validateCashBalance,
    validateSellBalance,
    createdBy = userId
  ) {
    const stmt = db.prepare(`
      INSERT INTO user_settings 
      (user_id, date_format, theme, timezone, language, liquidity_asset_id, fx_rate_asset_id, rebalancing_tolerance, email_notifications_enabled, email_frequency, validate_cash_balance, validate_sell_balance, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        date_format = ?,
        theme = ?,
        timezone = ?,
        language = ?,
        liquidity_asset_id = ?,
        fx_rate_asset_id = ?,
        rebalancing_tolerance = ?,
        email_notifications_enabled = ?,
        email_frequency = ?,
        validate_cash_balance = ?,
        validate_sell_balance = ?,
        updated_at = CURRENT_TIMESTAMP
    `);
    const result = stmt.run(
      userId,
      dateFormat,
      theme,
      timezone,
      language,
      liquidityAssetId,
      fxRateAssetId,
      rebalancingTolerance,
      emailNotificationsEnabled,
      emailFrequency,
      validateCashBalance,
      validateSellBalance,
      createdBy,
      createdBy,
      dateFormat,
      theme,
      timezone,
      language,
      liquidityAssetId,
      fxRateAssetId,
      rebalancingTolerance,
      emailNotificationsEnabled,
      emailFrequency,
      validateCashBalance,
      validateSellBalance
    );
    return result.lastInsertRowid;
  }

  static update(
    userId,
    dateFormat,
    theme,
    timezone,
    language,
    liquidityAssetId,
    fxRateAssetId,
    rebalancingTolerance,
    emailNotificationsEnabled,
    emailFrequency,
    validateCashBalance,
    validateSellBalance,
    updatedBy
  ) {
    const stmt = db.prepare(`
      UPDATE user_settings 
      SET date_format = ?, 
          theme = ?, 
          timezone = ?,
          language = ?,
          liquidity_asset_id = ?,
          fx_rate_asset_id = ?,
          rebalancing_tolerance = ?,
          email_notifications_enabled = ?,
          email_frequency = ?,
          validate_cash_balance = ?,
          validate_sell_balance = ?,
          updated_by = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `);
    const result = stmt.run(
      dateFormat,
      theme,
      timezone,
      language,
      liquidityAssetId,
      fxRateAssetId,
      rebalancingTolerance,
      emailNotificationsEnabled,
      emailFrequency,
      validateCashBalance,
      validateSellBalance,
      updatedBy,
      userId
    );
    return result.changes;
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
