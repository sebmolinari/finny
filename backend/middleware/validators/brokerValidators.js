const { body } = require("express-validator");

/**
 * Validation rules for creating/updating a broker
 */
const brokerValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Broker name is required")
    .isLength({ min: 1, max: 255 })
    .withMessage("Broker name must be between 1 and 255 characters"),

  body("description")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Description must not exceed 1000 characters"),

  body("website")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage("Website must not exceed 255 characters")
    .isURL({ require_protocol: false })
    .withMessage("Please provide a valid URL"),

  body("active")
    .optional()
    .isBoolean({ loose: true })
    .withMessage("Active must be a boolean")
    .toBoolean(),
];

const { validationResult } = require("express-validator");

async function runBrokerValidation(data) {
  const fakeReq = { body: data };
  for (const validator of brokerValidation) {
    await validator.run(fakeReq);
  }
  const result = validationResult(fakeReq);
  if (!result.isEmpty()) {
    const err = new Error(result.array().map((e) => e.msg).join(", "));
    err.status = 400;
    err.details = result.array();
    throw err;
  }
  return fakeReq.body;
}

module.exports = {
  brokerValidation,
  runBrokerValidation,
};
