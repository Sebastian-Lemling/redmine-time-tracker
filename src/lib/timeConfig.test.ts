import { describe, it, expect } from "vitest";
import { roundUpToStep, DURATION_STEP_MINUTES } from "@/lib/timeConfig";

describe("roundUpToStep", () => {
  it("rounds 7 → 15 (one step)", () => {
    expect(roundUpToStep(7)).toBe(15);
  });

  it("rounds 15 → 15 (exact step)", () => {
    expect(roundUpToStep(15)).toBe(15);
  });

  it("rounds 16 → 30 (next step)", () => {
    expect(roundUpToStep(16)).toBe(30);
  });

  it("rounds 0 → 15 (minimum)", () => {
    expect(roundUpToStep(0)).toBe(DURATION_STEP_MINUTES);
  });

  it("rounds negative → 15 (minimum)", () => {
    expect(roundUpToStep(-5)).toBe(DURATION_STEP_MINUTES);
  });
});
