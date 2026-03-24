"use strict";

const { formatCurrency, formatPercent } = require("../../../utils/formatters");

describe("formatCurrency", () => {
  it("formats a positive number", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("respects custom decimals", () => {
    expect(formatCurrency(1.5, 0)).toBe("$2");
  });

  it("returns $0.00 for null", () => {
    expect(formatCurrency(null)).toBe("$0.00");
  });

  it("returns $0.00 for undefined", () => {
    expect(formatCurrency(undefined)).toBe("$0.00");
  });

  it("returns $0.00 for NaN", () => {
    expect(formatCurrency(NaN)).toBe("$0.00");
  });
});

describe("formatPercent", () => {
  it("formats a number with 2 decimals by default", () => {
    expect(formatPercent(12.345)).toBe("12.35");
  });

  it("respects custom decimals", () => {
    expect(formatPercent(12.345, 1)).toBe("12.3");
  });

  it("returns '0.00' for null", () => {
    expect(formatPercent(null)).toBe("0.00");
  });

  it("returns '0.00' for undefined", () => {
    expect(formatPercent(undefined)).toBe("0.00");
  });

  it("returns '0.00' for NaN", () => {
    expect(formatPercent(NaN)).toBe("0.00");
  });
});
