-- Migration 005: changes to user_settings
ALTER TABLE user_settings DROP COLUMN email_frequency;
ALTER TABLE user_settings ADD COLUMN onboarding_completed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_settings DROP COLUMN language;
ALTER TABLE user_settings ADD COLUMN settings_reviewed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_settings DROP COLUMN notification_polling_enabled;
ALTER TABLE user_settings DROP COLUMN notification_polling_interval;
