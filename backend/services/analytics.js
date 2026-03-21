const logger = require("../utils/logger");
const Transaction = require("../models/Transaction");
const PriceData = require("../models/PriceData");
const Broker = require("../models/Broker");
const UserSettings = require("../models/UserSettings");
const {
  getTodayInTimezone,
  getYesterdayInTimezone,
} = require("../utils/dateUtils");
const {
  fromValueScale,
  PRICE_SCALE,
  QUANTITY_SCALE,
  AMOUNT_SCALE,
  MINIMUM_HOLDING_QUANTITY,
} = require("../utils/valueScale");

class AnalyticsService {
  // Calculate asset allocation by type
  static _calculateAssetAllocation(holdings) {
    const allocation = holdings.reduce((acc, holding) => {
      const type = holding.asset_type;
      if (!acc[type]) {
        acc[type] = {
          type,
          value: 0,
          count: 0,
        };
      }
      acc[type].value += holding.market_value;
      acc[type].count += 1;
      return acc;
    }, {});

    const totalValue = Object.values(allocation).reduce(
      (sum, a) => sum + a.value,
      0,
    );

    return Object.values(allocation).map((a) => ({
      ...a,
      percentage: totalValue > 0 ? (a.value / totalValue) * 100 : 0,
    }));
  }

  // Calculate daily P&L based on yesterday's prices
  static _calculateDailyPnL(userId, holdings) {
    const db = require("../config/database");
    const userSettings = UserSettings.findByUserId(userId);
    const yesterday = getYesterdayInTimezone(userSettings.timezone);

    let yesterdayMarketValue = 0;
    let todayMarketValue = 0;

    for (const holding of holdings) {
      // Today's market value (already calculated)
      todayMarketValue += holding.market_value;

      // Get yesterday's price for this asset
      const stmt = db.prepare(`
        SELECT price FROM price_data
        WHERE asset_id = ? AND date <= ?
        ORDER BY date DESC
        LIMIT 1
      `);
      const yesterdayPriceRow = stmt.get(holding.asset_id, yesterday);

      if (yesterdayPriceRow) {
        const yesterdayPrice = fromValueScale(
          yesterdayPriceRow.price,
          PRICE_SCALE,
        );
        yesterdayMarketValue += holding.total_quantity * yesterdayPrice;
      } else {
        // If no yesterday price, use today's price (no change)
        yesterdayMarketValue += holding.market_value;
      }
    }

    return todayMarketValue - yesterdayMarketValue;
  }

  // Get portfolio holdings with enriched data (prices, P&L, etc.)
  static getPortfolioHoldings(
    userId,
    hideZeroQuantity = true,
    excludeAssetTypes = [],
    groupByAsset = false,
  ) {
    let holdings = Transaction.getPortfolioHoldings(userId, hideZeroQuantity);

    // Group by asset if requested (before enrichment)
    if (groupByAsset) {
      const groupedMap = {};

      for (const holding of holdings) {
        if (!groupedMap[holding.asset_id]) {
          // First occurrence of this asset
          groupedMap[holding.asset_id] = {
            asset_id: holding.asset_id,
            symbol: holding.symbol,
            name: holding.name,
            asset_type: holding.asset_type,
            broker_id: null, // Grouped across brokers
            broker_name: null, // Grouped across brokers
            total_quantity: 0,
            cost_basis: 0,
            realized_gain: 0,
          };
        }

        // Aggregate values
        groupedMap[holding.asset_id].total_quantity += holding.total_quantity;
        groupedMap[holding.asset_id].cost_basis += holding.cost_basis;
        groupedMap[holding.asset_id].realized_gain += holding.realized_gain;
      }

      holdings = Object.values(groupedMap);
    }

    let enrichedHoldings = holdings.map((holding) => {
      const latestPrice = PriceData.getLatestPrice(holding.asset_id);
      const marketValue = latestPrice
        ? holding.total_quantity * latestPrice.price
        : 0;
      // Calculate yesterday's market value and daily P&L for this holding
      const db = require("../config/database");
      const userSettings = UserSettings.findByUserId(userId);
      const yesterday = getYesterdayInTimezone(userSettings.timezone);

      const priceStmt = db.prepare(`
        SELECT price FROM price_data
        WHERE asset_id = ? AND date <= ?
        ORDER BY date DESC
        LIMIT 1
      `);
      const yesterdayPriceRow = priceStmt.get(holding.asset_id, yesterday);
      let yesterdayMarketValue = 0;
      if (yesterdayPriceRow) {
        const yesterdayPrice = fromValueScale(
          yesterdayPriceRow.price,
          PRICE_SCALE,
        );
        yesterdayMarketValue = holding.total_quantity * yesterdayPrice;
      } else {
        yesterdayMarketValue = marketValue;
      }
      const dailyPnL = marketValue - yesterdayMarketValue;
      const unrealizedGain = marketValue - holding.cost_basis;
      const unrealizedGainPercent =
        holding.cost_basis > 0
          ? (unrealizedGain / holding.cost_basis) * 100
          : 0;

      return {
        asset_id: holding.asset_id,
        symbol: holding.symbol,
        name: holding.name,
        asset_type: holding.asset_type,
        broker_id: holding.broker_id,
        broker_name: holding.broker_name,
        total_quantity: holding.total_quantity,
        cost_basis: holding.cost_basis,
        market_price: latestPrice?.price || 0,
        market_value: marketValue,
        yesterday_market_value: yesterdayMarketValue,
        daily_pnl: dailyPnL,
        unrealized_gain: unrealizedGain,
        unrealized_gain_percent: unrealizedGainPercent,
        average_cost:
          holding.total_quantity > 0
            ? holding.cost_basis / holding.total_quantity
            : 0,
        realized_gain: holding.realized_gain,
      };
    });

    // Optionally filter out excluded asset types
    if (excludeAssetTypes && excludeAssetTypes.length > 0) {
      const excluded = excludeAssetTypes.map((t) => String(t).toLowerCase());
      enrichedHoldings = enrichedHoldings.filter(
        (h) => !excluded.includes(String(h.asset_type).toLowerCase()),
      );
    }

    enrichedHoldings.sort((a, b) => b.market_value - a.market_value);
    return enrichedHoldings;
  }

