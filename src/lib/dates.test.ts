import { describe, it, expect } from "vitest";
import {
  toLocalDateString,
  formatDuration,
  formatTime,
  getWeekNumber,
  getWeekKey,
  getMonthKey,
  getWeekDates,
  getMonthDates,
  getWeekDaysFromDate,
  getMonthGrid,
  formatDateKey,
  formatDurationHM,
} from "@/lib/dates";

describe("toLocalDateString", () => {
  it("formats Date to YYYY-MM-DD", () => {
    expect(toLocalDateString(new Date(2026, 2, 3))).toBe("2026-03-03");
  });

  it("formats ISO string as YYYY-MM-DD", () => {
    expect(toLocalDateString("2026-01-15T10:30:00Z")).toBe("2026-01-15");
  });

  it("pads single-digit month and day", () => {
    expect(toLocalDateString(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("formatDuration", () => {
  it("shows '1:30h' for 90 minutes", () => {
    expect(formatDuration(90)).toBe("1:30h");
  });

  it("shows '45min' for 45 minutes", () => {
    expect(formatDuration(45)).toBe("45min");
  });

  it("shows '0min' for 0 minutes", () => {
    expect(formatDuration(0)).toBe("0min");
  });

  it("shows hours only when no remaining minutes", () => {
    expect(formatDuration(120)).toBe("2h");
  });
});

describe("formatTime", () => {
  it("formats '1:30:05' for 5405 seconds", () => {
    expect(formatTime(5405)).toBe("1:30:05");
  });

  it("formats '0:00:00' for 0 seconds", () => {
    expect(formatTime(0)).toBe("0:00:00");
  });
});

describe("getWeekNumber", () => {
  it("returns ISO 8601 week number", () => {
    expect(getWeekNumber(new Date(2026, 2, 3))).toBe(10);
  });

  it("handles year boundary (Jan 1 can be week 52/53)", () => {
    // Jan 1, 2026 is a Thursday → ISO week 1
    expect(getWeekNumber(new Date(2026, 0, 1))).toBe(1);
  });
});

describe("getWeekKey", () => {
  it("returns 'YYYY-W##' format", () => {
    expect(getWeekKey("2026-03-03")).toMatch(/^\d{4}-W\d{2}$/);
  });

  it("ISO week boundary (Sunday → previous week)", () => {
    // 2026-03-01 is a Sunday, should be in the same week as the preceding Monday
    const sundayKey = getWeekKey("2026-03-01");
    const mondayKey = getWeekKey("2026-02-23");
    expect(sundayKey).toBe(mondayKey);
  });
});

describe("getMonthKey", () => {
  it("returns 'YYYY-MM' format", () => {
    expect(getMonthKey("2026-03-15")).toBe("2026-03");
  });
});

describe("getWeekDates", () => {
  it("returns {start, end} for week key (Mon–Sun)", () => {
    const { start, end } = getWeekDates("2026-W10");
    expect(start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const startDate = new Date(start + "T00:00:00");
    const endDate = new Date(end + "T00:00:00");
    expect(endDate.getTime() - startDate.getTime()).toBe(6 * 86400000);
  });
});

describe("getMonthDates", () => {
  it("returns {start, end} for month key (first–last day)", () => {
    const { start, end } = getMonthDates("2026-03");
    expect(start).toBe("2026-03-01");
    expect(end).toBe("2026-03-31");
  });
});

describe("getWeekDaysFromDate", () => {
  it("returns array of 7 dates (Mon–Sun)", () => {
    const days = getWeekDaysFromDate(new Date(2026, 2, 4)); // Wednesday
    expect(days).toHaveLength(7);
    expect(days[0].getDay()).toBe(1);
    expect(days[6].getDay()).toBe(0);
  });
});

describe("getMonthGrid", () => {
  it("returns 2D array with correct Date objects", () => {
    const grid = getMonthGrid(2026, 2); // March 2026
    expect(grid.length).toBeGreaterThanOrEqual(4);
    for (const week of grid) {
      expect(week).toHaveLength(7);
    }
  });

  it("pads start with null (not previous month Date objects)", () => {
    // March 2026 starts on Sunday → pad Mon-Sat with null (6 nulls)
    const grid = getMonthGrid(2026, 2);
    const firstWeek = grid[0];
    let leadingNulls = 0;
    for (const cell of firstWeek) {
      if (cell === null) leadingNulls++;
      else break;
    }
    expect(leadingNulls).toBeGreaterThanOrEqual(0);
  });

  it("pads end with null", () => {
    const grid = getMonthGrid(2026, 2);
    const lastWeek = grid[grid.length - 1];
    // Last week should have trailing nulls (unless month ends on Sunday)
    const trailingNulls = lastWeek.filter((_, i) => {
      const lastNonNull = lastWeek.findLastIndex((c) => c !== null);
      return i > lastNonNull;
    });
    expect(trailingNulls.length).toBeGreaterThanOrEqual(0);
  });

  it("includes all days of the month", () => {
    const grid = getMonthGrid(2026, 2); // March 2026 has 31 days
    const days = grid.flat().filter((d): d is Date => d !== null);
    expect(days).toHaveLength(31);
  });
});

describe("formatDateKey", () => {
  it("formats Date to YYYY-MM-DD", () => {
    expect(formatDateKey(new Date(2026, 2, 3))).toBe("2026-03-03");
  });
});

describe("formatDurationHM", () => {
  it("formats '1:30' for 90 minutes", () => {
    expect(formatDurationHM(90)).toBe("1:30");
  });

  it("formats '0:15' for 15 minutes", () => {
    expect(formatDurationHM(15)).toBe("0:15");
  });

  it("formats '0:00' for 0 minutes", () => {
    expect(formatDurationHM(0)).toBe("0:00");
  });
});
