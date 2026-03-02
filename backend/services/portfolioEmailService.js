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
      // Get portfolio analytics data (real estate excluded from liquid metrics)
      const analytics = AnalyticsService.getPortfolioAnalytics(
        userId,
        ["realestate"],
        true,
      );

      // Get YTD performance for NAV chart
      const todayDate = new Date(today);
      const startOfYear = new Date(todayDate.getFullYear(), 0, 1);
      const ytdDays = Math.ceil(
        (todayDate - startOfYear) / (1000 * 60 * 60 * 24),
      );
      const ytdPerformance = AnalyticsService.getPortfolioPerformance(
        userId,
        ytdDays,
        ["realestate"],
      );

      const last30Performance = AnalyticsService.getPortfolioPerformance(
        userId,
        30,
        ["realestate"],
      );

      const htmlContent = this._generateHTML(
        analytics,
        username,
        today,
        ytdPerformance,
        last30Performance,
      );
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
  static _generateHTML(
    analytics,
    username,
    today,
    ytdPerformance = [],
    last30Performance = [],
  ) {
    const { nav, transactions } = analytics;
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

    // Asset type display labels
    const ASSET_TYPE_LABELS = {
      equity: "Equity",
      fixedincome: "Fixed Income",
      crypto: "Crypto",
      currency: "Currency",
      realestate: "Real Estate",
      cash: "Cash",
    };
    const assetLabel = (type) =>
      ASSET_TYPE_LABELS[type?.toLowerCase()] ||
      (type ? type.charAt(0).toUpperCase() + type.slice(1) : type);

    // Inline style helpers — critical for Gmail which strips <style> blocks
    const positive = "color:#2e7d32; font-weight:600;";
    const negative = "color:#d32f2f; font-weight:600;";
    const pnlStyle = (val) => (val >= 0 ? positive : negative);
    const pnlArrow = (val) => (val >= 0 ? "▲" : "▼");
    const pnlSign = (val) => (val >= 0 ? "+" : "");

    const topHoldings = [...holdings]
      .sort((a, b) => b.market_value - a.market_value)
      .slice(0, 10);

    // Asset allocation — real estate already excluded via getPortfolioAnalytics
    const liquidAllocation = [...asset_allocation].sort(
      (a, b) => b.value - a.value,
    );

    // Shared cell styles
    const tdBase =
      "padding:10px; border-bottom:1px solid #e0e0e0; font-size:14px; color:#333;";
    const thBase =
      "background-color:#1976d2; color:#ffffff; padding:10px; font-size:13px; font-weight:600; text-align:left;";
    const thRight = thBase + " text-align:right;";
    const tdRight = tdBase + " text-align:right;";

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Portfolio Summary</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    /* Supplemental styles for clients that support <style> */
    body { margin:0; padding:0; background-color:#f5f5f5; }
    table { border-collapse:collapse; }
    img { display:block; }
    @media only screen and (max-width:620px) {
      .email-container { width:100% !important; }
      .hero-value { font-size:26px !important; }
      td[class="stack"] { display:block !important; width:100% !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">

  <!-- OUTER WRAPPER -->
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#f5f5f5">
    <tr>
      <td align="center" style="padding:20px 10px;">

        <!-- EMAIL CONTAINER -->
        <table class="email-container" role="presentation" width="800" border="0" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="max-width:800px; width:100%; background:#ffffff; border:1px solid #e0e0e0;">
          <tr>
            <td style="padding:32px 36px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif; color:#333333;">

              <!-- ═══ HERO ═══ -->
              <p style="font-size:11px; text-transform:uppercase; letter-spacing:0.07em; color:#888888; margin:0 0 4px 0;">Net Asset Value</p>
              <p class="hero-value" style="font-size:34px; font-weight:700; color:#1976d2; line-height:1.2; margin:0 0 16px 0;">${formatCurrency(nav, 0)}</p>

              <!-- Secondary stats row -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
                <tr>
                  <td style="padding:10px 24px 10px 0; border-right:3px solid #1976d2;">
                    <p style="font-size:11px; text-transform:uppercase; letter-spacing:0.07em; color:#888888; margin:0 0 3px 0;">Liquid Market Value</p>
                    <p style="font-size:22px; font-weight:700; color:#1976d2; margin:0;">${formatCurrency(holdings_market_value, 0)}</p>
                  </td>
                  <td style="padding:10px 24px; border-right:3px solid #1976d2;">
                    <p style="font-size:11px; text-transform:uppercase; letter-spacing:0.07em; color:#888888; margin:0 0 3px 0;">Cash</p>
                    <p style="font-size:22px; font-weight:700; color:#1976d2; margin:0;">${formatCurrency(cash_balance, 0)}</p>
                  </td>
                  <td style="padding:10px 0 10px 24px;">
                    <p style="font-size:11px; text-transform:uppercase; letter-spacing:0.07em; color:#888888; margin:0 0 3px 0;">Liquidity</p>
                    <p style="font-size:22px; font-weight:700; color:#1976d2; margin:0;">${formatCurrency(liquidity_balance, 0)}</p>
                  </td>
                </tr>
              </table>

              ${
                daily_pnl !== undefined
                  ? `<p style="font-size:15px; font-weight:600; margin:0 0 8px 0; ${pnlStyle(daily_pnl)}">
                Today
                <span style="font-size:12px; margin:0 3px;">${pnlArrow(daily_pnl)}</span>
                ${pnlSign(daily_pnl)}${formatCurrency(daily_pnl, 0)}
                (${pnlSign(daily_pnl)}${formatPercent(
                  holdings_market_value > 0
                    ? (daily_pnl / (holdings_market_value - daily_pnl)) * 100
                    : 0,
                  2,
                )}%)
              </p>`
                  : ""
              }

              <!-- DIVIDER -->
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr><td style="border-top:1px solid #e0e0e0; padding:0; margin:0; height:1px; font-size:0; line-height:0; mso-line-height-rule:exactly;">&nbsp;</td></tr>
              </table>
              <p style="margin:0 0 20px 0;"></p>

              <!-- ═══ RETURNS ═══ -->
              <h2 style="color:#1976d2; font-size:18px; font-weight:700; margin:0 0 12px 0; text-transform:uppercase; letter-spacing:0.03em;">Returns</h2>
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tbody>
                  <tr>
                    <td style="padding:9px 0; font-size:14px; color:#333; border-bottom:1px solid #e0e0e0;">Unrealized P&amp;L</td>
                    <td style="padding:9px 0; font-size:14px; text-align:right; border-bottom:1px solid #e0e0e0; ${pnlStyle(unrealized_gain)}">
                      ${formatCurrency(unrealized_gain, 0)}
                      (${formatPercent(unrealized_gain_percent, 2)}%)
                    </td>
                  </tr>
                  ${
                    mwrr !== null
                      ? `<tr>
                    <td style="padding:9px 0; font-size:14px; color:#333; border-bottom:1px solid #e0e0e0;">MWRR (IRR)</td>
                    <td style="padding:9px 0; font-size:14px; text-align:right; border-bottom:1px solid #e0e0e0; ${pnlStyle(mwrr)}">${formatPercent(mwrr, 2)}%</td>
                  </tr>`
                      : ""
                  }
                  ${
                    cagr !== null
                      ? `<tr>
                    <td style="padding:9px 0; font-size:14px; color:#333; border-bottom:1px solid #e0e0e0;">CAGR</td>
                    <td style="padding:9px 0; font-size:14px; text-align:right; border-bottom:1px solid #e0e0e0; ${pnlStyle(cagr)}">${formatPercent(cagr, 2)}%</td>
                  </tr>`
                      : ""
                  }
                </tbody>
              </table>

              <!-- ═══ TOP HOLDINGS ═══ -->
              <h2 style="color:#1976d2; font-size:18px; font-weight:700; margin:0 0 12px 0; text-transform:uppercase; letter-spacing:0.03em;">Top Holdings</h2>
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:28px; border-collapse:collapse;">
                <thead>
                  <tr bgcolor="#1976d2">
                    <th style="${thBase}">Symbol</th>
                    <th style="${thBase}">Name</th>
                    <th style="${thRight}">Market Value</th>
                    <th style="${thRight}">Unrealized P&amp;L</th>
                    <th style="${thRight}">Daily P&amp;L</th>
                    <th style="${thRight}">Return %</th>
                  </tr>
                </thead>
                <tbody>
                  ${topHoldings
                    .map(
                      (h) => `
                  <tr>
                    <td style="${tdBase}"><strong>${h.symbol}</strong></td>
                    <td style="${tdBase}">${h.name}</td>
                    <td style="${tdRight}">${formatCurrency(h.market_value, 0)}</td>
                    <td style="${tdRight} ${pnlStyle(h.unrealized_gain)}">${formatCurrency(h.unrealized_gain, 0)}</td>
                    <td style="${tdRight} ${pnlStyle(h.daily_pnl || 0)}">${pnlSign(h.daily_pnl || 0)}${formatCurrency(h.daily_pnl || 0, 0)}</td>
                    <td style="${tdRight} ${pnlStyle(h.unrealized_gain_percent)}">${pnlSign(h.unrealized_gain_percent)}${formatPercent(h.unrealized_gain_percent, 2)}%</td>
                  </tr>`,
                    )
                    .join("")}
                </tbody>
              </table>

              <!-- ═══ ASSET ALLOCATION (excl. Real Estate) ═══ -->
              <h2 style="color:#1976d2; font-size:18px; font-weight:700; margin:0 0 4px 0; text-transform:uppercase; letter-spacing:0.03em;">Asset Allocation</h2>
              <p style="font-size:12px; color:#888888; margin:0 0 12px 0;">Liquid holdings only &mdash; real estate excluded.</p>
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:28px; border-collapse:collapse;">
                <thead>
                  <tr bgcolor="#1976d2">
                    <th style="${thBase}">Asset Type</th>
                    <th style="${thRight}">Market Value</th>
                    <th style="${thRight}">% of Portfolio</th>
                    <th style="${thRight}">Daily P&amp;L</th>
                  </tr>
                </thead>
                <tbody>
                  ${liquidAllocation
                    .map(
                      (a) => `
                  <tr>
                    <td style="${tdBase}"><strong>${assetLabel(a.type)}</strong></td>
                    <td style="${tdRight}">${formatCurrency(a.value, 0)}</td>
                    <td style="${tdRight}">${formatPercent(a.percentage, 1)}%</td>
                    <td style="${tdRight} ${pnlStyle(a.daily_pnl)}">${pnlSign(a.daily_pnl)}${formatCurrency(a.daily_pnl, 0)}</td>
                  </tr>`,
                    )
                    .join("")}
                </tbody>
              </table>

              <!-- ═══ LAST 30 DAYS NAV CHART ═══ -->
              ${this._generateChartImg(last30Performance, "NAV &mdash; Last 30 Days")}

              <!-- ═══ YTD NAV CHART ═══ -->
              ${this._generateChartImg(ytdPerformance, "NAV &mdash; Year to Date")}

              <!-- ═══ FOOTER ═══ -->
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border-top:1px solid #e0e0e0;">
                <tr>
                  <td style="padding-top:16px; font-size:11px; color:#aaaaaa; text-align:center; line-height:1.6;">
                    This is an automated portfolio summary generated on ${today}.<br>
                    Market data may be delayed. Values are for informational purposes only.
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

</body>
</html>
`;
  }

  /**
   * Generate an inline SVG line chart from portfolio performance data.
   * @param {Array<{date: string, total_value: number}>} data
   * @returns {string} HTML string with SVG, or empty string if insufficient data
   */
  /**
   * Generate a chart <img> using QuickChart.io (renders as PNG — works in all email clients).
   * @param {Array<{date: string, total_value: number}>} data
   * @returns {string} HTML string, or empty string if insufficient data
   */
  static _generateChartImg(data, title = "NAV &mdash; Year to Date") {
    if (!data || data.length < 2) return "";

    // Downsample to ≤60 points so the URL stays well within limits
    const MAX_POINTS = 60;
    let sampled = data;
    if (data.length > MAX_POINTS) {
      const step = Math.ceil(data.length / MAX_POINTS);
      sampled = data.filter((_, i) => i % step === 0 || i === data.length - 1);
    }

    const labels = sampled.map((d) => {
      const [, mm, dd] = d.date.split("-");
      return `${mm}/${dd}`;
    });
    const values = sampled.map((d) => Math.round(d.total_value));

    // Chart.js config — QuickChart evaluates function strings server-side
    const config = {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            data: values,
            borderColor: "#1976d2",
            backgroundColor: "rgba(25,118,210,0.1)",
            fill: true,
            pointRadius: 0,
            borderWidth: 2.5,
            tension: 0.4,
          },
        ],
      },
      options: {
        legend: { display: false },
        scales: {
          x: {
            ticks: {
              maxTicksLimit: 8,
              color: "#888888",
              font: { size: 11 },
            },
            grid: { display: false },
          },
          y: {
            ticks: {
              color: "#888888",
              font: { size: 11 },
              // QuickChart evaluates function strings
              callback:
                "function(v){if(v>=1e6)return'$'+(v/1e6).toFixed(1)+'M';if(v>=1e3)return'$'+(v/1e3).toFixed(0)+'K';return'$'+v;}",
            },
            grid: { color: "#e0e0e0" },
          },
        },
      },
    };

    const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(config))}&w=700&h=220&bkg=white`;

    return `
<h2 style="color:#1976d2; font-size:18px; font-weight:700; margin:0 0 12px 0; text-transform:uppercase; letter-spacing:0.03em;">${title}</h2>
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
  <tr>
    <td>
      <img src="${chartUrl}" width="700" height="220" alt="YTD NAV Chart" style="max-width:100%; height:auto; display:block;" />
    </td>
  </tr>
</table>`;
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
