// Utility for value/scale integer storage to avoid floating point precision issues

// Define scales for each concept
const QUANTITY_SCALE = 8; // Support up to 8 decimal places for quantity (e.g., crypto)
const PRICE_SCALE = 6; // Support up to 6 decimal places for prices
const FEE_SCALE = 4; // Support up to 4 decimal places for fees
const AMOUNT_SCALE = 4; // Support up to 4 decimal places for amounts

/**
 * Convert a float value to value/scale integer representation
 * @param {number|null|undefined} floatVal - The float value to convert
 * @param {number} scale - The scale (number of decimal places)
 * @returns {{value: number|null, scale: number}} - Object with value and scale
 */
function toValueScale(floatVal, scale) {
  if (floatVal === null || floatVal === undefined) {
    return { value: null, scale };
  }
  const value = Math.round(Number(floatVal) * Math.pow(10, scale));
  return { value, scale };
}

/**
 * Convert value/scale integer representation back to float
 * @param {number|null|undefined} value - The integer value
 * @param {number|null|undefined} scale - The scale (number of decimal places)
 * @returns {number|null} - The float value, or null if inputs are invalid
 */
function fromValueScale(value, scale) {
  if (
    value === null ||
    value === undefined ||
    scale === null ||
    scale === undefined
  ) {
    return null;
  }
  return value / Math.pow(10, scale);
}

module.exports = {
  QUANTITY_SCALE,
  PRICE_SCALE,
  FEE_SCALE,
  AMOUNT_SCALE,
  toValueScale,
  fromValueScale,
};
