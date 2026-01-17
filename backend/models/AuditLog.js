const db = require("../config/database");

class AuditLog {
  /**
   * Create an audit log entry
   * @param {Object} data - Audit log data
   * @param {number} data.user_id - User ID (nullable for failed logins)
   * @param {string} data.username - Username (for context)
   * @param {string} data.action_type - Type of action (login, logout, create, update, delete, etc.)
   * @param {string} data.table_name - Name of the table affected (optional)
   * @param {number} data.record_id - ID of the record affected (optional)
   * @param {Object} data.old_values - Old values for updates/deletes (optional)
   * @param {Object} data.new_values - New values for creates/updates (optional)
   * @param {string} data.ip_address - Client IP address (optional)
   * @param {string} data.user_agent - Client user agent (optional)
   * @param {boolean} data.success - Whether the action was successful (default: true)
   * @param {string} data.error_message - Error message if action failed (optional)
   * @returns {number} - The ID of the created audit log
   */
  static create(data) {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (
        user_id, username, action_type, table_name, record_id,
        old_values, new_values, ip_address, user_agent,
        success, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.user_id,
      data.username,
      data.action_type,
      data.table_name,
      data.record_id,
      data.old_values ? JSON.stringify(data.old_values) : null,
      data.new_values ? JSON.stringify(data.new_values) : null,
      data.ip_address,
      data.user_agent,
      data.success !== undefined ? (data.success ? 1 : 0) : 1,
      data.error_message,
    );

    return result.lastInsertRowid;
  }

  /**
   * Log a successful login
   */
  static logLogin(userId, username, ipAddress, userAgent) {
    return this.create({
      user_id: userId,
      username,
      action_type: "login",
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true,
    });
  }

  /**
   * Log a failed login attempt
   */
  static logLoginFailed(username, ipAddress, userAgent, errorMessage) {
    return this.create({
      username,
      action_type: "login_failed",
      ip_address: ipAddress,
      user_agent: userAgent,
      success: false,
      error_message: errorMessage,
    });
  }

  /**
   * Log a logout
   */
  static logLogout(userId, username, ipAddress, userAgent) {
    return this.create({
      user_id: userId,
      username,
      action_type: "logout",
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true,
    });
  }

  /**
   * Log a record creation
   */
  static logCreate(
    userId,
    username,
    tableName,
    recordId,
    newValues,
    ipAddress,
    userAgent,
  ) {
    return this.create({
      user_id: userId,
      username,
      action_type: "create",
      table_name: tableName,
      record_id: recordId,
      new_values: newValues,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  }

  /**
   * Log a record update
   */
  static logUpdate(
    userId,
    username,
    tableName,
    recordId,
    oldValues,
    newValues,
    ipAddress,
    userAgent,
  ) {
    return this.create({
      user_id: userId,
      username,
      action_type: "update",
      table_name: tableName,
      record_id: recordId,
      old_values: oldValues,
      new_values: newValues,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  }

  /**
   * Log a record deletion
   */
  static logDelete(
    userId,
    username,
    tableName,
    recordId,
    oldValues,
    ipAddress,
    userAgent,
  ) {
    return this.create({
      user_id: userId,
      username,
      action_type: "delete",
      table_name: tableName,
      record_id: recordId,
      old_values: oldValues,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  }

  /**
   * Get audit logs with optional filters
   */
  static findAll(filters = {}) {
    let query = "SELECT * FROM audit_logs WHERE 1=1";
    const params = [];

    if (filters.user_id) {
      query += " AND user_id = ?";
      params.push(filters.user_id);
    }

    if (filters.action_type) {
      query += " AND action_type = ?";
      params.push(filters.action_type);
    }

    if (filters.table_name) {
      query += " AND table_name = ?";
      params.push(filters.table_name);
    }

    if (filters.start_date) {
      query += " AND DATE(created_at) >= ?";
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      query += " AND DATE(created_at) <= ?";
      params.push(filters.end_date);
    }

    if (filters.success !== undefined) {
      query += " AND success = ?";
      params.push(filters.success ? 1 : 0);
    }

    query += " ORDER BY created_at DESC";

    if (filters.limit) {
      query += " LIMIT ?";
      params.push(filters.limit);
    }

    const stmt = db.prepare(query);
    const logs = stmt.all(...params);

    // Parse JSON fields
    return logs.map((log) => ({
      ...log,
      old_values: log.old_values ? JSON.parse(log.old_values) : null,
      new_values: log.new_values ? JSON.parse(log.new_values) : null,
      success: Boolean(log.success),
    }));
  }

  /**
   * Get audit log by ID
   */
  static findById(id) {
    const stmt = db.prepare("SELECT * FROM audit_logs WHERE id = ?");
    const log = stmt.get(id);

    if (!log) return null;

    return {
      ...log,
      old_values: log.old_values ? JSON.parse(log.old_values) : null,
      new_values: log.new_values ? JSON.parse(log.new_values) : null,
      success: Boolean(log.success),
    };
  }

  /**
   * Get recent login history for a user
   */
  static getLoginHistory(userId, limit = 10) {
    const stmt = db.prepare(`
      SELECT * FROM audit_logs 
      WHERE user_id = ? AND action_type IN ('login', 'login_failed')
      ORDER BY created_at DESC
      LIMIT ?
    `);

    const logs = stmt.all(userId, limit);

    return logs.map((log) => ({
      ...log,
      success: Boolean(log.success),
    }));
  }

  /**
   * Get activity summary for a user
   */
  static getUserActivitySummary(userId, days = 30) {
    const stmt = db.prepare(`
      SELECT 
        action_type,
        COUNT(*) as count
      FROM audit_logs
      WHERE user_id = ? 
        AND created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY action_type
      ORDER BY count DESC
    `);

    return stmt.all(userId, days);
  }

  /**
   * Delete old audit logs (for maintenance)
   */
  static deleteOlderThan(days) {
    const stmt = db.prepare(`
      DELETE FROM audit_logs 
      WHERE created_at < datetime('now', '-' || ? || ' days')
    `);

    const result = stmt.run(days);
    return result.changes;
  }
}

module.exports = AuditLog;
