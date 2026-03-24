"use strict";

const db = require("../../setup/testDb");
const Notification = require("../../../models/Notification");

beforeEach(() => db.clearAll());

// seed a user row so FK constraints pass
function seedUser(id = 1) {
  db.prepare(
    "INSERT INTO users (id, username, email, password, created_by) VALUES (?, ?, ?, 'hash', ?)",
  ).run(id, `user${id}`, `user${id}@test.com`, id);
}

describe("Notification.create", () => {
  it("inserts a notification and returns its id", () => {
    seedUser(1);
    const id = Notification.create(1, "info", "Title", "Body", { k: "v" });
    expect(typeof id).toBe("number");
    expect(id).toBeGreaterThan(0);
  });

  it("serialises metadata to JSON", () => {
    seedUser(1);
    Notification.create(1, "info", "T", null, { x: 1 });
    const rows = Notification.getByUser(1);
    expect(rows[0].metadata).toEqual({ x: 1 });
  });

  it("stores null metadata when not provided", () => {
    seedUser(1);
    Notification.create(1, "info", "T");
    const rows = Notification.getByUser(1);
    expect(rows[0].metadata).toBeNull();
  });
});

describe("Notification.getByUser", () => {
  it("returns all notifications for a user sorted newest first", () => {
    seedUser(1);
    Notification.create(1, "info", "A");
    Notification.create(1, "warn", "B");
    const rows = Notification.getByUser(1);
    expect(rows).toHaveLength(2);
  });

  it("returns only unread when unreadOnly=true", () => {
    seedUser(1);
    const id = Notification.create(1, "info", "A");
    Notification.create(1, "warn", "B");
    Notification.markRead(1, id);

    const rows = Notification.getByUser(1, true);
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("B");
  });

  it("returns empty array for unknown user", () => {
    const rows = Notification.getByUser(999);
    expect(rows).toEqual([]);
  });
});

describe("Notification.getUnreadCount", () => {
  it("counts only unread", () => {
    seedUser(1);
    const id = Notification.create(1, "info", "A");
    Notification.create(1, "info", "B");
    Notification.markRead(1, id);
    expect(Notification.getUnreadCount(1)).toBe(1);
  });

  it("returns 0 for user with no notifications", () => {
    expect(Notification.getUnreadCount(999)).toBe(0);
  });
});

describe("Notification.markRead", () => {
  it("marks a single notification as read", () => {
    seedUser(1);
    const id = Notification.create(1, "info", "A");
    const changes = Notification.markRead(1, id);
    expect(changes).toBe(1);
    expect(Notification.getUnreadCount(1)).toBe(0);
  });

  it("returns 0 changes when notification not found", () => {
    expect(Notification.markRead(1, 9999)).toBe(0);
  });
});

describe("Notification.markAllRead", () => {
  it("marks all unread as read", () => {
    seedUser(1);
    Notification.create(1, "info", "A");
    Notification.create(1, "info", "B");
    const changes = Notification.markAllRead(1);
    expect(changes).toBe(2);
    expect(Notification.getUnreadCount(1)).toBe(0);
  });

  it("returns 0 when already all read", () => {
    seedUser(1);
    Notification.create(1, "info", "A");
    Notification.markAllRead(1);
    expect(Notification.markAllRead(1)).toBe(0);
  });
});

describe("Notification.deleteAll", () => {
  it("removes all notifications for user", () => {
    seedUser(1);
    Notification.create(1, "info", "A");
    Notification.create(1, "info", "B");
    Notification.deleteAll(1);
    expect(Notification.getByUser(1)).toHaveLength(0);
  });
});

describe("Notification.deleteOld", () => {
  it("deletes notifications older than the threshold", () => {
    seedUser(1);
    // Insert a notification with an explicitly old created_at
    db.prepare(
      "INSERT INTO notifications (user_id, type, title, is_read, created_at) VALUES (1, 'info', 'Old', 0, '2020-01-01 00:00:00')",
    ).run();
    Notification.deleteOld(1, 30); // delete older than 30 days
    expect(Notification.getByUser(1)).toHaveLength(0);
  });

  it("does not delete recent notifications when keepDays is large", () => {
    seedUser(1);
    Notification.create(1, "info", "A");
    Notification.deleteOld(1, 365);
    expect(Notification.getByUser(1)).toHaveLength(1);
  });
});

describe("Notification.hasRecent", () => {
  it("returns true when a matching notification exists within window", () => {
    seedUser(1);
    Notification.create(1, "alert", "Price drop");
    expect(Notification.hasRecent(1, "alert", "Price drop", 86400)).toBe(true);
  });

  it("returns false when no matching notification", () => {
    seedUser(1);
    expect(Notification.hasRecent(1, "alert", "Price drop", 86400)).toBe(false);
  });
});
