const express = require("express");
const router = express.Router();
const User = require("../models/User");
const UserSettings = require("../models/UserSettings");
const AuditLog = require("../models/AuditLog");
const authMiddleware = require("../middleware/auth");
const adminMiddleware = require("../middleware/admin");
const logger = require("../utils/logger");
const { validate } = require("../utils/validationMiddleware");
const {
  updateUserStatusValidation,
  updateUserRoleValidation,
} = require("../middleware/validators/userValidators");

// All user routes require authentication and admin privileges
router.use(authMiddleware);
router.use(adminMiddleware);

// Get all users
router.get("/", (req, res) => {
  try {
    const { page, limit, search, role, active } = req.query;
    const result = User.getAll({ page, limit, search, role, active });
    res.json(result);
  } catch (error) {
    logger.error(`Error fetching users: ${error.message}`);
    res.status(500).json({ message: "Server error fetching users" });
  }
});

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Page size
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by username or email
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Filter by role
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of users
 *       500:
 *         description: Server error
 */
// Update user status (enable/disable)
router.patch(
  "/:id/status",
  validate(updateUserStatusValidation),
  (req, res) => {
    try {
      const { id } = req.params;
      const { active } = req.body;

      /**
       * @swagger
       * /users/{id}/status:
       *   patch:
       *     summary: Update user status (enable/disable)
       *     tags: [Users]
       *     security:
       *       - bearerAuth: []
       *     parameters:
       *       - in: path
       *         name: id
       *         required: true
       *         schema:
       *           type: integer
       *         description: User ID
       *     requestBody:
       *       required: true
       *       content:
       *         application/json:
       *           schema:
       *             type: object
       *             properties:
       *               active:
       *                 type: boolean
       *     responses:
       *       200:
       *         description: User status updated
       *       400:
       *         description: Validation error
       *       404:
       *         description: User not found
       *       500:
       *         description: Server error
       */
      // Prevent disabling yourself
      if (parseInt(id) === req.user.id) {
        return res
          .status(400)
          .json({ message: "You cannot disable your own account" });
      }

      const activeValue = active ? 1 : 0;
      User.updateStatus(id, activeValue, req.user.id);

      const updatedUser = User.findById(id);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      logger.info(
        `USER STATUS UPDATED: ${updatedUser.username} ${
          active ? "enabled" : "disabled"
        } by ${req.user.username}`,
      );

      // Log user status update
      AuditLog.logUpdate(
        req.user.id,
        req.user.username,
        "users",
        parseInt(id),
        { active: !active },
        { active: activeValue },
        req.ip,
        req.get("user-agent"),
      );

      res.json({
        message: `User ${active ? "enabled" : "disabled"} successfully`,
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          role: updatedUser.role,
          active: updatedUser.active,
        },
      });
    } catch (error) {
      logger.error(`Error updating user status: ${error.message}`);
      res.status(500).json({ message: "Server error updating user status" });
    }
  },
);

// Update user role
router.patch("/:id/role", validate(updateUserRoleValidation), (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    /**
     * @swagger
     * /users/{id}/role:
     *   patch:
     *     summary: Update user role
     *     tags: [Users]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: User ID
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               role:
     *                 type: string
     *                 enum: [user, admin]
     *     responses:
     *       200:
     *         description: User role updated
     *       400:
     *         description: Validation error
     *       404:
     *         description: User not found
     *       500:
     *         description: Server error
     */

    // Prevent changing your own role
    if (parseInt(id) === req.user.id) {
      return res
        .status(400)
        .json({ message: "You cannot change your own role" });
    }

    User.updateRole(id, role, req.user.id);

    const updatedUser = User.findById(id);
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    logger.info(
      `USER ROLE UPDATED: ${updatedUser.username} changed to ${role} by ${req.user.username}`,
    );

    // Log user role update
    AuditLog.logUpdate(
      req.user.id,
      req.user.username,
      "users",
      parseInt(id),
      { role: updatedUser.role === role ? "user" : updatedUser.role },
      { role: role },
      req.ip,
      req.get("user-agent"),
    );

    res.json({
      message: "User role updated successfully",
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        active: updatedUser.active,
      },
    });
  } catch (error) {
    logger.error(`Error updating user role: ${error.message}`);
    res.status(500).json({ message: "Server error updating user role" });
  }
});

// Delete user
router.delete("/:id", (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (parseInt(id) === req.user.id) {
      return res
        .status(400)
        .json({ message: "You cannot delete your own account" });
    }

    /**
     * @swagger
     * /users/{id}:
     *   delete:
     *     summary: Delete a user
     *     tags: [Users]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: User ID
     *     responses:
     *       200:
     *         description: User deleted
     *       400:
     *         description: Validation error
     *       404:
     *         description: User not found
     *       500:
     *         description: Server error
     */
    const user = User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    UserSettings.deleteByUserId(id);
    User.deleteById(id);

    logger.info(
      `USER DELETED: ${user.username} (ID: ${id}) deleted by ${req.user.username}`,
    );

    // Log user deletion
    AuditLog.logDelete(
      req.user.id,
      req.user.username,
      "users",
      parseInt(id),
      {
        username: user.username,
        email: user.email,
        role: user.role,
      },
      req.ip,
      req.get("user-agent"),
    );

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    logger.error(`Error deleting user: ${error.message}`);
    res.status(500).json({ message: "Server error deleting user" });
  }
});

module.exports = router;
