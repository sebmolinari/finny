const errorHandler = require("../../../middleware/errorHandler");
const {
  AppError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
} = require("../../../errors/AppError");

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const req = { method: "GET", path: "/test" };
const next = jest.fn();

describe("errorHandler middleware", () => {
  it("uses AppError statusCode for known error types", () => {
    const err = new ValidationError("bad input");
    const res = makeRes();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "bad input" }));
  });

  it("uses 404 for NotFoundError", () => {
    const res = makeRes();
    errorHandler(new NotFoundError("not found"), req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("uses 403 for ForbiddenError", () => {
    const res = makeRes();
    errorHandler(new ForbiddenError(), req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("falls back to 500 for generic Error", () => {
    const res = makeRes();
    errorHandler(new Error("unexpected"), req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "unexpected" }));
  });

  it("falls back to 500 when err has no statusCode", () => {
    const res = makeRes();
    const err = { message: "plain object error" };
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("respects err.status when err.statusCode is absent", () => {
    const res = makeRes();
    const err = { message: "from framework", status: 503 };
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(503);
  });

  it("includes stack in development environment", () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    const res = makeRes();
    errorHandler(new AppError("oops"), req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.stack).toBeDefined();

    process.env.NODE_ENV = original;
  });

  it("omits stack in non-development environments", () => {
    process.env.NODE_ENV = "test";
    const res = makeRes();
    errorHandler(new AppError("oops"), req, res, next);
    const payload = res.json.mock.calls[0][0];
    expect(payload.stack).toBeUndefined();
  });
});
