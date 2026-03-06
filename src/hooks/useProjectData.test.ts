import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/lib/api", () => ({
  api: vi.fn(),
}));

import { useProjectData } from "@/hooks/useProjectData";
import { api } from "@/lib/api";

const mockApi = vi.mocked(api);

describe("useProjectData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchProjectMembers", () => {
    it("fetches members for a project", async () => {
      const members = [{ id: 1, user: { id: 10, name: "Alice" } }];
      mockApi.mockResolvedValue({ members });
      const { result } = renderHook(() => useProjectData());
      await act(async () => {
        await result.current.fetchProjectMembers(42);
      });
      expect(mockApi).toHaveBeenCalledWith("/api/projects/42/members");
      expect(result.current.membersByProject[42]).toEqual(members);
    });

    it("dedup: parallel fetchMembers same projectId → single request", async () => {
      mockApi.mockResolvedValue({ members: [] });
      const { result } = renderHook(() => useProjectData());
      await act(async () => {
        await Promise.all([
          result.current.fetchProjectMembers(1),
          result.current.fetchProjectMembers(1),
        ]);
      });
      expect(mockApi).toHaveBeenCalledTimes(1);
    });

    it("different projectIds → separate entries in map", async () => {
      const members1 = [{ id: 1, user: { id: 10, name: "Alice" } }];
      const members2 = [{ id: 2, user: { id: 20, name: "Bob" } }];
      mockApi
        .mockResolvedValueOnce({ members: members1 })
        .mockResolvedValueOnce({ members: members2 });
      const { result } = renderHook(() => useProjectData());
      await act(async () => {
        await result.current.fetchProjectMembers(1);
        await result.current.fetchProjectMembers(2);
      });
      expect(result.current.membersByProject[1]).toEqual(members1);
      expect(result.current.membersByProject[2]).toEqual(members2);
    });

    it("error on fetch → logs error, existing data unchanged", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const members = [{ id: 1, user: { id: 10, name: "Alice" } }];
      mockApi.mockResolvedValueOnce({ members });
      const { result } = renderHook(() => useProjectData());
      await act(async () => {
        await result.current.fetchProjectMembers(1);
      });

      mockApi.mockRejectedValueOnce(new Error("Network error"));
      await act(async () => {
        await result.current.fetchProjectMembers(2);
      });
      expect(consoleSpy).toHaveBeenCalled();
      expect(result.current.membersByProject[1]).toEqual(members); // unchanged
      consoleSpy.mockRestore();
    });
  });

  describe("fetchProjectVersions", () => {
    it("fetches versions for a project", async () => {
      const versions = [
        { id: 1, name: "v1.0", status: "open" },
        { id: 2, name: "v0.9", status: "closed" },
      ];
      mockApi.mockResolvedValue({ versions });
      const { result } = renderHook(() => useProjectData());
      await act(async () => {
        await result.current.fetchProjectVersions(42);
      });
      expect(mockApi).toHaveBeenCalledWith("/api/projects/42/versions");
      expect(result.current.versionsByProject[42]).toEqual([
        { id: 1, name: "v1.0", status: "open" },
      ]);
    });

    it("dedup: parallel fetchVersions same projectId → single request", async () => {
      mockApi.mockResolvedValue({ versions: [] });
      const { result } = renderHook(() => useProjectData());
      await act(async () => {
        await Promise.all([
          result.current.fetchProjectVersions(5),
          result.current.fetchProjectVersions(5),
        ]);
      });
      expect(mockApi).toHaveBeenCalledTimes(1);
    });

    it("allows re-fetch after first completes", async () => {
      mockApi.mockResolvedValue({ versions: [] });
      const { result } = renderHook(() => useProjectData());
      await act(async () => {
        await result.current.fetchProjectVersions(5);
      });
      await act(async () => {
        await result.current.fetchProjectVersions(5);
      });
      expect(mockApi).toHaveBeenCalledTimes(2);
    });
  });
});
