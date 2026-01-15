# Changelog

All notable changes to this project are documented below.

## [0.0.3] – 2026-01-14

### Added

- Support for Real Estate as an asset type
- Changelog page for tracking product updates

### Fixed

- Issues with email generation
- Various minor bugs related to asset allocation and transaction validation

---

## [0.0.2] – 2026-01-09

### Added

- Multi-broker portfolio management (Crypto, Currency, Equity, Fixed Income)
- Comprehensive transaction tracking, including:
  - Buy, sell, dividend, interest, coupon, rental, deposit, and withdrawal
- Advanced portfolio analytics:
  - MWRR / IRR, CAGR, cost basis, real-time valuation, and P&L tracking
- Asset allocation and rebalancing system
- Automated portfolio summary emails (manual and scheduled)
- Asset catalog with historical price management
- CSV bulk import/export for transactions
- Unified analytics dashboard:
  - Net worth, performance, allocation, and top holdings
- User settings:
  - Theme, date format, timezone, language, and email notifications
- Role-based access control (User, Admin) with JWT authentication and protected routes
- Encrypt database
- Error boundaries and toast notifications
- Backend infrastructure:
  - Node.js / Express, SQLite, high-precision arithmetic
  - Swagger API documentation, Nodemailer, Node-cron, Express-validator

### Changed

- Fixed Health API exposure and improved holdings sorting (descending order)
- Exported transactions in reverse chronological order for improved CSV usability

---

## [0.0.1] – 2025-12-15

### Added

- Initial commit
