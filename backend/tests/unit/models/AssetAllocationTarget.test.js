"use strict";

const db = require("../../setup/testDb");
const AssetAllocationTarget = require("../../../models/AssetAllocationTarget");

beforeEach(() => db.clearAll());

function seedUser(id = 1) {
  db.prepare(
    "INSERT INTO users (id, username, email, password, created_by) VALUES (?, ?, ?, 'hash', ?)",
  ).run(id, `user${id}`, `u${id}@t.com`, id);
}

function seedAsset(id, symbol, type = "stock") {
  db.prepare(
    "INSERT INTO assets (id, symbol, name, asset_type, currency, created_by) VALUES (?, ?, ?, ?, 'USD', 1)",
  ).run(id, symbol, symbol + " Inc", type);
}

describe("AssetAllocationTarget.upsert — validation", () => {
  beforeEach(() => seedUser(1));

  it("throws if both assetType and assetId provided", () => {
    expect(() => AssetAllocationTarget.upsert(1, "stock", 1, 20, null, 1)).toThrow(
      "Must provide either asset_type or asset_id",
    );
  });

  it("throws if neither assetType nor assetId provided", () => {
    expect(() => AssetAllocationTarget.upsert(1, null, null, 20, null, 1)).toThrow(
      "Must provide either asset_type or asset_id",
    );
  });

  it("throws if percentage < 0", () => {
    expect(() => AssetAllocationTarget.upsert(1, "stock", null, -1, null, 1)).toThrow(
      "Target percentage must be between 0 and 100",
    );
  });

  it("throws if percentage > 100", () => {
    expect(() => AssetAllocationTarget.upsert(1, "stock", null, 101, null, 1)).toThrow(
      "Target percentage must be between 0 and 100",
    );
  });
});

describe("AssetAllocationTarget.upsert — type-level", () => {
  beforeEach(() => seedUser(1));

  it("inserts a new type-level target and returns it", () => {
    const result = AssetAllocationTarget.upsert(1, "stock", null, 60, "notes", 1);
    expect(result).not.toBeNull();
    expect(result.target_percentage).toBe(60);
    expect(result.asset_type).toBe("stock");
    expect(result.asset_id).toBeNull();
  });

  it("updates an existing type-level target", () => {
    AssetAllocationTarget.upsert(1, "stock", null, 60, null, 1);
    const updated = AssetAllocationTarget.upsert(1, "stock", null, 40, "changed", 1);
    expect(updated.target_percentage).toBe(40);
    expect(updated.notes).toBe("changed");
  });
});

describe("AssetAllocationTarget.upsert — asset-level", () => {
  beforeEach(() => {
    seedUser(1);
    seedAsset(10, "AAPL", "stock");
  });

  it("inserts a new asset-level target and returns it", () => {
    const result = AssetAllocationTarget.upsert(1, null, 10, 30, null, 1);
    expect(result).not.toBeNull();
    expect(result.asset_id).toBe(10);
  });

  it("updates an existing asset-level target", () => {
    AssetAllocationTarget.upsert(1, null, 10, 30, null, 1);
    const updated = AssetAllocationTarget.upsert(1, null, 10, 25, "new note", 1);
    expect(updated.target_percentage).toBe(25);
  });
});

describe("AssetAllocationTarget.getById", () => {
  beforeEach(() => seedUser(1));

  it("returns target by id and userId", () => {
    const t = AssetAllocationTarget.upsert(1, "bond", null, 20, null, 1);
    const found = AssetAllocationTarget.getById(t.id, 1);
    expect(found.id).toBe(t.id);
  });

  it("returns undefined for wrong userId", () => {
    const t = AssetAllocationTarget.upsert(1, "bond", null, 20, null, 1);
    expect(AssetAllocationTarget.getById(t.id, 999)).toBeUndefined();
  });
});

describe("AssetAllocationTarget.getByAssetType", () => {
  beforeEach(() => seedUser(1));

  it("returns target matching type", () => {
    AssetAllocationTarget.upsert(1, "etf", null, 15, null, 1);
    const result = AssetAllocationTarget.getByAssetType(1, "etf");
    expect(result).not.toBeNull();
    expect(result.asset_type).toBe("etf");
  });

  it("returns undefined when no match", () => {
    expect(AssetAllocationTarget.getByAssetType(1, "crypto")).toBeUndefined();
  });
});

