const logger = require("../config/logger");

// Admin-only middleware (strict)
const adminMiddleware = (req, res, next) => {
  try {
    // Check if user has admin role only
    if (!req.user || req.user.role !== "admin") {
      logger.warn(
        `AUTHORIZATION FAILED: User ${req.user?.username || "unknown"} (${
          req.user?.role || "none"
        }) attempted admin action`
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

// Admin or Superuser middleware (allows both roles)
const adminOrSuperuserMiddleware = (req, res, next) => {
  try {
    // Check if user has admin or superuser role
    if (!req.user || !["admin", "superuser"].includes(req.user.role)) {
      logger.warn(
        `AUTHORIZATION FAILED: User ${req.user?.username || "unknown"} (${
          req.user?.role || "none"
        }) attempted privileged action`
      );
      return res.status(403).json({
        message: "Access denied. Admin or Superuser privileges required.",
      });
    }

    next();
  } catch (error) {
    logger.error(`AUTHORIZATION ERROR: ${error.message}`);
    return res.status(403).json({ message: "Access denied" });
  }
};

module.exports = adminMiddleware;
module.exports.adminOrSuperuser = adminOrSuperuserMiddleware;
