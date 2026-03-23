const db = require("../config/database");
const portfolioEmailService = require("./portfolioEmailService");
const priceService = require("./priceService");
const emailService = require("./emailService");
const AuditLog = require("../models/AuditLog");
const User = require("../models/User");
const UserSettings = require("../models/UserSettings");
const { getSchedulerNow } = require("../utils/dateUtils");
const logger = require("../utils/logger");

class SchedulerService {
  /**
   * Check for due schedules and execute them
   * Called every 60 seconds from the background worker
   */
  static async checkDueSchedules() {
    try {
      // Get all enabled schedulers
      const stmt = db.prepare(`
        SELECT * FROM schedulers WHERE enabled = 1
      `);
      const schedulers = stmt.all();

      for (const scheduler of schedulers) {
        try {
          // Resolve current time in the creator's configured timezone so that
          // "run at 18:00" means 18:00 in the admin's timezone, not server time.
          const creatorTimezone =
            UserSettings.findByUserId(scheduler.created_by)?.timezone || "UTC";
          const nowParts = getSchedulerNow(creatorTimezone);

          const due = this.isScheduleDue(scheduler, nowParts);

          // Check if this scheduler is due
          if (due) {
            // Check if already executed today (in the creator's timezone)
            const alreadyExecuted = db
              .prepare(
                `
              SELECT id FROM scheduler_instances
              WHERE scheduler_id = ?
              AND status IN ('success', 'pending')
              AND DATE(scheduled_run_at) = ?
              LIMIT 1
            `,
              )
              .get(scheduler.id, nowParts.today);

            if (alreadyExecuted) {
              logger.info(
                `Scheduler "${scheduler.name}" already executed today, skipping`,
              );
            } else {
              await this.executeWithRetry(scheduler);
            }
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
   * Check if a scheduler is due based on frequency and time
   */
  static isScheduleDue(scheduler, nowParts) {
    const metadata = scheduler.metadata ? JSON.parse(scheduler.metadata) : {};
    const scheduledTime = scheduler.time_of_day; // HH:MM format

    // Check if current time matches scheduled time (within same minute)
    if (nowParts.time !== scheduledTime) {
      return false;
    }

    // Check frequency
    switch (scheduler.frequency) {
      case "daily":
        return true;

      case "weekly": {
        // Execute on Monday (day 1) by default, unless specified in metadata
        const dayOfWeek = metadata.day_of_week || 1;
        return nowParts.dayOfWeek === dayOfWeek;
      }

      case "monthly": {
        // Execute on specific day of month, default to 1st
        const dayOfMonth = metadata.day_of_month || 1;
        return nowParts.dayOfMonth === dayOfMonth;
      }

      default:
        return false;
    }
  }

  /**
   * Execute a schedule with retry logic
   */
  static async executeWithRetry(scheduler, attempt = 1) {
    const maxRetries = 3;
    const schedulerId = scheduler.id;

    try {
      const now = new Date();
      const scheduledRunAt = now.toISOString();

      // Execute the job based on type
      let result;
      switch (scheduler.type) {
        case "send_report": {
          result = await portfolioEmailService.sendBatchEmails();
          break;
        }

        case "asset_refresh": {
          // Use system user (ID 1) for automated refreshes
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

      // Log successful execution
      await this.logExecution(
        schedulerId,
        "success",
        result,
        null,
        attempt,
        scheduledRunAt,
      );

      logger.info(
        `Scheduler ${scheduler.id} (${scheduler.name}) executed successfully. Attempt: ${attempt}`,
      );
    } catch (error) {
      logger.error(
        `Scheduler ${schedulerId} execution failed (attempt ${attempt}/${maxRetries}): ${error.message}`,
      );

      if (attempt < maxRetries) {
        // Retry after a short delay
        setTimeout(() => {
          this.executeWithRetry(scheduler, attempt + 1);
        }, 30000); // Retry after 30 seconds
      } else {
        // Max retries reached, log as failed
        const now = new Date();
        await this.logExecution(
          schedulerId,
          "failed",
          null,
          error.message,
          attempt,
          now.toISOString(),
        );
        await this.notifyAdminsOfFailure(
          schedulerId,
          scheduler.name,
          error.message,
          scheduler.type,
          attempt,
        );
      }
    }
  }

  /**
   * Send failure notification email to all active admin users
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

  /**
   * Generate a styled HTML email for scheduler failure notifications
   */
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

              <!-- HEADER -->
              <p style="font-size:20px; font-weight:700; color:#1976d2; margin:0 0 4px 0;">Finny</p>
              <p style="font-size:11px; text-transform:uppercase; letter-spacing:0.07em; color:#888888; margin:0 0 24px 0;">Portfolio Manager</p>

              <!-- ALERT BANNER -->
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background-color:#fdecea; border-left:4px solid #d32f2f; padding:16px 20px; border-radius:2px;">
                    <p style="font-size:16px; font-weight:700; color:#d32f2f; margin:0 0 4px 0;">⚠️ Scheduler Failed</p>
                    <p style="font-size:13px; color:#b71c1c; margin:0;">All retry attempts exhausted. Action may be required.</p>
                  </td>
                </tr>
              </table>

              <!-- DETAILS TABLE -->
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

              <!-- ERROR MESSAGE -->
              <h2 style="color:#1976d2; font-size:15px; font-weight:700; margin:0 0 12px 0; text-transform:uppercase; letter-spacing:0.03em;">Error</h2>
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background-color:#f5f5f5; border:1px solid #e0e0e0; padding:14px 16px; border-radius:2px; font-size:13px; color:#333; font-family:monospace; line-height:1.6; word-break:break-word;">
                    ${errorMessage ?? "No error details available."}
                  </td>
                </tr>
              </table>

              <!-- FOOTER -->
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

  /**
   * Log scheduler execution to database
   */
  static async logExecution(
    schedulerId,
    status,
    result,
    errorMessage,
    attempt,
    scheduledRunAt,
  ) {
    try {
      const stmt = db.prepare(`
        INSERT INTO scheduler_instances
        (scheduler_id, scheduled_run_at, executed_at, status, attempt, result, error_message)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        schedulerId,
        scheduledRunAt,
        new Date().toISOString(),
        status,
        attempt,
        result ? JSON.stringify(result) : null,
        errorMessage || null,
      );
    } catch (error) {
      logger.error(`Error logging scheduler execution: ${error.message}`);
    }
  }

  /**
   * Get all schedulers with pagination
   */
  static getSchedulers(limit = 50, offset = 0) {
    const stmt = db.prepare(`
      SELECT * FROM schedulers
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(limit, offset);
  }

  /**
   * Get total count of schedulers
   */
  static getSchedulersCount() {
    const stmt = db.prepare("SELECT COUNT(*) as count FROM schedulers");
    return stmt.get().count;
  }

  /**
   * Get scheduler by ID
   */
  static getSchedulerById(id) {
    const stmt = db.prepare("SELECT * FROM schedulers WHERE id = ?");
    return stmt.get(id);
  }

  /**
   * Create a new scheduler
   */
  static createScheduler(name, type, frequency, timeOfDay, createdBy) {
    // Validate time format HH:MM
    if (!/^\d{2}:\d{2}$/.test(timeOfDay)) {
      throw new Error("Invalid time format. Use HH:MM");
    }

    const stmt = db.prepare(`
      INSERT INTO schedulers
      (name, type, frequency, time_of_day, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      name,
      type,
      frequency,
      timeOfDay,
      createdBy,
      createdBy,
    );

    return result.lastInsertRowid;
  }

  /**
   * Update an existing scheduler
   */
  static updateScheduler(
    id,
    name,
    type,
    frequency,
    timeOfDay,
    enabled,
    updatedBy,
  ) {
    // Validate time format HH:MM
    if (!/^\d{2}:\d{2}$/.test(timeOfDay)) {
      throw new Error("Invalid time format. Use HH:MM");
    }

    const stmt = db.prepare(`
      UPDATE schedulers
      SET name = ?,
          type = ?,
          frequency = ?,
          time_of_day = ?,
          enabled = ?,
          updated_by = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const result = stmt.run(
      name,
      type,
      frequency,
      timeOfDay,
      enabled,
      updatedBy,
      id,
    );

    return result.changes;
  }

  /**
   * Delete (soft delete) a scheduler
   */
  static deleteScheduler(id) {
    const stmt = db.prepare(
      "UPDATE schedulers SET enabled = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    );
    return stmt.run(id).changes;
  }

  /**
   * Get execution history for a scheduler
   */
  static getSchedulerInstances(schedulerId, limit = 50, offset = 0) {
    const stmt = db.prepare(`
      SELECT * FROM scheduler_instances
      WHERE scheduler_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(schedulerId, limit, offset);
  }

  /**
   * Get total count of instances for a scheduler
   */
  static getSchedulerInstancesCount(schedulerId) {
    const stmt = db.prepare(
      "SELECT COUNT(*) as count FROM scheduler_instances WHERE scheduler_id = ?",
    );
    return stmt.get(schedulerId).count;
  }

  /**
   * Delete all rows from scheduler_instances
   */
  static purgeAllInstances() {
    const stmt = db.prepare("DELETE FROM scheduler_instances");
    return stmt.run().changes;
  }
}

module.exports = SchedulerService;
