"use strict";

jest.mock("../../../models/Scheduler");
jest.mock("../../../models/SchedulerInstance");
jest.mock("../../../models/User");
jest.mock("../../../models/UserSettings");
jest.mock("../../../models/AuditLog");
jest.mock("../../../models/Notification");
jest.mock("../../../services/portfolioEmailService");
jest.mock("../../../services/priceService");
jest.mock("../../../services/emailService");
jest.mock("../../../utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const Scheduler = require("../../../models/Scheduler");
const SchedulerInstance = require("../../../models/SchedulerInstance");
const User = require("../../../models/User");
const UserSettings = require("../../../models/UserSettings");
const AuditLog = require("../../../models/AuditLog");
const Notification = require("../../../models/Notification");
const portfolioEmailService = require("../../../services/portfolioEmailService");
const priceService = require("../../../services/priceService");
const emailService = require("../../../services/emailService");
const SchedulerService = require("../../../services/schedulerService");

beforeEach(() => jest.clearAllMocks());

// ── isScheduleDue (pure logic) ─────────────────────────────────────────────

describe("SchedulerService.isScheduleDue", () => {
  const base = { time_of_day: "08:00", frequency: "daily", metadata: null };

  it("returns false when time does not match", () => {
    expect(
      SchedulerService.isScheduleDue(base, {
        time: "09:00",
        dayOfWeek: 1,
        dayOfMonth: 1,
      }),
    ).toBe(false);
  });

  it("returns true for daily when time matches", () => {
    expect(
      SchedulerService.isScheduleDue(base, {
        time: "08:00",
        dayOfWeek: 1,
        dayOfMonth: 1,
      }),
    ).toBe(true);
  });

  it("returns true for weekly when time and day-of-week match", () => {
    const s = {
      ...base,
      frequency: "weekly",
      metadata: JSON.stringify({ day_of_week: 3 }),
    };
    expect(
      SchedulerService.isScheduleDue(s, {
        time: "08:00",
        dayOfWeek: 3,
        dayOfMonth: 15,
      }),
    ).toBe(true);
  });

  it("returns false for weekly when day-of-week does not match", () => {
    const s = {
      ...base,
      frequency: "weekly",
      metadata: JSON.stringify({ day_of_week: 3 }),
    };
    expect(
      SchedulerService.isScheduleDue(s, {
        time: "08:00",
        dayOfWeek: 2,
        dayOfMonth: 15,
      }),
    ).toBe(false);
  });

  it("defaults day_of_week to 1 when metadata is empty", () => {
    const s = { ...base, frequency: "weekly", metadata: null };
    expect(
      SchedulerService.isScheduleDue(s, {
        time: "08:00",
        dayOfWeek: 1,
        dayOfMonth: 1,
      }),
    ).toBe(true);
    expect(
      SchedulerService.isScheduleDue(s, {
        time: "08:00",
        dayOfWeek: 2,
        dayOfMonth: 1,
      }),
    ).toBe(false);
  });

  it("returns true for monthly when time and day-of-month match", () => {
    const s = {
      ...base,
      frequency: "monthly",
      metadata: JSON.stringify({ day_of_month: 15 }),
    };
    expect(
      SchedulerService.isScheduleDue(s, {
        time: "08:00",
        dayOfWeek: 1,
        dayOfMonth: 15,
      }),
    ).toBe(true);
  });

  it("returns false for monthly when day-of-month does not match", () => {
    const s = {
      ...base,
      frequency: "monthly",
      metadata: JSON.stringify({ day_of_month: 15 }),
    };
    expect(
      SchedulerService.isScheduleDue(s, {
        time: "08:00",
        dayOfWeek: 1,
        dayOfMonth: 14,
      }),
    ).toBe(false);
  });

  it("defaults day_of_month to 1 when metadata is empty", () => {
    const s = { ...base, frequency: "monthly", metadata: null };
    expect(
      SchedulerService.isScheduleDue(s, {
        time: "08:00",
        dayOfWeek: 1,
        dayOfMonth: 1,
      }),
    ).toBe(true);
  });

  it("returns false for unknown frequency", () => {
    const s = { ...base, frequency: "hourly" };
    expect(
      SchedulerService.isScheduleDue(s, {
        time: "08:00",
        dayOfWeek: 1,
        dayOfMonth: 1,
      }),
    ).toBe(false);
  });
});

// ── _generateFailureEmail (pure HTML generation) ───────────────────────────

describe("SchedulerService._generateFailureEmail", () => {
  it("returns an HTML string containing the scheduler name", () => {
    const html = SchedulerService._generateFailureEmail(
      "My Scheduler",
      "timeout",
      "send_report",
      3,
    );
    expect(typeof html).toBe("string");
    expect(html).toContain("My Scheduler");
    expect(html).toContain("Portfolio Email");
  });

  it("labels asset_refresh type correctly", () => {
    const html = SchedulerService._generateFailureEmail(
      "S",
      "err",
      "asset_refresh",
      1,
    );
    expect(html).toContain("Asset Price Refresh");
  });

  it("uses raw type when unknown", () => {
    const html = SchedulerService._generateFailureEmail(
      "S",
      "err",
      "custom_type",
      1,
    );
    expect(html).toContain("custom_type");
  });

  it("handles null schedulerName", () => {
    const html = SchedulerService._generateFailureEmail(
      null,
      "err",
      "send_report",
      3,
    );
    expect(typeof html).toBe("string");
  });
});

// ── CRUD delegations ───────────────────────────────────────────────────────

describe("SchedulerService CRUD delegations", () => {
  it("getSchedulers delegates to Scheduler.findAll", () => {
    Scheduler.findAll.mockReturnValue([]);
    SchedulerService.getSchedulers(10, 0);
    expect(Scheduler.findAll).toHaveBeenCalledWith(10, 0);
  });

  it("getSchedulersCount delegates to Scheduler.count", () => {
    Scheduler.count.mockReturnValue(5);
    expect(SchedulerService.getSchedulersCount()).toBe(5);
  });

  it("getSchedulerById delegates to Scheduler.findById", () => {
    Scheduler.findById.mockReturnValue({ id: 1 });
    expect(SchedulerService.getSchedulerById(1)).toEqual({ id: 1 });
  });

  it("createScheduler delegates to Scheduler.create", () => {
    Scheduler.create.mockReturnValue(1);
    SchedulerService.createScheduler("N", "t", "daily", "08:00", 1);
    expect(Scheduler.create).toHaveBeenCalledWith(
      "N",
      "t",
      "daily",
      "08:00",
      1,
    );
  });

  it("updateScheduler delegates to Scheduler.update", () => {
    Scheduler.update.mockReturnValue(1);
    SchedulerService.updateScheduler(1, "N", "t", "weekly", "09:00", 1, 1);
    expect(Scheduler.update).toHaveBeenCalledWith(
      1,
      "N",
      "t",
      "weekly",
      "09:00",
      1,
      1,
    );
  });

  it("deleteScheduler delegates to Scheduler.disable", () => {
    Scheduler.disable.mockReturnValue(1);
    SchedulerService.deleteScheduler(1);
    expect(Scheduler.disable).toHaveBeenCalledWith(1);
  });

  it("getSchedulerInstances delegates to SchedulerInstance.findBySchedulerId", () => {
    SchedulerInstance.findBySchedulerId.mockReturnValue([]);
    SchedulerService.getSchedulerInstances(1, 20, 0);
    expect(SchedulerInstance.findBySchedulerId).toHaveBeenCalledWith(1, 20, 0);
  });

  it("getSchedulerInstancesCount delegates to SchedulerInstance.countBySchedulerId", () => {
    SchedulerInstance.countBySchedulerId.mockReturnValue(3);
    expect(SchedulerService.getSchedulerInstancesCount(1)).toBe(3);
  });

  it("purgeAllInstances delegates to SchedulerInstance.purgeAll", () => {
    SchedulerInstance.purgeAll.mockReturnValue(5);
    expect(SchedulerService.purgeAllInstances()).toBe(5);
  });
});

// ── executeWithRetry ────────────────────────────────────────────────────────

describe("SchedulerService.executeWithRetry", () => {
  const scheduler = {
    id: 1,
    name: "Daily Report",
    type: "send_report",
    retry_count: 3,
  };

  it("executes send_report type and logs success instance", async () => {
    portfolioEmailService.sendBatchEmails.mockResolvedValue({ sent: 2 });
    SchedulerInstance.create.mockReturnValue(10);

    await SchedulerService.executeWithRetry(scheduler);

    expect(portfolioEmailService.sendBatchEmails).toHaveBeenCalled();
    expect(SchedulerInstance.create).toHaveBeenCalledWith(
      1,
      expect.any(String),
      expect.any(String),
      "success",
      1,
      { sent: 2 },
      null,
    );
  });

  it("executes asset_refresh type and creates audit log on success", async () => {
    const refreshResult = { updated: 5, skipped: 0, failed: 0, total: 5 };
    priceService.refreshAllPrices.mockResolvedValue(refreshResult);
    AuditLog.create.mockReturnValue(undefined);
    SchedulerInstance.create.mockReturnValue(11);

    const assetScheduler = { ...scheduler, type: "asset_refresh" };
    await SchedulerService.executeWithRetry(assetScheduler);

    expect(priceService.refreshAllPrices).toHaveBeenCalled();
    expect(AuditLog.create).toHaveBeenCalled();
    expect(SchedulerInstance.create).toHaveBeenCalledWith(
      1,
      expect.any(String),
      expect.any(String),
      "success",
      1,
      refreshResult,
      null,
    );
  });

  it("records failed instance on max attempts exceeded", async () => {
    portfolioEmailService.sendBatchEmails.mockRejectedValue(
      new Error("smtp timeout"),
    );
    SchedulerInstance.create.mockReturnValue(12);
    User.getAll.mockReturnValue({ users: [] });

    // Attempt 4 = max retries
    await SchedulerService.executeWithRetry(scheduler, 4);

    expect(SchedulerInstance.create).toHaveBeenCalledWith(
      1,
      expect.any(String),
      expect.any(String),
      "failed",
      4,
      null,
      "smtp timeout",
    );
  });

  it("throws for unknown scheduler type after exhausting retries", async () => {
    const unknown = { ...scheduler, type: "unknown_type" };
    SchedulerInstance.create.mockReturnValue(13);
    User.getAll.mockReturnValue({ users: [] });

    // Should not throw (error is caught internally) at attempt 3
    await expect(
      SchedulerService.executeWithRetry(unknown, 4),
    ).resolves.toBeUndefined();
    expect(SchedulerInstance.create).toHaveBeenCalledWith(
      1,
      expect.any(String),
      expect.any(String),
      "failed",
      4,
      null,
      expect.stringContaining("Unknown scheduler type"),
    );
  });
});

// ── checkDueSchedules ────────────────────────────────────────────────────────

describe("SchedulerService.checkDueSchedules", () => {
  it("does nothing when no enabled schedulers", async () => {
    Scheduler.findAllEnabled.mockReturnValue([]);
    await SchedulerService.checkDueSchedules();
    expect(SchedulerInstance.findTodayExecution).not.toHaveBeenCalled();
  });

  it("skips schedulers that are not due", async () => {
    const s = {
      id: 1,
      name: "S",
      time_of_day: "23:59",
      frequency: "daily",
      created_by: 1,
      metadata: null,
    };
    Scheduler.findAllEnabled.mockReturnValue([s]);
    UserSettings.findByUserId.mockReturnValue({ timezone: "UTC" });

    await SchedulerService.checkDueSchedules();
    // Not due at test time (not 23:59), so no execution check
    expect(SchedulerInstance.findTodayExecution).not.toHaveBeenCalled();
  });

  it("skips when already executed today", async () => {
    const nowParts = {
      time: "08:00",
      dayOfWeek: 1,
      dayOfMonth: 1,
      today: "2024-01-01",
    };
    const s = {
      id: 1,
      name: "S",
      time_of_day: "08:00",
      frequency: "daily",
      created_by: 1,
      metadata: null,
    };
    Scheduler.findAllEnabled.mockReturnValue([s]);
    UserSettings.findByUserId.mockReturnValue({ timezone: "UTC" });
    SchedulerInstance.findTodayExecution.mockReturnValue({ id: 5 });

    // Spy isScheduleDue to return true
    const spy = jest
      .spyOn(SchedulerService, "isScheduleDue")
      .mockReturnValue(true);
    await SchedulerService.checkDueSchedules();
    expect(SchedulerInstance.findTodayExecution).toHaveBeenCalled();
    spy.mockRestore();
  });
});

// ── notifyAdminsOfFailure ────────────────────────────────────────────────────

describe("SchedulerService.notifyAdminsOfFailure", () => {
  it("sends email to each admin with an email address", async () => {
    User.getAll.mockReturnValue({
      users: [
        { id: 1, email: "admin@test.com" },
        { id: 2, email: null }, // should be skipped
      ],
    });
    emailService.sendEmail.mockResolvedValue({ success: true });

    await SchedulerService.notifyAdminsOfFailure(
      1,
      "My Sched",
      "timeout",
      "send_report",
      3,
    );

    expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      "admin@test.com",
      expect.stringContaining("My Sched"),
      expect.any(String),
    );
  });

  it("uses scheduler id when name is null", async () => {
    User.getAll.mockReturnValue({ users: [{ id: 1, email: "a@b.com" }] });
    emailService.sendEmail.mockResolvedValue({ success: true });

    await SchedulerService.notifyAdminsOfFailure(
      99,
      null,
      "err",
      "send_report",
      3,
    );

    expect(emailService.sendEmail).toHaveBeenCalledWith(
      "a@b.com",
      expect.stringContaining("#99"),
      expect.any(String),
    );
  });

  it("logs error when sendEmail throws (catch branch line 185)", async () => {
    User.getAll.mockReturnValue({ users: [{ id: 1, email: "a@b.com" }] });
    emailService.sendEmail.mockRejectedValue(new Error("SMTP down"));
    const logger = require("../../../utils/logger");

    await SchedulerService.notifyAdminsOfFailure(
      1,
      "S",
      "err",
      "send_report",
      1,
    );

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Failed to send admin failure notification"),
    );
  });
});

