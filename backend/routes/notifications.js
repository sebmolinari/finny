const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const AuditLog = require("../models/AuditLog");
const authMiddleware = require("../middleware/auth");
const adminMiddleware = require("../middleware/admin");

router.use(authMiddleware);

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get notifications for current user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: unread_only
 *         schema:
 *           type: boolean
 *         description: Return only unread notifications when true
 *     responses:
 *       200:
 *         description: Notifications list with unread count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notifications:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       type:
 *                         type: string
 *                       title:
 *                         type: string
 *                       message:
 *                         type: string
 *                         nullable: true
 *                       is_read:
 *                         type: integer
 *                         description: 0 = unread, 1 = read
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       metadata:
 *                         nullable: true
 *                 unreadCount:
 *                   type: integer
 *       401:
 *         description: Authentication required
 */
router.get("/", (req, res) => {
  try {
    const unreadOnly = req.query.unread_only === "true";
    const notifications = Notification.getByUser(req.user.id, unreadOnly);
    const unreadCount = Notification.getUnreadCount(req.user.id);
    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Number of notifications marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 changed:
 *                   type: integer
 *       401:
 *         description: Authentication required
 */
router.patch("/read-all", (req, res) => {
  try {
    const changed = Notification.markAllRead(req.user.id);
    AuditLog.logUpdate(
      req.user.id,
      req.user.username,
      "notifications",
      null,
      { action: "mark_all_read", changed },
      req.ip,
      req.get("user-agent"),
    );
    res.json({ changed });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /notifications/{id}/read:
 *   patch:
 *     summary: Mark a single notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       404:
 *         description: Notification not found
 *       401:
 *         description: Authentication required
 */
router.patch("/:id/read", (req, res) => {
  try {
    const changed = Notification.markRead(req.user.id, parseInt(req.params.id));
    if (!changed) {
      return res.status(404).json({ message: "Notification not found" });
    }
    AuditLog.logUpdate(
      req.user.id,
      req.user.username,
      "notifications",
      parseInt(req.params.id),
      { action: "mark_read" },
      req.ip,
      req.get("user-agent"),
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /notifications/admin/purge:
 *   delete:
 *     summary: Delete all notifications for the authenticated user
 *     description: Permanently removes every notification (read and unread) for the requesting user. Useful for resetting notification state so fresh alerts are generated on the next poll cycle.
 *     tags: [Notifications]
 *     security:
 *       - adminAuth: []
 *     responses:
 *       200:
 *         description: All notifications deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deleted:
 *                   type: integer
 *                   description: Number of notifications deleted
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin privileges required
 */
router.delete("/admin/purge", adminMiddleware, (req, res) => {
  try {
    const deleted = Notification.deleteAll(req.user.id);
    AuditLog.logDelete(
      req.user.id,
      req.user.username,
      "notifications",
      null,
      { action: "purge_all", deleted },
      req.ip,
      req.get("user-agent"),
    );
    res.json({ deleted });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
