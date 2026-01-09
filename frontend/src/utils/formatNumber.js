/**
 * Format a number with thousands separators and decimal places
 * @param {number} value - The number to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @param {boolean} includeDecimals - Whether to include decimals (default: true)
 * @returns {string} Formatted number string
 */
export const formatNumber = (value, decimals = 2, includeDecimals = true) => {
  if (value === null || value === undefined || isNaN(value)) {
    return includeDecimals ? "0.00" : "0";
  }

  const num = parseFloat(value);

  if (includeDecimals) {
    return num.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

/**
 * Format a currency value with thousands separators
 * @param {number} value - The number to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted currency string with $ prefix
 */
export const formatCurrency = (value, decimals = 2) => {
  return `$${formatNumber(value, decimals)}`;
};

/**
 * Format a percentage value
 * @param {number} value - The number to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted percentage string with % suffix
 */
export const formatPercent = (value, decimals = 2) => {
  return `${formatNumber(value, decimals)}%`;
};
