const db = require("../config/database");
const bcrypt = require("bcryptjs");
const UserSettings = require("./UserSettings");

class User {
  static create(username, email, password, role, createdBy) {
    // Check if this is the first user
    const countStmt = db.prepare("SELECT COUNT(*) as count FROM users");
    const { count } = countStmt.get();
    let finalRole = role;
    if (count === 0) {
      finalRole = "admin";
    }
    const hashedPassword = bcrypt.hashSync(password, 10);
    const stmt = db.prepare(
      "INSERT INTO users (username, email, password, role, active, created_by) VALUES (?, ?, ?, ?, 1, ?)",
    );
    const result = stmt.run(
      username,
      email,
      hashedPassword,
      finalRole,
      createdBy,
    );
    const userId = result.lastInsertRowid;

    return userId;
  }

  static updateStatus(id, active, updatedBy) {
    const stmt = db.prepare(
      "UPDATE users SET active = ?, updated_by = ? WHERE id = ?",
    );
    return stmt.run(active, updatedBy, id);
  }

  static updateRole(id, role, updatedBy) {
    const stmt = db.prepare(
      "UPDATE users SET role = ?, updated_by = ? WHERE id = ?",
    );
    return stmt.run(role, updatedBy, id);
  }

  static deleteById(id) {
    UserSettings.deleteByUserId(id);

    const stmt = db.prepare("DELETE FROM users WHERE id = ?");
    return stmt.run(id);
  }

  static changePassword(id, newPassword) {
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    const stmt = db.prepare(
      "UPDATE users SET password = ?, updated_by = ? WHERE id = ?",
    );
    return stmt.run(hashedPassword, id, id);
  }

  static findByUsername(username) {
    const stmt = db.prepare("SELECT * FROM users WHERE username = ?");
    return stmt.get(username);
  }

  static findByEmail(email) {
    const stmt = db.prepare("SELECT * FROM users WHERE email = ?");
    return stmt.get(email);
  }

  static findById(id) {
    const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
    return stmt.get(id);
  }

  static verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compareSync(plainPassword, hashedPassword);
  }

  static getAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      search = "",
      role = "",
      active = "",
    } = options;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereConditions = [];
    let params = [];

    if (search) {
      whereConditions.push("(u.username LIKE ? OR u.email LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }

    if (role) {
      whereConditions.push("u.role = ?");
      params.push(role);
    }

    if (active !== "") {
      whereConditions.push("u.active = ?");
      params.push(active);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Get total count
    const countStmt = db.prepare(`
      SELECT COUNT(*) as total
      FROM users u
      ${whereClause}
    `);
    const { total } = countStmt.get(...params);

    // Get paginated data
    const stmt = db.prepare(`
      SELECT 
        u.id, u.username, u.email, u.role, u.active, u.created_at,
        u2.username as updated_by_username
      FROM users u
      LEFT JOIN users u2 ON u.updated_by = u2.id
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `);
    const users = stmt.all(...params, limit, offset);

    return {
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = User;
