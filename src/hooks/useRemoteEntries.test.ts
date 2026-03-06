import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/lib/api", () => ({
  api: vi.fn(),
}));

import { useRemoteEntries } from "@/hooks/useRemoteEntries";
import { api } from "@/lib/api";

const mockApi = vi.mocked(api);

describe("useRemoteEntries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchRemoteEntries(from, to) → remoteEntries array", async () => {
    const entries = [{ id: 1, hours: 2, spent_on: "2025-03-01" }];
    mockApi.mockResolvedValue({ time_entries: entries });
    const { result } = renderHook(() => useRemoteEntries());
    await act(async () => {
      await result.current.fetchRemoteEntries("2025-03-01", "2025-03-31");
    });
    expect(mockApi).toHaveBeenCalledWith(
      "/api/time_entries/range?from=2025-03-01&to=2025-03-31",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(result.current.remoteEntries).toEqual(entries);
  });

  it("sets remoteLoading during fetch", async () => {
    let resolve: (v: unknown) => void;
    mockApi.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { result } = renderHook(() => useRemoteEntries());
    let fetchPromise: Promise<void>;
    act(() => {
      fetchPromise = result.current.fetchRemoteEntries("2025-01-01", "2025-01-31");
    });
    expect(result.current.remoteLoading).toBe(true);
    await act(async () => {
      resolve!({ time_entries: [] });
      await fetchPromise!;
    });
    expect(result.current.remoteLoading).toBe(false);
  });

  it("same range as last fetch → no new request", async () => {
    mockApi.mockResolvedValue({ time_entries: [] });
    const { result } = renderHook(() => useRemoteEntries());
    await act(async () => {
      await result.current.fetchRemoteEntries("2025-03-01", "2025-03-31");
    });
    await act(async () => {
      await result.current.fetchRemoteEntries("2025-03-01", "2025-03-31");
    });
    expect(mockApi).toHaveBeenCalledTimes(1);
  });

  it("force=true → ignores lastRemoteKey, fetches again", async () => {
    mockApi.mockResolvedValue({ time_entries: [] });
    const { result } = renderHook(() => useRemoteEntries());
    await act(async () => {
      await result.current.fetchRemoteEntries("2025-03-01", "2025-03-31");
    });
    await act(async () => {
      await result.current.fetchRemoteEntries("2025-03-01", "2025-03-31", true);
    });
    expect(mockApi).toHaveBeenCalledTimes(2);
  });

  it("refreshRemoteEntries() → refetches current range with force=true", async () => {
    mockApi.mockResolvedValue({ time_entries: [] });
    const { result } = renderHook(() => useRemoteEntries());
    await act(async () => {
      await result.current.fetchRemoteEntries("2025-03-01", "2025-03-31");
    });
    await act(async () => {
      await result.current.refreshRemoteEntries();
    });
    expect(mockApi).toHaveBeenCalledTimes(2);
  });

  it("refreshRemoteEntries() → no-op when no current range set", async () => {
    const { result } = renderHook(() => useRemoteEntries());
    await act(async () => {
      await result.current.refreshRemoteEntries();
    });
    expect(mockApi).not.toHaveBeenCalled();
  });

  it("error → logs error, remoteEntries unchanged", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const entries = [{ id: 1, hours: 1, spent_on: "2025-03-01" }];
    mockApi.mockResolvedValueOnce({ time_entries: entries });
    const { result } = renderHook(() => useRemoteEntries());
    await act(async () => {
      await result.current.fetchRemoteEntries("2025-03-01", "2025-03-31");
    });
    expect(result.current.remoteEntries).toEqual(entries);

    mockApi.mockRejectedValueOnce(new Error("Network error"));
    await act(async () => {
      await result.current.fetchRemoteEntries("2025-04-01", "2025-04-30");
    });
    expect(consoleSpy).toHaveBeenCalled();
    expect(result.current.remoteEntries).toEqual(entries);
    consoleSpy.mockRestore();
  });

  it("different range → new request", async () => {
    mockApi.mockResolvedValue({ time_entries: [] });
    const { result } = renderHook(() => useRemoteEntries());
    await act(async () => {
      await result.current.fetchRemoteEntries("2025-03-01", "2025-03-31");
    });
    await act(async () => {
      await result.current.fetchRemoteEntries("2025-04-01", "2025-04-30");
    });
    expect(mockApi).toHaveBeenCalledTimes(2);
  });

  it("aborts previous request when new one starts (lines 30-32)", async () => {
    let resolveFirst: (v: unknown) => void;
    let resolveSecond: (v: unknown) => void;

    mockApi.mockReturnValueOnce(
      new Promise((r) => {
        resolveFirst = r;
      }),
    );
    mockApi.mockReturnValueOnce(
      new Promise((r) => {
        resolveSecond = r;
      }),
    );

    const { result } = renderHook(() => useRemoteEntries());

    let firstPromise: Promise<void>;
    act(() => {
      firstPromise = result.current.fetchRemoteEntries("2025-01-01", "2025-01-31");
    });

    // Start second fetch (should abort the first)
    let secondPromise: Promise<void>;
    act(() => {
      secondPromise = result.current.fetchRemoteEntries("2025-02-01", "2025-02-28");
    });

    await act(async () => {
      resolveSecond!({ time_entries: [{ id: 2, hours: 1 }] });
      await secondPromise!;
    });

    expect(result.current.remoteEntries).toEqual([{ id: 2, hours: 1 }]);

    // Resolve first fetch (should be ignored since it was aborted)
    await act(async () => {
      resolveFirst!({ time_entries: [{ id: 1, hours: 3 }] });
      try {
        await firstPromise!;
      } catch {
        // aborted
      }
    });

    // Should still show second result, not first
    expect(result.current.remoteEntries).toEqual([{ id: 2, hours: 1 }]);
  });

  it("error resets lastRemoteKey so next fetch is not skipped (lines 34-36)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockApi.mockRejectedValueOnce(new Error("Network error"));
    const { result } = renderHook(() => useRemoteEntries());

    await act(async () => {
      await result.current.fetchRemoteEntries("2025-03-01", "2025-03-31");
    });

    // Same range should re-fetch because lastRemoteKey was reset on error
    mockApi.mockResolvedValueOnce({ time_entries: [{ id: 1 }] });
    await act(async () => {
      await result.current.fetchRemoteEntries("2025-03-01", "2025-03-31");
    });

    expect(mockApi).toHaveBeenCalledTimes(2);
    expect(result.current.remoteEntries).toEqual([{ id: 1 }]);
    consoleSpy.mockRestore();
  });

  it("remoteLoading is false after error (lines 37-40)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockApi.mockRejectedValueOnce(new Error("fail"));
    const { result } = renderHook(() => useRemoteEntries());

    await act(async () => {
      await result.current.fetchRemoteEntries("2025-03-01", "2025-03-31");
    });

    expect(result.current.remoteLoading).toBe(false);
    consoleSpy.mockRestore();
  });

  it("handles missing time_entries in response (line 31)", async () => {
    mockApi.mockResolvedValueOnce({ time_entries: undefined });
    const { result } = renderHook(() => useRemoteEntries());

    await act(async () => {
      await result.current.fetchRemoteEntries("2025-03-01", "2025-03-31");
    });

    expect(result.current.remoteEntries).toEqual([]);
  });
});
