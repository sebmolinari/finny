const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const authMiddleware = require("../middleware/auth");

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
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
