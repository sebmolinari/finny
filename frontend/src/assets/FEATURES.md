Finny is a finance management app for tracking investments across multiple brokers, with analytics, tax reporting, and automated background jobs.

---

## 🚀 Getting Started

- Onboarding checklist for new users: review settings, create a broker, add assets, record a transaction, and set allocation targets
- Visible in the sidebar until dismissed with "I'm all set"
- Progress tracked automatically — each step marks itself complete as you go
- Default assets (USD, USDARS_BNA, USDARS_CCL) and user settings created automatically on registration

## 📊 Dashboard

- Unified portfolio net worth (NAV) at a glance
- Portfolio performance chart (value over time) with optional **benchmark overlay** — compare against S&P 500, NASDAQ Composite, Dow Jones, Russell 2000 or MSCI World, normalized to base 100 at the first common date
- MTM evolution bar chart (year-by-year mark-to-market)
- Asset allocation pie chart and market value by broker
- Top holdings with sparklines
- Cash balance, daily P&L, unrealized gain/loss, MWRR and CAGR summary cards

## 💼 Holdings

- Full list of current positions with quantity, cost basis, market value and unrealized P&L
- **Historical snapshot**: toggle to any past date to replay portfolio holdings as of that point
- As-of-date market value, cost basis and unrealized P&L per position; useful for reconciliation and tax purposes

## 📋 Transactions

- Full transaction blotter with filtering, sorting and CSV export
- Supported types: buy, sell, dividend, interest, coupon, rental, deposit and withdrawal
- Broker attribution on every transaction
- Cash flow management (deposits/withdrawals) per broker
- Support for Crypto, Currency, Equity, Fixed Income and Real Estate

## 📥 Data Import / Export

- CSV bulk import for transactions with broker support
- Transaction export to CSV via the table toolbar
- Flexible import template with optional fields
- Error reporting and validation on import

## 🏦 Assets & Prices

- Asset catalog with configurable price sources per asset: CoinGecko, Yahoo Finance, DolarAPI, Supabase or Manual
- Optional price symbol override and price factor for unit conversions
- Historical price data with daily snapshots; edit or delete individual data points
- Automatic portfolio valuation based on latest prices

## 🏢 Brokers

- Create and manage brokers
- Portfolio exposure and cash balance tracked per broker
- Transactions and holdings scoped to each broker

## 🎯 Asset Allocation & Rebalancing

- **Hierarchical targets**: set strategic allocation at asset-type level (e.g. Equity 80%) and tactical at asset level (e.g. AAPL 60% of equity)
- Real-time BUY / SELL / HOLD recommendations with amount-based guidance
- Portfolio drift analysis with balance scoring
- **Asset type filter**: scope the rebalancing view to a subset of asset types
- **Rebalancing Simulation**: enter a deposit amount and see how it should be split across underweight types — shows allocated amount, projected value and projected allocation %
- Configurable tolerance threshold (percentage) in Settings

## 📈 Portfolio Performance Analytics

- Money-Weighted Rate of Return (MWRR/IRR) calculation
- Compound Annual Growth Rate (CAGR) tracking
- Automatic cost basis calculation
- Real-time valuation with current market prices
- Daily P&L and unrealized P&L with percentage calculations
- Net Asset Value (NAV) including cash

## 📐 Return Details

- Full MWRR/IRR cash flow history and Newton-Raphson iteration log
- CAGR details: start date, years elapsed, net deposits and ending value
- Year-by-year CAGR evolution showing MTM and CAGR for each calendar year

## 💵 Cash Balance

- Complete cash flow ledger: all deposits, withdrawals, buys, sells and income transactions
- Per-transaction cash effect and running balance
- Summary totals: net inflow, net trading activity and current balance

## 💰 Income Analytics

- Dedicated view for all income transactions: dividends, interest, coupons and rentals
- Summary cards: total income, per-type totals, projected annual run-rate, best month and best year
- Monthly and annual aggregation views
- Per-asset income breakdown showing each asset's contribution
- Filter by calendar year or rolling period (Last 1Y, Last 3Y, Last 5Y)

## 📊 Performance Attribution

