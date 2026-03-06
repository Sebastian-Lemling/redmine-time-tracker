import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api } from "@/lib/api";
import { NetworkError, ApiError, ConflictError, TimeoutError, AbortError } from "@/lib/errors";

function mockFetch(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    ...response,
  } as Response);
}

describe("api", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("sends GET request to given path", async () => {
    const fetchSpy = mockFetch({ json: () => Promise.resolve({ data: 1 }) });
    await api("/api/test");
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("sends POST with JSON body and Content-Type header", async () => {
    const fetchSpy = mockFetch({ json: () => Promise.resolve({ ok: true }) });
    await api("/api/test", {
      method: "POST",
      body: JSON.stringify({ key: "value" }),
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ key: "value" }),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("returns parsed JSON response", async () => {
    mockFetch({ json: () => Promise.resolve({ result: 42 }) });
    const data = await api<{ result: number }>("/api/test");
    expect(data).toEqual({ result: 42 });
  });

  it("throws NetworkError on network failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));
    await expect(api("/api/test")).rejects.toThrow("Cannot connect to server");
    try {
      await api("/api/test");
    } catch (e) {
      expect(e).toBeInstanceOf(NetworkError);
    }
  });

  it("throws TimeoutError after 30s", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          const signal = (init as RequestInit)?.signal;
          if (signal) {
            signal.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            );
          }
        }),
    );
    const promise = api("/api/test");
    vi.advanceTimersByTime(30000);
    await expect(promise).rejects.toThrow("Request timed out");
    try {
      const p2 = api("/api/other");
      vi.advanceTimersByTime(30000);
      await p2;
    } catch (e) {
      expect(e).toBeInstanceOf(TimeoutError);
    }
  });

  it("throws ApiError with status code on 4xx/5xx", async () => {
    mockFetch({
      ok: false,
      status: 404,
      json: () => Promise.reject(new Error("no json")),
    });
    try {
      await api("/api/test");
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      const err = e as ApiError;
      expect(err.message).toContain("404");
      expect(err.status).toBe(404);
    }
  });

  it("parses errors array from response body", async () => {
    mockFetch({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ errors: ["field1 invalid", "field2 required"] }),
    });
    await expect(api("/api/test")).rejects.toThrow("field1 invalid, field2 required");
  });

  it("parses single error string from response body", async () => {
    mockFetch({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: "Bad request" }),
    });
    await expect(api("/api/test")).rejects.toThrow("Bad request");
  });

  it("attaches .status and .data to ApiError", async () => {
    const body = { errors: ["fail"], extra: "info" };
    mockFetch({
      ok: false,
      status: 422,
      json: () => Promise.resolve(body),
    });
    try {
      await api("/api/test");
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      const err = e as ApiError;
      expect(err.status).toBe(422);
      expect(err.data).toEqual(body);
    }
  });

  it("throws ConflictError on 409 response", async () => {
    const body = { errors: ["conflict"], current_issue: { id: 1, subject: "Server" } };
    mockFetch({
      ok: false,
      status: 409,
      json: () => Promise.resolve(body),
    });
    try {
      await api("/api/test");
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ConflictError);
      const err = e as ConflictError;
      expect(err.status).toBe(409);
      expect(err.currentIssue).toEqual({ id: 1, subject: "Server" });
    }
  });

  it("respects caller's AbortSignal", async () => {
    const controller = new AbortController();
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          const signal = (init as RequestInit)?.signal;
          if (signal) {
            if (signal.aborted) {
              reject(new DOMException("Aborted", "AbortError"));
              return;
            }
            signal.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            );
          }
        }),
    );
    controller.abort();
    await expect(api("/api/test", { signal: controller.signal })).rejects.toThrow();
  });

  it("merges caller signal with timeout signal", async () => {
    const controller = new AbortController();
    const fetchSpy = mockFetch({ json: () => Promise.resolve({}) });
    await api("/api/test", { signal: controller.signal });
    const callOptions = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(callOptions.signal).toBeDefined();
  });

  it("does not add Content-Type when no body", async () => {
    const fetchSpy = mockFetch({ json: () => Promise.resolve({}) });
    await api("/api/test");
    const callHeaders = (fetchSpy.mock.calls[0][1] as RequestInit).headers as Record<
      string,
      string
    >;
    expect(callHeaders["Content-Type"]).toBeUndefined();
  });

  it("works on any port (no port check)", async () => {
    mockFetch({ json: () => Promise.resolve({ ok: true }) });
    await expect(api("/api/test")).resolves.toEqual({ ok: true });
  });

  it("throws AbortError when caller signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new DOMException("Aborted", "AbortError"));
    try {
      await api("/api/test", { signal: controller.signal });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(AbortError);
      expect((e as AbortError).message).toBe("Request aborted");
    }
  });

  describe("mergeSignals fallback (without AbortSignal.any)", () => {
    let originalAny: typeof AbortSignal.any;

    beforeEach(() => {
      originalAny = AbortSignal.any;
      (AbortSignal as any).any = undefined;
    });

    afterEach(() => {
      (AbortSignal as any).any = originalAny;
    });

    it("merges signals via fallback controller", async () => {
      const controller = new AbortController();
      const fetchSpy = mockFetch({ json: () => Promise.resolve({ ok: true }) });
      await api("/api/test", { signal: controller.signal });
      const callOptions = fetchSpy.mock.calls[0][1] as RequestInit;
      expect(callOptions.signal).toBeDefined();
    });

    it("fallback aborts immediately if caller signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort();
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new DOMException("Aborted", "AbortError"));
      try {
        await api("/api/test", { signal: controller.signal });
        expect.unreachable("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(AbortError);
      }
    });

    it("fallback propagates abort from caller signal", async () => {
      const controller = new AbortController();
      vi.spyOn(globalThis, "fetch").mockImplementation(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            const signal = (init as RequestInit)?.signal;
            if (signal) {
              signal.addEventListener("abort", () =>
                reject(new DOMException("Aborted", "AbortError")),
              );
            }
          }),
      );
      const promise = api("/api/test", { signal: controller.signal });
      controller.abort();
      try {
        await promise;
        expect.unreachable("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(AbortError);
      }
    });
  });
});
