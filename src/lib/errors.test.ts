import { describe, it, expect } from "vitest";
import {
  AppError,
  NetworkError,
  ApiError,
  ConflictError,
  TimeoutError,
  AbortError,
  StorageError,
} from "./errors";

describe("AppError", () => {
  it("sets message, name, timestamp, context", () => {
    const err = new AppError("something broke", "useRedmine.fetch");
    expect(err.message).toBe("something broke");
    expect(err.name).toBe("AppError");
    expect(err.context).toBe("useRedmine.fetch");
    expect(err.timestamp).toBeGreaterThan(0);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it("context is optional", () => {
    const err = new AppError("msg");
    expect(err.context).toBeUndefined();
  });
});

describe("NetworkError", () => {
  it("preserves originalError", () => {
    const orig = new TypeError("Failed to fetch");
    const err = new NetworkError("No connection", orig, "api.fetch");
    expect(err.name).toBe("NetworkError");
    expect(err.originalError).toBe(orig);
    expect(err.context).toBe("api.fetch");
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(NetworkError);
  });
});

describe("ApiError", () => {
  it("stores status and data", () => {
    const err = new ApiError("Not found", 404, { errors: ["missing"] }, "fetch");
    expect(err.name).toBe("ApiError");
    expect(err.status).toBe(404);
    expect(err.data).toEqual({ errors: ["missing"] });
    expect(err).toBeInstanceOf(AppError);
  });
});

describe("ConflictError", () => {
  it("extends ApiError with status 409", () => {
    const issue = { id: 1, subject: "Server version" };
    const err = new ConflictError("Conflict", {}, issue, "updateStatus");
    expect(err.name).toBe("ConflictError");
    expect(err.status).toBe(409);
    expect(err.currentIssue).toBe(issue);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toBeInstanceOf(AppError);
  });
});

describe("TimeoutError", () => {
  it("has default message", () => {
    const err = new TimeoutError();
    expect(err.message).toBe("Request timed out");
    expect(err.name).toBe("TimeoutError");
    expect(err).toBeInstanceOf(AppError);
  });

  it("accepts custom message", () => {
    const err = new TimeoutError("Custom timeout", "api.fetch");
    expect(err.message).toBe("Custom timeout");
    expect(err.context).toBe("api.fetch");
  });
});

describe("AbortError", () => {
  it("has default message", () => {
    const err = new AbortError();
    expect(err.message).toBe("Request aborted");
    expect(err.name).toBe("AbortError");
    expect(err).toBeInstanceOf(AppError);
  });
});

describe("StorageError", () => {
  it("stores key and operation", () => {
    const err = new StorageError("Quota exceeded", "timers", "write", "useMultiTimer");
    expect(err.name).toBe("StorageError");
    expect(err.key).toBe("timers");
    expect(err.operation).toBe("write");
    expect(err.context).toBe("useMultiTimer");
    expect(err).toBeInstanceOf(AppError);
  });
});
