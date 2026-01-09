const { body } = require("express-validator");
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
    .withMessage(
      `Invalid transaction type. Valid types: ${VALID_VALUES.TRANSACTION_TYPES.join(
        ", "
      )}`
    ),

  body("total_amount")
    .notEmpty()
    .withMessage("Total amount is required")
    .isFloat()
    .withMessage("Total amount must be a number")
    .toFloat(),

  body("asset_id")
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage("Asset ID must be a positive integer")
    .toInt(),

  body("broker_id")
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage("Broker ID must be a positive integer")
    .toInt(),

  body("quantity")
    .optional({ checkFalsy: true })
    .isFloat({ gt: 0 })
    .withMessage("Quantity must be a positive number")
    .toFloat(),

  body("price")
    .optional({ checkFalsy: true })
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
      if (
        req.body.transaction_type === "sell" &&
        (!value || value.trim() === "")
      ) {
        throw new Error("Notes are required for sell transactions");
      }
      return true;
    })
    .isLength({ max: 1000 })
    .withMessage("Notes must not exceed 1000 characters"),
];

module.exports = {
  transactionValidation,
};
