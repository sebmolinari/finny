const express = require("express");
const router = express.Router();
const AuthService = require("../services/authService");
const User = require("../models/User");
const UserSettings = require("../models/UserSettings");
const AuditLog = require("../models/AuditLog");
const authMiddleware = require("../middleware/auth");
const logger = require("../utils/logger");
const { validate } = require("../utils/validationMiddleware");
const {
  registerValidation,
  loginValidation,
  changePasswordValidation,
} = require("../middleware/validators/authValidators");

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
 *       409:
 *         description: Username or email already exists
 *       500:
 *         description: Server error
 */
router.post("/register", validate(registerValidation), async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const result = await AuthService.register(username, email, password, req.ip, req.get("user-agent"));
    res.status(201).json({ message: "User registered successfully", ...result });
  } catch (error) {
    next(error);
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
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account disabled
 *       500:
 *         description: Server error
 */
router.post("/login", validate(loginValidation), async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const result = await AuthService.login(username, password, req.ip, req.get("user-agent"));
    res.json({ message: "Login successful", ...result });
  } catch (error) {
    next(error);
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
router.post("/logout", authMiddleware, (req, res) => {
  logger.info(`USER LOGOUT: ${req.user.username}`);
  AuditLog.logLogout(req.user.id, req.user.username, req.ip, req.get("user-agent"));
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
router.get("/me", authMiddleware, (req, res, next) => {
  try {
    const user = User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const settings = UserSettings.findByUserId(user.id);
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        onboarding_completed: settings?.onboarding_completed ?? 0,
      },
    });
  } catch (error) {
    next(error);
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
router.post("/change-password", authMiddleware, validate(changePasswordValidation), async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await AuthService.changePassword(req.user.id, currentPassword, newPassword, req.ip, req.get("user-agent"));
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
