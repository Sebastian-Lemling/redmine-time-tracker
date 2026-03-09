import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/lib/api", () => ({
  api: vi.fn(),
}));

import { useIssueDetails } from "@/hooks/useIssueDetails";
import { api } from "@/lib/api";

const mockApi = vi.mocked(api);

describe("useIssueDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchIssueSubject", () => {
    it("fetches and caches issue subject", async () => {
      mockApi.mockResolvedValue({ issue: { id: 100, subject: "Fix bug" } });
      const { result } = renderHook(() => useIssueDetails());
      await act(async () => {
        await result.current.fetchIssueSubject(100);
      });
      expect(mockApi).toHaveBeenCalledWith("/api/issues/100");
      expect(result.current.issueSubjects[100]).toBe("Fix bug");
    });

    it("dedup: concurrent calls for same id → single request", async () => {
      mockApi.mockResolvedValue({ issue: { id: 100, subject: "Fix bug" } });
      const { result } = renderHook(() => useIssueDetails());
      await act(async () => {
        await Promise.all([
          result.current.fetchIssueSubject(100),
          result.current.fetchIssueSubject(100),
        ]);
      });
      expect(mockApi).toHaveBeenCalledTimes(1);
    });

    it("error → logs error, cache unchanged", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockApi.mockRejectedValue(new Error("not found"));
      const { result } = renderHook(() => useIssueDetails());
      await act(async () => {
        await result.current.fetchIssueSubject(999);
      });
      expect(consoleSpy).toHaveBeenCalled();
      expect(result.current.issueSubjects[999]).toBeUndefined();
      consoleSpy.mockRestore();
    });
  });

  describe("fetchIssueDescription", () => {
    it("fetches description and caches it", async () => {
      mockApi.mockResolvedValue({
        issue: { id: 50, description: "A detailed description", journals: [] },
      });
      const { result } = renderHook(() => useIssueDetails());
      await act(async () => {
        await result.current.fetchIssueDescription(50);
      });
      expect(mockApi).toHaveBeenCalledWith("/api/issues/50?include=journals,attachments");
      expect(result.current.issueDescriptions[50]).toBe("A detailed description");
    });

    it("filters journals to only those with non-empty notes", async () => {
      const journals = [
        { id: 1, notes: "Comment 1", user: { id: 1, name: "A" }, created_on: "2025-01-01" },
        { id: 2, notes: "", user: { id: 1, name: "A" }, created_on: "2025-01-02" },
        { id: 3, notes: "  ", user: { id: 1, name: "A" }, created_on: "2025-01-03" },
        { id: 4, notes: "Comment 2", user: { id: 2, name: "B" }, created_on: "2025-01-04" },
      ];
      mockApi.mockResolvedValue({ issue: { id: 50, description: "desc", journals } });
      const { result } = renderHook(() => useIssueDetails());
      await act(async () => {
        await result.current.fetchIssueDescription(50);
      });
      expect(result.current.issueComments[50]).toHaveLength(2);
      expect(result.current.issueComments[50][0].notes).toBe("Comment 1");
      expect(result.current.issueComments[50][1].notes).toBe("Comment 2");
    });

    it("handles null description → empty string", async () => {
      mockApi.mockResolvedValue({ issue: { id: 50, description: null, journals: [] } });
      const { result } = renderHook(() => useIssueDetails());
      await act(async () => {
        await result.current.fetchIssueDescription(50);
      });
      expect(result.current.issueDescriptions[50]).toBe("");
    });

    it("dedup: concurrent description calls → single request", async () => {
      mockApi.mockResolvedValue({ issue: { id: 50, description: "desc" } });
      const { result } = renderHook(() => useIssueDetails());
      await act(async () => {
        await Promise.all([
          result.current.fetchIssueDescription(50),
          result.current.fetchIssueDescription(50),
        ]);
      });
      expect(mockApi).toHaveBeenCalledTimes(1);
    });

    it("handles missing journals field", async () => {
      mockApi.mockResolvedValue({ issue: { id: 50, description: "test" } });
      const { result } = renderHook(() => useIssueDetails());
      await act(async () => {
        await result.current.fetchIssueDescription(50);
      });
      expect(result.current.issueComments[50]).toEqual([]);
    });
  });
});
