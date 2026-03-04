# Changelog

All notable changes to this project are documented below.

## [1.0.0] – 2026-03-06

### Added

- **New Look & Feel** - Redesig UI for better user experience
- **Tax Reporting** – Tax Report page rebuilt with four tabs: Year-End Holdings, Realized Gains/Losses (FIFO, short-term vs. long-term classification), Tax-Loss Harvesting Suggestions, and Wash Sale Detection (30-day window)
- **Tax Settings** – New Settings fields for marginal tax rate and long-term holding period (used by harvesting estimates)
- **Sector Heatmap** – Asset-class performance heatmap on the Market Trends page (color-coded by 30-day average return)
- **In-App Notification Center** – Bell icon in the header with unread badge, notification feed, mark-as-read and mark-all-read actions; polls every 60 seconds
- **Drift Alerts** – Automatic in-app notifications when any asset class drifts beyond the configured rebalancing tolerance
- **Confirmation Dialogs** – Destructive actions (delete asset, delete broker, delete transaction, delete user) now require typing a confirmation phrase before proceeding
- **Rebalancing Simulation** – New Simulation tab on the Asset Allocation page: enter a deposit amount and see exactly how it should be split across underweight asset types to move toward targets, with current %, allocated amount, projected value and projected % columns
- **Asset Type Filter in Allocation** – Rebalancing and simulation views can be scoped to a subset of asset types, allowing partial-portfolio analysis
- **Risk Metrics** – New page with rolling annualized volatility chart (30-day rolling overlay on NAV), maximum drawdown with start/end dates and peak/trough values, recovery time metric, and running drawdown chart; configurable lookback period (1Y, 2Y, 3Y, All, or custom range)
- **Historical Holdings** – Toggle on the Holdings page to view portfolio positions as of any past date by replaying transactions up to that point; shows as-of-date market value, cost basis and unrealized P&L with summary totals
- **Economic Calendar** – New page showing upcoming earnings dates, dividend ex-dates and dividend payment dates for held assets, sourced from Yahoo Finance; color-coded event chips and past-event dimming
- **Admin System Overview** – New admin-only page with aggregate platform stats (users, transactions, assets, brokers), last price data date, recent price refresh activity log, and per-asset error surfacing from failed refresh runs
- **Mobile-Responsive Layout** – Bottom navigation bar on mobile for quick access to key pages; slide-out hamburger drawer with full navigation menu on narrow screens

### Changed

- Notification center pings the drift-alerts endpoint on each poll cycle to keep alerts current

## [0.1.0] – 2026-01-23

### Added

- Migrate table-based UIs to MUI DataGrid

## [0.0.4] – 2026-01-17

### Added

- Dashboard charts refactored into reusable components (Portfolio Value, Asset Allocation, Market Value by Broker)
- Market Trends: Improved mini line chart sensitivity to show small price changes
- Add MTM Evolution chart to Dashboard
- Refactored email service and portfolio summary email generation for improved reliability and formatting
- Add explicit "Apply" filter button to Blotter and prevent auto-submission when changing dates

### Changed

- Minor UI/UX improvements to filter and chart displays

## [0.0.3] – 2026-01-15

### Added

- Support for Real Estate as an asset type
- Changelog page for tracking product updates

### Fixed

- Issues with email generation
- Various minor bugs related to asset allocation and transaction validation
- Refactor Transaction validations into a single function
- Rebalance drift change from average to intensity calculation
- Minor fix on Dashboard MUI Tooltip component

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
