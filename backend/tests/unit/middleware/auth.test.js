const jwt = require("jsonwebtoken");
const authMiddleware = require("../../../middleware/auth");

const makeReq = (authHeader) => ({ headers: { authorization: authHeader }, method: "GET", path: "/test" });
const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const next = jest.fn();

beforeEach(() => jest.clearAllMocks());

describe("authMiddleware", () => {
  it("calls next() with a valid token and attaches user to req", () => {
    const token = jwt.sign({ id: 1, username: "alice", role: "user" }, process.env.JWT_SECRET);
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toMatchObject({ id: 1, username: "alice", role: "user" });
  });

  it("returns 401 when no Authorization header is present", () => {
    const req = makeReq(undefined);
    const res = makeRes();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Authentication required" }));
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when Authorization header does not start with Bearer", () => {
    const req = makeReq("Token abc123");
    const res = makeRes();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 for an invalid/tampered token", () => {
    const req = makeReq("Bearer invalidtoken");
    const res = makeRes();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Invalid or expired token" }));
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 for an expired token", () => {
    const token = jwt.sign({ id: 1 }, process.env.JWT_SECRET, { expiresIn: -1 });
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
