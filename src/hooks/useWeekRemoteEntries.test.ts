import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWeekRemoteEntries } from "./useWeekRemoteEntries";

const mockApi = vi.fn();
vi.mock("../lib/api", () => ({
  api: (...args: unknown[]) => mockApi(...args),
}));

describe("useWeekRemoteEntries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns remote entries after fetch", async () => {
    const entries = [
      {
        id: 1,
        hours: 2,
        spent_on: "2026-03-02",
        comments: "",
        activity: { id: 9, name: "Dev" },
        project: { id: 1, name: "P" },
      },
    ];
    mockApi.mockResolvedValue({ time_entries: entries });

    const { result } = renderHook(() => useWeekRemoteEntries());
    expect(result.current.weekRemoteEntries).toEqual([]);

    await act(async () => {
      await result.current.fetchWeekRemoteEntries();
    });

    expect(result.current.weekRemoteEntries).toEqual(entries);
    expect(mockApi).toHaveBeenCalledTimes(1);
    expect(mockApi.mock.calls[0][0]).toMatch(/\/api\/time_entries\/range\?from=.*&to=.*/);
  });

  it("calculates correct Mon-Sun range for the current week", async () => {
    mockApi.mockResolvedValue({ time_entries: [] });

    const { result } = renderHook(() => useWeekRemoteEntries());
    await act(async () => {
      await result.current.fetchWeekRemoteEntries();
    });

    const url = mockApi.mock.calls[0][0] as string;
    const params = new URLSearchParams(url.split("?")[1]);
    const from = new Date(params.get("from")! + "T00:00:00");
    const to = new Date(params.get("to")! + "T00:00:00");
    expect(from.getDay()).toBe(1);
    expect(to.getDay()).toBe(0);
  });

  it("keeps empty array on error", async () => {
    mockApi.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useWeekRemoteEntries());
    await act(async () => {
      await result.current.fetchWeekRemoteEntries();
    });

    expect(result.current.weekRemoteEntries).toEqual([]);
  });

  it("multiple calls replace previous entries", async () => {
    const first = [
      {
        id: 1,
        hours: 1,
        spent_on: "2026-03-02",
        comments: "",
        activity: { id: 9, name: "Dev" },
        project: { id: 1, name: "P" },
      },
    ];
    const second = [
      {
        id: 2,
        hours: 3,
        spent_on: "2026-03-03",
        comments: "",
        activity: { id: 9, name: "Dev" },
        project: { id: 1, name: "P" },
      },
    ];
    mockApi
      .mockResolvedValueOnce({ time_entries: first })
      .mockResolvedValueOnce({ time_entries: second });

    const { result } = renderHook(() => useWeekRemoteEntries());
    await act(async () => {
      await result.current.fetchWeekRemoteEntries();
    });
    expect(result.current.weekRemoteEntries).toEqual(first);

    await act(async () => {
      await result.current.fetchWeekRemoteEntries();
    });
    expect(result.current.weekRemoteEntries).toEqual(second);
  });
});
