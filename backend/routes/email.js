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
      user.email,
      user.username
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
      }
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

module.exports = router;
