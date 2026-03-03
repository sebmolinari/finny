-- Migration 001: Add destination_broker_id to transactions for transfer support
ALTER TABLE transactions ADD COLUMN destination_broker_id INTEGER REFERENCES brokers(id);