// ── checkDueSchedules — execution branch ─────────────────────────────────

describe("SchedulerService.checkDueSchedules — execution branch", () => {
  it("calls executeWithRetry when schedule is due and not yet executed", async () => {
    const s = {
      id: 1,
      name: "Due",
      time_of_day: "08:00",
      frequency: "daily",
      created_by: 1,
      metadata: null,
    };
    Scheduler.findAllEnabled.mockReturnValue([s]);
    UserSettings.findByUserId.mockReturnValue({ timezone: "UTC" });
    SchedulerInstance.findTodayExecution.mockReturnValue(null); // not yet executed

    const spy = jest
      .spyOn(SchedulerService, "isScheduleDue")
      .mockReturnValue(true);
    const execSpy = jest
      .spyOn(SchedulerService, "executeWithRetry")
      .mockResolvedValue(undefined);

    await SchedulerService.checkDueSchedules();

    expect(execSpy).toHaveBeenCalledWith(s);
    spy.mockRestore();
    execSpy.mockRestore();
  });

  it("catches inner error when executeWithRetry throws", async () => {
    const s = {
      id: 2,
      name: "Failing",
      time_of_day: "08:00",
      frequency: "daily",
      created_by: 1,
      metadata: null,
    };
    Scheduler.findAllEnabled.mockReturnValue([s]);
    UserSettings.findByUserId.mockReturnValue({ timezone: "UTC" });
    SchedulerInstance.findTodayExecution.mockReturnValue(null);

    const isDueSpy = jest
      .spyOn(SchedulerService, "isScheduleDue")
      .mockReturnValue(true);
    const execSpy = jest
      .spyOn(SchedulerService, "executeWithRetry")
      .mockRejectedValue(new Error("execute failed"));
    const logger = require("../../../utils/logger");

    await SchedulerService.checkDueSchedules(); // should not throw

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Error checking schedule"),
    );
    isDueSpy.mockRestore();
    execSpy.mockRestore();
  });

  it("catches outer error when findAllEnabled throws", async () => {
    Scheduler.findAllEnabled.mockImplementation(() => {
      throw new Error("DB down");
    });
    const logger = require("../../../utils/logger");

    await SchedulerService.checkDueSchedules(); // should not throw

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Error in checkDueSchedules"),
    );
  });
});

