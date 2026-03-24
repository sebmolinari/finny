const {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} = require("../../../errors/AppError");

describe("AppError", () => {
  it("sets message, name, and default statusCode 500", () => {
    const err = new AppError("something broke");
    expect(err.message).toBe("something broke");
    expect(err.statusCode).toBe(500);
    expect(err.name).toBe("AppError");
    expect(err instanceof Error).toBe(true);
    expect(err instanceof AppError).toBe(true);
  });

  it("accepts a custom statusCode", () => {
    const err = new AppError("bad input", 422);
    expect(err.statusCode).toBe(422);
  });

  it("captures a stack trace", () => {
    const err = new AppError("trace test");
    expect(err.stack).toBeDefined();
    expect(err.stack).toContain("AppError.test.js");
  });
});

describe("ValidationError", () => {
  it("has statusCode 400 and correct name", () => {
    const err = new ValidationError("invalid field");
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("invalid field");
    expect(err.name).toBe("ValidationError");
    expect(err instanceof AppError).toBe(true);
  });
});

describe("UnauthorizedError", () => {
  it("has statusCode 401 and default message", () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe("Authentication required");
  });

  it("accepts a custom message", () => {
    const err = new UnauthorizedError("token expired");
    expect(err.message).toBe("token expired");
  });
});

describe("ForbiddenError", () => {
  it("has statusCode 403 and default message", () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe("Access denied");
  });
});

describe("NotFoundError", () => {
  it("has statusCode 404 and default message", () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Resource not found");
  });

  it("accepts a custom message", () => {
    const err = new NotFoundError("User not found");
    expect(err.message).toBe("User not found");
  });
});

describe("ConflictError", () => {
  it("has statusCode 409", () => {
    const err = new ConflictError("already exists");
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe("already exists");
    expect(err.name).toBe("ConflictError");
    expect(err instanceof AppError).toBe(true);
  });
});
