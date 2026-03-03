# Finny — Feature Ideas & Enhancement Backlog

> Last updated: March 2, 2026  
> This document captures potential features and enhancements organized by domain. Items are not yet prioritized or committed.

---

## Table of Contents

1. [Analytics & Performance](#1-analytics--performance)
2. [Portfolio & Holdings](#2-portfolio--holdings)
3. [Transactions & Blotter](#3-transactions--blotter)
4. [Asset & Price Management](#4-asset--price-management)
5. [Asset Allocation & Rebalancing](#5-asset-allocation--rebalancing)
6. [Tax Reporting](#6-tax-reporting)
7. [Market Trends & Research](#7-market-trends--research)
8. [Notifications & Alerts](#8-notifications--alerts)
9. [Settings & Personalization](#9-settings--personalization)
10. [Admin & Operations](#10-admin--operations)
11. [Import / Export & Integrations](#11-import--export--integrations)
12. [UI / UX Improvements](#12-ui--ux-improvements)
13. [Infrastructure & Developer Experience](#13-infrastructure--developer-experience)

---

## 1. Analytics & Performance

### 1.1 Benchmark Comparison

- Allow users to select one or more benchmark assets (e.g., SPY, BTC) and overlay their performance on the Portfolio Value Chart.
- Show relative return vs. benchmark over any selected period (alpha).
- Add an "excess return" stat card on the dashboard (portfolio MWRR minus benchmark return).

### 1.2 Sharpe & Sortino Ratios

- Compute risk-adjusted returns using daily NAV history.
- Configurable risk-free rate (stored in settings or derived from a short-term bond asset).
- Display alongside MWRR/CAGR on the dashboard and Return Details page.

### 1.3 Volatility & Drawdown Metrics

- Rolling annualized volatility (standard deviation of daily returns) chart.
- Maximum drawdown: the largest peak-to-trough decline in NAV, with start/end dates.
- Recovery time metric (days to recover from max drawdown).

### 1.4 Custom Date-Range Performance

- Let users pick an arbitrary start/end date on the dashboard and recompute MWRR, CAGR, and NAV change for that window.
- "Year-to-date", "Since inception", "Last 12 months" quick-select buttons.

### 1.5 Per-Asset & Per-Broker Attribution

- MWRR / unrealized P&L broken down per individual asset and per broker.
- "Best" and "worst" performers widget on the dashboard (by % and by absolute gain).

### 1.6 Dividend & Income Analytics

- Dedicated "Income" tab or page aggregating all dividend, interest, coupon, and rental income.
- Time-series chart of monthly/annual income.
- Yield on cost and current yield for income-producing assets.
- "Projected annual income" estimate based on current holdings and historical income rates.

### 1.7 Correlation Matrix

- Compute pairwise price correlations between held assets over a rolling window (e.g., 90 days).
- Heatmap visualization to help users understand diversification.

---

## 2. Portfolio & Holdings

### 2.1 Snapshot / Historical Holdings View

- Show holdings as of any past date (not just today), by replaying transactions up to that point.
- Useful for reconciliation, tax purposes, and comparing past vs. current composition.

### 2.2 Additional Cost Basis Methods

- Holdings already use **FIFO** (First In, First Out) cost basis via integer-arithmetic lot tracking in `Transaction.getPortfolioHoldings`.
- Extend support for alternative methods:
  - **LIFO** (Last In, First Out)
  - **Specific lot** identification — user manually selects which lot(s) to consume on a sell
  - **Average cost** — simple weighted average as a fallback option
- The active method could be a per-user setting.

### 2.3 Lot Tracking UI

- The FIFO lot queue is already maintained internally; expose it to the user.
- The blotter and holdings views could show the individual open lots per asset (acquisition date, quantity, price).
- Required to support specific-lot selection and short/long-term capital gain classification in tax reports.

### 2.4 Multi-Currency Portfolio View

- Display totals both in a "base currency" (configurable) and in each asset's native currency.
- FX gain/loss column in holdings — distinguish operational P&L from currency effect.

### 2.5 Watchlist

- A list of assets not currently held that the user wants to monitor.
- Show current price, 30-day change, and a sparkline alongside held assets.
- Quick action to create a new buy transaction from the watchlist.

---

## 3. Transactions & Blotter

### 3.1 Recurring Transactions

- Define a recurring transaction template (e.g., monthly dividend from a bond, weekly DCA buy).
- Backend cron generates pending transactions on schedule; user reviews and confirms or auto-books.

### 3.2 Transaction Tags / Categories

- Free-form tags or a category field on each transaction (e.g., "DCA", "rebalancing", "tax-loss harvest").
- Filter blotter and analytics by tag.

### 3.3 Split & Merger Events

- Support stock splits (e.g., 10:1) and reverse splits.
- Automatically adjust all historical quantities and prices for affected transactions on confirmation.

### 3.4 Transfer Between Brokers

- A "transfer" transaction type that moves quantity from one broker to another without a P&L event.
- Validates that the source broker has sufficient holdings.

### 3.5 Transaction Attachments / Notes Enhancements

- Allow attaching a file (e.g., broker confirmation PDF) or a URL reference to a transaction.
- Rich-text notes field instead of plain text.

### 3.6 Duplicate Detection on Bulk Import

- When importing CSV, detect probable duplicates (same asset + broker + date + type + quantity) and warn before insertion.
- "Skip duplicates" toggle in the import dialog.

### 3.7 Broker-Specific CSV Import Templates

- Pre-configured column mappings for common broker CSV export formats (e.g., Interactive Brokers, Fidelity, Schwab).
- Users can also save their own custom column mapping.

---

## 4. Asset & Price Management

### 4.1 Additional Price Sources

- **Alpha Vantage** — equities, forex, crypto with a free API key.
- **Open Exchange Rates** — comprehensive FX rates.
- **Polygon.io** — equities and options data.
- **Manual webhook** — allow posting prices from any external source via a secured POST endpoint.

### 4.2 Price Alerts

- Define upper/lower price thresholds per asset.
- Send an in-app notification (and optionally email) when a price crosses that threshold.
- Store alert history in the audit log.

### 4.3 Asset Metadata Enrichment

- Store additional fields: ISIN, CUSIP, exchange, sector, industry, issuer, country, dividend frequency.
- Display a "fact sheet" panel for each asset.

### 4.4 Automated Daily Price Refresh

- Add a `node-cron` job (similar to the email scheduler) that runs `refresh-all` prices once per day at a configurable time.
- Expose the schedule setting in the admin settings panel.

### 4.5 Price Data Gap Detection

- Detect and surface assets whose price history has gaps (e.g., missing weekdays for equities).
- Admin page or audit report listing stale assets (no price update in N days).

### 4.6 Asset Groups / Sectors

- Allow admin to define custom groups (e.g., "Tech", "Emerging Markets", "ESG").
- Assets can belong to multiple groups.
- Filter holdings, charts, and allocation by group.

---

## 5. Asset Allocation & Rebalancing

### 5.1 Rebalancing Simulation

- "What if I invest $X?" mode: given a new deposit amount, calculate the optimal split across assets to move closer to target allocations without selling.
- Show resulting allocation vs. target after simulated buys.

### 5.2 Rebalancing History

- Track each time the user saves targets or acts on rebalancing recommendations.
- Show drift over time as a chart (actual allocation vs. target allocation per period).

### 5.3 Allocation by Custom Groups / Sectors

- In addition to the existing asset-type allocation, allow targets defined on custom asset groups (see §4.6).
- Third level in the hierarchy: type → group → asset.

### 5.4 Allocation Export to PDF

- Generate a printable one-page allocation report (charts + rebalancing table) as a PDF.

---

## 6. Tax Reporting

### 6.3 Form Support (CSV Export Formats)

- Export transaction history in IRS Form 8949 format or a configurable template matching local tax authority requirements.
- Country/jurisdiction selector in settings to pick the correct template.

### 6.5 Multi-Year Tax Summary

- Aggregate realized gains/losses and income by tax year across all available history.
- Summary table: year, realized ST gain, realized LT gain, dividends/interest, total taxable income estimate.

---

## 7. Market Trends & Research

### 7.2 Economic Calendar

- Show upcoming dividend ex-dates, earnings dates, and macro events for held assets.
- Source: Yahoo Finance earnings calendar or Alpha Vantage.

### 7.4 Configurable Trend Periods

- Currently 30-day and YTD. Add user-configurable periods (7d, 90d, 1y, 5y) on the Market Trends page.
- Save the selected period preference per user.

---

## 8. Notifications & Alerts

### 8.2 Push Notifications (PWA)

- Register the frontend as a Progressive Web App with a service worker.
- Send browser push notifications for price alerts and scheduled events without requiring the app to be open.

### 8.3 Slack / Discord / Webhook Alerts

- Allow users to configure a webhook URL (e.g., Slack incoming webhook).
- Send portfolio summary and/or price alerts to that channel.

### 8.5 Email Enhancements

- Configurable email template (color scheme, sections to include/exclude).
- HTML preview of the email in the Settings page before sending.
- Scheduled send time of day preference (currently sends at cron default).

---

## 9. Settings & Personalization

### 9.1 Additional Timezones

- The timezone list currently has only two values (UTC and America/Argentina/Buenos_Aires).
- Load the full IANA timezone list (or a curated top-50) and store the user's selection.

### 9.2 Additional Languages (i18n)

- The language setting exists but only English and Spanish are supported.
- Build out a proper i18n framework (e.g., `react-i18next`) so additional translations can be contributed.

### 9.3 Dashboard Widget Customization

- Let users choose which stat cards and charts appear on the dashboard and in what order (drag-and-drop grid).
- Persist layout per user in `user_settings`.

### 9.4 Custom Portfolio Currency

- A "base currency" setting (distinct from the FX rate asset) that all monetary values are displayed in.
- All pages convert values to the base currency using the stored FX rate.

### 9.5 Per-User Default Filters

- Remember the last-used filters on Blotter, Holdings, and Market Trends (asset type, broker, date range) as user preferences.

### 9.6 Two-Factor Authentication (2FA)

- TOTP-based 2FA (e.g., Google Authenticator) during login.
- Backup codes generated on 2FA enrollment.
- Admin can enforce 2FA for all users.

### 9.7 API Key Management

- Allow power users to generate personal API tokens for programmatic access (e.g., scripts, HomeAssistant).
- Key scopes: read-only vs. read-write.
- Managed from the Profile page; audit-logged on creation and revocation.

---

## 10. Admin & Operations

### 10.1 Data Backup & Restore UI

- Trigger a database backup from the admin UI (today `restore.js` is a CLI script).
- Schedule automatic backups (daily, weekly) and retain the last N copies.
- Download backup file directly from the UI.

### 10.2 Configurable Price Refresh Schedule

- Admin panel input for the cron expression that drives daily price refresh (see §4.4).
- Toggle the scheduler on/off without restarting the server.

### 10.3 Admin Dashboard / System Overview

- Aggregate stats for admins: number of users, total transactions across all users, last price refresh time, scheduler health.
- Surface errors from the last price refresh run (which assets failed and why).

### 10.4 Rate Limiting & Abuse Protection

- Apply per-IP and per-user rate limiting on sensitive endpoints (login, register, price refresh).
- Return `429 Too Many Requests` with a `Retry-After` header.

### 10.5 Audit Log Retention Policy

- Admin configurable: auto-purge audit logs older than N days.
- Archival option: export old audit logs to CSV before purge.

### 10.6 Soft Delete for Transactions and Brokers

- Instead of hard delete, mark records as `deleted = true` and filter them out by default.
- Admins can view and restore soft-deleted records for a grace period.

---

## 11. Import / Export & Integrations

### 11.1 Full Portfolio Export

- Export the entire portfolio (all transactions, current holdings, price history, allocation targets) to a structured JSON or ZIP file.
- Complements the existing SQLite `restore.js` script with a user-friendly UI.

### 11.2 Open Finance / OFX Import

- Parse OFX/QFX files exported by many brokers and banks.
- Map OFX transaction types to Finny transaction types.

### 11.3 PDF Report Generation

- On-demand PDF reports for: current holdings, return details, cash flow ledger, tax summary.
- Use a library such as `pdfkit` or `puppeteer` server-side, or `jsPDF` client-side.

### 11.4 REST API Documentation (Swagger UI)

- Swagger is already configured (`config/swagger.js`). Audit all routes and ensure every endpoint has a complete OpenAPI spec (parameters, request body, response schemas, error codes).
- Expose the Swagger UI at `/api-docs` (or link from the admin panel).

### 11.5 HomeAssistant / Grafana Integration

- Provide a `/metrics` endpoint in Prometheus exposition format (or a compatible JSON format) for NAV, daily P&L, and MWRR.
- Enables dashboarding in Grafana or HomeAssistant without a custom integration.

---

## 12. UI / UX Improvements

### 12.1 Mobile-Responsive Layout

- Audit and improve responsiveness on narrow screens (phones/tablets).
- Consider a bottom navigation bar on mobile as an alternative to the sidebar.

### 12.2 Keyboard Shortcuts

- Global shortcuts: open search (Cmd/Ctrl+K), go to dashboard, go to blotter.
- Within data grids: quick inline edit activation, row navigation.

### 12.3 Global Search

- A command-palette style search (Cmd/Ctrl+K) to quickly navigate to any asset, broker, transaction ID, or page.

### 12.4 Onboarding / Empty State Wizards

- First-time setup wizard: create first broker → add assets → import transactions → set allocation targets.
- Friendly empty-state illustrations instead of blank tables.

### 12.6 Inline Editing in Data Grids

- Enable MUI X DataGrid inline row editing for quick quantity or price corrections in the blotter and price history tables.

### 12.7 Persistent Column Customization

- Remember which DataGrid columns are hidden/visible and their sort order per user per table.
- Store preferences in `user_settings` or `localStorage`.

### 12.8 Dark/Light Mode Transition Animation

- Smooth animated transition when toggling between dark and light themes instead of an instant swap.

### 12.9 Accessibility (a11y) Audit

- Ensure all interactive elements have proper ARIA roles, labels, and keyboard focus management.
- Target WCAG 2.1 AA compliance.

---

## 13. Infrastructure & Developer Experience

### 13.1 Automated Testing

- Unit tests for the analytics service (MWRR/CAGR calculations, cash-flow logic).
- Integration tests for critical API routes (transactions CRUD, portfolio analytics endpoint).
- Frontend component tests with React Testing Library.

### 13.2 Docker Compose Setup

- A `docker-compose.yml` that starts the backend and serves the built frontend.
- Include a volume mapping for the SQLite database file.
- Document the Docker-based deployment path in `README.md`.

### 13.3 Environment-Based Configuration UI

- A `.env` validation step on startup that errors clearly if required variables are missing.
- Document every environment variable with type, default, and example in a `.env.example` file.

### 13.4 CI/CD Pipeline

- GitHub Actions workflow: lint → test → build → Docker image push on merge to `main`.
- Automated changelog generation from conventional commits.

### 13.5 Structured Logging

- Replace `console.log`/`console.error` with a structured logger (e.g., `winston` or `pino`) that outputs JSON in production and pretty-prints in development.
- Log correlation IDs per request for easier tracing.

### 13.6 Health Check Endpoint

- `GET /health` returns `{ status: "ok", db: "ok", uptime: N }` — useful for Docker health checks and uptime monitors.

### 13.7 Database Connection Pooling / WAL Mode

- Enable SQLite WAL (Write-Ahead Logging) mode for improved concurrent read performance.
- Document the trade-offs for deployments with multiple Node processes.

### 13.8 Frontend Bundle Optimization

- Analyze and code-split large pages (AssetAllocation at 1367 lines is a candidate).
- Lazy-load route components to reduce initial bundle size.

---

_Ideas should be moved to the project's issue tracker when ready for implementation._
