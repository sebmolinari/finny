const { body } = require("express-validator");
const Transaction = require("../../models/Transaction");
const UserSettings = require("../../models/UserSettings");

const { VALID_VALUES } = require("../../constants/validValues");

/**
 * Validation rules for creating/updating a transaction
 */
const transactionValidation = [
  body("date")
    .notEmpty()
    .withMessage("Date is required")
    .isISO8601()
    .withMessage("Date must be in ISO 8601 format (YYYY-MM-DD)"),
  //.toDate(),

  body("transaction_type")
    .notEmpty()
    .withMessage("Transaction type is required")
    .isIn(VALID_VALUES.TRANSACTION_TYPES)
    .withMessage(`Invalid transaction type. Valid types: ${VALID_VALUES.TRANSACTION_TYPES.join(", ")}`),

  body("total_amount")
    .notEmpty()
    .withMessage("Total amount is required")
    .isFloat()
    .withMessage("Total amount must be a number")
    .toFloat(),

  body("asset_id")
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage("Asset must be a positive integer")
    .toInt(),

  body("broker_id")
    .if(body("transaction_type").isIn(["buy", "sell", "dividend", "coupon", "interest", "rental", "transfer"]))
    .notEmpty()
    .withMessage("Broker is required for buy/sell/transfer")
    .bail()
    .isInt({ min: 1 })
    .withMessage("Broker must be a positive integer")
    .toInt(),

  body("destination_broker_id")
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage("Destination broker must be a positive integer")
    .toInt(),

  body("quantity")
    .if(body("transaction_type").isIn(["buy", "sell", "transfer"]))
    .notEmpty()
    .withMessage("Quantity is required for buy/sell/transfer")
    .bail()
    .isFloat({ gt: 0 })
    .withMessage("Quantity must be a positive number")
    .toFloat(),

  body("price")
    .if(body("transaction_type").isIn(["buy", "sell"]))
    .notEmpty()
    .withMessage("Price is required for buy/sell")
    .bail()
    .isFloat({ gt: 0 })
    .withMessage("Price must be a positive number")
    .toFloat(),

  body("fee")
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage("Fee must be a non-negative number")
    .toFloat(),

  body("notes")
    .trim()
    .custom((value, { req }) => {
      // Notes are mandatory for sell transactions
      if (req.body.transaction_type === "sell" && (!value || value.trim() === "")) {
        throw new Error("Notes are required for sell transactions");
      }
      return true;
    })
    .isLength({ max: 1000 })
    .withMessage("Notes must not exceed 1000 characters"),
];

/**
 * Core transaction business validation
 *
 * @param {Object} params.tx               Transaction payload
 * @param {string} params.userId
 * @param {boolean} params.isUpdate
 * @param {Object|null} params.currentTx   Existing transaction (PUT only)
 */
function validateTransactionBusiness({ tx, userId, isUpdate = false, currentTx = null }) {
  const { asset_id, broker_id, transaction_type, quantity, price, total_amount } = tx;

  const userSettings = UserSettings.findByUserId(userId);
  const validateCash = userSettings.validate_cash_balance;
  const validateSell = userSettings.validate_sell_balance;

  const error = (message) => {
    const err = new Error(message);
    err.status = 400;
    throw err;
  };

  const assetRequiredTypes = ["buy", "sell", "dividend", "interest", "rental", "coupon", "transfer"];

  if (assetRequiredTypes.includes(transaction_type)) {
    if (!asset_id) {
      error("asset is required");
    }
  }

  if (transaction_type === "buy" || transaction_type === "sell") {
    if (quantity == null || price == null || broker_id == null) {
      error("broker, asset, quantity, and price are required for buy/sell");
    }

    // BUY: cash balance
    if (transaction_type === "buy" && validateCash) {
      let availableCash = Transaction.getCashBalance(userId);

      // PUT: add back the original buy's total_amount so the existing spend
      // is not double-counted against the updated transaction
      if (isUpdate && currentTx && currentTx.transaction_type === "buy") {
        availableCash += currentTx.total_amount;
      }

      if (total_amount > availableCash) {
        error(`Insufficient cash balance. Available: ${availableCash}, attempted to buy: ${total_amount}`);
      }
    }

    // SELL: asset balance
    if (transaction_type === "sell" && validateSell) {
      let availableQuantity = Transaction.getAssetBrokerBalance(userId, asset_id, broker_id);

      // PUT: add back existing sell quantity
      if (isUpdate && currentTx && currentTx.transaction_type === "sell") {
        availableQuantity += currentTx.quantity;
      }

      if (quantity > availableQuantity) {
        error(`Insufficient balance. Available: ${availableQuantity}, attempted to sell: ${quantity}`);
      }
    }
  }

  if (transaction_type === "transfer") {
    const { destination_broker_id } = tx;
    if (!broker_id || !destination_broker_id || !asset_id || !quantity) {
      error("asset, broker, destination broker, and quantity are required for transfer");
    }
    if (broker_id === destination_broker_id) {
      error("Source and destination brokers must be different");
    }
    if (validateSell) {
      const availableQuantity = Transaction.getAssetBrokerBalance(userId, asset_id, broker_id);
      if (quantity > availableQuantity) {
        error(
          `Insufficient holdings at source broker. Available: ${availableQuantity}, attempted to transfer: ${quantity}`,
        );
      }
    }
  }
}

const { validationResult } = require("express-validator");

/**
 * Run transactionValidation programmatically (for bulk)
 */
async function runTransactionValidation(tx) {
  const fakeReq = { body: tx };

  // Run all validators
  for (const validator of transactionValidation) {
    await validator.run(fakeReq);
  }

  const result = validationResult(fakeReq);

  if (!result.isEmpty()) {
    const err = new Error(
      result
        .array()
        .map((e) => e.msg)
        .join(", "),
    );
    err.status = 400;
    err.details = result.array();
    throw err;
  }

  return fakeReq.body;
}

module.exports = {
  transactionValidation,
  validateTransactionBusiness,
  runTransactionValidation,
};
