const db = require("../../../tests/setup/testDb");
const Scheduler = require("../../../models/Scheduler");
const SchedulerInstance = require("../../../models/SchedulerInstance");

let userId, schedulerId;
beforeAll(() => {
  db.clearAll();
  userId = db
    .prepare("INSERT INTO users (username, email, password, role) VALUES (?,?,?,?)")
    .run("instuser", "i@i.com", "hash", "admin").lastInsertRowid;
  schedulerId = Scheduler.create("Test Scheduler", "price_fetch", "daily", "08:00", userId);
});

beforeEach(() => {
  db.prepare("DELETE FROM scheduler_instances").run();
});

describe("SchedulerInstance.create", () => {
  it("creates a scheduler instance and returns the id", () => {
    const id = SchedulerInstance.create(
      schedulerId,
      "2024-01-01T08:00:00Z",
      "2024-01-01T08:00:05Z",
      "success",
      1,
      { prices_fetched: 5 },
      null
    );
    expect(typeof id).toBe("number");
  });

  it("serialises result as JSON", () => {
    SchedulerInstance.create(
      schedulerId,
      "2024-01-02T08:00:00Z",
      "2024-01-02T08:00:05Z",
      "success",
      1,
      { count: 3 },
      null
    );
    const row = db.prepare("SELECT * FROM scheduler_instances LIMIT 1").get();
    expect(JSON.parse(row.result)).toEqual({ count: 3 });
  });

  it("stores null result when not provided", () => {
    SchedulerInstance.create(
      schedulerId,
      "2024-01-03T08:00:00Z",
      null,
      "pending",
      1,
      null,
      null
    );
    const row = db.prepare("SELECT * FROM scheduler_instances LIMIT 1").get();
    expect(row.result).toBeNull();
  });

  it("stores error message on failure", () => {
    SchedulerInstance.create(
      schedulerId,
      "2024-01-04T08:00:00Z",
      "2024-01-04T08:00:01Z",
      "failed",
      1,
      null,
      "Network timeout"
    );
    const row = db.prepare("SELECT * FROM scheduler_instances LIMIT 1").get();
    expect(row.error_message).toBe("Network timeout");
  });
});

describe("SchedulerInstance.findTodayExecution", () => {
  it("returns a row when a success execution exists for today", () => {
    const today = "2024-05-10";
    SchedulerInstance.create(
      schedulerId,
      `${today}T08:00:00Z`,
      `${today}T08:00:05Z`,
      "success",
      1,
      null,
      null
    );
    const row = SchedulerInstance.findTodayExecution(schedulerId, today);
    expect(row).toBeDefined();
    expect(row.id).toBeDefined();
  });

  it("returns undefined when no execution exists for today", () => {
    const row = SchedulerInstance.findTodayExecution(schedulerId, "1999-01-01");
    expect(row).toBeUndefined();
  });

  it("does not return a failed execution", () => {
    const today = "2024-05-11";
    SchedulerInstance.create(
      schedulerId,
      `${today}T08:00:00Z`,
      `${today}T08:00:01Z`,
      "failed",
      1,
      null,
      "err"
    );
    const row = SchedulerInstance.findTodayExecution(schedulerId, today);
    expect(row).toBeUndefined();
  });
});

describe("SchedulerInstance.findBySchedulerId / countBySchedulerId", () => {
  it("returns instances for the scheduler ordered desc", () => {
    SchedulerInstance.create(schedulerId, "2024-06-01T08:00:00Z", null, "success", 1, null, null);
    SchedulerInstance.create(schedulerId, "2024-06-02T08:00:00Z", null, "success", 1, null, null);
    const rows = SchedulerInstance.findBySchedulerId(schedulerId);
    expect(rows.length).toBe(2);
  });

  it("respects limit and offset", () => {
    SchedulerInstance.create(schedulerId, "2024-07-01T08:00:00Z", null, "success", 1, null, null);
    SchedulerInstance.create(schedulerId, "2024-07-02T08:00:00Z", null, "success", 1, null, null);
    const page = SchedulerInstance.findBySchedulerId(schedulerId, 1, 0);
    expect(page.length).toBe(1);
  });

  it("countBySchedulerId returns correct count", () => {
    SchedulerInstance.create(schedulerId, "2024-08-01T08:00:00Z", null, "success", 1, null, null);
    SchedulerInstance.create(schedulerId, "2024-08-02T08:00:00Z", null, "success", 1, null, null);
    expect(SchedulerInstance.countBySchedulerId(schedulerId)).toBe(2);
  });
});

describe("SchedulerInstance.purgeAll", () => {
  it("deletes all instances and returns the count", () => {
    SchedulerInstance.create(schedulerId, "2024-09-01T08:00:00Z", null, "success", 1, null, null);
    SchedulerInstance.create(schedulerId, "2024-09-02T08:00:00Z", null, "success", 1, null, null);
    const changes = SchedulerInstance.purgeAll();
    expect(changes).toBe(2);
    expect(SchedulerInstance.countBySchedulerId(schedulerId)).toBe(0);
  });
});
