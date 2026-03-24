"use strict";

const {
  ApiError,
  asyncHandler,
  validationError,
  notFoundError,
  unauthorizedError,
  forbiddenError,
} = require("../../../utils/errors");

describe("ApiError", () => {
  it("extends Error and sets statusCode and name", () => {
    const err = new ApiError(422, "unprocessable");
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("unprocessable");
    expect(err.statusCode).toBe(422);
    expect(err.name).toBe("ApiError");
  });
});

describe("factory helpers", () => {
  it("validationError returns 400", () => {
    const e = validationError("bad");
    expect(e.statusCode).toBe(400);
    expect(e.message).toBe("bad");
  });

  it("notFoundError returns 404", () => {
    const e = notFoundError("not found");
    expect(e.statusCode).toBe(404);
  });

  it("unauthorizedError returns 401", () => {
    const e = unauthorizedError("no auth");
    expect(e.statusCode).toBe(401);
  });

  it("forbiddenError returns 403", () => {
    const e = forbiddenError("forbidden");
    expect(e.statusCode).toBe(403);
  });
});

describe("asyncHandler", () => {
  it("calls the handler and passes its result through", async () => {
    const req = {};
    const res = {};
    const next = jest.fn();
    const handler = jest.fn().mockResolvedValue("ok");

    await asyncHandler(handler)(req, res, next);

    expect(handler).toHaveBeenCalledWith(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  it("forwards rejection to next()", async () => {
    const req = {};
    const res = {};
    const next = jest.fn();
    const err = new Error("boom");
    const handler = jest.fn().mockRejectedValue(err);

    await asyncHandler(handler)(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });
});
