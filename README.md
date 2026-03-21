# Finny

A professional-grade finance management application designed to help you track transactions across multiple brokers, manage assets, and analyze portfolio performance.

## Features

### 📈 Multi-Broker Portfolio Management

- Track transactions across multiple brokers
- Support for Crypto, Currency, Equity, Fixed Income and Real Estate
- Record buy/sell/dividend/interest/coupon/rental transactions with broker attribution
- Cash flow management (deposits/withdrawals) per broker
- Monitor portfolio exposure by broker

### 🎯 Portfolio Performance Analytics

- Money-Weighted Rate of Return (MWRR/IRR) calculation
- Compound Annual Growth Rate (CAGR) tracking
- Automatic cost basis calculation
- Real-time portfolio valuation with current market prices
- Daily P&L tracking with color-coded indicators
- Unrealized P&L tracking with percentage calculations
- Liquidity metrics and total cash balance
- Asset allocation visualization by holding and broker
- Net Asset Value (NAV) — total portfolio value including cash
- Mark-to-Market (MTM) evolution chart over time

### 📐 Return Details

- Transparent MWRR/IRR calculation with full cash flow history
- Newton-Raphson iteration log (rate and NPV per step)
- CAGR details: start date, years elapsed, net deposits and ending value
- Year-by-year CAGR evolution showing MTM and CAGR for each calendar year

### 💵 Cash Balance Details

- Complete cash flow ledger: deposits, withdrawals, buys, sells, dividends, interest, coupons and rentals
- Per-transaction cash effect and running balance
- Summary totals: net inflow, net trading activity and current balance

### 📉 Risk Metrics

- Rolling annualized volatility chart (standard deviation of daily returns, annualized to σ × √252)
- 30-day rolling volatility overlay on NAV chart
- Maximum drawdown: largest peak-to-trough NAV decline with start/end dates, peak and trough values
- Recovery time metric (days from trough back to prior peak)
- Running drawdown chart showing the decline from the rolling peak over time
- Configurable lookback period (1Y, 2Y, 3Y, All, or custom date range)

### 🗂️ Historical Holdings

- View portfolio holdings as of any past date by replaying transactions up to that point
- Toggle between live view and historical snapshot with an inline date picker
- As-of-date market value, cost basis and unrealized P&L per position
- Summary totals: total market value, total cost basis, total unrealized gain/loss as of the selected date
- Useful for reconciliation, tax purposes and comparing past vs. current composition

### 🎯 Asset Allocation & Rebalancing

- **Hierarchical Allocation System**: Set targets at both asset-type level and individual asset level
  - Type-level: Strategic allocation (e.g., Equity 80%, Fixed Income 20%)
  - Asset-level: Tactical allocation within types (e.g., AAPL 60% of equity)
- Automatic validation at both levels (type totals ≤100%, asset totals ≤100% within type)
- Real-time rebalancing recommendations for both strategic and tactical positions
- BUY/SELL/HOLD action indicators with amount-based recommendations
- Current vs. target allocation comparison
- Portfolio drift analysis with balance scoring
- Multi-broker asset aggregation for accurate calculations
- Configurable rebalancing tolerance threshold (percentage)
- **Asset type filter**: scope the rebalancing view to a selected subset of asset types for partial-portfolio analysis
- **Rebalancing Simulation**: enter a deposit amount and instantly see how it should be split across underweight asset types — shows allocated amount, projected value and projected % for each type

### 📊 Market Trends

- Price trend view for all active assets in the portfolio
- 30-day and YTD sparkline charts side-by-side
- Price change percentage for both 30D and YTD periods
- Current price and last price date per asset
- **Asset-Class Heatmap**: color-coded tiles showing 30-day average return by asset type (green = positive, red = negative)

### 📅 Economic Calendar

- Upcoming earnings dates, dividend ex-dates and payment dates for all currently held assets
- Data sourced from Yahoo Finance quoteSummary API
- Color-coded event type chips (Earnings, Ex-Dividend, Dividend Payment)
- Past events visually dimmed; upcoming event count surfaced as a summary badge
- Displays symbol, event date, event type, description and amount where available

### 🧾 Tax Report

