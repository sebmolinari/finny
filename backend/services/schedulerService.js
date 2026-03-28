const Scheduler = require("../models/Scheduler");
const SchedulerInstance = require("../models/SchedulerInstance");
const portfolioEmailService = require("./portfolioEmailService");
const priceService = require("./priceService");
const emailService = require("./emailService");
const AuditLog = require("../models/AuditLog");
const User = require("../models/User");
const UserSettings = require("../models/UserSettings");
const { getSchedulerNow } = require("../utils/dateUtils");
const logger = require("../utils/logger");
const Notification = require("../models/Notification");

class SchedulerService {
  /**
   * Check for due schedules and execute them.
   * Called every 60 seconds from the background worker in server.js.
   */
  static async checkDueSchedules() {
    try {
      const schedulers = Scheduler.findAllEnabled();

      for (const scheduler of schedulers) {
        try {
          // Resolve current time in the creator's configured timezone so that
          // "run at 18:00" means 18:00 in the admin's timezone, not server time.
          const creatorTimezone =
            UserSettings.findByUserId(scheduler.created_by)?.timezone || "UTC";
          const nowParts = getSchedulerNow(creatorTimezone);

          if (!this.isScheduleDue(scheduler, nowParts)) continue;

          const alreadyExecuted = SchedulerInstance.findTodayExecution(
            scheduler.id,
            nowParts.today,
          );

          if (alreadyExecuted) {
            logger.info(
              `Scheduler "${scheduler.name}" already executed today, skipping`,
            );
          } else {
            await this.executeWithRetry(scheduler);
          }
        } catch (error) {
          logger.error(
            `Error checking schedule ${scheduler.id}: ${error.message}`,
          );
        }
      }
    } catch (error) {
      logger.error(`Error in checkDueSchedules: ${error.message}`);
    }
  }

  /**
   * Check if a scheduler is due based on frequency and current time.
   */
  static isScheduleDue(scheduler, nowParts) {
    if (nowParts.time !== scheduler.time_of_day) return false;

    const metadata = scheduler.metadata ? JSON.parse(scheduler.metadata) : {};

    switch (scheduler.frequency) {
      case "daily":
        return true;

      case "weekly": {
        const dayOfWeek = metadata.day_of_week || 1;
        return nowParts.dayOfWeek === dayOfWeek;
      }

      case "monthly": {
        const dayOfMonth = metadata.day_of_month || 1;
        const [year, month] = nowParts.today.split("-").map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();
        const effectiveDay = Math.min(dayOfMonth, daysInMonth);
        return nowParts.dayOfMonth === effectiveDay;
      }

      case "weekdays":
        return nowParts.dayOfWeek >= 1 && nowParts.dayOfWeek <= 5;

      default:
        return false;
    }
  }

  /**
   * Execute a schedule with retry logic.
   */
  static async executeWithRetry(scheduler, attempt = 1) {
    const maxRetries = 4;
    const delay = Math.pow(2, attempt - 1) * 60 * 1000; // 1m, 2m, 4m...
    const scheduledRunAt = new Date().toISOString();

    try {
      let result;
      switch (scheduler.type) {
        case "send_report":
          result = await portfolioEmailService.sendBatchEmails();
          break;

        case "asset_refresh": {
          result = await priceService.refreshAllPrices();

          AuditLog.create({
            action_type: "price_refresh_all",
            table_name: "price_data",
            new_values: {
              action: "refresh_all_prices",
              updated: result.updated,
              skipped: result.skipped,
              failed: result.failed,
              total: result.total,
            },
            error_message: result.errors?.join(" | ") || null,
          });

          if (result.failed > 0) {
            throw new Error(
              `Price refresh completed with ${result.failed} failed asset(s) out of ${result.total}`,
            );
          }
          break;
        }

        default:
          throw new Error(`Unknown scheduler type: ${scheduler.type}`);
      }

      SchedulerInstance.create(
        scheduler.id,
        scheduledRunAt,
        new Date().toISOString(),
        "success",
        attempt,
        result,
        null,
      );

      logger.info(
        `Scheduler ${scheduler.id} (${scheduler.name}) executed successfully. Attempt: ${attempt}`,
      );
    } catch (error) {
      logger.error(
        `Scheduler ${scheduler.id} execution failed (attempt ${attempt}/${maxRetries}): ${error.message}`,
      );

      if (attempt < maxRetries) {
        logger.info(
          `Retrying scheduler ${scheduler.id} in ${delay / 1000}s (attempt ${attempt + 1}/${maxRetries})`,
        );
        setTimeout(() => {
          this.executeWithRetry(scheduler, attempt + 1);
        }, delay);
      } else {
        SchedulerInstance.create(
          scheduler.id,
          scheduledRunAt,
          new Date().toISOString(),
          "failed",
          attempt,
          null,
          error.message,
        );
        await this.notifyAdminsOfFailure(
          scheduler.id,
          scheduler.name,
          error.message,
          scheduler.type,
          attempt,
        );
      }
    }
  }

  /**
   * Send failure notification email to all active admin users.
   */
  static async notifyAdminsOfFailure(
    schedulerId,
    schedulerName,
    errorMessage,
    schedulerType,
    attempts,
  ) {
    try {
      const { users: admins } = User.getAll({
        role: "admin",
        active: 1,
        limit: 100,
      });
      for (const admin of admins) {
        Notification.create(
          admin.id,
          `Scheduler "${schedulerName}" failed after ${attempts} attempts`,
          errorMessage,
          schedulerType,
        );
        if (!admin.email) continue;
        const label = schedulerName ?? `#${schedulerId}`;
        await emailService.sendEmail(
          admin.email,
          `⚠️ Scheduler failure: ${label}`,
          this._generateFailureEmail(
            label,
            errorMessage,
            schedulerType,
            attempts,
          ),
        );
      }
    } catch (notifyError) {
      logger.error(
        `Failed to send admin failure notification: ${notifyError.message}`,
      );
    }
  }

