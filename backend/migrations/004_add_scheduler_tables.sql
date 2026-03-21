-- Migration 004: Add scheduler tables for background job management

-- Schedulers table: Define what to schedule and when
CREATE TABLE IF NOT EXISTS schedulers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('email_send', 'asset_refresh')),
  frequency TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'monthly')),
  time_of_day TEXT NOT NULL, -- Format: HH:MM (e.g., '18:00', '06:00')
  enabled INTEGER NOT NULL DEFAULT 1,
  retry_count INTEGER NOT NULL DEFAULT 3,
  metadata TEXT, -- JSON for extra config (e.g., email frequency type, asset IDs)
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by INTEGER REFERENCES users(id),
  updated_at TEXT,
  UNIQUE(name)
);

-- Scheduler instances table: Track each execution for audit/debugging
CREATE TABLE IF NOT EXISTS scheduler_instances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scheduler_id INTEGER NOT NULL REFERENCES schedulers(id) ON DELETE CASCADE,
  scheduled_run_at TEXT NOT NULL, -- Timestamp when it should have run
  executed_at TEXT, -- Actual execution timestamp
  status TEXT NOT NULL CHECK(status IN ('pending', 'success', 'failed')) DEFAULT 'pending',
  attempt INTEGER NOT NULL DEFAULT 1,
  result TEXT, -- JSON with execution result details
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_schedulers_enabled ON schedulers(enabled);
CREATE INDEX IF NOT EXISTS idx_scheduler_instances_scheduler_id ON scheduler_instances(scheduler_id);
CREATE INDEX IF NOT EXISTS idx_scheduler_instances_status ON scheduler_instances(status);
