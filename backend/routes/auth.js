const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const authMiddleware = require("../middleware/auth");
const logger = require("../config/logger");
const { validate } = require("../utils/validationMiddleware");
const {
  registerValidation,
  loginValidation,
  changePasswordValidation,
} = require("../middleware/validators/authValidators");

// Helper function to generate JWT token
const generateToken = (userId, username, role) => {
  return jwt.sign({ id: userId, username, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRATION,
  });
};

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
// Register
router.post("/register", validate(registerValidation), async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user exists
    const existingUser = User.findByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const existingEmail = User.findByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Create user
    const userId = User.create(username, email, password, "user");

    logger.info(`USER REGISTERED: ${username} (ID: ${userId})`);

    // Log registration
    AuditLog.logCreate(
      userId,
      username,
      "users",
      userId,
      {
        username,
        email,
        role: "user",
      },
      req.ip,
      req.get("user-agent"),
    );

    // Generate token
    const token = generateToken(userId, username, "user");

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: { id: userId, username, email, role: "user" },
    });
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    res.status(500).json({ message: "Server error during registration" });
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account disabled
 *       500:
 *         description: Server error
 */
// Login
router.post("/login", validate(loginValidation), async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = User.findByUsername(username);

    if (!user) {
      logger.warn(`LOGIN FAILED: User not found - ${username}`);
      AuditLog.logLoginFailed(
        username,
        req.ip,
        req.get("user-agent"),
        "User not found",
      );
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if user is active
    if (!user.active) {
      logger.warn(`LOGIN FAILED: Account disabled - ${username}`);
      AuditLog.logLoginFailed(
        username,
        req.ip,
        req.get("user-agent"),
        "Account is disabled",
      );
      return res.status(403).json({
        message: "Account is disabled. Please contact an administrator.",
      });
    }

    // Verify password
    const isValidPassword = User.verifyPassword(password, user.password);
    if (!isValidPassword) {
      logger.warn(`LOGIN FAILED: Invalid password - ${username}`);
      AuditLog.logLoginFailed(
        username,
        req.ip,
        req.get("user-agent"),
        "Invalid password",
      );
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate token
    const token = generateToken(user.id, user.username, user.role);

    logger.info(`LOGIN SUCCESS: ${username} (${user.role})`);

    // Log successful login
    AuditLog.logLogin(user.id, user.username, req.ip, req.get("user-agent"));

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    res.status(500).json({ message: "Server error during login" });
  }
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout the current user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
// Logout
router.post("/logout", authMiddleware, (req, res) => {
  // With token-based auth, logout is handled on the client by removing the token
  logger.info(`USER LOGOUT: ${req.user.username}`);

  // Log logout
  AuditLog.logLogout(
    req.user.id,
    req.user.username,
    req.ip,
    req.get("user-agent"),
  );

  res.json({ message: "Logout successful" });
});

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user info
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user info
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
// Verify token / Get current user
router.get("/me", authMiddleware, (req, res) => {
  try {
    const user = User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error(`Error fetching user: ${error.message}`);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Validation error or incorrect current password
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
// Change password
router.post(
  "/change-password",
  authMiddleware,
  validate(changePasswordValidation),
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      // Get user
      const user = User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isValidPassword = User.verifyPassword(
        currentPassword,
        user.password,
      );
      if (!isValidPassword) {
        logger.warn(
          `PASSWORD CHANGE FAILED: Invalid current password - ${user.username}`,
        );
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }

      // Check if new password is same as current
      if (currentPassword === newPassword) {
        return res.status(400).json({
          message: "New password must be different from current password",
        });
      }

      // Update password
      User.changePassword(userId, newPassword);

      logger.info(`PASSWORD CHANGED: ${user.username} (ID: ${userId})`);

      // Log password change
      AuditLog.logUpdate(
        userId,
        user.username,
        "users",
        userId,
        {
          action: "password_change",
        },
        undefined,
        req.ip,
        req.get("user-agent"),
      );

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      logger.error(`Password change error: ${error.message}`);
      res.status(500).json({ message: "Server error during password change" });
    }
  },
);

module.exports = router;
