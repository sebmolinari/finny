"use strict";

const logger = require("../../../utils/logger");

describe("logger", () => {
  let infoSpy, errorSpy, warnSpy, debugSpy;

  beforeEach(() => {
    infoSpy  = jest.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    warnSpy  = jest.spyOn(console, "warn").mockImplementation(() => {});
    debugSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it("info() calls console.log with INFO prefix and message", () => {
    logger.info("hello info");
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining("INFO:"),
      "hello info",
    );
  });

  it("error() calls console.error with ERROR prefix and message", () => {
    logger.error("oops");
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("ERROR:"),
      "oops",
    );
  });

  it("warn() calls console.warn with WARN prefix and message", () => {
    logger.warn("watch out");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("WARN:"),
      "watch out",
    );
  });

  it("debug() calls console.log with DEBUG prefix and message", () => {
    logger.debug("debug msg");
    expect(debugSpy).toHaveBeenCalledWith(
      expect.stringContaining("DEBUG:"),
      "debug msg",
    );
  });

  it("methods forward extra args", () => {
    logger.info("msg", { key: "val" }, 42);
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining("INFO:"),
      "msg",
      { key: "val" },
      42,
    );
  });
});
