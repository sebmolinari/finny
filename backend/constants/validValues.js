// Centralized validation constants for the application

const VALID_VALUES = {
  ASSET_TYPES: ["crypto", "currency", "equity", "fixedincome"],

  TRANSACTION_TYPES: [
    "buy",
    "sell",
    "dividend",
    "interest",
    "coupon",
    "deposit",
    "withdraw",
  ],

  USER_ROLES: ["user", "superuser", "admin"],

  THEMES: ["light", "dark"],

  AUDIT_ACTION_TYPES: [
    "login",
    "logout",
    "login_failed",
    "create",
    "update",
    "delete",
    "export",
    "import",
    "settings_change",
    "email_sent",
  ],

  PRICE_SOURCES: ["coingecko", "dolarapi", "manual", "supabase", "yahoo"],

  CURRENCIES: ["ARS", "USD"],
};

// Helper function to validate a value against a valid set
const isValid = (value, validSet) => {
  return VALID_VALUES[validSet] && VALID_VALUES[validSet].includes(value);
};

module.exports = {
  VALID_VALUES,
  isValid,
};
