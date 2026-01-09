/**
 * Format a number as currency
 */
function formatCurrency(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) {
    return "$0.00";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format a number as percentage
 */
function formatPercent(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) {
    return "0.00";
  }

  return value.toFixed(decimals);
}

module.exports = {
  formatCurrency,
  formatPercent,
};
