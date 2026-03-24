const {
  getTodayInTimezone,
  getYesterdayInTimezone,
  getNowInTimezoneISO,
  getSchedulerNow,
} = require("../../../utils/dateUtils");

describe("getTodayInTimezone", () => {
  it("returns a YYYY-MM-DD string", () => {
    const result = getTodayInTimezone("UTC");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("works without a timezone argument", () => {
    const result = getTodayInTimezone();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns the same date for UTC and explicit UTC", () => {
    const withTz = getTodayInTimezone("UTC");
    const withoutTz = getTodayInTimezone("UTC");
    expect(withTz).toBe(withoutTz);
  });

  it("handles different IANA timezones without throwing", () => {
    expect(() => getTodayInTimezone("America/New_York")).not.toThrow();
    expect(() => getTodayInTimezone("Asia/Tokyo")).not.toThrow();
    expect(() => getTodayInTimezone("America/Argentina/Buenos_Aires")).not.toThrow();
  });
});

describe("getYesterdayInTimezone", () => {
  it("returns a YYYY-MM-DD string", () => {
    const result = getYesterdayInTimezone("UTC");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("is exactly one day before today", () => {
    const today = new Date(getTodayInTimezone("UTC"));
    const yesterday = new Date(getYesterdayInTimezone("UTC"));
    const diffMs = today - yesterday;
    expect(diffMs).toBe(24 * 60 * 60 * 1000);
  });

  it("works without a timezone argument", () => {
    const result = getYesterdayInTimezone();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("getNowInTimezoneISO", () => {
  it("returns a string with date and time parts", () => {
    const result = getNowInTimezoneISO("UTC");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+$/);
  });

  it("works without a timezone argument", () => {
    expect(() => getNowInTimezoneISO()).not.toThrow();
  });
});

describe("getSchedulerNow", () => {
  it("returns time in HH:MM format", () => {
    const { time } = getSchedulerNow("UTC");
    expect(time).toMatch(/^\d{2}:\d{2}$/);
  });

  it("returns today in YYYY-MM-DD format", () => {
    const { today } = getSchedulerNow("UTC");
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns dayOfWeek between 0 and 6", () => {
    const { dayOfWeek } = getSchedulerNow("UTC");
    expect(dayOfWeek).toBeGreaterThanOrEqual(0);
    expect(dayOfWeek).toBeLessThanOrEqual(6);
  });

  it("returns dayOfMonth between 1 and 31", () => {
    const { dayOfMonth } = getSchedulerNow("UTC");
    expect(dayOfMonth).toBeGreaterThanOrEqual(1);
    expect(dayOfMonth).toBeLessThanOrEqual(31);
  });

  it("today matches getTodayInTimezone for the same timezone", () => {
    const tz = "America/New_York";
    expect(getSchedulerNow(tz).today).toBe(getTodayInTimezone(tz));
  });

  it("works without a timezone argument", () => {
    expect(() => getSchedulerNow()).not.toThrow();
  });
});
