const db = require("../config/database");

class SchedulerInstance {
  /**
   * Check whether a scheduler already has a successful or pending run today.
   * @param {number} schedulerId
   * @param {string} today - "YYYY-MM-DD" in the creator's timezone
   */
  static findTodayExecution(schedulerId, today) {
    return db
      .prepare(
        `SELECT id FROM scheduler_instances
         WHERE scheduler_id = ?
           AND status IN ('success', 'pending')
           AND DATE(scheduled_run_at) = ?
         LIMIT 1`,
      )
      .get(schedulerId, today);
  }

  static create(schedulerId, scheduledRunAt, executedAt, status, attempt, result, errorMessage) {
    return db
      .prepare(
        `INSERT INTO scheduler_instances
         (scheduler_id, scheduled_run_at, executed_at, status, attempt, result, error_message)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        schedulerId,
        scheduledRunAt,
        executedAt,
        status,
        attempt,
        result ? JSON.stringify(result) : null,
        errorMessage || null,
      ).lastInsertRowid;
  }

  static findBySchedulerId(schedulerId, limit = 50, offset = 0) {
    return db
      .prepare(
        `SELECT * FROM scheduler_instances
         WHERE scheduler_id = ?
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
      )
      .all(schedulerId, limit, offset);
  }

  static countBySchedulerId(schedulerId) {
    return db
      .prepare(
        "SELECT COUNT(*) as count FROM scheduler_instances WHERE scheduler_id = ?",
      )
      .get(schedulerId).count;
  }

  static purgeAll() {
    return db.prepare("DELETE FROM scheduler_instances").run().changes;
  }
}

module.exports = SchedulerInstance;
