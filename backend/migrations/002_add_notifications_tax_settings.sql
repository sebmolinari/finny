-- Add notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  metadata TEXT
);

-- Add tax-related settings to user_settings
ALTER TABLE user_settings ADD COLUMN marginal_tax_rate NUMERIC(5,2) DEFAULT 0.25;
ALTER TABLE user_settings ADD COLUMN lt_holding_period_days INTEGER DEFAULT 365;
ALTER TABLE user_settings ADD COLUMN notification_polling_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE user_settings ADD COLUMN notification_polling_interval INTEGER NOT NULL DEFAULT 3600;
