const db = require("../config/database");
const UserSettings = require("./UserSettings");
const { getTodayInTimezone } = require("../utils/dateUtils");
const {
  QUANTITY_SCALE,
  PRICE_SCALE,
  FEE_SCALE,
  AMOUNT_SCALE,
  MINIMUM_HOLDING_QUANTITY,
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
      destination_broker_id,
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
      (user_id, asset_id, broker_id, destination_broker_id, date, transaction_type, quantity, price, fee, total_amount, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      userId,
      asset_id,
      broker_id,
      destination_broker_id || null,
      date,
      transaction_type,
      _qty.value,
      _price.value,
      _fee.value,
      _total.value,
      notes,
      createdBy,
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
      userId,
    );
    return result.changes > 0;
  }

  static delete(id, userId) {
    const stmt = db.prepare(
      "DELETE FROM transactions WHERE id = ? AND user_id = ?",
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
        b.name as broker_name,
        db2.name as destination_broker_name
      FROM transactions it
      LEFT JOIN assets a ON it.asset_id = a.id
      LEFT JOIN brokers b ON it.broker_id = b.id
      LEFT JOIN brokers db2 ON it.destination_broker_id = db2.id
      WHERE it.id = ? AND it.user_id = ?
    `);
    const row = stmt.get(id, userId);
    return Transaction._mapRowToApi(row);
  }

  static findByUser(userId) {
    // Get paginated data
    const dataStmt = db.prepare(`
      SELECT 
        it.*,
        a.symbol,
        a.name as asset_name,
        a.asset_type,
        b.name as broker_name,
        db2.name as destination_broker_name
      FROM transactions it
      LEFT JOIN assets a ON it.asset_id = a.id
      LEFT JOIN brokers b ON it.broker_id = b.id
      LEFT JOIN brokers db2 ON it.destination_broker_id = db2.id
      WHERE it.user_id = ?
      ORDER BY it.date DESC, it.id DESC
    `);

    const rows = dataStmt.all(userId);

    return {
      data: rows.map(Transaction._mapRowToApi),
    };
  }

  // Calculate FIFO cost basis for portfolio holdings and realized gains in a single pass
  static getPortfolioHoldings(userId, hideZeroQuantity = true, asOf = null) {
    const dateFilter = asOf ? "AND it.date <= ?" : "";
    const dateFilterPlain = asOf ? "AND date <= ?" : "";
    // Get all asset-broker combinations with transactions (including transfer destinations)
    const assetBrokerStmt = db.prepare(`
      SELECT DISTINCT 
        a.id as asset_id, 
        a.symbol, 
        a.name, 
        a.asset_type,
        it.broker_id as broker_id,
        b.name as broker_name
      FROM transactions it
      JOIN assets a ON it.asset_id = a.id
      LEFT JOIN brokers b ON it.broker_id = b.id
      WHERE it.user_id = ? ${dateFilter}
      UNION
      SELECT DISTINCT 
        a.id as asset_id, 
        a.symbol, 
        a.name, 
        a.asset_type,
        it.destination_broker_id as broker_id,
        b.name as broker_name
      FROM transactions it
      JOIN assets a ON it.asset_id = a.id
      LEFT JOIN brokers b ON it.destination_broker_id = b.id
      WHERE it.user_id = ? ${dateFilter} AND it.transaction_type = 'transfer' AND it.destination_broker_id IS NOT NULL
    `);
    const assetBrokerArgs = asOf
      ? [userId, asOf, userId, asOf]
      : [userId, userId];
    const assetBrokers = assetBrokerStmt.all(...assetBrokerArgs);

    const holdings = [];

    for (const ab of assetBrokers) {
      // Get all buy, sell, and transfer transactions for this asset-broker combination in chronological order
      const transStmt = db.prepare(`
        SELECT transaction_type, quantity, price, total_amount, date, broker_id, destination_broker_id
        FROM transactions
        WHERE user_id = ? AND asset_id = ? ${dateFilterPlain} AND (
          (broker_id = ? AND transaction_type IN ('buy', 'sell'))
          OR (broker_id = ? AND transaction_type = 'transfer')
          OR (destination_broker_id = ? AND transaction_type = 'transfer')
        )
        ORDER BY date ASC, id ASC
      `);
      const transArgs = asOf
        ? [userId, ab.asset_id, asOf, ab.broker_id, ab.broker_id, ab.broker_id]
        : [userId, ab.asset_id, ab.broker_id, ab.broker_id, ab.broker_id];
      const transactions = transStmt.all(...transArgs);

      // Calculate FIFO: both remaining holdings and realized gains from sales
      // Use integer arithmetic throughout, convert to float only for final results
      const fifoLots = []; // Queue of {quantityValue, pricePerUnitValue, totalCostValue} in integer form
      let realizedGainValue = 0;

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

            if (oldestLot.quantityValue <= remainingToSellValue) {
              // Sell entire lot
              costOfSoldValue += oldestLot.totalCostValue;
              remainingToSellValue -= oldestLot.quantityValue;
              fifoLots.shift(); // Remove the lot
            } else {
              // Partial sale from this lot
              const soldFromLotValue = remainingToSellValue;
              const costOfPartialSaleValue = Math.round(
                (soldFromLotValue * oldestLot.totalCostValue) /
                  oldestLot.quantityValue,
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
        } else if (txn.transaction_type === "transfer") {
          if (
            txn.broker_id === ab.broker_id &&
            txn.destination_broker_id !== ab.broker_id
          ) {
            // Outgoing transfer: deduct from FIFO lots at cost (no realized gain)
            let remainingToTransferValue = quantityValue;

            while (remainingToTransferValue > 0 && fifoLots.length > 0) {
              const oldestLot = fifoLots[0];

              if (oldestLot.quantityValue <= remainingToTransferValue) {
                remainingToTransferValue -= oldestLot.quantityValue;
                fifoLots.shift();
              } else {
                const transferredFromLotValue = remainingToTransferValue;
                const costOfPartialTransferValue = Math.round(
                  (transferredFromLotValue * oldestLot.totalCostValue) /
                    oldestLot.quantityValue,
                );
                oldestLot.quantityValue -= transferredFromLotValue;
                oldestLot.totalCostValue -= costOfPartialTransferValue;
                remainingToTransferValue = 0;
              }
            }
          } else if (txn.destination_broker_id === ab.broker_id) {
            // Incoming transfer: add lot at transferred cost basis
            fifoLots.push({
              quantityValue: quantityValue,
              pricePerUnitValue: priceValue,
              totalCostValue: totalAmountValue,
            });
          }
        }
      }

      // Sum up remaining lots (integer arithmetic)
      const totalQuantityValue = fifoLots.reduce(
        (sum, lot) => sum + lot.quantityValue,
        0,
      );
      const costBasisValue = fifoLots.reduce(
        (sum, lot) => sum + lot.totalCostValue,
        0,
      );

      // Convert to floats only at the end
      const totalQuantity = fromValueScale(totalQuantityValue, QUANTITY_SCALE);
      const costBasis = fromValueScale(costBasisValue, AMOUNT_SCALE);
      const realizedGain = fromValueScale(realizedGainValue, AMOUNT_SCALE);

      // Apply quantity filter based on hideZeroQuantity parameter
      const shouldInclude = hideZeroQuantity
        ? totalQuantity > MINIMUM_HOLDING_QUANTITY
        : true;

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

  // Replays FIFO tracking acquisition dates per lot to produce a realized gains report
  // Returns an array of closed-position records optionally filtered by disposal year
  static getRealizedGainsReport(userId, year = null) {
    // Get all asset-broker pairs for this user
    const assetBrokerStmt = db.prepare(`
      SELECT DISTINCT 
        a.id as asset_id, a.symbol, a.name, a.asset_type,
        it.broker_id as broker_id, b.name as broker_name
      FROM transactions it
      JOIN assets a ON it.asset_id = a.id
      LEFT JOIN brokers b ON it.broker_id = b.id
      WHERE it.user_id = ? AND it.broker_id IS NOT NULL
      UNION
      SELECT DISTINCT 
        a.id as asset_id, a.symbol, a.name, a.asset_type,
        it.destination_broker_id as broker_id, b.name as broker_name
      FROM transactions it
      JOIN assets a ON it.asset_id = a.id
      LEFT JOIN brokers b ON it.destination_broker_id = b.id
      WHERE it.user_id = ? AND it.transaction_type = 'transfer' AND it.destination_broker_id IS NOT NULL
    `);
    const assetBrokers = assetBrokerStmt.all(userId, userId);

    // Pre-fetch buy dates per asset (for wash sale detection across all brokers)
    const allBuysStmt = db.prepare(`
      SELECT asset_id, date FROM transactions
      WHERE user_id = ? AND transaction_type = 'buy'
      ORDER BY date ASC
    `);
    const allBuysByAsset = {};
    for (const row of allBuysStmt.all(userId)) {
      if (!allBuysByAsset[row.asset_id]) allBuysByAsset[row.asset_id] = [];
      allBuysByAsset[row.asset_id].push(row.date);
    }

    const closedPositions = [];

    for (const ab of assetBrokers) {
      const transStmt = db.prepare(`
        SELECT transaction_type, quantity, price, total_amount, date, broker_id, destination_broker_id
        FROM transactions
        WHERE user_id = ? AND asset_id = ? AND (
          (broker_id = ? AND transaction_type IN ('buy', 'sell'))
          OR (broker_id = ? AND transaction_type = 'transfer')
          OR (destination_broker_id = ? AND transaction_type = 'transfer')
        )
        ORDER BY date ASC, id ASC
      `);
      const transactions = transStmt.all(
        userId,
        ab.asset_id,
        ab.broker_id,
        ab.broker_id,
        ab.broker_id,
      );

      // FIFO lots include acquisition date
      const fifoLots = []; // {quantityValue, totalCostValue, acquisitionDate}

      for (const txn of transactions) {
        const quantityValue = txn.quantity;
        const totalAmountValue = txn.total_amount;

        if (txn.transaction_type === "buy") {
          fifoLots.push({
            quantityValue,
            totalCostValue: totalAmountValue,
            acquisitionDate: txn.date,
          });
        } else if (txn.transaction_type === "sell") {
          let remainingToSellValue = quantityValue;
          const disposalDate = txn.date;
          const totalSaleProceeds = totalAmountValue;

          // Collect proportional proceeds per lot match
          while (remainingToSellValue > 0 && fifoLots.length > 0) {
            const lot = fifoLots[0];
            let soldQtyValue;
            let lotCostValue;

            if (lot.quantityValue <= remainingToSellValue) {
              soldQtyValue = lot.quantityValue;
              lotCostValue = lot.totalCostValue;
              remainingToSellValue -= lot.quantityValue;
              fifoLots.shift();
            } else {
              soldQtyValue = remainingToSellValue;
              lotCostValue = Math.round(
                (soldQtyValue * lot.totalCostValue) / lot.quantityValue,
              );
              lot.quantityValue -= soldQtyValue;
              lot.totalCostValue -= lotCostValue;
              remainingToSellValue = 0;
            }

            // Proportional sale proceeds for this lot
            const lotProceedsValue = Math.round(
              (soldQtyValue * totalSaleProceeds) / quantityValue,
            );
            const gainLossValue = lotProceedsValue - lotCostValue;

            const quantity = fromValueScale(soldQtyValue, QUANTITY_SCALE);
            const costBasis = fromValueScale(lotCostValue, AMOUNT_SCALE);
            const saleProceeds = fromValueScale(lotProceedsValue, AMOUNT_SCALE);
            const gainLoss = fromValueScale(gainLossValue, AMOUNT_SCALE);

            // Calculate holding period
            const acqMs = new Date(lot.acquisitionDate).getTime();
            const dispMs = new Date(disposalDate).getTime();
            const holdingDays = Math.round((dispMs - acqMs) / 86400000);

            // Wash sale detection: loss sale + repurchase within 30 days
            let isWashSale = false;
            if (gainLoss < 0) {
              const buyDates = allBuysByAsset[ab.asset_id] || [];
              const sellTime = new Date(disposalDate).getTime();
              const window30 = 30 * 86400000;
              isWashSale = buyDates.some((d) => {
                const t = new Date(d).getTime();
                return (
                  Math.abs(t - sellTime) <= window30 &&
                  d !== lot.acquisitionDate
                );
              });
            }

            // Filter by year if provided
            const disposalYear = disposalDate.substring(0, 4);
            if (!year || String(year) === disposalYear) {
              closedPositions.push({
                symbol: ab.symbol,
                name: ab.name,
                asset_type: ab.asset_type,
                broker_name: ab.broker_name,
                acquisition_date: lot.acquisitionDate,
                disposal_date: disposalDate,
                quantity,
                cost_basis: costBasis,
                sale_proceeds: saleProceeds,
                gain_loss: gainLoss,
                holding_days: holdingDays,
                is_wash_sale: isWashSale,
              });
            }
          }
        } else if (txn.transaction_type === "transfer") {
          if (
            txn.broker_id === ab.broker_id &&
            txn.destination_broker_id !== ab.broker_id
          ) {
            // Outgoing: deduct FIFO lots
            let remaining = quantityValue;
            while (remaining > 0 && fifoLots.length > 0) {
              const lot = fifoLots[0];
              if (lot.quantityValue <= remaining) {
                remaining -= lot.quantityValue;
                fifoLots.shift();
              } else {
                const costPart = Math.round(
                  (remaining * lot.totalCostValue) / lot.quantityValue,
                );
                lot.quantityValue -= remaining;
                lot.totalCostValue -= costPart;
                remaining = 0;
              }
            }
          } else if (txn.destination_broker_id === ab.broker_id) {
            // Incoming: add lot at transferred cost basis
            fifoLots.push({
              quantityValue,
              totalCostValue: totalAmountValue,
              acquisitionDate: txn.date,
            });
          }
        }
      }
    }

    // Sort by disposal date descending
    closedPositions.sort((a, b) =>
      b.disposal_date.localeCompare(a.disposal_date),
    );

    return closedPositions;
  }

  static getAssetBrokerBalance(userId, assetId, brokerId) {
    const stmt = db.prepare(`
      SELECT 
        transaction_type,
        quantity,
        broker_id,
        destination_broker_id
      FROM transactions
      WHERE user_id = ? AND asset_id = ? AND (
        broker_id = ? OR (transaction_type = 'transfer' AND destination_broker_id = ?)
      )
    `);
    const transactions = stmt.all(userId, assetId, brokerId, brokerId);

    // Do arithmetic with integers, not floats
    let balanceValue = 0;

    for (const t of transactions) {
      const qty = t.quantity || 0;
      if (t.transaction_type === "buy") {
        balanceValue += qty;
      } else if (t.transaction_type === "sell") {
        balanceValue -= qty;
      } else if (t.transaction_type === "transfer") {
        if (t.broker_id === brokerId) {
          balanceValue -= qty; // outgoing transfer
        } else if (t.destination_broker_id === brokerId) {
          balanceValue += qty; // incoming transfer
        }
      }
    }

    // Convert to float only at the end
    const balance = fromValueScale(balanceValue, QUANTITY_SCALE);
    return balance;
  }

  // Get the date of the first transaction for a user
  static getFirstTransactionDate(userId) {
    const stmt = db.prepare(
      "SELECT MIN(date) as first_date FROM transactions WHERE user_id = ?",
    );
    const row = stmt.get(userId);
    return row?.first_date || null;
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
        case "rental":
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
    const userSettings = UserSettings.findByUserId(userId);
    const todayStr = getTodayInTimezone(userSettings.timezone);

    if (transactions.length === 0) return 0;

    const today = new Date(todayStr);
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
    const userSettings = UserSettings.findByUserId(userId);
    const todayStr = getTodayInTimezone(userSettings.timezone);

    if (transactions.length === 0) {
      return { mwrr: 0, cashFlows: [], iterations: [] };
    }

    const today = new Date(todayStr);
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
    const userSettings = UserSettings.findByUserId(userId);
    const todayStr = getTodayInTimezone(userSettings.timezone);

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
    const today = new Date(todayStr);
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
    const userSettings = UserSettings.findByUserId(userId);
    const todayStr = getTodayInTimezone(userSettings.timezone);

    if (transactions.length === 0) return [];

    const firstDate = new Date(transactions[0].date);
    const firstYear = firstDate.getFullYear();
    const currentYear = new Date(todayStr).getFullYear();

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
          case "rental":
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
        b.name as broker_name,
        db2.name as destination_broker_name
      FROM transactions t
      LEFT JOIN assets a ON t.asset_id = a.id
      LEFT JOIN brokers b ON t.broker_id = b.id
      LEFT JOIN brokers db2 ON t.destination_broker_id = db2.id
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
      total_rentals: 0,
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
        case "rental":
          cashEffect = amount;
          flowType = "Rental";
          summary.total_rentals += amount;
          break;
        case "coupon":
          cashEffect = amount;
          flowType = "Coupon";
          summary.total_coupons += amount;
          break;
        case "transfer":
          cashEffect = 0;
          flowType = "Transfer";
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
        destination_broker_name: t.destination_broker_name || null,
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

  /**
   * Get income analytics report (dividends, interest, coupons, rentals).
   * @param {number} userId
   * @param {number|null} year - Filter to a specific year, or null for all-time
   * @returns {{ summary, by_month, by_year, by_asset, transactions, available_years }}
   */
  static getIncomeReport(userId, year = null) {
    // Always fetch all available years regardless of filter
    const availableYearsRows = db
      .prepare(
        `SELECT DISTINCT strftime('%Y', date) AS year
         FROM transactions
         WHERE user_id = ? AND transaction_type IN ('dividend','interest','coupon','rental')
         ORDER BY year DESC`
      )
      .all(userId);
    const available_years = availableYearsRows.map((r) => r.year);

    // Main query — optionally filtered by year
    let sql = `
      SELECT t.id, t.date, t.transaction_type, t.total_amount, t.notes,
             a.id        AS asset_id,
             a.symbol,
             a.name      AS asset_name,
             a.asset_type,
             b.name      AS broker_name,
             strftime('%Y',    t.date) AS year,
             strftime('%m',    t.date) AS month,
             strftime('%Y-%m', t.date) AS year_month
      FROM transactions t
      LEFT JOIN assets  a ON t.asset_id  = a.id
      LEFT JOIN brokers b ON t.broker_id = b.id
      WHERE t.user_id = ?
        AND t.transaction_type IN ('dividend','interest','coupon','rental')
    `;
    const params = [userId];
    if (year !== null) {
      sql += ` AND strftime('%Y', t.date) = ?`;
      params.push(String(year));
    }
    sql += ` ORDER BY t.date ASC, t.id ASC`;

    const rows = db.prepare(sql).all(...params);

    // Convert scaled amounts and build per-row objects
    const incomeTypes = ["dividend", "interest", "coupon", "rental"];
    const zeroByType = () => ({ dividend: 0, interest: 0, coupon: 0, rental: 0 });

    // --- by_asset map ---
    const assetMap = new Map();
    // --- by_year map ---
    const yearMap = new Map();
    // --- raw transactions array ---
    const transactions = [];

    let latestDate = null;

    for (const row of rows) {
      const amount = fromValueScale(row.total_amount, AMOUNT_SCALE);
      const type = row.transaction_type; // dividend | interest | coupon | rental

      if (!latestDate || row.date > latestDate) latestDate = row.date;

      // transactions list
      transactions.push({
        id: row.id,
        date: row.date,
        transaction_type: type,
        amount,
        symbol: row.symbol || null,
        asset_name: row.asset_name || null,
        broker_name: row.broker_name || null,
        notes: row.notes || null,
      });

      // by_year
      if (!yearMap.has(row.year)) yearMap.set(row.year, zeroByType());
      yearMap.get(row.year)[type] += amount;

      // by_asset
      const assetKey = row.asset_id !== null ? row.asset_id : `cash_${type}`;
      if (!assetMap.has(assetKey)) {
        assetMap.set(assetKey, {
          asset_id: row.asset_id,
          symbol: row.symbol || "—",
          asset_name: row.asset_name || "—",
          asset_type: row.asset_type || "—",
          ...zeroByType(),
          total: 0,
          transaction_count: 0,
          first_date: row.date,
          last_date: row.date,
        });
      }
      const assetEntry = assetMap.get(assetKey);
      assetEntry[type] += amount;
      assetEntry.total += amount;
      assetEntry.transaction_count += 1;
      if (row.date > assetEntry.last_date) assetEntry.last_date = row.date;
    }

    // --- summary ---
    const summary = {
      total_income: 0,
      total_dividends: 0,
      total_interest: 0,
      total_coupons: 0,
      total_rentals: 0,
      income_transaction_count: rows.length,
      projected_annual: null,
      best_month: null,
      best_year: null,
    };

    for (const row of transactions) {
      summary.total_income += row.amount;
      if (row.transaction_type === "dividend") summary.total_dividends += row.amount;
      else if (row.transaction_type === "interest") summary.total_interest += row.amount;
      else if (row.transaction_type === "coupon") summary.total_coupons += row.amount;
      else if (row.transaction_type === "rental") summary.total_rentals += row.amount;
    }

    // projected_annual: trailing 12 calendar months from latest transaction date
    // Only compute when not filtering by a historical year
    const currentYear = new Date().getFullYear();
    if (year === null || Number(year) === currentYear) {
      if (latestDate) {
        const latestMs = new Date(latestDate).getTime();
        const twelveMonthsAgoMs = latestMs - 365 * 24 * 60 * 60 * 1000;
        let ttmTotal = 0;
        const monthsWithData = new Set();
        for (const row of transactions) {
          const rowMs = new Date(row.date).getTime();
          if (rowMs >= twelveMonthsAgoMs) {
            ttmTotal += row.amount;
            monthsWithData.add(row.date.substring(0, 7)); // YYYY-MM
          }
        }
        const nMonths = monthsWithData.size;
        summary.projected_annual = nMonths > 0 && nMonths < 12
          ? (ttmTotal / nMonths) * 12
          : ttmTotal;
      }
    }

    // --- by_year array + best_year ---
    const by_year = [];
    for (const [yr, vals] of yearMap) {
      const total = vals.dividend + vals.interest + vals.coupon + vals.rental;
      by_year.push({ year: yr, ...vals, total });
    }
    by_year.sort((a, b) => a.year.localeCompare(b.year));
    if (by_year.length > 0) {
      summary.best_year = by_year.reduce((best, cur) =>
        cur.total > best.total ? cur : best
      );
      summary.best_year = { year: summary.best_year.year, amount: summary.best_year.total };
    }

    // --- by_month array (continuous, filling gaps with zeroes) ---
    const by_month = [];
    if (rows.length > 0) {
      // Build map of year_month -> totals from actual rows
      const monthDataMap = new Map();
      for (const row of transactions) {
        const ym = row.date.substring(0, 7); // YYYY-MM
        if (!monthDataMap.has(ym)) monthDataMap.set(ym, zeroByType());
        monthDataMap.get(ym)[row.transaction_type] += row.amount;
      }

      // Determine range
      const firstYM = rows[0].date.substring(0, 7);
      const lastYM = latestDate.substring(0, 7);

      const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

      let [fy, fm] = firstYM.split("-").map(Number);
      const [ly, lm] = lastYM.split("-").map(Number);

      while (fy < ly || (fy === ly && fm <= lm)) {
        const ym = `${fy}-${String(fm).padStart(2, "0")}`;
        const vals = monthDataMap.get(ym) || zeroByType();
        const total = vals.dividend + vals.interest + vals.coupon + vals.rental;
        by_month.push({
          year_month: ym,
          month_label: `${MONTH_NAMES[fm - 1]} ${fy}`,
          dividend: vals.dividend,
          interest: vals.interest,
          coupon: vals.coupon,
          rental: vals.rental,
          total,
        });
        fm += 1;
        if (fm > 12) { fm = 1; fy += 1; }
      }

      // best_month
      if (by_month.length > 0) {
        const best = by_month.reduce((b, c) => (c.total > b.total ? c : b));
        summary.best_month = { year_month: best.year_month, amount: best.total };
      }
    }

    // --- by_asset array ---
    const by_asset = Array.from(assetMap.values()).sort((a, b) => b.total - a.total);

    return { summary, by_month, by_year, by_asset, transactions, available_years };
  }
}

module.exports = Transaction;
