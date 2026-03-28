const express = require("express");
const router = express.Router();
const axios = require("axios");
const logger = require("../utils/logger");
const AnalyticsService = require("../services/analyticsService");
const authMiddleware = require("../middleware/auth");
const adminMiddleware = require("../middleware/admin");
const Asset = require("../models/Asset");
const PriceData = require("../models/PriceData");
const AuditLog = require("../models/AuditLog");
const Transaction = require("../models/Transaction");
const PriceService = require("../services/priceService");
const { validate } = require("../utils/validationMiddleware");
const {
  marketTrendsValidation,
  portfolioPerformanceValidation,
  taxReportValidation,
  incomeValidation,
} = require("../middleware/validators/analyticsValidators");

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
router.get("/brokers/overview", authMiddleware, (req, res) => {
  try {
    const summary = AnalyticsService.getBrokerHoldings(req.user.id);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

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
router.get(
  '/market-trends',
  authMiddleware,
  validate(marketTrendsValidation),
  (req, res) => {
    try {
      const { days = 30 } = req.query;
      const result = AnalyticsService.getMarketTrends(req.user.id, days);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
);

// Get comprehensive portfolio analytics
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

router.get("/portfolio/analytics", authMiddleware, (req, res) => {
  try {
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

router.get("/portfolio/cash-details", authMiddleware, (req, res) => {
  try {
    const details = AnalyticsService.getCashBalanceDetails(req.user.id);
    res.json(details);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get portfolio performance
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

router.get(
  "/portfolio/performance",
  authMiddleware,
  validate(portfolioPerformanceValidation),
  (req, res) => {
    try {
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

// Get historical unrealized P&L for sparkline
/**
* @swagger
* /analytics/portfolio/unrealized-pnl-history:
*   get:
*     summary: Get 30-day historical unrealized P&L
*     tags: [Analytics]
*     security:
*       - bearerAuth: []
*     parameters:
*       - in: query
*         name: days
*         schema:
*           type: integer
*           default: 31
*         description: Number of days of history
*       - in: query
*         name: exclude
*         schema:
*           type: string
*         description: Comma-separated asset types to exclude (e.g. realestate)
*     responses:
*       200:
*         description: Array of daily unrealized P&L values
*       500:
*         description: Server error
*/

router.get(
  "/portfolio/unrealized-pnl-history",
  authMiddleware,
  (req, res) => {
    try {
      const { days, exclude } = req.query;
      const excludeTypes = exclude
        ? exclude
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];
      const daysCount = Math.min(parseInt(days) || 31, 365);
      const history = AnalyticsService.getPortfolioUnrealizedPnlHistory(
        req.user.id,
        daysCount,
        excludeTypes,
      );
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
);

// Get detailed return calculations (MWRR & CAGR)
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

router.get("/portfolio/returns/details", authMiddleware, (req, res) => {
  try {
    const details = AnalyticsService.getReturnDetails(req.user.id);
    res.json(details);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get tax report for a specific year
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

router.get(
  "/tax-report",
  authMiddleware,
  validate(taxReportValidation),
  (req, res) => {
    try {
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


/**
 * @swagger
 * /analytics/missing-prices:
 *   get:
 *     summary: Find transactions that predate all available price data for the asset
 *     description: >
 *       Returns buy/sell transactions where no price record exists on or before the trade date
 *       (status='no_price'). A transaction is NOT flagged when an older price is available and
 *       can be used as a fallback — e.g. a price from t-6 will satisfy a trade on t-2.
 *       Only transactions that predate every existing price record for the asset are listed.
 *       Use this to identify which assets need historical price data added.
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
    const includeStale = req.query.includeStale === "true";
    const result = AnalyticsService.getMissingPrices(req.user.id, { includeStale });

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

/**
 * @swagger
 * /analytics/missing-prices/fetch:
 *   post:
 *     summary: Fetch proposed prices from Yahoo Finance for missing date/asset pairs
 *     description: Does NOT write to DB — returns price proposals for review.
 *     tags: [Analytics]
 *     security:
 *       - adminAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     asset_id:
 *                       type: integer
 *                     price_symbol:
 *                       type: string
 *                     trade_date:
 *                       type: string
 *                       format: date
 *     responses:
 *       200:
 *         description: Fetched price proposals
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       asset_id:
 *                         type: integer
 *                       trade_date:
 *                         type: string
 *                         format: date
 *                       price_symbol:
 *                         type: string
 *                         nullable: true
 *                       fetched_price:
 *                         type: number
 *                         nullable: true
 *                       status:
 *                         type: string
 *                         enum: [ok, not_found]
 *       400:
 *         description: items array is required
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
// Fetch proposed prices from Yahoo Finance for a batch of missing date/asset pairs.
// Admin only. Does NOT write to DB — returns proposals for review.
router.post(
  "/missing-prices/fetch",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "items array is required" });
      }

      const results = [];
      for (const item of items) {
        const { asset_id, price_symbol, trade_date } = item;
        if (!asset_id || !trade_date) {
          results.push({
            asset_id,
            trade_date,
            price_symbol,
            fetched_price: null,
            status: "not_found",
          });
          continue;
        }

        const symbol = price_symbol || null;
        let fetchedPrice = null;
        if (symbol) {
          fetchedPrice = await PriceService.fetchHistoricalPrice(
            symbol,
            trade_date,
          );
        }

        results.push({
          asset_id,
          trade_date,
          price_symbol: symbol,
          fetched_price: fetchedPrice,
          status: fetchedPrice != null ? "ok" : "not_found",
        });

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      res.json({ results });
    } catch (error) {
      logger.error(`missing-prices/fetch error: ${error.message}`);
      res.status(500).json({ message: error.message });
    }
  },
);

/**
 * @swagger
 * /analytics/missing-prices/apply:
 *   post:
 *     summary: Apply reviewed prices to the database
 *     description: Accepts raw float prices from the frontend and creates or updates price_data records.
 *     tags: [Analytics]
 *     security:
 *       - adminAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - asset_id
 *                     - trade_date
 *                     - price
 *                   properties:
 *                     asset_id:
 *                       type: integer
 *                     trade_date:
 *                       type: string
 *                       format: date
 *                     price:
 *                       type: number
 *     responses:
 *       200:
 *         description: Prices applied
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 applied:
 *                   type: integer
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: items array is required
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
// Apply reviewed/edited prices to the database.
// Admin only. Accepts raw float prices from the frontend.
router.post(
  "/missing-prices/apply",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "items array is required" });
      }

      let applied = 0;
      const errors = [];

      for (const item of items) {
        const { asset_id, trade_date, price } = item;
        if (!asset_id || !trade_date || price == null) {
          errors.push(`Skipped invalid item: ${JSON.stringify(item)}`);
          continue;
        }

        try {
          const existing = PriceData.findByAssetAndDate(asset_id, trade_date);
          if (existing) {
            PriceData.update(existing.id, price, "yahoo", req.user.id);
            AuditLog.logUpdate(
              req.user.id,
              req.user.username,
              "price_data",
              existing.id,
              { price: existing.price, source: existing.source },
              { price, source: "yahoo" },
              req.ip,
              req.get("user-agent"),
            );
          } else {
            const newId = PriceData.create(
              asset_id,
              trade_date,
              price,
              "yahoo",
              req.user.id,
            );
            AuditLog.logCreate(
              req.user.id,
              req.user.username,
              "price_data",
              newId,
              { asset_id, trade_date, price, source: "yahoo" },
              req.ip,
              req.get("user-agent"),
            );
          }
          applied++;
        } catch (err) {
          errors.push(`asset_id=${asset_id} date=${trade_date}: ${err.message}`);
          logger.error(
            `missing-prices/apply error for asset ${asset_id} on ${trade_date}: ${err.message}`,
          );
        }
      }

      res.json({ applied, errors });
    } catch (error) {
      logger.error(`missing-prices/apply error: ${error.message}`);
      res.status(500).json({ message: error.message });
    }
  },
);

// ── 1.3 Risk Metrics: Volatility & Drawdown ─────────────────────────────────
/**
 * @swagger
 * /analytics/portfolio/risk-metrics:
 *   get:
 *     summary: Get portfolio volatility and drawdown metrics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 365
 *         description: Lookback window in days
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (overrides days)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (overrides days)
 *     responses:
 *       200:
 *         description: Risk metrics
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get("/portfolio/risk-metrics", authMiddleware, (req, res) => {
  try {
    const { days = 365, start_date, end_date } = req.query;
    const result = AnalyticsService.getVolatilityAndDrawdown(
      req.user.id,
      parseInt(days),
      start_date || null,
      end_date || null,
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── 2.1 Historical Holdings ──────────────────────────────────────────────────
/**
 * @swagger
 * /analytics/portfolio/historical-holdings:
 *   get:
 *     summary: Get portfolio holdings as of a specific date
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: as_of
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date in YYYY-MM-DD format
 *     responses:
 *       200:
 *         description: Historical holdings as of the given date
 *       400:
 *         description: as_of query parameter is required or invalid
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get("/portfolio/historical-holdings", authMiddleware, (req, res) => {
  try {
    const { as_of } = req.query;
    if (!as_of) {
      return res
        .status(400)
        .json({ message: "as_of query parameter is required (YYYY-MM-DD)" });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(as_of)) {
      return res
        .status(400)
        .json({ message: "as_of must be in YYYY-MM-DD format" });
    }
    const result = AnalyticsService.getHistoricalHoldings(req.user.id, as_of);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── 7.2 Economic Calendar ────────────────────────────────────────────────────
// Helper: obtain a Yahoo Finance session cookie + crumb required by v11 API
// (kept as no-op — replaced by yahoo-finance2 which handles auth internally)

/**
 * @swagger
 * /analytics/economic-calendar:
 *   get:
 *     summary: Get upcoming earnings and dividend events for held assets
 *     description: Queries Yahoo Finance for earnings dates and ex-dividend dates for all held assets that support it (excludes crypto, currency, and manual/coingecko/dolarapi price sources).
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Economic calendar events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 events:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       symbol:
 *                         type: string
 *                       type:
 *                         type: string
 *                         description: "earnings or dividend"
 *                       date:
 *                         type: string
 *                         format: date
 *                 fund_stats:
 *                   type: object
 *                 symbols_queried:
 *                   type: array
 *                   items:
 *                     type: string
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get("/economic-calendar", authMiddleware, async (req, res) => {
  try {
    const YahooFinance = require("yahoo-finance2").default;
    const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

    // Get the user's held assets (grouped so each asset appears once)
    const holdings = AnalyticsService.getPortfolioHoldings(
      req.user.id,
      true,
      [],
      true,
    );

    // Build a deduplicated list: { symbol, yahooSymbol }
    // Use price_symbol override when set (e.g. "VWRA.L" for LSE-listed ETFs).
    const seenAssets = new Map();
    for (const h of holdings) {
      if (!seenAssets.has(h.asset_id)) {
        const asset = Asset.findById(h.asset_id);
        // Skip assets with no meaningful calendar data on Yahoo Finance
        if (!asset) continue;
        if (["manual", "coingecko", "dolarapi"].includes(asset.price_source))
          continue;
        if (["crypto", "currency"].includes(asset.asset_type)) continue;
        const yahooSymbol = asset?.price_symbol?.trim() || h.symbol;
        seenAssets.set(h.asset_id, { symbol: h.symbol, yahooSymbol });
      }
    }
    const assetList = [...seenAssets.values()];

    logger.info(
      `[EconCal] Querying calendar for ${assetList.length} asset(s): ` +
        assetList
          .map(
            (a) =>
              `${a.symbol}${a.yahooSymbol !== a.symbol ? ` (${a.yahooSymbol})` : ""}`,
          )
          .join(", "),
    );

    const events = [];
    const fundStats = [];

    await Promise.allSettled(
      assetList.map(async ({ symbol, yahooSymbol }) => {
        try {
          logger.info(
            `[EconCal] Requesting quoteSummary for ${symbol} using Yahoo symbol "${yahooSymbol}"`,
          );
          const result = await yahooFinance.quoteSummary(yahooSymbol, {
            modules: [
              "calendarEvents",
              "summaryDetail",
              "defaultKeyStatistics",
            ],
          });

          const cal = result?.calendarEvents;
          const summary = result?.summaryDetail;
          const stats = result?.defaultKeyStatistics;
          logger.info(
            `[EconCal] ${yahooSymbol}: calendarEvents = ${JSON.stringify(cal)}`,
          );

          // Collect fund/ETF key statistics when available
          if (stats && (stats.totalAssets || stats.ytdReturn != null)) {
            fundStats.push({
              symbol: yahooSymbol,
              legal_type: stats.legalType ?? null,
              fund_family: stats.fundFamily ?? null,
              inception_date: stats.fundInceptionDate
                ? (stats.fundInceptionDate instanceof Date
                    ? stats.fundInceptionDate
                    : new Date(stats.fundInceptionDate)
                  )
                    .toISOString()
                    .split("T")[0]
                : null,
              total_assets: stats.totalAssets ?? null,
              nav_price: summary?.navPrice ?? null,
              yield: summary?.yield ?? null,
              ytd_return: stats.ytdReturn ?? null,
              three_year_avg_return: stats.threeYearAverageReturn ?? null,
              five_year_avg_return: stats.fiveYearAverageReturn ?? null,
              fifty_two_week_low: summary?.fiftyTwoWeekLow ?? null,
              fifty_two_week_high: summary?.fiftyTwoWeekHigh ?? null,
              fifty_day_avg: summary?.fiftyDayAverage ?? null,
              two_hundred_day_avg: summary?.twoHundredDayAverage ?? null,
            });
          }

          const toDate = (v) => {
            if (!v) return null;
            const d = v instanceof Date ? v : new Date(v);
            return isNaN(d) ? null : d.toISOString().split("T")[0];
          };

          // Earnings date(s)
          const earningsDates = cal?.earnings?.earningsDate;
          if (Array.isArray(earningsDates) && earningsDates.length > 0) {
            const date = toDate(earningsDates[0]);
            if (date) {
              events.push({
                symbol: yahooSymbol,
                type: "earnings",
                date,
                description: `${yahooSymbol} earnings report`,
                is_estimate: cal.earnings.isEarningsDateEstimate ?? false,
                eps_estimate: cal.earnings.earningsAverage ?? null,
                eps_low: cal.earnings.earningsLow ?? null,
                eps_high: cal.earnings.earningsHigh ?? null,
                revenue_estimate: cal.earnings.revenueAverage ?? null,
              });
            }
          }

          // Earnings call date
          const earningsCallDates = cal?.earnings?.earningsCallDate;
          if (
            Array.isArray(earningsCallDates) &&
            earningsCallDates.length > 0
          ) {
            const date = toDate(earningsCallDates[0]);
            if (date) {
              events.push({
                symbol: yahooSymbol,
                type: "earnings_call",
                date,
                description: `${yahooSymbol} earnings call`,
              });
            }
          }

          // Dividend ex-date
          const exDivDate = toDate(cal?.exDividendDate);
          if (exDivDate) {
            events.push({
              symbol: yahooSymbol,
              type: "dividend_ex_date",
              date: exDivDate,
              description: `${yahooSymbol} ex-dividend date`,
              amount: summary?.dividendRate ?? null,
            });
          }

          // Dividend payment date
          const divDate = toDate(cal?.dividendDate);
          if (divDate) {
            events.push({
              symbol: yahooSymbol,
              type: "dividend_payment",
              date: divDate,
              description: `${yahooSymbol} dividend payment`,
            });
          }
        } catch (err) {
          logger.warn(`[EconCal] ${yahooSymbol}: skipped — ${err.message}`);
        }
      }),
    );

    // Sort by date ascending, then by symbol
    events.sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      return d !== 0 ? d : a.symbol.localeCompare(b.symbol);
    });

    res.json({
      events,
      fund_stats: fundStats,
      symbols_queried: assetList.map((a) => a.yahooSymbol),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Income Analytics ─────────────────────────────────────────────────────────
/**
 * @swagger
 * /analytics/income:
 *   get:
 *     summary: Get income analytics (dividends, interest, coupons, rentals)
 *     description: Returns a full income report including summary totals, monthly and annual aggregations, per-asset breakdown, and individual income transactions.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Filter to a specific year. Omit for all-time data.
 *     responses:
 *       200:
 *         description: Income analytics report
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total_income:
 *                       type: number
 *                     total_dividends:
 *                       type: number
 *                     total_interest:
 *                       type: number
 *                     total_coupons:
 *                       type: number
 *                     total_rentals:
 *                       type: number
 *                     income_transaction_count:
 *                       type: integer
 *                     projected_annual:
 *                       type: number
 *                       nullable: true
 *                     best_month:
 *                       type: object
 *                       nullable: true
 *                     best_year:
 *                       type: object
 *                       nullable: true
 *                 by_month:
 *                   type: array
 *                 by_year:
 *                   type: array
 *                 by_asset:
 *                   type: array
 *                 transactions:
 *                   type: array
 *                 available_years:
 *                   type: array
 *                   items:
 *                     type: string
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get("/income", authMiddleware, validate(incomeValidation), (req, res) => {
  try {
    const { year, startDate, endDate } = req.query;
    const report = Transaction.getIncomeReport(
      req.user.id,
      year || null,
      startDate || null,
      endDate || null,
    );
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── 10.3 Admin Overview ──────────────────────────────────────────────────────
/**
 * @swagger
 * /analytics/admin/overview:
 *   get:
 *     summary: Get admin analytics overview
 *     tags: [Analytics]
 *     security:
 *       - adminAuth: []
 *     responses:
 *       200:
 *         description: Admin overview statistics
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.get("/admin/overview", authMiddleware, adminMiddleware, (req, res) => {
  try {
    const result = AnalyticsService.getAdminOverview();
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── 11. Benchmark Comparison ─────────────────────────────────────────────────
// Fetches a market index from Yahoo Finance (e.g. ^GSPC) and returns both
// portfolio NAV and index series normalized to base 100 for comparison.
/**
 * @swagger
 * /analytics/portfolio/benchmark:
 *   get:
 *     summary: Compare portfolio NAV against a market index
 *     description: Fetches a market index from Yahoo Finance and returns portfolio NAV and index series normalized to base 100.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Yahoo Finance index symbol (e.g. ^GSPC, ^IXIC)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 365
 *         description: Lookback days when startDate/endDate are not provided
 *     responses:
 *       200:
 *         description: Benchmark comparison series
 *       400:
 *         description: symbol is required
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get("/portfolio/benchmark", authMiddleware, async (req, res) => {
  try {
    const { symbol, startDate, endDate, days } = req.query;
    if (!symbol) {
      return res.status(400).json({ message: "symbol is required" });
    }
    const result = await AnalyticsService.getBenchmarkSeries(
      req.user.id,
      symbol,
      startDate || null,
      endDate || null,
      parseInt(days) || 365,
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── 12. Performance Attribution ──────────────────────────────────────────────
// Returns per-asset contribution to portfolio return over a date range
/**
 * @swagger
 * /analytics/portfolio/attribution:
 *   get:
 *     summary: Get per-asset contribution to portfolio return
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Performance attribution by asset
 *       400:
 *         description: startDate and endDate are required
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get("/portfolio/attribution", authMiddleware, (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "startDate and endDate are required" });
    }
    const result = AnalyticsService.getPerformanceAttribution(
      req.user.id,
      startDate,
      endDate,
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── 13. Correlation Matrix ────────────────────────────────────────────────────
// Returns Pearson correlation matrix of daily returns for held assets
/**
 * @swagger
 * /analytics/portfolio/correlation:
 *   get:
 *     summary: Get Pearson correlation matrix of daily returns for held assets
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 365
 *         description: Lookback window in days
 *     responses:
 *       200:
 *         description: Correlation matrix
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get("/portfolio/correlation", authMiddleware, (req, res) => {
  try {
    const { days } = req.query;
    const result = AnalyticsService.getCorrelationMatrix(
      req.user.id,
      parseInt(days) || 365,
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
