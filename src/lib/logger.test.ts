import { describe, it, expect, beforeEach } from "vitest";
import { logger } from "./logger";

describe("logger", () => {
  beforeEach(() => {
    logger.clearBuffer();
  });

  it("stores entries in ring buffer", () => {
    logger.info("test message", { context: "test" });
    const entries = logger.getBuffer();
    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe("info");
    expect(entries[0].message).toBe("test message");
    expect(entries[0].context).toBe("test");
    expect(entries[0].timestamp).toBeGreaterThan(0);
  });

  it("all log levels work", () => {
    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");
    expect(logger.getBuffer()).toHaveLength(4);
    expect(logger.getBuffer().map((e) => e.level)).toEqual(["debug", "info", "warn", "error"]);
  });

  it("stores error and data metadata", () => {
    const err = new Error("boom");
    logger.error("failed", { error: err, data: { id: 42 }, context: "test" });
    const entry = logger.getBuffer()[0];
    expect(entry.error).toBe(err);
    expect(entry.data).toEqual({ id: 42 });
  });

  it("ring buffer evicts oldest when full", () => {
    for (let i = 0; i < 105; i++) {
      logger.info(`msg-${i}`);
    }
    const buf = logger.getBuffer();
    expect(buf).toHaveLength(100);
    expect(buf[0].message).toBe("msg-5"); // first 5 evicted
    expect(buf[99].message).toBe("msg-104");
  });

  it("clearBuffer empties the buffer", () => {
    logger.info("a");
    logger.info("b");
    expect(logger.getBuffer()).toHaveLength(2);
    logger.clearBuffer();
    expect(logger.getBuffer()).toHaveLength(0);
  });

  it("getBuffer returns a copy (not the internal array)", () => {
    logger.info("test");
    const buf = logger.getBuffer() as unknown[];
    buf.length = 0; // Mutate the copy
    expect(logger.getBuffer()).toHaveLength(1); // Original untouched
  });
});