describe("AssetAllocationTarget.getAllByUser", () => {
  beforeEach(() => {
    seedUser(1);
    seedAsset(10, "AAPL", "stock");
  });

  it("returns all targets for user", () => {
    AssetAllocationTarget.upsert(1, "stock", null, 60, null, 1);
    AssetAllocationTarget.upsert(1, null, 10, 30, null, 1);
    const results = AssetAllocationTarget.getAllByUser(1);
    expect(results.length).toBe(2);
  });

  it("excludes specified asset types", () => {
    AssetAllocationTarget.upsert(1, "stock", null, 60, null, 1);
    AssetAllocationTarget.upsert(1, "bond", null, 20, null, 1);
    const results = AssetAllocationTarget.getAllByUser(1, ["stock"]);
    expect(results.length).toBe(1);
    expect(results[0].asset_type).toBe("bond");
  });
});

describe("AssetAllocationTarget.delete", () => {
  beforeEach(() => seedUser(1));

  it("deletes target and returns true", () => {
    const t = AssetAllocationTarget.upsert(1, "stock", null, 60, null, 1);
    expect(AssetAllocationTarget.delete(t.id, 1)).toBe(true);
    expect(AssetAllocationTarget.getById(t.id, 1)).toBeUndefined();
  });

  it("returns false when target not found", () => {
    expect(AssetAllocationTarget.delete(9999, 1)).toBe(false);
  });
});

describe("AssetAllocationTarget.deleteByAssetType", () => {
  beforeEach(() => seedUser(1));

  it("deletes target by asset type", () => {
    AssetAllocationTarget.upsert(1, "reit", null, 10, null, 1);
    expect(AssetAllocationTarget.deleteByAssetType(1, "reit")).toBe(true);
    expect(AssetAllocationTarget.getByAssetType(1, "reit")).toBeUndefined();
  });

  it("returns false when none deleted", () => {
    expect(AssetAllocationTarget.deleteByAssetType(1, "crypto")).toBe(false);
  });
});

describe("AssetAllocationTarget.deleteByAssetId", () => {
  beforeEach(() => {
    seedUser(1);
    seedAsset(10, "AAPL", "stock");
  });

  it("deletes target by asset id", () => {
    AssetAllocationTarget.upsert(1, null, 10, 30, null, 1);
    expect(AssetAllocationTarget.deleteByAssetId(1, 10)).toBe(true);
  });

  it("returns false when none deleted", () => {
    expect(AssetAllocationTarget.deleteByAssetId(1, 9999)).toBe(false);
  });
});

describe("AssetAllocationTarget.validateTotalAllocation", () => {
  beforeEach(() => {
    seedUser(1);
    seedAsset(10, "AAPL", "stock");
  });

  it("returns total=0 and isValid=true when no targets", () => {
    const r = AssetAllocationTarget.validateTotalAllocation(1, "bond");
    expect(r.total).toBe(0);
    expect(r.isValid).toBe(true);
    expect(r.remaining).toBe(100);
  });

  it("returns correct total excluding the specified asset type", () => {
    AssetAllocationTarget.upsert(1, "stock", null, 60, null, 1);
    AssetAllocationTarget.upsert(1, "bond", null, 20, null, 1);
    const r = AssetAllocationTarget.validateTotalAllocation(1, "stock");
    // Only bond (20%) should be counted; stock is excluded
    expect(r.total).toBe(20);
    expect(r.isValid).toBe(true);
  });

  it("validates asset-level using excludeAssetId", () => {
    AssetAllocationTarget.upsert(1, null, 10, 30, null, 1);
    // Validate with a different asset id in same type — should return 0 for AAPL (id=10) excluded
    const r = AssetAllocationTarget.validateTotalAllocation(1, null, 10);
    expect(r.total).toBe(0); // AAPL excluded, no other stock-level targets
  });

  it("returns total across all type-level when no exclusions", () => {
    AssetAllocationTarget.upsert(1, "stock", null, 60, null, 1);
    AssetAllocationTarget.upsert(1, "bond", null, 30, null, 1);
    const r = AssetAllocationTarget.validateTotalAllocation(1);
    expect(r.total).toBe(90);
    expect(r.remaining).toBe(10);
    expect(r.isValid).toBe(true);
  });
});

