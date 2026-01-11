const db = require("../config/database");
const {
  QUANTITY_SCALE,
  PRICE_SCALE,
  FEE_SCALE,
  AMOUNT_SCALE,
  toValueScale,
  fromValueScale,
} = require("../utils/valueScale");

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DAYS_PER_YEAR = 365.2425; // Tropical year for higher precision

class Transaction {
  static create(userId, data, createdBy) {
    const {
      asset_id,
      broker_id,
      date,
      transaction_type,
      quantity,
      price,
      fee,
      total_amount,
      notes,
    } = data;

    // Convert floats to value/scale
    const _qty = toValueScale(quantity, QUANTITY_SCALE);
    const _price = toValueScale(price, PRICE_SCALE);
    const _fee = toValueScale(fee, FEE_SCALE);
    const _total = toValueScale(total_amount, AMOUNT_SCALE);

    const stmt = db.prepare(`
      INSERT INTO transactions 
      (user_id, asset_id, broker_id, date, transaction_type, quantity, price, fee, total_amount, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      userId,
      asset_id,
      broker_id,
      date,
      transaction_type,
      _qty.value,
      _price.value,
      _fee.value,
      _total.value,
      notes,
      createdBy
    );
    return result.lastInsertRowid;
  }

  static update(id, userId, data, updatedBy) {
    const {
      asset_id,
      broker_id,
      date,
      transaction_type,
      quantity,
      price,
      fee,
      total_amount,
      notes,
    } = data;

    // Convert floats to value/scale
    const _qty = toValueScale(quantity, QUANTITY_SCALE);
    const _price = toValueScale(price, PRICE_SCALE);
    const _total = toValueScale(total_amount, AMOUNT_SCALE);
    const _fee = toValueScale(fee, FEE_SCALE);

    const stmt = db.prepare(`
      UPDATE transactions 
      SET asset_id = ?, broker_id = ?, date = ?, transaction_type = ?, quantity = ?, 
          price = ?, fee = ?, total_amount = ?, notes = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `);

    const result = stmt.run(
      asset_id,
      broker_id,
      date,
      transaction_type,
      _qty.value,
      _price.value,
      _fee.value,
      _total.value,
      notes,
      updatedBy,
      id,
      userId
    );
    return result.changes > 0;
  }

  static delete(id, userId) {
    const stmt = db.prepare(
      "DELETE FROM transactions WHERE id = ? AND user_id = ?"
    );
    const result = stmt.run(id, userId);
    return result.changes > 0;
  }

  // Helper: Map DB row to API response (convert integer to float using scale constants)
  static _mapRowToApi(row) {
    if (!row) return null;
    return {
      ...row,
      quantity: fromValueScale(row.quantity, QUANTITY_SCALE),
      price: fromValueScale(row.price, PRICE_SCALE),
      fee: fromValueScale(row.fee, FEE_SCALE),
      total_amount: fromValueScale(row.total_amount, AMOUNT_SCALE),
    };
  }

  static findById(id, userId) {
    const stmt = db.prepare(`
      SELECT 
        it.*,
        a.symbol,
        a.name as asset_name,
        a.asset_type,
        b.name as broker_name
      FROM transactions it
      LEFT JOIN assets a ON it.asset_id = a.id
      LEFT JOIN brokers b ON it.broker_id = b.id
      WHERE it.id = ? AND it.user_id = ?
    `);
    const row = stmt.get(id, userId);
    return Transaction._mapRowToApi(row);
  }

  static findByUser(userId, options = {}) {
    const {
      page = 1,
      limit = 50,
      assetId,
      startDate,
      endDate,
      transactionType,
    } = options;
    const offset = (page - 1) * limit;

    let whereConditions = ["it.user_id = ?"];
    let params = [userId];

    if (assetId) {
      whereConditions.push("it.asset_id = ?");
      params.push(assetId);
    }

    if (startDate) {
      whereConditions.push("it.date >= ?");
      params.push(startDate);
    }

    if (endDate) {
      whereConditions.push("it.date <= ?");
      params.push(endDate);
    }

    if (transactionType) {
      whereConditions.push("it.transaction_type = ?");
      params.push(transactionType);
    }

    const whereClause = whereConditions.join(" AND ");

    // Get total count
    const countStmt = db.prepare(
      `SELECT COUNT(*) as total FROM transactions it WHERE ${whereClause}`
    );
    const { total } = countStmt.get(...params);

    // Get paginated data
    const dataStmt = db.prepare(`
      SELECT 
        it.*,
        a.symbol,
        a.name as asset_name,
        a.asset_type,
        b.name as broker_name
      FROM transactions it
      LEFT JOIN assets a ON it.asset_id = a.id
      LEFT JOIN brokers b ON it.broker_id = b.id
      WHERE ${whereClause}
      ORDER BY it.date DESC, it.id DESC
      LIMIT ? OFFSET ?
    `);

    const rows = dataStmt.all(...params, limit, offset);

    return {
      data: rows.map(Transaction._mapRowToApi),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Calculate FIFO cost basis for portfolio holdings and realized gains in a single pass
  static getPortfolioHoldings(userId, hideZeroQuantity = true) {
    // Get all asset-broker combinations with transactions
    const assetBrokerStmt = db.prepare(`
      SELECT DISTINCT 
        a.id as asset_id, 
        a.symbol, 
        a.name, 
        a.asset_type,
        it.broker_id,
        b.name as broker_name
      FROM transactions it
      JOIN assets a ON it.asset_id = a.id
      LEFT JOIN brokers b ON it.broker_id = b.id
      WHERE it.user_id = ?
    `);
    const assetBrokers = assetBrokerStmt.all(userId);

    const holdings = [];

    for (const ab of assetBrokers) {
      // Get all buy and sell transactions for this asset-broker combination in chronological order
      const transStmt = db.prepare(`
        SELECT transaction_type, quantity, price, total_amount, date
        FROM transactions
        WHERE user_id = ? AND asset_id = ? AND broker_id = ? AND transaction_type IN ('buy', 'sell')
        ORDER BY date ASC, id ASC
      `);
      const transactions = transStmt.all(userId, ab.asset_id, ab.broker_id);

      // Calculate FIFO: both remaining holdings and realized gains from sales
      // Use integer arithmetic throughout, convert to float only for final results
      const fifoLots = []; // Queue of {quantityValue, pricePerUnitValue, totalCostValue} in integer form
      let realizedGainValue = 0;
      let costBasisSoldValue = 0;
      let proceedsFromSalesValue = 0;

      for (const txn of transactions) {
        // Keep values as integers
        const quantityValue = txn.quantity;
        const priceValue = txn.price;
        const totalAmountValue = txn.total_amount;
        if (txn.transaction_type === "buy") {
          // Add new lot to the queue (integer values)
          fifoLots.push({
            quantityValue: quantityValue,
            pricePerUnitValue: priceValue,
            totalCostValue: totalAmountValue,
          });
        } else if (txn.transaction_type === "sell") {
          // Remove shares from oldest lots first (FIFO) - all integer arithmetic
          let remainingToSellValue = quantityValue;
          let costOfSoldValue = 0;

          while (remainingToSellValue > 0 && fifoLots.length > 0) {
            const oldestLot = fifoLots[0];
            // Calculate cost per share in integer space: (totalCost * QUANTITY_SCALE) / quantity
            // This preserves precision

            if (oldestLot.quantityValue <= remainingToSellValue) {
              // Sell entire lot
              costOfSoldValue += oldestLot.totalCostValue;
              remainingToSellValue -= oldestLot.quantityValue;
              fifoLots.shift(); // Remove the lot
            } else {
              // Partial sale from this lot
              // Cost of partial sale = (soldFromLot / totalQuantity) * totalCost
              // In integer: (soldFromLot * totalCost) / totalQuantity
              const soldFromLotValue = remainingToSellValue;
              const costOfPartialSaleValue = Math.round(
                (soldFromLotValue * oldestLot.totalCostValue) /
                  oldestLot.quantityValue
              );

              costOfSoldValue += costOfPartialSaleValue;
              oldestLot.quantityValue -= soldFromLotValue;
              oldestLot.totalCostValue -= costOfPartialSaleValue;
              remainingToSellValue = 0;
            }
          }

          // Track realized gains (integer arithmetic)
          const saleProceedsValue = totalAmountValue;
          realizedGainValue += saleProceedsValue - costOfSoldValue;
          costBasisSoldValue += costOfSoldValue;
          proceedsFromSalesValue += saleProceedsValue;
        }
      }

      // Sum up remaining lots (integer arithmetic)
      const totalQuantityValue = fifoLots.reduce(
        (sum, lot) => sum + lot.quantityValue,
        0
      );
      const costBasisValue = fifoLots.reduce(
        (sum, lot) => sum + lot.totalCostValue,
        0
      );

      // Convert to floats only at the end
      const totalQuantity = fromValueScale(totalQuantityValue, QUANTITY_SCALE);
      const costBasis = fromValueScale(costBasisValue, AMOUNT_SCALE);
      const realizedGain = fromValueScale(realizedGainValue, AMOUNT_SCALE);

      // Apply quantity filter based on hideZeroQuantity parameter
      // If hideZeroQuantity is true, filter to show only quantity > 0.00001
      // If hideZeroQuantity is false, show everything (no filtering)
      const shouldInclude = hideZeroQuantity ? totalQuantity > 0.00001 : true;

      if (shouldInclude) {
        holdings.push({
          asset_id: ab.asset_id,
          symbol: ab.symbol,
          name: ab.name,
          asset_type: ab.asset_type,
          broker_id: ab.broker_id,
          broker_name: ab.broker_name,
          total_quantity: totalQuantity,
          cost_basis: costBasis,
          realized_gain: realizedGain,
        });
      }
    }

    // Sort by cost basis descending
    holdings.sort((a, b) => b.cost_basis - a.cost_basis);

    return holdings;
  }

  static getAssetBrokerBalance(userId, assetId, brokerId) {
    const stmt = db.prepare(`
      SELECT 
        transaction_type,
        quantity
      FROM transactions
      WHERE user_id = ? AND asset_id = ? AND broker_id = ?
    `);
    const transactions = stmt.all(userId, assetId, brokerId);

    // Do arithmetic with integers, not floats
    let balanceValue = 0;

    for (const t of transactions) {
      const qty = t.quantity || 0;
      if (t.transaction_type === "buy") {
        balanceValue += qty;
      } else if (t.transaction_type === "sell") {
        balanceValue -= qty;
      }
    }

    // Convert to float only at the end
    const balance = fromValueScale(balanceValue, QUANTITY_SCALE);
    return balance;
  }

  // Net invested reflects portfolio exposure funded by buys minus sells.
  // Example: buy 10, sell 10, buy 10 => net_invested = 10 (not 20).
  static getNetInvested(userId) {
    const stmt = db.prepare(`
      SELECT 
        transaction_type,
        total_amount
      FROM transactions
      WHERE user_id = ?
    `);
    const transactions = stmt.all(userId);

    let netInvestedValue = 0;
    for (const t of transactions) {
      const amountValue = t.total_amount || 0;
      if (t.transaction_type === "buy") {
        netInvestedValue += amountValue;
      } else if (t.transaction_type === "sell") {
        netInvestedValue -= amountValue;
      }
    }
    return fromValueScale(netInvestedValue, AMOUNT_SCALE);
  }

  // Net contributions reflect external money added to the portfolio.
  // Deposits increase, withdrawals decrease; trading and dividends excluded.
  static getNetContributions(userId) {
    const stmt = db.prepare(`
      SELECT 
        transaction_type,
        total_amount
      FROM transactions
      WHERE user_id = ?
    `);
    const transactions = stmt.all(userId);

    let netContributionsValue = 0;
    for (const t of transactions) {
      const amountValue = t.total_amount || 0;
      if (t.transaction_type === "deposit") {
        netContributionsValue += amountValue;
      } else if (t.transaction_type === "withdraw") {
        netContributionsValue -= amountValue;
      }
    }
    return fromValueScale(netContributionsValue, AMOUNT_SCALE);
  }

  static getAllTransactionsForMWRR(userId) {
    const stmt = db.prepare(`
      SELECT 
        date,
        transaction_type,
        total_amount
      FROM transactions
      WHERE user_id = ? AND transaction_type IN ('deposit', 'withdraw')
      ORDER BY date ASC
    `);
    const rows = stmt.all(userId);
    return rows.map((row) => ({
      date: row.date,
      transaction_type: row.transaction_type,
      total_amount: fromValueScale(row.total_amount, AMOUNT_SCALE),
    }));
  }

  static getCashBalance(userId) {
    const stmt = db.prepare(`
      SELECT 
        transaction_type,
        total_amount
      FROM transactions
      WHERE user_id = ?
    `);
    const transactions = stmt.all(userId);

    let cashBalanceValue = 0;
    for (const t of transactions) {
      const amountValue = t.total_amount || 0;
      switch (t.transaction_type) {
        case "deposit":
        case "sell":
        case "dividend":
        case "interest":
        case "coupon":
          cashBalanceValue += amountValue;
          break;
        case "withdraw":
        case "buy":
          cashBalanceValue -= amountValue;
          break;
      }
    }
    return fromValueScale(cashBalanceValue, AMOUNT_SCALE);
  }

  // Get liquidity balance for a specific asset (e.g., money market funds)
  static getLiquidityBalance(userId) {
    // Get liquidity asset ID from user settings
    const UserSettings = require("./UserSettings");
    const settings = UserSettings.findByUserId(userId);
    const liquidityAssetId = settings?.liquidity_asset_id;

    if (!liquidityAssetId) {
      return 0;
    }

    const stmt = db.prepare(`
      SELECT 
        transaction_type,
        quantity
      FROM transactions
      WHERE user_id = ? AND asset_id = ?
    `);
    const transactions = stmt.all(userId, liquidityAssetId);

    let quantityValue = 0;
    for (const t of transactions) {
      const qtyValue = t.quantity || 0;
      if (t.transaction_type === "buy") {
        quantityValue += qtyValue;
      } else if (t.transaction_type === "sell") {
        quantityValue -= qtyValue;
      }
    }

    const quantity = fromValueScale(quantityValue, QUANTITY_SCALE);

    // Get latest price for the liquidity asset
    const PriceData = require("./PriceData");
    const latestPrice = PriceData.getLatestPrice(liquidityAssetId);
    const price = latestPrice?.price || 1; // Default to 1 if no price available

    return quantity * price;
  }

  // Calculate Money-Weighted Rate of Return (MWRR/IRR)
  // Only considers deposits and withdrawals (cash flows in/out of portfolio)
  static calculateMWRR(userId, currentValue) {
    const transactions = this.getAllTransactionsForMWRR(userId);
    if (transactions.length === 0) return 0;

    const today = new Date();
    const startDate = new Date(transactions[0].date);

    const cashFlows = transactions.map((t) => {
      const date = new Date(t.date);
      const years = (date - startDate) / (MS_PER_DAY * DAYS_PER_YEAR);

      let amount = 0;
      if (t.transaction_type === "deposit") {
        amount = -t.total_amount; // Outflow (money into portfolio)
      } else if (t.transaction_type === "withdraw") {
        amount = t.total_amount; // Inflow (money out of portfolio)
      }

      return { years, amount };
    });

    // Add current value as final inflow at today's time offset
    const currentYears = (today - startDate) / (MS_PER_DAY * DAYS_PER_YEAR);
    cashFlows.push({ years: currentYears, amount: currentValue });

    // Newton-Raphson method to find IRR
    let rate = 0.1; // Initial guess 10%
    const maxIterations = 100;
    const tolerance = 0.0001;

    for (let i = 0; i < maxIterations; i++) {
      let npv = 0;
      let dnpv = 0;

      for (const cf of cashFlows) {
        const factor = Math.pow(1 + rate, cf.years);
        npv += cf.amount / factor;
        dnpv -= (cf.years * cf.amount) / (factor * (1 + rate));
      }

      if (Math.abs(npv) < tolerance) {
        return rate * 100; // Convert to percentage
      }

      rate = rate - npv / dnpv;

      // Bounds checking
      if (rate < -0.99) rate = -0.99;
      if (rate > 10) rate = 10;
    }

    return rate * 100;
  }

  // Detailed MWRR with cash flows and iteration steps
  static calculateMWRRDetails(userId, currentValue) {
    const transactions = this.getAllTransactionsForMWRR(userId);
    if (transactions.length === 0) {
      return { mwrr: 0, cashFlows: [], iterations: [] };
    }

    const today = new Date();
    const startDate = new Date(transactions[0].date);

    const cashFlows = transactions.map((t) => {
      const date = new Date(t.date);
      const years = (date - startDate) / (MS_PER_DAY * DAYS_PER_YEAR);

      let signed = 0;
      if (t.transaction_type === "deposit") {
        signed = -t.total_amount;
      } else if (t.transaction_type === "withdraw") {
        signed = t.total_amount;
      }

      return {
        date: t.date,
        type: t.transaction_type,
        amount: t.total_amount,
        yearsSinceStart: years,
        signedAmount: signed,
      };
    });

    // Add current value as final inflow at t=0
    cashFlows.push({
      date: today.toISOString().split("T")[0],
      type: "current_value",
      amount: currentValue,
      yearsSinceStart: (today - startDate) / (MS_PER_DAY * DAYS_PER_YEAR),
      signedAmount: currentValue,
    });

    // Newton-Raphson iterations
    let rate = 0.1; // 10% guess
    const maxIterations = 100;
    const tolerance = 0.0001;
    const iterations = [];

    for (let i = 0; i < maxIterations; i++) {
      let npv = 0;
      let dnpv = 0;

      for (const cf of cashFlows) {
        const factor = Math.pow(1 + rate, cf.yearsSinceStart);
        npv += cf.signedAmount / factor;
        dnpv -= (cf.yearsSinceStart * cf.signedAmount) / (factor * (1 + rate));
      }

      iterations.push({ iteration: i + 1, rate, npv });

      if (Math.abs(npv) < tolerance) {
        return { mwrr: rate * 100, cashFlows, iterations };
      }

      rate = rate - npv / dnpv;
      if (rate < -0.99) rate = -0.99;
      if (rate > 10) rate = 10;
    }

    return { mwrr: rate * 100, cashFlows, iterations };
  }

  // Calculate Compound Annual Growth Rate (CAGR)
  // Year-over-year annualized return from beginning to current value
  static calculateCAGR(userId) {
    const evolution = this.calculateCAGREvolution(userId);
    if (evolution.length === 0) return 0;

    // Return the CAGR from the last year in evolution
    const lastEntry = evolution[evolution.length - 1];
    return lastEntry.cagr !== null ? lastEntry.cagr : 0;
  }

  // Detailed CAGR components
  static calculateCAGRDetails(userId, currentValue) {
    const evolution = this.calculateCAGREvolution(userId);
    if (evolution.length === 0) {
      return {
        cagr: 0,
        firstDate: null,
        years: 0,
        netDeposits: 0,
        endingValue: currentValue,
        formula: "CAGR = (Year-End MTM / First Year MTM)^(1/years) - 1",
      };
    }

    // Use the last evolution entry's CAGR and MTM
    const lastEntry = evolution[evolution.length - 1];
    const firstEntry = evolution[0];
    const transactions = this.getAllTransactionsForMWRR(userId);
    const firstDate = new Date(transactions[0].date);
    const today = new Date();
    const years = (today - firstDate) / (MS_PER_DAY * DAYS_PER_YEAR);

    // Calculate net deposits for reference
    let netDeposits = 0;
    for (const t of transactions) {
      if (t.transaction_type === "deposit") netDeposits += t.total_amount;
      else if (t.transaction_type === "withdraw") netDeposits -= t.total_amount;
    }

    return {
      cagr: lastEntry.cagr !== null ? lastEntry.cagr : 0,
      firstDate: transactions[0].date,
      years,
      netDeposits,
      endingValue: currentValue,
      formula: `CAGR = (${lastEntry.year} Year-End MTM / ${
        firstEntry.year
      } Year-End MTM)^(1/${lastEntry.year - firstEntry.year}) - 1`,
    };
  }

  // Calculate yearly CAGR evolution
  // Returns array of {year, mtm, cagr} showing portfolio value and CAGR at each year-end
  static calculateCAGREvolution(userId) {
    const transactions = this.getAllTransactionsForMWRR(userId);
    if (transactions.length === 0) return [];

    const firstDate = new Date(transactions[0].date);
    const firstYear = firstDate.getFullYear();
    const currentYear = new Date().getFullYear();

    const evolution = [];
    let firstYearMTM = null;

    for (let year = firstYear; year <= currentYear; year++) {
      const yearEndDateStr = `${year}-12-31`; // Dec 31 of that year as calendar date

      // Calculate net contributions up to year-end
      let netDeposits = 0;
      for (const t of transactions) {
        if (t.date <= yearEndDateStr) {
          if (t.transaction_type === "deposit") {
            netDeposits += t.total_amount;
          } else if (t.transaction_type === "withdraw") {
            netDeposits -= t.total_amount;
          }
        }
      }

      // If no net deposits/withdrawals yet, skip this year
      if (netDeposits === 0) continue;

      // Calculate cash balance at year-end
      const cashStmt = db.prepare(`
        SELECT 
          transaction_type,
          total_amount
        FROM transactions
        WHERE user_id = ? AND date <= ?
      `);
      const cashTransactions = cashStmt.all(userId, yearEndDateStr);

      let cashBalance = 0;
      for (const t of cashTransactions) {
        const amount = fromValueScale(t.total_amount, AMOUNT_SCALE) || 0;
        switch (t.transaction_type) {
          case "deposit":
          case "sell":
          case "dividend":
          case "interest":
          case "coupon":
            cashBalance += amount;
            break;
          case "withdraw":
          case "buy":
            cashBalance -= amount;
            break;
        }
      }

      // Calculate holdings at year-end using historical year-end prices
      const holdingsStmt = db.prepare(`
        SELECT 
          a.id as asset_id,
          t.transaction_type,
          t.quantity
        FROM transactions t
        JOIN assets a ON t.asset_id = a.id
        WHERE t.user_id = ? AND t.date <= ? AND t.transaction_type IN ('buy', 'sell')
      `);
      const holdingTransactions = holdingsStmt.all(userId, yearEndDateStr);

      // Group by asset and calculate quantity (integer arithmetic)
      const assetQuantityValues = {};
      for (const t of holdingTransactions) {
        if (!assetQuantityValues[t.asset_id]) {
          assetQuantityValues[t.asset_id] = 0;
        }
        const qtyValue = t.quantity || 0;
        if (t.transaction_type === "buy") {
          assetQuantityValues[t.asset_id] += qtyValue;
        } else if (t.transaction_type === "sell") {
          assetQuantityValues[t.asset_id] -= qtyValue;
        }
      }

      // Get historical year-end prices for each holding
      // Uses the last available price on or before year-end
      let holdingsValue = 0;
      for (const assetId in assetQuantityValues) {
        const quantityValue = assetQuantityValues[assetId];
        if (quantityValue > 0) {
          const priceStmt = db.prepare(`
            SELECT price FROM price_data
            WHERE asset_id = ? AND date <= ?
            ORDER BY date DESC
            LIMIT 1
          `);
          const priceResult = priceStmt.get(assetId, yearEndDateStr);
          if (priceResult) {
            // Convert both to float for final multiplication
            const quantity = fromValueScale(quantityValue, QUANTITY_SCALE);
            const price = fromValueScale(priceResult.price, PRICE_SCALE);
            holdingsValue += quantity * price;
          }
        }
      }

      // MTM = cash + holdings value
      const mtm = cashBalance + holdingsValue;

      // Calculate CAGR
      let cagr = null;
      if (firstYearMTM === null) {
        // First year with data
        firstYearMTM = mtm;
        // No CAGR for first year
      } else {
        const yearsElapsed = year - firstYear;
        if (yearsElapsed > 0 && firstYearMTM > 0) {
          cagr = (Math.pow(mtm / firstYearMTM, 1 / yearsElapsed) - 1) * 100;
        }
      }

      evolution.push({ year, mtm, cagr });
    }

    return evolution;
  }

  // Get detailed cash balance breakdown
  static getCashBalanceDetails(userId) {
    // Get all transactions that affect cash
    const stmt = db.prepare(`
      SELECT 
        t.id,
        t.date,
        t.transaction_type,
        t.quantity,
        t.price,
        t.total_amount,
        t.notes,
        a.symbol,
        a.name as asset_name,
        b.name as broker_name
      FROM transactions t
      LEFT JOIN assets a ON t.asset_id = a.id
      LEFT JOIN brokers b ON t.broker_id = b.id
      WHERE t.user_id = ?
      ORDER BY t.date ASC, t.id ASC
    `);

    const transactions = stmt.all(userId);

    // Calculate running balance and categorize
    let runningBalance = 0;
    const cashFlows = [];
    const summary = {
      total_deposits: 0,
      total_withdrawals: 0,
      total_buy: 0,
      total_sell: 0,
      total_dividends: 0,
      total_interest: 0,
      total_coupons: 0,
      net_inflow: 0,
      net_trading: 0,
      current_balance: 0,
    };

    for (const t of transactions) {
      let cashEffect = 0;
      let flowType = "";
      const amount = fromValueScale(t.total_amount, AMOUNT_SCALE) || 0;
      const quantity = fromValueScale(t.quantity, QUANTITY_SCALE);
      const price = fromValueScale(t.price, PRICE_SCALE);

      switch (t.transaction_type) {
        case "deposit":
          cashEffect = amount;
          flowType = "Deposit";
          summary.total_deposits += amount;
          break;
        case "withdraw":
          cashEffect = -amount;
          flowType = "Withdrawal";
          summary.total_withdrawals += amount;
          break;
        case "buy":
          cashEffect = -amount;
          flowType = "Buy";
          summary.total_buy += amount;
          break;
        case "sell":
          cashEffect = amount;
          flowType = "Sell";
          summary.total_sell += amount;
          break;
        case "dividend":
          cashEffect = amount;
          flowType = "Dividend";
          summary.total_dividends += amount;
          break;
        case "interest":
          cashEffect = amount;
          flowType = "Interest";
          summary.total_interest += amount;
          break;
        case "coupon":
          cashEffect = amount;
          flowType = "Coupon";
          summary.total_coupons += amount;
          break;
      }

      runningBalance += cashEffect;

      cashFlows.push({
        id: t.id,
        date: t.date,
        type: flowType,
        symbol: t.symbol,
        asset_name: t.asset_name,
        broker_name: t.broker_name,
        quantity: quantity,
        price: price,
        amount: amount,
        cash_effect: cashEffect,
        running_balance: runningBalance,
        notes: t.notes,
      });
    }

    // Calculate summary totals
    summary.net_inflow = summary.total_deposits - summary.total_withdrawals;
    summary.net_trading = summary.total_sell - summary.total_buy;
    summary.current_balance = runningBalance;

    return {
      summary,
      cash_flows: cashFlows,
      transaction_count: transactions.length,
    };
  }
}

module.exports = Transaction;
