const express = require("express");
const router = express.Router();
const AnalyticsService = require("../services/analytics");
const Notification = require("../models/Notification");
const UserSettings = require("../models/UserSettings");
const authMiddleware = require("../middleware/auth");
const { validate } = require("../utils/validationMiddleware");
const {
  marketTrendsValidation,
  portfolioPerformanceValidation,
  taxReportValidation,
} = require("../middleware/validators/analyticsValidators");

// Get broker summary (transaction counts and volumes)
router.get("/brokers/overview", authMiddleware, (req, res) => {
  try {
    /**
     * @swagger
     * /analytics/brokers/overview:
     *   get:
     *     summary: Get broker summary (transaction counts and volumes)
     *     tags: [Analytics]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Broker summary
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 type: object
     *                 properties:
     *                   name:
     *                     type: string
     *                     description: Broker name
     *                   current_value:
     *                     type: number
     *                     description: Total market value of transactions
     *       500:
     *         description: Server error
     */
    const summary = AnalyticsService.getBrokerHoldings(req.user.id);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get market data trends for user's assets
router.get(
  "/market-trends",
  authMiddleware,
  validate(marketTrendsValidation),
  (req, res) => {
    try {
      /**
       * @swagger
       * /analytics/market-trends:
       *   get:
       *     summary: Get market data trends with sparkline data for all active assets
       *     tags: [Analytics]
       *     security:
       *       - bearerAuth: []
       *     parameters:
       *       - in: query
       *         name: days
       *         schema:
       *           type: integer
       *         description: Number of days of price history (default 30)
       *     responses:
       *       200:
       *         description: Market trends data for all active assets
       *         content:
       *           application/json:
       *             schema:
       *               type: object
       *               properties:
       *                 trends:
       *                   type: array
       *                   items:
       *                     type: object
       *                     properties:
       *                       asset_id:
       *                         type: integer
       *                       symbol:
       *                         type: string
       *                       name:
       *                         type: string
       *                       asset_type:
       *                         type: string
       *                       currency:
       *                         type: string
       *                       current_price:
       *                         type: number
       *                       price_date:
       *                         type: string
       *                         format: date
       *                       price_change_percent:
       *                         type: number
       *                       price_history:
       *                         type: array
       *                         items:
       *                           type: object
       *                           properties:
       *                             date:
       *                               type: string
       *                               format: date
       *                             price:
       *                               type: number
       *                 days:
       *                   type: integer
       *       500:
       *         description: Server error
       */
      const { days = 30 } = req.query;
      const result = AnalyticsService.getMarketTrends(req.user.id, days);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
);

// Get comprehensive portfolio analytics
router.get("/portfolio/analytics", authMiddleware, (req, res) => {
  try {
    /**
     * @swagger
     * /analytics/portfolio/analytics:
     *   get:
     *     summary: Get comprehensive portfolio analytics
     *     tags: [Analytics]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: exclude
     *         schema:
     *           type: string
     *         description: >
     *           Comma-separated list of asset types to exclude from holdings calculations
     *           (e.g. `realestate`, `crypto`). Excluded types are omitted from
     *           holdings_market_value, unrealized_gain, cost_basis, and asset_allocation.
     *           Valid values: crypto, currency, equity, fixedincome, realestate.
     *     responses:
     *       200:
     *         description: Portfolio analytics data
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 nav:
     *                   type: number
     *                   description: Net Asset Value - Total portfolio value including cash
     *                 transactions:
     *                   type: object
     *                   properties:
     *                     net_invested:
     *                       type: number
     *                     net_contributions:
     *                       type: number
     *                     holdings_market_value:
     *                       type: number
     *                       description: Market value of all holdings excluding cash (and any excluded asset types)
     *                     daily_pnl:
     *                       type: number
     *                       description: Daily profit or loss based on price changes from previous day
     *                     cash_balance:
     *                       type: number
     *                     liquidity_balance:
     *                       type: number
     *                     unrealized_gain:
     *                       type: number
     *                     unrealized_gain_percent:
     *                       type: number
     *                     liquidity_percent:
     *                       type: number
     *                     mwrr:
     *                       type: number
     *                       description: Money-Weighted Rate of Return (IRR)
     *                     cagr:
     *                       type: number
     *                       description: Compound Annual Growth Rate
     *                     holdings:
     *                       type: array
     *                       items:
     *                         type: object
     *                         properties:
     *                           asset_id:
     *                             type: integer
     *                           symbol:
     *                             type: string
     *                           name:
     *                             type: string
     *                           asset_type:
     *                             type: string
     *                           total_quantity:
     *                             type: number
     *                           cost_basis:
     *                             type: number
     *                           market_price:
     *                             type: number
     *                           market_value:
     *                             type: number
     *                           unrealized_gain:
     *                             type: number
     *                     asset_allocation:
     *                       type: array
     *                       items:
     *                         type: object
     *                         properties:
     *                           type:
     *                             type: string
     *                             description: Asset type name
     *                           value:
     *                             type: number
     *                             description: Total market value for this asset type
     *                           count:
     *                             type: integer
     *                             description: Number of holdings of this type
     *                           percentage:
     *                             type: number
     *                             description: Percentage of total portfolio
     *       500:
     *         description: Server error
     */
    const { exclude } = req.query;
    const excludeTypes = exclude
      ? exclude
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];
    const analytics = AnalyticsService.getPortfolioAnalytics(
      req.user.id,
      excludeTypes,
    );

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get detailed cash balance breakdown
router.get("/portfolio/cash-details", authMiddleware, (req, res) => {
  try {
    /**
     * @swagger
     * /analytics/portfolio/cash-details:
     *   get:
     *     summary: Get detailed cash balance breakdown
     *     tags: [Analytics]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Cash balance details
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 summary:
     *                   type: object
     *                   properties:
     *                     total_deposits:
     *                       type: number
     *                     total_withdrawals:
     *                       type: number
     *                     total_buy:
     *                       type: number
     *                     total_sell:
     *                       type: number
     *                     total_dividends:
     *                       type: number
     *                     total_interest:
     *                       type: number
     *                     total_coupons:
     *                       type: number
     *                     total_rentals:
     *                       type: number
     *                     net_inflow:
     *                       type: number
     *                     net_trading:
     *                       type: number
     *                     current_balance:
     *                       type: number
     *                 cash_flows:
     *                   type: array
     *                   items:
     *                     type: object
     *                     properties:
     *                       id:
     *                         type: integer
     *                       date:
     *                         type: string
     *                         format: date
     *                       transaction_type:
     *                         type: string
     *                       asset_id:
     *                         type: integer
     *                       symbol:
     *                         type: string
     *                       asset_name:
     *                         type: string
     *                       broker_id:
     *                         type: integer
     *                       broker_name:
     *                         type: string
     *                       quantity:
     *                         type: number
     *                       price:
     *                         type: number
     *                       total_amount:
     *                         type: number
     *                       cash_effect:
     *                         type: number
     *                         description: Impact on cash balance (+ or -)
     *                       running_balance:
     *                         type: number
     *                         description: Cumulative cash balance
     *                 transaction_count:
     *                   type: integer
     *       500:
     *         description: Server error
     */
    const details = AnalyticsService.getCashBalanceDetails(req.user.id);
    res.json(details);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get portfolio performance
router.get(
  "/portfolio/performance",
  authMiddleware,
  validate(portfolioPerformanceValidation),
  (req, res) => {
    try {
      /**
       * @swagger
       * /analytics/portfolio/performance:
       *   get:
       *     summary: Get portfolio performance over time
       *     tags: [Analytics]
       *     security:
       *       - bearerAuth: []
       *     parameters:
       *       - in: query
       *         name: days
       *         schema:
       *           type: integer
       *           default: 30
       *         description: Number of days to include in the performance history. Ignored when start_date/end_date are provided.
       *       - in: query
       *         name: start_date
       *         schema:
       *           type: string
       *           format: date
       *         description: Start date (YYYY-MM-DD). When provided together with end_date, overrides days.
       *       - in: query
       *         name: end_date
       *         schema:
       *           type: string
       *           format: date
       *         description: End date (YYYY-MM-DD). When provided together with start_date, overrides days.
       *       - in: query
       *         name: exclude
       *         schema:
       *           type: string
       *         description: >
       *           Comma-separated list of asset types to exclude from the portfolio value calculation
       *           (e.g. `realestate,crypto`). Valid values: crypto, currency, equity, fixedincome, realestate.
       *       - in: query
       *         name: debug
       *         schema:
       *           type: boolean
       *           default: false
       *         description: >
       *           When true, each day entry includes cash_balance, holdings_value,
       *           transactions_applied (list of transactions applied on that day), and
       *           holdings_breakdown (per-asset quantity, price, value, price_updated_today flag).
       *           Useful for diagnosing unexpected value changes.
       *     responses:
       *       200:
       *         description: Portfolio performance data
       *         content:
       *           application/json:
       *             schema:
       *               type: array
       *               items:
       *                 type: object
       *                 properties:
       *                   date:
       *                     type: string
       *                     format: date
       *                   total_value:
       *                     type: number
       *                     description: Total portfolio value (holdings + cash)
       *       500:
       *         description: Server error
       */
      const { days, exclude, start_date, end_date, debug } = req.query;
      const excludeTypes = exclude
        ? exclude
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];
      const performance = AnalyticsService.getPortfolioPerformance(
        req.user.id,
        parseInt(days) || 30,
        excludeTypes,
        start_date || null,
        end_date || null,
        debug === "true",
      );
      res.json(performance);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
);

// Get detailed return calculations (MWRR & CAGR)
router.get("/portfolio/returns/details", authMiddleware, (req, res) => {
  try {
    /**
     * @swagger
     * /analytics/portfolio/returns/details:
     *   get:
     *     summary: Get detailed return calculations (MWRR & CAGR)
     *     tags: [Analytics]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Return details
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 current_total_value:
     *                   type: number
     *                 cash_balance:
     *                   type: number
     *                 holdings_market_value:
     *                   type: number
     *                 mwrr:
     *                   type: number
     *                   description: Money-Weighted Rate of Return as decimal
     *                 mwrr_cash_flows:
     *                   type: array
     *                   items:
     *                     type: object
     *                     properties:
     *                       date:
     *                         type: string
     *                         format: date
     *                       type:
     *                         type: string
     *                         enum: [deposit, withdraw, current]
     *                       amount:
     *                         type: number
     *                       yearsSince:
     *                         type: number
     *                       signedAmount:
     *                         type: number
     *                         description: Negative for deposits, positive for withdrawals and current value
     *                 mwrr_iterations:
     *                   type: array
     *                   items:
     *                     type: object
     *                     properties:
     *                       iteration:
     *                         type: integer
     *                       rate:
     *                         type: number
     *                         description: IRR rate at this iteration
     *                       npv:
     *                         type: number
     *                         description: Net Present Value at this rate
     *                 cagr:
     *                   type: number
     *                   description: Compound Annual Growth Rate as decimal
     *                 cagr_details:
     *                   type: object
     *                   properties:
     *                     cagr:
     *                       type: number
     *                     firstDate:
     *                       type: string
     *                       format: date
     *                     years:
     *                       type: number
     *                     netDeposits:
     *                       type: number
     *                     endingValue:
     *                       type: number
     *                 cagr_evolution:
     *                   type: array
     *                   items:
     *                     type: object
     *                     properties:
     *                       year:
     *                         type: integer
     *                       mtm:
     *                         type: number
     *                         description: Mark-to-market value at end of year
     *                       cagr:
     *                         type: number
     *                         description: CAGR from year 1 to this year
     *       500:
     *         description: Server error
     */
    const details = AnalyticsService.getReturnDetails(req.user.id);
    res.json(details);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get tax report for a specific year
router.get(
  "/tax-report",
  authMiddleware,
  validate(taxReportValidation),
  (req, res) => {
    try {
      /**
       * @swagger
       * /analytics/tax-report:
       *   get:
       *     summary: Get tax report with holdings at year-end
       *     tags: [Analytics]
       *     security:
       *       - bearerAuth: []
       *     parameters:
       *       - in: query
       *         name: year
       *         required: true
       *         schema:
       *           type: integer
       *         description: Year for tax report (e.g., 2025)
       *       - in: query
       *         name: exclude_asset_types
       *         schema:
       *           type: string
       *         description: Comma-separated asset types to exclude
       *       - in: query
       *         name: exclude_brokers
       *         schema:
       *           type: string
       *         description: Comma-separated broker names to exclude
       *     responses:
       *       200:
       *         description: Tax report data
       *         content:
       *           application/json:
       *             schema:
       *               type: object
       *               properties:
       *                 year:
       *                   type: integer
       *                 year_end_date:
       *                   type: string
       *                   format: date
       *                 fx_rate_asset:
       *                   type: string
       *                   description: Symbol of FX rate asset used
       *                 fx_rate:
       *                   type: number
       *                   description: FX rate at year-end
       *                 holdings:
       *                   type: array
       *                   items:
       *                     type: object
       *                     properties:
       *                       asset_id:
       *                         type: integer
       *                       asset:
       *                         type: string
       *                         description: Asset symbol
       *                       asset_name:
       *                         type: string
       *                       asset_type:
       *                         type: string
       *                       currency:
       *                         type: string
       *                       broker:
       *                         type: string
       *                       quantity:
       *                         type: number
       *                       price:
       *                         type: number
       *                         description: Price in USD at year-end
       *                       price_date:
       *                         type: string
       *                         format: date
       *                       market_value:
       *                         type: number
       *                         description: Market value in USD
       *                       usdars_bna:
       *                         type: number
       *                         description: FX rate used
       *                       price_in_ccy:
       *                         type: number
       *                         description: Price in local currency
       *                       market_value_in_ccy:
       *                         type: number
       *                         description: Market value in local currency
       *                 total_market_value:
       *                   type: number
       *                   description: Total market value in USD
       *                 total_market_value_in_ccy:
       *                   type: number
       *                   description: Total market value in local currency
       *       400:
       *         description: Missing or invalid year parameter
       *       500:
       *         description: Server error
       */
      const { year, exclude_asset_types, exclude_brokers } = req.query;

      if (!year) {
        return res.status(400).json({ message: "Year parameter is required" });
      }

      const yearNum = parseInt(year, 10);
      if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
        return res
          .status(400)
          .json({ message: "Invalid year. Must be between 1900 and 2100" });
      }

      // Parse comma-separated filter lists
      const excludeAssetTypes = exclude_asset_types
        ? exclude_asset_types
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];
      const excludeBrokers = exclude_brokers
        ? exclude_brokers
            .split(",")
            .map((b) => b.trim())
            .filter(Boolean)
        : [];

      const report = AnalyticsService.getTaxReport(
        req.user.id,
        yearNum,
        excludeAssetTypes,
        excludeBrokers,
      );
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
);

/**
 * @swagger
 * /analytics/portfolio/performance/range:
 *   get:
 *     summary: Get date-range performance metrics (MWRR, NAV change) for a custom period
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: end_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Performance metrics for the specified date range
 *       400:
 *         description: start_date and end_date are required
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
// Get date-range performance metrics (MWRR, NAV change) for a custom period
router.get("/portfolio/performance/range", authMiddleware, (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    if (!start_date || !end_date) {
      return res
        .status(400)
        .json({ message: "start_date and end_date are required" });
    }
    const metrics = AnalyticsService.getDateRangeMetrics(
      req.user.id,
      start_date,
      end_date,
    );
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /analytics/portfolio/inception-date:
 *   get:
 *     summary: Get the date of the first transaction (portfolio inception date)
 *     description: Returns the date of the earliest transaction for the authenticated user, used to set the "Since Inception" date range.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inception date
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 inception_date:
 *                   type: string
 *                   format: date
 *                   nullable: true
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
// Get the date of the first transaction for the current user (for "Since Inception" range)
router.get("/portfolio/inception-date", authMiddleware, (req, res) => {
  try {
    const firstDate = AnalyticsService.getFirstTransactionDate(req.user.id);
    res.json({ inception_date: firstDate });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get realized gains/losses report with ST/LT classification and wash sale flags
/**
 * @swagger
 * /analytics/realized-gains:
 *   get:
 *     summary: Get realized gains/losses report
 *     description: Returns all closed positions with FIFO cost basis, ST/LT classification, and wash sale flags.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Filter by tax year (e.g. 2025). Omit for all years.
 *       - in: query
 *         name: lt_days
 *         schema:
 *           type: integer
 *           default: 365
 *         description: Minimum holding days to qualify as long-term.
 *     responses:
 *       200:
 *         description: Realized gains report
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 positions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       symbol:
 *                         type: string
 *                       name:
 *                         type: string
 *                       asset_type:
 *                         type: string
 *                       broker_name:
 *                         type: string
 *                       acquisition_date:
 *                         type: string
 *                         format: date
 *                       disposal_date:
 *                         type: string
 *                         format: date
 *                       quantity:
 *                         type: number
 *                       cost_basis:
 *                         type: number
 *                       sale_proceeds:
 *                         type: number
 *                       gain_loss:
 *                         type: number
 *                       holding_days:
 *                         type: integer
 *                       is_long_term:
 *                         type: boolean
 *                       is_wash_sale:
 *                         type: boolean
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total_gain_loss:
 *                       type: number
 *                     short_term_gain_loss:
 *                       type: number
 *                     long_term_gain_loss:
 *                       type: number
 *                     wash_sale_count:
 *                       type: integer
 *                     position_count:
 *                       type: integer
 *       401:
 *         description: Authentication required
 */
router.get("/realized-gains", authMiddleware, (req, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year) : null;
    const ltDays = req.query.lt_days ? parseInt(req.query.lt_days) : 365;
    const report = AnalyticsService.getRealizedGainsReport(
      req.user.id,
      year,
      ltDays,
    );
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get tax-loss harvesting suggestions based on current unrealized losses
/**
 * @swagger
 * /analytics/tax-harvesting:
 *   get:
 *     summary: Get tax-loss harvesting suggestions
 *     description: Returns positions with unrealized losses, sorted by loss, with estimated tax savings based on the user's marginal rate.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: marginal_rate
 *         schema:
 *           type: number
 *           format: float
 *         description: Override marginal tax rate (0–1). Defaults to user setting (or 0.25).
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Tax year to evaluate holdings as of Dec 31 of that year. Omit for current holdings.
 *     responses:
 *       200:
 *         description: List of tax-loss harvesting candidates
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   asset_id:
 *                     type: integer
 *                   symbol:
 *                     type: string
 *                   name:
 *                     type: string
 *                   asset_type:
 *                     type: string
 *                   broker_name:
 *                     type: string
 *                   quantity:
 *                     type: number
 *                   cost_basis:
 *                     type: number
 *                   current_price:
 *                     type: number
 *                   market_value:
 *                     type: number
 *                   unrealized_gain_loss:
 *                     type: number
 *                   potential_tax_saving:
 *                     type: number
 *                   marginal_rate:
 *                     type: number
 *       401:
 *         description: Authentication required
 */
router.get("/tax-harvesting", authMiddleware, (req, res) => {
  try {
    const marginalRate = req.query.marginal_rate
      ? parseFloat(req.query.marginal_rate)
      : null;
    const year = req.query.year ? parseInt(req.query.year, 10) : null;
    const suggestions = AnalyticsService.getTaxHarvestingSuggestions(
      req.user.id,
      marginalRate,
      year,
    );
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get allocation drift alerts
/**
 * @swagger
 * /analytics/drift-alerts:
 *   get:
 *     summary: Get allocation drift alerts
 *     description: Returns asset types whose actual allocation deviates from the target by more than the user's configured rebalancing tolerance. Also creates in-app notifications for new alerts.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of drift alerts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   asset_type:
 *                     type: string
 *                   target_percentage:
 *                     type: number
 *                   actual_percentage:
 *                     type: number
 *                   drift:
 *                     type: number
 *                     description: Absolute deviation from target in percentage points
 *       401:
 *         description: Authentication required
 */
router.get("/drift-alerts", authMiddleware, (req, res) => {
  try {
    const alerts = AnalyticsService.getDriftAlerts(req.user.id);

    // Dedup window = user's notification polling interval in seconds (default 1 day)
    const settings = UserSettings.findByUserId(req.user.id);
    const dedupSeconds = settings?.notification_polling_interval || 86400;

    // Feature 8.4 — create in-app notifications for new drift alerts
    for (const alert of alerts) {
      const title = `Allocation drift: ${alert.asset_type}`;
      const alreadyNotified = Notification.hasRecent(
        req.user.id,
        "drift_alert",
        title,
        dedupSeconds,
      );
      if (!alreadyNotified) {
        const drift = alert.drift.toFixed(1);
        const actual = alert.actual_percentage.toFixed(1);
        const target = alert.target_percentage.toFixed(1);
        Notification.create(
          req.user.id,
          "drift_alert",
          title,
          `${alert.asset_type} is at ${actual}% (target ${target}%, drift ${drift}%). Consider rebalancing.`,
          {
            asset_type: alert.asset_type,
            drift: alert.drift,
            actual: alert.actual_percentage,
            target: alert.target_percentage,
          },
        );
      }
    }

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /analytics/missing-prices:
 *   get:
 *     summary: Find transactions with missing or stale price data on the trade date
 *     description: >
 *       Returns buy/sell transactions where no price exists for the asset on the trade date.
 *       status='no_price' means no price data exists at all for this asset as of the trade date.
 *       status='stale_price' means the closest available price is from an earlier date.
 *       Use this to identify which assets need price data entries added.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *         description: Response format. Use 'csv' to download a spreadsheet-ready file.
 *     responses:
 *       200:
 *         description: List of transactions with missing or stale prices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_issues:
 *                   type: integer
 *                 issues:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       transaction_id:
 *                         type: integer
 *                       trade_date:
 *                         type: string
 *                         format: date
 *                       transaction_type:
 *                         type: string
 *                         enum: [buy, sell]
 *                       asset_id:
 *                         type: integer
 *                       symbol:
 *                         type: string
 *                       name:
 *                         type: string
 *                       asset_type:
 *                         type: string
 *                       broker_name:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [no_price]
 *                         description: no price data exists for this asset on or before the trade date
 *                       closest_price_date:
 *                         type: string
 *                         format: date
 *                         nullable: true
 *                         description: Date of the closest available price (null if no_price)
 *                       closest_price:
 *                         type: number
 *                         nullable: true
 *                         description: Value of the closest available price (null if no_price)
 *                       days_without_price:
 *                         type: integer
 *                         nullable: true
 *                         description: Days between closest price and trade date (null if no_price)
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get("/missing-prices", authMiddleware, (req, res) => {
  try {
    const result = AnalyticsService.getMissingPrices(req.user.id);

    if (req.query.format === "csv") {
      const headers = [
        "transaction_id",
        "trade_date",
        "transaction_type",
        "symbol",
        "name",
        "asset_type",
        "broker_name",
        "status",
        "closest_price_date",
        "closest_price",
        "days_without_price",
      ];
      const escape = (v) => {
        if (v == null) return "";
        const s = String(v);
        return s.includes(",") || s.includes('"') || s.includes("\n")
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      };
      const rows = result.issues.map((i) =>
        headers.map((h) => escape(i[h])).join(","),
      );
      const csv = [headers.join(","), ...rows].join("\r\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="missing-prices.csv"',
      );
      return res.send(csv);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
