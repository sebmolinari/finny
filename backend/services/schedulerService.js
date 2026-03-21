const db = require("../config/database");
const portfolioEmailService = require("./portfolioEmailService");
const priceService = require("./priceService");
const emailService = require("./emailService");
const AuditLog = require("../models/AuditLog");
const User = require("../models/User");
const logger = require("../utils/logger");

class SchedulerService {
  /**
   * Check for due schedules and execute them
   * Called every 60 seconds from the background worker
   */
  static async checkDueSchedules() {
    try {
      const now = new Date();
      const currentHour = String(now.getHours()).padStart(2, "0");
      const currentMinute = String(now.getMinutes()).padStart(2, "0");
      const currentTime = `${currentHour}:${currentMinute}`;
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      // Get all enabled schedulers
      const stmt = db.prepare(`
        SELECT * FROM schedulers WHERE enabled = 1
      `);
      const schedulers = stmt.all();

      for (const scheduler of schedulers) {
        try {
          const due = this.isScheduleDue(scheduler, currentTime, today);

          // Check if this scheduler is due
          if (due) {
            // Check if already executed today
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
              .get(scheduler.id, today);

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
  static isScheduleDue(scheduler, currentTime, today) {
    const metadata = scheduler.metadata ? JSON.parse(scheduler.metadata) : {};
    const scheduledTime = scheduler.time_of_day; // HH:MM format

    // Check if current time matches scheduled time (within same minute)
    if (currentTime !== scheduledTime) {
      return false;
    }

    // Check frequency
    switch (scheduler.frequency) {
      case "daily":
        return true;

      case "weekly": {
        // Execute on Monday (day 1) by default, unless specified in metadata
        const dayOfWeek = metadata.day_of_week || 1;
        const now = new Date();
        return now.getDay() === dayOfWeek;
      }

      case "monthly": {
        // Execute on specific day of month, default to 1st
        const dayOfMonth = metadata.day_of_month || 1;
        const now = new Date();
        return now.getDate() === dayOfMonth;
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
        case "email_send": {
          result = await portfolioEmailService.sendBatchEmails();
          break;
        }

        case "asset_refresh": {
          // Use system user (ID 1) for automated refreshes
          result = await priceService.refreshAllPrices();

          AuditLog.create({
            action_type: "import",
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
        );
      }
    }
  }

  /**
   * Send failure notification email to all active admin users
   */
  static async notifyAdminsOfFailure(schedulerId, schedulerName, errorMessage) {
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
          `Scheduler failure: ${label}`,
          `<p>Scheduler <strong>${label}</strong> failed after all retry attempts.</p>
           <p><strong>Error:</strong> ${errorMessage}</p>`,
        );
      }
    } catch (notifyError) {
      logger.error(
        `Failed to send admin failure notification: ${notifyError.message}`,
      );
    }
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
