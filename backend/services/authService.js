const jwt = require("jsonwebtoken");
const User = require("../models/User");
const UserSettings = require("../models/UserSettings");
const Asset = require("../models/Asset");
const PriceData = require("../models/PriceData");
const AuditLog = require("../models/AuditLog");
const Notification = require("../models/Notification");
const {
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} = require("../errors/AppError");
const logger = require("../utils/logger");
const { getTodayInTimezone } = require("../utils/dateUtils");

/**
 * Default assets seeded for every new installation.
 * Protected from deletion elsewhere in the codebase.
 */
const DEFAULT_ASSETS = [
  {
    symbol: "USD",
    name: "US Dollar",
    assetType: "currency",
    currency: "USD",
    priceSource: "manual",
    priceSymbol: null,
  },
  {
    symbol: "USDARS_BNA",
    name: "USD/ARS FX Rate BNA",
    assetType: "currency",
    currency: "USD",
    priceSource: "dolarapi",
    priceSymbol: "oficial",
  },
  {
    symbol: "USDARS_CCL",
    name: "USD/ARS FX Rate CCL",
    assetType: "currency",
    currency: "USD",
    priceSource: "dolarapi",
    priceSymbol: "contadoconliqui",
  },
];

class AuthService {
  /**
   * Generate a signed JWT for the given user.
   */
  static generateToken(userId, username, role) {
    return jwt.sign({ id: userId, username, role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRATION,
    });
  }

  /**
   * Register a new user.
   * Throws ConflictError on duplicate username/email.
   * Returns { token, user, settings } on success.
   */
  static async register(username, email, password, ip, userAgent) {
    if (User.findByUsername(username)) {
      throw new ConflictError("Username already exists");
    }
    if (User.findByEmail(email)) {
      throw new ConflictError("Email already exists");
    }

    const userId = await User.create(username, email, password, "user");
    const newUser = User.findById(userId);
    const role = newUser.role;

    logger.info(`USER REGISTERED: ${username} (ID: ${userId})`);

    AuditLog.logCreate(
      userId,
      username,
      "users",
      userId,
      { username, email, role },
      ip,
      userAgent,
    );

    // Seed default global assets and user settings
    try {
      for (const a of DEFAULT_ASSETS) {
        if (!Asset.findBySymbol(a.symbol)) {
          Asset.create(
            a.symbol,
            a.name,
            a.assetType,
            a.currency,
            a.priceSource,
            a.priceSymbol,
            1,
            null,
            userId,
          );
        }
      }

      const usdAsset = Asset.findBySymbol("USD");
      const bnaAsset = Asset.findBySymbol("USDARS_BNA");

      UserSettings.create(
        userId,
        undefined,
        undefined,
        usdAsset?.id,
        bnaAsset?.id,
        5,
        1,
        1,
        1,
        userId,
      );

      // Seed USD with a $1 price if none exists yet
      if (usdAsset && !Asset.getLatestPrice(usdAsset.id)) {
        const tz = UserSettings.findByUserId(userId)?.timezone || "UTC";
        const today = getTodayInTimezone(tz);
        PriceData.create(usdAsset.id, today, 1, "manual", userId);
      }

      Notification.create(
        userId,
        "Welcome to Finny! 🎉",
        "Your account has been successfully created. Start by adding your assets and transactions to see your portfolio come to life!",
        null,
      );
    } catch (seedErr) {
      logger.warn(
        `Failed to seed defaults for user ${userId}: ${seedErr.message}`,
      );
    }

    const token = AuthService.generateToken(userId, username, role);
    const settings = UserSettings.findByUserId(userId);

    return {
      token,
      user: {
        id: userId,
        username,
        email,
        role,
        onboarding_completed: settings?.onboarding_completed ?? 0,
      },
    };
  }

  /**
   * Authenticate a user by username + password.
   * Throws UnauthorizedError or ForbiddenError on failure.
   * Returns { token, user } on success.
   */
  static async login(username, password, ip, userAgent) {
    const user = User.findByUsername(username);

    if (!user) {
      logger.warn(`LOGIN FAILED: User not found - ${username}`);
      AuditLog.logLoginFailed(username, ip, userAgent, "User not found");
      throw new UnauthorizedError("Invalid credentials");
    }

    if (!user.active) {
      logger.warn(`LOGIN FAILED: Account disabled - ${username}`);
      AuditLog.logLoginFailed(username, ip, userAgent, "Account is disabled");
      throw new ForbiddenError(
        "Account is disabled. Please contact an administrator.",
      );
    }

    const isValidPassword = User.verifyPassword(password, user.password);
    if (!isValidPassword) {
      logger.warn(`LOGIN FAILED: Invalid password - ${username}`);
      AuditLog.logLoginFailed(username, ip, userAgent, "Invalid password");
      throw new UnauthorizedError("Invalid credentials");
    }

    const token = AuthService.generateToken(user.id, user.username, user.role);

    logger.info(`LOGIN SUCCESS: ${username} (${user.role})`);
    AuditLog.logLogin(user.id, user.username, ip, userAgent);

    const settings = UserSettings.findByUserId(user.id);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        onboarding_completed: settings?.onboarding_completed ?? 0,
      },
    };
  }

  /**
   * Change the password for an authenticated user.
   * Throws NotFoundError, ValidationError, or UnauthorizedError on failure.
   */
  static async changePassword(
    userId,
    currentPassword,
    newPassword,
    ip,
    userAgent,
  ) {
    const user = User.findById(userId);
    if (!user) throw new NotFoundError("User not found");

    if (!User.verifyPassword(currentPassword, user.password)) {
      logger.warn(
        `PASSWORD CHANGE FAILED: Invalid current password - ${user.username}`,
      );
      throw new ValidationError("Current password is incorrect");
    }

    if (currentPassword === newPassword) {
      throw new ValidationError(
        "New password must be different from current password",
      );
    }

    await User.changePassword(userId, newPassword);

    logger.info(`PASSWORD CHANGED: ${user.username} (ID: ${userId})`);
    AuditLog.logUpdate(
      userId,
      user.username,
      "users",
      userId,
      { action: "password_change" },
      undefined,
      ip,
      userAgent,
    );
  }
}

module.exports = AuthService;
