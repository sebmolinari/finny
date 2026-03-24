const db = require("../../../tests/setup/testDb");
const User = require("../../../models/User");

beforeEach(() => db.clearAll());

describe("User.create", () => {
  it("creates a user and returns the new id", async () => {
    const id = await User.create("alice", "alice@example.com", "Password1", "user");
    expect(typeof id).toBe("number");
    expect(id).toBeGreaterThan(0);
  });

  it("promotes the first user to admin regardless of requested role", async () => {
    const id = await User.create("firstuser", "first@example.com", "Password1", "user");
    const user = User.findById(id);
    expect(user.role).toBe("admin");
  });

  it("subsequent users keep the requested role", async () => {
    await User.create("admin", "admin@example.com", "Password1", "admin");
    const id = await User.create("regularuser", "user@example.com", "Password1", "user");
    expect(User.findById(id).role).toBe("user");
  });

  it("hashes the password (does not store plain text)", async () => {
    const id = await User.create("alice", "alice@example.com", "Password1", "user");
    const user = User.findById(id);
    expect(user.password).not.toBe("Password1");
    expect(user.password.startsWith("$2")).toBe(true); // bcrypt hash prefix
  });
});

describe("User.findByUsername / findByEmail / findById", () => {
  let userId;
  beforeEach(async () => {
    userId = await User.create("bob", "bob@example.com", "Password1", "user");
  });

  it("findByUsername returns the user", () => {
    const u = User.findByUsername("bob");
    expect(u.username).toBe("bob");
  });

  it("findByUsername returns undefined for unknown username", () => {
    expect(User.findByUsername("nobody")).toBeUndefined();
  });

  it("findByEmail returns the user", () => {
    expect(User.findByEmail("bob@example.com").username).toBe("bob");
  });

  it("findByEmail returns undefined for unknown email", () => {
    expect(User.findByEmail("nobody@x.com")).toBeUndefined();
  });

  it("findById returns the user", () => {
    expect(User.findById(userId).username).toBe("bob");
  });

  it("findById returns undefined for unknown id", () => {
    expect(User.findById(99999)).toBeUndefined();
  });
});

describe("User.verifyPassword", () => {
  it("returns true for the correct password", async () => {
    const id = await User.create("charlie", "charlie@example.com", "Password1", "user");
    const hash = User.findById(id).password;
    expect(User.verifyPassword("Password1", hash)).toBe(true);
  });

  it("returns false for the wrong password", async () => {
    const id = await User.create("dave", "dave@example.com", "Password1", "user");
    const hash = User.findById(id).password;
    expect(User.verifyPassword("WrongPass1", hash)).toBe(false);
  });
});

describe("User.updateStatus / updateRole", () => {
  let userId;
  beforeEach(async () => {
    userId = await User.create("eve", "eve@example.com", "Password1", "user");
  });

  it("updateStatus sets active flag", () => {
    User.updateStatus(userId, 0, userId);
    expect(User.findById(userId).active).toBe(0);
  });

  it("updateRole changes the role", () => {
    User.updateRole(userId, "admin", userId);
    expect(User.findById(userId).role).toBe("admin");
  });
});

describe("User.changePassword", () => {
  it("updates the password hash", async () => {
    const id = await User.create("frank", "frank@example.com", "OldPass1", "user");
    const oldHash = User.findById(id).password;

    await User.changePassword(id, "NewPass1");

    const newHash = User.findById(id).password;
    expect(newHash).not.toBe(oldHash);
    expect(User.verifyPassword("NewPass1", newHash)).toBe(true);
  });
});

describe("User.deleteById", () => {
  it("removes the user", async () => {
    const id = await User.create("grace", "grace@example.com", "Password1", "user");
    User.deleteById(id);
    expect(User.findById(id)).toBeUndefined();
  });
});

describe("User.getAll", () => {
  beforeEach(async () => {
    await User.create("u1", "u1@example.com", "Password1", "user");
    await User.create("u2", "u2@example.com", "Password1", "user");
    await User.create("u3", "u3@example.com", "Password1", "admin");
  });

  it("returns paginated results", () => {
    const { users, pagination } = User.getAll({ page: 1, limit: 2 });
    expect(users.length).toBe(2);
    expect(pagination.total).toBe(3);
  });

  it("filters by role", () => {
    const { users } = User.getAll({ role: "admin" });
    expect(users.every((u) => u.role === "admin")).toBe(true);
  });

  it("filters by active status", async () => {
    const id = User.findByUsername("u1").id;
    User.updateStatus(id, 0, id);
    const { users } = User.getAll({ active: 0 });
    expect(users.some((u) => u.username === "u1")).toBe(true);
  });
});