  // Get comprehensive portfolio analytics data
  static getPortfolioAnalytics(
    userId,
    excludeAssetTypes = [],
    groupByAsset = false,
  ) {
    // All holdings (unfiltered) — used for NAV, MWRR, CAGR, total portfolio value
    const allHoldings = this.getPortfolioHoldings(
      userId,
      true,
      [],
      groupByAsset,
    );

    // Filtered holdings — used for holdings_market_value, unrealized gain, and asset allocation
    const filteredHoldings =
      excludeAssetTypes.length > 0
        ? this.getPortfolioHoldings(
            userId,
            true,
            excludeAssetTypes,
            groupByAsset,
          )
        : allHoldings;

    // Transaction analytics
    const netInvested = Transaction.getNetInvested(userId);
    const netContributions = Transaction.getNetContributions(userId);
    const holdingsMarketValue = filteredHoldings.reduce(
      (sum, h) => sum + h.market_value,
      0,
    );
    const totalCostBasisHoldings = filteredHoldings.reduce(
      (sum, h) => sum + h.cost_basis,
      0,
    );
    const totalUnrealizedGain = filteredHoldings.reduce(
      (sum, h) => sum + h.unrealized_gain,
      0,
    );

    // Cash balance (from deposits/withdrawals and trading/dividends)
    const cashBalance = Transaction.getCashBalance(userId);

    // Get liquidity asset balance
    const liquidityBalance = Transaction.getLiquidityBalance(userId);

    // NAV and MWRR/CAGR use ALL holdings (including excluded types)
    const allHoldingsMarketValue = allHoldings.reduce(
      (sum, h) => sum + h.market_value,
      0,
    );
    const totalPortfolioValue = allHoldingsMarketValue + cashBalance;

    // Calculate MWRR and CAGR
    const mwrr = Transaction.calculateMWRR(userId, totalPortfolioValue);
    const cagr = Transaction.calculateCAGR(userId, totalPortfolioValue);

    // Asset allocation - aggregate per-type values and daily P&L from filtered holdings
    const typeMap = {};
    for (const h of filteredHoldings) {
      const type = h.asset_type;
      if (!typeMap[type]) {
        typeMap[type] = {
          type,
          value: 0,
          count: 0,
          yesterday_value: 0,
          daily_pnl: 0,
        };
      }
      typeMap[type].value += h.market_value;
      typeMap[type].count += 1;
      typeMap[type].yesterday_value +=
        h.yesterday_market_value || h.market_value;
      typeMap[type].daily_pnl += h.daily_pnl || 0;
    }

    const totalValue = Object.values(typeMap).reduce(
      (sum, a) => sum + a.value,
      0,
    );

    const assetAllocation = Object.values(typeMap).map((a) => ({
      type: a.type,
      value: a.value,
      count: a.count,
      percentage: totalValue > 0 ? (a.value / totalValue) * 100 : 0,
      daily_pnl: a.daily_pnl,
    }));

    // Daily P&L from filtered holdings only
    const dailyPnL = filteredHoldings.reduce(
      (sum, h) => sum + (h.daily_pnl || 0),
      0,
    );
    return {
      nav: totalPortfolioValue,
      transactions: {
        net_invested: netInvested, // Buys - Sells
        net_contributions: netContributions,
        holdings_market_value: holdingsMarketValue,
        daily_pnl: dailyPnL,
        cash_balance: cashBalance,
        liquidity_balance: liquidityBalance,
        unrealized_gain: totalUnrealizedGain,
        unrealized_gain_percent:
          totalCostBasisHoldings > 0
            ? (totalUnrealizedGain / totalCostBasisHoldings) * 100
            : 0,
        liquidity_percent:
          totalPortfolioValue > 0
            ? ((cashBalance + liquidityBalance) / totalPortfolioValue) * 100
            : 0,
        mwrr: mwrr,
        cagr: cagr,
        holdings: filteredHoldings,
        asset_allocation: assetAllocation,
      },
    };
  }