- **Four-tab layout** covering the full tax workflow:
  - **Year-End Holdings** – snapshot of all positions at year-end with quantity, cost basis, market price, market value and FX rate for local-currency valuation; filter by asset type and/or broker
  - **Realized Gains/Losses** – FIFO-based closed-position report with short-term vs. long-term classification and configurable holding-period threshold
  - **Tax-Loss Harvesting Suggestions** – positions with unrealized losses ranked by estimated tax saving, using the marginal tax rate from Settings
  - **Wash Sale Detection** – flags buy transactions within 30 days of a loss sale

### � In-App Notification Center

- Bell icon in the header with live unread-count badge
- Notification feed with mark-as-read and mark-all-read actions
- Polls every 60 seconds for new notifications
- **Drift Alerts**: automatic notifications when any asset class drifts beyond the configured rebalancing tolerance

### �📧 Email Notifications

- Automated portfolio summary emails
- Configurable frequency (daily, weekly, monthly)
- Manual Send Report on-demand
- HTML email templates with portfolio metrics
- Holdings breakdown and asset allocation charts
- Performance metrics in email format

### 📊 Asset & Price Management

- Asset catalog with Crypto, Currency, Equity, Fixed Income and Real Estate
- Configurable price sources per asset: CoinGecko, Yahoo Finance, DolarAPI, Supabase or Manual
- Optional price symbol override and price factor for unit conversions
- Historical price data with daily snapshots
- Edit or delete price data points as needed
- Automatic portfolio valuation based on latest prices
- Price trend visualization

### 📥 Data Import/Export

- CSV bulk import for transactions with broker support
- Transaction export to CSV format with all details (via DataGrid toolbar)
- Support for deposits, withdrawals, buys, sells, dividends, interest, coupon and rental
- Flexible import template with optional fields
- Error reporting and import validation

### 📊 Analytics Dashboard

- Unified portfolio net worth (NAV) calculation
- Portfolio performance chart (value over time)
- MTM evolution bar chart (year-by-year mark-to-market)
- Asset allocation pie chart
- Market value by broker chart
- Top holdings display by value with sparklines
- Cash balance tracking
- Daily P&L, unrealized gain/loss and MWRR/CAGR summary cards

### ⚙️ User Settings & Preferences

- Theme selection (light/dark) via header toggle
- Date format preferences (YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY)
- Timezone configuration (UTC, America/Argentina/Buenos_Aires)
- Liquidity asset selection (currency asset used for cash calculations)
- FX rate asset selection (currency asset used as exchange rate reference)
- Rebalancing tolerance threshold (percentage)
- **Marginal tax rate** – used by Tax-Loss Harvesting to estimate potential tax savings
- **Long-term holding period** – configurable threshold (days) for short-term vs. long-term gain classification
- Cash balance validation toggle (prevent negative cash on transactions)
- Sell balance validation toggle (prevent selling more than held)
- Email notification toggle (email frequency configured via Schedulers)
- User profile management

### 🔐 Security & Access Control

- Role-based access control (User, Admin)
- JWT-based authentication
- Protected routes and API endpoints
- Audit logging for all user actions (login, logout, create, update, delete, import, export, email)
- Rate limiting on API requests
- Helmet security headers
- Admin-only user management: enable/disable accounts and change roles
- **Confirmation phrase dialogs** – destructive actions (delete asset, broker, transaction, user) require typing a confirmation phrase before proceeding

### 📡 Host Metrics (Admin)

- Real-time server monitoring dashboard (admin only)
- CPU load averages (1, 5 and 15 minutes)
- Memory usage with utilization bar
- Disk space (size, used, available, percentage)
- CPU temperature (Linux/Raspberry Pi)
- System uptime, platform, architecture and hostname

### 🖥️ Admin Control Panel

- Aggregate platform stats: total users, active vs. inactive breakdown, total transactions, active assets and brokers
- Last price data date and total price records across the database
- Recent price refresh activity log with success/failure status chips
- Surface errors from recent price refresh runs with per-asset error messages
- Purge all in-app notifications or scheduler execution history in one click
- **WAL Flush** – trigger a SQLite WAL TRUNCATE checkpoint to flush committed frames to the main DB file and reset the WAL to zero bytes
- Admin-only access enforced via role-based access control

