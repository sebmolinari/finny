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
      const textContent = this._generateText(dashboard, username, today);
      return {
        subject: `Portfolio Summary - ${today}`,
        html: htmlContent,
        text: textContent,
      };
    } catch (error) {
      logger.error(
        `Error generating portfolio email for user ${userId}: ${error.message}`
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
      liquidity_percent,
      mwrr,
      cagr,
      holdings,
      asset_allocation,
    } = transactions;

    // Top holdings (limit to 10)
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
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #1976d2;
      margin-bottom: 10px;
      font-size: 28px;
    }
    .date {
      color: #666;
      font-size: 14px;
      margin-bottom: 30px;
    }
    h2 {
      color: #1976d2;
      border-bottom: 2px solid #1976d2;
      padding-bottom: 8px;
      margin-top: 30px;
      margin-bottom: 20px;
      font-size: 20px;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
      margin-bottom: 25px;
    }
    .metric-card {
      background-color: #f8f9fa;
      padding: 10px 12px;
      border-radius: 4px;
      border-left: 3px solid #1976d2;
    }
    .metric-label {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .metric-value {
      font-size: 18px;
      font-weight: bold;
      color: #333;
    }
    .metric-value.positive {
      color: #2e7d32;
    }
    .metric-value.negative {
      color: #d32f2f;
    }
    .metric-subtitle {
      font-size: 11px;
      margin-top: 4px;
      color: #666;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th {
      background-color: #1976d2;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #e0e0e0;
    }
    tr:hover {
      background-color: #f5f5f5;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
    .positive { color: #2e7d32; }
    .negative { color: #d32f2f; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Hello ${username}! 👋</h1>
    <div class="date">Portfolio Summary for ${today}</div>

    <h2>📊 Portfolio Overview</h2>
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Net Asset Value (NAV)</div>
        <div class="metric-value">${formatCurrency(nav, 0)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Holdings Market Value</div>
        <div class="metric-value">${formatCurrency(
          holdings_market_value,
          0
        )}</div>
        ${
          daily_pnl !== undefined
            ? `
        <div class="metric-subtitle ${
          daily_pnl >= 0 ? "positive" : "negative"
        }">
          Daily P&L: ${formatCurrency(daily_pnl, 0)} (${
                daily_pnl >= 0 ? "+" : ""
              }${formatPercent(
                holdings_market_value > 0
                  ? (daily_pnl / (holdings_market_value - daily_pnl)) * 100
                  : 0,
                2
              )}%)
        </div>`
            : ""
        }
      </div>
      <div class="metric-card">
        <div class="metric-label">Cash Balance</div>
        <div class="metric-value">${formatCurrency(cash_balance, 0)}</div>
        <div class="metric-subtitle">Liquidity: ${formatPercent(
          liquidity_percent,
          1
        )}%</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Unrealized P&L</div>
        <div class="metric-value ${
          unrealized_gain >= 0 ? "positive" : "negative"
        }">
          ${formatCurrency(unrealized_gain, 0)}
        </div>
        <div class="metric-subtitle ${
          unrealized_gain >= 0 ? "positive" : "negative"
        }">
          ${formatPercent(unrealized_gain_percent, 2)}%
        </div>
      </div>
      ${
        mwrr !== null
          ? `
      <div class="metric-card">
        <div class="metric-label">MWRR (IRR)</div>
        <div class="metric-value ${mwrr >= 0 ? "positive" : "negative"}">
          ${formatPercent(mwrr, 2)}%
        </div>
      </div>`
          : ""
      }
      ${
        cagr !== null
          ? `
      <div class="metric-card">
        <div class="metric-label">CAGR</div>
        <div class="metric-value ${cagr >= 0 ? "positive" : "negative"}">
          ${formatPercent(cagr, 2)}%
        </div>
      </div>`
          : ""
      }
    </div>

    <h2>💼 Top Holdings</h2>
    <table>
      <thead>
        <tr>
          <th>Symbol</th>
          <th>Name</th>
          <th style="text-align: right;">Market Value</th>
          <th style="text-align: right;">Unrealized P&L</th>
          <th style="text-align: right;">Return %</th>
        </tr>
      </thead>
      <tbody>
        ${topHoldings
          .map(
            (holding) => `
          <tr>
            <td><strong>${holding.symbol}</strong></td>
            <td>${holding.name}</td>
            <td style="text-align: right;">${formatCurrency(
              holding.market_value,
              0
            )}</td>
            <td style="text-align: right;" class="${
              holding.unrealized_gain >= 0 ? "positive" : "negative"
            }">
              ${formatCurrency(holding.unrealized_gain, 0)}
            </td>
            <td style="text-align: right;" class="${
              holding.unrealized_gain_percent >= 0 ? "positive" : "negative"
            }">
              ${formatPercent(holding.unrealized_gain_percent, 2)}%
            </td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>

    <h2>🎯 Asset Allocation</h2>
    <table>
      <thead>
        <tr>
          <th>Asset Type</th>
          <th style="text-align: right;">Value</th>
          <th style="text-align: right;">% of Portfolio</th>
          <th style="text-align: center;">Count</th>
        </tr>
      </thead>
      <tbody>
        ${asset_allocation
          .sort((a, b) => b.value - a.value)
          .map(
            (allocation) => `
          <tr>
            <td><strong>${allocation.type.toUpperCase()}</strong></td>
            <td style="text-align: right;">${formatCurrency(
              allocation.value,
              0
            )}</td>
            <td style="text-align: right;">${formatPercent(
              allocation.percentage,
              1
            )}%</td>
            <td style="text-align: center;">${allocation.count}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>

    <div class="footer">
      <p>This is an automated portfolio summary from Finny Portfolio Manager.</p>
      <p>To manage your email preferences, visit your account settings.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate plain text email content
   */
  static _generateText(dashboard, username, today) {
    const { nav, transactions } = dashboard;
    const {
      holdings_market_value,
      daily_pnl,
      cash_balance,
      unrealized_gain,
      unrealized_gain_percent,
      mwrr,
      cagr,
      holdings,
      asset_allocation,
    } = transactions;

    const topHoldings = holdings
      .sort((a, b) => b.market_value - a.market_value)
      .slice(0, 10);

    let text = `Hello ${username}!\n\n`;
    text += `Portfolio Summary for ${today}\n`;
    text += `${"=".repeat(60)}\n\n`;

    text += `PORTFOLIO OVERVIEW\n`;
    text += `-----------------\n`;
    text += `Net Asset Value (NAV): ${formatCurrency(nav, 0)}\n`;
    text += `Holdings Market Value: ${formatCurrency(
      holdings_market_value,
      0
    )}\n`;
    if (daily_pnl !== undefined) {
      text += `  Daily P&L: ${formatCurrency(daily_pnl, 0)} (${
        daily_pnl >= 0 ? "+" : ""
      }${formatPercent(
        holdings_market_value > 0
          ? (daily_pnl / (holdings_market_value - daily_pnl)) * 100
          : 0,
        2
      )}%)\n`;
    }
    text += `Cash Balance: ${formatCurrency(cash_balance, 0)}\n`;
    text += `Unrealized P&L: ${formatCurrency(
      unrealized_gain,
      0
    )} (${formatPercent(unrealized_gain_percent, 2)}%)\n`;
    if (mwrr !== null) text += `MWRR (IRR): ${formatPercent(mwrr, 2)}%\n`;
    if (cagr !== null) text += `CAGR: ${formatPercent(cagr, 2)}%\n`;

    text += `\nTOP HOLDINGS\n`;
    text += `------------\n`;
    topHoldings.forEach((holding) => {
      text += `${holding.symbol} - ${holding.name}\n`;
      text += `  Market Value: ${formatCurrency(holding.market_value, 0)}\n`;
      text += `  Unrealized P&L: ${formatCurrency(
        holding.unrealized_gain,
        0
      )} (${formatPercent(holding.unrealized_gain_percent, 2)}%)\n\n`;
    });

    text += `ASSET ALLOCATION\n`;
    text += `----------------\n`;
    asset_allocation
      .sort((a, b) => b.value - a.value)
      .forEach((allocation) => {
        text += `${allocation.type.toUpperCase()}: ${formatCurrency(
          allocation.value,
          0
        )} (${formatPercent(allocation.percentage, 1)}%) - ${
          allocation.count
        } holdings\n`;
      });

    text += `\n${"=".repeat(60)}\n`;
    text += `This is an automated portfolio summary from Finny Portfolio Manager.\n`;
    text += `To manage your email preferences, visit your account settings.\n`;

    return text;
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
        `Found ${users.length} users to send ${frequency} portfolio emails`
      );

      let sent = 0;
      let failed = 0;

      for (const user of users) {
        try {
          const emailContent = this.generatePortfolioSummaryEmail(
            user.id,
            user.username
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
              }
            );

            if (result.success) {
              sent++;
              logger.info(`Portfolio email sent to ${user.email}`);
            } else {
              failed++;
              logger.error(
                `Failed to send portfolio email to ${user.email}: ${result.message}`
              );
            }
          } else {
            failed++;
            logger.error(
              `Failed to generate portfolio email for user ${user.id}`
            );
          }
        } catch (error) {
          failed++;
          logger.error(
            `Error sending portfolio email to ${user.email}: ${error.message}`
          );
        }
      }

      logger.info(
        `Portfolio email batch complete: ${sent} sent, ${failed} failed`
      );
      return { sent, failed };
    } catch (error) {
      logger.error(`Error in sendBatchEmails: ${error.message}`);
      return { sent: 0, failed: 0 };
    }
  }
}

module.exports = PortfolioEmailService;
