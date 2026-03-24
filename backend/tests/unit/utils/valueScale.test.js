const {
  toValueScale,
  fromValueScale,
  QUANTITY_SCALE,
  PRICE_SCALE,
  FEE_SCALE,
  AMOUNT_SCALE,
  MINIMUM_HOLDING_QUANTITY,
} = require("../../../utils/valueScale");

describe("constants", () => {
  it("exposes expected scale values", () => {
    expect(QUANTITY_SCALE).toBe(8);
    expect(PRICE_SCALE).toBe(6);
    expect(FEE_SCALE).toBe(4);
    expect(AMOUNT_SCALE).toBe(4);
    expect(MINIMUM_HOLDING_QUANTITY).toBe(0.00000001);
  });
});

describe("toValueScale", () => {
  it("converts a float to integer representation", () => {
    const result = toValueScale(1.5, 4);
    expect(result.value).toBe(15000);
    expect(result.scale).toBe(4);
  });

  it("handles zero", () => {
    expect(toValueScale(0, 6).value).toBe(0);
  });

  it("rounds correctly to avoid floating-point drift", () => {
    // 0.1 + 0.2 = 0.30000000000000004 in IEEE-754
    const result = toValueScale(0.1 + 0.2, 6);
    expect(result.value).toBe(300000);
  });

  it("returns { value: null } for null input", () => {
    expect(toValueScale(null, 4).value).toBeNull();
  });

  it("returns { value: null } for undefined input", () => {
    expect(toValueScale(undefined, 4).value).toBeNull();
  });

  it("converts price with PRICE_SCALE", () => {
    expect(toValueScale(123.456789, PRICE_SCALE).value).toBe(123456789);
  });

  it("converts quantity with QUANTITY_SCALE", () => {
    expect(toValueScale(0.00000001, QUANTITY_SCALE).value).toBe(1);
  });

  it("handles large numbers without overflow", () => {
    const result = toValueScale(1_000_000, AMOUNT_SCALE);
    expect(result.value).toBe(10_000_000_000);
  });
});

describe("fromValueScale", () => {
  it("converts integer back to float", () => {
    expect(fromValueScale(15000, 4)).toBe(1.5);
  });

  it("handles zero", () => {
    expect(fromValueScale(0, 6)).toBe(0);
  });

  it("returns null for null value", () => {
    expect(fromValueScale(null, 4)).toBeNull();
  });

  it("returns null for undefined value", () => {
    expect(fromValueScale(undefined, 4)).toBeNull();
  });

  it("returns null for null scale", () => {
    expect(fromValueScale(100, null)).toBeNull();
  });

  it("returns null for undefined scale", () => {
    expect(fromValueScale(100, undefined)).toBeNull();
  });

  it("round-trips toValueScale correctly", () => {
    const floats = [1.23456789, 0.00000001, 999999.99, 0];
    for (const f of floats) {
      const encoded = toValueScale(f, PRICE_SCALE);
      const decoded = fromValueScale(encoded.value, PRICE_SCALE);
      expect(decoded).toBeCloseTo(f, 6);
    }
  });
});
