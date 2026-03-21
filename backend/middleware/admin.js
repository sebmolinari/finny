const logger = require("../utils/logger");

// Admin-only middleware
const adminMiddleware = (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      logger.warn(
        `AUTHORIZATION FAILED: User ${req.user?.username || "unknown"} (${
          req.user?.role || "none"
        }) attempted admin action`,
      );
      return res
        .status(403)
        .json({ message: "Access denied. Admin privileges required." });
    }

    next();
  } catch (error) {
    logger.error(`AUTHORIZATION ERROR: ${error.message}`);
    return res.status(403).json({ message: "Access denied" });
  }
};

module.exports = adminMiddleware;
module.exports.adminOrSuperuser = adminMiddleware;
