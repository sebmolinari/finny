"use strict";

const { handleValidationErrors, validate } = require("../../../utils/validationMiddleware");

function makeReq(errors = []) {
  return {
    // Mimic express-validator's validationResult shape
    _validationErrors: errors,
  };
}

// Mock express-validator's validationResult
jest.mock("express-validator", () => ({
  validationResult: (req) => ({
    isEmpty: () => req._validationErrors.length === 0,
    array: () =>
      req._validationErrors.map((e) => ({
        path: e.path,
        param: e.param,
        msg: e.msg,
        value: e.value,
      })),
  }),
}));

describe("handleValidationErrors", () => {
  it("calls next() when there are no validation errors", () => {
    const req = makeReq([]);
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    handleValidationErrors(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 400 with errors array when validation fails", () => {
    const req = makeReq([{ path: "email", msg: "Invalid email", value: "bad" }]);
    const json = jest.fn();
    const res = { status: jest.fn().mockReturnValue({ json }) };
    const next = jest.fn();

    handleValidationErrors(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      message: "Validation failed",
      errors: [{ field: "email", message: "Invalid email", value: "bad" }],
    });
  });

  it("uses err.param as field name when err.path is falsy (line 13 branch)", () => {
    const req = makeReq([{ path: undefined, param: "name", msg: "Required", value: "" }]);
    const json = jest.fn();
    const res = { status: jest.fn().mockReturnValue({ json }) };
    const next = jest.fn();

    handleValidationErrors(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({ field: "name" }),
        ]),
      }),
    );
  });
});

describe("validate", () => {
  it("returns an array ending with handleValidationErrors", () => {
    const chain = [jest.fn(), jest.fn()];
    const result = validate(chain);
    expect(result).toHaveLength(3);
    expect(result[2]).toBe(handleValidationErrors);
  });

  it("preserves the original validation chains", () => {
    const chain = [jest.fn()];
    const result = validate(chain);
    expect(result[0]).toBe(chain[0]);
  });
});
