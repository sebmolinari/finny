const express = require("express");
const router = express.Router();
const Transaction = require("../models/Transaction");
const Asset = require("../models/Asset");
const Broker = require("../models/Broker");
const AuditLog = require("../models/AuditLog");
const UserSettings = require("../models/UserSettings");
const authMiddleware = require("../middleware/auth");
const { validate } = require("../utils/validationMiddleware");
const { getTodayInTimezone } = require("../utils/dateUtils");
const {
  transactionValidation,
  validateTransactionBusiness,
  runTransactionValidation,
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
    const result = Transaction.findByUser(req.user.id);

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Note: transactions export endpoint removed — export handled by frontend DataGrid

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
      validateTransactionBusiness({
        tx: req.body,
        userId: req.user.id,
      });

      const {
        asset_id,
        broker_id,
        destination_broker_id,
        date,
        transaction_type,
        quantity,
        price,
        total_amount,
        fee,
        notes,
      } = req.body;

      const id = Transaction.create(
        req.user.id,
        {
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
        },
        req.user.id,
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
        req.get("user-agent"),
      );

      res.status(201).json(transaction);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message });
    }
  },
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
      const currentTransaction = Transaction.findById(
        req.params.id,
        req.user.id,
      );

      if (!currentTransaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      validateTransactionBusiness({
        tx: req.body,
        userId: req.user.id,
        isUpdate: true,
        currentTx: currentTransaction,
      });

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

      const oldValues = {
        asset_id: currentTransaction.asset_id,
        broker_id: currentTransaction.broker_id,
        date: currentTransaction.date,
        transaction_type: currentTransaction.transaction_type,
        quantity: currentTransaction.quantity,
        price: currentTransaction.price,
        fee: currentTransaction.fee,
        total_amount: currentTransaction.total_amount,
        notes: currentTransaction.notes,
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
        req.user.id,
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
        req.get("user-agent"),
      );

      res.json(transaction);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.message });
    }
  },
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
        req.get("user-agent"),
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
 *                       enum: [buy, sell, dividend, deposit, withdraw, interest, coupon, rental]
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
router.post("/bulk", authMiddleware, async (req, res) => {
  try {
    const { transactions } = req.body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res
        .status(400)
        .json({ message: "Transactions array is required" });
    }

    const brokers = Broker.findByUser(req.user.id, {
      includeInactive: true,
    });

    const assets = Asset.getAll({
      includeInactive: true,
    });

    const results = {
      success: [],
      errors: [],
    };

    // validate every entry is an object before processing
    if (!transactions.every((t) => typeof t === "object")) {
      return res.status(400).json({
        message: "Each transaction must be an object",
      });
    }

    // ✅ async-safe loop
    for (const [index, txData] of transactions.entries()) {
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

      let asset_id = null;
      let broker_id = null;

      // For non-cash transactions, get the asset and broker IDs
      if (transaction_type !== "deposit" && transaction_type !== "withdraw") {
        const asset = assets.find(
          (a) => a.symbol.toLowerCase() === asset_symbol?.toLowerCase(),
        );
        const broker = brokers.find(
          (b) => b.name.toLowerCase() === broker_name?.toLowerCase(),
        );
        asset_id = asset?.id;
        broker_id = broker?.id;
      }

      try {
        // ✅ 1. Schema validation
        const validatedTx = await runTransactionValidation({
          asset_id,
          broker_id,
          date,
          transaction_type,
          quantity,
          price,
          fee,
          total_amount,
          notes,
        });

        // ✅ 2. Business validation (existing)
        validateTransactionBusiness({
          tx: validatedTx,
          userId: req.user.id,
        });

        // ✅ 3. Create transaction
        const id = Transaction.create(req.user.id, validatedTx, req.user.id);

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
          req.get("user-agent"),
        );
      } catch (error) {
        results.errors.push({
          row: index + 2,
          error: error.message,
          details: error.details || null,
        });
      }
    }

    res.json({
      message: `Bulk import completed: ${results.success.length} succeeded, ${results.errors.length} failed`,
      results,
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /transactions/transfer:
 *   post:
 *     summary: Create a broker-to-broker transfer for an asset at cost basis
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - asset_id
 *               - broker_id
 *               - destination_broker_id
 *               - quantity
 *               - date
 *             properties:
 *               asset_id:
 *                 type: integer
 *                 description: Asset ID to transfer
 *               broker_id:
 *                 type: integer
 *                 description: Source broker ID
 *               destination_broker_id:
 *                 type: integer
 *                 description: Destination broker ID
 *               quantity:
 *                 type: number
 *                 description: Quantity to transfer
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Transfer date (YYYY-MM-DD)
 *               notes:
 *                 type: string
 *                 description: Optional notes
 *     responses:
 *       201:
 *         description: Transfer transaction created
 *       400:
 *         description: Insufficient holdings or invalid input
 *       404:
 *         description: Asset or broker not found
 *       500:
 *         description: Server error
 */
router.post("/transfer", authMiddleware, (req, res) => {
  try {
    const {
      id,
      asset_id,
      broker_id,
      destination_broker_id,
      quantity,
      date,
      notes,
    } = req.body;

    if (
      !asset_id ||
      !broker_id ||
      !destination_broker_id ||
      !quantity ||
      !date
    ) {
      return res.status(400).json({
        message:
          "asset_id, broker_id, destination_broker_id, quantity, and date are required",
      });
    }
    if (broker_id === destination_broker_id) {
      return res
        .status(400)
        .json({ message: "Source and destination brokers must be different" });
    }

    // Validate that asset and both brokers exist and belong to user's context
    const asset = Asset.findById(asset_id);
    if (!asset) return res.status(404).json({ message: "Asset not found" });

    const sourceBroker = Broker.findById(broker_id, req.user.id);
    if (!sourceBroker)
      return res.status(404).json({ message: "Source broker not found" });

    const destBroker = Broker.findById(destination_broker_id, req.user.id);
    if (!destBroker)
      return res.status(404).json({ message: "Destination broker not found" });

    // Check source broker has sufficient holdings
    let availableQuantity = Transaction.getAssetBrokerBalance(
      req.user.id,
      asset_id,
      broker_id,
    );

    // When updating an existing transfer, add back the original quantity so it
    // isn't double-counted against the new quantity being validated
    let existingTx = null;
    if (id) {
      existingTx = Transaction.findById(id, req.user.id);
      if (!existingTx) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      if (
        existingTx.broker_id === parseInt(broker_id) &&
        existingTx.asset_id === parseInt(asset_id)
      ) {
        availableQuantity += existingTx.quantity;
      }
    }

    if (quantity > availableQuantity) {
      return res.status(400).json({
        message: `Insufficient holdings at source broker. Available: ${availableQuantity}, attempted to transfer: ${quantity}`,
      });
    }

    // Get current FIFO cost basis at source to preserve cost basis in transfer
    const AnalyticsService = require("../services/analyticsService");
    const sourceHoldings = AnalyticsService.getPortfolioHoldings(
      req.user.id,
    ).filter(
      (h) =>
        h.asset_id === parseInt(asset_id) &&
        h.broker_id === parseInt(broker_id),
    );

    const sourceholding = sourceHoldings[0];
    const costPerUnit =
      sourceholding && sourceholding.total_quantity > 0
        ? sourceholding.cost_basis / sourceholding.total_quantity
        : 0;
    const totalCostTransferred = costPerUnit * quantity;

    const transferData = {
      asset_id: parseInt(asset_id),
      broker_id: parseInt(broker_id),
      destination_broker_id: parseInt(destination_broker_id),
      date,
      transaction_type: "transfer",
      quantity,
      price: costPerUnit,
      fee: 0,
      total_amount: totalCostTransferred,
      notes:
        notes || `Transfer from ${sourceBroker.name} to ${destBroker.name}`,
    };

    if (id) {
      // Update existing transfer
      Transaction.update(id, req.user.id, transferData, req.user.id);

      const transaction = Transaction.findById(id, req.user.id);

      AuditLog.logUpdate(
        req.user.id,
        req.user.username,
        "transactions",
        parseInt(id),
        {
          transaction_type: existingTx.transaction_type,
          asset_id: existingTx.asset_id,
          broker_id: existingTx.broker_id,
          destination_broker_id: existingTx.destination_broker_id,
          quantity: existingTx.quantity,
          date: existingTx.date,
          notes: existingTx.notes,
        },
        {
          transaction_type: "transfer",
          asset_id,
          broker_id,
          destination_broker_id,
          quantity,
          date,
          notes: transferData.notes,
        },
        req.ip,
        req.get("user-agent"),
      );

      return res.json(transaction);
    }

    const newId = Transaction.create(req.user.id, transferData, req.user.id);

    const transaction = Transaction.findById(newId, req.user.id);

    AuditLog.logCreate(
      req.user.id,
      req.user.username,
      "transactions",
      newId,
      {
        transaction_type: "transfer",
        asset_id,
        broker_id,
        destination_broker_id,
        quantity,
      },
      req.ip,
      req.get("user-agent"),
    );

    res.status(201).json(transaction);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

module.exports = router;
