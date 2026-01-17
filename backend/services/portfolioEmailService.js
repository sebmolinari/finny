const AnalyticsService = require("./analytics");
const UserSettings = require("../models/UserSettings");
const { getTodayInTimezone } = require("../utils/dateUtils");
const { formatCurrency, formatPercent } = require("../utils/formatters");
const emailService = require("./emailService");
const logger = require("../config/logger");

class PortfolioEmailService {
  /**
   * Generate HTML email content with portfolio summary
   */
  static generatePortfolioSummaryEmail(userId, username) {
    try {
      const userSettings = UserSettings.findByUserId(userId);
      const today = getTodayInTimezone(userSettings.timezone);
      // Get portfolio analytics data
      const dashboard = AnalyticsService.getPortfolioAnalytics(userId);

      const htmlContent = this._generateHTML(dashboard, username, today);
      return {
        subject: `Portfolio Summary - ${today}`,
        html: htmlContent,
      };
    } catch (error) {
      logger.error(
        `Error generating portfolio email for user ${userId}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Generate HTML email template
   */
  static _generateHTML(dashboard, username, today) {
    const { nav, transactions } = dashboard;
    const {
      holdings_market_value,
      daily_pnl,
      cash_balance,
      unrealized_gain,
      unrealized_gain_percent,
      liquidity_balance,
      mwrr,
      cagr,
      holdings,
      asset_allocation,
    } = transactions;

    const topHoldings = holdings
      .sort((a, b) => b.market_value - a.market_value)
      .slice(0, 10);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Portfolio Summary</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.08);
    }
    h1 {
      color: #1976d2;
      font-size: 26px;
      margin-bottom: 4px;
    }
    .date {
      color: #666;
      font-size: 13px;
      margin-bottom: 24px;
    }

    /* HERO */
    .hero {
      margin-bottom: 24px;
    }
    .hero-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #666;
      margin-bottom: 4px;
    }
    .hero-value {
      font-size: 34px;
      font-weight: 700;
      color: #1976d2;
      line-height: 1.2;
      margin-bottom: 6px;
    }
    .hero-subline {
      font-size: 15px;
      font-weight: 500;
      margin-bottom: 6px;
    }
    .hero-meta {
      font-size: 13px;
      color: #555;
    }

    .pnl-arrow {
      font-size: 12px;
      margin: 0 4px 0 2px;
      vertical-align: middle;
    }

    hr {
      border: none;
      border-top: 1px solid #e0e0e0;
      margin: 28px 0;
    }

    h2 {
      color: #1976d2;
      font-size: 20px;
      margin-bottom: 12px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th {
      background-color: #1976d2;
      color: #fff;
      padding: 10px;
      text-align: left;
    }
    td {
      padding: 10px;
      border-bottom: 1px solid #e0e0e0;
      font-size: 14px;
    }
    .summary-table td {
      padding: 8px 0;
    }
    .summary-table td:last-child {
      text-align: right;
      font-weight: 600;
    }

    .positive { color: #2e7d32; }
    .negative { color: #d32f2f; }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Hello ${username},</h1>

    <!-- HERO SUMMARY -->
    <div class="hero">
      <div class="hero-label">Net Asset Value</div>
      <div class="hero-value">${formatCurrency(nav, 0)}</div>

      ${
        daily_pnl !== undefined
          ? `
      <div class="hero-subline ${daily_pnl >= 0 ? "positive" : "negative"}">
        Today
        <span class="pnl-arrow">${daily_pnl >= 0 ? "▲" : "▼"}</span>
        ${daily_pnl >= 0 ? "+" : ""}${formatCurrency(daily_pnl, 0)}
        (${daily_pnl >= 0 ? "+" : ""}${formatPercent(
          holdings_market_value > 0
            ? (daily_pnl / (holdings_market_value - daily_pnl)) * 100
            : 0,
          2,
        )}%)
      </div>
      `
          : ""
      }

      <div class="hero-meta">
        Cash: <strong>${formatCurrency(cash_balance, 0)}</strong>
        • Liquidity: <strong>${formatCurrency(liquidity_balance, 0)}</strong>
      </div>
    </div>

    <hr />

    <!-- PERFORMANCE SNAPSHOT -->
    <h2>Performance Snapshot</h2>
    <table class="summary-table">
      <tbody>
        <tr>
          <td>Unrealized P&amp;L</td>
          <td class="${unrealized_gain >= 0 ? "positive" : "negative"}">
            ${formatCurrency(unrealized_gain, 0)}
            (${formatPercent(unrealized_gain_percent, 2)}%)
          </td>
        </tr>
        ${
          mwrr !== null
            ? `
        <tr>
          <td>MWRR (IRR)</td>
          <td class="${mwrr >= 0 ? "positive" : "negative"}">
            ${formatPercent(mwrr, 2)}%
          </td>
        </tr>`
            : ""
        }
        ${
          cagr !== null
            ? `
        <tr>
          <td>CAGR</td>
          <td class="${cagr >= 0 ? "positive" : "negative"}">
            ${formatPercent(cagr, 2)}%
          </td>
        </tr>`
            : ""
        }
      </tbody>
    </table>

    <h2>Top Holdings</h2>
    <table>
      <thead>
        <tr>
          <th>Symbol</th>
          <th>Name</th>
          <th style="text-align:right;">Market Value</th>
          <th style="text-align:right;">Unrealized P&L</th>
          <th style="text-align:right;">Daily P&L</th>
          <th style="text-align:right;">Return %</th>
        </tr>
      </thead>
      <tbody>
        ${topHoldings
          .map(
            (h) => `
          <tr>
            <td><strong>${h.symbol}</strong></td>
            <td>${h.name}</td>
            <td style="text-align:right;">${formatCurrency(h.market_value, 0)}</td>
            <td style="text-align:right;" class="${h.unrealized_gain >= 0 ? "positive" : "negative"}">
              ${formatCurrency(h.unrealized_gain, 0)}
            </td>
            <td style="text-align:right;" class="${(h.daily_pnl || 0) >= 0 ? "positive" : "negative"}">
              ${(h.daily_pnl || 0) >= 0 ? '+' : ''}${formatCurrency(h.daily_pnl || 0, 0)}
            </td>
            <td style="text-align:right;" class="${h.unrealized_gain_percent >= 0 ? "positive" : "negative"}">
              ${formatPercent(h.unrealized_gain_percent, 2)}%
            </td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>

    <h2>Asset Allocation</h2>
    <table>
      <thead>
        <tr>
          <th>Asset Type</th>
          <th style="text-align:right;">Market Value</th>
          <th style="text-align:right;">% of Portfolio</th>
          <th style="text-align:right;">Daily P&L</th>
        </tr>
      </thead>
      <tbody>
        ${asset_allocation
          .sort((a, b) => b.value - a.value)
          .map(
            (a) => `
          <tr>
            <td><strong>${a.type.toUpperCase()}</strong></td>
            <td style="text-align:right;">${formatCurrency(a.value, 0)}</td>
            <td style="text-align:right;">${formatPercent(a.percentage, 1)}%</td>
            <td style="text-align:right;" class="${a.daily_pnl >= 0 ? 'positive' : 'negative'}">
              ${a.daily_pnl >= 0 ? '+' : ''}${formatCurrency(a.daily_pnl, 0)}
            </td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  </div>
</body>
</html>
`;
  }

  /**
   * Send portfolio summary emails to users with matching frequency
   * @param {string} frequency - 'daily', 'weekly', or 'monthly'
   * @returns {Promise<{sent: number, failed: number}>}
   */
  static async sendBatchEmails(frequency) {
    if (process.env.EMAIL_ENABLED !== "true") {
      logger.info("Email service is disabled. Skipping portfolio emails.");
      return { sent: 0, failed: 0 };
    }

    try {
      const db = require("../config/database");

      // Get all active users with email notifications enabled for this frequency
      const stmt = db.prepare(`
        SELECT u.id, u.username, u.email, us.email_frequency
        FROM users u
        JOIN user_settings us ON u.id = us.user_id
        WHERE u.active = 1 
          AND us.email_notifications_enabled = 1 
          AND us.email_frequency = ?
      `);

      const users = stmt.all(frequency);
      logger.info(
        `Found ${users.length} users to send ${frequency} portfolio emails`,
      );

      let sent = 0;
      let failed = 0;

      for (const user of users) {
        try {
          const emailContent = this.generatePortfolioSummaryEmail(
            user.id,
            user.username,
          );

          if (emailContent) {
            const result = await emailService.sendEmail(
              user.email,
              emailContent.subject,
              emailContent.html,
              emailContent.text,
              {
                userId: user.id,
                username: user.username,
                trigger: `scheduled_${frequency}_portfolio_summary`,
              },
            );

            if (result.success) {
              sent++;
              logger.info(`Portfolio email sent to ${user.email}`);
            } else {
              failed++;
              logger.error(
                `Failed to send portfolio email to ${user.email}: ${result.message}`,
              );
            }
          } else {
            failed++;
            logger.error(
              `Failed to generate portfolio email for user ${user.id}`,
            );
          }
        } catch (error) {
          failed++;
          logger.error(
            `Error sending portfolio email to ${user.email}: ${error.message}`,
          );
        }
      }

      logger.info(
        `Portfolio email batch complete: ${sent} sent, ${failed} failed`,
      );
      return { sent, failed };
    } catch (error) {
      logger.error(`Error in sendBatchEmails: ${error.message}`);
      return { sent: 0, failed: 0 };
    }
  }
}

module.exports = PortfolioEmailService;
