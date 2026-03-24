const db = require("../config/database");
const { ValidationError } = require("../errors/AppError");

class Scheduler {
  static findAllEnabled() {
    return db.prepare("SELECT * FROM schedulers WHERE enabled = 1").all();
  }

  static findAll(limit = 50, offset = 0) {
    return db
      .prepare(
        "SELECT * FROM schedulers ORDER BY created_at DESC LIMIT ? OFFSET ?",
      )
      .all(limit, offset);
  }

  static count() {
    return db.prepare("SELECT COUNT(*) as count FROM schedulers").get().count;
  }

  static findById(id) {
    return db.prepare("SELECT * FROM schedulers WHERE id = ?").get(id);
  }

  static create(name, type, frequency, timeOfDay, createdBy) {
    if (!/^\d{2}:\d{2}$/.test(timeOfDay)) {
      throw new ValidationError("Invalid time format. Use HH:MM");
    }

    const result = db
      .prepare(
        `INSERT INTO schedulers (name, type, frequency, time_of_day, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(name, type, frequency, timeOfDay, createdBy, createdBy);

    return result.lastInsertRowid;
  }

  static update(id, name, type, frequency, timeOfDay, enabled, updatedBy) {
    if (!/^\d{2}:\d{2}$/.test(timeOfDay)) {
      throw new ValidationError("Invalid time format. Use HH:MM");
    }

    return db
      .prepare(
        `UPDATE schedulers
         SET name = ?, type = ?, frequency = ?, time_of_day = ?, enabled = ?,
             updated_by = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .run(name, type, frequency, timeOfDay, enabled, updatedBy, id).changes;
  }

  /** Soft-delete: disable rather than hard-delete */
  static disable(id) {
    return db
      .prepare(
        "UPDATE schedulers SET enabled = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      )
      .run(id).changes;
  }
}

module.exports = Scheduler;
