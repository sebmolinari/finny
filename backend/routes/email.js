const express = require("express");
const router = express.Router();
const User = require("../models/User");
const emailService = require("../services/emailService");
const PortfolioEmailService = require("../services/portfolioEmailService");
const authMiddleware = require("../middleware/auth");

/**
 * @swagger
 * /email/summary:
 *   post:
 *     summary: Manually send portfolio summary email
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Email sent successfully
 *       400:
 *         description: Email service disabled or user email not found
 *       500:
 *         description: Server error
 */
router.post("/summary", authMiddleware, async (req, res) => {
  try {
    // Check if email service is enabled
    if (process.env.EMAIL_ENABLED !== "true") {
      return res.status(400).json({
        message: "Email service is not enabled on this server",
      });
    }

    // Get user information
    const user = User.findById(req.user.id);

    if (!user || !user.email) {
      return res.status(400).json({
        message: "User email not found",
      });
    }

    // Generate and send email
    const emailContent = PortfolioEmailService.generatePortfolioSummaryEmail(
      req.user.id,
      user.username,
    );

    if (!emailContent) {
      return res.status(500).json({
        message: "Failed to generate portfolio email",
      });
    }

    const result = await emailService.sendEmail(
      user.email,
      emailContent.subject,
      emailContent.html,
      emailContent.text,
      {
        userId: req.user.id,
        username: req.user.username,
        trigger: "manual_portfolio_summary_sent",
      },
    );

    if (result.success) {
      return res.json({
        message: "Portfolio email sent successfully",
        email: user.email,
      });
    } else {
      return res.status(500).json({
        message: `Failed to send email: ${result.message}`,
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /email/batch:
 *   post:
 *     summary: Send batch portfolio summary emails
 *     description: Sends portfolio summary emails to all users with the specified frequency (daily, weekly, or monthly).
 *     tags:
 *       - Email
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               frequency:
 *                 type: string
 *                 enum: [daily, weekly, monthly]
 *                 description: Frequency of the email batch
 *             required:
 *               - frequency
 *     responses:
 *       200:
 *         description: Batch email send result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sent:
 *                   type: integer
 *                   description: Number of emails sent
 *                 failed:
 *                   type: integer
 *                   description: Number of emails failed
 *       400:
 *         description: Invalid or missing frequency
 *       500:
 *         description: Internal server error
 */
router.post("/batch", async (req, res) => {
  const { frequency } = req.body;
  if (!frequency || !["daily", "weekly", "monthly"].includes(frequency)) {
    return res.status(400).json({ error: "Invalid or missing frequency" });
  }
  try {
    const result = await PortfolioEmailService.sendBatchEmails(frequency);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