### 🔍 Missing Prices (Admin)

- Identifies assets that have transactions on dates with no price data
- Shows missing dates grouped by asset with symbol, name and type
- **Fetch from Yahoo Finance** – batch-fetches historical closing prices for all affected dates; processes in batches of 50 with a progress bar
- Proposed prices appear in a review table; admins can edit any value before saving
- Rows where Yahoo Finance returned no data are flagged for manual entry
- **Apply to Database** – writes reviewed prices in one click; supports both inserting new price records and updating existing ones; result summary shows how many were applied

### ⏱️ Scheduler Management (Admin)

- Admin-only page to create, edit, enable/disable, and delete scheduled background jobs
- Supported job types: `send_report` (automated portfolio summary emails) and `asset_refresh` (automatic price updates)
- Configurable frequency (daily, weekly, monthly) and time of day per scheduler
- Per-scheduler execution history: status, result, error message, and timestamps for every run
- Purge all scheduler history from Admin Control Panel without affecting the schedulers themselves

### 🚀 Getting Started

- Onboarding checklist for new users: review settings, create a broker, add assets, record a transaction, set allocation targets, and (for admins) configure schedulers
- Visible in the sidebar until dismissed with "I'm all set"
- Progress tracked automatically — each step marks itself complete as you go
- Default assets (USD, USDARS_BNA, USDARS_CCL) and user settings created automatically on registration

### 📋 Changelog

- In-app version history rendered from CHANGELOG.md
- Accessible from the user menu

### 📱 User Interface

- React 19 with modern hooks
- Material UI 7 (MUI) for consistent design
- MUI X Data Grid 8 with column filtering, sorting and CSV export
- MUI X Charts 8 for interactive charting
- Recharts for sparkline and custom chart components
- React Router 7 for navigation
- Axios for API communication
- Error Boundary for crash protection
- Toast notifications (react-toastify) for user feedback
- Fade-in animations for page transitions
- Responsive design for mobile and desktop
- Bottom navigation bar on mobile for quick access to key pages
- Slide-out hamburger drawer on mobile with full navigation menu
- Vite 7 for fast development and optimized builds

### 🔧 Backend Technologies

- Node.js with Express.js 5
- SQLite database with better-sqlite3-multiple-ciphers (encrypted at rest)
- **High-Precision Arithmetic**: Integer storage pattern for financial data
  - All values stored as scaled integers (quantity, price, fee, total_amount columns)
  - Scale constants defined in code: Quantity (8 decimals), Price (6 decimals), Fees (4 decimals), Amounts (4 decimals)
  - All arithmetic performed with integers, conversion to float only at the end
  - Eliminates floating-point accumulation errors
  - **Parameter Order Convention**: All transaction APIs use consistent ordering: `quantity, price, fee, total_amount`
- JWT authentication (jsonwebtoken + bcryptjs)
- Winston logging
- Swagger API documentation (swagger-jsdoc + swagger-ui-express)
- node-cron for scheduled email tasks
- nodemailer for email delivery
- express-validator for input validation
- express-rate-limit for API rate limiting
- Helmet for HTTP security headers

## Quick Start

### Prerequisites

- Node.js (v24 or higher)
- npm or yarn

### Installation

1. **Install dependencies:**

```bash
# Backend
cd backend
npm install

# Frontend (in new terminal)
cd frontend
npm install
```

2. **Configure environment:**

```bash
# Backend - Copy and edit .env file
cd backend
cp .env.example .env
# Edit .env with your configuration:
# - PORT, NODE_ENV, DATABASE_PATH, DB_KEY
# - JWT_SECRET (min 32 characters)
# - CORS_ORIGIN
# - RATE_LIMIT settings
# - EMAIL_* settings (optional, for email notifications)
```

3. **Start servers in development:**

```bash
# Backend (from backend/)
npm start          # Runs on http://localhost:5000

# Frontend (from frontend/, in new terminal)
npm run dev        # Runs on http://localhost:3000
```

## API Documentation

### Swagger API Docs

Interactive API documentation is available at:

- **Development**: `http://localhost:5000/api/v1/api-docs`
- Swagger is automatically disabled in production for security

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

Sebastian Molinari - [GitHub](https://github.com/sebmolinari)
