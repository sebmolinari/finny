/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",

  // Discover all *.test.js files under tests/
  testMatch: ["**/tests/**/*.test.js"],

  // Set env vars before any module is loaded
  setupFiles: ["./tests/setup/env.js"],

  // Redirect every require that resolves to config/database to the in-memory test DB.
  // This covers any relative depth (../../config/database, ../config/database, etc.)
  moduleNameMapper: {
    "^.+/config/database$": "<rootDir>/tests/setup/testDb.js",
  },

  // Silence console output from the app during tests (optional: comment out to debug)
  silent: false,

  // Exit after all tests complete, even if there are open handles (timer leaks)
  forceExit: true,

  // --- Coverage ---
  collectCoverageFrom: [
    "<rootDir>/errors/**/*.js",
    "<rootDir>/middleware/**/*.js",
    "<rootDir>/models/**/*.js",
    "<rootDir>/routes/**/*.js",
    "<rootDir>/services/**/*.js",
    "<rootDir>/utils/**/*.js",

    "!<rootDir>/config/**",
    "!<rootDir>/constants/**",
    "!<rootDir>/data/**",
    "!<rootDir>/migrations/**",
    "!<rootDir>/scripts/**",
    "!<rootDir>/server.js",
    "!<rootDir>/**/node_modules/**",
  ],

  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // text → terminal summary  html → open coverage/index.html  lcov → CI integration
  coverageReporters: ["text", "html", "lcov"],
  coverageDirectory: "coverage",
};