// ── executeWithRetry — additional branches ────────────────────────────────

describe("SchedulerService.executeWithRetry — additional branches", () => {
  it("throws when asset_refresh result has failed > 0 (line 111)", async () => {
    const refreshResult = { updated: 3, skipped: 0, failed: 2, total: 5 };
    priceService.refreshAllPrices.mockResolvedValue(refreshResult);
    AuditLog.create.mockReturnValue(undefined);
    SchedulerInstance.create.mockReturnValue(11);
    User.getAll.mockReturnValue({ users: [] });

    const assetScheduler = { id: 1, name: "Refresh", type: "asset_refresh" };
    // On attempt 3 (max), the error from failed>0 should be caught and logged
    await SchedulerService.executeWithRetry(assetScheduler, 4);

    expect(SchedulerInstance.create).toHaveBeenCalledWith(
      1,
      expect.any(String),
      expect.any(String),
      "failed",
      4,
      null,
      expect.stringContaining("failed asset"),
    );
  });

  it("does not create a failed instance when attempt < maxRetries (setTimeout retry branch)", async () => {
    portfolioEmailService.sendBatchEmails.mockRejectedValue(
      new Error("timeout"),
    );
    SchedulerInstance.create.mockReturnValue(undefined);

    const scheduler = { id: 1, name: "S", type: "send_report" };
    // Attempt 1 out of 3 — should schedule a retry, NOT create a failed instance
    await SchedulerService.executeWithRetry(scheduler, 1);

    // SchedulerInstance.create should NOT be called (that only happens at maxRetries)
    expect(SchedulerInstance.create).not.toHaveBeenCalled();
  });
});
