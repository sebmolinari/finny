const express = require("express");
const router = express.Router();
const Transaction = require("../models/Transaction");
const Asset = require("../models/Asset");
const AuditLog = require("../models/AuditLog");
const UserSettings = require("../models/UserSettings");
const authMiddleware = require("../middleware/auth");
const { validate } = require("../utils/validationMiddleware");
const { getTodayInTimezone } = require("../utils/dateUtils");
const {
  transactionValidation,
} = require("../middleware/validators/transactionValidators");

/**
 * @swagger
 * /transactions:
 *   get:
 *     summary: Get all transaction transactions for the authenticated user
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Results per page
 *       - in: query
 *         name: assetId
 *         schema:
 *           type: string
 *         description: Filter by asset ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *       - in: query
 *         name: transactionType
 *         schema:
 *           type: string
 *         description: Filter by transaction type
 *     responses:
 *       200:
 *         description: List of transaction transactions
 *       500:
 *         description: Server error
 */
router.get("/", authMiddleware, (req, res) => {
  try {
    const { page, limit, assetId, startDate, endDate, transactionType } =
      req.query;

    const result = Transaction.findByUser(req.user.id, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
      assetId,
      startDate,
      endDate,
      transactionType,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /transactions/export:
 *   get:
 *     summary: Export transactions as CSV
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *       - in: query
 *         name: assetId
 *         schema:
 *           type: string
 *         description: Filter by asset ID
 *       - in: query
 *         name: transactionType
 *         schema:
 *           type: string
 *         description: Filter by transaction type
 *     responses:
 *       200:
 *         description: CSV file of transactions
 *       500:
 *         description: Server error
 */
router.get("/export", authMiddleware, (req, res) => {
  try {
    const { startDate, endDate, assetId, transactionType } = req.query;
    const userSettings = UserSettings.findByUserId(req.user.id);
    const result = Transaction.findByUser(req.user.id, {
      limit: 10000, // Large limit for export
      assetId,
      startDate,
      endDate,
      transactionType,
    });

    // Generate CSV
    const csvHeaders = [
      "Date",
      "Asset Symbol",
      "Asset Name",
      "Transaction Type",
      "Quantity",
      "Price",
      "Fee",
      "Total Amount",
      "Broker",
      "Notes",
    ];

    const csvRows = result.data
      .slice()
      .reverse()
      .map((tx) => [
        tx.date,
        tx.symbol || "",
        tx.asset_name || "",
        tx.transaction_type,
        tx.quantity || "",
        tx.price || "",
        tx.fee || "",
        tx.total_amount,
        tx.broker_name || "",
        (tx.notes || "").replace(/"/g, '""'), // Escape quotes
      ]);

    const csv = [
      csvHeaders.join(","),
      ...csvRows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="transactions_${getTodayInTimezone(
        userSettings.timezone
      )}.csv"`
    );
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /transactions/{id}:
 *   get:
 *     summary: Get a single transaction transaction by ID
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Transaction details
 *       404:
 *         description: Transaction not found
 *       500:
 *         description: Server error
 */
router.get("/:id", authMiddleware, (req, res) => {
  try {
    const transaction = Transaction.findById(req.params.id, req.user.id);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /transactions:
 *   post:
 *     summary: Create a new transaction transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               asset_id:
 *                 type: string
 *               broker_id:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               transaction_type:
 *                 type: string
 *               quantity:
 *                 type: number
 *               price:
 *                 type: number
 *               fee:
 *                 type: number
 *               total_amount:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Transaction created
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Asset or broker not found
 *       500:
 *         description: Server error
 */
router.post(
  "/",
  authMiddleware,
  validate(transactionValidation),
  (req, res) => {
    try {
      const {
        asset_id,
        broker_id,
        date,
        transaction_type,
        quantity,
        price,
        total_amount,
        fee,
        notes,
      } = req.body;

      // Per-type validation
      if (
        transaction_type === "buy" ||
        transaction_type === "sell" ||
        transaction_type === "dividend" ||
        transaction_type === "interest" ||
        transaction_type === "coupon"
      ) {
        if (
          !asset_id ||
          quantity === undefined ||
          price === undefined ||
          !broker_id
        ) {
          return res.status(400).json({
            message:
              "broker_id, asset_id, quantity, and price are required for buy/sell",
          });
        }
        const asset = Asset.findById(asset_id);
        if (!asset) {
          return res.status(404).json({ message: "Asset not found" });
        }

        // Validate buy total_amount against available cash balance
        if (transaction_type === "buy") {
          // Check if user has cash balance validation enabled
          const userSettings = UserSettings.findByUserId(req.user.id);
          const shouldValidate = userSettings?.validate_cash_balance !== 0;

          if (shouldValidate) {
            const availableCash = Transaction.getCashBalance(req.user.id);
            if (total_amount > availableCash) {
              return res.status(400).json({
                message: `Insufficient cash balance. Available: ${availableCash}, attempted to buy: ${total_amount}`,
              });
            }
          }
        }

        // Validate sell quantity against available balance
        if (transaction_type === "sell") {
          // Check if user has balance validation enabled
          const userSettings = UserSettings.findByUserId(req.user.id);
          const shouldValidate = userSettings?.validate_sell_balance !== 0;

          if (shouldValidate) {
            const availableQuantity = Transaction.getAssetBrokerBalance(
              req.user.id,
              asset_id,
              broker_id
            );
            if (quantity > availableQuantity) {
              return res.status(400).json({
                message: `Insufficient balance. Available: ${availableQuantity}, attempted to sell: ${quantity}`,
              });
            }
          }
        }
      } else if (transaction_type === "dividend") {
        if (!asset_id) {
          return res.status(400).json({
            message: "asset_id is required for dividend",
          });
        }
        const asset = Asset.findById(asset_id);
        if (!asset) {
          return res.status(404).json({ message: "Asset not found" });
        }
      }

      const id = Transaction.create(
        req.user.id,
        {
          asset_id,
          broker_id,
          date,
          transaction_type,
          quantity,
          price,
          fee,
          total_amount,
          notes,
        },
        req.user.id
      );

      const transaction = Transaction.findById(id, req.user.id);

      // Log transaction transaction creation
      AuditLog.logCreate(
        req.user.id,
        req.user.username,
        "transactions",
        id,
        {
          transaction_type,
          total_amount,
          date,
        },
        req.ip,
        req.get("user-agent")
      );

      res.status(201).json(transaction);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * @swagger
 * /transactions/{id}:
 *   put:
 *     summary: Update an transaction transaction by ID
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               asset_id:
 *                 type: string
 *               broker_id:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               transaction_type:
 *                 type: string
 *               quantity:
 *                 type: number
 *               price:
 *                 type: number
 *               fee:
 *                 type: number
 *               total_amount:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transaction updated
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Transaction not found
 *       500:
 *         description: Server error
 */
router.put(
  "/:id",
  authMiddleware,
  validate(transactionValidation),
  (req, res) => {
    try {
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
      } = req.body;

      // Per-type validation
      if (transaction_type === "buy" || transaction_type === "sell") {
        if (!asset_id || quantity === undefined || price === undefined) {
          return res.status(400).json({
            message: "asset_id, quantity, and price are required for buy/sell",
          });
        }

        // Validate buy total_amount against available cash balance
        if (transaction_type === "buy") {
          // Check if user has cash balance validation enabled
          const userSettings = UserSettings.findByUserId(req.user.id);
          const shouldValidate = userSettings?.validate_cash_balance !== 0;

          if (shouldValidate) {
            const availableCash = Transaction.getCashBalance(req.user.id);
            if (total_amount > availableCash) {
              return res.status(400).json({
                message: `Insufficient cash balance. Available: ${availableCash}, attempted to buy: ${total_amount}`,
              });
            }
          }
        }

        // Validate sell quantity against available balance (excluding current transaction)
        if (transaction_type === "sell") {
          // Check if user has balance validation enabled
          const userSettings = UserSettings.findByUserId(req.user.id);
          const shouldValidate = userSettings?.validate_sell_balance !== 0;

          if (shouldValidate) {
            const currentTransaction = Transaction.findById(
              req.params.id,
              req.user.id
            );
            if (!currentTransaction) {
              return res.status(404).json({ message: "Transaction not found" });
            }

            // Get current balance
            let availableQuantity = Transaction.getAssetBrokerBalance(
              req.user.id,
              asset_id,
              broker_id
            );

            // If we're updating an existing sell, add back its quantity to check new quantity
            if (currentTransaction.transaction_type === "sell") {
              availableQuantity += currentTransaction.quantity;
            }

            if (quantity > availableQuantity) {
              return res.status(400).json({
                message: `Insufficient balance. Available: ${availableQuantity}, attempted to sell: ${quantity}`,
              });
            }
          }
        }
      } else if (transaction_type === "dividend") {
        if (!asset_id) {
          return res.status(400).json({
            message: "asset_id is required for dividend",
          });
        }
      }

      // Get old transaction data for audit log
      const oldTransaction = Transaction.findById(req.params.id, req.user.id);
      if (!oldTransaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      const oldValues = {
        asset_id: oldTransaction.asset_id,
        broker_id: oldTransaction.broker_id,
        date: oldTransaction.date,
        transaction_type: oldTransaction.transaction_type,
        quantity: oldTransaction.quantity,
        price: oldTransaction.price,
        fee: oldTransaction.fee,
        total_amount: oldTransaction.total_amount,
        notes: oldTransaction.notes,
      };

      const updated = Transaction.update(
        req.params.id,
        req.user.id,
        {
          asset_id,
          broker_id,
          date,
          transaction_type,
          quantity,
          price,
          fee,
          total_amount,
          notes,
        },
        req.user.id
      );

      if (!updated) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      const transaction = Transaction.findById(req.params.id, req.user.id);

      // Log transaction transaction update
      AuditLog.logUpdate(
        req.user.id,
        req.user.username,
        "transactions",
        parseInt(req.params.id),
        oldValues,
        {
          asset_id,
          broker_id,
          date,
          transaction_type,
          quantity,
          price,
          fee,
          total_amount,
          notes,
        },
        req.ip,
        req.get("user-agent")
      );

      res.json(transaction);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * @swagger
 * /transactions/{id}:
 *   delete:
 *     summary: Delete an transaction transaction by ID
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Transaction deleted successfully
 *       404:
 *         description: Transaction not found
 *       500:
 *         description: Server error
 */
router.delete("/:id", authMiddleware, (req, res) => {
  try {
    // Get transaction before deletion for audit log
    const transaction = Transaction.findById(req.params.id, req.user.id);

    const deleted = Transaction.delete(req.params.id, req.user.id);

    if (!deleted) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    // Log transaction transaction deletion
    if (transaction) {
      AuditLog.logDelete(
        req.user.id,
        req.user.username,
        "transactions",
        parseInt(req.params.id),
        {
          transaction_type: transaction.transaction_type,
          total_amount: transaction.total_amount,
        },
        req.ip,
        req.get("user-agent")
      );
    }

    res.json({ message: "Transaction deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /transactions/bulk:
 *   post:
 *     summary: Bulk import transaction transactions
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               transactions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     asset_symbol:
 *                       type: string
 *                       description: Asset symbol (required for non-cash transactions)
 *                     broker_name:
 *                       type: string
 *                       description: Broker name (required for non-cash transactions)
 *                     date:
 *                       type: string
 *                       format: date
 *                     transaction_type:
 *                       type: string
 *                       enum: [buy, sell, dividend, deposit, withdraw, interest, coupon]
 *                     quantity:
 *                       type: number
 *                       description: Asset quantity (required for buy/sell)
 *                     price:
 *                       type: number
 *                       description: Price (required for buy/sell)
 *                     fee:
 *                       type: number
 *                       description: Transaction fee
 *                     total_amount:
 *                       type: number
 *                       description: Total transaction amount
 *                     notes:
 *                       type: string
 *     responses:
 *       200:
 *         description: Bulk import completed
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post("/bulk", authMiddleware, (req, res) => {
  try {
    const { transactions } = req.body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res
        .status(400)
        .json({ message: "Transactions array is required" });
    }

    // Read user settings once before loop
    const userSettings = UserSettings.findByUserId(req.user.id);
    const shouldValidateCash = userSettings?.validate_cash_balance !== 0;
    const shouldValidateSell = userSettings?.validate_sell_balance !== 0;

    const results = {
      success: [],
      errors: [],
    };

    transactions.forEach((txData, index) => {
      try {
        const {
          asset_symbol,
          broker_name,
          date,
          transaction_type,
          quantity,
          price,
          fee,
          total_amount,
          notes,
        } = txData;

        // Validate transaction type
        const validTypes = [
          "buy",
          "sell",
          "dividend",
          "deposit",
          "withdraw",
          "interest",
          "coupon",
        ];
        if (!validTypes.includes(transaction_type)) {
          results.errors.push({
            row: index + 2,
            error: `Invalid transaction type: ${transaction_type}`,
          });
          return;
        }

        // Validate required fields
        if (!date || !transaction_type || total_amount === undefined) {
          results.errors.push({
            row: index + 2,
            error:
              "Missing required fields: date, transaction_type, total_amount",
          });
          return;
        }

        let asset_id = null;

        // For non-cash transactions, get or create asset
        if (transaction_type !== "deposit" && transaction_type !== "withdraw") {
          if (!asset_symbol || quantity === undefined || price === undefined) {
            results.errors.push({
              row: index + 2,
              error: "Missing required fields: asset_symbol, quantity, price",
            });
            return;
          }

          // Try to find asset by symbol
          let asset = Asset.findBySymbol(asset_symbol);

          if (!asset) {
            results.errors.push({
              row: index + 2,
              error: `Asset not found: ${asset_symbol}. Please create the asset first.`,
            });
            return;
          }

          asset_id = asset.id;
        }

        let broker_id = null;

        // Broker is not required for deposit/withdraw
        if (transaction_type !== "deposit" && transaction_type !== "withdraw") {
          // Lookup broker by name
          const Broker = require("../models/Broker");
          const brokers = Broker.findByUser(req.user.id, {
            includeInactive: true,
          });
          const broker = brokers.find(
            (b) => b.name.toLowerCase() === broker_name.toLowerCase()
          );

          if (!broker) {
            results.errors.push({
              row: index + 2,
              error: `Broker not found: ${broker_name}. Please create the broker first.`,
            });
            return;
          }

          broker_id = broker.id;
        }

        // Per-type validation for buy/sell transactions
        if (transaction_type === "buy" || transaction_type === "sell") {
          if (!asset_id || quantity === undefined || price === undefined) {
            results.errors.push({
              row: index + 2,
              error: "asset_id, quantity, and price are required for buy/sell",
            });
            return;
          }

          // Validate buy total_amount against available cash balance
          if (transaction_type === "buy") {
            if (shouldValidateCash) {
              const availableCash = Transaction.getCashBalance(req.user.id);
              if (total_amount > availableCash) {
                results.errors.push({
                  row: index + 2,
                  error: `Insufficient cash balance. Available: ${availableCash}, attempted to buy: ${total_amount}`,
                });
                return;
              }
            }
          }

          // Validate sell quantity against available balance
          if (transaction_type === "sell") {
            if (shouldValidateSell) {
              const availableQuantity = Transaction.getAssetBrokerBalance(
                req.user.id,
                asset_id,
                broker_id
              );
              if (quantity > availableQuantity) {
                results.errors.push({
                  row: index + 2,
                  error: `Insufficient balance. Available: ${availableQuantity}, attempted to sell: ${quantity}`,
                });
                return;
              }
            }
          }
        } else if (transaction_type === "dividend") {
          if (!asset_id) {
            results.errors.push({
              row: index + 2,
              error: "asset_id is required for dividend",
            });
            return;
          }
        }

        // Create transaction
        const id = Transaction.create(
          req.user.id,
          {
            asset_id,
            broker_id,
            date,
            transaction_type,
            quantity: quantity,
            price: price,
            fee: fee,
            total_amount,
            notes: notes,
          },
          req.user.id
        );

        results.success.push({
          row: index + 2,
          id,
          transaction_type,
          asset_symbol: asset_symbol || "N/A",
        });

        // Log bulk transaction creation
        AuditLog.logCreate(
          req.user.id,
          req.user.username,
          "transactions",
          id,
          {
            transaction_type,
            total_amount,
            bulk_import: true,
          },
          req.ip,
          req.get("user-agent")
        );
      } catch (error) {
        results.errors.push({
          row: index + 2,
          error: error.message,
        });
      }
    });

    res.json({
      message: `Bulk import completed: ${results.success.length} succeeded, ${results.errors.length} failed`,
      results,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
