const express = require("express");
const router = express.Router();
const AnalyticsService = require("../services/analytics");
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
    const dashboard = AnalyticsService.getPortfolioAnalytics(
      req.user.id,
      excludeTypes,
    );

    res.json(dashboard);
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
       *         description: Number of days to include in the performance history
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
      const { days, exclude } = req.query;
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

module.exports = router;
