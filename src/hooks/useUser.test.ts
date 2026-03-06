import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("@/lib/api", () => ({
  api: vi.fn(),
}));

import { useUser } from "@/hooks/useUser";
import { api } from "@/lib/api";

const mockApi = vi.mocked(api);

describe("useUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls /api/me on mount", async () => {
    mockApi.mockResolvedValue({ user: { id: 1, login: "test" }, redmineUrl: "http://redmine" });
    renderHook(() => useUser());
    expect(mockApi).toHaveBeenCalledWith(
      "/api/me",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("sets loading=true while fetching", () => {
    mockApi.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useUser());
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it("sets user + redmineUrl on success", async () => {
    const user = { id: 1, login: "test", firstname: "Test", lastname: "User" };
    mockApi.mockResolvedValue({ user, redmineUrl: "http://redmine.example.com" });
    const { result } = renderHook(() => useUser());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual(user);
    expect(result.current.redmineUrl).toBe("http://redmine.example.com");
  });

  it("sets loading=false after success", async () => {
    mockApi.mockResolvedValue({ user: { id: 1 }, redmineUrl: "" });
    const { result } = renderHook(() => useUser());
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it("sets error on network failure", async () => {
    mockApi.mockRejectedValue(new Error("Cannot connect to server"));
    const { result } = renderHook(() => useUser());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Cannot connect to server");
    expect(result.current.user).toBeNull();
  });

  it("sets error on 401 (unauthorized)", async () => {
    const err = new Error("Server error (401)");
    (err as Error & { status: number }).status = 401;
    mockApi.mockRejectedValue(err);
    const { result } = renderHook(() => useUser());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Server error (401)");
  });

  it("sets fallback error message for non-Error rejections", async () => {
    mockApi.mockRejectedValue("string error");
    const { result } = renderHook(() => useUser());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Cannot connect to Redmine");
  });

  it("handles empty redmineUrl", async () => {
    mockApi.mockResolvedValue({ user: { id: 1 }, redmineUrl: "" });
    const { result } = renderHook(() => useUser());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.redmineUrl).toBe("");
  });

  it("does not update state after unmount (abort)", async () => {
    let resolve: (v: unknown) => void;
    mockApi.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { unmount } = renderHook(() => useUser());
    unmount();
    // resolve after unmount — should not throw or update
    resolve!({ user: { id: 1 }, redmineUrl: "" });
    // No assertion needed — if it throws, test fails
  });
});
