import { describe, it, expect } from "vitest";
import { timerKey, parseTimerKey, DEFAULT_INSTANCE_ID } from "./redmine";

describe("timerKey", () => {
  it("creates composite key from instanceId and issueId", () => {
    expect(timerKey("prod", 42)).toBe("prod:42");
  });

  it("works with default instance", () => {
    expect(timerKey(DEFAULT_INSTANCE_ID, 100)).toBe("default:100");
  });
});

describe("parseTimerKey", () => {
  it("extracts instanceId and issueId", () => {
    const result = parseTimerKey("prod:42");
    expect(result.instanceId).toBe("prod");
    expect(result.issueId).toBe(42);
  });

  it("handles instanceId containing colons (uses lastIndexOf)", () => {
    const result = parseTimerKey("my:instance:99");
    expect(result.instanceId).toBe("my:instance");
    expect(result.issueId).toBe(99);
  });

  it("roundtrips with timerKey", () => {
    const key = timerKey("staging", 77);
    const parsed = parseTimerKey(key);
    expect(parsed.instanceId).toBe("staging");
    expect(parsed.issueId).toBe(77);
  });

  it("handles large issue IDs", () => {
    const result = parseTimerKey("default:999999");
    expect(result.instanceId).toBe("default");
    expect(result.issueId).toBe(999999);
  });

  it("handles hyphenated instanceId", () => {
    const result = parseTimerKey("my-redmine:42");
    expect(result.instanceId).toBe("my-redmine");
    expect(result.issueId).toBe(42);
  });
});
