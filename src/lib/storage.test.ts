import { describe, it, expect, vi, beforeEach } from "vitest";
import { safeGet, safeSet, safeRemove } from "@/lib/storage";

describe("storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("safeGet", () => {
    it("returns parsed value from localStorage", () => {
      localStorage.setItem("key", JSON.stringify({ a: 1 }));
      expect(safeGet("key", null)).toEqual({ a: 1 });
    });

    it("returns fallback when key not found", () => {
      expect(safeGet("missing", "default")).toBe("default");
    });

    it("returns fallback on invalid JSON", () => {
      localStorage.setItem("bad", "not-json");
      expect(safeGet("bad", 42)).toBe(42);
    });

    it("returns fallback when localStorage throws", () => {
      vi.spyOn(localStorage, "getItem").mockImplementation(() => {
        throw new Error("denied");
      });
      expect(safeGet("key", [])).toEqual([]);
      vi.restoreAllMocks();
    });
  });

  describe("safeSet", () => {
    it("stores JSON value and returns true", () => {
      expect(safeSet("key", { b: 2 })).toBe(true);
      expect(JSON.parse(localStorage.getItem("key")!)).toEqual({ b: 2 });
    });

    it("returns false when localStorage throws", () => {
      vi.spyOn(localStorage, "setItem").mockImplementation(() => {
        throw new Error("quota");
      });
      expect(safeSet("key", "value")).toBe(false);
      vi.restoreAllMocks();
    });
  });

  describe("safeRemove", () => {
    it("removes key from localStorage", () => {
      localStorage.setItem("key", "val");
      safeRemove("key");
      expect(localStorage.getItem("key")).toBeNull();
    });

    it("does not throw when localStorage throws", () => {
      vi.spyOn(localStorage, "removeItem").mockImplementation(() => {
        throw new Error("denied");
      });
      expect(() => safeRemove("key")).not.toThrow();
      vi.restoreAllMocks();
    });
  });
});
