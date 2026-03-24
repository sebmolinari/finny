/**
 * AuthService tests.
 *
 * We mock all model and utility dependencies so the service logic can be
 * exercised in isolation without a real database or JWT infrastructure.
 */

jest.mock("../../../models/User");
jest.mock("../../../models/UserSettings");
jest.mock("../../../models/Asset");
jest.mock("../../../models/PriceData");
jest.mock("../../../models/AuditLog");
jest.mock("../../../utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const User = require("../../../models/User");
const UserSettings = require("../../../models/UserSettings");
const Asset = require("../../../models/Asset");
const AuditLog = require("../../../models/AuditLog");
const AuthService = require("../../../services/authService");
const {
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} = require("../../../errors/AppError");

// ── Helpers ──────────────────────────────────────────────────────────────────

const MOCK_USER = {
  id: 1,
  username: "alice",
  email: "alice@example.com",
  password: "hashed",
  role: "user",
  active: 1,
};

const MOCK_SETTINGS = { user_id: 1, onboarding_completed: 0 };

// ── generateToken ─────────────────────────────────────────────────────────────

describe("AuthService.generateToken", () => {
  it("returns a JWT string", () => {
    const token = AuthService.generateToken(1, "alice", "user");
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3); // header.payload.signature
  });
});

// ── register ─────────────────────────────────────────────────────────────────

describe("AuthService.register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findByUsername.mockReturnValue(null);
    User.findByEmail.mockReturnValue(null);
    User.create.mockResolvedValue(1);
    User.findById.mockReturnValue(MOCK_USER);
    Asset.findBySymbol.mockReturnValue(null);
    Asset.create.mockReturnValue(10);
    UserSettings.create.mockReturnValue(undefined);
    UserSettings.findByUserId.mockReturnValue(MOCK_SETTINGS);
    AuditLog.logCreate.mockReturnValue(undefined);
  });

  it("returns token and user on success", async () => {
    const result = await AuthService.register("alice", "alice@example.com", "password123", "127.0.0.1", "jest");
    expect(result).toHaveProperty("token");
    expect(result.user.username).toBe("alice");
    expect(result.user.role).toBe("user");
  });

  it("throws ConflictError when username already exists", async () => {
    User.findByUsername.mockReturnValue(MOCK_USER);
    await expect(
      AuthService.register("alice", "other@example.com", "password123", "127.0.0.1", "jest")
    ).rejects.toThrow(ConflictError);
  });

  it("throws ConflictError when email already exists", async () => {
    User.findByEmail.mockReturnValue(MOCK_USER);
    await expect(
      AuthService.register("newuser", "alice@example.com", "password123", "127.0.0.1", "jest")
    ).rejects.toThrow(ConflictError);
  });

  it("writes an audit log entry", async () => {
    await AuthService.register("alice", "alice@example.com", "password123", "127.0.0.1", "jest");
    expect(AuditLog.logCreate).toHaveBeenCalledWith(
      1,
      "alice",
      "users",
      1,
      expect.objectContaining({ username: "alice" }),
      "127.0.0.1",
      "jest"
    );
  });

  it("continues even when default seeding fails", async () => {
    Asset.findBySymbol.mockImplementation(() => { throw new Error("seed error"); });
    await expect(
      AuthService.register("alice", "alice@example.com", "password123", "127.0.0.1", "jest")
    ).resolves.toHaveProperty("token");
  });
});

// ── login ─────────────────────────────────────────────────────────────────────

describe("AuthService.login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findByUsername.mockReturnValue(MOCK_USER);
    User.verifyPassword.mockReturnValue(true);
    UserSettings.findByUserId.mockReturnValue(MOCK_SETTINGS);
    AuditLog.logLogin.mockReturnValue(undefined);
    AuditLog.logLoginFailed.mockReturnValue(undefined);
  });

  it("returns token and user on valid credentials", async () => {
    const result = await AuthService.login("alice", "correct", "127.0.0.1", "jest");
    expect(result).toHaveProperty("token");
    expect(result.user.username).toBe("alice");
  });

  it("throws UnauthorizedError when user does not exist", async () => {
    User.findByUsername.mockReturnValue(null);
    await expect(
      AuthService.login("nobody", "pass", "127.0.0.1", "jest")
    ).rejects.toThrow(UnauthorizedError);
    expect(AuditLog.logLoginFailed).toHaveBeenCalled();
  });

  it("throws ForbiddenError when account is disabled", async () => {
    User.findByUsername.mockReturnValue({ ...MOCK_USER, active: 0 });
    await expect(
      AuthService.login("alice", "pass", "127.0.0.1", "jest")
    ).rejects.toThrow(ForbiddenError);
    expect(AuditLog.logLoginFailed).toHaveBeenCalled();
  });

  it("throws UnauthorizedError when password is wrong", async () => {
    User.verifyPassword.mockReturnValue(false);
    await expect(
      AuthService.login("alice", "wrongpass", "127.0.0.1", "jest")
    ).rejects.toThrow(UnauthorizedError);
    expect(AuditLog.logLoginFailed).toHaveBeenCalled();
  });

  it("includes onboarding_completed from settings", async () => {
    UserSettings.findByUserId.mockReturnValue({ onboarding_completed: 1 });
    const result = await AuthService.login("alice", "correct", "127.0.0.1", "jest");
    expect(result.user.onboarding_completed).toBe(1);
  });

  it("defaults onboarding_completed to 0 when settings missing", async () => {
    UserSettings.findByUserId.mockReturnValue(null);
    const result = await AuthService.login("alice", "correct", "127.0.0.1", "jest");
    expect(result.user.onboarding_completed).toBe(0);
  });
});

// ── changePassword ────────────────────────────────────────────────────────────

describe("AuthService.changePassword", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockReturnValue(MOCK_USER);
    User.verifyPassword.mockReturnValue(true);
    User.changePassword.mockResolvedValue(undefined);
    AuditLog.logUpdate.mockReturnValue(undefined);
  });

  it("resolves successfully when current password is correct", async () => {
    await expect(
      AuthService.changePassword(1, "oldpass", "newpass", "127.0.0.1", "jest")
    ).resolves.toBeUndefined();
    expect(User.changePassword).toHaveBeenCalledWith(1, "newpass");
  });

  it("throws NotFoundError when user does not exist", async () => {
    User.findById.mockReturnValue(null);
    await expect(
      AuthService.changePassword(99, "old", "new", "127.0.0.1", "jest")
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ValidationError when current password is wrong", async () => {
    User.verifyPassword.mockReturnValue(false);
    await expect(
      AuthService.changePassword(1, "wrongold", "newpass", "127.0.0.1", "jest")
    ).rejects.toThrow(ValidationError);
  });

  it("throws ValidationError when new password equals current password", async () => {
    await expect(
      AuthService.changePassword(1, "samepass", "samepass", "127.0.0.1", "jest")
    ).rejects.toThrow(ValidationError);
  });

  it("writes an audit log entry on success", async () => {
    await AuthService.changePassword(1, "oldpass", "newpass", "127.0.0.1", "jest");
    expect(AuditLog.logUpdate).toHaveBeenCalledWith(
      1,
      "alice",
      "users",
      1,
      expect.objectContaining({ action: "password_change" }),
      undefined,
      "127.0.0.1",
      "jest"
    );
  });
});