  static getPortfolioPerformance(
    userId,
    days = 30,
    excludeAssetTypes = [],
    startDate = null,
    endDate = null,
    debug = false,
  ) {
    const db = require("../config/database");
    const userSettings = UserSettings.findByUserId(userId);
    const today = getTodayInTimezone(userSettings.timezone);

    // Build set of excluded asset IDs
    let excludedAssetIds = new Set();
    if (excludeAssetTypes.length > 0) {
      const placeholders = excludeAssetTypes.map(() => "?").join(",");
      const excludedAssets = db
        .prepare(
          `SELECT id FROM assets WHERE LOWER(asset_type) IN (${placeholders})`,
        )
        .all(...excludeAssetTypes.map((t) => t.toLowerCase()));
      excludedAssetIds = new Set(excludedAssets.map((a) => String(a.id)));
    }

    // --- Build date range (ASC)
    const dates = [];
    if (startDate && endDate) {
      // Explicit start/end date range
      const sdObj = new Date(startDate);
      const edObj = new Date(endDate);
      for (let d = new Date(sdObj); d <= edObj; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split("T")[0]);
      }
    } else {
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split("T")[0]);
      }
    }

    const queryEndDate = endDate || today;

    // --- Load asset symbols (for debug mode)
    const assetMap = {};
    if (debug) {
      const assets = db.prepare(`SELECT id, symbol FROM assets`).all();
      for (const a of assets) assetMap[a.id] = a.symbol;
    }

    // --- Load transactions (ASC)
    const txStmt = db.prepare(`
    SELECT id, date, transaction_type, asset_id, broker_id, quantity, total_amount, notes
    FROM transactions
    WHERE user_id = ?
      AND date <= ?
    ORDER BY date ASC, id ASC
  `);
    const transactions = txStmt.all(userId, queryEndDate);

    // --- Load prices (ASC)
    const priceStmt = db.prepare(`
    SELECT asset_id, date, price
    FROM price_data
    WHERE date <= ?
    ORDER BY asset_id ASC, date ASC
  `);
    const prices = priceStmt.all(queryEndDate);

    // --- Group prices by asset
    const priceStreams = {};
    for (const p of prices) {
      if (!priceStreams[p.asset_id]) priceStreams[p.asset_id] = [];
      priceStreams[p.asset_id].push(p);
    }

    const priceIndex = {};
    const lastPrice = {};
    Object.keys(priceStreams).forEach((a) => (priceIndex[a] = 0));

    let txIndex = 0;
    let cashValue = 0;
    const holdings = {};

    const performance = [];

    // --- Walk forward in time
    for (const date of dates) {
      // Apply transactions up to this date
      const txsAppliedToday = [];
      while (
        txIndex < transactions.length &&
        transactions[txIndex].date <= date
      ) {
        const tx = transactions[txIndex];

        const amountValue = tx.total_amount || 0;
        const qtyValue = tx.quantity || 0;

        switch (tx.transaction_type) {
          case "deposit":
          case "sell":
          case "dividend":
          case "interest":
          case "rental":
          case "coupon":
            cashValue += amountValue;
            break;
          case "withdraw":
          case "buy":
            cashValue -= amountValue;
            break;
        }

        if (tx.transaction_type === "buy" || tx.transaction_type === "sell") {
          if (!holdings[tx.asset_id]) holdings[tx.asset_id] = 0;
          holdings[tx.asset_id] +=
            tx.transaction_type === "buy" ? qtyValue : -qtyValue;
        }

        if (debug) {
          txsAppliedToday.push({
            id: tx.id,
            date: tx.date,
            type: tx.transaction_type,
            asset_id: tx.asset_id,
            symbol: assetMap[tx.asset_id] || null,
            quantity:
              tx.quantity != null
                ? fromValueScale(tx.quantity, QUANTITY_SCALE)
                : null,
            total_amount:
              tx.total_amount != null
                ? fromValueScale(tx.total_amount, AMOUNT_SCALE)
                : null,
            notes: tx.notes || null,
          });
        }

        txIndex++;
      }

      // Update prices up to this date
      const priceChangesToday = {};
      for (const assetId of Object.keys(priceStreams)) {
        const stream = priceStreams[assetId];
        let idx = priceIndex[assetId];

        while (idx < stream.length && stream[idx].date <= date) {
          if (debug)
            priceChangesToday[assetId] = fromValueScale(
              stream[idx].price,
              PRICE_SCALE,
            );
          lastPrice[assetId] = stream[idx].price;
          idx++;
        }

        priceIndex[assetId] = idx;
      }

      // Value holdings
      let holdingsValue = 0;
      const holdingsBreakdown = [];
      for (const [assetId, qtyValue] of Object.entries(holdings)) {
        if (qtyValue <= 0) continue;
        if (excludedAssetIds.has(assetId)) continue;
        const priceValue = lastPrice[assetId];
        if (!priceValue) continue;

        const quantity = fromValueScale(qtyValue, QUANTITY_SCALE);
        const price = fromValueScale(priceValue, PRICE_SCALE);
        const value = quantity * price;
        holdingsValue += value;

        if (debug) {
          holdingsBreakdown.push({
            asset_id: Number(assetId),
            symbol: assetMap[assetId] || null,
            quantity,
            price,
            price_updated_today: priceChangesToday[assetId] !== undefined,
            value,
          });
        }
      }

      const entry = {
        date,
        total_value: fromValueScale(cashValue, AMOUNT_SCALE) + holdingsValue,
      };

      if (debug) {
        entry.cash_balance = fromValueScale(cashValue, AMOUNT_SCALE);
        entry.holdings_value = holdingsValue;
        entry.transactions_applied = txsAppliedToday;
        entry.holdings_breakdown = holdingsBreakdown.sort(
          (a, b) => b.value - a.value,
        );
      }

      performance.push(entry);
    }

    return performance;
  }

  // Detailed return calculations (MWRR & CAGR)
  static getReturnDetails(userId) {
    // Build current portfolio value (holdings + cash)
    const enrichedHoldings = this.getPortfolioHoldings(userId);
    const holdingsMarketValue = enrichedHoldings.reduce(
      (sum, h) => sum + h.market_value,
      0,
    );

    const cashBalance = Transaction.getCashBalance(userId);
    const currentTotalValue = holdingsMarketValue + cashBalance;

    // Compute detailed components
    const mwrrDetails = Transaction.calculateMWRRDetails(
      userId,
      currentTotalValue,
    );
    const cagrDetails = Transaction.calculateCAGRDetails(
      userId,
      currentTotalValue,
    );
    const cagrEvolution = Transaction.calculateCAGREvolution(userId);

    return {
      current_total_value: currentTotalValue,
      cash_balance: cashBalance,
      holdings_market_value: holdingsMarketValue,
      mwrr: mwrrDetails.mwrr,
      mwrr_cash_flows: mwrrDetails.cashFlows,
      mwrr_iterations: mwrrDetails.iterations,
      cagr: cagrDetails.cagr,
      cagr_details: cagrDetails,
      cagr_evolution: cagrEvolution,
    };
  }

  // Cash balance details
  static getCashBalanceDetails(userId) {
    return Transaction.getCashBalanceDetails(userId);
  }

  // Get broker summary
  static getBrokerHoldings(userId) {
    return Broker.getBrokerHoldings(userId);
  }

  // Get market trends with sparkline data (for all active assets)
  static getMarketTrends(userId, days = 30) {
    const userSettings = UserSettings.findByUserId(userId);
    const today = getTodayInTimezone(userSettings.timezone);

    const Asset = require("../models/Asset");

    // Get all active assets
    const assets = Asset.getAll({ includeInactive: false });

    // Calculate cutoff date
    const cutoffDate = new Date(today);
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
    const cutoffDateStr = cutoffDate.toISOString().split("T")[0];

    // Build trends with price data for each asset
    const trends = assets.map((asset) => {
      const latestPrice = PriceData.getLatestPrice(asset.id);

      // Get price history for sparkline
      const priceHistory = PriceData.findByAsset(asset.id, {
        startDate: cutoffDateStr,
        limit: parseInt(days) + 10,
      }).reverse(); // Reverse to get chronological order

      // Calculate price change percentage
      const firstPrice =
        priceHistory.length > 0
          ? priceHistory[0].price
          : latestPrice?.price || 0;
      const lastPrice = latestPrice?.price || 0;
      const priceChange =
        firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

      return {
        asset_id: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        asset_type: asset.asset_type,
        currency: asset.currency,
        current_price: latestPrice?.price || 0,
        price_date: latestPrice?.date,
        price_change_percent: priceChange,
        price_history: priceHistory.map((p) => ({
          date: p.date,
          price: p.price,
        })),
      };
    });

    return { trends, days: parseInt(days) };
  }

  // Tax report - holdings at year-end with FX conversion
  static getTaxReport(
    userId,
    year,
    excludeAssetTypes = [],
    excludeBrokers = [],
  ) {
    const db = require("../config/database");
    const UserSettings = require("../models/UserSettings");

    // Get FX rate asset from user settings
    const settings = UserSettings.findByUserId(userId);
    const fxRateAssetId = settings?.fx_rate_asset_id;

    if (!fxRateAssetId) {
      throw new Error(
        "FX Rate asset not configured in settings. Please configure FX Rate in Settings.",
      );
    }

    // Calculate end of year date
    const yearEndDate = `${year}-12-31`;

    // Build dynamic WHERE clause for filters
    let whereConditions = [
      "t.user_id = ?",
      "t.date <= ?",
      "t.transaction_type IN ('buy', 'sell')",
    ];
    let queryParams = [userId, yearEndDate];

    // Add asset type exclusions
    if (excludeAssetTypes.length > 0) {
      const placeholders = excludeAssetTypes.map(() => "?").join(", ");
      whereConditions.push(`a.asset_type NOT IN (${placeholders})`);
      queryParams.push(...excludeAssetTypes);
    }

    // Add broker exclusions
    if (excludeBrokers.length > 0) {
      const placeholders = excludeBrokers.map(() => "?").join(", ");
      whereConditions.push(`b.name NOT IN (${placeholders})`);
      queryParams.push(...excludeBrokers);
    }

    const whereClause = whereConditions.join(" AND ");

    // Get holdings at year-end
    const holdingsStmt = db.prepare(`
      SELECT 
        a.id as asset_id,
        a.symbol,
        a.name,
        a.asset_type,
        a.currency,
        b.name as broker_name,
        t.transaction_type,
        t.quantity
      FROM transactions t
      JOIN assets a ON t.asset_id = a.id
      LEFT JOIN brokers b ON t.broker_id = b.id
      WHERE ${whereClause}
    `);
    const holdingTransactions = holdingsStmt.all(...queryParams);

    // Aggregate by asset and broker (integer arithmetic)
    const holdingsMap = {};
    holdingTransactions.forEach((tx) => {
      const qtyValue = tx.quantity || 0;
      const signedQtyValue =
        tx.transaction_type === "buy" ? qtyValue : -qtyValue;

      const key = `${tx.asset_id}_${tx.broker_name || "null"}`;
      if (!holdingsMap[key]) {
        holdingsMap[key] = {
          asset_id: tx.asset_id,
          symbol: tx.symbol,
          name: tx.name,
          asset_type: tx.asset_type,
          currency: tx.currency,
          broker_name: tx.broker_name,
          quantityValue: 0,
        };
      }
      holdingsMap[key].quantityValue += signedQtyValue;
    });

    // Convert to float and filter out holdings with quantity <= MINIMUM_HOLDING_QUANTITY
    const holdings = Object.values(holdingsMap)
      .map((h) => ({
        ...h,
        quantity: fromValueScale(h.quantityValue, QUANTITY_SCALE),
      }))
      .filter((h) => h.quantity > MINIMUM_HOLDING_QUANTITY);

    // Get FX rate (USDARS_BNA) at year-end
    const fxRateStmt = db.prepare(`
      SELECT price FROM price_data
      WHERE asset_id = ? AND date <= ?
      ORDER BY date DESC
      LIMIT 1
    `);
    const fxRateResult = fxRateStmt.get(fxRateAssetId, yearEndDate);
    const usdArsBna = fxRateResult
      ? fromValueScale(fxRateResult.price, PRICE_SCALE)
      : 0;

    // Get asset symbol for FX rate
    const fxAssetStmt = db.prepare("SELECT symbol FROM assets WHERE id = ?");
    const fxAsset = fxAssetStmt.get(fxRateAssetId);

    // Process each holding
    const reportData = holdings.map((holding) => {
      // Get price at latest available date of the year
      const priceStmt = db.prepare(`
        SELECT price, date FROM price_data
        WHERE asset_id = ? AND date <= ?
        ORDER BY date DESC
        LIMIT 1
      `);
      const priceResult = priceStmt.get(holding.asset_id, yearEndDate);
      const price = priceResult
        ? fromValueScale(priceResult.price, PRICE_SCALE)
        : 0;
      const priceDate = priceResult?.date || null;

      // Calculate values
      const marketValue = holding.quantity * price;
      const priceInCcy = price * usdArsBna;
      const marketValueInCcy = marketValue * usdArsBna;

      return {
        asset_id: holding.asset_id,
        asset: holding.symbol,
        asset_name: holding.name,
        asset_type: holding.asset_type,
        currency: holding.currency,
        broker: holding.broker_name,
        quantity: holding.quantity,
        price: price,
        price_date: priceDate,
        market_value: marketValue,
        usdars_bna: usdArsBna,
        price_in_ccy: priceInCcy,
        market_value_in_ccy: marketValueInCcy,
      };
    });
    return {
      year: year,
      year_end_date: yearEndDate,
      fx_rate_asset: fxAsset?.symbol || "Unknown",
      fx_rate: usdArsBna,
      holdings: reportData,
      total_market_value: reportData.reduce(
        (sum, h) => sum + h.market_value,
        0,
      ),
      total_market_value_in_ccy: reportData.reduce(
        (sum, h) => sum + h.market_value_in_ccy,
        0,
      ),
    };
  }

  /**
   * Get rebalancing recommendations based on target allocations
   */
  static getRebalancingRecommendations(userId, excludeAssetTypes = []) {
    const AssetAllocationTarget = require("../models/AssetAllocationTarget");
    const UserSettings = require("../models/UserSettings");

    try {
      // Get user settings for rebalancing tolerance
      const userSettings = UserSettings.findByUserId(userId);
      const rebalancingTolerance = userSettings.rebalancing_tolerance;

      // Get current portfolio analytics (optionally excluding asset types)
      const portfolio = this.getPortfolioAnalytics(userId, excludeAssetTypes);
      const currentAllocation = portfolio.transactions.asset_allocation;
      const totalPortfolioValue = portfolio.nav;
      const holdings = portfolio.transactions.holdings;

      // Get target allocations (optionally excluding asset types)
      const targets = AssetAllocationTarget.getAllByUser(
        userId,
        excludeAssetTypes,
      );

      if (targets.length === 0) {
        return {
          has_targets: false,
          message: "No allocation targets defined",
          current_allocation: currentAllocation,
          targets: [],
          recommendations: [],
        };
      }

      // Separate asset-type and asset-level targets
      const assetTypeTargets = targets.filter(
        (t) => t.asset_type && !t.asset_id,
      );
      const assetLevelTargets = targets.filter(
        (t) => !t.asset_type && t.asset_id,
      );

      // Build recommendations for asset types
      const typeRecommendations = [];
      const targetMap = {};

      assetTypeTargets.forEach((t) => {
        targetMap[t.asset_type] = t.target_percentage;
      });

      // Get all asset types (combine current and target)
      const allAssetTypes = new Set([
        ...currentAllocation.map((a) => a.type),
        ...assetTypeTargets.map((t) => t.asset_type),
      ]);

      allAssetTypes.forEach((assetType) => {
        const current = currentAllocation.find((a) => a.type === assetType);
        const currentPercentage = current ? current.percentage : 0;
        const currentValue = current ? current.value : 0;
        const targetPercentage = targetMap[assetType] || 0;
        const targetValue = (targetPercentage / 100) * totalPortfolioValue;
        const difference = targetValue - currentValue;
        const differencePercentage = targetPercentage - currentPercentage;

        const isBalanced =
          Math.abs(differencePercentage) <= rebalancingTolerance;
        const action = isBalanced
          ? "HOLD"
          : difference > 0
            ? "BUY"
            : difference < 0
              ? "SELL"
              : "HOLD";

        typeRecommendations.push({
          level: "type",
          asset_type: assetType,
          current_value: currentValue,
          current_percentage: currentPercentage,
          target_percentage: targetPercentage,
          target_value: targetValue,
          difference: difference,
          difference_percentage: differencePercentage,
          action: action,
          is_balanced: isBalanced,
        });
      });

      // Build recommendations for individual assets
      // Asset-level targets are percentages within their asset type
      const assetRecommendations = [];

      assetLevelTargets.forEach((target) => {
        // Sum all holdings for this asset across all brokers
        const assetHoldings = holdings.filter(
          (h) => h.asset_id === target.asset_id,
        );
        const currentValue = assetHoldings.reduce(
          (sum, h) => sum + h.market_value,
          0,
        );

        // Get the asset type's allocation
        const assetType = target.asset_asset_type;
        const typeAllocation = currentAllocation.find(
          (a) => a.type === assetType,
        );
        const typeValue = typeAllocation ? typeAllocation.value : 0;
        const typeTargetPercentage = targetMap[assetType] || 0;
        const typeTargetValue =
          (typeTargetPercentage / 100) * totalPortfolioValue;

        // Calculate current percentage within asset type
        const currentPercentageWithinType =
          typeValue > 0 ? (currentValue / typeValue) * 100 : 0;

        // Calculate current percentage of total portfolio
        const currentPercentageOfTotal =
          totalPortfolioValue > 0
            ? (currentValue / totalPortfolioValue) * 100
            : 0;

        // Target percentage within asset type
        const targetPercentageWithinType = target.target_percentage;

        // Calculate target value (percentage of type's target value)
        const targetValue =
          (targetPercentageWithinType / 100) * typeTargetValue;

        // Target percentage of total portfolio
        const targetPercentageOfTotal =
          totalPortfolioValue > 0
            ? (targetValue / totalPortfolioValue) * 100
            : 0;

        const difference = targetValue - currentValue;
        const differencePercentageWithinType =
          targetPercentageWithinType - currentPercentageWithinType;

        const isBalanced =
          Math.abs(differencePercentageWithinType) <= rebalancingTolerance;
        const action = isBalanced
          ? "HOLD"
          : difference > 0
            ? "BUY"
            : difference < 0
              ? "SELL"
              : "HOLD";

        assetRecommendations.push({
          level: "asset",
          asset_id: target.asset_id,
          symbol: target.symbol,
          asset_name: target.asset_name,
          asset_type: target.asset_asset_type,
          current_value: currentValue,
          current_percentage: currentPercentageOfTotal,
          current_percentage_within_type: currentPercentageWithinType,
          target_percentage: targetPercentageOfTotal,
          target_percentage_within_type: targetPercentageWithinType,
          target_value: targetValue,
          difference: difference,
          difference_percentage: differencePercentageWithinType,
          action: action,
          is_balanced: isBalanced,
        });
      });

      // Combine and sort all recommendations
      const recommendations = [...typeRecommendations, ...assetRecommendations];
      recommendations.sort(
        (a, b) => Math.abs(b.difference) - Math.abs(a.difference),
      );

      // rebalancing_amount = ½ × Σ |current_weight − target_weight|

      const totalAbsDrift = typeRecommendations.reduce(
        (sum, r) => sum + Math.abs(r.difference_percentage),
        0,
      );

      const rebalanceIntensity = totalAbsDrift / 2;
      const isBalanced = rebalanceIntensity <= rebalancingTolerance;

      return {
        has_targets: true,
        is_balanced: isBalanced,
        rebalance_intensity: rebalanceIntensity,
        rebalancing_tolerance: rebalancingTolerance,
        total_portfolio_value: totalPortfolioValue,
        current_allocation: currentAllocation,
        targets: targets,
        recommendations: recommendations,
      };
    } catch (error) {
      logger.error(
        `Error calculating rebalancing recommendations: ${error.message}`,
      );
      throw error;
    }
  }
  /**
   * Compute NAV, MWRR, and simple return for an arbitrary date range.
   */
  static getDateRangeMetrics(userId, startDate, endDate) {
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const DAYS_PER_YEAR = 365.2425;
    const db = require("../config/database");

    // Get portfolio value on startDate and endDate using the performance series
    const startSeries = this.getPortfolioPerformance(
      userId,
      1,
      [],
      startDate,
      startDate,
    );
    const endSeries = this.getPortfolioPerformance(
      userId,
      1,
      [],
      endDate,
      endDate,
    );

    const startNav = startSeries[0]?.total_value || 0;
    const endNav = endSeries[0]?.total_value || 0;
    const navChange = endNav - startNav;
    const navChangePct = startNav > 0 ? (navChange / startNav) * 100 : 0;

    // Get cash flows (deposits/withdrawals) strictly within the range
    const { fromValueScale, AMOUNT_SCALE } = require("../utils/valueScale");
    const cfStmt = db.prepare(`
      SELECT date, transaction_type, total_amount
      FROM transactions
      WHERE user_id = ? AND date > ? AND date <= ?
        AND transaction_type IN ('deposit', 'withdraw')
      ORDER BY date ASC
    `);
    const cashFlows = cfStmt.all(userId, startDate, endDate);

    // Build IRR cash flows for sub-period MWRR
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const totalYears =
      (endDateObj - startDateObj) / (MS_PER_DAY * DAYS_PER_YEAR);

    const irrFlows = [{ years: 0, amount: -startNav }];

    for (const cf of cashFlows) {
      const cfDate = new Date(cf.date);
      const years = (cfDate - startDateObj) / (MS_PER_DAY * DAYS_PER_YEAR);
      const amount = fromValueScale(cf.total_amount, AMOUNT_SCALE);
      const signed = cf.transaction_type === "deposit" ? -amount : amount;
      irrFlows.push({ years, amount: signed });
    }

    irrFlows.push({ years: totalYears, amount: endNav });

    // Newton-Raphson IRR
    let rate = 0.1;
    if (startNav > 0) {
      for (let i = 0; i < 100; i++) {
        let npv = 0;
        let dnpv = 0;
        for (const cf of irrFlows) {
          const factor = Math.pow(1 + rate, cf.years);
          npv += cf.amount / factor;
          dnpv -= (cf.years * cf.amount) / (factor * (1 + rate));
        }
        if (Math.abs(npv) < 0.0001) break;
        if (dnpv === 0) break;
        rate -= npv / dnpv;
        if (rate < -0.99) rate = -0.99;
        if (rate > 10) rate = 10;
      }
    }

    return {
      start_date: startDate,
      end_date: endDate,
      start_nav: startNav,
      end_nav: endNav,
      nav_change: navChange,
      nav_change_pct: navChangePct,
      mwrr: startNav > 0 ? rate * 100 : 0,
    };
  }

  /**
   * Return the date of the earliest transaction for a user.
   */
  static getFirstTransactionDate(userId) {
    const db = require("../config/database");
    const row = db
      .prepare(
        "SELECT MIN(date) as first_date FROM transactions WHERE user_id = ?",
      )
      .get(userId);
    return row?.first_date || null;
  }

  /**
   * Simulate investing a deposit to move toward target allocations.
   * Returns a projection of how to split the deposit.
   */
  static simulateRebalancing(userId, depositAmount, excludeAssetTypes = []) {
    const rebalancing = this.getRebalancingRecommendations(
      userId,
      excludeAssetTypes,
    );

    if (!rebalancing.has_targets) {
      return {
        error: "No allocation targets defined",
        deposit_amount: depositAmount,
      };
    }

    const totalPortfolioValue = rebalancing.total_portfolio_value;

    // Use the filtered portfolio total (sum of included asset types only) as the
    // basis for deficit calculations so it is consistent with current_percentage.
    const typeRecs = (rebalancing.recommendations || []).filter(
      (r) => r.level === "type",
    );
    const filteredCurrentTotal = typeRecs.reduce(
      (sum, r) => sum + r.current_value,
      0,
    );
    const filteredProjectedTotal = filteredCurrentTotal + depositAmount;

    // Determine deficits: only invest in types that are underweight after
    // accounting for the deposit (current_value < target share of projected total).
    const allTypeDeficits = typeRecs.map((r) => {
      const targetValue = (r.target_percentage / 100) * filteredProjectedTotal;
      const deficit = Math.max(0, targetValue - r.current_value);
      return {
        ...r,
        projected_target_value: targetValue,
        deficit_in_projected: deficit,
      };
    });

    const totalDeficit = allTypeDeficits.reduce(
      (sum, r) => sum + r.deficit_in_projected,
      0,
    );

    // Allocate deposit proportionally to deficits, capped at each asset's deficit
    const allTypeAllocation = allTypeDeficits.map((r) => {
      const proportion =
        totalDeficit > 0 ? r.deficit_in_projected / totalDeficit : 0;
      const rawAllocation = proportion * depositAmount;
      const capped = Math.min(rawAllocation, r.deficit_in_projected);
      return { ...r, allocated_deposit: capped };
    });

    const allocatedTotal = allTypeAllocation.reduce(
      (sum, r) => sum + r.allocated_deposit,
      0,
    );
    const unallocated = depositAmount - allocatedTotal;

    // Split into buy vs. no-allocation buckets for the simulation output
    const buyAllocation = allTypeAllocation.filter(
      (r) => r.allocated_deposit > 0,
    );
    const holdRecs = allTypeAllocation.filter((r) => r.allocated_deposit === 0);

    const allSimulated = [
      ...buyAllocation.map((r) => ({
        asset_type: r.asset_type,
        current_value: r.current_value,
        current_percentage: r.current_percentage,
        target_percentage: r.target_percentage,
        allocated_deposit: r.allocated_deposit,
        projected_value: r.current_value + r.allocated_deposit,
        projected_percentage: 0, // computed below
        projected_target_value: r.projected_target_value,
        action: r.action,
      })),
      ...holdRecs.map((r) => ({
        asset_type: r.asset_type,
        current_value: r.current_value,
        current_percentage: r.current_percentage,
        target_percentage: r.target_percentage,
        allocated_deposit: 0,
        projected_value: r.current_value,
        projected_percentage: 0, // computed below
        projected_target_value: r.projected_target_value,
        action: r.action,
      })),
    ];

    // Use the sum of all projected values (filtered portfolio + allocated deposit)
    // as the denominator so projected_percentage is on the same basis as current_percentage.
    const projectedFilteredTotal = allSimulated.reduce(
      (sum, r) => sum + r.projected_value,
      0,
    );
    allSimulated.forEach((r) => {
      r.projected_percentage =
        projectedFilteredTotal > 0
          ? (r.projected_value / projectedFilteredTotal) * 100
          : 0;
    });

    allSimulated.sort((a, b) => b.projected_value - a.projected_value);

    return {
      deposit_amount: depositAmount,
      current_portfolio_value: totalPortfolioValue,
      projected_portfolio_value: totalPortfolioValue + depositAmount,
      total_allocated: allocatedTotal,
      remaining_unallocated: unallocated,
      simulation: allSimulated,
    };
  }

  // Realized gains / losses report with ST/LT classification and wash sale flag
  static getRealizedGainsReport(userId, year = null, ltDays = 365) {
    const positions = Transaction.getRealizedGainsReport(userId, year);

    let totalGain = 0;
    let shortTermGain = 0;
    let longTermGain = 0;
    let washSaleCount = 0;

    const enriched = positions.map((p) => {
      const isLongTerm = p.holding_days >= ltDays;
      totalGain += p.gain_loss;
      if (isLongTerm) longTermGain += p.gain_loss;
      else shortTermGain += p.gain_loss;
      if (p.is_wash_sale) washSaleCount++;
      return { ...p, is_long_term: isLongTerm };
    });

    return {
      positions: enriched,
      summary: {
        total_gain_loss: totalGain,
        short_term_gain_loss: shortTermGain,
        long_term_gain_loss: longTermGain,
        wash_sale_count: washSaleCount,
        position_count: enriched.length,
      },
    };
  }

  // Tax-loss harvesting suggestions: holdings with unrealized losses
  static getTaxHarvestingSuggestions(userId, marginalRate = 0.25, year = null) {
    const settings = UserSettings.findByUserId(userId);
    const effectiveRate = marginalRate ?? settings?.marginal_tax_rate ?? 0.25;

    const asOf = year ? `${year}-12-31` : null;
    const holdings = Transaction.getPortfolioHoldings(userId, true, asOf);

    // Get prices as-of year-end (or latest if no year specified)
    const suggestions = [];
    for (const h of holdings) {
      if (h.cost_basis <= 0 || h.total_quantity <= 0) continue;

      // Get price as of the specified date (or latest)
      const priceRow = asOf
        ? PriceData.getLatestPriceAsOf(h.asset_id, asOf)
        : PriceData.getLatestPrice(h.asset_id);
      if (!priceRow) continue;

      const currentPrice = priceRow.price;
      const marketValue = currentPrice * h.total_quantity;
      const unrealizedGain = marketValue - h.cost_basis;

      if (unrealizedGain < 0) {
        const potentialTaxSaving = Math.abs(unrealizedGain) * effectiveRate;
        suggestions.push({
          asset_id: h.asset_id,
          symbol: h.symbol,
          name: h.name,
          asset_type: h.asset_type,
          broker_name: h.broker_name,
          quantity: h.total_quantity,
          cost_basis: h.cost_basis,
          current_price: currentPrice,
          market_value: marketValue,
          unrealized_gain_loss: unrealizedGain,
          potential_tax_saving: potentialTaxSaving,
          marginal_rate: effectiveRate,
        });
      }
    }
    suggestions.sort((a, b) => a.unrealized_gain_loss - b.unrealized_gain_loss);
    return suggestions;
  }

  /**
   * Find buy/sell transactions where price data is missing or stale on the trade date.
   * Returns:
   *   status='no_price'    — no price row exists for this asset at all
   *   status='stale_price' — closest available price is from an earlier date
   *   status='ok'          — an exact price exists on the trade date
   * Only 'no_price' and 'stale_price' rows are returned.
   */
  static getMissingPrices(userId) {
    const db = require("../config/database");

    const rows = db
      .prepare(
        `
      SELECT
        t.id          AS transaction_id,
        t.date        AS trade_date,
        t.transaction_type,
        t.asset_id,
        a.symbol,
        a.name,
        a.asset_type,
        a.price_symbol,
        b.name        AS broker_name,
        (
          SELECT MAX(pd.date)
          FROM price_data pd
          WHERE pd.asset_id = t.asset_id
            AND pd.date <= t.date
        ) AS closest_price_date,
        (
          SELECT pd.price
          FROM price_data pd
          WHERE pd.asset_id = t.asset_id
            AND pd.date <= t.date
          ORDER BY pd.date DESC
          LIMIT 1
        ) AS closest_price_raw
      FROM transactions t
      JOIN assets a ON a.id = t.asset_id
      LEFT JOIN brokers b ON b.id = t.broker_id
      WHERE t.user_id = ?
        AND t.transaction_type IN ('buy', 'sell')
        AND t.asset_id IS NOT NULL
      ORDER BY t.date DESC, t.id DESC
    `,
      )
      .all(userId);

    const issues = [];
    for (const row of rows) {
      let status;
      if (!row.closest_price_date) {
        status = "no_price";
      } else if (row.closest_price_date < row.trade_date) {
        status = "stale_price";
      } else {
        status = "ok";
      }

      if (status !== "no_price") continue;

      issues.push({
        transaction_id: row.transaction_id,
        trade_date: row.trade_date,
        transaction_type: row.transaction_type,
        asset_id: row.asset_id,
        symbol: row.symbol,
        price_symbol: row.price_symbol || null,
        name: row.name,
        asset_type: row.asset_type,
        broker_name: row.broker_name,
        status,
        closest_price_date: row.closest_price_date || null,
        closest_price: row.closest_price_raw
          ? fromValueScale(row.closest_price_raw, PRICE_SCALE)
          : null,
        days_without_price: row.closest_price_date
          ? Math.round(
              (new Date(row.trade_date) - new Date(row.closest_price_date)) /
                (1000 * 60 * 60 * 24),
            )
          : null,
      });
    }

    return {
      total_issues: issues.length,
      issues,
    };
  }

  // ── 1.3 Volatility & Drawdown Metrics ──────────────────────────────────────
  static getVolatilityAndDrawdown(
    userId,
    days = 365,
    startDate = null,
    endDate = null,
  ) {
    const performance = this.getPortfolioPerformance(
      userId,
      days,
      [],
      startDate,
      endDate,
    );

    if (performance.length < 2) {
      return {
        nav_series: [],
        rolling_volatility: [],
        max_drawdown: null,
        recovery_days: null,
        recovery_date: null,
      };
    }

    // Daily returns
    const returns = [];
    for (let i = 1; i < performance.length; i++) {
      const prev = performance[i - 1].total_value;
      const curr = performance[i].total_value;
      const ret = prev > 0 ? (curr - prev) / prev : 0;
      returns.push({ date: performance[i].date, return: ret });
    }

    // Rolling 30-day annualised volatility
    const ROLLING_WINDOW = 30;
    const rolling_volatility = [];
    for (let i = ROLLING_WINDOW - 1; i < returns.length; i++) {
      const window = returns
        .slice(i - ROLLING_WINDOW + 1, i + 1)
        .map((r) => r.return);
      const mean = window.reduce((s, r) => s + r, 0) / window.length;
      const variance =
        window.reduce((s, r) => s + Math.pow(r - mean, 2), 0) /
        (window.length - 1);
      const annualisedVol = Math.sqrt(variance) * Math.sqrt(252) * 100;
      rolling_volatility.push({
        date: returns[i].date,
        volatility: annualisedVol,
      });
    }

    // Max drawdown
    let peak = performance[0].total_value;
    let peakDate = performance[0].date;
    let maxDrawdown = 0;
    let maxDrawdownStart = performance[0].date;
    let maxDrawdownEnd = performance[0].date;
    let maxDrawdownPeak = performance[0].total_value;
    let maxDrawdownTrough = performance[0].total_value;

    for (let i = 1; i < performance.length; i++) {
      const nav = performance[i].total_value;
      const date = performance[i].date;
      if (nav > peak) {
        peak = nav;
        peakDate = date;
      }
      const drawdown = peak > 0 ? (peak - nav) / peak : 0;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownStart = peakDate;
        maxDrawdownEnd = date;
        maxDrawdownPeak = peak;
        maxDrawdownTrough = nav;
      }
    }

    // Recovery: first date after trough where NAV >= peak
    let recoveryDate = null;
    let recoveryDays = null;
    for (let i = 0; i < performance.length; i++) {
      if (
        performance[i].date > maxDrawdownEnd &&
        performance[i].total_value >= maxDrawdownPeak
      ) {
        recoveryDate = performance[i].date;
        const endObj = new Date(maxDrawdownEnd);
        const recObj = new Date(recoveryDate);
        recoveryDays = Math.round((recObj - endObj) / (1000 * 60 * 60 * 24));
        break;
      }
    }

    const nav_series = performance.map((p) => ({
      date: p.date,
      value: p.total_value,
    }));

    return {
      nav_series,
      rolling_volatility,
      max_drawdown: {
        value: maxDrawdown * 100,
        start_date: maxDrawdownStart,
        end_date: maxDrawdownEnd,
        peak_value: maxDrawdownPeak,
        trough_value: maxDrawdownTrough,
      },
      recovery_days: recoveryDays,
      recovery_date: recoveryDate,
    };
  }

  // ── 2.1 Historical Holdings ─────────────────────────────────────────────────
  static getHistoricalHoldings(userId, asOfDate) {
    const db = require("../config/database");
    const holdings = Transaction.getPortfolioHoldings(userId, true, asOfDate);

    const enrichedHoldings = holdings.map((holding) => {
      const stmt = db.prepare(`
        SELECT price FROM price_data
        WHERE asset_id = ? AND date <= ?
        ORDER BY date DESC
        LIMIT 1
      `);
      const priceRow = stmt.get(holding.asset_id, asOfDate);
      const marketPrice = priceRow
        ? fromValueScale(priceRow.price, PRICE_SCALE)
        : 0;
      const marketValue = holding.total_quantity * marketPrice;
      const unrealizedGain = marketValue - holding.cost_basis;
      const unrealizedGainPct =
        holding.cost_basis > 0
          ? (unrealizedGain / holding.cost_basis) * 100
          : 0;
      return {
        ...holding,
        market_price: marketPrice,
        market_value: marketValue,
        unrealized_gain: unrealizedGain,
        unrealized_gain_percent: unrealizedGainPct,
        average_cost:
          holding.total_quantity > 0
            ? holding.cost_basis / holding.total_quantity
            : 0,
      };
    });

    enrichedHoldings.sort((a, b) => b.market_value - a.market_value);

    const totalMarketValue = enrichedHoldings.reduce(
      (s, h) => s + h.market_value,
      0,
    );
    const totalCostBasis = enrichedHoldings.reduce(
      (s, h) => s + h.cost_basis,
      0,
    );
    const totalUnrealizedGain = enrichedHoldings.reduce(
      (s, h) => s + h.unrealized_gain,
      0,
    );

    return {
      as_of_date: asOfDate,
      holdings: enrichedHoldings,
      summary: {
        total_market_value: totalMarketValue,
        total_cost_basis: totalCostBasis,
        total_unrealized_gain: totalUnrealizedGain,
        total_unrealized_gain_percent:
          totalCostBasis > 0 ? (totalUnrealizedGain / totalCostBasis) * 100 : 0,
      },
    };
  }

  // ── 10.3 Admin Overview ─────────────────────────────────────────────────────
  static getAdminOverview() {
    const db = require("../config/database");

    const userStats = db
      .prepare(
        `SELECT COUNT(*) as total_users,
          SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as active_users
         FROM users`,
      )
      .get();

    const txStats = db
      .prepare(
        `SELECT COUNT(*) as total_transactions,
          COUNT(DISTINCT user_id) as users_with_transactions
         FROM transactions`,
      )
      .get();

    const assetStats = db
      .prepare(`SELECT COUNT(*) as total_assets FROM assets WHERE active = 1`)
      .get();

    const brokerStats = db
      .prepare(`SELECT COUNT(*) as total_brokers FROM brokers`)
      .get();

    const priceStats = db
      .prepare(
        `SELECT MAX(date) as last_price_date, COUNT(*) as total_price_records
         FROM price_data`,
      )
      .get();

    const recentPriceRefreshes = db
      .prepare(
        `SELECT action_type, username, created_at, success, error_message
         FROM audit_logs
         WHERE action_type IN ('price_refresh', 'price_refresh_all', 'refresh_prices')
         ORDER BY created_at DESC
         LIMIT 10`,
      )
      .all();

    // Per-asset failure info from error_message field in recent failed refreshes
    const failedRefreshes = db
      .prepare(
        `SELECT username, error_message, created_at
         FROM audit_logs
         WHERE action_type IN ('price_refresh', 'price_refresh_all', 'refresh_prices')
           AND success = 0
         ORDER BY created_at DESC
         LIMIT 20`,
      )
      .all();

    // Users with no transactions
    const usersNoTx = db
      .prepare(
        `SELECT COUNT(*) as count
         FROM users
         WHERE id NOT IN (SELECT DISTINCT user_id FROM transactions)`,
      )
      .get();

    // Price coverage: how many active assets have at least one price record
    const priceCoverage = db
      .prepare(
        `SELECT
           COUNT(DISTINCT pd.asset_id) as assets_with_prices
         FROM price_data pd
         JOIN assets a ON a.id = pd.asset_id AND a.active = 1`,
      )
      .get();

    // Top users by transaction count
    const topUsers = db
      .prepare(
        `SELECT u.username, u.role, COUNT(t.id) as tx_count
         FROM users u
         LEFT JOIN transactions t ON t.user_id = u.id
         GROUP BY u.id, u.username, u.role
         ORDER BY tx_count DESC
         LIMIT 5`,
      )
      .all();

    // Recent user registrations
    const recentRegistrations = db
      .prepare(
        `SELECT username, email, role, active, created_at
         FROM users
         ORDER BY created_at DESC
         LIMIT 5`,
      )
      .all();

    // Recent general audit activity (all types)
    const recentAudit = db
      .prepare(
        `SELECT action_type, username, table_name, record_id, ip_address, success, error_message, created_at
         FROM audit_logs
         ORDER BY created_at DESC
         LIMIT 10`,
      )
      .all();

    // Stale assets: active assets with no price data in the last 7 days
    const staleAssets = db
      .prepare(
        `SELECT a.symbol, a.name, a.asset_type, MAX(pd.date) as last_price_date
         FROM assets a
         LEFT JOIN price_data pd ON pd.asset_id = a.id
         WHERE a.active = 1
         GROUP BY a.id, a.symbol, a.name, a.asset_type
         HAVING last_price_date IS NULL OR last_price_date < date('now', '-7 days')
         ORDER BY last_price_date ASC
         LIMIT 20`,
      )
      .all();

    // Recent scheduler run history
    const recentSchedulerRuns = db
      .prepare(
        `SELECT s.name as scheduler_name, s.type, si.scheduled_run_at, si.executed_at,
                si.status, si.attempt, si.error_message
         FROM scheduler_instances si
         JOIN schedulers s ON s.id = si.scheduler_id
         ORDER BY si.created_at DESC
         LIMIT 10`,
      )
      .all();

    // Schema migrations applied
    const schemaMigrations = db
      .prepare(
        `SELECT filename, applied_at FROM schema_version ORDER BY applied_at ASC`,
      )
      .all();

    return {
      users: {
        total: userStats.total_users,
        active: userStats.active_users,
        no_transactions: usersNoTx.count,
      },
      transactions: {
        total: txStats.total_transactions,
        users_with_transactions: txStats.users_with_transactions,
      },
      assets: {
        total: assetStats.total_assets,
        with_prices: priceCoverage.assets_with_prices,
      },
      brokers: {
        total: brokerStats.total_brokers,
      },
      price_data: {
        last_price_date: priceStats.last_price_date,
        total_records: priceStats.total_price_records,
      },
      recent_price_refreshes: recentPriceRefreshes,
      failed_refreshes: failedRefreshes,
      top_users: topUsers,
      recent_registrations: recentRegistrations,
      recent_audit: recentAudit,
      stale_assets: staleAssets,
      recent_scheduler_runs: recentSchedulerRuns,
      schema_migrations: schemaMigrations,
    };
  }
}

module.exports = AnalyticsService;
