const adminMiddleware = require("../../../middleware/admin");

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const next = jest.fn();

beforeEach(() => jest.clearAllMocks());

describe("adminMiddleware", () => {
  it("calls next() for an admin user", () => {
    const req = { user: { id: 1, username: "admin", role: "admin" } };
    adminMiddleware(req, makeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("returns 403 for a non-admin user", () => {
    const req = { user: { id: 2, username: "alice", role: "user" } };
    const res = makeRes();

    adminMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("Admin") }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when req.user is undefined", () => {
    const req = {};
    const res = makeRes();

    adminMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 via catch block when req.user.role getter throws (lines 19-20)", () => {
    // Simulate an unexpected error during role access to exercise the catch branch
    const req = {};
    Object.defineProperty(req, "user", {
      get() {
        throw new Error("unexpected error accessing user");
      },
    });
    const res = makeRes();

    adminMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Access denied" }),
    );
    expect(next).not.toHaveBeenCalled();
  });
});
