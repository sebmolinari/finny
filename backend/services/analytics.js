const logger = require("../config/logger");
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
  static getPortfolioAnalytics(userId, excludeAssetTypes = []) {
    // All holdings (unfiltered) — used for NAV, MWRR, CAGR, total portfolio value
    const allHoldings = this.getPortfolioHoldings(userId, true, []);

    // Filtered holdings — used for holdings_market_value, unrealized gain, and asset allocation
    const filteredHoldings =
      excludeAssetTypes.length > 0
        ? this.getPortfolioHoldings(userId, true, excludeAssetTypes)
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

  static getPortfolioPerformance(userId, days = 30, excludeAssetTypes = []) {
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
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split("T")[0]);
    }

    // --- Load transactions (ASC)
    const txStmt = db.prepare(`
    SELECT date, transaction_type, asset_id, quantity, total_amount
    FROM transactions
    WHERE user_id = ?
      AND date <= ?
    ORDER BY date ASC, id ASC
  `);
    const transactions = txStmt.all(userId, today);

    // --- Load prices (ASC)
    const priceStmt = db.prepare(`
    SELECT asset_id, date, price
    FROM price_data
    WHERE date <= ?
    ORDER BY asset_id ASC, date ASC
  `);
    const prices = priceStmt.all(today);

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

        txIndex++;
      }

      // Update prices up to this date
      for (const assetId of Object.keys(priceStreams)) {
        const stream = priceStreams[assetId];
        let idx = priceIndex[assetId];

        while (idx < stream.length && stream[idx].date <= date) {
          lastPrice[assetId] = stream[idx].price;
          idx++;
        }

        priceIndex[assetId] = idx;
      }

      // Value holdings
      let holdingsValue = 0;
      for (const [assetId, qtyValue] of Object.entries(holdings)) {
        if (qtyValue <= 0) continue;
        if (excludedAssetIds.has(assetId)) continue;
        const priceValue = lastPrice[assetId];
        if (!priceValue) continue;

        const quantity = fromValueScale(qtyValue, QUANTITY_SCALE);
        const price = fromValueScale(priceValue, PRICE_SCALE);
        holdingsValue += quantity * price;
      }

      performance.push({
        date,
        total_value: fromValueScale(cashValue, AMOUNT_SCALE) + holdingsValue,
      });
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
}

module.exports = AnalyticsService;
