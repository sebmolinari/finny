// Validation utilities for common input validation

const validators = {
  // Email validation
  isValidEmail: (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },

  // Username validation (alphanumeric + underscore, 3-30 chars)
  isValidUsername: (username) => {
    if (!username || username.length < 3 || username.length > 30) {
      return false;
    }
    return /^[a-zA-Z0-9_]+$/.test(username);
  },

  // Password strength validation
  isValidPassword: (password) => {
    if (!password || password.length < 8) {
      return false;
    }
    // At least one uppercase, one lowercase, one digit
    return /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password);
  },

  // Date format validation (YYYY-MM-DD)
  isValidDate: (date) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return false;
    }
    const d = new Date(date);
    return d instanceof Date && !isNaN(d);
  },

  // Positive number validation
  isPositiveNumber: (value) => {
    const num = parseFloat(value);
    return !isNaN(num) && num > 0;
  },

  // Currency code validation (3 uppercase letters)
  isValidCurrencyCode: (code) => {
    return /^[A-Z]{3}$/.test(code);
  },

  // Sanitize string (remove HTML tags and special chars)
  sanitizeString: (str) => {
    if (!str) return "";
    return str
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/[<>]/g, "") // Remove remaining angle brackets
      .trim();
  },

  // Validate pagination parameters
  validatePagination: (page, limit, maxLimit = 100) => {
    const parsedPage = parseInt(page) || 1;
    const parsedLimit = Math.min(parseInt(limit) || 50, maxLimit);
    return {
      page: Math.max(1, parsedPage),
      limit: Math.max(1, parsedLimit),
    };
  },
};

module.exports = validators;
