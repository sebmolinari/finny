const { body, param } = require("express-validator");
const { VALID_VALUES } = require("../../constants/validValues");

/**
 * Validation rules for creating/updating allocation target
 */
const allocationTargetValidation = [
  body("asset_type")
    .optional({ nullable: true })
    .isIn(VALID_VALUES.ASSET_TYPES)
    .withMessage(
      `Asset type must be one of: ${VALID_VALUES.ASSET_TYPES.join(", ")}`
    ),
  body("asset_id")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("Asset ID must be a positive integer"),
  body().custom((value, { req }) => {
    const hasAssetType =
      req.body.asset_type !== undefined && req.body.asset_type !== null;
    const hasAssetId =
      req.body.asset_id !== undefined && req.body.asset_id !== null;

    if ((hasAssetType && hasAssetId) || (!hasAssetType && !hasAssetId)) {
      throw new Error(
        "Must provide either asset_type or asset_id, not both or neither"
      );
    }
    return true;
  }),
  body("target_percentage")
    .isFloat({ min: 0, max: 100 })
    .withMessage("Target percentage must be between 0 and 100"),
  body("notes").optional({ nullable: true }).isString(),
];

/**
 * Validation rules for batch updating allocation targets
 */
const batchAllocationTargetsValidation = [
  body("targets").isArray().withMessage("Targets must be an array"),
  body("targets.*.asset_type")
    .optional({ nullable: true })
    .isIn(VALID_VALUES.ASSET_TYPES)
    .withMessage(
      `Asset type must be one of: ${VALID_VALUES.ASSET_TYPES.join(", ")}`
    ),
  body("targets.*.asset_id")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("Asset ID must be a positive integer"),
  body("targets.*.target_percentage")
    .isFloat({ min: 0, max: 100 })
    .withMessage("Target percentage must be between 0 and 100"),
  body("targets.*.notes").optional({ nullable: true }).isString(),
];

module.exports = {
  allocationTargetValidation,
  batchAllocationTargetsValidation,
};