describe("AssetAllocationTarget.getAssetTargetsByType", () => {
  beforeEach(() => {
    seedUser(1);
    seedAsset(10, "AAPL", "stock");
    seedAsset(11, "MSFT", "stock");
  });

  it("groups asset targets by asset type", () => {
    AssetAllocationTarget.upsert(1, null, 10, 30, null, 1);
    AssetAllocationTarget.upsert(1, null, 11, 25, null, 1);
    const grouped = AssetAllocationTarget.getAssetTargetsByType(1);
    expect(grouped.stock).toBeDefined();
    expect(grouped.stock.assets).toHaveLength(2);
    expect(grouped.stock.total).toBe(55);
  });

  it("returns empty object when no asset targets", () => {
    const grouped = AssetAllocationTarget.getAssetTargetsByType(1);
    expect(Object.keys(grouped)).toHaveLength(0);
  });
});

describe("AssetAllocationTarget.batchUpsert", () => {
  beforeEach(() => {
    seedUser(1);
    seedAsset(10, "AAPL", "stock");
    seedAsset(11, "MSFT", "stock");
  });

  it("inserts multiple targets atomically", () => {
    const targets = [
      { asset_type: "stock", target_percentage: 60 },
      { asset_type: "bond", target_percentage: 30 },
    ];
    const results = AssetAllocationTarget.batchUpsert(1, targets, 1);
    expect(results.length).toBe(2);
  });

  it("throws when type-level total exceeds 100%", () => {
    const targets = [
      { asset_type: "stock", target_percentage: 60 },
      { asset_type: "bond", target_percentage: 60 },
    ];
    expect(() => AssetAllocationTarget.batchUpsert(1, targets, 1)).toThrow(
      "Total type-level allocation exceeds 100%",
    );
  });

  it("throws when asset_id not found in asset-level targets", () => {
    const targets = [{ asset_id: 9999, target_percentage: 30 }];
    expect(() => AssetAllocationTarget.batchUpsert(1, targets, 1)).toThrow(
      "Asset with ID 9999 not found",
    );
  });

  it("throws when asset-level allocation within a type exceeds 100%", () => {
    const targets = [
      { asset_id: 10, target_percentage: 60 },
      { asset_id: 11, target_percentage: 60 },
    ];
    expect(() => AssetAllocationTarget.batchUpsert(1, targets, 1)).toThrow(
      "Asset-level allocation for stock exceeds 100%",
    );
  });

  it("succeeds with valid asset-level targets", () => {
    const targets = [
      { asset_id: 10, target_percentage: 40 },
      { asset_id: 11, target_percentage: 30 },
    ];
    const results = AssetAllocationTarget.batchUpsert(1, targets, 1);
    expect(results.length).toBe(2);
  });
});

describe("AssetAllocationTarget.validateTotalAllocation — excludeAssetTypes branches", () => {
  beforeEach(() => {
    seedUser(1);
    seedAsset(10, "AAPL", "stock");
  });

  it("respects excludeAssetTypes when excludeAssetType is set (type-level branch)", () => {
    AssetAllocationTarget.upsert(1, "stock", null, 30, null, 1);
    AssetAllocationTarget.upsert(1, "bond", null, 20, null, 1);
    // Validate excluding "stock" as current target AND also exclude "bond" via excludeAssetTypes
    const r = AssetAllocationTarget.validateTotalAllocation(1, "stock", null, ["bond"]);
    expect(r.total).toBe(0); // both stock and bond excluded
  });

  it("respects excludeAssetTypes in else branch (no exclusions by type or id)", () => {
    AssetAllocationTarget.upsert(1, "stock", null, 30, null, 1);
    AssetAllocationTarget.upsert(1, "bond", null, 20, null, 1);
    const r = AssetAllocationTarget.validateTotalAllocation(1, null, null, ["bond"]);
    expect(r.total).toBe(30); // bond excluded via excludeAssetTypes
  });

  it("handles excludeAssetId with excludeAssetTypes (asset-level branch)", () => {
    AssetAllocationTarget.upsert(1, null, 10, 30, null, 1);
    const r = AssetAllocationTarget.validateTotalAllocation(1, null, 10, ["stock"]);
    expect(r.total).toBe(0); // AAPL excluded, stock type excluded too
  });

  it("throws when excludeAssetId asset does not exist", () => {
    expect(() =>
      AssetAllocationTarget.validateTotalAllocation(1, null, 9999),
    ).toThrow("Asset with ID 9999 not found");
  });
});
