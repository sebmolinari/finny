# Finny

A professional-grade finance management application designed to help you track transactions across multiple brokers, manage assets, and analyze portfolio performance.

## Features

### 📈 Multi-Broker Portfolio Management

- Track transactions across multiple brokers
- Support for Crypto, Currency, Equity and Fixed Income
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

### 📧 Email Notifications

- Automated portfolio summary emails
- Configurable frequency (daily, weekly, monthly)
- Manual email send on-demand
- HTML email templates with portfolio metrics
- Holdings breakdown and asset allocation charts
- Performance metrics in email format

### 📊 Asset & Price Management

- Asset catalog with Crypto, Currency, Equity and Fixed Income
- Historical price data with daily snapshots
- Edit or delete price data points as needed
- Automatic portfolio valuation based on latest prices
- Price trend visualization

### 📥 Data Import/Export

- CSV bulk import for transactions with broker support
- Transaction export to CSV format with all details
- Support for deposits, withdrawals, buys, sells, dividends, interest, coupon and rental
- Flexible import template with optional fields
- Error reporting and import validation

### 📊 Analytics Dashboard

- Unified portfolio net worth calculation
- Portfolio performance metrics (MWRR, CAGR)
- Asset allocation breakdown
- Top holdings display by value
- Cash balance tracking
- Portfolio summary with gain/loss visualization

### ⚙️ User Settings & Preferences

- Theme selection (light/dark)
- Date format preferences
- Timezone configuration
- Language preferences
- Email notification settings
- User profile management

### 🔐 Security & Access Control

- Role-based access control (User, Superuser, Admin)
- JWT-based authentication
- Protected routes and API endpoints
- Audit logging for all user actions
- Rate limiting on API requests

### 📱 User Interface

- React 18.2.0 with modern hooks
- Material-UI 5.15.0 for consistent design
- React Router 6.20.1 for navigation
- Axios for API communication
- Error Boundary for crash protection
- Toast notifications for user feedback
- Responsive design for mobile and desktop

### 🔧 Backend Technologies

- Node.js with Express.js
- SQLite database with better-sqlite3-multiple-ciphers
- **High-Precision Arithmetic**: Integer storage pattern for financial data
  - All values stored as scaled integers (quantity, price, fee, total_amount columns)
  - Scale constants defined in code: Quantity (8 decimals), Price (6 decimals), Fees (4 decimals), Amounts (4 decimals)
  - All arithmetic performed with integers, conversion to float only at the end
  - Eliminates floating-point accumulation errors
  - **Parameter Order Convention**: All transaction APIs use consistent ordering: `quantity, price, fee, total_amount`
- JWT authentication
- Winston logging
- Swagger API documentation
- node-cron for scheduled tasks
- nodemailer for email delivery
- express-validator for input validation

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
npm start          # Runs on http://localhost:3000
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
