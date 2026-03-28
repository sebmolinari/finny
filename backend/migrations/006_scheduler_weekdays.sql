PRAGMA foreign_keys = OFF;

BEGIN;

CREATE TABLE schedulers_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'monthly', 'weekdays')),
  time_of_day TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  retry_count INTEGER NOT NULL DEFAULT 3,
  metadata TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by INTEGER REFERENCES users(id),
  updated_at TEXT,
  UNIQUE(name)
);

INSERT INTO schedulers_new
  SELECT id, name, type, frequency, time_of_day, enabled, retry_count,
         metadata, created_by, created_at, updated_by, updated_at
  FROM schedulers;

DROP TABLE schedulers;
ALTER TABLE schedulers_new RENAME TO schedulers;
CREATE INDEX IF NOT EXISTS idx_schedulers_enabled ON schedulers(enabled);

COMMIT;

PRAGMA foreign_keys = ON;
