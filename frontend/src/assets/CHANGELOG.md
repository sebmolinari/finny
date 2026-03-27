All notable changes to this project are documented below.

## [1.0.3] – 2026-03-25

### Changed

- Skeleton loaders shown across pages while data is being fetched, replacing blank states for a smoother experience
- All page bundles are now loaded on demand (code splitting), reducing initial app load time
- Dashboard charts and timeline labels now consistently use the user-configured date format
- Frontend dependencies upgraded to latest compatible versions

### Fixed

- Dashboard no longer shows a blank screen on initial load; data and charts render correctly after fetch
- Pages that previously showed a blank screen when an API call failed now display an error message and a Retry button
- Navigating away from a page mid-load no longer causes stale data to flash on return — in-flight requests are cancelled automatically

---

## [1.0.2] – 2026-03-24

### Changed

- Admin Control Panel activity feeds (recent price refreshes, audit log, scheduler runs, and stale assets) now show 5 entries, keeping the overview compact

## [1.0.1] – 2026-03-24

### Fixed

- Notification badge and feed now populate immediately on page load instead of requiring a manual interaction to trigger the first fetch

### Changed

- Backend test suite introduced (Jest): unit tests for all models, services, middleware, routes and utilities

## [1.0.0] – 2026-03-22

### Added

- **Income Analytics** – new Analysis page showing all income transactions (dividends, interest, coupons and rentals); summary cards with total income broken down by type, projected annual run-rate, best-month and best-year highlights; monthly and annual aggregation views; per-asset income breakdown table; full income transaction list; filterable by calendar year
- **Missing Prices** – New admin page that identifies assets with missing price data for transaction dates; admins can fetch historical closing prices from Yahoo Finance in batches, review and edit proposed prices in a table, then apply them to the database in one click; rows not found on Yahoo are flagged for manual entry
- **Performance Attribution** – New Analysis page showing each held asset's contribution to total portfolio return over a configurable date range; waterfall bar chart ranked by contribution; data grid with beginning value, ending value, net flows and price gain columns; supports YTD, 1Y, 2Y, 3Y, 5Y, inception and custom date ranges
- **Benchmark Comparison** – Dashboard portfolio chart now supports overlaying a market index (S&P 500, NASDAQ Composite, Dow Jones, Russell 2000, MSCI World) normalized to base 100 at the first common date for a fair side-by-side return comparison; index data fetched live from Yahoo Finance
- **Sharpe Ratio** – Risk Metrics page shows an annualised Sharpe Ratio card using full-period volatility (std dev of all daily returns × √252); subtitle shows the annualised return, volatility and risk-free rate components
- **Sortino Ratio** – Risk Metrics page shows a Sortino Ratio card using downside deviation (std dev of negative daily returns only × √252) as the denominator; subtitle shows components
- **Annualised Return & Period Volatility cards** – Two additional metric cards on Risk Metrics showing the annualised return and full-period annualised volatility for the selected range
- **Asset Return Correlation Matrix** – Risk Metrics page displays a colour-coded heatmap table of Pearson correlations between all currently held assets over the selected lookback period; green = positive correlation, red = negative; tooltips with strength labels
- **Scheduler Management** – Admin-only page to create, edit, enable/disable, and delete scheduled background jobs; supports `send_report` and `asset_refresh` types with daily, weekly, or monthly frequency and configurable time of day; per-scheduler execution history with status, result, and error details
- **Getting Started** – Onboarding checklist page guiding new users through: reviewing settings, creating a broker, adding assets, recording a transaction, and setting allocation targets; admins get an extra step to configure schedulers; dismissed permanently with "I'm all set"
- **Auto-setup on Registration** – Default currency assets (USD, USDARS_BNA, USDARS_CCL) and initial user settings are created automatically when a new account is registered; USD seeded with a price of 1.0
- **WAL Flush** – Admin Overview now has a "Flush WAL" button that runs a SQLite WAL TRUNCATE checkpoint and reports pages checkpointed
- **Purge Scheduler History** – Admin Overview button to delete all scheduler execution history without affecting the schedulers themselves
- **Supabase Price Source Toggle** – `SUPABASE_ENABLED=true` env var gates the "supabase" option in price source dropdowns; hidden by default
- **System Configuration Card** – Admin Control Panel now displays a read-only table of all server environment variables (secrets masked); grouped by Server, Security, Rate Limiting, Email, and Supabase sections
- **Scheduler email warnings** – Creating, editing, or toggling a `send_report` scheduler while email is disabled now shows a warning banner explaining that no emails will be sent

### Changed

- **Admin "Overview" renamed to "Control Panel"** – The admin navigation item and page title have been updated to better reflect the page's combined monitoring and maintenance purpose
- **Settings page simplified** – Removed Theme, Language, Email Frequency, and In-App Notification Polling controls; saving settings now redirects to the dashboard
- **Notification polling removed** – Header no longer polls for drift alerts; notifications are still accessible on demand via the bell icon
- **Email scheduling moved to Schedulers** – Email frequency is now configured as a scheduler job instead of a user setting
- Registration and `/me` responses now include `onboarding_completed` flag used to show/hide the Getting Started menu item

### Fixed

- Reset All Data now correctly preserves the `USDARS_CCL` asset (was incorrectly matching `USD_ARS_CCL`)

### Removed

- Theme and Language fields removed from user settings (theme is controlled by the header toggle; language support dropped)
- Email Frequency and Notification Polling Interval removed from Settings page and API

---

## [0.2.0] – 2026-03-06

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

- Initial basic version
