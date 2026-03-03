const db = require("../config/database");

class Notification {
  static create(userId, type, title, message = null, metadata = null) {
    const stmt = db.prepare(`
      INSERT INTO notifications (user_id, type, title, message, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      userId,
      type,
      title,
      message,
      metadata ? JSON.stringify(metadata) : null,
    );
    return result.lastInsertRowid;
  }

  static getByUser(userId, unreadOnly = false) {
    const query = unreadOnly
      ? `SELECT * FROM notifications WHERE user_id = ? AND is_read = 0 ORDER BY created_at DESC LIMIT 100`
      : `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`;
    const stmt = db.prepare(query);
    const rows = stmt.all(userId);
    return rows.map((r) => ({
      ...r,
      metadata: r.metadata ? JSON.parse(r.metadata) : null,
    }));
  }

  static getUnreadCount(userId) {
    const stmt = db.prepare(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`,
    );
    return stmt.get(userId).count;
  }

  static markRead(userId, id) {
    const stmt = db.prepare(
      `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
    );
    return stmt.run(id, userId).changes;
  }

  static markAllRead(userId) {
    const stmt = db.prepare(
      `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`,
    );
    return stmt.run(userId).changes;
  }

  static deleteOld(userId, keepDays = 30) {
    const stmt = db.prepare(
      `DELETE FROM notifications WHERE user_id = ? AND created_at < datetime('now', ?)`,
    );
    return stmt.run(userId, `-${keepDays} days`).changes;
  }

  // Check if a recent notification of same type+title already exists (dedup)
  // Intentionally includes read notifications — reading a notification should not
  // re-arm the alert within the same time window.
  static hasRecent(userId, type, title, withinSeconds = 86400) {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM notifications
      WHERE user_id = ? AND type = ? AND title = ?
        AND created_at >= datetime('now', ? || ' seconds')
    `);
    return stmt.get(userId, type, title, `-${withinSeconds}`).count > 0;
  }
}

module.exports = Notification;
