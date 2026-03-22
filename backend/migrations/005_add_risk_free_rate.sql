-- Migration 005: Add risk_free_rate to user_settings for Sharpe/Sortino ratio calculations
ALTER TABLE user_settings ADD COLUMN risk_free_rate NUMERIC(5,2) DEFAULT 0.05;
