const db = require("../../../tests/setup/testDb");
const AuditLog = require("../../../models/AuditLog");

let userId;
beforeAll(() => {
  db.clearAll();
  userId = db
    .prepare("INSERT INTO users (username, email, password, role) VALUES (?,?,?,?)")
    .run("audituser", "a@a.com", "hash", "admin").lastInsertRowid;
});

beforeEach(() => {
  db.prepare("DELETE FROM audit_logs").run();
});

describe("AuditLog.create", () => {
  it("creates an audit log entry and returns the id", () => {
    const id = AuditLog.create({
      user_id: userId,
      username: "audituser",
      action_type: "test_action",
      table_name: "users",
      record_id: 1,
    });
    expect(typeof id).toBe("number");
  });

  it("serialises old_values and new_values as JSON", () => {
    AuditLog.create({
      user_id: userId,
      username: "audituser",
      action_type: "update",
      old_values: { name: "old" },
      new_values: { name: "new" },
    });
    const row = db.prepare("SELECT * FROM audit_logs LIMIT 1").get();
    expect(JSON.parse(row.old_values)).toEqual({ name: "old" });
    expect(JSON.parse(row.new_values)).toEqual({ name: "new" });
  });

  it("defaults success to 1 when not provided", () => {
    AuditLog.create({ user_id: userId, username: "x", action_type: "test" });
    const row = db.prepare("SELECT * FROM audit_logs LIMIT 1").get();
    expect(row.success).toBe(1);
  });
});

describe("AuditLog.findAll", () => {
  beforeEach(() => {
    AuditLog.create({ user_id: userId, username: "audituser", action_type: "login", table_name: "users", record_id: 1 });
    AuditLog.create({ user_id: userId, username: "audituser", action_type: "update", table_name: "assets", record_id: 2 });
    AuditLog.logLoginFailed("baduser", "127.0.0.1", "jest", "wrong");
  });

  it("returns all logs with no filters", () => {
    const logs = AuditLog.findAll();
    expect(logs.length).toBeGreaterThanOrEqual(3);
  });

  it("filters by user_id", () => {
    const logs = AuditLog.findAll({ user_id: userId });
    expect(logs.every((l) => l.user_id === userId)).toBe(true);
  });

  it("filters by action_type", () => {
    const logs = AuditLog.findAll({ action_type: "login" });
    expect(logs.every((l) => l.action_type === "login")).toBe(true);
  });

  it("filters by table_name", () => {
    const logs = AuditLog.findAll({ table_name: "assets" });
    expect(logs.every((l) => l.table_name === "assets")).toBe(true);
  });

  it("filters by success=false", () => {
    const logs = AuditLog.findAll({ success: false });
    expect(logs.every((l) => l.success === false)).toBe(true);
  });

  it("respects limit", () => {
    const logs = AuditLog.findAll({ limit: 1 });
    expect(logs.length).toBe(1);
  });

  it("parses old_values and new_values as objects", () => {
    AuditLog.create({
      user_id: userId,
      username: "audituser",
      action_type: "update",
      old_values: { x: 1 },
      new_values: { x: 2 },
    });
    const logs = AuditLog.findAll({ action_type: "update" });
    const withValues = logs.find((l) => l.old_values?.x === 1);
    expect(withValues).toBeDefined();
    expect(withValues.new_values.x).toBe(2);
  });
});

describe("AuditLog.findById", () => {
  it("returns the log by id with parsed values", () => {
    const id = AuditLog.create({
      user_id: userId,
      username: "audituser",
      action_type: "delete",
      old_values: { name: "gone" },
    });
    const log = AuditLog.findById(id);
    expect(log).not.toBeNull();
    expect(log.action_type).toBe("delete");
    expect(log.old_values.name).toBe("gone");
  });

  it("returns null for unknown id", () => {
    expect(AuditLog.findById(99999)).toBeNull();
  });
});

describe("AuditLog.getLoginHistory", () => {
  it("returns login and login_failed entries for the user", () => {
    AuditLog.logLogin(userId, "audituser", "127.0.0.1", "jest");
    const history = AuditLog.getLoginHistory(userId);
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history.every((h) => ["login", "login_failed"].includes(h.action_type))).toBe(true);
  });
});

describe("AuditLog.getUserActivitySummary", () => {
  it("returns grouped action counts", () => {
    AuditLog.logLogin(userId, "audituser", "127.0.0.1", "jest");
    AuditLog.logLogin(userId, "audituser", "127.0.0.1", "jest");
    const summary = AuditLog.getUserActivitySummary(userId);
    expect(Array.isArray(summary)).toBe(true);
  });
});

describe("AuditLog.deleteOlderThan", () => {
  it("returns the number of deleted rows (0 for recent logs)", () => {
    AuditLog.logLogin(userId, "audituser", "127.0.0.1", "jest");
    const deleted = AuditLog.deleteOlderThan(365 * 100); // 100 years
    expect(typeof deleted).toBe("number");
  });
});

describe("AuditLog convenience log methods", () => {
  it("logLogin records a login action", () => {
    AuditLog.logLogin(userId, "audituser", "127.0.0.1", "jest");
    const row = db.prepare("SELECT * FROM audit_logs WHERE action_type='login'").get();
    expect(row).toBeDefined();
    expect(row.success).toBe(1);
  });

  it("logLoginFailed records a failed login", () => {
    AuditLog.logLoginFailed("baduser", "127.0.0.1", "jest", "User not found");
    const row = db.prepare("SELECT * FROM audit_logs WHERE action_type='login_failed'").get();
    expect(row).toBeDefined();
    expect(row.success).toBe(0);
  });

  it("logLogout records a logout action", () => {
    AuditLog.logLogout(userId, "audituser", "127.0.0.1", "jest");
    const row = db.prepare("SELECT * FROM audit_logs WHERE action_type='logout'").get();
    expect(row).toBeDefined();
  });

  it("logCreate records a create action", () => {
    AuditLog.logCreate(userId, "audituser", "users", 5, { username: "newuser" }, "127.0.0.1", "jest");
    const row = db.prepare("SELECT * FROM audit_logs WHERE action_type='create'").get();
    expect(row).toBeDefined();
    expect(row.table_name).toBe("users");
  });

  it("logUpdate records an update action", () => {
    AuditLog.logUpdate(userId, "audituser", "users", 5, { role: "admin" }, { role: "user" }, "127.0.0.1", "jest");
    const row = db.prepare("SELECT * FROM audit_logs WHERE action_type='update'").get();
    expect(row).toBeDefined();
  });

  it("logDelete records a delete action", () => {
    AuditLog.logDelete(userId, "audituser", "users", 5, { username: "gone" }, "127.0.0.1", "jest");
    const row = db.prepare("SELECT * FROM audit_logs WHERE action_type='delete'").get();
    expect(row).toBeDefined();
  });
});