  // ── CRUD (delegated to model, kept here for route convenience) ────────────

  static getSchedulers(limit = 50, offset = 0) {
    return Scheduler.findAll(limit, offset);
  }

  static getSchedulersCount() {
    return Scheduler.count();
  }

  static getSchedulerById(id) {
    return Scheduler.findById(id);
  }

  static createScheduler(name, type, frequency, timeOfDay, createdBy, metadata = null) {
    return Scheduler.create(name, type, frequency, timeOfDay, createdBy, metadata);
  }

  static updateScheduler(
    id,
    name,
    type,
    frequency,
    timeOfDay,
    enabled,
    updatedBy,
    metadata = null,
  ) {
    return Scheduler.update(
      id,
      name,
      type,
      frequency,
      timeOfDay,
      enabled,
      updatedBy,
      metadata,
    );
  }

  static deleteScheduler(id) {
    return Scheduler.disable(id);
  }

  static getSchedulerInstances(schedulerId, limit = 50, offset = 0) {
    return SchedulerInstance.findBySchedulerId(schedulerId, limit, offset);
  }

  static getSchedulerInstancesCount(schedulerId) {
    return SchedulerInstance.countBySchedulerId(schedulerId);
  }

  static purgeAllInstances() {
    return SchedulerInstance.purgeAll();
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  static _generateFailureEmail(
    schedulerName,
    errorMessage,
    schedulerType,
    attempts,
  ) {
    const now = new Date();
    const timestamp =
      now.toISOString().replace("T", " ").substring(0, 19) + " UTC";
    const typeLabel =
      schedulerType === "send_report"
        ? "Portfolio Email"
        : schedulerType === "asset_refresh"
          ? "Asset Price Refresh"
          : (schedulerType ?? "Unknown");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scheduler Failure</title>
  <style>
    body { margin:0; padding:0; background-color:#f5f5f5; }
    table { border-collapse:collapse; }
    @media only screen and (max-width:620px) {
      .email-container { width:100% !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">

  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#f5f5f5">
    <tr>
      <td align="center" style="padding:20px 10px;">

        <table class="email-container" role="presentation" width="600" border="0" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="max-width:600px; width:100%; background:#ffffff; border:1px solid #e0e0e0;">
          <tr>
            <td style="padding:32px 36px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif; color:#333333;">

              <p style="font-size:20px; font-weight:700; color:#1976d2; margin:0 0 4px 0;">Finny</p>
              <p style="font-size:11px; text-transform:uppercase; letter-spacing:0.07em; color:#888888; margin:0 0 24px 0;">Portfolio Manager</p>

              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background-color:#fdecea; border-left:4px solid #d32f2f; padding:16px 20px; border-radius:2px;">
                    <p style="font-size:16px; font-weight:700; color:#d32f2f; margin:0 0 4px 0;">⚠️ Scheduler Failed</p>
                    <p style="font-size:13px; color:#b71c1c; margin:0;">All retry attempts exhausted. Action may be required.</p>
                  </td>
                </tr>
              </table>

              <h2 style="color:#1976d2; font-size:15px; font-weight:700; margin:0 0 12px 0; text-transform:uppercase; letter-spacing:0.03em;">Details</h2>
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="padding:9px 0; font-size:14px; color:#888; border-bottom:1px solid #e0e0e0; width:40%;">Scheduler</td>
                  <td style="padding:9px 0; font-size:14px; color:#333; font-weight:600; border-bottom:1px solid #e0e0e0;">${schedulerName}</td>
                </tr>
                <tr>
                  <td style="padding:9px 0; font-size:14px; color:#888; border-bottom:1px solid #e0e0e0;">Type</td>
                  <td style="padding:9px 0; font-size:14px; color:#333; border-bottom:1px solid #e0e0e0;">${typeLabel}</td>
                </tr>
                <tr>
                  <td style="padding:9px 0; font-size:14px; color:#888; border-bottom:1px solid #e0e0e0;">Attempts</td>
                  <td style="padding:9px 0; font-size:14px; color:#333; border-bottom:1px solid #e0e0e0;">${attempts ?? 3} / 3</td>
                </tr>
                <tr>
                  <td style="padding:9px 0; font-size:14px; color:#888;">Timestamp</td>
                  <td style="padding:9px 0; font-size:14px; color:#333;">${timestamp}</td>
                </tr>
              </table>

              <h2 style="color:#1976d2; font-size:15px; font-weight:700; margin:0 0 12px 0; text-transform:uppercase; letter-spacing:0.03em;">Error</h2>
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background-color:#f5f5f5; border:1px solid #e0e0e0; padding:14px 16px; border-radius:2px; font-size:13px; color:#333; font-family:monospace; line-height:1.6; word-break:break-word;">
                    ${errorMessage ?? "No error details available."}
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border-top:1px solid #e0e0e0;">
                <tr>
                  <td style="padding-top:16px; font-size:11px; color:#aaaaaa; text-align:center; line-height:1.6;">
                    This is an automated alert from Finny Portfolio Manager.<br>
                    Check the Admin &rsaquo; Schedulers page for full execution history.
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
</html>`;
  }
}

module.exports = SchedulerService;
