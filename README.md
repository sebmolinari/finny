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

### 📊 Market Trends

- Price trend view for all active assets in the portfolio
- 30-day and YTD sparkline charts side-by-side
- Price change percentage for both 30D and YTD periods
- Current price and last price date per asset

### 🧾 Tax Report

- Year-end holdings snapshot for any historical year
- FX rate at year-end for local-currency valuation
- Filter by asset type and/or broker to include only relevant positions
- Quantity, cost basis, market price and market value per holding

### 📧 Email Notifications

- Automated portfolio summary emails
- Configurable frequency (daily, weekly, monthly)
- Manual email send on-demand
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

- Theme selection (light/dark)
- Date format preferences (YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY)
- Timezone configuration (UTC, America/Argentina/Buenos_Aires)
- Language preferences (English, Español)
- Liquidity asset selection (currency asset used for cash calculations)
- FX rate asset selection (currency asset used as exchange rate reference)
- Rebalancing tolerance threshold (percentage)
- Cash balance validation toggle (prevent negative cash on transactions)
- Sell balance validation toggle (prevent selling more than held)
- Email notification settings
- User profile management

### 🔐 Security & Access Control

- Role-based access control (User, Admin)
- JWT-based authentication
- Protected routes and API endpoints
- Audit logging for all user actions (login, logout, create, update, delete, import, export, email)
- Rate limiting on API requests
- Helmet security headers
- Admin-only user management: enable/disable accounts and change roles

### 📡 Host Metrics (Admin)

- Real-time server monitoring dashboard (admin only)
- CPU load averages (1, 5 and 15 minutes)
- Memory usage with utilization bar
- Disk space (size, used, available, percentage)
- CPU temperature (Linux/Raspberry Pi)
- System uptime, platform, architecture and hostname

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
