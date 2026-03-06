import { describe, it, expect } from "vitest";
import { TimeLogSection, MonthView, WeekView, ActiveTimer } from "./index";

describe("timelog barrel exports", () => {
  it("exports all main components", () => {
    expect(TimeLogSection).toBeDefined();
    expect(MonthView).toBeDefined();
    expect(WeekView).toBeDefined();
    expect(ActiveTimer).toBeDefined();
  });
});
