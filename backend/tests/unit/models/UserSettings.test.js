const db = require("../../../tests/setup/testDb");
const UserSettings = require("../../../models/UserSettings");

let userId;
beforeAll(() => {
  db.clearAll();
  userId = db
    .prepare("INSERT INTO users (username, email, password, role) VALUES (?,?,?,?)")
    .run("settingsuser", "s@s.com", "hash", "user").lastInsertRowid;
});

beforeEach(() => {
  db.prepare("DELETE FROM user_settings").run();
});

describe("UserSettings.create", () => {
  it("creates settings for a user", () => {
    UserSettings.create(userId);
    const settings = UserSettings.findByUserId(userId);
    expect(settings).toBeDefined();
    expect(settings.user_id).toBe(userId);
  });

  it("sets timezone default", () => {
    UserSettings.create(userId);
    const settings = UserSettings.findByUserId(userId);
    expect(settings.timezone).toBe("America/Argentina/Buenos_Aires");
  });

  it("upserts — calling create twice does not throw", () => {
    UserSettings.create(userId);
    expect(() => UserSettings.create(userId)).not.toThrow();
  });
});

describe("UserSettings.findByUserId", () => {
  it("returns undefined for a user with no settings", () => {
    expect(UserSettings.findByUserId(99999)).toBeUndefined();
  });
});

describe("UserSettings.update", () => {
  beforeEach(() => UserSettings.create(userId));

  it("updates the timezone", () => {
    // update(userId, dateFormat, timezone, liquidityAssetId, fxRateAssetId,
    //        rebalancingTolerance, emailNotificationsEnabled, validateCashBalance,
    //        validateSellBalance, updatedBy, marginalTaxRate, ltHoldingPeriodDays, riskFreeRate)
    UserSettings.update(userId, "YYYY-MM-DD", "America/New_York", null, null, 5, 0, 1, 1, userId, 0.25, 365, 0.05);
    expect(UserSettings.findByUserId(userId).timezone).toBe("America/New_York");
  });

  it("updates validate_cash_balance", () => {
    UserSettings.update(userId, "YYYY-MM-DD", "UTC", null, null, 5, 0, 0, 1, userId, 0.25, 365, 0.05);
    expect(UserSettings.findByUserId(userId).validate_cash_balance).toBe(0);
  });
});

describe("UserSettings.markSettingsReviewed / markOnboardingComplete", () => {
  beforeEach(() => UserSettings.create(userId));

  it("markSettingsReviewed sets settings_reviewed to 1", () => {
    UserSettings.markSettingsReviewed(userId);
    expect(UserSettings.findByUserId(userId).settings_reviewed).toBe(1);
  });

  it("markOnboardingComplete sets onboarding_completed to 1", () => {
    UserSettings.markOnboardingComplete(userId);
    expect(UserSettings.findByUserId(userId).onboarding_completed).toBe(1);
  });
});

describe("UserSettings.deleteByUserId", () => {
  it("removes settings for the user", () => {
    UserSettings.create(userId);
    UserSettings.deleteByUserId(userId);
    expect(UserSettings.findByUserId(userId)).toBeUndefined();
  });
});
