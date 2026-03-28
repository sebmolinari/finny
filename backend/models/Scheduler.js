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

  static create(name, type, frequency, timeOfDay, createdBy, metadata = null) {
    if (!/^\d{2}:\d{2}$/.test(timeOfDay)) {
      throw new ValidationError("Invalid time format. Use HH:MM");
    }

    const metadataStr = metadata != null ? JSON.stringify(metadata) : null;

    const result = db
      .prepare(
        `INSERT INTO schedulers (name, type, frequency, time_of_day, metadata, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(name, type, frequency, timeOfDay, metadataStr, createdBy, createdBy);

    return result.lastInsertRowid;
  }

  static update(id, name, type, frequency, timeOfDay, enabled, updatedBy, metadata = null) {
    if (!/^\d{2}:\d{2}$/.test(timeOfDay)) {
      throw new ValidationError("Invalid time format. Use HH:MM");
    }

    const metadataStr = metadata != null ? JSON.stringify(metadata) : null;

    return db
      .prepare(
        `UPDATE schedulers
         SET name = ?, type = ?, frequency = ?, time_of_day = ?, enabled = ?,
             metadata = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .run(name, type, frequency, timeOfDay, enabled, metadataStr, updatedBy, id).changes;
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
