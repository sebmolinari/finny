const jwt = require("jsonwebtoken");
const logger = require("../config/logger");

const authMiddleware = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.warn(
        `AUTH FAILED: No token provided for ${req.method} ${req.path}`,
      );
      return res.status(401).json({ message: "Authentication required" });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // logger.info(
    //   `AUTH SUCCESS: User ${decoded.username} (${decoded.role}) authenticated`
    // );

    next();
  } catch (error) {
    logger.warn(`AUTH FAILED: Invalid token - ${error.message}`);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = authMiddleware;
