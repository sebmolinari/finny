"use strict";

const v = require("../../../utils/validators");

describe("isValidEmail", () => {
  it("accepts a valid email", () => expect(v.isValidEmail("a@b.com")).toBe(true));
  it("rejects missing @", () => expect(v.isValidEmail("invalid")).toBe(false));
  it("rejects missing domain", () => expect(v.isValidEmail("a@")).toBe(false));
  it("rejects spaces", () => expect(v.isValidEmail("a @b.com")).toBe(false));
});

describe("isValidUsername", () => {
  it("accepts alphanumeric + underscore within length", () => {
    expect(v.isValidUsername("alice_99")).toBe(true);
  });
  it("rejects too short (2 chars)", () => expect(v.isValidUsername("ab")).toBe(false));
  it("rejects too long (31 chars)", () => expect(v.isValidUsername("a".repeat(31))).toBe(false));
  it("rejects special characters", () => expect(v.isValidUsername("alice!")).toBe(false));
  it("rejects null/undefined", () => {
    expect(v.isValidUsername(null)).toBe(false);
    expect(v.isValidUsername(undefined)).toBe(false);
  });
});

describe("isValidPassword", () => {
  it("accepts a strong password", () => expect(v.isValidPassword("Abcdef1!")).toBe(true));
  it("rejects fewer than 8 chars", () => expect(v.isValidPassword("Ab1")).toBe(false));
  it("rejects all lowercase", () => expect(v.isValidPassword("abcdefg1")).toBe(false));
  it("rejects no digits", () => expect(v.isValidPassword("Abcdefgh")).toBe(false));
  it("rejects null/undefined", () => {
    expect(v.isValidPassword(null)).toBe(false);
    expect(v.isValidPassword(undefined)).toBe(false);
  });
});

describe("isValidDate", () => {
  it("accepts YYYY-MM-DD", () => expect(v.isValidDate("2024-01-15")).toBe(true));
  it("rejects wrong format", () => expect(v.isValidDate("15-01-2024")).toBe(false));
  it("rejects non-date string", () => expect(v.isValidDate("not-a-date")).toBe(false));
});

describe("isPositiveNumber", () => {
  it("accepts positive float string", () => expect(v.isPositiveNumber("3.14")).toBe(true));
  it("accepts positive integer", () => expect(v.isPositiveNumber(5)).toBe(true));
  it("rejects zero", () => expect(v.isPositiveNumber(0)).toBe(false));
  it("rejects negative", () => expect(v.isPositiveNumber(-1)).toBe(false));
  it("rejects non-numeric string", () => expect(v.isPositiveNumber("abc")).toBe(false));
});

describe("isValidCurrencyCode", () => {
  it("accepts 3 uppercase letters", () => expect(v.isValidCurrencyCode("USD")).toBe(true));
  it("rejects lowercase", () => expect(v.isValidCurrencyCode("usd")).toBe(false));
  it("rejects 4-letter code", () => expect(v.isValidCurrencyCode("USDT")).toBe(false));
  it("rejects 2-letter code", () => expect(v.isValidCurrencyCode("US")).toBe(false));
});

describe("sanitizeString", () => {
  it("strips HTML tags", () => {
    expect(v.sanitizeString("<b>hello</b>")).toBe("hello");
  });
  it("strips content between angle brackets (treated as HTML tag)", () => {
    // The regex <[^>]*> matches "< b >" as a tag and removes the whole thing
    expect(v.sanitizeString("a < b > c")).toBe("a  c");
  });
  it("trims whitespace", () => {
    expect(v.sanitizeString("  hi  ")).toBe("hi");
  });
  it("returns empty string for null/undefined/empty", () => {
    expect(v.sanitizeString(null)).toBe("");
    expect(v.sanitizeString("")).toBe("");
  });
});

describe("validatePagination", () => {
  it("returns defaults when nothing passed", () => {
    expect(v.validatePagination(undefined, undefined)).toEqual({ page: 1, limit: 50 });
  });
  it("clamps limit to maxLimit", () => {
    expect(v.validatePagination(1, 200, 100)).toEqual({ page: 1, limit: 100 });
  });
  it("coerces page to minimum 1", () => {
    expect(v.validatePagination(0, 10)).toEqual({ page: 1, limit: 10 });
  });
  it("parses string values", () => {
    expect(v.validatePagination("3", "20")).toEqual({ page: 3, limit: 20 });
  });
});
