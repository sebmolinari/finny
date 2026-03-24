const db = require("../../../tests/setup/testDb");
const Scheduler = require("../../../models/Scheduler");
const { ValidationError } = require("../../../errors/AppError");

let userId;
beforeAll(() => {
  db.clearAll();
  userId = db
    .prepare("INSERT INTO users (username, email, password, role) VALUES (?,?,?,?)")
    .run("scheduser", "sc@sc.com", "hash", "admin").lastInsertRowid;
});

beforeEach(() => {
  db.prepare("DELETE FROM scheduler_instances").run();
  db.prepare("DELETE FROM schedulers").run();
});

describe("Scheduler.create", () => {
  it("creates a scheduler and returns the id", () => {
    const id = Scheduler.create("Daily Price Fetch", "price_fetch", "daily", "08:00", userId);
    expect(typeof id).toBe("number");
  });

  it("throws ValidationError for invalid time format", () => {
    expect(() =>
      Scheduler.create("Bad Scheduler", "price_fetch", "daily", "8:00am", userId)
    ).toThrow(ValidationError);
  });

  it("throws ValidationError for missing colon", () => {
    expect(() =>
      Scheduler.create("Bad Scheduler", "price_fetch", "daily", "0800", userId)
    ).toThrow(ValidationError);
  });
});

describe("Scheduler.findById", () => {
  it("returns the scheduler by id", () => {
    const id = Scheduler.create("Find Me", "price_fetch", "daily", "09:00", userId);
    const s = Scheduler.findById(id);
    expect(s).toBeDefined();
    expect(s.name).toBe("Find Me");
  });

  it("returns undefined for unknown id", () => {
    expect(Scheduler.findById(99999)).toBeUndefined();
  });
});

describe("Scheduler.findAll / count", () => {
  it("findAll returns all schedulers ordered by created_at desc", () => {
    Scheduler.create("S1", "price_fetch", "daily", "10:00", userId);
    Scheduler.create("S2", "email", "weekly", "11:00", userId);
    const all = Scheduler.findAll();
    expect(all.length).toBe(2);
  });

  it("count returns total number of schedulers", () => {
    Scheduler.create("Count1", "price_fetch", "daily", "12:00", userId);
    expect(Scheduler.count()).toBe(1);
  });

  it("findAll respects limit and offset", () => {
    Scheduler.create("L1", "price_fetch", "daily", "13:00", userId);
    Scheduler.create("L2", "price_fetch", "daily", "14:00", userId);
    const page = Scheduler.findAll(1, 0);
    expect(page.length).toBe(1);
  });
});

describe("Scheduler.findAllEnabled", () => {
  it("returns only enabled schedulers", () => {
    const id1 = Scheduler.create("Enabled", "price_fetch", "daily", "15:00", userId);
    const id2 = Scheduler.create("Disabled", "price_fetch", "daily", "16:00", userId);
    Scheduler.disable(id2);
    const enabled = Scheduler.findAllEnabled();
    expect(enabled.every((s) => s.enabled === 1)).toBe(true);
    expect(enabled.find((s) => s.id === id2)).toBeUndefined();
  });
});

describe("Scheduler.update", () => {
  it("updates scheduler fields", () => {
    const id = Scheduler.create("OldName", "price_fetch", "daily", "17:00", userId);
    Scheduler.update(id, "NewName", "email", "weekly", "18:00", 1, userId);
    const s = Scheduler.findById(id);
    expect(s.name).toBe("NewName");
    expect(s.frequency).toBe("weekly");
  });

  it("throws ValidationError for invalid time on update", () => {
    const id = Scheduler.create("UpdateBad", "price_fetch", "daily", "19:00", userId);
    expect(() =>
      Scheduler.update(id, "UpdateBad", "price_fetch", "daily", "bad", 1, userId)
    ).toThrow(ValidationError);
  });
});

describe("Scheduler.disable", () => {
  it("disables a scheduler (soft delete)", () => {
    const id = Scheduler.create("ToDisable", "price_fetch", "daily", "20:00", userId);
    const changes = Scheduler.disable(id);
    expect(changes).toBe(1);
    expect(Scheduler.findById(id).enabled).toBe(0);
  });
});