- Shows each held asset's contribution to total portfolio return over a configurable date range
- Waterfall bar chart ranked from top contributors to largest detractors
- Data grid with beginning value, ending value, net flows (buys minus sells), price gain and contribution % columns
- Supports YTD, 1Y, 2Y, 3Y, 5Y, inception and custom date ranges

## 📉 Risk Metrics

- Rolling annualized volatility chart (σ × √252)
- Maximum drawdown: largest peak-to-trough NAV decline with start/end dates, peak and trough values
- Recovery time metric (days from trough back to prior peak)
- Running drawdown chart over time
- **Annualised Return** and **Period Volatility** (full-period, annualised) metric cards
- **Sharpe Ratio** — (annualised return − risk-free rate) / annualised volatility; colour-coded and shows components in subtitle
- **Sortino Ratio** — same as Sharpe but uses downside deviation as the denominator, penalising only negative returns
- **Asset Return Correlation Matrix** — colour-coded heatmap of Pearson correlations between all currently held assets; tooltips with plain-language strength labels
- Configurable lookback period (1Y, 2Y, 3Y, 5Y, All, or custom date range)

## 📊 Market Trends

- Price trend view for all active assets in the portfolio
- 30-day and YTD sparkline charts side-by-side
- Price change percentage for both periods; current price and last update date per asset

## 📅 Economic Calendar

- Upcoming earnings dates, dividend ex-dates and payment dates for held assets
- Color-coded chips for event type (Earnings, Ex-Dividend, Dividend Payment)
- Past events dimmed; upcoming event count shown as a summary badge

## 🧾 Tax Report

- **Year-End Holdings** — snapshot of all positions at year-end with quantity, cost basis, market price, market value and FX rate; filter by asset type and/or broker
- **Realized Gains/Losses** — FIFO-based closed-position report with short-term vs. long-term classification; wash sale flags shown inline
- **Tax-Loss Harvesting** — positions with unrealized losses ranked by estimated tax saving, using the marginal tax rate from Settings

## 📧 Email Reports

- Automated portfolio summary emails on a configurable schedule (daily, weekly, monthly)
- Manual on-demand Send Report from the user menu
- HTML email with portfolio metrics, holdings breakdown and allocation charts

## 🔔 Notifications

- Bell icon in the header with live unread-count badge
- Notification feed with mark-as-read and mark-all-read actions

## ⚙️ Settings

- Theme selection (light/dark) via header toggle
- Date format preferences (YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY)
- Timezone configuration
- Liquidity asset and FX rate asset selection
- Rebalancing tolerance threshold
- Marginal tax rate and long-term holding period threshold for tax calculations
- Risk-free rate (%) for Sharpe and Sortino ratio calculations (default 5%)
- Cash balance and sell balance validation toggles
- Email notification toggle
- User profile management

## 🔐 Security

- Role-based access control (User, Admin)
- Audit logging for all actions: login, logout, create, update, delete, import, export, email
- Admin-only user management: enable/disable accounts and change roles
- Confirmation phrase dialogs for destructive actions (delete asset, broker, transaction, user)

---

## Admin

### 🖥️ Control Panel

- Platform stats: total users, active/inactive breakdown, total transactions, active assets and brokers
- Recent price refresh activity log with success/failure status
- Purge all notifications or scheduler history in one click
- WAL Flush to checkpoint the SQLite write-ahead log
- **System Configuration** — read-only table of all server environment variables (secrets masked) grouped by Server, Security, Rate Limiting, Email, and Supabase

### 🔍 Missing Prices

- Identifies assets with transactions on dates that have no price data
- Batch-fetch historical closing prices from Yahoo Finance with a progress bar
- Review and edit proposed prices before applying; manual entry for gaps Yahoo Finance could not fill

### ⏱️ Schedulers

- Create, edit, enable/disable and delete scheduled background jobs
- Supported job types: `send_report` (portfolio emails) and `asset_refresh` (price updates)
- Configurable frequency (daily, weekly, monthly) and time of day
- Per-scheduler execution history with status, result, error message and timestamps
- Warning banner shown when email is disabled but `send_report` schedulers are active

### 📡 Host Metrics

- Real-time server monitoring: CPU load (1/5/15 min), memory, disk space, uptime
- CPU temperature (Linux/Raspberry Pi)
- Platform, architecture and hostname details
