import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useInstances, INSTANCE_COLORS } from "@/hooks/useInstances";
import type { RedmineInstance } from "@/types/redmine";

vi.mock("@/lib/api");

import { api } from "@/lib/api";

const mockedApi = vi.mocked(api);

const inst1: RedmineInstance = { id: "prod", name: "Production", url: "https://r1.test", order: 0 };
const inst2: RedmineInstance = { id: "dev", name: "Dev", url: "https://r2.test", order: 1 };

describe("useInstances", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches instances on mount and sorts by order", async () => {
    mockedApi.mockResolvedValueOnce([inst2, inst1]);

    const { result } = renderHook(() => useInstances());
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.instances).toEqual([inst1, inst2]);
  });

  it("falls back to default instance on fetch error", async () => {
    mockedApi.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useInstances());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.instances).toHaveLength(1);
    expect(result.current.instances[0].id).toBe("default");
    expect(result.current.instances[0].name).toBe("Redmine");
  });

  it("getInstanceName returns name for known instance", async () => {
    mockedApi.mockResolvedValueOnce([inst1, inst2]);

    const { result } = renderHook(() => useInstances());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.getInstanceName("prod")).toBe("Production");
    expect(result.current.getInstanceName("dev")).toBe("Dev");
  });

  it("getInstanceName returns id for unknown instance", async () => {
    mockedApi.mockResolvedValueOnce([inst1]);

    const { result } = renderHook(() => useInstances());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.getInstanceName("unknown")).toBe("unknown");
  });

  it("instanceMap contains all instances", async () => {
    mockedApi.mockResolvedValueOnce([inst1, inst2]);

    const { result } = renderHook(() => useInstances());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.instanceMap.size).toBe(2);
    expect(result.current.instanceMap.get("prod")).toEqual(inst1);
  });

  it("renameInstance optimistically updates then syncs from server", async () => {
    mockedApi.mockResolvedValueOnce([inst1, inst2]);

    const { result } = renderHook(() => useInstances());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const renamed = [{ ...inst1, name: "Renamed" }, inst2];
    mockedApi.mockResolvedValueOnce(renamed);

    await act(async () => {
      await result.current.renameInstance("prod", "Renamed");
    });

    expect(result.current.instances[0].name).toBe("Renamed");
    expect(mockedApi).toHaveBeenCalledWith(
      "/api/instances",
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("renameInstance reverts on API error", async () => {
    mockedApi.mockResolvedValueOnce([inst1]);

    const { result } = renderHook(() => useInstances());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockedApi.mockRejectedValueOnce(new Error("Server error"));

    await act(async () => {
      await result.current.renameInstance("prod", "Bad Name");
    });

    expect(result.current.instances[0].name).toBe("Production");
  });

  it("instanceColorMap assigns colors by index with cycling", async () => {
    const many: RedmineInstance[] = INSTANCE_COLORS.map((_, i) => ({
      id: `inst-${i}`,
      name: `Instance ${i}`,
      url: `https://r${i}.test`,
      order: i,
    }));
    many.push({
      id: "wrap",
      name: "Wrap",
      url: "https://wrap.test",
      order: INSTANCE_COLORS.length,
    });
    mockedApi.mockResolvedValueOnce(many);

    const { result } = renderHook(() => useInstances());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const map = result.current.instanceColorMap;
    INSTANCE_COLORS.forEach((color, i) => {
      expect(map[`inst-${i}`]).toBe(color);
    });
    expect(map["wrap"]).toBe(INSTANCE_COLORS[0]);
  });

  it("reorderInstances assigns order indices and syncs", async () => {
    mockedApi.mockResolvedValueOnce([inst1, inst2]);

    const { result } = renderHook(() => useInstances());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const reordered = [inst2, inst1];
    const serverResult = [
      { ...inst2, order: 0 },
      { ...inst1, order: 1 },
    ];
    mockedApi.mockResolvedValueOnce(serverResult);

    await act(async () => {
      await result.current.reorderInstances(reordered);
    });

    expect(result.current.instances[0].id).toBe("dev");
    expect(result.current.instances[1].id).toBe("prod");
  });
});
